// session_manager.js - Gerenciador de Sessão WebOS Boutique (SEM REDIRECIONAMENTOS)
class SessionManager {
    constructor() {
        this.API_BASE = 'http://localhost:8001';
        this.allowSystemNavigation = false;
        this.sessionCheckInterval = null;
        this.isCheckingSession = false;
        this.init();
    }

    init() {
        console.log('🔐 Inicializando Session Manager...');
        
        // Verificação inicial única e não-bloqueadora
        setTimeout(() => {
            this.checkSession();
        }, 100);
        
        console.log('✅ Session Manager inicializado');
    }

    // ✅ CORREÇÃO: Verificação não-bloqueadora
    checkSession() {
        if (this.isCheckingSession) return;
        
        this.isCheckingSession = true;
        
        const sessionToken = localStorage.getItem('session_token');
        const currentPath = window.location.pathname;
        const currentPage = currentPath.split('/').pop() || 'index.html';

        console.log('🔍 Verificando sessão:', {
            token: sessionToken ? '✅ Presente' : '❌ Ausente',
            pagina: currentPage,
            path: currentPath
        });

        const isLoginPage = currentPage === 'index.html' || currentPath.endsWith('/');
        const isDashboardPage = currentPage === 'dashboard.html';

        try {
            // 🔧 CASO 1: Usuário na página de login COM token válido
            if (isLoginPage && sessionToken && this.isValidToken(sessionToken)) {
                console.log('✅ Usuário autenticado no login - redirecionando para dashboard');
                setTimeout(() => {
                    this.redirectToDashboard();
                }, 1000);
                return;
            }

            // 🔧 CASO 2: Acesso ao dashboard SEM token (PERMITIR MODO DEMO)
            if (isDashboardPage && !sessionToken) {
                console.log('🔓 Dashboard sem token - Modo Demo ativado');
                this.setupDemoMode();
                return;
            }

            // 🔧 CASO 3: Token inválido/vencido (PERMITIR MODO DEMO)
            if (sessionToken && !this.isValidToken(sessionToken)) {
                console.log('⚠️ Token inválido - Ativando modo demo');
                localStorage.removeItem('session_token');
                this.setupDemoMode();
                return;
            }

            // 🔧 CASO 4: Sessão válida - atualizar UI
            if (sessionToken && this.isValidToken(sessionToken)) {
                console.log('✅ Sessão válida - carregando interface');
                this.updateUserInterface();
                return;
            }

            console.log('🔓 Modo de acesso normal');

        } finally {
            this.isCheckingSession = false;
        }
    }

    // ✅ CORREÇÃO: Validação de token mais permissiva
    isValidToken(token) {
        if (!token) return false;
        
        try {
            // Se for um token JWT, verificar expiração
            if (token.includes('.')) {
                const payload = JSON.parse(atob(token.split('.')[1]));
                const exp = payload.exp * 1000;
                const now = Date.now();
                
                if (exp < now) {
                    console.log('⏰ Token expirado');
                    return false;
                }
            }
            
            return true;
        } catch (error) {
            // Se não for JWT, assumir que é válido (modo demo)
            console.log('🔐 Token não-JWT - assumindo válido para demo');
            return true;
        }
    }

    // ✅ NOVO: Configurar modo demo
    setupDemoMode() {
        console.log('🎭 Configurando modo demo...');
        
        // Garantir que temos dados de usuário para demo
        if (!localStorage.getItem('user_nome')) {
            localStorage.setItem('user_nome', 'Usuário Demo');
        }
        if (!localStorage.getItem('user_perfil')) {
            localStorage.setItem('user_perfil', 'Visitante');
        }
        
        // Atualizar UI para mostrar modo demo
        this.updateUserInterface();
        
        // Adicionar indicador visual do modo demo
        this.addDemoIndicator();
        
        console.log('✅ Modo demo configurado');
    }

    // ✅ CORREÇÃO: Redirecionamento para dashboard apenas quando necessário
    redirectToDashboard() {
        if (this.allowSystemNavigation) return;
        
        const currentPage = window.location.pathname.split('/').pop();
        if (currentPage === 'dashboard.html') {
            console.log('📍 Já está no dashboard');
            return;
        }
        
        console.log('🔀 Redirecionando para dashboard...');
        this.allowSystemNavigation = true;
        window.location.href = 'pages/dashboard.html';
    }

    // ✅ CORREÇÃO: Redirecionamento para login apenas em casos críticos
    redirectToLogin() {
        if (this.allowSystemNavigation) return;
        
        const currentPage = window.location.pathname.split('/').pop();
        if (currentPage === 'index.html' || window.location.pathname.endsWith('/')) {
            console.log('📍 Já está na página de login');
            return;
        }
        
        console.log('🔀 Redirecionando para login...');
        this.allowSystemNavigation = true;
        window.location.href = '../index.html';
    }

    // ✅ CORREÇÃO: Atualizar UI de forma segura
    updateUserInterface() {
        setTimeout(() => {
            try {
                const userName = localStorage.getItem('user_nome') || 'Usuário Demo';
                const userPerfil = localStorage.getItem('user_perfil') || 'Visitante';
                
                console.log('🎨 Atualizando UI do usuário:', { nome: userName, perfil: userPerfil });

                // Atualizar elementos se existirem
                const userNameElement = document.getElementById('userName');
                const userPerfilElement = document.getElementById('userPerfil');
                const userGreeting = document.querySelector('.user-greeting');

                if (userNameElement) userNameElement.textContent = userName;
                if (userPerfilElement) userPerfilElement.textContent = userPerfil;
                if (userGreeting) userGreeting.textContent = `Olá, ${userName.split(' ')[0]}`;
                
            } catch (error) {
                console.warn('⚠️ Erro ao atualizar UI:', error);
            }
        }, 200);
    }

    // ✅ NOVO: Adicionar indicador de modo demo
    addDemoIndicator() {
        setTimeout(() => {
            try {
                // Adicionar badge demo no header
                const headerBrand = document.querySelector('.header-brand');
                if (headerBrand && !headerBrand.querySelector('.demo-badge')) {
                    const demoBadge = document.createElement('span');
                    demoBadge.className = 'demo-badge';
                    demoBadge.textContent = 'DEMO';
                    demoBadge.style.cssText = `
                        background: #f59e0b;
                        color: white;
                        padding: 2px 8px;
                        border-radius: 12px;
                        font-size: 0.7rem;
                        font-weight: bold;
                        margin-left: 8px;
                    `;
                    headerBrand.appendChild(demoBadge);
                }
                
                // Adicionar aviso no dashboard
                const pageTitle = document.querySelector('.page-title');
                if (pageTitle && !document.querySelector('.demo-warning')) {
                    const demoWarning = document.createElement('div');
                    demoWarning.className = 'demo-warning';
                    demoWarning.innerHTML = `
                        <div style="display: flex; align-items: center; gap: 8px; padding: 8px 12px; background: #fffbeb; border: 1px solid #f59e0b; border-radius: 6px; color: #92400e;">
                            <span>⚠️</span>
                            <span>Modo Demonstração - Dados de exemplo</span>
                        </div>
                    `;
                    pageTitle.parentNode.insertBefore(demoWarning, pageTitle.nextSibling);
                }
                
            } catch (error) {
                console.warn('⚠️ Erro ao adicionar indicador demo:', error);
            }
        }, 500);
    }

    // ✅ CORREÇÃO: Logout simplificado
    async logout() {
        if (confirm('👋 Deseja realmente sair do sistema?')) {
            console.log('🚪 Iniciando logout...');
            this.clearSessionData();
            this.redirectToLogin();
        }
    }

    clearSessionData() {
        ['session_token', 'user_nome', 'user_id', 'user_perfil'].forEach(item => {
            localStorage.removeItem(item);
        });
        console.log('🧹 Dados da sessão limpos');
    }

    // ✅ REMOVIDO: Monitoramento agressivo de sessão
    // (Não vamos monitorar sessão para evitar problemas)

    // Navegação
    navigateBack() {
        console.log('↩️ Navegando para voltar');
        this.allowSystemNavigation = true;
        window.history.back();
    }

    navigateTo(url) {
        console.log('🔄 Navegando para:', url);
        this.allowSystemNavigation = true;
        window.location.href = url;
    }
}

// ✅ CORREÇÃO: Inicialização única e segura
document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 Inicializando Session Manager...');
    
    if (!window.sessionManager) {
        window.sessionManager = new SessionManager();
    }
    
    // Configurar botões de forma segura
    setTimeout(() => {
        try {
            const btnSair = document.getElementById('btnSair');
            const btnVoltar = document.getElementById('btnVoltar');
            
            if (btnSair) {
                btnSair.onclick = (e) => {
                    e.preventDefault();
                    window.sessionManager.logout();
                };
            }
            
            if (btnVoltar) {
                btnVoltar.onclick = (e) => {
                    e.preventDefault();
                    window.sessionManager.navigateBack();
                };
            }
        } catch (error) {
            console.warn('⚠️ Erro ao configurar botões:', error);
        }
    }, 500);
});