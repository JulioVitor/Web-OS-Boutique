from fastapi import FastAPI, HTTPException, Depends,Header, status, Request, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import Optional, Union, Any, List
import mysql.connector
from mysql.connector import Error
import hashlib, json, os
import uuid
from datetime import datetime, timedelta, date
from decimal import Decimal
import pickle
import time

app = FastAPI()


SESSION_TIMEOUT = timedelta(minutes=30)

# 🔥 Configuração fixa do banco
LOJA_UNICA_ID = 1  # ID da loja boutique
DB_CONFIG = {
    "host": "localhost",
    "user": "root",
    "password": "",
    "database": "webos_boutique"  # Banco fixo
}

print(f"🎯 Projeto rodando apenas para a loja boutique (ID {LOJA_UNICA_ID})")
print(f"📊 Banco de dados selecionado: {DB_CONFIG['database']}")


def get_db_connection():
    try:
        conn = mysql.connector.connect(
            host=DB_CONFIG["host"],
            user=DB_CONFIG["user"],
            password=DB_CONFIG["password"],
            database=DB_CONFIG["database"],
            auth_plugin='mysql_native_password',
            autocommit=False,
            pool_size=5,
            pool_reset_session=True,
            connection_timeout=30
        )
        print(f"🔗 Conectado ao banco: {DB_CONFIG['database']}")
        return conn
    except mysql.connector.Error as err:
        print(f"❌ Erro de conexão MySQL: {err}")
        raise err

def hash_password(password: str) -> str:
    return hashlib.sha256(password.encode()).hexdigest()

def verificar_credenciais(nome: str, password: str):
    conn = get_db_connection()
    if conn is None:
        return None
    
    try:
        cursor = conn.cursor(dictionary=True)
        cursor.execute(
            "SELECT id, nome, password, perfil, loja_id FROM usuarios WHERE nome = %s",
            (nome,)
        )
        usuarios = cursor.fetchall()
        
        if not usuarios:
            return None
        
        for usuario in usuarios:
            hashed_password = hash_password(password)
            if usuario['password'] == hashed_password:
                return usuario
            elif password == usuario['password']:
                return usuario
        return None
        
    except Error as e:
        print(f"Erro ao verificar credenciais: {e}")
        return None
    finally:
        if cursor: cursor.close()
        if conn: conn.close()


def get_loja_id(session_data: dict):
    """Sempre retorna a loja boutique"""
    return LOJA_UNICA_ID


def serialize_mysql_data(data):
    if isinstance(data, dict):
        return {key: serialize_mysql_data(value) for key, value in data.items()}
    elif isinstance(data, list):
        return [serialize_mysql_data(item) for item in data]
    elif isinstance(data, Decimal):
        return float(data)
    elif isinstance(data, (datetime, date)):
        return data.isoformat()
    elif isinstance(data, (bytes, bytearray)):
        return data.decode('utf-8', errors='ignore')
    else:
        return data

# 1. CRIAR A APLICAÇÃO PRIMEIRO
app = FastAPI(title="WebOS Loja-Única API", version="1.0.0")

# 2. ADICIONAR MIDDLEWARES (ANTES DE TUDO)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ✅ SESSÕES ATIVAS
active_sessions = {}
def verificar_sessao(session_token: str):
    """Retorna os dados da sessão se estiver ativa, senão levanta exceção"""
    # Limpar "Bearer " se presente
    if session_token.startswith('Bearer '):
        session_token = session_token[7:]
    
    session_data = active_sessions.get(session_token)
    if not session_data:
        print(f"❌ Sessão não encontrada para token: {session_token[:10]}...")
        raise HTTPException(status_code=401, detail="Sessão não encontrada")

    # Verificar timeout
    tempo_decorrido = datetime.now() - session_data['created_at']
    if tempo_decorrido > SESSION_TIMEOUT:
        print(f"⏰ Sessão expirada: {tempo_decorrido} > {SESSION_TIMEOUT}")
        del active_sessions[session_token]
        raise HTTPException(status_code=401, detail="Sessão expirada")
    
    # Atualizar tempo de criação para manter sessão ativa
    session_data['created_at'] = datetime.now()
    print(f"✅ Sessão válida: {session_data['nome']} - {tempo_decorrido}")
    
    return session_data

# ✅ MODELOS PYDANTIC
class LoginData(BaseModel):
    nome: str
    password: str

class LoginResponse(BaseModel):
    success: bool
    message: str
    user_id: int
    nome: str
    perfil: str
    session_token: str

class ItemVenda(BaseModel):
    produto: str
    produto_id: Optional[int] = None
    quantidade: int
    preco_Unitario: float
    preco_Total: float

class VendaData(BaseModel):
    cliente: str
    itens: List[ItemVenda]
    total_venda: float
    total: Optional[float] = None
    total: Optional[float] = None
    forma_pagamento: str
    observacoes: Optional[str] = None
    data_venda: str
    usuario_id: int
    loja_id: int

class VendaResponse(BaseModel):
    success: bool
    message: str
    venda_id: int
    numero_venda: str

class FechamentoCaixaBase(BaseModel):
    data: date
    valor_inicial: float
    valor_final: float
    total_vendas: float
    total_entradas: float
    total_saidas: float
    total_os_entregues: Optional[float] = 0.0
    observacoes: Optional[str] = None
    status: Optional[str] = "fechado"

class FechamentoCaixaCompleto(BaseModel):
    data: date
    valor_inicial: float
    valor_final: float
    total_vendas: float
    total_entradas: float
    total_saidas: float
    total_os_entregues: Optional[float] = 0.0
    observacoes: Optional[str] = None
    status: Optional[str] = "fechado"

class FechamentoCaixaResponse(BaseModel):
    id: int
    user_id: int
    loja_id: int
    data: date
    valor_inicial: float
    valor_final: float
    total_vendas: float
    total_entradas: float
    total_saidas: float
    total_os_entregues: Optional[float] = 0.0
    observacoes: Optional[str] = None
    status: str
    usuario: str
    reaberto_por: Optional[int] = None
    usuario_reabertura: Optional[str] = None
    data_reabertura: Optional[datetime] = None
    created_at: datetime
    
    class Config:
        from_attributes = True

class ReabrirCaixaRequest(BaseModel):
    motivo: Optional[str] = None

class MovimentacaoCaixaCreate(BaseModel):
    tipo: str
    descricao: str
    valor: float
    data: date

class ProdutoBase(BaseModel):
    codigo_barras: Optional[str] = None
    nome: str
    descricao: Optional[str] = None
    categoria: Optional[str] = None
    marca: Optional[str] = None
    estoque_atual: float = 0.0
    estoque_minimo: float = 0.0
    preco_custo: float = 0.0
    preco_venda: float
    ativo: bool = True
    categoria_lingerie: Optional[str] = None
    subcategoria: Optional[str] = None
    tamanho_sutia: Optional[str] = None
    tamanho_calcinha: Optional[str] = None
    cor: Optional[str] = None
    colecao: Optional[str] = None
    material: Optional[str] = None

class ProdutoCreate(ProdutoBase):
    pass

class ProdutoUpdate(BaseModel):
    codigo_barras: Optional[str] = None
    nome: Optional[str] = None
    descricao: Optional[str] = None
    categoria: Optional[str] = None
    marca: Optional[str] = None
    estoque_atual: Optional[float] = None
    estoque_minimo: Optional[float] = None
    preco_custo: Optional[float] = None
    preco_venda: Optional[float] = None
    ativo: Optional[bool] = None
    categoria_lingerie: Optional[str] = None
    subcategoria: Optional[str] = None
    tamanho_sutia: Optional[str] = None
    tamanho_calcinha: Optional[str] = None
    cor: Optional[str] = None
    colecao: Optional[str] = None
    material: Optional[str] = None

class ProdutoResponse(ProdutoBase):
    id: int
    loja_id: int
    data_cadastro: Optional[datetime] = None
    data_atualizacao: Optional[datetime] = None
    
    class Config:
        from_attributes = True

class ProdutoListResponse(BaseModel):
    produtos: List[ProdutoResponse]
    total: int
    pagina: int
    total_paginas: int

class DashboardStats(BaseModel):
    totalProdutos: int
    vendasMes: float
    estoquesBaixos: int
    totalClientes: Optional[int] = 0
    ticketMedio: Optional[float] = 0.0
    vendasHoje: Optional[float] = 0.0
    produtosSemEstoque: Optional[int] = 0
    totalVendas: Optional[int] = 0

class UsuarioBase(BaseModel):
    nome: str
    email: str
    perfil: str
    ativo: bool = True

class UsuarioCreate(UsuarioBase):
    password: str

class UsuarioUpdate(BaseModel):
    nome: Optional[str] = None
    email: Optional[str] = None
    perfil: Optional[str] = None
    password: Optional[str] = None
    ativo: Optional[bool] = None

class UsuarioResponse(UsuarioBase):
    id: int
    loja_id: int
    data_criacao: datetime
    
    class Config:
        from_attributes = True

class RelatorioRequest(BaseModel):
    tipos: List[str]
    data_inicio: Optional[str] = None
    data_fim: Optional[str] = None
    
    
# =============================================
# MODELOS PYDANTIC PARA CLIENTES
# =============================================

class ClienteBase(BaseModel):
    nome: str
    email: Optional[str] = None
    telefone: str
    cpf: Optional[str] = None
    endereco: Optional[str] = None
    cidade: Optional[str] = None
    estado: Optional[str] = None
    observacoes: Optional[str] = None
    ativo: bool = True

class ClienteCreate(ClienteBase):
    pass

class ClienteUpdate(BaseModel):
    nome: Optional[str] = None
    email: Optional[str] = None
    telefone: Optional[str] = None
    cpf: Optional[str] = None
    endereco: Optional[str] = None
    cidade: Optional[str] = None
    estado: Optional[str] = None
    observacoes: Optional[str] = None
    ativo: Optional[bool] = None

class ClienteResponse(ClienteBase):
    id: int
    loja_id: int
    data_cadastro: Optional[datetime] = None
    data_atualizacao: Optional[datetime] = None
    
    class Config:
        from_attributes = True

# ✅ DEPENDÊNCIAS DE AUTENTICAÇÃO
async def obter_usuario_atual(request: Request):
    session_token = request.headers.get("Authorization") or request.query_params.get("token")
    
    if not session_token:
        raise HTTPException(status_code=401, detail="Token de sessão não fornecido")
    
    session_data = verificar_sessao(session_token)
    if not session_data:
        raise HTTPException(status_code=401, detail="Sessão inválida ou expirada")
    
    return session_data

def verificar_permissao(session_data: dict, perfis_permitidos: list):
    if session_data['perfil'] not in perfis_permitidos:
        raise HTTPException(
            status_code=403, 
            detail=f"Acesso não autorizado. Perfil necessário: {', '.join(perfis_permitidos)}"
        )

async def obter_admin(request: Request):
    session_data = await obter_usuario_atual(request)
    verificar_permissao(session_data, ['admin'])
    return session_data

async def obter_vendedor(request: Request):
    session_data = await obter_usuario_atual(request)
    verificar_permissao(session_data, ['admin', 'vendedor'])
    return session_data

async def obter_todos_usuarios(request: Request):
    session_data = await obter_usuario_atual(request)
    return session_data

# ✅ INICIALIZAÇÃO DA APLICAÇÃO
app = FastAPI(title="WebOS API - Dashboard & Estoque")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)



# ✅ Middleware para debug
@app.middleware("http")
async def log_requests(request: Request, call_next):
    start_time = time.time()
    
    # Log da requisição
    print(f"🔍 REQUEST: {request.method} {request.url}")
    print(f"📋 Headers: {dict(request.headers)}")
    
    response = await call_next(request)
    
    process_time = time.time() - start_time
    print(f"📤 RESPONSE: {response.status_code} - {process_time:.2f}s")
    
    return response
# =============================================
# ENDPOINTS DE AUTENTICAÇÃO
# =============================================

@app.get("/")
async def root():
    return {"message": "WebOS API - Dashboard & Estoque"}

@app.get("/api/health")
async def health_check():
    return {"status": "healthy", "server": "WebOS API", "modo": "dashboard-estoque"}

@app.post("/api/login", response_model=LoginResponse)
async def login(login_data: LoginData):
    conn = get_db_connection()
    if conn is None:
        raise HTTPException(status_code=500, detail="Erro de conexão com o banco")
    
    try:
        cursor = conn.cursor(dictionary=True)
        
        cursor.execute(
            "SELECT id, nome, password, perfil, loja_id FROM usuarios WHERE nome = %s",
            (login_data.nome,)
        )
        usuarios = cursor.fetchall()
        
        if not usuarios:
            raise HTTPException(status_code=401, detail="Credenciais inválidas")
        
        usuario_encontrado = None
        
        for usuario in usuarios:
            hashed_password = hash_password(login_data.password)
            if usuario['password'] == hashed_password or login_data.password == usuario['password']:
                usuario_encontrado = usuario
                break
        
        if not usuario_encontrado:
            raise HTTPException(status_code=401, detail="Credenciais inválidas")
        
        session_token = str(uuid.uuid4())
        session_data = {
            'user_id': usuario_encontrado['id'],
            'nome': usuario_encontrado['nome'],
            'perfil': usuario_encontrado['perfil'],
            'loja_id': usuario_encontrado['loja_id'],
            'created_at': datetime.now()
        }
        
        active_sessions[session_token] = session_data
        
        print(f"✅ Login realizado: {usuario_encontrado['nome']} - Loja ID: {usuario_encontrado['loja_id']}")
        
        return LoginResponse(
            success=True,
            message="Login realizado com sucesso",
            user_id=usuario_encontrado['id'],
            nome=usuario_encontrado['nome'],
            perfil=usuario_encontrado['perfil'],
            session_token=session_token
        )
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"Erro no login: {e}")
        raise HTTPException(status_code=500, detail=f"Erro no login: {str(e)}")
    finally:
        if cursor: cursor.close()
        if conn: conn.close()

@app.get("/api/user-info")
def user_info(authorization: str = Header(None)):
    if not authorization:
        raise HTTPException(status_code=401, detail="Token não enviado")

    print(f"📝 Token recebido: {authorization}")
    session = verificar_sessao(authorization)
    
    if not session:
        print("⚠️ Sessão inválida ou expirada")
        raise HTTPException(status_code=401, detail="Sessão inválida ou expirada")

    print(f"📝 Sessão ativa: {session}")

    # Retorna apenas os dados essenciais do usuário
    user_data = {
        "id": session.get("id"),
        "nome": session.get("nome"),
        "perfil": session.get("perfil"),
        "loja_id": session.get("loja_id", 1),  # Mono-loja: default 1
    }
    return user_data

    if cursor: cursor.close()
    if conn: conn.close()

@app.post("/api/logout")
async def logout(session_data: dict = Depends(obter_todos_usuarios)):
    session_token = None
    
    for token, data in active_sessions.items():
        if data['user_id'] == session_data['user_id']:
            session_token = token
            break
    
    if session_token:
        del active_sessions[session_token]
    
    return {"success": True, "message": "Logout realizado com sucesso"}

# =============================================
# ENDPOINTS DO DASHBOARD
# =============================================

@app.get("/api/dashboard/estatisticas", response_model=DashboardStats)
async def carregar_estatisticas(session_data: dict = Depends(obter_todos_usuarios)):
    conn = None
    cursor = None
    try:
        print(f"📊 Carregando estatísticas para usuário: {session_data['nome']}")
        
        conn = get_db_connection()
        if not conn:
            print("❌ Erro de conexão com o banco")
            raise HTTPException(status_code=500, detail="Erro de conexão com o banco")
            
        cursor = conn.cursor(dictionary=True)
        
        loja_id = get_loja_id(session_data)
        print(f"🏪 Loja ID: {loja_id}")
        
        # ✅ Query corrigida com tratamento de erro
        try:
            cursor.execute("""
                SELECT 
                    -- Total de Produtos
                    (SELECT COUNT(*) FROM produtos WHERE loja_id = %s AND ativo = 1) as total_produtos,
                    
                    -- Vendas do Mês
                    (SELECT COALESCE(SUM(total_venda), 0) FROM vendas 
                     WHERE loja_id = %s AND MONTH(data_venda) = MONTH(CURRENT_DATE()) 
                     AND YEAR(data_venda) = YEAR(CURRENT_DATE())) as vendas_mes,
                    
                    -- Estoque Baixo
                    (SELECT COUNT(*) FROM produtos 
                     WHERE loja_id = %s AND ativo = 1 
                     AND estoque_atual <= estoque_minimo AND estoque_atual > 0) as estoques_baixos,
                    
                    -- Total de Clientes
                    (SELECT COUNT(*) FROM clientes WHERE loja_id = %s AND ativo = 1) as total_clientes,
                    
                    -- Ticket Médio
                    (SELECT COALESCE(AVG(total_venda), 0) FROM vendas 
                     WHERE loja_id = %s AND MONTH(data_venda) = MONTH(CURRENT_DATE()) 
                     AND YEAR(data_venda) = YEAR(CURRENT_DATE())) as ticket_medio,
                    
                    -- Vendas de Hoje
                    (SELECT COALESCE(SUM(total_venda), 0) FROM vendas 
                     WHERE loja_id = %s AND DATE(data_venda) = CURDATE()) as vendas_hoje,
                    
                    -- Produtos Sem Estoque
                    (SELECT COUNT(*) FROM produtos 
                     WHERE loja_id = %s AND ativo = 1 AND estoque_atual = 0) as produtos_sem_estoque,
                     
                    -- Total de Vendas (quantidade)
                    (SELECT COUNT(*) FROM vendas 
                     WHERE loja_id = %s AND MONTH(data_venda) = MONTH(CURRENT_DATE()) 
                     AND YEAR(data_venda) = YEAR(CURRENT_DATE())) as total_vendas
            """, [loja_id] * 8)
            
            stats = cursor.fetchone()
            print(f"📈 Estatísticas obtidas: {stats}")
            
        except Exception as db_error:
            print(f"❌ Erro na query do banco: {db_error}")
            # Fallback seguro
            stats = {
                'total_produtos': 0,
                'vendas_mes': 0,
                'estoques_baixos': 0,
                'total_clientes': 0,
                'ticket_medio': 0,
                'vendas_hoje': 0,
                'produtos_sem_estoque': 0,
                'total_vendas': 0
            }
        
        return DashboardStats(
            totalProdutos=stats['total_produtos'] or 0,
            vendasMes=float(stats['vendas_mes'] or 0),
            estoquesBaixos=stats['estoques_baixos'] or 0,
            totalClientes=stats['total_clientes'] or 0,
            ticketMedio=float(stats['ticket_medio'] or 0),
            vendasHoje=float(stats['vendas_hoje'] or 0),
            produtosSemEstoque=stats['produtos_sem_estoque'] or 0,
            totalVendas=stats['total_vendas'] or 0
        )
        
    except Exception as e:
        print(f"❌ ERRO em carregar_estatisticas: {str(e)}")
        import traceback
        print(f"🔍 Traceback: {traceback.format_exc()}")
        
        # Fallback seguro
        return DashboardStats(
            totalProdutos=0,
            vendasMes=0.0,
            estoquesBaixos=0,
            totalClientes=0,
            ticketMedio=0.0,
            vendasHoje=0.0,
            produtosSemEstoque=0,
            totalVendas=0
        )
    finally:
        if cursor: 
            cursor.close()
        if conn: 
            conn.close()

@app.get("/api/dashboard/graficos")
async def dashboard_graficos(
    periodo: str = Query("month", regex="^(today|week|month|quarter|year)$"),
    session_data: dict = Depends(obter_admin)
):
    conn = None
    cursor = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)
        
        loja_id = get_loja_id(session_data)
        
        hoje = datetime.now().date()
        data_inicio = hoje
        
        if periodo == "today":
            data_inicio = hoje
        elif periodo == "week":
            data_inicio = hoje - timedelta(days=7)
        elif periodo == "month":
            data_inicio = hoje - timedelta(days=30)
        elif periodo == "quarter":
            data_inicio = hoje - timedelta(days=90)
        elif periodo == "year":
            data_inicio = hoje - timedelta(days=365)
        
        cursor.execute("""
            SELECT 
                DATE(data_venda) as data,
                SUM(total_venda) as valor,
                COUNT(*) as quantidade
            FROM vendas 
            WHERE loja_id = %s AND data_venda >= %s
            GROUP BY DATE(data_venda)
            ORDER BY data
        """, (loja_id, data_inicio))
        
        vendas_por_dia = cursor.fetchall()
        
        cursor.execute("""
            SELECT 
                p.nome as produto,
                SUM(iv.quantidade) as quantidade
            FROM itens_venda iv
            INNER JOIN produtos p ON iv.produto_id = p.id
            INNER JOIN vendas v ON iv.venda_id = v.id
            WHERE v.loja_id = %s AND v.data_venda >= %s
            GROUP BY p.id, p.nome
            ORDER BY quantidade DESC
            LIMIT 5
        """, (loja_id, data_inicio))
        
        produtos_mais_vendidos = cursor.fetchall()
        
        cursor.execute("""
            SELECT 
                forma_pagamento,
                COUNT(*) as quantidade,
                SUM(total_venda) as valor
            FROM vendas 
            WHERE loja_id = %s AND data_venda >= %s
            GROUP BY forma_pagamento
        """, (loja_id, data_inicio))
        
        formas_pagamento = cursor.fetchall()
        
        return {
            "vendas_por_dia": serialize_mysql_data(vendas_por_dia),
            "produtos_mais_vendidos": serialize_mysql_data(produtos_mais_vendidos),
            "formas_pagamento": serialize_mysql_data(formas_pagamento),
            "periodo": periodo
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro ao carregar dados dos gráficos: {str(e)}")
    finally:
        if cursor: cursor.close()
        if conn: conn.close()

# =============================================
# ENDPOINTS DE CONTROLE DE ESTOQUE
# =============================================

@app.get("/api/produtos", response_model=ProdutoListResponse)
async def listar_produtos(
    pagina: Optional[int] = Query(None, ge=1),
    limite: int = Query(10, ge=1, le=1000),
    busca: Optional[str] = Query(None),
    categoria: Optional[str] = Query(None),
    session_data: dict = Depends(obter_todos_usuarios)
):
    conn = None
    cursor = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)
        
        loja_id = get_loja_id(session_data)
        
        query = """
            SELECT id, loja_id, codigo_barras, nome, descricao, categoria, marca,
                   estoque_atual, estoque_minimo, preco_custo, preco_venda, ativo,
                   data_cadastro, data_atualizacao
            FROM produtos 
            WHERE loja_id = %s AND ativo = 1
        """
        params = [loja_id]
        
        if busca:
            query += " AND (nome LIKE %s OR codigo_barras LIKE %s OR descricao LIKE %s)"
            search_term = f"%{busca}%"
            params.extend([search_term, search_term, search_term])
        
        if categoria:
            query += " AND categoria = %s"
            params.append(categoria)
        
        count_query = f"SELECT COUNT(*) as total FROM ({query}) as subquery"
        cursor.execute(count_query, params)
        total = cursor.fetchone()['total']
        
        if limite == 1000 or pagina is None:
            query += " ORDER BY nome"
            cursor.execute(query, params)
            produtos = cursor.fetchall()
            
            # ✅ CORREÇÃO: Serialização garantida
            produtos_serializados = []
            for produto in produtos:
                produto_serializado = {
                    'id': produto['id'],
                    'loja_id': produto['loja_id'],
                    'codigo_barras': str(produto['codigo_barras']) if produto['codigo_barras'] else None,
                    'nome': str(produto['nome']),
                    'descricao': str(produto['descricao']) if produto['descricao'] else None,
                    'categoria': str(produto['categoria']) if produto['categoria'] else None,
                    'marca': str(produto['marca']) if produto['marca'] else None,
                    'estoque_atual': float(produto['estoque_atual']) if produto['estoque_atual'] is not None else 0.0,
                    'estoque_minimo': float(produto['estoque_minimo']) if produto['estoque_minimo'] is not None else 0.0,
                    'preco_custo': float(produto['preco_custo']) if produto['preco_custo'] is not None else 0.0,
                    'preco_venda': float(produto['preco_venda']) if produto['preco_venda'] is not None else 0.0,
                    'ativo': bool(produto['ativo'])
                }
                
                # Datas
                if produto['data_cadastro']:
                    produto_serializado['data_cadastro'] = produto['data_cadastro'].isoformat()
                if produto['data_atualizacao']:
                    produto_serializado['data_atualizacao'] = produto['data_atualizacao'].isoformat()
                    
                produtos_serializados.append(produto_serializado)
            
            return {
                "produtos": produtos_serializados,
                "total": total,
                "pagina": 1,
                "total_paginas": 1
            }
        else:
            offset = (pagina - 1) * limite
            total_paginas = (total + limite - 1) // limite
            
            query += " ORDER BY nome LIMIT %s OFFSET %s"
            params.extend([limite, offset])
            cursor.execute(query, params)
            produtos = cursor.fetchall()
        
        for produto in produtos:
            if produto['data_cadastro']:
                produto['data_cadastro'] = produto['data_cadastro'].isoformat()
            if produto['data_atualizacao']:
                produto['data_atualizacao'] = produto['data_atualizacao'].isoformat()
        
        return {
            "produtos": produtos,
            "total": total,
            "pagina": pagina or 1,
            "total_paginas": total_paginas
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro ao buscar produtos: {str(e)}")
    finally:
        if cursor: cursor.close()
        if conn: conn.close()

@app.get("/api/produtos/todos")
async def listar_todos_produtos(session_data: dict = Depends(obter_todos_usuarios)):
    conn = None
    cursor = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)
        
        loja_id = get_loja_id(session_data)
        
        cursor.execute("""
            SELECT id, nome, codigo_barras, preco_venda, estoque_atual
            FROM produtos 
            WHERE loja_id = %s AND ativo = 1
            ORDER BY nome
        """, (loja_id,))
        
        produtos = cursor.fetchall()
        
        return {
            "success": True,
            "produtos": produtos,
            "total": len(produtos)
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro ao buscar produtos: {str(e)}")
    finally:
        if cursor: cursor.close()
        if conn: conn.close()

@app.get("/api/produtos/{produto_id}")
async def obter_produto(produto_id: int, session_data: dict = Depends(obter_todos_usuarios)):
    conn = None
    cursor = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)
        
        loja_id = get_loja_id(session_data)
        
        cursor.execute("""
            SELECT id, loja_id, codigo_barras, nome, descricao, categoria, marca,
                   estoque_atual, estoque_minimo, preco_custo, preco_venda, ativo,
                   data_cadastro, data_atualizacao
            FROM produtos 
            WHERE id = %s AND loja_id = %s AND ativo = 1
        """, (produto_id, loja_id))
        
        produto = cursor.fetchone()
        
        if not produto:
            raise HTTPException(status_code=404, detail="Produto não encontrado")
        
        if produto['data_cadastro']:
            produto['data_cadastro'] = produto['data_cadastro'].isoformat()
        if produto['data_atualizacao']:
            produto['data_atualizacao'] = produto['data_atualizacao'].isoformat()
        
        return produto
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro ao buscar produto: {str(e)}")
    finally:
        if cursor: cursor.close()
        if conn: conn.close()

@app.post("/api/produtos")
async def criar_produto(produto_data: ProdutoCreate, session_data: dict = Depends(obter_todos_usuarios)):
    conn = None
    cursor = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)
        
        loja_id = get_loja_id(session_data)
        
        if produto_data.codigo_barras:
            cursor.execute(
                "SELECT id FROM produtos WHERE codigo_barras = %s AND loja_id = %s",
                (produto_data.codigo_barras, loja_id)
            )
            if cursor.fetchone():
                raise HTTPException(status_code=400, detail="Já existe produto com este código de barras")
        
        # ✅ QUERY ATUALIZADA COM TODOS OS CAMPOS
        cursor.execute("""
            INSERT INTO produtos (
                loja_id, codigo_barras, nome, descricao, categoria, marca,
                estoque_atual, estoque_minimo, preco_custo, preco_venda, ativo,
                subcategoria, tamanho_sutia, tamanho_calcinha, cor, material, colecao
            ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
        """, (
            loja_id, produto_data.codigo_barras, produto_data.nome, 
            produto_data.descricao, produto_data.categoria, produto_data.marca,
            produto_data.estoque_atual, produto_data.estoque_minimo, 
            produto_data.preco_custo, produto_data.preco_venda, produto_data.ativo,
            produto_data.subcategoria, produto_data.tamanho_sutia, 
            produto_data.tamanho_calcinha, produto_data.cor,
            produto_data.material, produto_data.colecao  # ✅ NOVOS CAMPOS
        ))
        
        produto_id = cursor.lastrowid
        conn.commit()
        
        # ✅ BUSCAR PRODUTO CRIADO COM TODOS OS CAMPOS
        cursor.execute("""
            SELECT id, loja_id, codigo_barras, nome, descricao, categoria, marca,
                   estoque_atual, estoque_minimo, preco_custo, preco_venda, ativo,
                   subcategoria, tamanho_sutia, tamanho_calcinha, cor, material, colecao,
                   data_cadastro, data_atualizacao
            FROM produtos WHERE id = %s
        """, (produto_id,))
        
        produto = cursor.fetchone()
        
        # ✅ SERIALIZAR DATAS
        if produto and produto['data_cadastro']:
            produto['data_cadastro'] = produto['data_cadastro'].isoformat()
        if produto and produto['data_atualizacao']:
            produto['data_atualizacao'] = produto['data_atualizacao'].isoformat()
        
        return {
            "success": True,
            "message": "Produto criado com sucesso",
            "produto": produto
        }
        
    except HTTPException:
        raise
    except Exception as e:
        if conn: conn.rollback()
        print(f"❌ Erro ao criar produto: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Erro ao criar produto: {str(e)}")
    finally:
        if cursor: cursor.close()
        if conn: conn.close()

@app.put("/api/produtos/{produto_id}")
async def atualizar_produto(produto_id: int, produto_data: ProdutoUpdate, session_data: dict = Depends(obter_todos_usuarios)):
    conn = None
    cursor = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)
        
        loja_id = get_loja_id(session_data)
        
        cursor.execute(
            "SELECT id FROM produtos WHERE id = %s AND loja_id = %s",
            (produto_id, loja_id)
        )
        if not cursor.fetchone():
            raise HTTPException(status_code=404, detail="Produto não encontrado")
        
        if produto_data.codigo_barras:
            cursor.execute(
                "SELECT id FROM produtos WHERE codigo_barras = %s AND loja_id = %s AND id != %s",
                (produto_data.codigo_barras, loja_id, produto_id)
            )
            if cursor.fetchone():
                raise HTTPException(status_code=400, detail="Código de barras já está em uso por outro produto")
        
        update_fields = []
        update_values = []
        
        # ✅ ADICIONAR TODOS OS CAMPOS PARA ATUALIZAÇÃO
        campos_para_atualizar = [
            ('codigo_barras', produto_data.codigo_barras),
            ('nome', produto_data.nome),
            ('descricao', produto_data.descricao),
            ('categoria', produto_data.categoria),
            ('marca', produto_data.marca),
            ('estoque_atual', produto_data.estoque_atual),
            ('estoque_minimo', produto_data.estoque_minimo),
            ('preco_custo', produto_data.preco_custo),
            ('preco_venda', produto_data.preco_venda),
            ('ativo', produto_data.ativo),
            ('subcategoria', produto_data.subcategoria),
            ('tamanho_sutia', produto_data.tamanho_sutia),
            ('tamanho_calcinha', produto_data.tamanho_calcinha),
            ('cor', produto_data.cor),
            ('material', produto_data.material),      # ✅ NOVO CAMPO
            ('colecao', produto_data.colecao)         # ✅ NOVO CAMPO
        ]
        
        for campo, valor in campos_para_atualizar:
            if valor is not None:
                update_fields.append(f"{campo} = %s")
                update_values.append(valor)
        
        if not update_fields:
            raise HTTPException(status_code=400, detail="Nenhum campo fornecido para atualização")
        
        update_fields.append("data_atualizacao = CURRENT_TIMESTAMP")
        update_values.extend([produto_id, loja_id])
        
        query = f"UPDATE produtos SET {', '.join(update_fields)} WHERE id = %s AND loja_id = %s"
        cursor.execute(query, update_values)
        
        conn.commit()
        
        # ✅ BUSCAR PRODUTO ATUALIZADO COM TODOS OS CAMPOS
        cursor.execute("""
            SELECT id, loja_id, codigo_barras, nome, descricao, categoria, marca,
                   estoque_atual, estoque_minimo, preco_custo, preco_venda, ativo,
                   subcategoria, tamanho_sutia, tamanho_calcinha, cor, material, colecao,
                   data_cadastro, data_atualizacao
            FROM produtos WHERE id = %s AND loja_id = %s
        """, (produto_id, loja_id))
        
        produto_atualizado = cursor.fetchone()
        
        # ✅ SERIALIZAR DATAS
        if produto_atualizado and produto_atualizado['data_cadastro']:
            produto_atualizado['data_cadastro'] = produto_atualizado['data_cadastro'].isoformat()
        if produto_atualizado and produto_atualizado['data_atualizacao']:
            produto_atualizado['data_atualizacao'] = produto_atualizado['data_atualizacao'].isoformat()
        
        return {
            "success": True,
            "message": "Produto atualizado com sucesso",
            "produto": produto_atualizado
        }
        
    except HTTPException:
        raise
    except Exception as e:
        if conn: conn.rollback()
        print(f"❌ Erro ao atualizar produto: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Erro ao atualizar produto: {str(e)}")
    finally:
        if cursor: cursor.close()
        if conn: conn.close()

@app.delete("/api/produtos/{produto_id}")
async def excluir_produto(produto_id: int, session_data: dict = Depends(obter_todos_usuarios)):
    conn = None
    cursor = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        loja_id = get_loja_id(session_data)
        
        cursor.execute(
            "SELECT id FROM produtos WHERE id = %s AND loja_id = %s",
            (produto_id, loja_id)
        )
        if not cursor.fetchone():
            raise HTTPException(status_code=404, detail="Produto não encontrado")
        
        cursor.execute(
            "UPDATE produtos SET ativo = 0, data_atualizacao = CURRENT_TIMESTAMP WHERE id = %s AND loja_id = %s",
            (produto_id, loja_id)
        )
        
        conn.commit()
        
        return {
            "success": True,
            "message": "Produto excluído com sucesso"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        if conn: conn.rollback()
        raise HTTPException(status_code=500, detail=f"Erro ao excluir produto: {str(e)}")
    finally:
        if cursor: cursor.close()
        if conn: conn.close()






# =============================================
# ENDPOINTS DE VENDAS RÁPIDAS
# =============================================

# ✅ CORREÇÃO NO ENDPOINT DE VENDAS


# ✅ ENDPOINT CORRIGIDO PARA VENDAS RECENTES
@app.get("/api/dashboard/vendas-recentes")
async def vendas_recentes_dashboard(session_data: dict = Depends(obter_todos_usuarios)):
    conn = None
    cursor = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)
        
        loja_id = get_loja_id(session_data)
        
        # ✅ QUERY CORRIGIDA - Buscar últimas 5 vendas
        cursor.execute("""
            SELECT 
                v.id,
                v.numero_venda,
                v.cliente,
                v.total_venda,
                v.forma_pagamento,
                v.data_venda,
                u.nome as vendedor
            FROM vendas v
            LEFT JOIN usuarios u ON v.usuario_id = u.id
            WHERE v.loja_id = %s
            ORDER BY v.data_venda DESC
            LIMIT 5
        """, (loja_id,))
        
        vendas = cursor.fetchall()
        
        # ✅ FORMATAR OS DADOS PARA O FRONTEND
        vendas_formatadas = []
        for venda in vendas:
            # Formatar data
            data_venda = venda['data_venda']
            if isinstance(data_venda, datetime):
                data_formatada = data_venda.strftime("%d/%m, %H:%M")
            else:
                # Se já for string, tentar converter
                try:
                    data_obj = datetime.fromisoformat(str(data_venda).replace('Z', '+00:00'))
                    data_formatada = data_obj.strftime("%d/%m, %H:%M")
                except:
                    data_formatada = str(data_venda)
            
            # Garantir que o cliente não seja nulo
            cliente = venda['cliente'] or "Cliente não identificado"
            
            # Garantir que o total não seja nulo
            total = float(venda['total_venda'] or 0)
            
            vendas_formatadas.append({
                "id": venda['id'],
                "numero_venda": venda['numero_venda'],
                "cliente": cliente,
                "total": total,
                "data_formatada": data_formatada,
                "forma_pagamento": venda['forma_pagamento'],
                "vendedor": venda['vendedor']
            })
        
        print(f"✅ Vendas recentes encontradas: {len(vendas_formatadas)}")
        
        return {
            "success": True,
            "vendas_recentes": vendas_formatadas
        }
        
    except Exception as e:
        print(f"❌ Erro ao buscar vendas recentes: {str(e)}")
        return {
            "success": False,
            "vendas_recentes": [],
            "error": str(e)
        }
    finally:
        if cursor: cursor.close()
        if conn: conn.close()

@app.post("/api/vendas", response_model=VendaResponse)
async def criar_venda(venda_data: VendaData, session_data: dict = Depends(obter_vendedor)):
    if not venda_data.itens or len(venda_data.itens) == 0:
        raise HTTPException(status_code=400, detail="Nenhum item na venda")
    
    # ✅ VALIDAÇÃO DO CLIENTE
    if not venda_data.cliente or venda_data.cliente.strip() == "":
        venda_data.cliente = "Cliente não identificado"
    else:
        venda_data.cliente = venda_data.cliente.strip()
    
    # ✅ CALCULAR TOTAL SE NÃO FORNECIDO
    if venda_data.total_venda is None or venda_data.total_venda <= 0:
        venda_data.total_venda = sum(item.preco_Total for item in venda_data.itens)
    
    venda_data.usuario_id = session_data['user_id']
    
    conn = None
    cursor = None
    try:
        conn = get_db_connection()
        if not conn:
            raise HTTPException(status_code=500, detail="Erro de conexão com o banco")
        
        cursor = conn.cursor(dictionary=True)
        
        loja_id = get_loja_id(session_data)
        
        print(f"🛒 Processando venda para cliente: {venda_data.cliente}")
        print(f"💰 Total da venda: R$ {venda_data.total_venda:.2f}")
        print(f"📦 Itens: {len(venda_data.itens)}")
        
        # ✅ VERIFICAÇÃO DE ESTOQUE MELHORADA
        produtos_para_atualizar = []
        
        for index, item in enumerate(venda_data.itens):
            print(f"🔍 Processando item {index + 1}: {item.produto}")
            
            if not item.produto or not item.quantidade or item.quantidade <= 0:
                print(f"⚠️ Item {index + 1} inválido, pulando...")
                continue
            
            # ✅ BUSCAR PRODUTO POR ID OU NOME
            produto_encontrado = None
            
            # Tentar buscar por ID se disponível
            if hasattr(item, 'produto_id') and item.produto_id:
                cursor.execute(
                    """SELECT id, nome, estoque_atual, preco_venda 
                    FROM produtos 
                    WHERE id = %s AND loja_id = %s AND ativo = 1""",
                    (item.produto_id, loja_id)
                )
                produto_encontrado = cursor.fetchone()
            
            # Se não encontrou por ID, buscar por nome
            if not produto_encontrado:
                cursor.execute(
                    """SELECT id, nome, estoque_atual, preco_venda 
                    FROM produtos 
                    WHERE nome = %s AND loja_id = %s AND ativo = 1""",
                    (item.produto, loja_id)
                )
                produto_encontrado = cursor.fetchone()
            
            if not produto_encontrado:
                print(f"❌ Produto não encontrado: {item.produto}")
                raise HTTPException(
                    status_code=404,
                    detail=f"Produto '{item.produto}' não encontrado no estoque"
                )
            
            produto_id = produto_encontrado['id']
            nome_produto = produto_encontrado['nome']
            estoque_atual = produto_encontrado['estoque_atual']
            
            print(f"✅ Produto encontrado: {nome_produto} (ID: {produto_id}), Estoque: {estoque_atual}")
            
            # ✅ VALIDAR ESTOQUE
            if estoque_atual is not None and estoque_atual < item.quantidade:
                raise HTTPException(
                    status_code=400,
                    detail=f"Estoque insuficiente para '{nome_produto}'. Disponível: {estoque_atual}, Solicitado: {item.quantidade}"
                )
            
            # ✅ USAR PREÇO DO BANCO DE DADOS SE NECESSÁRIO
            if item.preco_Unitario <= 0:
                item.preco_Unitario = produto_encontrado['preco_venda']
                item.preco_Total = item.preco_Unitario * item.quantidade
                print(f"💰 Preço ajustado: R$ {item.preco_Unitario:.2f} x {item.quantidade} = R$ {item.preco_Total:.2f}")
            
            # ✅ ADICIONAR À LISTA PARA ATUALIZAÇÃO
            produtos_para_atualizar.append({
                'produto_id': produto_id,
                'nome': nome_produto,
                'quantidade_vendida': item.quantidade,
                'estoque_atual': estoque_atual,
                'novo_estoque': estoque_atual - item.quantidade,
                'item_data': item
            })
        
        # ✅ GERAR NÚMERO DA VENDA
        numero_venda = None
        tentativas = 0
        max_tentativas = 10
        
        while not numero_venda and tentativas < max_tentativas:
            try:
                cursor.execute("""
                    SELECT COALESCE(MAX(CAST(SUBSTRING(numero_venda, 2) AS UNSIGNED)), 0) 
                    FROM vendas WHERE loja_id = %s
                """, (loja_id,))
                
                resultado = cursor.fetchone()
                ultimo_numero = int(resultado['COALESCE(MAX(CAST(SUBSTRING(numero_venda, 2) AS UNSIGNED)), 0)']) if resultado else 0
                proximo_numero = ultimo_numero + 1
                numero_venda_candidato = f"V{proximo_numero:04d}"
                
                cursor.execute(
                    "SELECT id FROM vendas WHERE numero_venda = %s AND loja_id = %s",
                    (numero_venda_candidato, loja_id)
                )
                
                if not cursor.fetchone():
                    numero_venda = numero_venda_candidato
                else:
                    tentativas += 1
                    continue
                    
            except Exception as e:
                print(f"⚠️ Erro ao gerar número venda (tentativa {tentativas + 1}): {e}")
                tentativas += 1
                continue
        
        if not numero_venda:
            timestamp = int(datetime.now().timestamp())
            numero_venda = f"V{timestamp % 10000:04d}"
            print(f"⚠️ Usando fallback para número da venda: {numero_venda}")
        
        print(f"🔢 Número da venda gerado: {numero_venda}")
        
        # ✅ CORREÇÃO: DEFINIR STATUS COMO "concluida" (SEM ACENTO)
        status_venda = "concluida"
        
        # ✅ INSERIR VENDA PRINCIPAL - CORRIGIDO COM STATUS
        cursor.execute(
            """INSERT INTO vendas 
            (loja_id, numero_venda, cliente, total_venda, total_pago, forma_pagamento, 
             observacoes, data_venda, vendedor_id, usuario_id, status) 
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)""",
            (loja_id, numero_venda, venda_data.cliente, venda_data.total_venda,
             venda_data.total_venda, venda_data.forma_pagamento, 
             venda_data.observacoes or "Venda rápida - Sistema WebOS", 
             venda_data.data_venda, session_data['user_id'], venda_data.usuario_id, status_venda)
        )
        
        venda_id = cursor.lastrowid
        print(f"✅ Venda principal criada: ID {venda_id}")
        
        # ✅ PROCESSAR ITENS DA VENDA E ATUALIZAR ESTOQUE
        for produto_info in produtos_para_atualizar:
            produto_id = produto_info['produto_id']
            quantidade_vendida = produto_info['quantidade_vendida']
            novo_estoque = produto_info['novo_estoque']
            item_data = produto_info['item_data']
            
            print(f"📦 Atualizando estoque do produto {produto_id}: {produto_info['estoque_atual']} -> {novo_estoque}")
            
            # ✅ ATUALIZAR ESTOQUE
            cursor.execute(
                "UPDATE produtos SET estoque_atual = %s WHERE id = %s",
                (novo_estoque, produto_id)
            )
            
            # ✅ INSERIR ITEM DA VENDA
            cursor.execute(
                """INSERT INTO itens_venda 
                (venda_id, produto_id, produto_nome, quantidade, valor_unitario, total_item) 
                VALUES (%s, %s, %s, %s, %s, %s)""",
                (venda_id, produto_id, produto_info['nome'], quantidade_vendida, 
                 item_data.preco_Unitario, item_data.preco_Total)
            )
            
            print(f"✅ Item registrado: {produto_info['nome']} x {quantidade_vendida}")
        
        conn.commit()
        
        print(f"✅ Venda #{numero_venda} registrada com sucesso!")
        print(f"   Cliente: {venda_data.cliente}")
        print(f"   Total: R$ {venda_data.total_venda:.2f}")
        print(f"   Itens: {len(produtos_para_atualizar)}")
        print(f"   Venda ID: {venda_id}")
        print(f"   Status: {status_venda}")
        
        return VendaResponse(
            success=True,
            message="Venda registrada com sucesso! Estoque atualizado.",
            venda_id=venda_id,
            numero_venda=numero_venda
        )
        
    except HTTPException:
        if conn: 
            conn.rollback()
        raise
    except Exception as e:
        if conn: 
            conn.rollback()
        print(f"❌ Erro ao registrar venda: {str(e)}")
        import traceback
        print(f"🔍 Traceback: {traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=f"Erro ao registrar venda: {str(e)}")
    finally:
        if cursor: 
            cursor.close()
        if conn: 
            conn.close()

@app.get("/api/vendas")
async def listar_vendas(session_data: dict = Depends(obter_vendedor)):
    conn = None
    cursor = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)
        
        loja_id = get_loja_id(session_data)
        
        if session_data['perfil'] == 'admin':
            cursor.execute("""
                SELECT 
                    v.id,
                    v.numero_venda,
                    v.cliente,
                    v.total_venda,
                    v.forma_pagamento,
                    v.observacoes,
                    v.data_venda,
                    v.usuario_id,
                    v.loja_id,
                    COALESCE(v.status, 'concluida') as status,  -- ✅ CORREÇÃO: Garantir status padrão
                    u.nome as usuario_nome 
                FROM vendas v
                INNER JOIN usuarios u ON v.usuario_id = u.id
                WHERE v.loja_id = %s
                ORDER BY v.data_venda DESC
            """, (loja_id,))
        else:
            cursor.execute("""
                SELECT 
                    v.id,
                    v.numero_venda,
                    v.cliente,
                    v.total_venda,
                    v.forma_pagamento,
                    v.observacoes,
                    v.data_venda,
                    v.usuario_id,
                    v.loja_id,
                    COALESCE(v.status, 'concluida') as status,  -- ✅ CORREÇÃO: Garantir status padrão
                    u.nome as usuario_nome 
                FROM vendas v
                INNER JOIN usuarios u ON v.usuario_id = u.id
                WHERE v.loja_id = %s AND v.usuario_id = %s
                ORDER BY v.data_venda DESC
            """, (loja_id, session_data['user_id']))
        
        vendas = cursor.fetchall()
        return {"vendas": vendas}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro ao listar vendas: {str(e)}")
    finally:
        if cursor: cursor.close()
        if conn: conn.close()

@app.post("/api/fechamento-caixa/completo", response_model=FechamentoCaixaResponse)
async def fechar_caixa_completo(fechamento_data: FechamentoCaixaCompleto, session_data: dict = Depends(obter_vendedor)):
    conn = None
    cursor = None
    
    print(f"🔄 Iniciando fechamento completo de caixa...")
    
    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)
        
        loja_id = get_loja_id(session_data)
        user_id = session_data['user_id']
        
        if fechamento_data.valor_final < 0:
            raise HTTPException(status_code=400, detail="Valor final não pode ser negativo")
        
        cursor.execute("""
            SELECT id, status FROM fechamento_caixa 
            WHERE user_id = %s AND data = %s AND loja_id = %s
            ORDER BY created_at DESC
            LIMIT 1
        """, (user_id, fechamento_data.data, loja_id))
        
        fechamento_existente = cursor.fetchone()
        
        if fechamento_existente and fechamento_existente['status'] == 'fechado':
            print("📝 Criando novo registro de fechamento (já existe um fechado)")
            cursor.execute("""
                INSERT INTO fechamento_caixa 
                (user_id, loja_id, data, valor_inicial, valor_final, total_vendas, 
                 total_entradas, total_saidas, total_os_entregues, observacoes, status, created_at)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, 'fechado', NOW())
            """, (
                user_id, loja_id, fechamento_data.data,
                fechamento_data.valor_inicial, fechamento_data.valor_final,
                fechamento_data.total_vendas, fechamento_data.total_entradas,
                fechamento_data.total_saidas, fechamento_data.total_os_entregues or 0,
                fechamento_data.observacoes
            ))
            fechamento_id = cursor.lastrowid
            
        elif fechamento_existente and fechamento_existente['status'] == 'aberto':
            print("📝 Atualizando fechamento existente")
            cursor.execute("""
                UPDATE fechamento_caixa 
                SET valor_inicial = %s, valor_final = %s, total_vendas = %s,
                    total_entradas = %s, total_saidas = %s, total_os_entregues = %s,
                    observacoes = %s, status = 'fechado', 
                    reaberto_por = NULL, data_reabertura = NULL
                WHERE id = %s
            """, (
                fechamento_data.valor_inicial, fechamento_data.valor_final,
                fechamento_data.total_vendas, fechamento_data.total_entradas,
                fechamento_data.total_saidas, fechamento_data.total_os_entregues or 0,
                fechamento_data.observacoes, fechamento_existente['id']
            ))
            fechamento_id = fechamento_existente['id']
            
        else:
            print("📝 Criando primeiro fechamento do dia")
            cursor.execute("""
                INSERT INTO fechamento_caixa 
                (user_id, loja_id, data, valor_inicial, valor_final, total_vendas, 
                 total_entradas, total_saidas, total_os_entregues, observacoes, status, created_at)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, 'fechado', NOW())
            """, (
                user_id, loja_id, fechamento_data.data,
                fechamento_data.valor_inicial, fechamento_data.valor_final,
                fechamento_data.total_vendas, fechamento_data.total_entradas,
                fechamento_data.total_saidas, fechamento_data.total_os_entregues or 0,
                fechamento_data.observacoes
            ))
            fechamento_id = cursor.lastrowid
        
        conn.commit()
        
        cursor.execute("""
            SELECT 
                fc.*, 
                u.nome as usuario,
                ur.nome as usuario_reabertura
            FROM fechamento_caixa fc
            INNER JOIN usuarios u ON fc.user_id = u.id
            LEFT JOIN usuarios ur ON fc.reaberto_por = ur.id
            WHERE fc.id = %s
        """, (fechamento_id,))
        
        fechamento = cursor.fetchone()
        
        print(f"✅ Caixa fechado com sucesso! ID: {fechamento_id}")
        
        return FechamentoCaixaResponse(**fechamento)
        
    except HTTPException:
        raise
    except Exception as e:
        if conn: 
            conn.rollback()
        print(f"❌ Erro ao fechar caixa: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Erro ao fechar caixa: {str(e)}")
    finally:
        if cursor: cursor.close()
        if conn: conn.close()

@app.get("/api/fechamento-caixa/hoje")
async def verificar_fechamento_hoje(session_data: dict = Depends(obter_vendedor)):
    conn = None
    cursor = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)
        
        hoje = date.today().isoformat()
        loja_id = get_loja_id(session_data)
        
        cursor.execute("""
            SELECT id, data, status, valor_final, created_at, user_id
            FROM fechamento_caixa 
            WHERE user_id = %s AND data = %s AND loja_id = %s
            ORDER BY created_at DESC
            LIMIT 1
        """, (session_data['user_id'], hoje, loja_id))
        
        fechamento = cursor.fetchone()
        
        if fechamento:
            esta_fechado = fechamento['status'] == 'fechado'
            
            return {
                "fechado": esta_fechado,
                "fechamento": fechamento
            }
        else:
            return {
                "fechado": False,
                "fechamento": None
            }
        
    except Exception as e:
        return {
            "fechado": False,
            "fechamento": None,
            "erro": str(e)
        }
    finally:
        if cursor: cursor.close()
        if conn: conn.close()

# =============================================
# ENDPOINTS DE USUÁRIOS
# =============================================

@app.get("/api/usuarios")
async def listar_usuarios(session_data: dict = Depends(obter_todos_usuarios)):
    if session_data['perfil'] != 'admin':
        raise HTTPException(status_code=403, detail="Apenas administradores podem visualizar usuários")
    
    conn = None
    cursor = None
    try:
        conn = get_db_connection()
        if not conn:
            raise HTTPException(status_code=500, detail="Erro de conexão com o banco")
            
        cursor = conn.cursor(dictionary=True)
        
        loja_id = get_loja_id(session_data)
        
        cursor.execute("""
            SELECT id, loja_id, nome, email, perfil, ativo, data_criacao
            FROM usuarios 
            WHERE loja_id = %s
            ORDER BY nome
        """, (loja_id,))
        
        usuarios = cursor.fetchall()
        
        for usuario in usuarios:
            if usuario['data_criacao']:
                usuario['data_criacao'] = usuario['data_criacao'].isoformat()
        
        return {"usuarios": usuarios}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro ao buscar usuários: {str(e)}")
    finally:
        if cursor: cursor.close()
        if conn: conn.close()

@app.post("/api/usuarios")
async def criar_usuario(usuario_data: UsuarioCreate, session_data: dict = Depends(obter_todos_usuarios)):
    if session_data['perfil'] != 'admin':
        raise HTTPException(status_code=403, detail="Apenas administradores podem criar usuários")
    
    conn = None
    cursor = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)
        
        loja_id = get_loja_id(session_data)
        
        cursor.execute(
            "SELECT id FROM usuarios WHERE nome = %s AND loja_id = %s",
            (usuario_data.nome, loja_id)
        )
        if cursor.fetchone():
            raise HTTPException(status_code=400, detail="Já existe usuário com este nome")
        
        if usuario_data.email:
            cursor.execute(
                "SELECT id FROM usuarios WHERE email = %s AND loja_id = %s",
                (usuario_data.email, loja_id)
            )
            if cursor.fetchone():
                raise HTTPException(status_code=400, detail="Já existe usuário com este email")
        
        hashed_password = hash_password(usuario_data.password)
        
        cursor.execute("""
            INSERT INTO usuarios (loja_id, nome, email, password, perfil, ativo, data_criacao)
            VALUES (%s, %s, %s, %s, %s, %s, NOW())
        """, (
            loja_id, usuario_data.nome, usuario_data.email, 
            hashed_password, usuario_data.perfil, usuario_data.ativo
        ))
        
        usuario_id = cursor.lastrowid
        conn.commit()
        
        cursor.execute("""
            SELECT id, loja_id, nome, email, perfil, ativo, data_criacao
            FROM usuarios WHERE id = %s
        """, (usuario_id,))
        
        usuario = cursor.fetchone()
        
        if usuario and usuario['data_criacao']:
            usuario['data_criacao'] = usuario['data_criacao'].isoformat()
        
        return {
            "success": True,
            "message": "Usuário criado com sucesso",
            "usuario": usuario
        }
        
    except HTTPException:
        raise
    except Exception as e:
        if conn: conn.rollback()
        raise HTTPException(status_code=500, detail=f"Erro ao criar usuário: {str(e)}")
    finally:
        if cursor: cursor.close()
        if conn: conn.close()

@app.put("/api/usuarios/{usuario_id}")
async def atualizar_usuario(usuario_id: int, usuario_data: UsuarioUpdate, session_data: dict = Depends(obter_todos_usuarios)):
    if session_data['perfil'] != 'admin':
        raise HTTPException(status_code=403, detail="Apenas administradores podem editar usuários")
    
    conn = None
    cursor = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)
        
        loja_id = get_loja_id(session_data)
        
        cursor.execute(
            "SELECT id FROM usuarios WHERE id = %s AND loja_id = %s",
            (usuario_id, loja_id)
        )
        if not cursor.fetchone():
            raise HTTPException(status_code=404, detail="Usuário não encontrado")
        
        update_fields = []
        update_values = []
        
        if usuario_data.nome is not None:
            update_fields.append("nome = %s")
            update_values.append(usuario_data.nome)
        
        if usuario_data.email is not None:
            update_fields.append("email = %s")
            update_values.append(usuario_data.email)
        
        if usuario_data.perfil is not None:
            update_fields.append("perfil = %s")
            update_values.append(usuario_data.perfil)
        
        if usuario_data.ativo is not None:
            update_fields.append("ativo = %s")
            update_values.append(usuario_data.ativo)
        
        if usuario_data.password is not None:
            hashed_password = hash_password(usuario_data.password)
            update_fields.append("password = %s")
            update_values.append(hashed_password)
        
        if not update_fields:
            raise HTTPException(status_code=400, detail="Nenhum campo fornecido para atualização")
        
        update_values.extend([usuario_id, loja_id])
        
        query = f"UPDATE usuarios SET {', '.join(update_fields)} WHERE id = %s AND loja_id = %s"
        cursor.execute(query, update_values)
        
        conn.commit()
        
        cursor.execute("""
            SELECT id, loja_id, nome, email, perfil, ativo, data_criacao
            FROM usuarios WHERE id = %s AND loja_id = %s
        """, (usuario_id, loja_id))
        
        usuario_atualizado = cursor.fetchone()
        
        if usuario_atualizado and usuario_atualizado['data_criacao']:
            usuario_atualizado['data_criacao'] = usuario_atualizado['data_criacao'].isoformat()
        
        return {
            "success": True,
            "message": "Usuário atualizado com sucesso",
            "usuario": usuario_atualizado
        }
        
    except HTTPException:
        raise
    except Exception as e:
        if conn: conn.rollback()
        raise HTTPException(status_code=500, detail=f"Erro ao atualizar usuário: {str(e)}")
    finally:
        if cursor: cursor.close()
        if conn: conn.close()

# =============================================
# ENDPOINTS DE RELATÓRIOS E ANALYTICS
# =============================================

@app.get("/api/relatorios/vendas-periodo")
async def relatorios_vendas_periodo(
    data_inicio: Optional[str] = Query(None),
    data_fim: Optional[str] = Query(None),
    session_data: dict = Depends(obter_admin)
):
    conn = None
    cursor = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)
        
        loja_id = get_loja_id(session_data)
        
        query = """
            SELECT 
                DATE(v.data_venda) as data,
                COUNT(*) as quantidade_vendas,
                SUM(v.total_venda) as valor_total,
                AVG(v.total_venda) as ticket_medio,
                COUNT(DISTINCT v.usuario_id) as vendedores_ativos
            FROM vendas v
            WHERE v.loja_id = %s
        """
        params = [loja_id]
        
        if data_inicio and data_fim:
            query += " AND DATE(v.data_venda) BETWEEN %s AND %s"
            params.extend([data_inicio, data_fim])
        
        query += " GROUP BY DATE(v.data_venda) ORDER BY data"
        
        cursor.execute(query, params)
        dados_vendas = cursor.fetchall()
        
        cursor.execute("""
            SELECT 
                forma_pagamento,
                COUNT(*) as quantidade,
                SUM(total_venda) as valor_total
            FROM vendas 
            WHERE loja_id = %s
            GROUP BY forma_pagamento
        """, (loja_id,))
        
        formas_pagamento = cursor.fetchall()
        
        cursor.execute("""
            SELECT 
                p.nome as produto,
                SUM(iv.quantidade) as quantidade_vendida,
                SUM(iv.total_item) as valor_total
            FROM itens_venda iv
            INNER JOIN produtos p ON iv.produto_id = p.id
            INNER JOIN vendas v ON iv.venda_id = v.id
            WHERE v.loja_id = %s
            GROUP BY p.id, p.nome
            ORDER BY quantidade_vendida DESC
            LIMIT 10
        """, (loja_id,))
        
        produtos_mais_vendidos = cursor.fetchall()
        
        return {
            "periodo": {
                "inicio": data_inicio,
                "fim": data_fim
            },
            "vendas_por_dia": serialize_mysql_data(dados_vendas),
            "formas_pagamento": serialize_mysql_data(formas_pagamento),
            "produtos_mais_vendidos": serialize_mysql_data(produtos_mais_vendidos),
            "total_geral": {
                "quantidade_vendas": sum(item['quantidade_vendas'] for item in dados_vendas),
                "valor_total": float(sum(item['valor_total'] for item in dados_vendas)),
                "ticket_medio": float(sum(item['valor_total'] for item in dados_vendas) / sum(item['quantidade_vendas'] for item in dados_vendas)) if dados_vendas else 0
            }
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro ao gerar relatório de vendas: {str(e)}")
    finally:
        if cursor: cursor.close()
        if conn: conn.close()

@app.get("/api/relatorios/estoque-detalhado")
async def relatorio_estoque_detalhado(session_data: dict = Depends(obter_admin)):
    conn = None
    cursor = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)
        
        loja_id = get_loja_id(session_data)
        
        cursor.execute("""
            SELECT 
                p.nome,
                p.codigo_barras,
                p.categoria,
                p.marca,
                p.estoque_atual,
                p.estoque_minimo,
                p.preco_custo,
                p.preco_venda,
                (p.estoque_atual * p.preco_custo) as valor_estoque,
                CASE 
                    WHEN p.estoque_atual = 0 THEN 'CRÍTICO'
                    WHEN p.estoque_atual <= p.estoque_minimo THEN 'BAIXO'
                    ELSE 'NORMAL'
                END as status_estoque
            FROM produtos p
            WHERE p.loja_id = %s AND p.ativo = 1
            ORDER BY status_estoque, p.nome
        """, (loja_id,))
        
        produtos = cursor.fetchall()
        
        cursor.execute("""
            SELECT 
                COUNT(*) as total_produtos,
                SUM(CASE WHEN estoque_atual = 0 THEN 1 ELSE 0 END) as produtos_sem_estoque,
                SUM(CASE WHEN estoque_atual <= estoque_minimo AND estoque_atual > 0 THEN 1 ELSE 0 END) as produtos_estoque_baixo,
                SUM(estoque_atual * preco_custo) as valor_total_estoque,
                AVG(preco_venda) as preco_medio_venda
            FROM produtos 
            WHERE loja_id = %s AND ativo = 1
        """, (loja_id,))
        
        estatisticas = cursor.fetchone()
        
        return {
            "produtos": serialize_mysql_data(produtos),
            "estatisticas": serialize_mysql_data(estatisticas),
            "data_geracao": datetime.now().isoformat()
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro ao gerar relatório de estoque: {str(e)}")
    finally:
        if cursor: cursor.close()
        if conn: conn.close()

@app.post("/api/relatorios/gerar")
async def gerar_relatorio_completo(relatorio_data: RelatorioRequest, session_data: dict = Depends(obter_admin)):
    conn = None
    cursor = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)
        
        loja_id = get_loja_id(session_data)
        
        relatorios = {}
        
        if 'estoque' in relatorio_data.tipos or 'todos' in relatorio_data.tipos:
            cursor.execute("""
                SELECT 
                    codigo_barras, nome, categoria, marca, 
                    estoque_atual, estoque_minimo, preco_custo, preco_venda,
                    CASE 
                        WHEN estoque_atual = 0 THEN 'CRÍTICO'
                        WHEN estoque_atual <= estoque_minimo THEN 'BAIXO'
                        ELSE 'NORMAL'
                    END as status_estoque
                FROM produtos 
                WHERE loja_id = %s AND ativo = 1
                ORDER BY nome
            """, (loja_id,))
            relatorios['estoque'] = cursor.fetchall()
        
        if 'mais-vendidos' in relatorio_data.tipos or 'todos' in relatorio_data.tipos:
            cursor.execute("""
                SELECT 
                    p.nome as produto,
                    SUM(iv.quantidade) as quantidade_vendida,
                    SUM(iv.total_item) as total_vendido,
                    COUNT(iv.id) as total_vendas
                FROM itens_venda iv
                INNER JOIN produtos p ON iv.produto_id = p.id
                INNER JOIN vendas v ON iv.venda_id = v.id
                WHERE v.loja_id = %s
                GROUP BY p.id, p.nome
                ORDER BY total_vendido DESC
                LIMIT 20
            """, (loja_id,))
            relatorios['mais_vendidos'] = cursor.fetchall()
        
        return {
            "success": True,
            "relatorios": relatorios,
            "data_geracao": datetime.now().isoformat(),
            "tipos_selecionados": relatorio_data.tipos
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro ao gerar relatório: {str(e)}")
    finally:
        if cursor: cursor.close()
        if conn: conn.close()
        
        
# =============================================
# ENDPOINTS DE CLIENTES
# =============================================

@app.get("/api/clientes", response_model=dict)
async def listar_clientes(
    pagina: Optional[int] = Query(1, ge=1),
    limite: int = Query(10, ge=1, le=100),
    pesquisa: Optional[str] = Query(None),
    session_data: dict = Depends(obter_todos_usuarios)
):
    conn = None
    cursor = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)
        
        loja_id = get_loja_id(session_data)
        
        # Construir query base
        query = "SELECT * FROM clientes WHERE loja_id = %s"
        params = [loja_id]
        
        # Adicionar filtro de pesquisa se fornecido
        if pesquisa:
            query += " AND (nome LIKE %s OR email LIKE %s OR telefone LIKE %s)"
            search_term = f"%{pesquisa}%"
            params.extend([search_term, search_term, search_term])
        
        # Contar total
        count_query = f"SELECT COUNT(*) as total FROM ({query}) as subquery"
        cursor.execute(count_query, params)
        total = cursor.fetchone()['total']
        
        # Adicionar paginação e ordenação
        offset = (pagina - 1) * limite
        query += " ORDER BY nome LIMIT %s OFFSET %s"
        params.extend([limite, offset])
        
        cursor.execute(query, params)
        clientes = cursor.fetchall()
        
        # Serializar datas
        for cliente in clientes:
            if cliente['data_cadastro']:
                cliente['data_cadastro'] = cliente['data_cadastro'].isoformat()
            if cliente['data_atualizacao']:
                cliente['data_atualizacao'] = cliente['data_atualizacao'].isoformat()
        
        return {
            "clientes": clientes,
            "total": total,
            "pagina": pagina,
            "total_paginas": (total + limite - 1) // limite,
            "limite": limite
        }
        
    except Exception as e:
        print(f"❌ Erro ao listar clientes: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Erro ao listar clientes: {str(e)}")
    finally:
        if cursor: cursor.close()
        if conn: conn.close()

@app.get("/api/clientes/{cliente_id}")
async def obter_cliente(cliente_id: int, session_data: dict = Depends(obter_todos_usuarios)):
    conn = None
    cursor = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)
        
        loja_id = get_loja_id(session_data)
        
        cursor.execute(
            "SELECT * FROM clientes WHERE id = %s AND loja_id = %s",
            (cliente_id, loja_id)
        )
        
        cliente = cursor.fetchone()
        
        if not cliente:
            raise HTTPException(status_code=404, detail="Cliente não encontrado")
        
        # Serializar datas
        if cliente['data_cadastro']:
            cliente['data_cadastro'] = cliente['data_cadastro'].isoformat()
        if cliente['data_atualizacao']:
            cliente['data_atualizacao'] = cliente['data_atualizacao'].isoformat()
        
        return cliente
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Erro ao obter cliente: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Erro ao obter cliente: {str(e)}")
    finally:
        if cursor: cursor.close()
        if conn: conn.close()

@app.post("/api/clientes", response_model=ClienteResponse)
async def criar_cliente(cliente_data: ClienteCreate, session_data: dict = Depends(obter_vendedor)):
    conn = None
    cursor = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)
        
        loja_id = get_loja_id(session_data)
        
        # Verificar se CPF já existe
        if cliente_data.cpf:
            cursor.execute(
                "SELECT id FROM clientes WHERE cpf = %s AND loja_id = %s",
                (cliente_data.cpf, loja_id)
            )
            if cursor.fetchone():
                raise HTTPException(status_code=400, detail="Já existe cliente com este CPF")
        
        # Inserir cliente
        cursor.execute("""
            INSERT INTO clientes (
                loja_id, nome, email, telefone, cpf, endereco, cidade, estado, observacoes, ativo
            ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
        """, (
            loja_id, cliente_data.nome, cliente_data.email, cliente_data.telefone,
            cliente_data.cpf, cliente_data.endereco, cliente_data.cidade,
            cliente_data.estado, cliente_data.observacoes, cliente_data.ativo
        ))
        
        cliente_id = cursor.lastrowid
        conn.commit()
        
        # Buscar cliente criado
        cursor.execute("SELECT * FROM clientes WHERE id = %s", (cliente_id,))
        cliente = cursor.fetchone()
        
        if cliente and cliente['data_cadastro']:
            cliente['data_cadastro'] = cliente['data_cadastro'].isoformat()
        if cliente and cliente['data_atualizacao']:
            cliente['data_atualizacao'] = cliente['data_atualizacao'].isoformat()
        
        return cliente
        
    except HTTPException:
        raise
    except Exception as e:
        if conn: conn.rollback()
        print(f"❌ Erro ao criar cliente: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Erro ao criar cliente: {str(e)}")
    finally:
        if cursor: cursor.close()
        if conn: conn.close()

@app.put("/api/clientes/{cliente_id}")
async def atualizar_cliente(cliente_id: int, cliente_data: ClienteUpdate, session_data: dict = Depends(obter_vendedor)):
    conn = None
    cursor = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)
        
        loja_id = get_loja_id(session_data)
        
        # Verificar se cliente existe
        cursor.execute(
            "SELECT id FROM clientes WHERE id = %s AND loja_id = %s",
            (cliente_id, loja_id)
        )
        if not cursor.fetchone():
            raise HTTPException(status_code=404, detail="Cliente não encontrado")
        
        # Verificar se CPF já existe em outro cliente
        if cliente_data.cpf:
            cursor.execute(
                "SELECT id FROM clientes WHERE cpf = %s AND loja_id = %s AND id != %s",
                (cliente_data.cpf, loja_id, cliente_id)
            )
            if cursor.fetchone():
                raise HTTPException(status_code=400, detail="CPF já está em uso por outro cliente")
        
        # Construir query de atualização
        update_fields = []
        update_values = []
        
        if cliente_data.nome is not None:
            update_fields.append("nome = %s")
            update_values.append(cliente_data.nome)
        
        if cliente_data.email is not None:
            update_fields.append("email = %s")
            update_values.append(cliente_data.email)
        
        if cliente_data.telefone is not None:
            update_fields.append("telefone = %s")
            update_values.append(cliente_data.telefone)
        
        if cliente_data.cpf is not None:
            update_fields.append("cpf = %s")
            update_values.append(cliente_data.cpf)
        
        if cliente_data.endereco is not None:
            update_fields.append("endereco = %s")
            update_values.append(cliente_data.endereco)
        
        if cliente_data.cidade is not None:
            update_fields.append("cidade = %s")
            update_values.append(cliente_data.cidade)
        
        if cliente_data.estado is not None:
            update_fields.append("estado = %s")
            update_values.append(cliente_data.estado)
        
        if cliente_data.observacoes is not None:
            update_fields.append("observacoes = %s")
            update_values.append(cliente_data.observacoes)
        
        if cliente_data.ativo is not None:
            update_fields.append("ativo = %s")
            update_values.append(cliente_data.ativo)
        
        if not update_fields:
            raise HTTPException(status_code=400, detail="Nenhum campo fornecido para atualização")
        
        update_fields.append("data_atualizacao = CURRENT_TIMESTAMP")
        update_values.extend([cliente_id, loja_id])
        
        query = f"UPDATE clientes SET {', '.join(update_fields)} WHERE id = %s AND loja_id = %s"
        cursor.execute(query, update_values)
        
        conn.commit()
        
        # Buscar cliente atualizado
        cursor.execute("SELECT * FROM clientes WHERE id = %s AND loja_id = %s", (cliente_id, loja_id))
        cliente = cursor.fetchone()
        
        if cliente and cliente['data_cadastro']:
            cliente['data_cadastro'] = cliente['data_cadastro'].isoformat()
        if cliente and cliente['data_atualizacao']:
            cliente['data_atualizacao'] = cliente['data_atualizacao'].isoformat()
        
        return cliente
        
    except HTTPException:
        raise
    except Exception as e:
        if conn: conn.rollback()
        print(f"❌ Erro ao atualizar cliente: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Erro ao atualizar cliente: {str(e)}")
    finally:
        if cursor: cursor.close()
        if conn: conn.close()

@app.delete("/api/clientes/{cliente_id}")
async def excluir_cliente(cliente_id: int, session_data: dict = Depends(obter_vendedor)):
    conn = None
    cursor = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)
        
        loja_id = get_loja_id(session_data)
        
        # Verificar se cliente existe
        cursor.execute(
            "SELECT id, nome FROM clientes WHERE id = %s AND loja_id = %s",
            (cliente_id, loja_id)
        )
        cliente = cursor.fetchone()
        
        if not cliente:
            raise HTTPException(status_code=404, detail="Cliente não encontrado")
        
        # Verificar se cliente tem vendas associadas
        cursor.execute(
            "SELECT id FROM vendas WHERE cliente_id = %s AND loja_id = %s LIMIT 1",
            (cliente_id, loja_id)
        )
        
        if cursor.fetchone():
            # Marcar como inativo em vez de excluir
            cursor.execute(
                "UPDATE clientes SET ativo = 0, data_atualizacao = CURRENT_TIMESTAMP WHERE id = %s AND loja_id = %s",
                (cliente_id, loja_id)
            )
            mensagem = f"Cliente '{cliente['nome']}' marcado como inativo (possui vendas associadas)"
        else:
            # Excluir cliente
            cursor.execute(
                "DELETE FROM clientes WHERE id = %s AND loja_id = %s",
                (cliente_id, loja_id)
            )
            mensagem = f"Cliente '{cliente['nome']}' excluído com sucesso"
        
        conn.commit()
        
        return {"success": True, "message": mensagem}
        
    except HTTPException:
        raise
    except Exception as e:
        if conn: conn.rollback()
        print(f"❌ Erro ao excluir cliente: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Erro ao excluir cliente: {str(e)}")
    finally:
        if cursor: cursor.close()
        if conn: conn.close()
        
        
# =============================================
# ENDPOINT PARA DETALHES DA VENDA POR ID - CORRIGIDO
# =============================================

@app.get("/api/vendas/{venda_id}")
async def obter_venda_por_id(venda_id: int, session_data: dict = Depends(obter_vendedor)):
    conn = None
    cursor = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)
        
        loja_id = get_loja_id(session_data)
        
        print(f"🔍 Buscando venda ID: {venda_id} para loja: {loja_id}")
        
        # ✅ BUSCAR VENDA PRINCIPAL - QUERY CORRIGIDA COM STATUS
        cursor.execute("""
            SELECT 
                v.id,
                v.numero_venda,
                v.cliente,
                v.total_venda,
                v.forma_pagamento,
                v.observacoes,
                v.data_venda,
                v.usuario_id,
                v.loja_id,
                COALESCE(v.status, 'concluida') as status,  -- ✅ CORREÇÃO: Status padrão
                u.nome as usuario_nome
            FROM vendas v
            LEFT JOIN usuarios u ON v.usuario_id = u.id
            WHERE v.id = %s AND v.loja_id = %s
        """, (venda_id, loja_id))
        
        venda = cursor.fetchone()
        
        if not venda:
            raise HTTPException(status_code=404, detail=f"Venda #{venda_id} não encontrada")
        
        print(f"✅ Venda encontrada: {venda['numero_venda']} - Cliente: {venda['cliente']} - Status: {venda['status']}")
        
        # ✅ BUSCAR ITENS DA VENDA
        cursor.execute("""
            SELECT 
                iv.id,
                iv.produto_nome as produto,
                iv.quantidade,
                iv.valor_unitario as preco_unitario,
                iv.total_item as preco_total,
                p.codigo_barras,
                p.categoria
            FROM itens_venda iv
            LEFT JOIN produtos p ON iv.produto_id = p.id
            WHERE iv.venda_id = %s
            ORDER BY iv.id
        """, (venda_id,))
        
        itens = cursor.fetchall()
        
        print(f"✅ {len(itens)} itens encontrados para a venda")
        
        # ✅ FORMATAR OS DADOS DE FORMA SEGURA
        venda_completa = {
            "id": venda['id'],
            "numero_venda": venda['numero_venda'],
            "cliente": venda['cliente'],
            "total_venda": float(venda['total_venda']) if venda['total_venda'] else 0.0,
            "forma_pagamento": venda['forma_pagamento'],
            "observacoes": venda['observacoes'],
            "data_venda": venda['data_venda'].isoformat() if venda['data_venda'] else None,
            "usuario_id": venda['usuario_id'],
            "loja_id": venda['loja_id'],
            "status": venda['status'],  # ✅ STATUS INCLUÍDO
            "usuario_nome": venda['usuario_nome'],
            "itens": [],
            "total_itens": len(itens)
        }
        
        # ✅ PROCESSAR ITENS DE FORMA SEGURA
        for item in itens:
            item_formatado = {
                "id": item['id'],
                "produto": item['produto'],
                "quantidade": item['quantidade'],
                "preco_unitario": float(item['preco_unitario']) if item['preco_unitario'] else 0.0,
                "preco_total": float(item['preco_total']) if item['preco_total'] else 0.0
            }
            
            # Adicionar campos opcionais se existirem
            if item['codigo_barras']:
                item_formatado['codigo_barras'] = item['codigo_barras']
            if item['categoria']:
                item_formatado['categoria'] = item['categoria']
                
            venda_completa['itens'].append(item_formatado)
        
        print(f"🎯 Venda processada com sucesso: {venda_completa['numero_venda']}")
        
        return {
            "success": True,
            "venda": venda_completa
        }
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Erro ao buscar venda {venda_id}: {str(e)}")
        import traceback
        print(f"🔍 Traceback completo: {traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=f"Erro interno ao buscar venda: {str(e)}")
    finally:
        if cursor: 
            cursor.close()
        if conn: 
            conn.close()
            
            
# =============================================
# ENDPOINTS PARA EDIÇÃO DE VENDAS
# =============================================

@app.put("/api/vendas/{venda_id}")
async def atualizar_venda(venda_id: int, venda_data: VendaData, session_data: dict = Depends(obter_vendedor)):
    """
    Atualizar uma venda existente - VERSÃO CORRIGIDA
    """
    conn = None
    cursor = None
    
    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)
        
        loja_id = get_loja_id(session_data)
        
        # Verificar se a venda existe e pertence à loja
        cursor.execute(
            "SELECT id, status FROM vendas WHERE id = %s AND loja_id = %s",
            (venda_id, loja_id)
        )
        venda_existente = cursor.fetchone()
        
        if not venda_existente:
            raise HTTPException(status_code=404, detail="Venda não encontrada")
        
        if venda_existente['status'] == 'cancelada':
            raise HTTPException(status_code=400, detail="Não é possível editar uma venda cancelada")
        
        # Validar dados
        if not venda_data.itens or len(venda_data.itens) == 0:
            raise HTTPException(status_code=400, detail="A venda deve ter pelo menos um item")
        
        # ✅ CORREÇÃO: Verificar se há transação ativa antes de iniciar
        if conn.in_transaction:
            conn.rollback()
        
        # Iniciar transação
        conn.start_transaction()
        
        print(f"🔄 Iniciando atualização da venda #{venda_id}")
        
        # 1. Restaurar estoque dos itens antigos
        cursor.execute("""
            SELECT produto_id, quantidade 
            FROM itens_venda 
            WHERE venda_id = %s
        """, (venda_id,))
        
        itens_antigos = cursor.fetchall()
        print(f"📦 Restaurando estoque de {len(itens_antigos)} itens antigos")
        
        for item_antigo in itens_antigos:
            if item_antigo['produto_id']:
                cursor.execute("""
                    UPDATE produtos 
                    SET estoque_atual = estoque_atual + %s 
                    WHERE id = %s AND loja_id = %s
                """, (item_antigo['quantidade'], item_antigo['produto_id'], loja_id))
                print(f"✅ Estoque restaurado: Produto {item_antigo['produto_id']} +{item_antigo['quantidade']}")
        
        # 2. Remover itens antigos
        cursor.execute("DELETE FROM itens_venda WHERE venda_id = %s", (venda_id,))
        print("🗑️ Itens antigos removidos")
        
        # 3. Processar novos itens e atualizar estoque
        for index, item in enumerate(venda_data.itens):
            print(f"🔍 Processando item {index + 1}: {item.produto}")
            
            # Buscar produto por nome
            cursor.execute(
                "SELECT id, nome, estoque_atual, preco_venda FROM produtos WHERE nome = %s AND loja_id = %s AND ativo = 1",
                (item.produto, loja_id)
            )
            produto = cursor.fetchone()
            
            if not produto:
                raise HTTPException(status_code=404, detail=f"Produto '{item.produto}' não encontrado")
            
            # Verificar estoque
            if produto['estoque_atual'] < item.quantidade:
                raise HTTPException(
                    status_code=400,
                    detail=f"Estoque insuficiente para '{produto['nome']}'. Disponível: {produto['estoque_atual']}, Solicitado: {item.quantidade}"
                )
            
            # Atualizar estoque
            cursor.execute(
                "UPDATE produtos SET estoque_atual = estoque_atual - %s WHERE id = %s",
                (item.quantidade, produto['id'])
            )
            print(f"📦 Estoque atualizado: {produto['nome']} -{item.quantidade}")
            
            # Inserir novo item
            cursor.execute("""
                INSERT INTO itens_venda (venda_id, produto_id, produto_nome, quantidade, valor_unitario, total_item)
                VALUES (%s, %s, %s, %s, %s, %s)
            """, (venda_id, produto['id'], produto['nome'], item.quantidade, item.preco_Unitario, item.preco_Total))
            print(f"✅ Item inserido: {produto['nome']} x {item.quantidade}")
        
        # 4. Atualizar venda principal
        cursor.execute("""
            UPDATE vendas 
            SET cliente = %s, total_venda = %s, forma_pagamento = %s, observacoes = %s,
                data_venda = %s, usuario_id = %s, status = 'concluida'
            WHERE id = %s AND loja_id = %s
        """, (
            venda_data.cliente, venda_data.total_venda, venda_data.forma_pagamento,
            venda_data.observacoes, venda_data.data_venda, venda_data.usuario_id,
            venda_id, loja_id
        ))
        print(f"✅ Venda #{venda_id} atualizada")
        
        # Commit da transação
        conn.commit()
        print("💾 Transação commitada com sucesso")
        
        return {
            "success": True,
            "message": "Venda atualizada com sucesso",
            "venda_id": venda_id
        }
        
    except HTTPException:
        if conn and conn.in_transaction:
            conn.rollback()
            print("❌ Transação revertida devido a erro HTTP")
        raise
    except Exception as e:
        if conn and conn.in_transaction:
            conn.rollback()
            print("❌ Transação revertida devido a erro interno")
        print(f"❌ Erro ao atualizar venda: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Erro ao atualizar venda: {str(e)}")
    finally:
        if cursor: 
            cursor.close()
        if conn: 
            conn.close()
            print("🔗 Conexão fechada")

@app.put("/api/vendas/{venda_id}/cancelar")
async def cancelar_venda(venda_id: int, session_data: dict = Depends(obter_vendedor)):
    """
    Cancelar uma venda (restaura estoque) - VERSÃO CORRIGIDA
    """
    conn = None
    cursor = None
    
    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)
        
        loja_id = get_loja_id(session_data)
        
        # Verificar se a venda existe
        cursor.execute(
            "SELECT id, status, numero_venda FROM vendas WHERE id = %s AND loja_id = %s",
            (venda_id, loja_id)
        )
        venda = cursor.fetchone()
        
        if not venda:
            raise HTTPException(status_code=404, detail="Venda não encontrada")
        
        if venda['status'] == 'cancelada':
            raise HTTPException(status_code=400, detail="Venda já está cancelada")
        
        # ✅ CORREÇÃO: Verificar se há transação ativa antes de iniciar
        if conn.in_transaction:
            conn.rollback()
        
        # Iniciar transação
        conn.start_transaction()
        
        print(f"🔄 Iniciando cancelamento da venda #{venda_id}")
        
        # 1. Restaurar estoque dos itens
        cursor.execute("""
            SELECT iv.produto_id, iv.quantidade, p.nome
            FROM itens_venda iv
            LEFT JOIN produtos p ON iv.produto_id = p.id
            WHERE iv.venda_id = %s
        """, (venda_id,))
        
        itens = cursor.fetchall()
        print(f"📦 Restaurando estoque de {len(itens)} itens")
        
        for item in itens:
            if item['produto_id']:
                cursor.execute("""
                    UPDATE produtos 
                    SET estoque_atual = estoque_atual + %s 
                    WHERE id = %s AND loja_id = %s
                """, (item['quantidade'], item['produto_id'], loja_id))
                print(f"✅ Estoque restaurado: {item['nome']} +{item['quantidade']}")
        
        # 2. Marcar venda como cancelada
        cursor.execute(
            "UPDATE vendas SET status = 'cancelada' WHERE id = %s AND loja_id = %s",
            (venda_id, loja_id)
        )
        print(f"✅ Venda #{venda_id} marcada como cancelada")
        
        # Commit da transação
        conn.commit()
        print("💾 Transação de cancelamento commitada")
        
        return {
            "success": True,
            "message": "Venda cancelada com sucesso. Estoque restaurado."
        }
        
    except HTTPException:
        if conn and conn.in_transaction:
            conn.rollback()
            print("❌ Transação de cancelamento revertida devido a erro HTTP")
        raise
    except Exception as e:
        if conn and conn.in_transaction:
            conn.rollback()
            print("❌ Transação de cancelamento revertida devido a erro interno")
        print(f"❌ Erro ao cancelar venda: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Erro ao cancelar venda: {str(e)}")
    finally:
        if cursor: 
            cursor.close()
        if conn: 
            conn.close()
            print("🔗 Conexão de cancelamento fechada")
            

if __name__ == "__main__":
    import uvicorn
    print("🚀 Servidor WebOS Dashboard iniciando na porta 8001...")
    print("📊 Módulos ativos: Dashboard, Estoque, Vendas, Caixa, Usuários, Relatórios")
    print("📈 Acesse http://localhost:8001/docs para a documentação da API")
    uvicorn.run(app, host="0.0.0.0", port=8001)