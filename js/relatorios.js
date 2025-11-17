// 📊 SISTEMA DE RELATÓRIOS - WebOS Lingerie
console.log("📊 Inicializando Sistema de Relatórios...");

// Configurações
const API_BASE_URL = 'http://localhost:8001';
const CONFIG = {
    maxRetries: 3,
    timeout: 10000,
    cacheDuration: 5 * 60 * 1000 // 5 minutos
};

// Cache de dados
let dataCache = {
    stats: null,
    sales: null,
    products: null,
    lastUpdate: null
};

// Estado da aplicação
let appState = {
    isLoading: false,
    currentPeriod: 'month',
    charts: {}
};

// ✅ SISTEMA DE NOTIFICAÇÕES AVANÇADO
class NotificationSystem {
    constructor() {
        this.container = this.createContainer();
        this.queue = [];
        this.isShowing = false;
    }

    createContainer() {
        const existing = document.getElementById('notification-container');
        if (existing) return existing;

        const container = document.createElement('div');
        container.id = 'notification-container';
        container.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            z-index: 10000;
            max-width: 400px;
        `;
        document.body.appendChild(container);
        return container;
    }

    show(message, type = 'info', duration = 5000) {
        const notification = {
            id: Date.now() + Math.random(),
            message,
            type,
            duration
        };

        this.queue.push(notification);
        this.processQueue();
    }

    processQueue() {
        if (this.isShowing || this.queue.length === 0) return;

        this.isShowing = true;
        const notification = this.queue.shift();
        this.displayNotification(notification);
    }

    displayNotification(notification) {
        const notificationEl = document.createElement('div');
        notificationEl.className = `notification notification-${notification.type}`;
        notificationEl.style.cssText = `
            background: ${this.getBackgroundColor(notification.type)};
            color: white;
            padding: 12px 16px;
            margin-bottom: 10px;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            display: flex;
            align-items: center;
            gap: 10px;
            animation: slideInRight 0.3s ease;
            cursor: pointer;
        `;

        notificationEl.innerHTML = `
            <span class="notification-icon">${this.getIcon(notification.type)}</span>
            <span class="notification-message">${notification.message}</span>
            <button class="notification-close" style="
                background: none;
                border: none;
                color: inherit;
                cursor: pointer;
                margin-left: auto;
                font-size: 16px;
            ">×</button>
        `;

        const closeBtn = notificationEl.querySelector('.notification-close');
        closeBtn.addEventListener('click', () => this.removeNotification(notificationEl));

        notificationEl.addEventListener('click', (e) => {
            if (!e.target.classList.contains('notification-close')) {
                this.removeNotification(notificationEl);
            }
        });

        this.container.appendChild(notificationEl);

        setTimeout(() => {
            if (notificationEl.parentNode) {
                this.removeNotification(notificationEl);
            }
        }, notification.duration);
    }

    removeNotification(element) {
        element.style.animation = 'slideOutRight 0.3s ease';
        setTimeout(() => {
            if (element.parentNode) {
                element.parentNode.removeChild(element);
            }
            this.isShowing = false;
            this.processQueue();
        }, 300);
    }

    getBackgroundColor(type) {
        const colors = {
            success: '#10b981',
            error: '#ef4444',
            warning: '#f59e0b',
            info: '#3b82f6'
        };
        return colors[type] || colors.info;
    }

    getIcon(type) {
        const icons = {
            success: '✅',
            error: '❌',
            warning: '⚠️',
            info: 'ℹ️'
        };
        return icons[type] || icons.info;
    }
}

// Instância global do sistema de notificações
const notifier = new NotificationSystem();

// ✅ FUNÇÃO SHOWALERT (compatibilidade)
function showAlert(message, type = 'success') {
    notifier.show(message, type);
}

// ✅ INICIALIZAÇÃO ROBUSTA
document.addEventListener('DOMContentLoaded', function() {
    console.log("🚀 Inicializando página de relatórios...");
    
    if (!checkSession()) return;
    
    initializeApplication();
});

function initializeApplication() {
    try {
        setupUserInterface();
        setupEventListeners();
        setupDateFilters();
        initializeCharts();
        loadReports();
        
        console.log("✅ Aplicação inicializada com sucesso");
    } catch (error) {
        console.error('❌ Erro na inicialização:', error);
        showAlert('Erro ao inicializar a aplicação', 'error');
    }
}

// ✅ VERIFICAÇÃO DE SESSÃO
function checkSession() {
    const sessionToken = localStorage.getItem('session_token');
    if (!sessionToken) {
        notifier.show('Sessão expirada. Redirecionando...', 'warning');
        setTimeout(() => {
            window.location.href = '../index.html';
        }, 2000);
        return false;
    }
    
    // Verificar se o token é válido
    try {
        const payload = JSON.parse(atob(sessionToken.split('.')[1]));
        const isExpired = payload.exp * 1000 < Date.now();
        
        if (isExpired) {
            fazerLogout();
            return false;
        }
    } catch (error) {
        console.warn('Token inválido, continuando com verificação básica');
    }
    
    return true;
}

// ✅ CONFIGURAÇÃO DA INTERFACE
function setupUserInterface() {
    // Informações do usuário
    const userName = document.getElementById('userName');
    const userPerfil = document.getElementById('userPerfil');
    
    if (userName) {
        userName.textContent = localStorage.getItem('user_nome') || 'Usuário';
    }
    
    if (userPerfil) {
        userPerfil.textContent = localStorage.getItem('user_perfil') || 'Usuário';
    }

    // Adicionar loading states
    addLoadingStates();
}

function addLoadingStates() {
    const loadingHTML = `
        <div class="loading-overlay" style="
            display: none;
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(255,255,255,0.9);
            border-radius: inherit;
            z-index: 10;
            flex-direction: column;
            justify-content: center;
            align-items: center;
        ">
            <div class="loading-spinner" style="
                width: 30px;
                height: 30px;
                border: 3px solid #f3f3f3;
                border-top: 3px solid #1682b4;
                border-radius: 50%;
                animation: spin 1s linear infinite;
                margin-bottom: 10px;
            "></div>
            <span style="color: #666; font-size: 0.9rem;">Carregando...</span>
        </div>
    `;

    // Adicionar aos cards principais
    const cards = document.querySelectorAll('.card');
    cards.forEach(card => {
        if (!card.querySelector('.loading-overlay')) {
            card.style.position = 'relative';
            card.insertAdjacentHTML('beforeend', loadingHTML);
        }
    });
}

// ✅ CONFIGURAÇÃO DE EVENTOS
function setupEventListeners() {
    // Botões principais
    setupButton('#btnSair', fazerLogout, 'Deseja realmente sair?');
    setupButton('#btnGerarRelatorio', generateFullReport);
    setupButton('#btnImprimir', handlePrint);
    
    // Filtros
    const reportPeriod = document.getElementById('reportPeriod');
    if (reportPeriod) {
        reportPeriod.addEventListener('change', function() {
            appState.currentPeriod = this.value;
            setupDateFilters();
            loadReports();
        });
    }

    // Filtros de data personalizada
    const dateInputs = ['startDate', 'endDate'];
    dateInputs.forEach(id => {
        const element = document.getElementById(id);
        if (element) {
            element.addEventListener('change', debounce(loadReports, 500));
        }
    });

    // Modal de exportação
    setupExportModal();
    
    // Atualização automática a cada 5 minutos
    setInterval(() => {
        if (!appState.isLoading && document.visibilityState === 'visible') {
            loadReports();
        }
    }, 5 * 60 * 1000);
}

function setupButton(selector, handler, confirmMessage = null) {
    const button = document.querySelector(selector);
    if (button) {
        button.addEventListener('click', function(e) {
            e.preventDefault();
            
            if (confirmMessage && !confirm(confirmMessage)) {
                return;
            }
            
            handler.call(this, e);
        });
    }
}

// ✅ CONFIGURAÇÃO DE DATAS
function setupDateFilters() {
    const { startDate, endDate } = calculateDateRange(appState.currentPeriod);
    
    const startInput = document.getElementById('startDate');
    const endInput = document.getElementById('endDate');
    const customGroup = document.getElementById('customDateGroup');
    
    if (startInput) startInput.value = startDate;
    if (endInput) endInput.value = endDate;
    
    // Mostrar/ocultar grupo de datas personalizadas
    if (customGroup) {
        customGroup.classList.toggle('hidden', appState.currentPeriod !== 'custom');
    }
}

function calculateDateRange(period) {
    const today = new Date();
    const start = new Date();
    
    switch (period) {
        case 'today':
            break;
        case 'yesterday':
            start.setDate(today.getDate() - 1);
            break;
        case 'week':
            start.setDate(today.getDate() - 7);
            break;
        case 'month':
            start.setMonth(today.getMonth() - 1);
            break;
        case 'quarter':
            start.setMonth(today.getMonth() - 3);
            break;
        case 'year':
            start.setFullYear(today.getFullYear() - 1);
            break;
        default:
            start.setMonth(today.getMonth() - 1);
    }
    
    return {
        startDate: start.toISOString().split('T')[0],
        endDate: today.toISOString().split('T')[0]
    };
}

// ✅ CARREGAMENTO DE RELATÓRIOS
async function loadReports() {
      if (appState.isLoading) return;
    
    appState.isLoading = true;
    showLoading(true);
    
    try {
        notifier.show('📊 Atualizando relatórios...', 'info');
        
        const [stats, sales, products] = await Promise.allSettled([
            fetchWithRetry('/api/dashboard/estatisticas'),
            fetchWithRetry('/api/vendas?limite=100'), // Aumentei o limite para ter mais dados para gráficos
            fetchWithRetry('/api/produtos?limite=200')
        ]);
        
        // Processar resultados
        const statsData = processApiResult(stats, 'estatísticas');
        const salesData = processApiResult(sales, 'vendas');
        const productsData = processApiResult(products, 'produtos');
        
        // Atualizar interface
        updateDashboard(statsData, salesData, productsData);
        
        // Atualizar cache
        updateCache(statsData, salesData, productsData);
        
        notifier.show('✅ Relatórios atualizados!', 'success');
        
    } catch (error) {
        console.error('❌ Erro crítico:', error);
        handleLoadError(error);
    } finally {
        appState.isLoading = false;
        showLoading(false);
    }
}

async function fetchWithRetry(endpoint, retries = CONFIG.maxRetries) {
    for (let i = 0; i < retries; i++) {
        try {
            const result = await apiCall(endpoint);
            return result;
        } catch (error) {
            if (i === retries - 1) throw error;
            
            if (error.message.includes('Sessão expirada')) {
                throw error;
            }
            
            console.warn(`Tentativa ${i + 1} falhou, tentando novamente...`);
            await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
        }
    }
}

function processApiResult(result, type) {
    if (result.status === 'fulfilled') {
        return result.value;
    } else {
        console.warn(`❌ Falha ao carregar ${type}:`, result.reason);
        
        // Tentar usar cache
        const cached = getCachedData(type);
        if (cached) {
            notifier.show(`⚠️ Usando dados em cache para ${type}`, 'warning');
            return cached;
        }
        
        throw result.reason;
    }
}

function updateDashboard(stats, sales, products) {
    if (stats) updateStatsCards(stats);
    if (sales) updateSalesTable(sales.vendas || []);
    if (products) {
        updateStockTable(products.produtos || []);
        updateCharts(sales, products); // ← AGORA ATUALIZA OS GRÁFICOS TAMBÉM!
    }
}

// ✅ ATUALIZAÇÃO DE CARDS DE ESTATÍSTICAS
function updateStatsCards(stats) {
    const elements = {
        'totalSales': { value: stats.vendasMes || 0, formatter: formatCurrency },
        'salesCount': { value: stats.totalVendas || 0, formatter: (v) => v.toString() },
        'averageTicket': { value: stats.ticketMedio || 0, formatter: formatCurrency },
        'totalProducts': { value: stats.totalProdutos || 0, formatter: (v) => v.toString() },
        'lowStockInfo': { value: stats.estoquesBaixos || 0, formatter: (v) => `${v} produtos` },
        'activeClients': { value: stats.totalClientes || 0, formatter: (v) => v.toString() }
    };
    
    Object.entries(elements).forEach(([id, config]) => {
        const element = document.getElementById(id);
        if (element) {
            // Animação de contagem
            animateValue(element, config.value, config.formatter);
        }
    });
}

function animateValue(element, target, formatter) {
    const current = parseFloat(element.textContent.replace(/[^\d.,]/g, '').replace(',', '.')) || 0;
    const duration = 1000;
    const startTime = performance.now();
    
    function update(currentTime) {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);
        
        // Easing function
        const easeOut = 1 - Math.pow(1 - progress, 3);
        const currentValue = current + (target - current) * easeOut;
        
        element.textContent = formatter(currentValue);
        
        if (progress < 1) {
            requestAnimationFrame(update);
        } else {
            element.textContent = formatter(target);
        }
    }
    
    requestAnimationFrame(update);
}

// ✅ ATUALIZAÇÃO DE TABELAS
function updateSalesTable(vendas) {
    const tbody = document.getElementById('salesTableBody');
    if (!tbody) return;
    
    if (!vendas || vendas.length === 0) {
        tbody.innerHTML = createEmptyState('📭 Nenhuma venda encontrada no período');
        return;
    }
    
    tbody.innerHTML = vendas.map(venda => `
        <tr>
            <td><strong>${venda.numero_venda || 'N/A'}</strong></td>
            <td>${formatDate(venda.data_venda)}</td>
            <td>${venda.cliente || 'Consumidor'}</td>
            <td><span class="badge">${venda.usuario_nome || 'Sistema'}</span></td>
            <td>${venda.total_itens || 0}</td>
            <td><strong>${formatCurrency(venda.total_venda)}</strong></td>
            <td>${createPaymentBadge(venda.forma_pagamento)}</td>
        </tr>
    `).join('');
}

function updateStockTable(produtos) {
    const tbody = document.getElementById('stockTableBody');
    if (!tbody) return;
    
    const produtosCriticos = produtos.filter(p => 
        p.estoque_atual === 0 || p.estoque_atual <= (p.estoque_minimo || 0)
    );
    
    if (produtosCriticos.length === 0) {
        tbody.innerHTML = createEmptyState('✅ Estoque em níveis normais', 'success');
        return;
    }
    
    tbody.innerHTML = produtosCriticos.map(produto => {
        const status = getStockStatus(produto);
        return `
            <tr>
                <td><strong>${produto.nome || 'N/A'}</strong></td>
                <td>${produto.categoria || 'N/A'}</td>
                <td class="${status.class}"><strong>${produto.estoque_atual || 0}</strong></td>
                <td>${produto.estoque_minimo || 0}</td>
                <td>${formatCurrency(produto.preco_custo || 0)}</td>
                <td><strong>${formatCurrency(produto.preco_venda || 0)}</strong></td>
                <td>${createStatusBadge(status)}</td>
            </tr>
        `;
    }).join('');
}

function getStockStatus(produto) {
    if (produto.estoque_atual === 0) {
        return { text: 'ESGOTADO', class: 'critical', type: 'error' };
    } else if (produto.estoque_atual <= (produto.estoque_minimo || 0)) {
        return { text: 'BAIXO', class: 'warning', type: 'warning' };
    }
    return { text: 'NORMAL', class: 'normal', type: 'success' };
}

// ✅ SISTEMA DE CACHE
function updateCache(stats, sales, products) {
    dataCache = {
        stats,
        sales,
        products,
        lastUpdate: Date.now()
    };
}

function getCachedData(type) {
    if (!dataCache.lastUpdate || Date.now() - dataCache.lastUpdate > CONFIG.cacheDuration) {
        return null;
    }
    
    return dataCache[type] || null;
}

function isCacheValid() {
    return dataCache.lastUpdate && Date.now() - dataCache.lastUpdate < CONFIG.cacheDuration;
}

// ✅ MANIPULAÇÃO DE ERROS
function handleLoadError(error) {
    if (error.message.includes('Sessão expirada')) {
        fazerLogout();
        return;
    }
    
    if (isCacheValid()) {
        notifier.show('⚠️ Usando dados em cache', 'warning');
        updateDashboard(dataCache.stats, dataCache.sales, dataCache.products);
    } else {
        notifier.show('❌ Erro ao carregar dados', 'error');
        loadMockData();
    }
}

// ✅ FUNÇÕES AUXILIARES
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

function showLoading(show) {
    const overlays = document.querySelectorAll('.loading-overlay');
    overlays.forEach(overlay => {
        overlay.style.display = show ? 'flex' : 'none';
    });
    
    // Desabilitar/habilitar botões
    const buttons = document.querySelectorAll('button');
    buttons.forEach(button => {
        if (show && !button.disabled) {
            button.setAttribute('data-was-disabled', button.disabled);
            button.disabled = true;
        } else if (!show) {
            button.disabled = button.getAttribute('data-was-disabled') === 'true';
        }
    });
}

function createEmptyState(message, type = 'info') {
    const icons = {
        info: '📭',
        success: '✅',
        warning: '⚠️'
    };
    
    return `
        <tr>
            <td colspan="7" class="empty-state ${type}">
                <div style="text-align: center; padding: 2rem;">
                    <div style="font-size: 2rem; margin-bottom: 0.5rem;">${icons[type]}</div>
                    <p style="color: #666; margin: 0;">${message}</p>
                </div>
            </td>
        </tr>
    `;
}

function createPaymentBadge(paymentMethod) {
    const methods = {
        'dinheiro': { text: '💵 Dinheiro', class: 'cash' },
        'cartao': { text: '💳 Cartão', class: 'card' },
        'pix': { text: '📱 PIX', class: 'pix' },
        'debito': { text: '🏦 Débito', class: 'debit' },
        'credito': { text: '💳 Crédito', class: 'credit' }
    };
    
    const method = methods[paymentMethod] || { text: paymentMethod || 'Outro', class: 'other' };
    
    return `<span class="payment-badge ${method.class}">${method.text}</span>`;
}

function createStatusBadge(status) {
    return `<span class="status-badge ${status.type}">${status.text}</span>`;
}

// ✅ EXPORTAÇÃO E RELATÓRIOS
async function generateFullReport() {
    const btn = document.getElementById('btnGerarRelatorio');
    const originalText = btn?.innerHTML;
    
    if (btn) {
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Gerando...';
        btn.disabled = true;
    }
    
    try {
        await loadReports();
        notifier.show('📄 Relatório gerado com sucesso!', 'success');
    } catch (error) {
        notifier.show('❌ Erro ao gerar relatório', 'error');
    } finally {
        if (btn) {
            btn.innerHTML = originalText;
            btn.disabled = false;
        }
    }
}

function handlePrint() {
    notifier.show('🖨️ Preparando para impressão...', 'info');
    
    // Adicionar estilos específicos para impressão
    const printStyle = document.createElement('style');
    printStyle.innerHTML = `
        @media print {
            .dashboard-header, .page-actions, .actions-section, 
            .card-actions, .btn { display: none !important; }
            .card { break-inside: avoid; box-shadow: none !important; }
            body { background: white !important; }
        }
    `;
    document.head.appendChild(printStyle);
    
    setTimeout(() => {
        window.print();
        notifier.show('📄 Impressão concluída!', 'success');
        
        // Remover estilos após impressão
        setTimeout(() => document.head.removeChild(printStyle), 1000);
    }, 1000);
}

// ✅ API CALL MELHORADA
async function apiCall(endpoint) {
    const sessionToken = localStorage.getItem('session_token');
    
    if (!sessionToken) {
        throw new Error('Sessão expirada');
    }
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), CONFIG.timeout);
    
    try {
        const response = await fetch(`${API_BASE_URL}${endpoint}`, {
            headers: {
                'Authorization': `Bearer ${sessionToken}`,
                'Content-Type': 'application/json',
                'X-Requested-With': 'XMLHttpRequest'
            },
            signal: controller.signal
        });

        clearTimeout(timeoutId);

        if (response.status === 401) {
            localStorage.removeItem('session_token');
            localStorage.removeItem('user_nome');
            localStorage.removeItem('user_perfil');
            throw new Error('Sessão expirada');
        }

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();
        
        // Validar estrutura básica da resposta
        if (data === null || data === undefined) {
            throw new Error('Resposta vazia da API');
        }
        
        return data;
    } catch (error) {
        clearTimeout(timeoutId);
        
        if (error.name === 'AbortError') {
            throw new Error('Timeout: A requisição demorou muito');
        }
        
        if (error.message.includes('Sessão expirada')) {
            throw error;
        }
        
        if (error.message.includes('Failed to fetch')) {
            throw new Error('Erro de conexão. Verifique sua internet.');
        }
        
        throw new Error(`Falha na requisição: ${error.message}`);
    }
}

// ✅ LOGOUT
function fazerLogout() {
    console.log('🚪 Efetuando logout...');
    
    // Limpar dados
    localStorage.removeItem('session_token');
    localStorage.removeItem('user_nome');
    localStorage.removeItem('user_perfil');
    
    notifier.show('👋 Logout realizado com sucesso!', 'info');
    
    setTimeout(() => {
        window.location.href = '../index.html';
    }, 1500);
}

// ✅ DADOS MOCK (FALLBACK)
function loadMockData() {
    console.log('📋 Carregando dados de demonstração...');
    
    const mockStats = {
        vendasMes: 12500.50,
        totalVendas: 145,
        ticketMedio: 86.20,
        totalProdutos: 156,
        estoquesBaixos: 8,
        totalClientes: 45
    };
    
    // Gerar dados de vendas dos últimos 7 dias para o gráfico
    const mockVendas = [];
    const today = new Date();
    
    for (let i = 6; i >= 0; i--) {
        const date = new Date(today);
        date.setDate(today.getDate() - i);
        
        const dailySales = Math.floor(Math.random() * 5) + 2; // 2-6 vendas por dia
        const paymentMethods = ['pix', 'cartao', 'dinheiro', 'debito', 'credito'];
        
        for (let j = 0; j < dailySales; j++) {
            mockVendas.push({
                numero_venda: `V00${mockVendas.length + 1}`,
                data_venda: date.toISOString().split('T')[0],
                cliente: ['Maria Silva', 'Ana Santos', 'João Oliveira', 'Pedro Costa'][j % 4],
                usuario_nome: ['João', 'Pedro', 'Ana'][j % 3],
                total_itens: Math.floor(Math.random() * 3) + 1,
                total_venda: Math.random() * 200 + 50,
                forma_pagamento: paymentMethods[Math.floor(Math.random() * paymentMethods.length)]
            });
        }
    }
    
    const mockProdutos = [
        {
            nome: 'Sutiã com Bojo Preto',
            categoria: 'Sutiãs',
            estoque_atual: 2,
            estoque_minimo: 5,
            preco_custo: 25.00,
            preco_venda: 49.90
        },
        {
            nome: 'Calcinha Fio Dental Rendada',
            categoria: 'Calcinhas', 
            estoque_atual: 0,
            estoque_minimo: 8,
            preco_custo: 8.00,
            preco_venda: 19.90
        },
        {
            nome: 'Conjunto Lingerie Vermelho',
            categoria: 'Conjuntos',
            estoque_atual: 5,
            estoque_minimo: 3,
            preco_custo: 35.00,
            preco_venda: 79.90
        },
        {
            nome: 'Body Rendado Preto',
            categoria: 'Bodies',
            estoque_atual: 3,
            estoque_minimo: 4,
            preco_custo: 20.00,
            preco_venda: 45.90
        },
        {
            nome: 'Sutiã Esportivo',
            categoria: 'Sutiãs',
            estoque_atual: 7,
            estoque_minimo: 5,
            preco_custo: 30.00,
            preco_venda: 65.90
        }
    ];
    
    updateStatsCards(mockStats);
    updateSalesTable(mockVendas);
    updateStockTable(mockProdutos);
    updateCharts({ vendas: mockVendas }, { produtos: mockProdutos }); // ← ATUALIZA GRÁFICOS COM DADOS MOCK
    
    notifier.show('📋 Dados de demonstração carregados', 'info');

}

// ✅ INICIALIZAÇÃO DE GRÁFICOS (ESQUELETO)
function initializeCharts() {
    
        console.log('📈 Inicializando gráficos...');
    
    // Gráfico de Vendas por Período
    const salesCtx = document.getElementById('salesChart');
    if (salesCtx) {
        appState.charts.sales = new Chart(salesCtx, {
            type: 'line',
            data: {
                labels: [],
                datasets: [{
                    label: 'Vendas (R$)',
                    data: [],
                    borderColor: '#1682b4',
                    backgroundColor: 'rgba(22, 130, 180, 0.1)',
                    borderWidth: 3,
                    fill: true,
                    tension: 0.4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    title: {
                        display: true,
                        text: 'Vendas por Dia',
                        font: { size: 16 }
                    },
                    legend: {
                        display: false
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        grid: {
                            color: 'rgba(0,0,0,0.1)'
                        },
                        ticks: {
                            callback: function(value) {
                                return 'R$ ' + value.toLocaleString('pt-BR');
                            }
                        }
                    },
                    x: {
                        grid: {
                            color: 'rgba(0,0,0,0.1)'
                        }
                    }
                }
            }
        });
    }

    // Gráfico de Produtos Mais Vendidos
    const productsCtx = document.getElementById('productsChart');
    if (productsCtx) {
        appState.charts.products = new Chart(productsCtx, {
            type: 'bar',
            data: {
                labels: [],
                datasets: [{
                    label: 'Vendas',
                    data: [],
                    backgroundColor: [
                        '#1682b4', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6',
                        '#06b6d4', '#84cc16', '#f97316', '#ec4899', '#64748b'
                    ],
                    borderWidth: 0,
                    borderRadius: 6
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    title: {
                        display: true,
                        text: 'Top 10 Produtos Mais Vendidos',
                        font: { size: 16 }
                    },
                    legend: {
                        display: false
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        grid: {
                            color: 'rgba(0,0,0,0.1)'
                        },
                        ticks: {
                            precision: 0
                        }
                    },
                    x: {
                        grid: {
                            display: false
                        }
                    }
                }
            }
        });
    }

    // Gráfico de Formas de Pagamento
    const paymentCtx = document.getElementById('paymentChart');
    if (paymentCtx) {
        appState.charts.payment = new Chart(paymentCtx, {
            type: 'doughnut',
            data: {
                labels: [],
                datasets: [{
                    data: [],
                    backgroundColor: [
                        '#10b981', // PIX - Verde
                        '#3b82f6', // Cartão - Azul
                        '#f59e0b', // Dinheiro - Amarelo
                        '#ef4444', // Débito - Vermelho
                        '#8b5cf6'  // Crédito - Roxo
                    ],
                    borderWidth: 2,
                    borderColor: '#fff'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    title: {
                        display: true,
                        text: 'Formas de Pagamento',
                        font: { size: 16 }
                    },
                    legend: {
                        position: 'bottom',
                        labels: {
                            padding: 20,
                            usePointStyle: true
                        }
                    }
                },
                cutout: '60%'
            }
        });
    }
}


function updateCharts(salesData, productsData) {
     console.log('🔄 Atualizando gráficos...');
    
    if (salesData && salesData.vendas) {
        updateSalesChart(salesData.vendas);
        updatePaymentChart(salesData.vendas);
    }
    
    if (productsData && productsData.produtos) {
        updateProductsChart(productsData.produtos);
    }
}

function updateSalesChart(vendas) {
    if (!appState.charts.sales || !vendas.length) return;
    
    // Agrupar vendas por data
    const salesByDate = {};
    vendas.forEach(venda => {
        const date = venda.data_venda ? venda.data_venda.split('T')[0] : new Date().toISOString().split('T')[0];
        salesByDate[date] = (salesByDate[date] || 0) + (venda.total_venda || 0);
    });
    
    // Ordenar por data
    const sortedDates = Object.keys(salesByDate).sort();
    const last7Days = sortedDates.slice(-7); // Últimos 7 dias
    
    const labels = last7Days.map(date => {
        const d = new Date(date);
        return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
    });
    
    const data = last7Days.map(date => salesByDate[date]);
    
    // Atualizar gráfico
    appState.charts.sales.data.labels = labels;
    appState.charts.sales.data.datasets[0].data = data;
    appState.charts.sales.update();
}

function updateProductsChart(produtos) {
    if (!appState.charts.products || !produtos.length) return;
    
    // Simular dados de vendas por produto (em um sistema real, isso viria da API)
    const productsWithSales = produtos
        .map(produto => ({
            nome: produto.nome || 'Produto sem nome',
            vendas: Math.floor(Math.random() * 100) + 1 // Simulação
        }))
        .sort((a, b) => b.vendas - a.vendas)
        .slice(0, 10); // Top 10
    
    const labels = productsWithSales.map(p => {
        const nome = p.nome.length > 20 ? p.nome.substring(0, 20) + '...' : p.nome;
        return nome;
    });
    
    const data = productsWithSales.map(p => p.vendas);
    
    appState.charts.products.data.labels = labels;
    appState.charts.products.data.datasets[0].data = data;
    appState.charts.products.update();
}

function updatePaymentChart(vendas) {
    if (!appState.charts.payment || !vendas.length) return;
    
    // Contar formas de pagamento
    const paymentMethods = {
        'pix': 0,
        'cartao': 0,
        'dinheiro': 0,
        'debito': 0,
        'credito': 0
    };
    
    vendas.forEach(venda => {
        const method = venda.forma_pagamento || 'cartao';
        paymentMethods[method] = (paymentMethods[method] || 0) + 1;
    });
    
    // Filtrar métodos com vendas > 0
    const labels = [];
    const data = [];
    
    Object.entries(paymentMethods).forEach(([method, count]) => {
        if (count > 0) {
            const methodNames = {
                'pix': 'PIX',
                'cartao': 'Cartão',
                'dinheiro': 'Dinheiro',
                'debito': 'Débito',
                'credito': 'Crédito'
            };
            
            labels.push(methodNames[method] || method);
            data.push(count);
        }
    });
    
    appState.charts.payment.data.labels = labels;
    appState.charts.payment.data.datasets[0].data = data;
    appState.charts.payment.update();
}

// ✅ FORMATADORES
function formatCurrency(value) {
    const numberValue = parseFloat(value) || 0;
    return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL'
    }).format(numberValue);
}

function formatDate(dateString) {
    if (!dateString) return 'N/A';
    try {
        const date = new Date(dateString);
        return isNaN(date.getTime()) ? 'Data inválida' : 
               date.toLocaleDateString('pt-BR', { 
                   day: '2-digit', 
                   month: '2-digit', 
                   year: 'numeric' 
               });
    } catch {
        return 'Data inválida';
    }
}

// ✅ CONFIGURAÇÃO DO MODAL DE EXPORTAÇÃO (ESQUELETO)
function setupExportModal() {
    // Implementação futura
}

console.log("🎯 Sistema de relatórios otimizado carregado!");

// ✅ ESTILOS CSS DINÂMICOS
const dynamicStyles = `
    @keyframes slideInRight {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
    }
    
    @keyframes slideOutRight {
        from { transform: translateX(0); opacity: 1; }
        to { transform: translateX(100%); opacity: 0; }
    }
    
    @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
    }
    
    .payment-badge {
        padding: 4px 8px;
        border-radius: 12px;
        font-size: 0.8rem;
        font-weight: 500;
    }
    
    .payment-badge.cash { background: #dcfce7; color: #166534; }
    .payment-badge.card { background: #dbeafe; color: #1e40af; }
    .payment-badge.pix { background: #f0fdfa; color: #0f766e; }
    .payment-badge.debit { background: #fef7cd; color: #854d0e; }
    .payment-badge.credit { background: #f3e8ff; color: #7e22ce; }
    
    .status-badge {
        padding: 4px 8px;
        border-radius: 12px;
        font-size: 0.75rem;
        font-weight: 600;
    }
    
    .status-badge.success { background: #dcfce7; color: #166534; }
    .status-badge.warning { background: #fef3c7; color: #92400e; }
    .status-badge.error { background: #fee2e2; color: #dc2626; }
    
    .empty-state.success td { background: #f0fdf4 !important; }
`;

// filtros

// ✅ SISTEMA DE FILTROS AVANÇADO
class FilterSystem {
    constructor() {
        this.currentFilters = {
            period: 'month',
            startDate: '',
            endDate: '',
            reportType: 'completo',
            category: 'all',
            minValue: '',
            maxValue: ''
        };
        this.init();
    }

    init() {
        this.setupFilterEvents();
        this.setupAdvancedFilters();
        this.setDefaultDates();
    }

    setupFilterEvents() {
        // Filtro de período principal
        const reportPeriod = document.getElementById('reportPeriod');
        if (reportPeriod) {
            reportPeriod.addEventListener('change', (e) => {
                this.currentFilters.period = e.target.value;
                this.handlePeriodChange();
            });
        }

        // Datas personalizadas
        const startDate = document.getElementById('startDate');
        const endDate = document.getElementById('endDate');
        
        if (startDate) {
            startDate.addEventListener('change', (e) => {
                this.currentFilters.startDate = e.target.value;
                this.validateDateRange();
                this.debouncedApplyFilters();
            });
        }

        if (endDate) {
            endDate.addEventListener('change', (e) => {
                this.currentFilters.endDate = e.target.value;
                this.validateDateRange();
                this.debouncedApplyFilters();
            });
        }

        // Tipo de relatório
        const reportType = document.getElementById('reportType');
        if (reportType) {
            reportType.addEventListener('change', (e) => {
                this.currentFilters.reportType = e.target.value;
                this.debouncedApplyFilters();
            });
        }

        // Botão aplicar filtros
        const applyFiltersBtn = document.getElementById('applyFilters');
        if (!applyFiltersBtn) {
            this.createApplyButton();
        }
    }

    setupAdvancedFilters() {
        // Criar filtros avançados se não existirem
        if (!document.getElementById('advancedFilters')) {
            this.createAdvancedFilters();
        }
    }

    createAdvancedFilters() {
        const filtersCard = document.querySelector('.filters-grid').closest('.card');
        
        const advancedFiltersHTML = `
            <div class="advanced-filters" id="advancedFilters" style="
                border-top: 1px solid var(--gray-light);
                margin-top: 1rem;
                padding-top: 1rem;
                display: none;
            ">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;">
                    <h4 style="margin: 0; color: var(--dark);">🎛️ Filtros Avançados</h4>
                    <button id="toggleAdvancedFilters" class="btn btn-outline" style="font-size: 0.8rem;">
                        🔽 Ocultar
                    </button>
                </div>
                
                <div class="advanced-filters-grid" style="
                    display: grid;
                    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
                    gap: 1rem;
                    margin-bottom: 1rem;
                ">
                    <div class="filter-group">
                        <label for="categoryFilter">📁 Categoria</label>
                        <select id="categoryFilter" class="form-select">
                            <option value="all">Todas as categorias</option>
                            <option value="sutias">Sutiãs</option>
                            <option value="calcinhas">Calcinhas</option>
                            <option value="conjuntos">Conjuntos</option>
                            <option value="bodies">Bodies</option>
                            <option value="pijamas">Pijamas</option>
                        </select>
                    </div>
                    
                    <div class="filter-group">
                        <label for="minValue">💰 Valor Mínimo</label>
                        <input type="number" id="minValue" class="form-input" placeholder="R$ 0,00" step="0.01">
                    </div>
                    
                    <div class="filter-group">
                        <label for="maxValue">💰 Valor Máximo</label>
                        <input type="number" id="maxValue" class="form-input" placeholder="R$ 1.000,00" step="0.01">
                    </div>
                    
                    <div class="filter-group">
                        <label for="statusFilter">📊 Status</label>
                        <select id="statusFilter" class="form-select">
                            <option value="all">Todos os status</option>
                            <option value="completed">Concluídas</option>
                            <option value="pending">Pendentes</option>
                            <option value="cancelled">Canceladas</option>
                        </select>
                    </div>
                </div>
                
                <div class="filter-actions" style="display: flex; gap: 0.5rem; justify-content: flex-end;">
                    <button id="clearFilters" class="btn btn-outline" style="font-size: 0.8rem;">
                        🗑️ Limpar Filtros
                    </button>
                    <button id="applyAdvancedFilters" class="btn btn-primary" style="font-size: 0.8rem;">
                        ✅ Aplicar
                    </button>
                </div>
            </div>
        `;

        filtersCard.querySelector('.card-content').insertAdjacentHTML('beforeend', advancedFiltersHTML);
        this.setupAdvancedFilterEvents();
    }

    setupAdvancedFilterEvents() {
        // Toggle filtros avançados
        const toggleBtn = document.getElementById('toggleAdvancedFilters');
        const advancedFilters = document.getElementById('advancedFilters');
        
        if (toggleBtn && advancedFilters) {
            // Adicionar botão para mostrar filtros avançados no header
            this.createAdvancedFiltersToggle();
            
            toggleBtn.addEventListener('click', () => {
                const isVisible = advancedFilters.style.display !== 'none';
                advancedFilters.style.display = isVisible ? 'none' : 'block';
                toggleBtn.innerHTML = isVisible ? '🔼 Mostrar' : '🔽 Ocultar';
            });
        }

        // Filtros avançados
        const categoryFilter = document.getElementById('categoryFilter');
        const minValue = document.getElementById('minValue');
        const maxValue = document.getElementById('maxValue');
        const statusFilter = document.getElementById('statusFilter');
        const clearFilters = document.getElementById('clearFilters');
        const applyAdvanced = document.getElementById('applyAdvancedFilters');

        if (categoryFilter) {
            categoryFilter.addEventListener('change', (e) => {
                this.currentFilters.category = e.target.value;
            });
        }

        if (minValue) {
            minValue.addEventListener('input', this.debounce(() => {
                this.currentFilters.minValue = minValue.value;
            }, 500));
        }

        if (maxValue) {
            maxValue.addEventListener('input', this.debounce(() => {
                this.currentFilters.maxValue = maxValue.value;
            }, 500));
        }

        if (statusFilter) {
            statusFilter.addEventListener('change', (e) => {
                this.currentFilters.status = e.target.value;
            });
        }

        if (clearFilters) {
            clearFilters.addEventListener('click', () => {
                this.clearAllFilters();
            });
        }

        if (applyAdvanced) {
            applyAdvanced.addEventListener('click', () => {
                this.applyFilters();
            });
        }
    }

    createAdvancedFiltersToggle() {
        const cardHeader = document.querySelector('.filters-grid').closest('.card').querySelector('.card-header');
        
        if (!cardHeader.querySelector('#showAdvancedFilters')) {
            const toggleBtn = document.createElement('button');
            toggleBtn.id = 'showAdvancedFilters';
            toggleBtn.className = 'btn btn-outline';
            toggleBtn.innerHTML = '🎛️ Filtros Avançados';
            toggleBtn.style.fontSize = '0.8rem';
            toggleBtn.style.marginLeft = 'auto';
            
            toggleBtn.addEventListener('click', () => {
                const advancedFilters = document.getElementById('advancedFilters');
                const toggleInnerBtn = document.getElementById('toggleAdvancedFilters');
                
                if (advancedFilters.style.display === 'none') {
                    advancedFilters.style.display = 'block';
                    toggleInnerBtn.innerHTML = '🔽 Ocultar';
                }
            });
            
            cardHeader.appendChild(toggleBtn);
        }
    }

    createApplyButton() {
        const filtersGrid = document.querySelector('.filters-grid');
        if (filtersGrid && !filtersGrid.querySelector('#applyFilters')) {
            const applyBtn = document.createElement('button');
            applyBtn.id = 'applyFilters';
            applyBtn.className = 'btn btn-primary';
            applyBtn.innerHTML = '🔍 Aplicar Filtros';
            applyBtn.style.gridColumn = '1 / -1';
            applyBtn.style.justifySelf = 'end';
            applyBtn.style.marginTop = '1rem';
            
            applyBtn.addEventListener('click', () => {
                this.applyFilters();
            });
            
            filtersGrid.appendChild(applyBtn);
        }
    }

    handlePeriodChange() {
        const { startDate, endDate } = this.calculateDateRange(this.currentFilters.period);
        
        this.currentFilters.startDate = startDate;
        this.currentFilters.endDate = endDate;
        
        // Atualizar inputs de data
        const startInput = document.getElementById('startDate');
        const endInput = document.getElementById('endDate');
        const customGroup = document.getElementById('customDateGroup');
        
        if (startInput) startInput.value = startDate;
        if (endInput) endInput.value = endDate;
        
        // Mostrar/ocultar datas personalizadas
        if (customGroup) {
            const isCustom = this.currentFilters.period === 'custom';
            customGroup.classList.toggle('hidden', !isCustom);
            
            // Se não for custom, aplicar filtros automaticamente
            if (!isCustom) {
                this.applyFilters();
            }
        }
    }

    calculateDateRange(period) {
        const today = new Date();
        const start = new Date();
        
        switch (period) {
            case 'today':
                // Hoje
                break;
                
            case 'yesterday':
                start.setDate(today.getDate() - 1);
                break;
                
            case 'week':
                start.setDate(today.getDate() - 7);
                break;
                
            case 'month':
                start.setMonth(today.getMonth() - 1);
                break;
                
            case 'quarter':
                start.setMonth(today.getMonth() - 3);
                break;
                
            case 'year':
                start.setFullYear(today.getFullYear() - 1);
                break;
                
            case 'custom':
                // Usar datas dos inputs
                const startInput = document.getElementById('startDate');
                const endInput = document.getElementById('endDate');
                return {
                    startDate: startInput?.value || '',
                    endDate: endInput?.value || ''
                };
                
            default:
                start.setMonth(today.getMonth() - 1);
        }
        
        return {
            startDate: start.toISOString().split('T')[0],
            endDate: today.toISOString().split('T')[0]
        };
    }

    validateDateRange() {
        const startInput = document.getElementById('startDate');
        const endInput = document.getElementById('endDate');
        
        if (!startInput || !endInput) return;
        
        const startDate = new Date(startInput.value);
        const endDate = new Date(endInput.value);
        
        if (startDate > endDate) {
            notifier.show('❌ Data inicial não pode ser maior que data final', 'error');
            startInput.value = this.currentFilters.startDate; // Reverter
        }
        
        // Validar se não é futuro
        const today = new Date();
        if (endDate > today) {
            endInput.value = today.toISOString().split('T')[0];
            notifier.show('⚠️ Data final ajustada para hoje', 'warning');
        }
    }

    async applyFilters() {
        notifier.show('🔍 Aplicando filtros...', 'info');
        
        // Mostrar loading
        this.showFiltersLoading(true);
        
        try {
            // Construir URL com parâmetros de filtro
            const params = new URLSearchParams();
            
            if (this.currentFilters.period !== 'custom') {
                params.append('start_date', this.currentFilters.startDate);
                params.append('end_date', this.currentFilters.endDate);
            }
            
            if (this.currentFilters.reportType !== 'completo') {
                params.append('tipo', this.currentFilters.reportType);
            }
            
            if (this.currentFilters.category !== 'all') {
                params.append('categoria', this.currentFilters.category);
            }
            
            if (this.currentFilters.minValue) {
                params.append('valor_minimo', this.currentFilters.minValue);
            }
            
            if (this.currentFilters.maxValue) {
                params.append('valor_maximo', this.currentFilters.maxValue);
            }
            
            if (this.currentFilters.status && this.currentFilters.status !== 'all') {
                params.append('status', this.currentFilters.status);
            }
            
            // Atualizar a interface com os filtros aplicados
            await this.loadDataWithFilters(params.toString());
            
            notifier.show('✅ Filtros aplicados com sucesso!', 'success');
            
        } catch (error) {
            console.error('❌ Erro ao aplicar filtros:', error);
            notifier.show('❌ Erro ao aplicar filtros', 'error');
        } finally {
            this.showFiltersLoading(false);
        }
    }

    async loadDataWithFilters(queryParams) {
        // Aqui você faria as chamadas de API com os filtros
        // Por enquanto, vamos simular com os dados existentes
        
        const [stats, sales, products] = await Promise.allSettled([
            fetchWithRetry(`/api/dashboard/estatisticas?${queryParams}`),
            fetchWithRetry(`/api/vendas?${queryParams}&limite=100`),
            fetchWithRetry(`/api/produtos?${queryParams}&limite=200`)
        ]);
        
        const statsData = processApiResult(stats, 'estatísticas');
        const salesData = processApiResult(sales, 'vendas');
        const productsData = processApiResult(products, 'produtos');
        
        updateDashboard(statsData, salesData, productsData);
        updateCache(statsData, salesData, productsData);
    }

    clearAllFilters() {
        // Resetar todos os filtros
        this.currentFilters = {
            period: 'month',
            startDate: '',
            endDate: '',
            reportType: 'completo',
            category: 'all',
            minValue: '',
            maxValue: '',
            status: 'all'
        };
        
        // Resetar UI
        document.getElementById('reportPeriod').value = 'month';
        document.getElementById('reportType').value = 'completo';
        document.getElementById('categoryFilter').value = 'all';
        document.getElementById('minValue').value = '';
        document.getElementById('maxValue').value = '';
        document.getElementById('statusFilter').value = 'all';
        
        this.setDefaultDates();
        this.applyFilters();
        
        notifier.show('🗑️ Filtros limpos!', 'info');
    }

    setDefaultDates() {
        const { startDate, endDate } = this.calculateDateRange('month');
        this.currentFilters.startDate = startDate;
        this.currentFilters.endDate = endDate;
        
        const startInput = document.getElementById('startDate');
        const endInput = document.getElementById('endDate');
        
        if (startInput) startInput.value = startDate;
        if (endInput) endInput.value = endDate;
    }

    showFiltersLoading(show) {
        const applyBtn = document.getElementById('applyFilters');
        const advancedBtn = document.getElementById('applyAdvancedFilters');
        
        [applyBtn, advancedBtn].forEach(btn => {
            if (btn) {
                if (show) {
                    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Aplicando...';
                    btn.disabled = true;
                } else {
                    btn.innerHTML = '✅ Aplicar';
                    btn.disabled = false;
                }
            }
        });
    }

    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    get debouncedApplyFilters() {
        return this.debounce(() => this.applyFilters(), 1000);
    }
}

// ✅ ATUALIZAR A INICIALIZAÇÃO
function initializeApplication() {
    try {
        setupUserInterface();
        setupEventListeners();
        
        // Inicializar sistema de filtros
        window.filterSystem = new FilterSystem();
        
        initializeCharts();
        loadReports();
        
        console.log("✅ Aplicação inicializada com sucesso");
    } catch (error) {
        console.error('❌ Erro na inicialização:', error);
        showAlert('Erro ao inicializar a aplicação', 'error');
    }
}

// ✅ ATUALIZAR setupEventListeners PARA USAR O NOVO SISTEMA
function setupEventListeners() {
    // Botões principais
    setupButton('#btnSair', fazerLogout, 'Deseja realmente sair?');
    setupButton('#btnGerarRelatorio', generateFullReport);
    setupButton('#btnImprimir', handlePrint);
    
    // Botão de exportar (se existir)
    const btnExportar = document.getElementById('btnExportar');
    if (btnExportar) {
        btnExportar.addEventListener('click', function(e) {
            e.preventDefault();
            openExportModal();
        });
    }

    // Atualização automática a cada 5 minutos
    setInterval(() => {
        if (!appState.isLoading && document.visibilityState === 'visible') {
            loadReports();
        }
    }, 5 * 60 * 1000);
}

// ✅ REMOVER A CONFIGURAÇÃO ANTIGA DE DATAS
// (agora feita pelo FilterSystem)

// ✅ CSS PARA MELHORAR A APARÊNCIA DOS FILTROS
const filtersCSS = `
/* ===== ESTILOS PARA SISTEMA DE FILTROS ===== */
.filters-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
    gap: 1.5rem;
    align-items: end;
}

.filter-group {
    margin-bottom: 0;
}

.filter-group label {
    display: block;
    margin-bottom: 0.5rem;
    font-weight: 600;
    color: var(--dark);
    font-size: 0.9rem;
}

.advanced-filters {
    animation: slideDown 0.3s ease;
}

@keyframes slideDown {
    from { opacity: 0; transform: translateY(-10px); }
    to { opacity: 1; transform: translateY(0); }
}

.filter-actions {
    border-top: 1px solid var(--gray-light);
    padding-top: 1rem;
}

/* Indicador de filtros ativos */
.filters-active {
    position: relative;
}

.filters-active::after {
    content: '🎯';
    position: absolute;
    top: -5px;
    right: -5px;
    background: var(--accent);
    color: white;
    border-radius: 50%;
    width: 20px;
    height: 20px;
    font-size: 12px;
    display: flex;
    align-items: center;
    justify-content: center;
}

/* Loading para filtros */
.filters-loading {
    position: relative;
    opacity: 0.7;
    pointer-events: none;
}

.filters-loading::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(255,255,255,0.8);
    z-index: 10;
    border-radius: var(--border-radius);
}

.filters-loading::after {
    content: '🔄';
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    z-index: 11;
    font-size: 1.5rem;
    animation: spin 1s linear infinite;
}

/* Responsividade */
@media (max-width: 768px) {
    .filters-grid {
        grid-template-columns: 1fr;
        gap: 1rem;
    }
    
    .advanced-filters-grid {
        grid-template-columns: 1fr;
    }
    
    .filter-actions {
        flex-direction: column;
    }
    
    .filter-actions .btn {
        width: 100%;
    }
}
`;


// 📤 SISTEMA DE EXPORTAÇÃO AVANÇADO
class ExportSystem {
    constructor() {
        this.exportFormats = {
            csv: { name: 'CSV', icon: '📊', mime: 'text/csv' },
            json: { name: 'JSON', icon: '🔣', mime: 'application/json' },
            pdf: { name: 'PDF', icon: '📄', mime: 'application/pdf' },
            excel: { name: 'Excel', icon: '📈', mime: 'application/vnd.ms-excel' }
        };
        
        this.exportTypes = {
            vendas: { name: 'Vendas', icon: '💰', endpoint: '/api/vendas' },
            estoque: { name: 'Estoque', icon: '📦', endpoint: '/api/produtos' },
            financeiro: { name: 'Financeiro', icon: '💳', endpoint: '/api/financeiro' },
            completo: { name: 'Relatório Completo', icon: '📋', endpoint: '/api/relatorios/completo' }
        };
    }

    // ✅ MODAL DE EXPORTAÇÃO MELHORADO
    openExportModal() {
        const modal = document.getElementById('exportModal');
        if (modal) {
            this.populateExportOptions();
            modal.style.display = 'block';
            modal.classList.add('modal-visible');
        }
    }

    closeExportModal() {
        const modal = document.getElementById('exportModal');
        if (modal) {
            modal.style.display = 'none';
            modal.classList.remove('modal-visible');
        }
    }

    populateExportOptions() {
        // Popular formatos
        const formatSelect = document.getElementById('exportFormat');
        if (formatSelect) {
            formatSelect.innerHTML = Object.entries(this.exportFormats)
                .map(([key, format]) => 
                    `<option value="${key}">${format.icon} ${format.name}</option>`
                ).join('');
        }

        // Popular tipos
        const typeSelect = document.getElementById('exportType');
        if (typeSelect) {
            typeSelect.innerHTML = Object.entries(this.exportTypes)
                .map(([key, type]) => 
                    `<option value="${key}">${type.icon} ${type.name}</option>`
                ).join('');
        }

        // Configurar eventos
        this.setupExportFormEvents();
    }

    setupExportFormEvents() {
        const exportForm = document.getElementById('exportForm');
        if (exportForm) {
            exportForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleExport();
            });
        }

        // Atualizar opções baseadas no formato selecionado
        const formatSelect = document.getElementById('exportFormat');
        if (formatSelect) {
            formatSelect.addEventListener('change', () => {
                this.updateExportOptions();
            });
        }
    }

    updateExportOptions() {
        const format = document.getElementById('exportFormat')?.value;
        const typeSelect = document.getElementById('exportType');
        
        if (!typeSelect) return;

        // Habilitar/desabilitar opções baseadas no formato
        const options = typeSelect.querySelectorAll('option');
        options.forEach(option => {
            if (format === 'pdf' && option.value === 'completo') {
                option.disabled = false;
            } else if (format === 'excel' && option.value === 'financeiro') {
                option.disabled = true;
            } else {
                option.disabled = false;
            }
        });
    }

    // ✅ EXPORTAÇÃO PRINCIPAL
    async handleExport() {
        const format = document.getElementById('exportFormat')?.value;
        const type = document.getElementById('exportType')?.value;
        const period = document.getElementById('exportPeriod')?.value;

        if (!format || !type) {
            notifier.show('❌ Selecione formato e tipo de exportação', 'error');
            return;
        }

        notifier.show(`📤 Exportando ${this.exportTypes[type].name}...`, 'info');

        try {
            const exportData = await this.prepareExportData(type, period);
            
            switch (format) {
                case 'csv':
                    await this.exportToCSV(exportData, type);
                    break;
                case 'json':
                    await this.exportToJSON(exportData, type);
                    break;
                case 'pdf':
                    await this.exportToPDF(exportData, type);
                    break;
                case 'excel':
                    await this.exportToExcel(exportData, type);
                    break;
                default:
                    throw new Error('Formato não suportado');
            }

            this.closeExportModal();
            
        } catch (error) {
            console.error('❌ Erro na exportação:', error);
            notifier.show(`❌ Erro ao exportar: ${error.message}`, 'error');
        }
    }

    // ✅ PREPARAÇÃO DE DADOS
    async prepareExportData(type, period) {
        const baseParams = this.buildExportParams(period);
        
        switch (type) {
            case 'vendas':
                return await this.fetchSalesData(baseParams);
            case 'estoque':
                return await this.fetchStockData(baseParams);
            case 'financeiro':
                return await this.fetchFinancialData(baseParams);
            case 'completo':
                return await this.fetchCompleteReport(baseParams);
            default:
                throw new Error('Tipo de exportação não suportado');
        }
    }

    buildExportParams(period) {
        const params = new URLSearchParams();
        
        // Aplicar filtros atuais
        if (window.filterSystem) {
            const filters = window.filterSystem.currentFilters;
            
            if (filters.period !== 'custom') {
                params.append('start_date', filters.startDate);
                params.append('end_date', filters.endDate);
            }
            
            if (filters.category !== 'all') {
                params.append('categoria', filters.category);
            }
            
            if (filters.minValue) {
                params.append('valor_minimo', filters.minValue);
            }
            
            if (filters.maxValue) {
                params.append('valor_maximo', filters.maxValue);
            }
        }

        // Limite maior para exportação
        params.append('limite', '5000');
        
        return params.toString();
    }

    async fetchSalesData(params) {
        const response = await apiCall(`/api/vendas?${params}`);
        return {
            tipo: 'vendas',
            data_exportacao: new Date().toISOString(),
            total_registros: response.vendas?.length || 0,
            dados: response.vendas || []
        };
    }

    async fetchStockData(params) {
        const response = await apiCall(`/api/produtos?${params}`);
        return {
            tipo: 'estoque',
            data_exportacao: new Date().toISOString(),
            total_registros: response.produtos?.length || 0,
            dados: response.produtos || []
        };
    }

    async fetchFinancialData(params) {
        // Simular dados financeiros - em produção, teria endpoint específico
        const [vendas, produtos] = await Promise.all([
            apiCall(`/api/vendas?${params}`).catch(() => ({ vendas: [] })),
            apiCall(`/api/produtos?${params}`).catch(() => ({ produtos: [] }))
        ]);

        return {
            tipo: 'financeiro',
            data_exportacao: new Date().toISOString(),
            resumo: {
                total_vendas: vendas.vendas?.reduce((sum, v) => sum + (v.total_venda || 0), 0) || 0,
                total_produtos: produtos.produtos?.length || 0,
                ticket_medio: this.calculateAverageTicket(vendas.vendas)
            },
            vendas: vendas.vendas || [],
            produtos: produtos.produtos || []
        };
    }

    async fetchCompleteReport(params) {
        const [stats, vendas, produtos, financeiro] = await Promise.all([
            apiCall('/api/dashboard/estatisticas').catch(() => ({})),
            apiCall(`/api/vendas?${params}`).catch(() => ({ vendas: [] })),
            apiCall(`/api/produtos?${params}`).catch(() => ({ produtos: [] })),
            this.fetchFinancialData(params).catch(() => ({}))
        ]);

        return {
            tipo: 'relatorio_completo',
            data_exportacao: new Date().toISOString(),
            periodo: window.filterSystem?.currentFilters.period || 'personalizado',
            estatisticas: stats,
            resumo_financeiro: financeiro.resumo || {},
            vendas: {
                total: vendas.vendas?.length || 0,
                dados: vendas.vendas || []
            },
            estoque: {
                total: produtos.produtos?.length || 0,
                dados: produtos.produtos || []
            },
            metadados: {
                sistema: 'WebOS Lingerie',
                versao: '1.0.0',
                usuario: localStorage.getItem('user_nome') || 'Usuário'
            }
        };
    }

    // ✅ EXPORTAÇÃO PARA CSV MELHORADA
    async exportToCSV(data, type) {
        if (!data || !data.dados || data.dados.length === 0) {
            throw new Error('Nenhum dado para exportar');
        }

        try {
            const csvContent = this.convertToCSV(data.dados);
            const filename = `${type}_${new Date().toISOString().split('T')[0]}.csv`;
            
            this.downloadFile(csvContent, filename, 'text/csv;charset=utf-8');
            notifier.show(`✅ ${this.exportTypes[type].name} exportado como CSV!`, 'success');
            
        } catch (error) {
            throw new Error(`Falha na exportação CSV: ${error.message}`);
        }
    }

    convertToCSV(data) {
        if (!data.length) return '';
        
        const headers = Object.keys(data[0]);
        const headerRow = headers.map(header => `"${header}"`).join(';');
        
        const dataRows = data.map(item => 
            headers.map(header => {
                const value = item[header];
                return `"${String(value || '').replace(/"/g, '""')}"`;
            }).join(';')
        );
        
        return [headerRow, ...dataRows].join('\n');
    }

    // ✅ EXPORTAÇÃO PARA JSON
    async exportToJSON(data, type) {
        if (!data) {
            throw new Error('Nenhum dado para exportar');
        }

        try {
            const jsonContent = JSON.stringify(data, null, 2);
            const filename = `${type}_${new Date().toISOString().split('T')[0]}.json`;
            
            this.downloadFile(jsonContent, filename, 'application/json');
            notifier.show(`✅ ${this.exportTypes[type].name} exportado como JSON!`, 'success');
            
        } catch (error) {
            throw new Error(`Falha na exportação JSON: ${error.message}`);
        }
    }

    // ✅ EXPORTAÇÃO PARA PDF (USANDO html2canvas E jsPDF)
    async exportToPDF(data, type) {
        notifier.show('📄 Gerando PDF...', 'info');
        
        try {
            // Verificar se as bibliotecas estão disponíveis
            if (typeof jsPDF === 'undefined' || typeof html2canvas === 'undefined') {
                throw new Error('Bibliotecas PDF não carregadas');
            }

            const element = this.getExportElement(type);
            if (!element) {
                // Fallback para impressão
                return this.exportToPDFFallback();
            }

            const canvas = await html2canvas(element, {
                scale: 2,
                useCORS: true,
                logging: false
            });

            const imgData = canvas.toDataURL('image/png');
            const pdf = new jsPDF('p', 'mm', 'a4');
            const imgWidth = 210; // A4 width in mm
            const pageHeight = 295; // A4 height in mm
            const imgHeight = (canvas.height * imgWidth) / canvas.width;
            let heightLeft = imgHeight;
            let position = 0;

            pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
            heightLeft -= pageHeight;

            while (heightLeft >= 0) {
                position = heightLeft - imgHeight;
                pdf.addPage();
                pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
                heightLeft -= pageHeight;
            }

            const filename = `${type}_${new Date().toISOString().split('T')[0]}.pdf`;
            pdf.save(filename);
            
            notifier.show(`✅ ${this.exportTypes[type].name} exportado como PDF!`, 'success');
            
        } catch (error) {
            console.warn('Erro no PDF avançado, usando fallback:', error);
            this.exportToPDFFallback(type);
        }
    }

    getExportElement(type) {
        switch (type) {
            case 'vendas':
                return document.querySelector('.dashboard-section:nth-child(3)'); // Seção de vendas
            case 'estoque':
                return document.querySelector('.dashboard-section:nth-child(4)'); // Seção de estoque
            case 'completo':
                return document.querySelector('.page-content'); // Todo o conteúdo
            default:
                return document.querySelector('.card'); // Primeiro card
        }
    }

    exportToPDFFallback(type) {
        notifier.show('🖨️ Preparando para impressão...', 'info');
        
        // Adicionar estilos de impressão
        const printStyle = document.createElement('style');
        printStyle.innerHTML = `
            @media print {
                .dashboard-header, .page-actions, .actions-section, 
                .card-actions, .btn, .modal { 
                    display: none !important; 
                }
                .card { 
                    break-inside: avoid; 
                    box-shadow: none !important;
                    border: 1px solid #ddd !important;
                }
                body { 
                    background: white !important;
                    font-size: 12px !important;
                }
                .page-title {
                    color: black !important;
                    background: none !important;
                    -webkit-text-fill-color: black !important;
                }
            }
        `;
        document.head.appendChild(printStyle);

        setTimeout(() => {
            window.print();
            notifier.show(`✅ ${this.exportTypes[type].name} pronto para salvar como PDF!`, 'success');
            
            // Remover estilos após impressão
            setTimeout(() => {
                if (printStyle.parentNode) {
                    printStyle.parentNode.removeChild(printStyle);
                }
            }, 1000);
        }, 1000);
    }

    // ✅ EXPORTAÇÃO PARA EXCEL (USANDO SHEETJS)
    async exportToExcel(data, type) {
        notifier.show('📈 Gerando Excel...', 'info');
        
        try {
            if (typeof XLSX === 'undefined') {
                throw new Error('Biblioteca Excel não carregada');
            }

            if (!data.dados || data.dados.length === 0) {
                throw new Error('Nenhum dado para exportar');
            }

            const worksheet = XLSX.utils.json_to_sheet(data.dados);
            const workbook = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(workbook, worksheet, this.exportTypes[type].name);

            // Adicionar metadados
            if (data.resumo) {
                const summaryData = [['RESUMO'], ...Object.entries(data.resumo)];
                const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);
                XLSX.utils.book_append_sheet(workbook, summarySheet, 'Resumo');
            }

            const filename = `${type}_${new Date().toISOString().split('T')[0]}.xlsx`;
            XLSX.writeFile(workbook, filename);
            
            notifier.show(`✅ ${this.exportTypes[type].name} exportado como Excel!`, 'success');
            
        } catch (error) {
            console.warn('Erro no Excel, usando CSV como fallback:', error);
            notifier.show('⚠️ Usando CSV como alternativa', 'warning');
            await this.exportToCSV(data, type);
        }
    }

    // ✅ DOWNLOAD DE ARQUIVO
    downloadFile(content, filename, mimeType) {
        const blob = new Blob([content], { type: mimeType });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        URL.revokeObjectURL(url);
    }

    // ✅ FUNÇÕES AUXILIARES
    calculateAverageTicket(vendas) {
        if (!vendas || vendas.length === 0) return 0;
        
        const total = vendas.reduce((sum, venda) => sum + (venda.total_venda || 0), 0);
        return total / vendas.length;
    }

    // ✅ EXPORTAÇÃO RÁPIDA (SEM MODAL)
    async quickExport(type, format = 'csv') {
        try {
            const exportData = await this.prepareExportData(type, 'current');
            
            switch (format) {
                case 'csv':
                    await this.exportToCSV(exportData, type);
                    break;
                case 'pdf':
                    await this.exportToPDF(exportData, type);
                    break;
                default:
                    await this.exportToCSV(exportData, type);
            }
        } catch (error) {
            notifier.show(`❌ Erro na exportação rápida: ${error.message}`, 'error');
        }
    }
}

// ✅ INICIALIZAR SISTEMA DE EXPORTAÇÃO
let exportSystem;

function initializeExportSystem() {
    exportSystem = new ExportSystem();
    
    // Adicionar botões de exportação rápida
    addQuickExportButtons();
}

function addQuickExportButtons() {
    const pageActions = document.querySelector('.page-actions');
    if (pageActions && !pageActions.querySelector('#quickExport')) {
        const quickExportHTML = `
            <div class="quick-export" style="display: flex; gap: 0.5rem; margin-left: 1rem;">
                <button class="btn btn-outline" id="exportSalesCSV" title="Exportar Vendas CSV">
                    💰 CSV
                </button>
                <button class="btn btn-outline" id="exportStockPDF" title="Exportar Estoque PDF">
                    📦 PDF
                </button>
            </div>
        `;
        pageActions.insertAdjacentHTML('beforeend', quickExportHTML);

        // Event listeners
        document.getElementById('exportSalesCSV')?.addEventListener('click', () => {
            exportSystem.quickExport('vendas', 'csv');
        });

        document.getElementById('exportStockPDF')?.addEventListener('click', () => {
            exportSystem.quickExport('estoque', 'pdf');
        });
    }
}

// ✅ ATUALIZAR FUNÇÕES GLOBAIS
function openExportModal() {
    if (exportSystem) {
        exportSystem.openExportModal();
    }
}

function closeExportModal() {
    if (exportSystem) {
        exportSystem.closeExportModal();
    }
}

// ✅ INICIALIZAR NA APLICAÇÃO
function initializeApplication() {
    try {
        setupUserInterface();
        setupEventListeners();
        
        // Inicializar sistemas
        window.filterSystem = new FilterSystem();
        initializeExportSystem();
        
        initializeCharts();
        loadReports();
        
        console.log("✅ Aplicação inicializada com sucesso");
    } catch (error) {
        console.error('❌ Erro na inicialização:', error);
        notifier.show('Erro ao inicializar a aplicação', 'error');
    }
}

// ✅ CSS PARA MELHORAR A EXPORTAÇÃO
const exportCSS = `
/* ===== ESTILOS PARA SISTEMA DE EXPORTAÇÃO ===== */
.export-options {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 1rem;
    margin-bottom: 1.5rem;
}

.export-preview {
    background: var(--light);
    border-radius: var(--border-radius);
    padding: 1rem;
    margin: 1rem 0;
    border: 1px solid var(--gray-light);
}

.export-preview h4 {
    margin: 0 0 0.5rem 0;
    color: var(--dark);
}

.export-stats {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
    gap: 0.5rem;
    font-size: 0.9rem;
}

.export-stat {
    text-align: center;
    padding: 0.5rem;
    background: white;
    border-radius: var(--border-radius);
    border: 1px solid var(--gray-light);
}

.export-stat .value {
    font-weight: bold;
    color: var(--primary);
    font-size: 1.1rem;
}

.export-stat .label {
    color: var(--gray);
    font-size: 0.8rem;
}

.quick-export {
    border-left: 1px solid var(--gray-light);
    padding-left: 1rem;
}

/* Modal de exportação melhorado */
.modal-visible {
    animation: modalFadeIn 0.3s ease;
}

@keyframes modalFadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
}

.export-loading {
    position: relative;
}

.export-loading::after {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(255,255,255,0.8);
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: inherit;
}

.export-loading::before {
    content: '📤 Exportando...';
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    z-index: 1;
    font-weight: 600;
    color: var(--primary);
}

/* Responsividade */
@media (max-width: 768px) {
    .export-options {
        grid-template-columns: 1fr;
    }
    
    .quick-export {
        border-left: none;
        border-top: 1px solid var(--gray-light);
        padding-left: 0;
        padding-top: 1rem;
        margin-top: 1rem;
        width: 100%;
        justify-content: center;
    }
}
`;



// Adicionar estilos dinâmicos
const styleSheet = document.createElement('style');
styleSheet.textContent = dynamicStyles;
document.head.appendChild(styleSheet);