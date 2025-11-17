// 📦 SISTEMA DE GERENCIAMENTO DE ESTOQUE - FASTAPI
console.log("📦 Inicializando sistema de estoque...");

// Variáveis globais
let produtos = [];
let scannerAtivo = false;
const API_BASE = 'http://localhost:8001';

let carregamentoTimeout;

// Modifique a inicialização:
document.addEventListener('DOMContentLoaded', function() {
    console.log("🚀 Inicializando módulo de estoque...");
    
    // Configurar informações do usuário
    const userNome = localStorage.getItem('user_nome');
    const userAvatar = document.getElementById('user-avatar');
    if (userNome && userAvatar) {
        userAvatar.textContent = userNome.charAt(0).toUpperCase();
    }
    
    // ✅ CORREÇÃO: Timeout de segurança
    carregamentoTimeout = setTimeout(() => {
        console.log("⏰ Timeout - Carregando dados mock");
        carregarProdutosMock();
    }, 5000); // 5 segundos
    
    // Carregar produtos
    carregarProdutos().finally(() => {
        // ✅ Limpar timeout se carregamento completar
        clearTimeout(carregamentoTimeout);
    });
    
    // Configurar botões
    configurarBotoesEstoque();

    // ✅ CORREÇÃO: Só configurar checkboxes se estiver na página de relatórios
    setTimeout(() => {
        if (document.getElementById('todosRelatorios') || 
            document.querySelector('input[name="relatorio"]')) {
            console.log('📊 Página de relatórios detectada, configurando checkboxes...');
            configurarCheckboxesRelatorios();
        } else {
            console.log('ℹ️ Não é página de relatórios, pulando configuração de checkboxes');
        }
    }, 500); // Aguardar um pouco mais
});

// 🔧 CORREÇÃO: Garantir que as funções sejam globais
window.abrirModalProduto = abrirModalProduto;
window.abrirModalScanner = abrirModalScanner;
window.gerarRelatorioPdf = gerarRelatorioPdf;
window.filtrarProdutos = filtrarProdutos;
window.exportarEstoque = exportarEstoque;

// Inicialização
document.addEventListener('DOMContentLoaded', function() {
    console.log("🚀 Inicializando módulo de estoque...");
    
    // Configurar informações do usuário
    const userNome = localStorage.getItem('user_nome');
    const userAvatar = document.getElementById('user-avatar');
    if (userNome && userAvatar) {
        userAvatar.textContent = userNome.charAt(0).toUpperCase();
    }
    
    // Carregar produtos
    carregarProdutos();
    
    // Configurar botões
    configurarBotoesEstoque();

    // 🔥 NOVO: Configurar modal de relatórios
    configurarCheckboxesRelatorios();
});


// Configurar botões
function configurarBotoesEstoque() {
    // Botão logout
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', function(e) {
            e.preventDefault();
            if (confirm('Deseja realmente sair do sistema?')) {
                fazerLogout();
            }
        });
    }
    
    // 🔧 CORREÇÃO: Configurar botões via JavaScript também
    const btnNovoProduto = document.querySelector('.action-btn');
    if (btnNovoProduto) {
        btnNovoProduto.addEventListener('click', function(e) {
            e.preventDefault();
            abrirModalProduto();
        });
    }
    
    const btnLerCodigo = document.querySelectorAll('.action-btn')[1];
    if (btnLerCodigo) {
        btnLerCodigo.addEventListener('click', function(e) {
            e.preventDefault();
            abrirModalScanner();
        });
    }
    
    const btnGerarRelatorio = document.querySelectorAll('.action-btn')[2];
    if (btnGerarRelatorio) {
        btnGerarRelatorio.addEventListener('click', function(e) {
            e.preventDefault();
            abrirModalRelatorios();
        });
    }
    
    const btnExportar = document.querySelector('.btn-outline');
    if (btnExportar) {
        btnExportar.addEventListener('click', function(e) {
            e.preventDefault();
            exportarEstoque();
        });
    }
    
    const btnNovoProdutoHeader = document.querySelector('.btn-primary');
    if (btnNovoProdutoHeader) {
        btnNovoProdutoHeader.addEventListener('click', function(e) {
            e.preventDefault();
            abrirModalProduto();
        });
    }
}

// Função de logout
function fazerLogout() {
    console.log("🚪 Fazendo logout...");
    localStorage.removeItem('session_token');
    localStorage.removeItem('user_nome');
    localStorage.removeItem('user_id');
    localStorage.removeItem('user_perfil');
    window.location.href = '../pages/login.html';
}



// Carregar produtos do servidor FastAPI 
// Carregar produtos do servidor FastAPI - VERSÃO CORRIGIDA
async function carregarProdutos() {
    try {
        console.log("📡 Carregando produtos ativos do FastAPI...");
        
        const token = localStorage.getItem('session_token');
        console.log("🔐 Token presente:", !!token);
        
        if (!token) {
            console.error('❌ Token não encontrado');
            carregarProdutosMock();
            return;
        }

        // ✅ USAR URL SIMPLES SEM PARÂMETROS COMPLEXOS
        const url = `${API_BASE}/api/produtos?limite=1000`;
        
        console.log("🔗 Fazendo request para:", url);
        
        const response = await fetch(url, {
            headers: {
                'Authorization': token,
                'Content-Type': 'application/json'
            }
        });
        
        console.log("📡 Status da resposta:", response.status);
        
        if (!response.ok) {
            if (response.status === 401) {
                console.error('🔐 Erro 401 - Sessão expirada');
                localStorage.clear();
                window.location.href = '../pages/login.html';
                return;
            }
            throw new Error(`Erro ${response.status} na API`);
        }
        
        const data = await response.json();
        console.log("📊 Dados recebidos:", data);
        
        // ✅ CORREÇÃO CRÍTICA: Garantir que produtos seja um array
        produtos = Array.isArray(data.produtos) ? data.produtos : [];
        console.log(`✅ ${produtos.length} produtos carregados com sucesso`);
        
        // ✅ CORREÇÃO: Renderizar IMEDIATAMENTE
        renderizarProdutos();
        
    } catch (error) {
        console.error('❌ Erro ao carregar produtos:', error);
        console.log("🔄 Usando fallback para dados mock");
        carregarProdutosMock();
    }
}

// Nova função para carregar produtos inativos
async function carregarProdutosInativos() {
    try {
        console.log("📡 Carregando produtos inativos do FastAPI...");
        
        const url = `${API_BASE}/api/produtos/inativos?limite=1000`;
        
        console.log("🔗 URL:", url);
        
        let response;
        if (window.session_manager) {
            response = await window.session_manager.makeAuthenticatedRequest(url);
        } else {
            const token = localStorage.getItem('session_token');
            response = await fetch(url, {
                headers: {
                    'Authorization': token,
                    'Content-Type': 'application/json'
                }
            });
        }
        
        if (response && response.ok) {
            const data = await response.json();
            const produtosInativos = data.produtos || [];
            console.log(`✅ ${produtosInativos.length} produtos inativos carregados`);
            return produtosInativos;
        } else {
            console.error('❌ Erro ao carregar produtos inativos:', response?.status);
            return [];
        }
    } catch (error) {
        console.error('❌ Erro ao carregar inativos:', error);
        return [];
    }
}

// Fallback sem o parâmetro incluir_inativos
async function carregarProdutosFallback() {
    try {
        console.log("🔄 Tentando carregar produtos sem parâmetro incluir_inativos...");
        
        const url = `${API_BASE}/api/produtos?limite=1000`;
        const token = localStorage.getItem('session_token');
        const response = await fetch(url, {
            headers: {
                'Authorization': token,
                'Content-Type': 'application/json'
            }
        });
        
        if (response && response.ok) {
            const data = await response.json();
            produtos = data.produtos || [];
            console.log(`✅ ${produtos.length} produtos carregados (fallback)`);
            renderizarProdutos();
        } else {
            console.error('❌ Erro no fallback:', response?.status);
            carregarProdutosMock();
        }
    } catch (error) {
        console.error('❌ Erro no fallback:', error);
        carregarProdutosMock();
    }
}

// Dados mock para demonstração (apenas se API não estiver disponível)
function carregarProdutosMock() {
    console.log("🔄 Usando dados mock para demonstração");
    produtos = [
        {
            id: 1,
            nome: "Sutiã com Bojo Rendado",
            codigo_barras: "789123456101",
            categoria: "lingerie",
            marca: "Victoria's Secret",
            estoque_atual: 15,
            estoque_minimo: 5,
            preco_custo: 25.00,
            preco_venda: 49.90,
            ativo: true
        },
        {
            id: 2,
            nome: "Calcinha Fio Dental Algodão",
            codigo_barras: "789123456102", 
            categoria: "lingerie",
            marca: "Calvin Klein",
            estoque_atual: 25,
            estoque_minimo: 10,
            preco_custo: 8.00,
            preco_venda: 19.90,
            ativo: true
        },
        {
            id: 3,
            nome: "Conjunto Renda Preta",
            codigo_barras: "789123456103",
            categoria: "lingerie", 
            marca: "La Perla",
            estoque_atual: 8,
            estoque_minimo: 3,
            preco_custo: 45.00,
            preco_venda: 89.90,
            ativo: true
        }
    ];
    
    // ✅ CORREÇÃO: Forçar renderização
    setTimeout(() => {
        renderizarProdutos();
        console.log("✅ Dados mock carregados e renderizados");
    }, 100);
}

// Renderizar produtos na tabela
function renderizarProdutos(produtosFiltrados = null) {
    console.log("🎨 Iniciando renderização de produtos...");
    
    const tbody = document.getElementById('tbody-produtos');
    if (!tbody) {
        console.error('❌ ERRO CRÍTICO: Elemento tbody-produtos não encontrado no DOM!');
        return;
    }
    
    const lista = produtosFiltrados || produtos;
    console.log(`📊 Renderizando ${lista.length} produtos`);
    
    // ✅ LIMPAR CONTEÚDO ANTIGO
    tbody.innerHTML = '';
    
    if (!Array.isArray(lista) || lista.length === 0) {
        console.log("📭 Nenhum produto para exibir");
        tbody.innerHTML = `
            <tr>
                <td colspan="8" style="text-align: center; padding: 40px; color: #6c757d;">
                    <i class="fas fa-box-open" style="font-size: 48px; margin-bottom: 15px; display: block; opacity: 0.5;"></i>
                    Nenhum produto encontrado
                </td>
            </tr>
        `;
        return;
    }
    
    // ✅ RENDERIZAR CADA PRODUTO
    lista.forEach((produto, index) => {
        if (!produto || !produto.id) {
            console.warn(`⚠️ Produto inválido no índice ${index}:`, produto);
            return;
        }
        
        const classeEstoque = getClasseEstoque(produto.estoque_atual, produto.estoque_minimo);
        const indicadorEstoque = getIndicadorEstoque(produto.estoque_atual, produto.estoque_minimo);
        
        const row = document.createElement('tr');
        if (classeEstoque) {
            row.className = classeEstoque;
        }
        
        row.innerHTML = `
            <td>
                <div style="font-family: monospace; font-size: 12px;">
                    ${produto.codigo_barras || 'N/A'}
                </div>
            </td>
            <td>
                <strong>${produto.nome || 'Sem nome'}</strong>
                ${produto.marca ? `<br><small style="color: #6c757d;">${produto.marca}</small>` : ''}
                ${produto.descricao ? `<br><small style="color: #868e96;">${produto.descricao}</small>` : ''}
            </td>
            <td>
                <span class="status-badge status-${produto.categoria || 'outros'}">
                    ${getCategoriaNome(produto.categoria)}
                </span>
            </td>
            <td>
                <span class="stock-indicator ${indicadorEstoque}"></span>
                ${produto.estoque_atual || 0}
            </td>
            <td>${produto.estoque_minimo || 0}</td>
            <td>
                <strong>R$ ${(produto.preco_venda || 0).toFixed(2)}</strong>
                ${produto.preco_custo ? `<br><small style="color: #6c757d;">Custo: R$ ${produto.preco_custo.toFixed(2)}</small>` : ''}
            </td>
            <td>
                <span class="status-badge ${produto.ativo ? 'status-active' : 'status-inactive'}">
                    ${produto.ativo !== false ? 'Ativo' : 'Inativo'}
                </span>
            </td>
            <td>
                <div class="table-actions">
                    <button class="btn-action btn-edit" onclick="editarProduto(${produto.id})" title="Editar">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn-action btn-delete" onclick="excluirProduto(${produto.id})" title="Excluir">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </td>
        `;
        
        tbody.appendChild(row);
    });
    
    console.log("✅ Renderização concluída com sucesso!");
}

// Funções auxiliares
function getClasseEstoque(estoqueAtual, estoqueMinimo) {
    if (estoqueAtual === 0) return 'estoque-critico';
    if (estoqueAtual <= estoqueMinimo) return 'estoque-baixo';
    return '';
}

function getIndicadorEstoque(estoqueAtual, estoqueMinimo) {
    if (estoqueAtual === 0) return 'stock-critical';
    if (estoqueAtual <= estoqueMinimo) return 'stock-low';
    return 'stock-ok';
}

function getCategoriaNome(categoria) {
    const categorias = {
        'acessorios': 'Acessórios',
        'eletronicos': 'Eletrônicos',
        'pecas': 'Peças',
        'outros': 'Outros'
    };
    return categorias[categoria] || 'Outros';
}

// Filtrar produtos
// Filtrar produtos
async function filtrarProdutos() {
    const searchTerm = document.getElementById('search-input').value.toLowerCase();
    const categoria = document.getElementById('filter-categoria').value;
    const estoque = document.getElementById('filter-estoque').value;
    const status = document.getElementById('filter-status').value;
    
    let produtosParaFiltrar = produtos;
    
    // ✅ CORREÇÃO: Se o filtro for "inativo", carregar produtos inativos
    if (status === 'inativo') {
        console.log("🔄 Carregando produtos inativos para filtro...");
        const produtosInativos = await carregarProdutosInativos();
        produtosParaFiltrar = produtosInativos;
    }
    
    const produtosFiltrados = produtosParaFiltrar.filter(produto => {
        // Filtro de busca
        const matchSearch = !searchTerm || 
            produto.nome.toLowerCase().includes(searchTerm) ||
            (produto.codigo_barras && produto.codigo_barras.includes(searchTerm)) ||
            (produto.marca && produto.marca.toLowerCase().includes(searchTerm));
        
        // Filtro de categoria
        const matchCategoria = !categoria || produto.categoria === categoria;
        
        // Filtro de estoque
        let matchEstoque = true;
        if (estoque === 'baixo') {
            matchEstoque = produto.estoque_atual > 0 && produto.estoque_atual <= produto.estoque_minimo;
        } else if (estoque === 'critico') {
            matchEstoque = produto.estoque_atual === 0;
        } else if (estoque === 'normal') {
            matchEstoque = produto.estoque_atual > produto.estoque_minimo;
        }
        
        return matchSearch && matchCategoria && matchEstoque;
    });
    
    renderizarProdutos(produtosFiltrados);
}
// Modal Produto
function abrirModalProduto(produtoId = null) {
    const modal = document.getElementById('modal-produto');
    const titulo = document.getElementById('modal-produto-titulo');
    const form = document.getElementById('form-produto');
    
    form.reset();
    
    if (produtoId) {
        // Modo edição
        titulo.textContent = 'Editar Produto';
        document.getElementById('produto-id').value = produtoId;
        
        const produto = produtos.find(p => p.id === produtoId);
        if (produto) {
            document.getElementById('codigo-barras').value = produto.codigo_barras || '';
            document.getElementById('nome').value = produto.nome || '';
            document.getElementById('descricao').value = produto.descricao || '';
            document.getElementById('categoria').value = produto.categoria || '';
            document.getElementById('marca').value = produto.marca || '';
            document.getElementById('estoque-atual').value = produto.estoque_atual || 0;
            document.getElementById('estoque-minimo').value = produto.estoque_minimo || 5;
            document.getElementById('preco-custo').value = produto.preco_custo || '';
            document.getElementById('preco-venda').value = produto.preco_venda || '';
            document.getElementById('ativo').checked = produto.ativo !== false;
        }
    } else {
        // Modo novo
        titulo.textContent = 'Novo Produto';
        document.getElementById('produto-id').value = '';
        document.getElementById('ativo').checked = true;
    }
    
    modal.style.display = 'block';
}

function fecharModalProduto() {
    document.getElementById('modal-produto').style.display = 'none';
}


// Salvar produto - INTEGRAÇÃO COM FASTAPI
async function salvarProduto() {
    const form = document.getElementById('form-produto');
    const produtoId = document.getElementById('produto-id').value;
    
    if (!form.checkValidity()) {
        alert('Por favor, preencha todos os campos obrigatórios.');
        return;
    }
    
    const produtoData = {
        codigo_barras: document.getElementById('codigo-barras').value || null,
        nome: document.getElementById('nome').value,
        descricao: document.getElementById('descricao').value || null,
        categoria: document.getElementById('categoria').value || null,
        marca: document.getElementById('marca').value || null,
        estoque_atual: parseFloat(document.getElementById('estoque-atual').value) || 0,
        estoque_minimo: parseFloat(document.getElementById('estoque-minimo').value) || 0,
        preco_custo: parseFloat(document.getElementById('preco-custo').value) || 0,
        preco_venda: parseFloat(document.getElementById('preco-venda').value) || 0,
        ativo: document.getElementById('ativo').checked
    };
    
    console.log("💾 Salvando produto:", produtoData);
    
    try {
        let response;
        const url = `${API_BASE}/api/produtos` + (produtoId ? `/${produtoId}` : '');
        const method = produtoId ? 'PUT' : 'POST';
        
        console.log(`📤 Enviando para: ${url} (${method})`);
        
        if (window.session_manager) {
            response = await window.session_manager.makeAuthenticatedRequest(url, {
                method: method,
                body: JSON.stringify(produtoData)
            });
        } else {
            const token = localStorage.getItem('session_token');
            response = await fetch(url, {
                method: method,
                headers: {
                    'Authorization': token,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(produtoData)
            });
        }
        
                if (response && response.ok) {
            const result = await response.json();
            console.log(`✅ Produto ${produtoId ? 'atualizado' : 'criado'} com sucesso:`, result);
            
            alert(`Produto ${produtoId ? 'atualizado' : 'cadastrado'} com sucesso!`);
            
            fecharModalProduto();
            
            // ✅ CORREÇÃO: Recarregar baseado no filtro atual
            const statusFilter = document.getElementById('filter-status').value;
            if (statusFilter === 'inativo') {
                // Se estava vendo inativos, manter a visualização
                await filtrarProdutos();
            } else {
                // Caso contrário, recarregar produtos ativos
                carregarProdutos();
            }
        } else {
            const errorText = await response.text();
            console.error('❌ Erro na resposta:', response.status, errorText);
            alert(`Erro ao salvar produto: ${response.status} - ${errorText}`);
        }
    } catch (error) {
        console.error('❌ Erro na requisição:', error);
        alert('Erro de conexão ao salvar produto. Verifique se o servidor está rodando.');
    }
}

        
// Editar produto
function editarProduto(id) {
    abrirModalProduto(id);
}

// Excluir produto - INTEGRAÇÃO COM FASTAPI
async function excluirProduto(id) {
    if (!confirm('Tem certeza que deseja excluir este produto?\n\nEsta ação marcará o produto como inativo.')) {
        return;
    }
    
    try {
        let response;
        const url = `${API_BASE}/api/produtos/${id}`;
        
        console.log(`🗑️ Excluindo produto: ${url}`);
        
        if (window.session_manager) {
            response = await window.session_manager.makeAuthenticatedRequest(url, {
                method: 'DELETE'
            });
        } else {
            const token = localStorage.getItem('session_token');
            response = await fetch(url, {
                method: 'DELETE',
                headers: {
                    'Authorization': token,
                    'Content-Type': 'application/json'
                }
            });
        }
        
        if (response && response.ok) {
            const result = await response.json();
            console.log('✅ Produto excluído com sucesso:', result);
            alert('Produto marcado como inativo com sucesso!');
            carregarProdutos(); // Recarregar lista
        } else {
            const errorText = await response.text();
            console.error('❌ Erro ao excluir:', response.status, errorText);
            alert(`Erro ao excluir produto: ${response.status}`);
        }
    } catch (error) {
        console.error('❌ Erro:', error);
        alert('Erro de conexão ao excluir produto.');
    }
}

// Scanner de código de barras
function abrirModalScanner() {
    document.getElementById('modal-scanner').style.display = 'block';
    document.getElementById('scanner-result').style.display = 'none';
}

function fecharModalScanner() {
    document.getElementById('modal-scanner').style.display = 'none';
    pararScanner();
}

function iniciarScanner() {
    const scannerElement = document.getElementById('scanner');
    
    // Verificar se o Quagga está disponível
    if (typeof Quagga === 'undefined') {
        alert('Biblioteca de scanner não carregada. Verifique a conexão com a internet.');
        return;
    }
    
    Quagga.init({
        inputStream: {
            name: "Live",
            type: "LiveStream",
            target: scannerElement,
            constraints: {
                width: 400,
                height: 300,
                facingMode: "environment"
            }
        },
        decoder: {
            readers: ["ean_reader", "ean_8_reader", "code_128_reader"]
        }
    }, function(err) {
        if (err) {
            console.error('❌ Erro ao iniciar scanner:', err);
            alert('Erro ao acessar a câmera. Verifique as permissões do navegador.');
            return;
        }
        
        console.log("📷 Scanner iniciado com sucesso");
        Quagga.start();
        scannerAtivo = true;
    });

    Quagga.onDetected(function(result) {
        const code = result.codeResult.code;
        console.log("📦 Código detectado:", code);
        
        document.getElementById('codigo-lido').textContent = code;
        document.getElementById('scanner-result').style.display = 'block';
        
        pararScanner();
    });
}

function pararScanner() {
    if (scannerAtivo && typeof Quagga !== 'undefined') {
        Quagga.stop();
        scannerAtivo = false;
        console.log("🛑 Scanner parado");
    }
}

function usarCodigoLido() {
    const codigo = document.getElementById('codigo-lido').textContent;
    document.getElementById('codigo-barras').value = codigo;
    fecharModalScanner();
    abrirModalProduto(); // Abrir modal de produto com código preenchido
}

// Exportar estoque
function exportarEstoque() {
    const dados = produtos.map(p => ({
        Código: p.codigo_barras || 'N/A',
        Produto: p.nome,
        Categoria: getCategoriaNome(p.categoria),
        Marca: p.marca || 'N/A',
        Estoque: p.estoque_atual,
        'Estoque Mínimo': p.estoque_minimo,
        'Preço Custo': p.preco_custo ? `R$ ${p.preco_custo.toFixed(2)}` : 'N/A',
        'Preço Venda': `R$ ${p.preco_venda.toFixed(2)}`,
        Status: p.ativo ? 'Ativo' : 'Inativo'
    }));
    
    // Criar CSV
    const headers = Object.keys(dados[0]).join(';');
    const rows = dados.map(obj => Object.values(obj).join(';'));
    const csv = [headers, ...rows].join('\n');
    
    // Download
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `estoque_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    console.log("📤 Estoque exportado com sucesso");
    alert('Estoque exportado com sucesso!');
}

// Gerar relatório
// Modal de Relatórios
function abrirModalRelatorios() {
    document.getElementById('modal-relatorios').style.display = 'block';
}

function fecharModalRelatorios() {
    document.getElementById('modal-relatorios').style.display = 'none';
}

// Configurar comportamento dos checkboxes

function configurarCheckboxesRelatorios() {
    console.log('🔧 Tentando configurar checkboxes de relatórios...');
    
    const todosCheckbox = document.getElementById('todosRelatorios');
    const outrosCheckboxes = document.querySelectorAll('input[name="relatorio"]:not(#todosRelatorios)');
    
    // ✅ VERIFICAR SE OS ELEMENTOS EXISTEM
    if (!todosCheckbox) {
        console.warn('⚠️ Checkbox "todosRelatorios" não encontrado no DOM');
        return;
    }
    
    if (outrosCheckboxes.length === 0) {
        console.warn('⚠️ Nenhum checkbox de relatório encontrado no DOM');
        return;
    }
    
    console.log(`✅ Encontrados ${outrosCheckboxes.length + 1} checkboxes de relatório`);
    
    // Quando "Todos" for clicado
    todosCheckbox.addEventListener('change', function(e) {
        console.log(`📊 Checkbox "Todos" alterado: ${e.target.checked}`);
        outrosCheckboxes.forEach(checkbox => {
            checkbox.checked = e.target.checked;
            console.log(`✅ Checkbox ${checkbox.value} definido como: ${checkbox.checked}`);
        });
    });
    
    // Quando outros checkboxes forem clicados
    outrosCheckboxes.forEach(checkbox => {
        checkbox.addEventListener('change', function() {
            console.log(`📊 Checkbox ${this.value} alterado: ${this.checked}`);
            
            if (!this.checked) {
                todosCheckbox.checked = false;
                console.log('✅ Checkbox "Todos" desmarcado');
            } else {
                // Verificar se todos estão marcados
                const todosMarcados = Array.from(outrosCheckboxes).every(cb => cb.checked);
                todosCheckbox.checked = todosMarcados;
                console.log(`✅ Checkbox "Todos" ${todosMarcados ? 'marcado' : 'desmarcado'}`);
            }
        });
    });
    
    console.log('✅ Checkboxes de relatório configurados com sucesso!');
}

// Gerar PDF dos relatórios selecionados
async function gerarRelatorioPdf() {
    const selected = Array.from(document.querySelectorAll('input[name="relatorio"]:checked'))
        .map(cb => cb.value)
        .filter(value => value !== 'todos');
    
    if (selected.length === 0) {
        alert('Selecione pelo menos um tipo de relatório');
        return;
    }
    
    console.log('📊 Gerando relatórios:', selected);
    
    try {
        // Mostrar loading
        const btnGerar = document.querySelector('#modal-relatorios .btn-primary');
        const originalText = btnGerar.innerHTML;
        btnGerar.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Gerando...';
        btnGerar.disabled = true;
        
        // Buscar dados dos relatórios da API
        const relatoriosData = await buscarDadosRelatoriosAPI(selected);
        
        // Gerar PDF
        await gerarPdfComDados(relatoriosData, selected);
        
        // Restaurar botão
        btnGerar.innerHTML = originalText;
        btnGerar.disabled = false;
        
        fecharModalRelatorios();
        
    } catch (error) {
        console.error('❌ Erro ao gerar relatório:', error);
        alert('Erro ao gerar relatório PDF: ' + error.message);
        
        // Restaurar botão em caso de erro
        const btnGerar = document.querySelector('#modal-relatorios .btn-primary');
        btnGerar.innerHTML = '<i class="fas fa-file-pdf"></i> Gerar PDF';
        btnGerar.disabled = false;
    }
}

// Buscar dados dos relatórios da API
async function buscarDadosRelatoriosAPI(tiposRelatorios) {
    try {
        const requestData = {
            tipos: tiposRelatorios
        };
        
        let response;
        if (window.session_manager) {
            response = await window.session_manager.makeAuthenticatedRequest(
                `${API_BASE}/api/relatorios/gerar`,
                {
                    method: 'POST',
                    body: JSON.stringify(requestData)
                }
            );
        } else {
            const token = localStorage.getItem('session_token');
            response = await fetch(`${API_BASE}/api/relatorios/gerar`, {
                method: 'POST',
                headers: {
                    'Authorization': token,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(requestData)
            });
        }
        
        if (response && response.ok) {
            const data = await response.json();
            return data.relatorios;
        } else {
            const errorText = await response.text();
            throw new Error(`Erro na API: ${response.status} - ${errorText}`);
        }
    } catch (error) {
        console.error('Erro ao buscar dados da API:', error);
        // Fallback para dados mock se a API falhar
        return await buscarDadosRelatoriosMock(tiposRelatorios);
    }
}

// Fallback com dados mock (apenas se API não estiver disponível)
async function buscarDadosRelatoriosMock(tiposRelatorios) {
    const dados = {};
    
    for (const tipo of tiposRelatorios) {
        switch (tipo) {
            case 'estoque':
                dados.estoque = await buscarRelatorioEstoqueMock();
                break;
            case 'mais-vendidos':
                dados.mais_vendidos = await buscarProdutosMaisVendidosMock();
                break;
            case 'movimentacoes':
                dados.movimentacoes = await buscarMovimentacoesMock();
                break;
        }
    }
    
    return dados;
}

// Mock data para fallback
async function buscarRelatorioEstoqueMock() {
    // Usar produtos já carregados
    return produtos.map(p => ({
        codigo_barras: p.codigo_barras,
        nome: p.nome,
        categoria: p.categoria,
        marca: p.marca,
        estoque_atual: p.estoque_atual,
        estoque_minimo: p.estoque_minimo,
        preco_custo: p.preco_custo,
        preco_venda: p.preco_venda,
        status_estoque: p.estoque_atual === 0 ? 'CRÍTICO' : 
                       p.estoque_atual <= p.estoque_minimo ? 'BAIXO' : 'NORMAL'
    }));
}

async function buscarProdutosMaisVendidosMock() {
    return [
        { produto: "Capinha iPhone 13", quantidade_vendida: 45, total_vendido: 2695.50, total_vendas: 45 },
        { produto: "Película Vidro 3D", quantidade_vendida: 38, total_vendido: 1136.20, total_vendas: 38 },
        { produto: "Carregador USB-C 20W", quantidade_vendida: 32, total_vendido: 2556.80, total_vendas: 32 },
        { produto: "Fone Bluetooth", quantidade_vendida: 28, total_vendido: 2797.20, total_vendas: 28 },
        { produto: "Cabo Lightning", quantidade_vendida: 25, total_vendido: 747.50, total_vendas: 25 }
    ];
}

async function buscarMovimentacoesMock() {
    const hoje = new Date();
    return [
        { 
            data: new Date(hoje.getTime() - 86400000).toISOString(), 
            tipo: 'VENDA', 
            produto: "Capinha iPhone 13", 
            quantidade: 2, 
            valor: 119.80, 
            usuario: "Admin", 
            referencia: "V0045" 
        },
        { 
            data: new Date(hoje.getTime() - 172800000).toISOString(), 
            tipo: 'VENDA', 
            produto: "Película Vidro 3D", 
            quantidade: 1, 
            valor: 29.90, 
            usuario: "Vendedor", 
            referencia: "V0044" 
        },
        { 
            data: new Date(hoje.getTime() - 259200000).toISOString(), 
            tipo: 'ENTRADA', 
            produto: "Carregador USB-C 20W", 
            quantidade: 15, 
            valor: 525.00, 
            usuario: "SISTEMA", 
            referencia: "7891234567892" 
        }
    ];
}

// Gerar PDF com os dados
async function gerarPdfComDados(dados, tiposSelecionados) {
    // Criar elemento temporário para o PDF
    const pdfContainer = document.createElement('div');
    pdfContainer.className = 'pdf-container';
    pdfContainer.style.display = 'none';
    
    // Cabeçalho do PDF
    const header = `
        <div class="pdf-header">
            <h1>Relatórios do Sistema - WebOS</h1>
            <p>Loja Principal - Sistema de Gerenciamento</p>
            <p>Data de emissão: ${new Date().toLocaleDateString('pt-BR')} ${new Date().toLocaleTimeString('pt-BR')}</p>
        </div>
    `;
    
    let content = header;
    
    // Adicionar cada relatório selecionado
    if (tiposSelecionados.includes('estoque') && dados.estoque) {
        content += gerarRelatorioEstoqueHtml(dados.estoque);
    }
    
    if (tiposSelecionados.includes('mais-vendidos') && dados.mais_vendidos) {
        content += gerarRelatorioMaisVendidosHtml(dados.mais_vendidos);
    }
    
    if (tiposSelecionados.includes('movimentacoes') && dados.movimentacoes) {
        content += gerarRelatorioMovimentacoesHtml(dados.movimentacoes);
    }
    
    // Rodapé
    content += `
        <div class="pdf-footer">
            <p>Relatório gerado automaticamente pelo sistema WebOS</p>
            <p>${window.location.origin}</p>
        </div>
    `;
    
    pdfContainer.innerHTML = content;
    document.body.appendChild(pdfContainer);
    
    // Configurações do PDF
    const opt = {
        margin: 10,
        filename: `relatorios_webos_${new Date().toISOString().split('T')[0]}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { 
            scale: 2,
            useCORS: true,
            logging: false
        },
        jsPDF: { 
            unit: 'mm', 
            format: 'a4', 
            orientation: 'portrait' 
        }
    };
    
    try {
        // Gerar PDF
        await html2pdf().set(opt).from(pdfContainer).save();
        
        console.log('✅ PDF gerado com sucesso');
        alert('Relatório PDF gerado com sucesso! O download começará automaticamente.');
    } catch (error) {
        console.error('❌ Erro ao gerar PDF:', error);
        throw new Error('Erro ao gerar o arquivo PDF');
    } finally {
        // Limpar
        document.body.removeChild(pdfContainer);
    }
}

// Gerar HTML para relatório de estoque
function gerarRelatorioEstoqueHtml(produtos) {
    let html = `
        <div class="pdf-section">
            <h2>📦 Relatório de Estoque</h2>
            <table class="pdf-table">
                <thead>
                    <tr>
                        <th>Código</th>
                        <th>Produto</th>
                        <th>Categoria</th>
                        <th>Estoque Atual</th>
                        <th>Estoque Mínimo</th>
                        <th>Preço Venda</th>
                        <th>Status</th>
                    </tr>
                </thead>
                <tbody>
    `;
    
    produtos.forEach(produto => {
        html += `
            <tr>
                <td>${produto.codigo_barras || 'N/A'}</td>
                <td>${produto.nome}</td>
                <td>${getCategoriaNome(produto.categoria)}</td>
                <td>${produto.estoque_atual}</td>
                <td>${produto.estoque_minimo}</td>
                <td>R$ ${produto.preco_venda?.toFixed(2) || '0.00'}</td>
                <td><strong>${produto.status_estoque || 'NORMAL'}</strong></td>
            </tr>
        `;
    });
    
    html += `
                </tbody>
            </table>
            <p><strong>Total de produtos:</strong> ${produtos.length}</p>
            <p><strong>Produtos em estoque crítico:</strong> ${produtos.filter(p => p.status_estoque === 'CRÍTICO').length}</p>
            <p><strong>Produtos com estoque baixo:</strong> ${produtos.filter(p => p.status_estoque === 'BAIXO').length}</p>
        </div>
    `;
    
    return html;
}

// Gerar HTML para produtos mais vendidos
function gerarRelatorioMaisVendidosHtml(produtos) {
    let html = `
        <div class="pdf-section">
            <h2>🏆 Produtos Mais Vendidos</h2>
            <table class="pdf-table">
                <thead>
                    <tr>
                        <th>Posição</th>
                        <th>Produto</th>
                        <th>Quantidade Vendida</th>
                        <th>Total (R$)</th>
                        <th>Nº de Vendas</th>
                    </tr>
                </thead>
                <tbody>
    `;
    
    produtos.forEach((produto, index) => {
        html += `
            <tr>
                <td><strong>${index + 1}º</strong></td>
                <td>${produto.produto}</td>
                <td>${produto.quantidade_vendida}</td>
                <td>R$ ${produto.total_vendido?.toFixed(2) || '0.00'}</td>
                <td>${produto.total_vendas}</td>
            </tr>
        `;
    });
    
    // Calcular totais
    const totalQuantidade = produtos.reduce((sum, p) => sum + (p.quantidade_vendida || 0), 0);
    const totalValor = produtos.reduce((sum, p) => sum + (p.total_vendido || 0), 0);
    
    html += `
                </tbody>
            </table>
            <p><strong>Total de unidades vendidas:</strong> ${totalQuantidade}</p>
            <p><strong>Valor total em vendas:</strong> R$ ${totalValor.toFixed(2)}</p>
        </div>
    `;
    
    return html;
}

// Gerar HTML para movimentações
function gerarRelatorioMovimentacoesHtml(movimentacoes) {
    let html = `
        <div class="pdf-section">
            <h2>📊 Movimentações de Estoque</h2>
            <table class="pdf-table">
                <thead>
                    <tr>
                        <th>Data</th>
                        <th>Tipo</th>
                        <th>Produto</th>
                        <th>Quantidade</th>
                        <th>Valor (R$)</th>
                        <th>Usuário</th>
                        <th>Referência</th>
                    </tr>
                </thead>
                <tbody>
    `;
    
    movimentacoes.forEach(mov => {
        const data = new Date(mov.data);
        html += `
            <tr>
                <td>${data.toLocaleDateString('pt-BR')}</td>
                <td><strong>${mov.tipo}</strong></td>
                <td>${mov.produto}</td>
                <td>${mov.quantidade}</td>
                <td>R$ ${mov.valor?.toFixed(2) || '0.00'}</td>
                <td>${mov.usuario}</td>
                <td>${mov.referencia || 'N/A'}</td>
            </tr>
        `;
    });
    
    html += `
                </tbody>
            </table>
            <p><strong>Total de movimentações:</strong> ${movimentacoes.length}</p>
            <p><strong>Vendas:</strong> ${movimentacoes.filter(m => m.tipo === 'VENDA').length}</p>
            <p><strong>Entradas:</strong> ${movimentacoes.filter(m => m.tipo === 'ENTRADA').length}</p>
        </div>
    `;
    
    return html;
}

// Fechar modal ao clicar fora
window.onclick = function(event) {
    const modalProduto = document.getElementById('modal-produto');
    const modalScanner = document.getElementById('modal-scanner');
    
    if (event.target === modalProduto) {
        fecharModalProduto();
    }
    if (event.target === modalScanner) {
        fecharModalScanner();
    }
}

// Tecla ESC fecha modais
document.addEventListener('keydown', function(event) {
    if (event.key === 'Escape') {
        fecharModalProduto();
        fecharModalScanner();
    }
});

// 🔧 CORREÇÃO: Exportar funções para uso global
window.abrirModalProduto = abrirModalProduto;
window.abrirModalScanner = abrirModalScanner;
window.filtrarProdutos = filtrarProdutos;
window.exportarEstoque = exportarEstoque;
window.editarProduto = editarProduto;
window.excluirProduto = excluirProduto;
window.salvarProduto = salvarProduto;
window.fecharModalProduto = fecharModalProduto;
window.fecharModalScanner = fecharModalScanner;
window.iniciarScanner = iniciarScanner;
window.pararScanner = pararScanner;
window.usarCodigoLido = usarCodigoLido;
window.abrirModalRelatorios = abrirModalRelatorios;
window.fecharModalRelatorios = fecharModalRelatorios;
window.gerarRelatorioPdf = gerarRelatorioPdf;