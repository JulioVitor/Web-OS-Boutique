// app.js - Aplicação Principal WebOS Boutique
console.log('👗 WebOS Boutique - Sistema de Gestão para Lingeries');

// Configurações globais
const APP_CONFIG = {
    API_BASE: 'http://localhost:8001',
    APP_NAME: 'WebOS Boutique',
    VERSION: '1.0.0'
};

// Estado da aplicação
let appState = {
    usuario: null,
    permissao: null,
    lojaId: null,
    moduloAtivo: 'dashboard'
};

// Elementos do DOM
let domElements = {};

// Inicializar elementos do DOM
function initDOMElements() {
    console.log('🔍 Inicializando elementos da aplicação...');
    
    // Elementos principais
    domElements = {
        // Header
        appHeader: document.getElementById('appHeader'),
        userName: document.getElementById('userName'),
        userInitial: document.getElementById('userInitial'),
        btnLogout: document.getElementById('btnLogout'),
        
        // Sidebar/Navegação
        sidebar: document.getElementById('sidebar'),
        navLinks: document.querySelectorAll('.nav-link'),
        
        // Conteúdo principal
        mainContent: document.getElementById('mainContent'),
        loadingScreen: document.getElementById('loadingScreen'),
        
        // Módulos
        dashboardModule: document.getElementById('dashboardModule'),
        vendasModule: document.getElementById('vendasModule'),
        estoqueModule: document.getElementById('estoqueModule'),
        clientesModule: document.getElementById('clientesModule'),
        relatoriosModule: document.getElementById('relatoriosModule'),
        configuracoesModule: document.getElementById('configuracoesModule'),
        
        // Footer
        appFooter: document.getElementById('appFooter'),
        currentYear: document.getElementById('currentYear')
    };
    
    console.log('✅ Elementos carregados:', Object.keys(domElements).filter(key => domElements[key]));
    
    return Object.values(domElements).some(el => el !== null);
}

// Carregar dados do usuário
function loadUserData() {
    console.log('👤 Carregando dados do usuário...');
    
    const userNome = localStorage.getItem('user_nome');
    const userPerfil = localStorage.getItem('user_perfil');
    const userId = localStorage.getItem('user_id');
    const sessionToken = localStorage.getItem('session_token');
    
    if (!sessionToken || !userNome) {
        console.warn('⚠️ Sessão não encontrada, redirecionando para login...');
        redirectToLogin();
        return false;
    }
    
    appState.usuario = {
        id: userId,
        nome: userNome,
        perfil: userPerfil || 'user',
        token: sessionToken
    };
    
    console.log('✅ Usuário carregado:', appState.usuario);
    
    // Atualizar UI com dados do usuário
    updateUserInterface();
    
    return true;
}

// Atualizar interface do usuário
function updateUserInterface() {
    console.log('🎨 Atualizando interface...');
    
    // Atualizar header com dados do usuário
    if (domElements.userName && appState.usuario) {
        domElements.userName.textContent = appState.usuario.nome;
    }
    
    if (domElements.userInitial && appState.usuario) {
        const inicial = appState.usuario.nome.charAt(0).toUpperCase();
        domElements.userInitial.textContent = inicial;
    }
    
    // Atualizar ano no footer
    if (domElements.currentYear) {
        domElements.currentYear.textContent = new Date().getFullYear();
    }
    
    // Aplicar tema baseado no perfil
    applyThemeByProfile();
}

// Aplicar tema baseado no perfil do usuário
function applyThemeByProfile() {
    const profile = appState.usuario?.perfil;
    
    // Remover classes de tema anteriores
    document.body.classList.remove('theme-admin', 'theme-vendedor', 'theme-tecnico');
    
    // Adicionar classe baseada no perfil
    if (profile === 'admin') {
        document.body.classList.add('theme-admin');
        console.log('🎨 Tema Admin aplicado');
    } else if (profile === 'vendedor') {
        document.body.classList.add('theme-vendedor');
        console.log('🎨 Tema Vendedor aplicado');
    }
}

// Configurar event listeners
function setupEventListeners() {
    console.log('🎯 Configurando eventos...');
    
    // Logout
    if (domElements.btnLogout) {
        domElements.btnLogout.addEventListener('click', handleLogout);
    }
    
    // Navegação
    if (domElements.navLinks) {
        domElements.navLinks.forEach(link => {
            link.addEventListener('click', handleNavigation);
        });
    }
    
    // Eventos de teclado
    document.addEventListener('keydown', handleKeyboardShortcuts);
    
    // Verificar sessão periodicamente
    setInterval(checkSessionValidity, 300000); // 5 minutos
    
    console.log('✅ Eventos configurados');
}

// Manipular logout
async function handleLogout() {
    console.log('🚪 Iniciando logout...');
    
    const token = localStorage.getItem('session_token');
    
    try {
        // Chamar API para logout
        if (token) {
            await fetch(`${APP_CONFIG.API_BASE}/api/logout`, {
                method: 'POST',
                headers: {
                    'Authorization': token
                }
            });
        }
    } catch (error) {
        console.warn('⚠️ Erro no logout da API:', error);
    } finally {
        // Limpar localStorage independente do sucesso da API
        localStorage.clear();
        sessionStorage.clear();
        
        console.log('✅ Logout realizado');
        redirectToLogin();
    }
}

// Manipular navegação
function handleNavigation(event) {
    event.preventDefault();
    
    const target = event.currentTarget;
    const modulo = target.getAttribute('data-modulo');
    
    if (!modulo) {
        console.warn('⚠️ Módulo não especificado no link');
        return;
    }
    
    console.log('🧭 Navegando para:', modulo);
    
    // Atualizar estado
    appState.moduloAtivo = modulo;
    
    // Atualizar UI de navegação
    updateNavigationUI(target);
    
    // Carregar módulo
    loadModule(modulo);
}

// Atualizar UI de navegação
function updateNavigationUI(activeLink) {
    // Remover classe active de todos os links
    domElements.navLinks.forEach(link => {
        link.classList.remove('active');
    });
    
    // Adicionar classe active ao link clicado
    activeLink.classList.add('active');
    
    // Atualizar título da página
    updatePageTitle(activeLink.textContent.trim());
}

// Atualizar título da página
function updatePageTitle(sectionName) {
    document.title = `${sectionName} - ${APP_CONFIG.APP_NAME}`;
}

// Carregar módulo
function loadModule(modulo) {
    console.log('📦 Carregando módulo:', modulo);
    
    // Mostrar loading
    showLoading();
    
    // Ocultar todos os módulos
    hideAllModules();
    
    // Carregar módulo específico após breve delay
    setTimeout(() => {
        switch (modulo) {
            case 'dashboard':
                loadDashboard();
                break;
            case 'vendas':
                loadVendas();
                break;
            case 'estoque':
                loadEstoque();
                break;
            case 'clientes':
                loadClientes();
                break;
            case 'relatorios':
                loadRelatorios();
                break;
            case 'configuracoes':
                loadConfiguracoes();
                break;
            default:
                console.warn('⚠️ Módulo desconhecido:', modulo);
                loadDashboard();
        }
        
        hideLoading();
    }, 300);
}

// Ocultar todos os módulos
function hideAllModules() {
    const modules = [
        domElements.dashboardModule,
        domElements.vendasModule,
        domElements.estoqueModule,
        domElements.clientesModule,
        domElements.relatoriosModule,
        domElements.configuracoesModule
    ];
    
    modules.forEach(module => {
        if (module) module.style.display = 'none';
    });
}

// Mostrar loading
function showLoading() {
    if (domElements.loadingScreen) {
        domElements.loadingScreen.style.display = 'flex';
    }
}

// Ocultar loading
function hideLoading() {
    if (domElements.loadingScreen) {
        domElements.loadingScreen.style.display = 'none';
    }
}

// Carregar Dashboard
function loadDashboard() {
    console.log('📊 Inicializando Dashboard...');
    
    if (domElements.dashboardModule) {
        domElements.dashboardModule.style.display = 'block';
        
        // Carregar dados do dashboard
        loadDashboardData();
    }
}

// Carregar dados do dashboard
async function loadDashboardData() {
    try {
        const token = localStorage.getItem('session_token');
        const response = await fetch(`${APP_CONFIG.API_BASE}/api/dashboard/estatisticas`, {
            headers: {
                'Authorization': token
            }
        });
        
        if (response.ok) {
            const data = await response.json();
            updateDashboardUI(data);
        } else {
            console.error('❌ Erro ao carregar dashboard:', response.status);
        }
    } catch (error) {
        console.error('❌ Erro ao carregar dashboard:', error);
    }
}

// Atualizar UI do dashboard
function updateDashboardUI(data) {
    console.log('🎨 Atualizando UI do dashboard:', data);
    
    // Aqui você atualizaria os elementos do dashboard com os dados
    // Exemplo: document.getElementById('totalProdutos').textContent = data.totalProdutos;
}

// Carregar Módulo de Vendas
function loadVendas() {
    console.log('💰 Inicializando Módulo de Vendas...');
    
    if (domElements.vendasModule) {
        domElements.vendasModule.style.display = 'block';
        
        // Se o script de vendas não estiver carregado, carregar dinamicamente
        if (typeof initializeVendas === 'undefined') {
            loadScript('./js/vendas.js')
                .then(() => {
                    if (typeof initializeVendas === 'function') {
                        initializeVendas();
                    }
                })
                .catch(error => {
                    console.error('❌ Erro ao carregar módulo de vendas:', error);
                });
        } else {
            initializeVendas();
        }
    }
}

// Carregar Módulo de Estoque
function loadEstoque() {
    console.log('📦 Inicializando Módulo de Estoque...');
    
    if (domElements.estoqueModule) {
        domElements.estoqueModule.style.display = 'block';
        // Inicializar estoque aqui
    }
}

// Carregar outros módulos (implementação similar)
function loadClientes() {
    console.log('👥 Inicializando Módulo de Clientes...');
    if (domElements.clientesModule) {
        domElements.clientesModule.style.display = 'block';
    }
}

function loadRelatorios() {
    console.log('📈 Inicializando Módulo de Relatórios...');
    if (domElements.relatoriosModule) {
        domElements.relatoriosModule.style.display = 'block';
    }
}

function loadConfiguracoes() {
    console.log('⚙️ Inicializando Módulo de Configurações...');
    if (domElements.configuracoesModule) {
        domElements.configuracoesModule.style.display = 'block';
    }
}

// Carregar script dinamicamente
function loadScript(src) {
    return new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = src;
        script.onload = resolve;
        script.onerror = reject;
        document.head.appendChild(script);
    });
}

// Manipular atalhos de teclado
function handleKeyboardShortcuts(event) {
    // Ctrl + 1 - Dashboard
    if (event.ctrlKey && event.key === '1') {
        event.preventDefault();
        simulateNavigationClick('dashboard');
    }
    // Ctrl + 2 - Vendas
    else if (event.ctrlKey && event.key === '2') {
        event.preventDefault();
        simulateNavigationClick('vendas');
    }
    // Ctrl + L - Logout
    else if (event.ctrlKey && event.key === 'l') {
        event.preventDefault();
        handleLogout();
    }
    // Escape - Voltar/Cancelar
    else if (event.key === 'Escape') {
        // Implementar lógica de cancelamento baseada no contexto
    }
}

// Simular clique na navegação
function simulateNavigationClick(modulo) {
    const link = document.querySelector(`[data-modulo="${modulo}"]`);
    if (link) {
        link.click();
    }
}

// Verificar validade da sessão
async function checkSessionValidity() {
    const token = localStorage.getItem('session_token');
    
    if (!token) {
        console.warn('⚠️ Token não encontrado');
        redirectToLogin();
        return;
    }
    
    try {
        const response = await fetch(`${APP_CONFIG.API_BASE}/api/user-info`, {
            headers: {
                'Authorization': token
            }
        });
        
        if (!response.ok) {
            throw new Error('Sessão inválida');
        }
        
        console.log('✅ Sessão válida');
    } catch (error) {
        console.warn('⚠️ Sessão expirada:', error);
        showSessionExpiredMessage();
    }
}

// Mostrar mensagem de sessão expirada
function showSessionExpiredMessage() {
    // Criar mensagem elegante
    const message = document.createElement('div');
    message.innerHTML = `
        <div style="
            position: fixed;
            top: 20px;
            right: 20px;
            background: #fff3cd;
            border: 1px solid #ffeaa7;
            color: #856404;
            padding: 15px 20px;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.1);
            z-index: 10000;
            animation: slideInRight 0.3s ease-out;
        ">
            ⚠️ Sua sessão expirou. Redirecionando para login...
        </div>
    `;
    
    document.body.appendChild(message);
    
    setTimeout(() => {
        redirectToLogin();
    }, 3000);
}

// Redirecionar para login
function redirectToLogin() {
    console.log('🔀 Redirecionando para login...');
    window.location.href = './index.html';
}

// Inicializar aplicação
async function initializeApp() {
    console.log('🚀 Inicializando WebOS Boutique...');
    
    try {
        // 1. Inicializar elementos do DOM
        const elementsReady = initDOMElements();
        if (!elementsReady) {
            throw new Error('Elementos do DOM não carregados');
        }
        
        // 2. Carregar dados do usuário
        const userLoaded = loadUserData();
        if (!userLoaded) {
            throw new Error('Usuário não autenticado');
        }
        
        // 3. Configurar eventos
        setupEventListeners();
        
        // 4. Carregar módulo inicial (dashboard)
        loadModule('dashboard');
        
        console.log('🎉 Aplicação inicializada com sucesso!');
        
    } catch (error) {
        console.error('❌ Erro na inicialização:', error);
        
        // Em caso de erro crítico, redirecionar para login
        setTimeout(() => {
            redirectToLogin();
        }, 2000);
    }
}

// Inicializar quando o DOM estiver pronto
document.addEventListener('DOMContentLoaded', function() {
    console.log('📄 DOM Carregado - Iniciando aplicação...');
    
    // Pequeno delay para garantir que tudo esteja carregado
    setTimeout(initializeApp, 100);
});

// Exportar para uso global (se necessário)
window.WebOSApp = {
    initializeApp,
    loadModule,
    handleLogout,
    appState,
    config: APP_CONFIG
};

// CSS para animações (adicionar ao seu CSS)
const additionalStyles = `
@keyframes slideInRight {
    from {
        transform: translateX(100%);
        opacity: 0;
    }
    to {
        transform: translateX(0);
        opacity: 1;
    }
}

.theme-admin {
    /* Estilos específicos para admin */
}

.theme-vendedor {
    /* Estilos específicos para vendedor */
}

.loading-screen {
    display: flex;
    justify-content: center;
    align-items: center;
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(255, 255, 255, 0.9);
    z-index: 9999;
}

.nav-link.active {
    background: linear-gradient(135deg, #667eea, #764ba2);
    color: white !important;
}
`;

// Adicionar estilos dinamicamente
const styleSheet = document.createElement('style');
styleSheet.textContent = additionalStyles;
document.head.appendChild(styleSheet);