// 👗 DASHBOARD LINGERIE - SCRIPT PRINCIPAL (CORRIGIDO)
console.log("👗 Inicializando Dashboard Lingerie...");

// 🔧 CONFIGURAÇÃO DA API
const API_BASE = 'http://localhost:8001';

// Variáveis globais do dashboard
let dashboardData = {
    vendasRecentes: [],
    estoqueBaixo: [],
    estatisticas: {}
};

// 🔧 VERIFICAÇÃO INICIAL DE SESSÃO (SEM LOOP)
function verificarSessaoInicial() {
    const session_token = localStorage.getItem('session_token');
    const currentPage = window.location.pathname;
    
    console.log('🔍 Verificação inicial:', {
        token: session_token ? '✅ Presente' : '❌ Ausente',
        pagina: currentPage
    });

    // Se não tem token e está no dashboard, redirecionar
    if (!session_token && currentPage.includes('dashboard.html')) {
        console.log('🚨 Acesso não autorizado ao dashboard');
        window.location.href = '../index.html';
        return false;
    }

    return !!session_token;
}

// 🔧 FUNÇÃO: Configurar todos os botões
function configurarTodosBotoes() {
    console.log("🔄 Configurando todos os botões...");
    
    // Botão Nova Venda (Header)
    const btnNovaVenda = document.getElementById('btnNovaVenda');
    if (btnNovaVenda) {
        btnNovaVenda.addEventListener('click', function() {
            console.log("💰 Navegando para Nova Venda");
            window.location.href = 'vendas_rapidas.html';
        });
    }
    
    // Botão Relatório
    const btnRelatorio = document.getElementById('btnRelatorio');
    if (btnRelatorio) {
        btnRelatorio.addEventListener('click', function() {
            console.log("📈 Navegando para Relatórios");
            window.location.href = 'relatorios.html';
        });
    }
    
    // Botão Sair
    const btnSair = document.getElementById('btnSair');
    if (btnSair) {
        btnSair.addEventListener('click', function() {
            if (confirm('Deseja realmente sair do sistema?')) {
                console.log("🚪 Logout solicitado");
                fazerLogout();
            }
        });
    }
    
    // Botão Voltar
    const btnVoltar = document.getElementById('btnVoltar');
    if (btnVoltar) {
        btnVoltar.addEventListener('click', function() {
            window.history.back();
        });
    }
    
    // Ações Rápidas
    const btnNovaVendaRapida = document.getElementById('btnNovaVendaRapida');
    if (btnNovaVendaRapida) {
        btnNovaVendaRapida.addEventListener('click', function() {
            window.location.href = 'vendas_rapidas.html';
        });
    }
    
    const btnNovoProduto = document.getElementById('btnNovoProduto');
    if (btnNovoProduto) {
        btnNovoProduto.addEventListener('click', function() {
            window.location.href = 'produtos.html';
        });
    }
    
    const btnNovoCliente = document.getElementById('btnNovoCliente');
    if (btnNovoCliente) {
        btnNovoCliente.addEventListener('click', function() {
            window.location.href = 'clientes.html';
        });
    }
    
    const btnVerEstoque = document.getElementById('btnVerEstoque');
    if (btnVerEstoque) {
        btnVerEstoque.addEventListener('click', function() {
            window.location.href = 'produtos.html';
        });
    }
    
    console.log("🎯 Todos os botões configurados!");
}

// 🔧 FUNÇÃO: Atualizar header do usuário
function atualizarHeaderUsuario(userData) {
    console.log("👤 Atualizando header do usuário:", userData);
    
    // Atualizar nome do usuário
    const userNameElement = document.getElementById('userName');
    if (userNameElement) {
        userNameElement.textContent = userData.nome || 'Usuário';
    }
    
    // Atualizar perfil do usuário
    const userPerfilElement = document.getElementById('userPerfil');
    if (userPerfilElement) {
        userPerfilElement.textContent = userData.perfil || 'Usuário';
    }
    
    // Atualizar saudação
    const userGreeting = document.querySelector('.user-greeting');
    if (userGreeting && userData.nome) {
        userGreeting.textContent = `Olá, ${userData.nome.split(' ')[0]}`;
    }
    
    console.log("✅ Header do usuário atualizado");
}

// 🔧 FUNÇÃO: Carregar informações do usuário (CORRIGIDA)
async function carregarInformacoesUsuario() {
    try {
        console.log("👤 Carregando informações do usuário...");
        
        const token = localStorage.getItem('session_token');
        if (!token) {
            console.log("⚠️ Nenhum token de sessão encontrado");
            return null;
        }

        const response = await fetch(`${API_BASE}/api/user-info`, {
            method: 'GET',
            headers: {
                'Authorization': token,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            console.error('❌ Erro HTTP ao buscar user-info:', response.status);
            
            if (response.status === 401) {
                console.log("🔐 Sessão expirada");
                fazerLogout();
                return null;
            }
            return null;
        }

        const userData = await response.json();
        console.log("✅ Informações do usuário carregadas");
        
        // Atualizar localStorage
        if (userData.nome) localStorage.setItem('user_nome', userData.nome);
        if (userData.perfil) localStorage.setItem('user_perfil', userData.perfil);
        
        // Atualizar a interface
        atualizarHeaderUsuario(userData);
        
        return userData;
        
    } catch (error) {
        console.error('❌ Erro ao carregar informações do usuário:', error);
        return null;
    }
}

// 🔧 FUNÇÃO: Carregar estatísticas do dashboard (CORRIGIDA)
async function carregarEstatisticas() {
    try {
        console.log('📈 Buscando estatísticas...');
        
        const token = localStorage.getItem('session_token');
        if (!token) {
            console.error('❌ Token não disponível');
            return;
        }

        const response = await fetch(`${API_BASE}/api/dashboard/estatisticas`, {
            method: 'GET',
            headers: {
                'Authorization': token,
                'Content-Type': 'application/json'
            }
        });

        if (!response || !response.ok) {
            console.error('❌ Erro ao carregar estatísticas:', response?.status);
            return;
        }

        const data = await response.json();
        dashboardData.estatisticas = data;
        
        atualizarCardsEstatisticas(data);
        console.log('✅ Estatísticas carregadas');
        
    } catch (error) {
        console.error('❌ Erro ao carregar estatísticas:', error);
    }
}

// 🔧 FUNÇÃO: Atualizar cards de estatísticas
function atualizarCardsEstatisticas(estatisticas) {
    const statsGrid = document.getElementById('dashboardStats');
    if (!statsGrid) return;
    
    if (!estatisticas || Object.keys(estatisticas).length === 0) {
        statsGrid.innerHTML = `
            <div class="stat-card">
                <div class="stat-icon">📊</div>
                <div class="stat-value">Sem dados</div>
                <div class="stat-label">Estatísticas indisponíveis</div>
            </div>
        `;
        return;
    }
    
    const cardsHTML = `
        <div class="stat-card">
            <div class="stat-icon">💰</div>
            <div class="stat-value">${estatisticas.vendasHoje || 0}</div>
            <div class="stat-label">Vendas Hoje</div>
        </div>
        <div class="stat-card">
            <div class="stat-icon">📦</div>
            <div class="stat-value">${estatisticas.totalProdutos || 0}</div>
            <div class="stat-label">Produtos em Estoque</div>
        </div>
        <div class="stat-card">
            <div class="stat-icon">⚠️</div>
            <div class="stat-value">${estatisticas.estoqueBaixo || 0}</div>
            <div class="stat-label">Estoque Baixo</div>
        </div>
        <div class="stat-card">
            <div class="stat-icon">👥</div>
            <div class="stat-value">${estatisticas.clientesNovos || 0}</div>
            <div class="stat-label">Novos Clientes</div>
        </div>
    `;
    
    statsGrid.innerHTML = cardsHTML;
}


// ✅ FUNÇÃO PARA CARREGAR VENDAS RECENTES
async function carregarVendasRecentes() {
    try {
        console.log('📊 Carregando vendas recentes...');
        const token = localStorage.getItem('session_token');
        
        const response = await fetch(`${API_BASE}/api/dashboard/vendas-recentes`, {
            headers: {
                'Authorization': token,
                'Content-Type': 'application/json'
            }
        });

        const data = await response.json();
        
        if (data.success && data.vendas_recentes) {
            console.log(`✅ ${data.vendas_recentes.length} vendas recentes carregadas`);
            exibirVendasRecentes(data.vendas_recentes);
        } else {
            console.log('❌ Nenhuma venda recente encontrada ou erro na resposta');
            exibirVendasRecentes([]);
        }
        
    } catch (error) {
        console.error('❌ Erro ao carregar vendas recentes:', error);
        exibirVendasRecentes([]);
    }
}


// ✅ FUNÇÃO PARA EXIBIR VENDAS RECENTES NA DASHBOARD
// ✅ FUNÇÃO CORRIGIDA PARA EXIBIR VENDAS RECENTES
function exibirVendasRecentes(vendas) {
    const container = document.getElementById('vendasRecentesContent');
    
    if (!container) {
        console.log('❌ Container #vendasRecentesContent não encontrado');
        return;
    }

    console.log(`🎯 Exibindo ${vendas ? vendas.length : 0} vendas no container`);

    if (!vendas || vendas.length === 0) {
        container.innerHTML = `
            <div class="empty-sales">
                <div class="empty-icon">📊</div>
                <p>Nenhuma venda recente</p>
                <p>As vendas aparecerão aqui após serem realizadas</p>
            </div>
        `;
        return;
    }

    container.innerHTML = vendas.map(venda => `
        <div class="venda-recente-item">
            <div class="venda-info">
                <div class="venda-cliente">${venda.cliente}</div>
                <div class="venda-total">R$ ${venda.total.toFixed(2)}</div>
            </div>
            <div class="venda-meta">
                <div class="venda-data">${venda.data_formatada}</div>
                <div class="venda-metodo">${formatarMetodoPagamento(venda.forma_pagamento)}</div>
            </div>
        </div>
    `).join('');
    
    console.log(`✅ ${vendas.length} vendas exibidas com sucesso`);
}



// ✅ FUNÇÃO PARA FORMATAR MÉTODO DE PAGAMENTO
function formatarMetodoPagamento(metodo) {
    const metodos = {
        'dinheiro': '💵 Dinheiro',
        'cartao_credito': '💳 Crédito',
        'cartao_debito': '💳 Débito',
        'pix': '📱 PIX',
        'transferencia': '🏦 Transferência'
    };
    return metodos[metodo] || metodo;
}

window.atualizarDashboard = async function() {
    console.log('🔄 Atualizando dashboard...');
    await carregarVendasRecentes();
    await carregarEstatisticas();
    await carregarEstoqueBaixo();
};

// ✅ INICIALIZAR VENDAS RECENTES QUANDO A PÁGINA CARREGAR
document.addEventListener('DOMContentLoaded', function() {
    console.log('🛍️ Inicializando módulo de vendas rápidas...');
    
    // Verificar autenticação
    verificarAutenticacao();
    
    // Carregar dados do usuário
    carregarDadosUsuario();
    
    // Carregar produtos
    carregarProdutosDaSuaBase().then(() => {
        inicializarEventos();
        exibirProdutos();
        
        // ✅ CARREGAR VENDAS RECENTES
        carregarVendasRecentes();
    });

      // Carregar vendas recentes quando a dashboard abrir
    carregarVendasRecentes();
    carregarEstatisticas(); // Se você tiver essa função
    carregarEstoqueBaixo(); // Se você tiver essa função


      // Ouvir evento de venda finalizada (do script de vendas)
    window.addEventListener('vendaFinalizada', function() {
        console.log('🎯 Evento de venda finalizada recebido, atualizando dashboard...');
        carregarVendasRecentes();
    });

    // Configurar eventos
    configurarEventosDashboard();

    
     // Atualizar automaticamente a cada 30 segundos
    setInterval(() => {
        carregarVendasRecentes();
        carregarEstatisticas();
    }, 30000);
});

function carregarDadosUsuario() {
    const userName = localStorage.getItem('user_nome');
    const userPerfil = localStorage.getItem('user_perfil');
    
    if (userName) {
        document.getElementById('userName').textContent = userName;
    }
    if (userPerfil) {
        document.getElementById('userPerfil').textContent = userPerfil;
    }
}

// ✅ CONFIGURAR EVENTOS DA DASHBOARD
function configurarEventosDashboard() {
    // Botão Nova Venda
    const btnNovaVenda = document.getElementById('btnNovaVenda');
    if (btnNovaVenda) {
        btnNovaVenda.addEventListener('click', function() {
            window.location.href = 'vendas.html';
        });
    }
}
// 🔧 FUNÇÃO: Atualizar seção de vendas recentes
// function atualizarVendasRecentes(vendas) {
//     const vendasContent = document.getElementById('vendasRecentesContent');
//     if (!vendasContent) return;
    
//     if (!vendas || vendas.length === 0) {
//         vendasContent.innerHTML = `
//             <div class="empty-state">
//                 <div class="empty-icon">💰</div>
//                 <div class="empty-text">Nenhuma venda recente</div>
//             </div>
//         `;
//         return;
//     }
    
//     const vendasHTML = vendas.map(venda => `
//         <div class="sale-item">
//             <div class="sale-info">
//                 <div class="sale-client">${venda.cliente_nome || 'Cliente não identificado'}</div>
//                 <div class="sale-date">${formatarData(venda.data_venda)}</div>
//             </div>
//             <div class="sale-amount">R$ ${(venda.valor_total || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</div>
//         </div>
//     `).join('');
    
//     vendasContent.innerHTML = vendasHTML;
// }

// 🔧 FUNÇÃO: Carregar produtos com estoque baixo (CORRIGIDA)
async function carregarEstoqueBaixo() {
    try {
        console.log('📦 Buscando produtos com estoque baixo...');
        
        const token = localStorage.getItem('session_token');
        if (!token) {
            console.error('❌ Token não disponível');
            carregarEstoqueBaixoMock();
            return;
        }

        const response = await fetch(`${API_BASE}/api/produtos?estoque_baixo=true&limite=10`, {
            method: 'GET',
            headers: {
                'Authorization': token,
                'Content-Type': 'application/json'
            }
        });

        if (!response || !response.ok) {
            console.error('❌ Erro ao carregar estoque baixo:', response?.status);
            carregarEstoqueBaixoMock();
            return;
        }

        const data = await response.json();
        dashboardData.estoqueBaixo = data.produtos || [];
        
        atualizarEstoqueBaixo(dashboardData.estoqueBaixo);
        console.log(`✅ ${dashboardData.estoqueBaixo.length} produtos com estoque baixo carregados`);
        
    } catch (error) {
        console.error('❌ Erro ao carregar estoque baixo:', error);
        carregarEstoqueBaixoMock();
    }
}

// 🔧 FUNÇÃO: Atualizar seção de estoque baixo
function atualizarEstoqueBaixo(produtos) {
    const estoqueContent = document.getElementById('estoqueBaixoContent');
    if (!estoqueContent) return;
    
    if (!produtos || produtos.length === 0) {
        estoqueContent.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">✅</div>
                <div class="empty-text">Estoque em dia</div>
            </div>
        `;
        return;
    }
    
    const produtosHTML = produtos.map(produto => `
        <div class="stock-item ${produto.estoque_atual <= 5 ? 'stock-critical' : 'stock-low'}">
            <div class="product-info">
                <div class="product-name">${produto.nome}</div>
                <div class="product-category">${produto.categoria || 'Sem categoria'}</div>
            </div>
            <div class="stock-info">
                <div class="stock-level">${produto.estoque_atual} unid.</div>
                <div class="stock-alert">${produto.estoque_atual <= 5 ? 'CRÍTICO' : 'BAIXO'}</div>
            </div>
        </div>
    `).join('');
    
    estoqueContent.innerHTML = produtosHTML;
}

// 🔧 FUNÇÃO: Formatar data
function formatarData(dataString) {
    if (!dataString) return 'Data não disponível';
    
    try {
        const data = new Date(dataString);
        return data.toLocaleDateString('pt-BR', {
            day: '2-digit',
            month: '2-digit',
            hour: '2-digit',
            minute: '2-digit'
        });
    } catch (error) {
        return dataString;
    }
}

// 🔧 FUNÇÃO: Carregar dashboard completo (CORRIGIDA)
async function carregarDashboard() {
    try {
        console.log("🔄 Carregando dados do dashboard...");
        
        // Carregar informações do usuário primeiro
        const userData = await carregarInformacoesUsuario();
        if (!userData) {
            console.error('❌ Não foi possível carregar informações do usuário');
            return;
        }

        // Carregar dados em paralelo para melhor performance
        await Promise.all([
            carregarEstatisticas(),
            carregarVendasRecentes(), 
            carregarEstoqueBaixo()
        ]);
        
        console.log("✅ Dashboard carregado com sucesso!");
        
    } catch (error) {
        console.error('❌ Erro ao carregar dashboard:', error);
        carregarDadosMock();
    }
}

// 🔧 FUNÇÃO: Dados mock para fallback
function carregarDadosMock() {
    console.log('📋 Carregando dados mock para dashboard...');
    
    const estatisticasMock = {
        vendasHoje: 8,
        totalProdutos: 156,
        estoqueBaixo: 12,
        clientesNovos: 3
    };
    atualizarCardsEstatisticas(estatisticasMock);
    carregarVendasRecentesMock();
    carregarEstoqueBaixoMock();
}

function carregarVendasRecentesMock() {
    const vendasMock = [
        { cliente_nome: 'Maria Silva', data_venda: new Date().toISOString(), valor_total: 189.90 },
        { cliente_nome: 'Ana Costa', data_venda: new Date(Date.now() - 2*60*60*1000).toISOString(), valor_total: 245.50 },
        { cliente_nome: 'Joana Pereira', data_venda: new Date(Date.now() - 4*60*60*1000).toISOString(), valor_total: 129.90 },
        { cliente_nome: 'Carla Santos', data_venda: new Date(Date.now() - 6*60*60*1000).toISOString(), valor_total: 299.90 }
    ];
    atualizarVendasRecentes(vendasMock);
}

function carregarEstoqueBaixoMock() {
    const produtosMock = [
        { nome: 'Sutiã com Bojo 38B', categoria: 'Sutiãs', estoque_atual: 3 },
        { nome: 'Calcinha Fio Dental M', categoria: 'Calcinhas', estoque_atual: 2 },
        { nome: 'Conjunto Renda Preta P', categoria: 'Conjuntos', estoque_atual: 4 },
        { nome: 'Body Sensual Preto G', categoria: 'Bodies', estoque_atual: 1 }
    ];
    atualizarEstoqueBaixo(produtosMock);
}

// 🔧 FUNÇÃO: Fazer logout (CORRIGIDA)
function fazerLogout() {
    console.log("🚪 Iniciando logout...");
    
    const btnSair = document.getElementById('btnSair');
    if (btnSair) {
        btnSair.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saindo...';
        btnSair.disabled = true;
    }

    // Limpar dados e redirecionar
    setTimeout(function () {
        localStorage.removeItem('session_token');
        localStorage.removeItem('user_nome');
        localStorage.removeItem('user_perfil');
        localStorage.removeItem('user_id');
        
        console.log("✅ Logout realizado");
        window.location.href = '../index.html';
    }, 1000);
}

// 🔧 FUNÇÃO: Iniciar atualização automática
function iniciarAtualizacaoAutomatica() {
    setInterval(() => {
        const token = localStorage.getItem('session_token');
        if (token) {
            console.log('🔄 Atualização automática do dashboard...');
            carregarEstatisticas();
            carregarVendasRecentes();
        }
    }, 120000); // 2 minutos
}

// 🔧 INICIALIZAÇÃO DO DASHBOARD (CORRIGIDA)
document.addEventListener('DOMContentLoaded', function () {
    console.log("✅ DOM carregado, configurando dashboard lingerie...");
    
    // 🔧 VERIFICAÇÃO INICIAL CRÍTICA
    if (!verificarSessaoInicial()) {
        return; // Para a execução se não estiver autenticado
    }
    
    // Configurar botões primeiro
    configurarTodosBotoes();
    
    // Carregar dados do usuário e dashboard
    const user_nome = localStorage.getItem('user_nome');
    const user_perfil = localStorage.getItem('user_perfil');
    
    // Atualizar header com dados locais imediatamente
    if (user_nome) {
        atualizarHeaderUsuario({
            nome: user_nome,
            perfil: user_perfil
        });
    }
    
    // Carregar dashboard
    carregarDashboard();
    
    // Iniciar atualização automática
    iniciarAtualizacaoAutomatica();
});

console.log("🎯 Dashboard Lingerie script carregado e pronto!");