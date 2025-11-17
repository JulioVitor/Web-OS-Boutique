// Configurações da API
const API_BASE = 'http://localhost:8001';

// Elementos do DOM
let loginForm = null;
let usernameInput = null;
let passwordInput = null;
let loginBtn = null;

// Inicializar elementos do DOM
function initElements() {
    console.log('🔍 Inicializando elementos do DOM...');

    loginForm = document.getElementById('loginForm');
    usernameInput = document.getElementById('username');
    passwordInput = document.getElementById('password');
    loginBtn = document.querySelector('.login-btn');

    console.log('Elementos encontrados:', {
        loginForm: !!loginForm,
        usernameInput: !!usernameInput,
        passwordInput: !!passwordInput,
        loginBtn: !!loginBtn
    });

    return loginForm && usernameInput && passwordInput;
}

// Mostrar mensagem de erro (estilo boutique)
function showError(message) {
    console.error('❌ Erro:', message);

    // Remover mensagens de erro anteriores
    const existingError = document.querySelector('.error-message');
    if (existingError) {
        existingError.remove();
    }

    // Criar mensagem de erro estilizada
    const errorDiv = document.createElement('div');
    errorDiv.className = 'error-message';
    errorDiv.innerHTML = `
        <div style="
            background: #ffe6e6;
            border: 1px solid #ff4444;
            color: #cc0000;
            padding: 12px 16px;
            border-radius: 8px;
            margin: 15px 0;
            text-align: center;
            font-size: 14px;
            animation: fadeIn 0.3s ease-in;
        ">
            ❌ ${message}
        </div>
    `;

    // Inserir antes do botão de login
    loginBtn.parentNode.insertBefore(errorDiv, loginBtn);

    // Auto-remover após 5 segundos
    setTimeout(() => {
        if (errorDiv.parentNode) {
            errorDiv.remove();
        }
    }, 5000);
}

// Mostrar/ocultar loading no botão
function setLoading(show) {
    console.log('⏳ Loading:', show);
    if (loginBtn) {
        if (show) {
            loginBtn.innerHTML = '<div class="loading-spinner"></div> Entrando...';
            loginBtn.disabled = true;
        } else {
            loginBtn.innerHTML = '🚪 Entrar no Sistema';
            loginBtn.disabled = false;
        }
    }
}

// Mostrar mensagem de sucesso
function showSuccess(message) {
    // Remover mensagens anteriores
    const existingSuccess = document.querySelector('.success-message');
    if (existingSuccess) {
        existingSuccess.remove();
    }

    const successDiv = document.createElement('div');
    successDiv.className = 'success-message';
    successDiv.innerHTML = `
        <div style="
            background: #e6ffe6;
            border: 1px solid #00cc44;
            color: #006600;
            padding: 12px 16px;
            border-radius: 8px;
            margin: 15px 0;
            text-align: center;
            font-size: 14px;
            animation: fadeIn 0.3s ease-in;
        ">
            ✅ ${message}
        </div>
    `;

    loginBtn.parentNode.insertBefore(successDiv, loginBtn);

    setTimeout(() => {
        if (successDiv.parentNode) {
            successDiv.remove();
        }
    }, 3000);
}

// Criar usuário padrão (admin)
// async function createDefaultUser() {
//     if (!confirm('Deseja criar o usuário padrão?\n\n👤 Usuário: admin\n🔑 Senha: admin')) {
//         return;
//     }

//     try {
//         setLoading(true);
//         const response = await fetch(`${API_BASE}/api/create-default-user`, {
//             method: 'POST',
//             headers: {
//                 'Content-Type': 'application/json',
//             }
//         });

//         const result = await response.json();

//         if (response.ok) {
//             showSuccess('Usuário padrão criado com sucesso!');
//             // Preencher automaticamente os campos
//             if (usernameInput) usernameInput.value = 'admin';
//             if (passwordInput) passwordInput.value = 'admin';
//         } else {
//             showError(result.error || result.message || 'Erro ao criar usuário');
//         }

//     } catch (error) {
//         console.error('Erro ao criar usuário:', error);
//         showError('Erro ao criar usuário padrão. Verifique se o servidor está rodando.');
//     } finally {
//         setLoading(false);
//     }
// }

// Fazer login
async function fazerLogin(username, password) {
    try {
        setLoading(true);

        console.log('📤 Enviando requisição de login...', { username });

        const response = await fetch(`${API_BASE}/api/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                nome: username,  // A API espera "nome" no campo de usuário
                password: password
            })
        });

        // Verificar status da resposta
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.detail || `Erro ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();
        console.log('📥 Resposta do login:', data);

        if (data.success) {
            console.log('✅ Login realizado com sucesso!', data);

            // Armazenar dados da sessão
            if (data.session_token) {
                localStorage.setItem('session_token', data.session_token);
            }
            if (data.nome) {
                localStorage.setItem('user_nome', data.nome);
            }
            if (data.user_id) {
                localStorage.setItem('user_id', data.user_id.toString());
            }
            if (data.perfil) {
                localStorage.setItem('user_perfil', data.perfil);
            }

            showSuccess('Login realizado! Redirecionando...');

            // Redirecionar após breve delay para ver a mensagem
            setTimeout(() => {
                // Verificar se estamos na raiz ou em subpasta
                const currentPath = window.location.pathname;
                console.log('📍 Path atual:', currentPath);
                
                if (currentPath.includes('/pages/')) {
                    // Se já está em pages/, vai direto
                    window.location.href = 'dashboard.html';
                } else {
                    // Se está na raiz, vai para pages/
                    window.location.href = 'pages/dashboard.html';
                }
            }, 1000);

        } else {
            showError(data.message || 'Erro ao fazer login');
        }
    } catch (error) {
        console.error('Erro no login:', error);

        // Mensagens de erro específicas
        if (error.message.includes('401')) {
            showError('Credenciais inválidas. Verifique usuário e senha.');
        } else if (error.message.includes('Failed to fetch')) {
            showError('Servidor não encontrado. Verifique se o backend está rodando na porta 8001.');
        } else if (error.message.includes('404')) {
            showError('Endpoint não encontrado. Verifique a URL da API.');
        } else {
            showError(error.message || 'Erro desconhecido ao fazer login');
        }
    } finally {
        setLoading(false);
    }
}

// Verificar conexão com backend
async function verificarBackend() {
    try {
        console.log('🔗 Verificando conexão com backend...');
        const response = await fetch(`${API_BASE}/api/health`);

        if (response.ok) {
            const data = await response.json();
            console.log('✅ Backend conectado:', data);
            return true;
        } else {
            console.warn('⚠️ Backend respondendo com erro:', response.status);
            return false;
        }
    } catch (error) {
        console.error('❌ Erro ao conectar com backend:', error);
        return false;
    }
}

// Handler para submit do formulário
function handleLoginSubmit(e) {
    e.preventDefault();

    const username = usernameInput.value.trim();
    const password = passwordInput.value;

    console.log('📤 Tentando login:', { username });

    if (!username || !password) {
        showError('Por favor, preencha todos os campos');
        return;
    }

    if (username.length < 2) {
        showError('Usuário deve ter pelo menos 2 caracteres');
        return;
    }

    fazerLogin(username, password);
}

// Adicionar estilo CSS para loading
function addLoadingStyles() {
    const style = document.createElement('style');
    style.textContent = `
        .loading-spinner {
            display: inline-block;
            width: 16px;
            height: 16px;
            border: 2px solid #ffffff;
            border-radius: 50%;
            border-top-color: transparent;
            animation: spin 1s ease-in-out infinite;
            margin-right: 8px;
        }
        
        @keyframes spin {
            to { transform: rotate(360deg); }
        }
        
        @keyframes fadeIn {
            from { opacity: 0; transform: translateY(-10px); }
            to { opacity: 1; transform: translateY(0); }
        }
        
        .login-btn:disabled {
            opacity: 0.7;
            cursor: not-allowed;
        }
    `;
    document.head.appendChild(style);
}

// Adicionar botão de criar usuário (para desenvolvimento)
function addCreateUserButton() {
    // Só adicionar em ambiente de desenvolvimento
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
        const createUserBtn = document.createElement('button');
        createUserBtn.type = 'button';
        createUserBtn.innerHTML = '👑 Criar Usuário Admin';
        createUserBtn.className = 'btn btn-secondary btn-block';
        createUserBtn.style.marginTop = '10px';
        createUserBtn.style.background = '#6c757d';
        createUserBtn.style.fontSize = '12px';
        createUserBtn.style.padding = '8px';

        createUserBtn.addEventListener('click', createDefaultUser);

        loginBtn.parentNode.appendChild(createUserBtn);
    }
}

// Verificar se já está logado
function checkExistingSession() {
    const token = localStorage.getItem('session_token');
    const userName = localStorage.getItem('user_nome');

    if (token && userName) {
        console.log('👤 Sessão existente encontrada:', userName);
        // Opcional: redirecionar automaticamente se já estiver logado
        // window.location.href = '../index.html';
    }
}

// Inicializar página
async function initPage() {
    console.log('🚀 Inicializando página de login WebOS Boutique...');

    // Adicionar estilos de loading
    addLoadingStyles();

    if (!initElements()) {
        console.error('❌ Elementos essenciais não encontrados');
        showError('Erro ao carregar a página. Recarregue e tente novamente.');
        return;
    }

    // Adicionar event listeners
    loginForm.addEventListener('submit', handleLoginSubmit);

    // Adicionar botão de criar usuário (apenas desenvolvimento)
    addCreateUserButton();

    // Verificar sessão existente
    checkExistingSession();

    // Verificar backend (silenciosamente)
    const backendOk = await verificarBackend();
    if (!backendOk) {
        showError('⚠️ Servidor offline. Verifique se o backend está rodando na porta 8001.');
    } else {
        console.log('✅ Sistema pronto para login');
    }

    // Focar no campo de usuário
    if (usernameInput) {
        usernameInput.focus();
    }
}

// Inicializar quando o DOM estiver pronto
document.addEventListener('DOMContentLoaded', initPage);

// Exportar funções para uso global (se necessário)
window.auth = {
    fazerLogin,
    createDefaultUser,
    verificarBackend
};