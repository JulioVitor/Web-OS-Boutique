// scriptVendas.js - Sistema de Vendas Rápidas WebOS Lingerie (VERSÃO COMPLETA)
console.log('🛍️ Inicializando Sistema de Vendas Rápidas...');

const API_BASE = 'http://localhost:8001';

// ✅ SISTEMA DE VENDAS SIMPLIFICADO E FUNCIONAL
class VendasSystem {
    constructor() {
        this.carrinho = [];
        this.produtos = [];
        this.categoriaAtiva = '';
        this.usuarioLogado = null;
        this.init();
    }

    init() {
        console.log('🛍️ Inicializando Sistema de Vendas...');
        
        // Verificar autenticação
        const token = localStorage.getItem('session_token');
        if (!token) {
            alert('Por favor, faça login primeiro.');
            window.location.href = '../index.html';
            return;
        }
        
        this.usuarioLogado = {
            token: token,
            nome: localStorage.getItem('user_nome') || 'Usuário',
            id: localStorage.getItem('user_id') || '1'
        };
        
        console.log('✅ Usuário autenticado:', this.usuarioLogado.nome);
        
        this.carregarProdutos();
        this.setupEventListeners();
        this.setupNavigation();
    }

    setupNavigation() {
        // Configurar botão voltar
        const btnVoltar = document.getElementById('btnVoltar');
        if (btnVoltar) {
            btnVoltar.addEventListener('click', () => {
                this.voltarParaVendas();
            });
        }

        // Configurar botão histórico
        const btnHistorico = document.querySelector('button[onclick*="historico"]');
        if (btnHistorico) {
            btnHistorico.addEventListener('click', (e) => {
                e.preventDefault();
                this.mostrarHistorico();
            });
        }
    }

    voltarParaVendas() {
        // Ocultar histórico se estiver visível
        const historicoContainer = document.querySelector('.historico-container');
        if (historicoContainer) {
            historicoContainer.style.display = 'none';
        }
        
        // Mostrar painel de vendas
        const saleLayout = document.querySelector('.sale-layout');
        if (saleLayout) {
            saleLayout.style.display = 'flex';
        }
        
        console.log('↩️ Voltando para vendas...');
    }

    async mostrarHistorico() {
        console.log('📋 Carregando histórico de vendas...');
        
        // Ocultar painel de vendas
        const saleLayout = document.querySelector('.sale-layout');
        if (saleLayout) {
            saleLayout.style.display = 'none';
        }
        
        // Criar ou mostrar container do histórico
        await this.carregarHistoricoVendas();
    }

    async carregarHistoricoVendas() {
        try {
            const token = localStorage.getItem('session_token');
            if (!token) {
                throw new Error('Sessão expirada');
            }

            // Mostrar loading
            this.mostrarLoadingHistorico();

            const response = await fetch(`${API_BASE}/api/vendas?limite=50`, {
                headers: {
                    'Authorization': token,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error(`Erro ${response.status} ao carregar histórico`);
            }

            const data = await response.json();
            const vendas = data.vendas || data || [];

            this.renderHistoricoVendas(vendas);

        } catch (error) {
            console.error('❌ Erro ao carregar histórico:', error);
            this.renderErroHistorico(error.message);
        }
    }

    mostrarLoadingHistorico() {
        let historicoContainer = document.querySelector('.historico-container');
        
        if (!historicoContainer) {
            historicoContainer = document.createElement('div');
            historicoContainer.className = 'historico-container';
            document.querySelector('.page-content').appendChild(historicoContainer);
        }
        
        historicoContainer.innerHTML = `
            <div class="historico-header">
                <h2>📊 Histórico de Vendas</h2>
                <div class="historico-actions">
                    <button class="btn btn-outline" onclick="vendasSystem.voltarParaVendas()">
                        ← Voltar para Vendas
                    </button>
                    <button class="btn btn-primary" onclick="vendasSystem.carregarHistoricoVendas()">
                        🔄 Atualizar
                    </button>
                </div>
            </div>
            <div class="historico-content">
                <div class="loading-historic">
                    <div class="spinner"></div>
                    <p>Carregando histórico de vendas...</p>
                </div>
            </div>
        `;
        
        historicoContainer.style.display = 'block';
    }

    renderHistoricoVendas(vendas) {
        let historicoContainer = document.querySelector('.historico-container');
        
        if (!historicoContainer) {
            historicoContainer = document.createElement('div');
            historicoContainer.className = 'historico-container';
            document.querySelector('.page-content').appendChild(historicoContainer);
        }

        historicoContainer.innerHTML = `
            <div class="historico-header">
                <h2>📊 Histórico de Vendas</h2>
                <div class="historico-actions">
                    <button class="btn btn-outline" onclick="vendasSystem.voltarParaVendas()">
                        ← Voltar para Vendas
                    </button>
                    <button class="btn btn-primary" onclick="vendasSystem.carregarHistoricoVendas()">
                        🔄 Atualizar
                    </button>
                </div>
            </div>
            <div class="historico-content">
                ${vendas.length === 0 ? this.getTemplateHistoricoVazio() : this.getTemplateListaVendas(vendas)}
            </div>
        `;
        
        historicoContainer.style.display = 'block';
    }

    getTemplateHistoricoVazio() {
        return `
            <div class="empty-state">
                <div class="empty-icon">📊</div>
                <h3>Nenhuma venda encontrada</h3>
                <p>Não há vendas registradas no sistema.</p>
            </div>
        `;
    }

    getTemplateListaVendas(vendas) {

            // ✅ CORREÇÃO: Garantir que o status seja sempre "concluida"
        const vendasCorrigidas = vendas.map(venda => ({
            ...venda,
            status: venda.status || 'concluida'
        }));
        
        return `
            <div class="historico-stats">
                <div class="stat-card">
                    <div class="stat-value">${vendasCorrigidas.length}</div>
                    <div class="stat-label">Total de Vendas</div>
                </div>
                <div class="stat-card">
                    <div class="stat-value">R$ ${this.calcularTotalVendas(vendasCorrigidas).toFixed(2)}</div>
                    <div class="stat-label">Valor Total</div>
                </div>
            </div>
            <div class="vendas-lista">
                ${vendasCorrigidas.map(venda => `
                    <div class="venda-item" onclick="vendasSystem.mostrarDetalhesVenda(${venda.id})">
                        <div class="venda-header">
                            <div class="venda-info">
                                <div class="venda-id">#${venda.id}</div>
                                <div class="venda-cliente">👤 ${venda.cliente || 'Cliente Avulso'}</div>
                                <div class="venda-data">📅 ${this.formatarData(venda.data_venda)}</div>
                            </div>
                            <div class="venda-total">
                                <div class="total-value">R$ ${parseFloat(venda.total_venda || 0).toFixed(2)}</div>
                                <div class="venda-pagamento">${this.formatarMetodoPagamento(venda.forma_pagamento)}</div>
                                <div class="venda-status ${venda.status}">${venda.status === 'concluida' ? 'Concluída' : venda.status}</div>
                            </div>
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
    }

    renderErroHistorico(mensagem) {
        let historicoContainer = document.querySelector('.historico-container');
        
        if (!historicoContainer) {
            historicoContainer = document.createElement('div');
            historicoContainer.className = 'historico-container';
            document.querySelector('.page-content').appendChild(historicoContainer);
        }

        historicoContainer.innerHTML = `
            <div class="historico-header">
                <h2>📊 Histórico de Vendas</h2>
                <div class="historico-actions">
                    <button class="btn btn-outline" onclick="vendasSystem.voltarParaVendas()">
                        ← Voltar para Vendas
                    </button>
                    <button class="btn btn-primary" onclick="vendasSystem.carregarHistoricoVendas()">
                        🔄 Tentar Novamente
                    </button>
                </div>
            </div>
            <div class="historico-content">
                <div class="error-state">
                    <div class="error-icon">❌</div>
                    <h3>Erro ao carregar histórico</h3>
                    <p>${mensagem}</p>
                </div>
            </div>
        `;
        
        historicoContainer.style.display = 'block';
    }

    calcularTotalVendas(vendas) {
        return vendas.reduce((total, venda) => total + parseFloat(venda.total_venda || 0), 0);
    }

    formatarData(dataString) {
        if (!dataString) return 'Data não informada';
        try {
            const data = new Date(dataString);
            return data.toLocaleDateString('pt-BR') + ' ' + data.toLocaleTimeString('pt-BR', {
                hour: '2-digit',
                minute: '2-digit'
            });
        } catch {
            return dataString;
        }
    }

    async mostrarDetalhesVenda(vendaId) {
    try {
        console.log(`🔍 Buscando detalhes da venda ID: ${vendaId}`);
        
        const response = await fetch(`${API_BASE}/api/vendas/${vendaId}`, {
            headers: {
                'Authorization': this.usuarioLogado.token,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            throw new Error(`Erro ${response.status} ao carregar detalhes da venda`);
        }

        const data = await response.json();
        
        // ✅ CORREÇÃO: Acessar o objeto venda dentro da resposta
        const venda = data.venda || data;
        
        console.log('✅ Dados da venda recebidos:', venda);
        
        this.mostrarModalDetalhes(venda);

    } catch (error) {
        console.error('❌ Erro ao carregar detalhes:', error);
        alert('Erro ao carregar detalhes da venda: ' + error.message);
    }
}

mostrarModalDetalhes(venda) {
    // Remover modal existente primeiro
    this.fecharModal();
    
    // ✅ CORREÇÃO: Garantir que os dados estejam sempre disponíveis
    const vendaId = venda.id || vendaId;
    const cliente = venda.cliente || 'Cliente Avulso';
    const dataVenda = venda.data_venda ? this.formatarData(venda.data_venda) : 'Data não informada';
    const metodoPagamento = this.formatarMetodoPagamento(venda.forma_pagamento) || 'Não informado';
    const status = venda.status || 'concluida';
    const totalVenda = parseFloat(venda.total_venda || 0).toFixed(2);
    const itens = venda.itens || [];
    
    console.log('📋 Dados processados para modal:', {
        vendaId, cliente, dataVenda, metodoPagamento, status, totalVenda, itens
    });

    // Criar modal HTML
    const modalHTML = `
        <div class="modal-overlay" id="modalOverlay">
            <div class="modal-content">
                <div class="modal-header">
                    <h3>📋 Detalhes da Venda #${vendaId}</h3>
                    <button class="btn-close" id="btnCloseModal">×</button>
                </div>
                <div class="modal-body">
                    <div class="venda-info-detailed">
                        <div class="info-row">
                            <span class="info-label">Cliente:</span>
                            <span class="info-value">${cliente}</span>
                        </div>
                        <div class="info-row">
                            <span class="info-label">Data:</span>
                            <span class="info-value">${dataVenda}</span>
                        </div>
                        <div class="info-row">
                            <span class="info-label">Pagamento:</span>
                            <span class="info-value">${metodoPagamento}</span>
                        </div>
                        <div class="info-row">
                            <span class="info-label">Status:</span>
                            <span class="info-value status-${status}">
                                ${status === 'concluida' ? '✅ Concluída' : status}
                            </span>
                        </div>
                    </div>
                    
                    <div class="itens-venda">
                        <h4>📦 Itens da Venda</h4>
                        ${itens.length > 0 ? `
                            <div class="itens-lista">
                                ${itens.map(item => `
                                    <div class="item-venda">
                                        <span class="item-nome">${item.produto || 'Produto não identificado'}</span>
                                        <span class="item-quantidade">${item.quantidade || 0}x</span>
                                        <span class="item-preco">R$ ${parseFloat(item.preco_unitario || 0).toFixed(2)}</span>
                                        <span class="item-total">R$ ${parseFloat(item.preco_total || 0).toFixed(2)}</span>
                                    </div>
                                `).join('')}
                            </div>
                        ` : '<p class="no-items">Nenhum item encontrado</p>'}
                    </div>
                    
                    <div class="venda-total-detailed">
                        <div class="total-row">
                            <span>💰 Total da Venda:</span>
                            <span class="total-value">R$ ${totalVenda}</span>
                        </div>
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="btn btn-outline" id="btnFecharModal">Fechar</button>
                    <button class="btn btn-primary" id="btnEditarVenda" onclick="vendasSystem.editarVenda(${vendaId})">
                        ✏️ Editar Venda
                    </button>
                </div>
            </div>
        </div>
    `;

    // Adicionar modal ao documento
    document.body.insertAdjacentHTML('beforeend', modalHTML);
    
    // Configurar eventos após o modal ser adicionado ao DOM
    setTimeout(() => {
        this.configurarEventosModal();
    }, 10);
}

// NOVO MÉTODO PARA CONFIGURAR EVENTOS DO MODAL
configurarEventosModal() {
    const modalOverlay = document.getElementById('modalOverlay');
    const btnCloseModal = document.getElementById('btnCloseModal');
    const btnFecharModal = document.getElementById('btnFecharModal');
    const modalContent = document.querySelector('.modal-content');
    
    if (!modalOverlay) return;
    
    // Função para fechar modal
    const fecharModal = () => {
        modalOverlay.style.opacity = '0';
        setTimeout(() => {
            if (modalOverlay.parentNode) {
                modalOverlay.parentNode.removeChild(modalOverlay);
            }
        }, 300);
    };
    
    // Evento no overlay (fora do modal)
    modalOverlay.addEventListener('click', (e) => {
        if (e.target === modalOverlay) {
            fecharModal();
        }
    });
    
    // Evento no botão fechar (X)
    if (btnCloseModal) {
        btnCloseModal.addEventListener('click', fecharModal);
    }
    
    // Evento no botão fechar
    if (btnFecharModal) {
        btnFecharModal.addEventListener('click', fecharModal);
    }
    
    // Prevenir fechamento quando clicar dentro do modal
    if (modalContent) {
        modalContent.addEventListener('click', (e) => {
            e.stopPropagation();
        });
    }
    
    // Tecla ESC para fechar
    const fecharComESC = (e) => {
        if (e.key === 'Escape') {
            fecharModal();
            document.removeEventListener('keydown', fecharComESC);
        }
    };
    
    document.addEventListener('keydown', fecharComESC);
    
    // Animar entrada do modal
    setTimeout(() => {
        modalOverlay.style.opacity = '1';
    }, 10);
}

// MÉTODO FECHAR MODAL ATUALIZADO
fecharModal() {
    const modal = document.querySelector('.modal-overlay');
    if (modal) {
        modal.style.opacity = '0';
        setTimeout(() => {
            if (modal.parentNode) {
                modal.parentNode.removeChild(modal);
            }
        }, 300);
    }
}

    // MÉTODO COMPLETO PARA EDITAR VENDA
async editarVenda(vendaId) {
    try {
        console.log(`✏️ Iniciando edição da venda ID: ${vendaId}`);
        
        // Fechar modal atual
        this.fecharModal();
        
        // Buscar dados completos da venda
        const response = await fetch(`${API_BASE}/api/vendas/${vendaId}`, {
            headers: {
                'Authorization': this.usuarioLogado.token,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            throw new Error(`Erro ${response.status} ao carregar venda para edição`);
        }

        const data = await response.json();
        const venda = data.venda || data;
        
        console.log('📋 Dados da venda para edição:', venda);
        
        // Mostrar modal de edição
        this.mostrarModalEdicao(venda);
        
    } catch (error) {
        console.error('❌ Erro ao carregar venda para edição:', error);
        alert('Erro ao carregar venda para edição: ' + error.message);
    }
}

// MÉTODO PARA MOSTRAR MODAL DE EDIÇÃO
mostrarModalEdicao(venda) {
    // Remover modal existente primeiro
    this.fecharModal();
    
    const vendaId = venda.id;
    const cliente = venda.cliente || 'Cliente Avulso';
    const metodoPagamento = venda.forma_pagamento || 'dinheiro';
    const observacoes = venda.observacoes || '';
    const itens = venda.itens || [];
    
    // Calcular total atual
    const totalAtual = parseFloat(venda.total_venda || 0).toFixed(2);

    // Criar modal de edição HTML
    const modalHTML = `
        <div class="modal-overlay" id="modalEdicaoOverlay">
            <div class="modal-content modal-edicao">
                <div class="modal-header">
                    <h3>✏️ Editar Venda #${vendaId}</h3>
                    <button class="btn-close" id="btnCloseEdicaoModal">×</button>
                </div>
                <div class="modal-body">
                    <form id="formEditarVenda">
                        <div class="form-group">
                            <label for="editarCliente">👤 Cliente:</label>
                            <input type="text" id="editarCliente" value="${cliente}" class="form-input">
                        </div>
                        
                        <div class="form-group">
                            <label for="editarPagamento">💳 Forma de Pagamento:</label>
                            <select id="editarPagamento" class="form-select">
                                <option value="dinheiro" ${metodoPagamento === 'dinheiro' ? 'selected' : ''}>💵 Dinheiro</option>
                                <option value="cartao_debito" ${metodoPagamento === 'cartao_debito' ? 'selected' : ''}>💳 Cartão Débito</option>
                                <option value="cartao_credito" ${metodoPagamento === 'cartao_credito' ? 'selected' : ''}>💳 Cartão Crédito</option>
                                <option value="pix" ${metodoPagamento === 'pix' ? 'selected' : ''}>📱 PIX</option>
                                <option value="transferencia" ${metodoPagamento === 'transferencia' ? 'selected' : ''}>🏦 Transferência</option>
                            </select>
                        </div>
                        
                        <div class="form-group">
                            <label for="editarObservacoes">📝 Observações:</label>
                            <textarea id="editarObservacoes" class="form-textarea" placeholder="Observações sobre a venda...">${observacoes}</textarea>
                        </div>
                        
                        <div class="itens-edicao">
                            <h4>🛒 Itens da Venda</h4>
                            <div class="itens-lista-edicao" id="itensListaEdicao">
                                ${itens.map((item, index) => `
                                    <div class="item-edicao" data-item-index="${index}">
                                        <div class="item-info">
                                            <div class="item-nome">${item.produto}</div>
                                            <div class="item-controles">
                                                <label>Quantidade:</label>
                                                <input type="number" min="1" value="${item.quantidade}" 
                                                       class="quantidade-input" data-item-index="${index}">
                                            </div>
                                            <div class="item-precos">
                                                <div class="preco-unitario">
                                                    Preço Unitário: R$ ${parseFloat(item.preco_unitario || 0).toFixed(2)}
                                                </div>
                                                <div class="preco-total">
                                                    Total: R$ ${parseFloat(item.preco_total || 0).toFixed(2)}
                                                </div>
                                            </div>
                                        </div>
                                        <button type="button" class="btn-remover-item" onclick="vendasSystem.removerItemEdicao(${index})">
                                            🗑️ Remover
                                        </button>
                                    </div>
                                `).join('')}
                            </div>
                            
                            <div class="adicionar-item-section">
                                <h5>➕ Adicionar Novo Item</h5>
                                <div class="novo-item-form">
                                    <select id="novoProdutoSelect" class="form-select">
                                        <option value="">Selecione um produto...</option>
                                    </select>
                                    <input type="number" id="novaQuantidade" min="1" value="1" placeholder="Qtd" class="quantidade-input">
                                    <button type="button" class="btn-adicionar-item" onclick="vendasSystem.adicionarNovoItem()">
                                        ➕ Adicionar
                                    </button>
                                </div>
                            </div>
                        </div>
                        
                        <div class="resumo-edicao">
                            <div class="total-row">
                                <span>💰 Total da Venda:</span>
                                <span class="total-value" id="totalEdicaoVenda">R$ ${totalAtual}</span>
                            </div>
                        </div>
                    </form>
                </div>
                <div class="modal-footer">
                    <button class="btn btn-outline" id="btnCancelarEdicao">Cancelar</button>
                    <button class="btn btn-danger" onclick="vendasSystem.cancelarVenda(${vendaId})" 
                            ${venda.status === 'cancelada' ? 'disabled' : ''}>
                        ❌ Cancelar Venda
                    </button>
                    <button class="btn btn-primary" id="btnSalvarEdicao" onclick="vendasSystem.salvarEdicaoVenda(${vendaId})">
                    💾 Salvar Alterações
                    </button>
                </div>
            </div>
        </div>
    `;

    // Adicionar modal ao documento
    document.body.insertAdjacentHTML('beforeend', modalHTML);
    
    // Carregar produtos para o select
    this.carregarProdutosParaEdicao();
    
    // Configurar eventos do modal de edição
    setTimeout(() => {
        this.configurarEventosModalEdicao();
        this.atualizarTotalEdicao();
    }, 10);
}

// CARREGAR PRODUTOS PARA O SELECT DE EDIÇÃO
async carregarProdutosParaEdicao() {
    try {
        const response = await fetch(`${API_BASE}/api/produtos/todos`, {
            headers: {
                'Authorization': this.usuarioLogado.token,
                'Content-Type': 'application/json'
            }
        });

        if (response.ok) {
            const data = await response.json();
            const produtos = data.produtos || data || [];
            
            const select = document.getElementById('novoProdutoSelect');
            if (select) {
                // Limpar options existentes (exceto a primeira)
                select.innerHTML = '<option value="">Selecione um produto...</option>';
                
                // Adicionar produtos
                produtos.forEach(produto => {
                    if (produto.ativo !== false) {
                        const option = document.createElement('option');
                        option.value = produto.id;
                        option.textContent = `${produto.nome} - R$ ${parseFloat(produto.preco_venda || 0).toFixed(2)} - Estoque: ${produto.estoque_atual || 0}`;
                        option.dataset.preco = produto.preco_venda;
                        select.appendChild(option);
                    }
                });
            }
        }
    } catch (error) {
        console.error('❌ Erro ao carregar produtos para edição:', error);
    }
}

// CONFIGURAR EVENTOS DO MODAL DE EDIÇÃO
configurarEventosModalEdicao() {
    const modalOverlay = document.getElementById('modalEdicaoOverlay');
    const btnCloseModal = document.getElementById('btnCloseEdicaoModal');
    const btnCancelarEdicao = document.getElementById('btnCancelarEdicao');
    
    if (!modalOverlay) return;
    
    // Função para fechar modal
    const fecharModal = () => {
        modalOverlay.style.opacity = '0';
        setTimeout(() => {
            if (modalOverlay.parentNode) {
                modalOverlay.parentNode.removeChild(modalOverlay);
            }
        }, 300);
    };
    
    // Eventos para fechar
    modalOverlay.addEventListener('click', (e) => {
        if (e.target === modalOverlay) {
            if (confirm('Tem certeza que deseja cancelar a edição? As alterações não salvas serão perdidas.')) {
                fecharModal();
            }
        }
    });
    
    if (btnCloseModal) {
        btnCloseModal.addEventListener('click', () => {
            if (confirm('Tem certeza que deseja cancelar a edição? As alterações não salvas serão perdidas.')) {
                fecharModal();
            }
        });
    }
    
    if (btnCancelarEdicao) {
        btnCancelarEdicao.addEventListener('click', () => {
            if (confirm('Tem certeza que deseja cancelar a edição? As alterações não salvas serão perdidas.')) {
                fecharModal();
            }
        });
    }
    
    // Evento para atualizar totais quando quantidade mudar
    document.querySelectorAll('.quantidade-input').forEach(input => {
        input.addEventListener('change', () => {
            this.atualizarTotalItemEdicao(input.dataset.itemIndex);
            this.atualizarTotalEdicao();
        });
    });
    
    // Tecla ESC para fechar
    const fecharComESC = (e) => {
        if (e.key === 'Escape') {
            if (confirm('Tem certeza que deseja cancelar a edição? As alterações não salvas serão perdidas.')) {
                fecharModal();
                document.removeEventListener('keydown', fecharComESC);
            }
        }
    };
    
    document.addEventListener('keydown', fecharComESC);
    
    // Animar entrada do modal
    setTimeout(() => {
        modalOverlay.style.opacity = '1';
    }, 10);
}

// ATUALIZAR TOTAL DE UM ITEM ESPECÍFICO
atualizarTotalItemEdicao(itemIndex) {
    const itemElement = document.querySelector(`[data-item-index="${itemIndex}"]`);
    if (!itemElement) return;
    
    const quantidadeInput = itemElement.querySelector('.quantidade-input');
    const precoUnitarioElement = itemElement.querySelector('.preco-unitario');
    const precoTotalElement = itemElement.querySelector('.preco-total');
    
    if (quantidadeInput && precoUnitarioElement && precoTotalElement) {
        const quantidade = parseInt(quantidadeInput.value) || 1;
        const precoUnitarioText = precoUnitarioElement.textContent;
        const precoUnitario = parseFloat(precoUnitarioText.replace('Preço Unitário: R$ ', '')) || 0;
        const precoTotal = quantidade * precoUnitario;
        
        precoTotalElement.textContent = `Total: R$ ${precoTotal.toFixed(2)}`;
    }
}

// ATUALIZAR TOTAL GERAL DA VENDA
atualizarTotalEdicao() {
    let totalGeral = 0;
    
    document.querySelectorAll('.item-edicao').forEach(itemElement => {
        const precoTotalElement = itemElement.querySelector('.preco-total');
        if (precoTotalElement) {
            const precoTotalText = precoTotalElement.textContent;
            const precoTotal = parseFloat(precoTotalText.replace('Total: R$ ', '')) || 0;
            totalGeral += precoTotal;
        }
    });
    
    const totalElement = document.getElementById('totalEdicaoVenda');
    if (totalElement) {
        totalElement.textContent = `R$ ${totalGeral.toFixed(2)}`;
    }
    
    return totalGeral;
}

// REMOVER ITEM DA EDIÇÃO
removerItemEdicao(itemIndex) {
    if (confirm('Tem certeza que deseja remover este item da venda?')) {
        const itemElement = document.querySelector(`[data-item-index="${itemIndex}"]`);
        if (itemElement) {
            itemElement.remove();
            this.atualizarTotalEdicao();
        }
    }
}

// ADICIONAR NOVO ITEM À VENDA
adicionarNovoItem() {
    const produtoSelect = document.getElementById('novoProdutoSelect');
    const quantidadeInput = document.getElementById('novaQuantidade');
    
    if (!produtoSelect || !quantidadeInput) return;
    
    const produtoId = produtoSelect.value;
    const produtoTexto = produtoSelect.options[produtoSelect.selectedIndex].text;
    const precoUnitario = parseFloat(produtoSelect.options[produtoSelect.selectedIndex].dataset.preco) || 0;
    const quantidade = parseInt(quantidadeInput.value) || 1;
    
    if (!produtoId) {
        alert('Por favor, selecione um produto.');
        return;
    }
    
    if (quantidade < 1) {
        alert('A quantidade deve ser pelo menos 1.');
        return;
    }
    
    // Extrair nome do produto do texto (removendo preço e estoque)
    const nomeProduto = produtoTexto.split(' - ')[0];
    const precoTotal = quantidade * precoUnitario;
    
    // Criar novo item na lista
    const itensLista = document.getElementById('itensListaEdicao');
    const novoIndex = itensLista.children.length;
    
    const novoItemHTML = `
        <div class="item-edicao" data-item-index="${novoIndex}">
            <div class="item-info">
                <div class="item-nome">${nomeProduto}</div>
                <div class="item-controles">
                    <label>Quantidade:</label>
                    <input type="number" min="1" value="${quantidade}" 
                           class="quantidade-input" data-item-index="${novoIndex}">
                </div>
                <div class="item-precos">
                    <div class="preco-unitario">
                        Preço Unitário: R$ ${precoUnitario.toFixed(2)}
                    </div>
                    <div class="preco-total">
                        Total: R$ ${precoTotal.toFixed(2)}
                    </div>
                </div>
            </div>
            <button type="button" class="btn-remover-item" onclick="vendasSystem.removerItemEdicao(${novoIndex})">
                🗑️ Remover
            </button>
        </div>
    `;
    
    itensLista.insertAdjacentHTML('beforeend', novoItemHTML);
    
    // Configurar evento no novo input
    const novoInput = itensLista.querySelector(`[data-item-index="${novoIndex}"] .quantidade-input`);
    if (novoInput) {
        novoInput.addEventListener('change', () => {
            this.atualizarTotalItemEdicao(novoIndex);
            this.atualizarTotalEdicao();
        });
    }
    
    // Limpar formulário de novo item
    produtoSelect.value = '';
    quantidadeInput.value = '1';
    
    // Atualizar total
    this.atualizarTotalEdicao();
}

// SALVAR EDIÇÃO DA VENDA
// MÉTODO CORRIGIDO PARA SALVAR EDIÇÃO DA VENDA
async salvarEdicaoVenda(vendaId) {
    try {
        console.log(`💾 Salvando edição da venda ID: ${vendaId}`);
        
        // Coletar dados do formulário
        const cliente = document.getElementById('editarCliente')?.value.trim() || 'Cliente Avulso';
        const formaPagamento = document.getElementById('editarPagamento')?.value;
        const observacoes = document.getElementById('editarObservacoes')?.value || '';
        
        if (!formaPagamento) {
            alert('Por favor, selecione a forma de pagamento.');
            return;
        }
        
        // Coletar itens da venda
        const itens = [];
        let itensValidos = false;
        
        document.querySelectorAll('.item-edicao').forEach(itemElement => {
            const nomeProduto = itemElement.querySelector('.item-nome')?.textContent;
            const quantidadeInput = itemElement.querySelector('.quantidade-input');
            const precoUnitarioElement = itemElement.querySelector('.preco-unitario');
            
            if (nomeProduto && quantidadeInput && precoUnitarioElement) {
                const quantidade = parseInt(quantidadeInput.value) || 1;
                const precoUnitarioText = precoUnitarioElement.textContent;
                const precoUnitario = parseFloat(precoUnitarioText.replace('Preço Unitário: R$ ', '')) || 0;
                const precoTotal = quantidade * precoUnitario;
                
                if (quantidade > 0 && precoUnitario > 0) {
                    itens.push({
                        produto: nomeProduto,
                        quantidade: quantidade,
                        preco_Unitario: precoUnitario,
                        preco_Total: precoTotal
                    });
                    itensValidos = true;
                }
            }
        });
        
        if (!itensValidos || itens.length === 0) {
            alert('A venda deve ter pelo menos um item válido (quantidade > 0 e preço > 0).');
            return;
        }
        
        const totalVenda = this.atualizarTotalEdicao();
        
        // Preparar dados para envio
        const vendaData = {
            cliente: cliente,
            itens: itens,
            total_venda: totalVenda,
            forma_pagamento: formaPagamento,
            observacoes: observacoes,
            data_venda: new Date().toISOString().slice(0, 19).replace('T', ' '),
            usuario_id: parseInt(this.usuarioLogado?.id) || 1,
            loja_id: 1,
            status: "concluida"
        };
        
        console.log('💾 Dados da venda editada para envio:', vendaData);
        
        // Mostrar loading
        const btnSalvar = document.getElementById('btnSalvarEdicao');
        const originalText = btnSalvar?.textContent;
        if (btnSalvar) {
            btnSalvar.innerHTML = '⏳ Salvando...';
            btnSalvar.disabled = true;
        }
        
        // Enviar para API - ATUALIZAR VENDA EXISTENTE
        const response = await fetch(`${API_BASE}/api/vendas/${vendaId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': this.usuarioLogado.token
            },
            body: JSON.stringify(vendaData)
        });
        
        if (!response.ok) {
            let errorMessage = `Erro ${response.status}`;
            try {
                const errorData = await response.json();
                errorMessage = errorData.detail || errorData.message || errorMessage;
            } catch (e) {
                // Não foi possível ler o corpo de erro
            }
            throw new Error(errorMessage);
        }
        
        const responseData = await response.json();
        console.log('✅ Venda atualizada com sucesso:', responseData);
        
        alert(`✅ Venda #${vendaId} atualizada com sucesso!`);
        
        // Fechar modal e recarregar histórico
        this.fecharModal();
        this.carregarHistoricoVendas();
        
    } catch (error) {
        console.error('❌ Erro ao salvar edição da venda:', error);
        
        // Mensagem de erro mais amigável
        let errorMessage = error.message;
        if (error.message.includes('Transaction already in progress')) {
            errorMessage = 'Erro de transação no servidor. Tente novamente.';
        } else if (error.message.includes('Estoque insuficiente')) {
            errorMessage = error.message;
        } else if (error.message.includes('Produto não encontrado')) {
            errorMessage = error.message;
        }
        
        alert('Erro ao salvar edição da venda: ' + errorMessage);
        
        // Reativar botão salvar
        const btnSalvar = document.getElementById('btnSalvarEdicao');
        if (btnSalvar) {
            btnSalvar.textContent = '💾 Salvar Alterações';
            btnSalvar.disabled = false;
        }
    }
}

// CANCELAR VENDA
async cancelarVenda(vendaId) {
    if (!confirm('Tem certeza que deseja CANCELAR esta venda? Esta ação não pode ser desfeita.')) {
        return;
    }
    
    try {
        const response = await fetch(`${API_BASE}/api/vendas/${vendaId}/cancelar`, {
            method: 'PUT',
            headers: {
                'Authorization': this.usuarioLogado.token,
                'Content-Type': 'application/json'
            }
        });
        
        if (!response.ok) {
            throw new Error(`Erro ${response.status} ao cancelar venda`);
        }
        
        alert('✅ Venda cancelada com sucesso!');
        
        // Fechar modal e recarregar histórico
        this.fecharModal();
        this.carregarHistoricoVendas();
        
    } catch (error) {
        console.error('❌ Erro ao cancelar venda:', error);
        alert('Erro ao cancelar venda: ' + error.message);
    }
}

    async carregarProdutos() {
        try {
            console.log('📦 Carregando produtos da API...');
            
            const response = await fetch(`${API_BASE}/api/produtos`, {
                headers: {
                    'Authorization': this.usuarioLogado.token,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error(`Erro ${response.status}`);
            }

            const data = await response.json();
            this.produtos = data.produtos || data || [];
            console.log(`✅ ${this.produtos.length} produtos carregados`);

            this.renderProdutos();

        } catch (error) {
            console.error('❌ Erro ao carregar produtos:', error);
            this.carregarProdutosDemo();
        }
    }

    carregarProdutosDemo() {
        console.log('🎭 Carregando produtos de demonstração...');
        this.produtos = [
            {
                id: 1,
                nome: "Sutiã com Bojo Rendado",
                categoria: "sutia",
                preco_venda: 49.90,
                estoque_atual: 15
            },
            {
                id: 2,
                nome: "Calcinha Fio Dental",
                categoria: "calcinha", 
                preco_venda: 19.90,
                estoque_atual: 25
            },
            {
                id: 3,
                nome: "Conjunto Lingerie Vermelho",
                categoria: "conjunto",
                preco_venda: 89.90,
                estoque_atual: 10
            },
            {
                id: 4,
                nome: "Pijama de Seda",
                categoria: "pijama",
                preco_venda: 79.90,
                estoque_atual: 8
            },
            {
                id: 5,
                nome: "Body Rendado Preto",
                categoria: "body",
                preco_venda: 59.90,
                estoque_atual: 12
            },
            {
                id: 6,
                nome: "Calça Jeans Skinny",
                categoria: "calca",
                preco_venda: 99.90,
                estoque_atual: 20
            },
            {
                id: 7,
                nome: "Camiseta Básica",
                categoria: "camiseta",
                preco_venda: 29.90,
                estoque_atual: 30
            },
            {
                id: 8,
                nome: "Camisa Social",
                categoria: "camisa",
                preco_venda: 89.90,
                estoque_atual: 15
            },
            {
                id: 9,
                nome: "Bermuda Jeans",
                categoria: "bermuda",
                preco_venda: 69.90,
                estoque_atual: 18
            },
            {
                id: 10,
                nome: "Shorts Esportivo",
                categoria: "shorts",
                preco_venda: 39.90,
                estoque_atual: 22
            },
            {
                id: 11,
                nome: "Boné Baseball",
                categoria: "bone",
                preco_venda: 24.90,
                estoque_atual: 25
            }
        ];
        this.renderProdutos();
    }

    renderProdutos() {
        const grid = document.getElementById('saleProductsGrid');
        if (!grid) {
            console.error('❌ Elemento saleProductsGrid não encontrado!');
            return;
        }

        const produtosFiltrados = !this.categoriaAtiva 
            ? this.produtos 
            : this.produtos.filter(p => p.categoria === this.categoriaAtiva);

        console.log(`🎯 Exibindo ${produtosFiltrados.length} produtos para categoria: ${this.categoriaAtiva || 'Todas'}`);

        if (produtosFiltrados.length === 0) {
            grid.innerHTML = `
                <div class="empty-products">
                    <div class="empty-icon">📦</div>
                    <p>Nenhum produto encontrado</p>
                    <p>Tente outra categoria</p>
                </div>
            `;
            return;
        }

        grid.innerHTML = produtosFiltrados.map(produto => `
            <div class="product-card" data-produto-id="${produto.id}">
                <div class="product-image">
                    <div class="product-category-icon">
                        ${this.getCategoryIcon(produto.categoria)}
                    </div>
                </div>
                <div class="product-info">
                    <div class="product-name">${produto.nome}</div>
                    <div class="product-category">${this.formatCategory(produto.categoria)}</div>
                    <div class="product-price">R$ ${produto.preco_venda.toFixed(2)}</div>
                    <div class="product-stock ${produto.estoque_atual <= 0 ? 'stock-out' : 'stock-in'}">
                        ${produto.estoque_atual <= 0 ? '❌ Sem Estoque' : `Estoque: ${produto.estoque_atual}`}
                    </div>
                </div>
                <div class="product-actions">
                    <button class="btn-add-cart" onclick="vendasSystem.adicionarAoCarrinho(${produto.id})"
                            ${produto.estoque_atual <= 0 ? 'disabled' : ''}>
                        ${produto.estoque_atual <= 0 ? '❌ Sem Estoque' : '🛒 Adicionar'}
                    </button>
                </div>
            </div>
        `).join('');
    }

    adicionarAoCarrinho(produtoId) {
        const produto = this.produtos.find(p => p.id === produtoId);
        if (!produto) {
            alert('Produto não encontrado!');
            return;
        }
        
        if (produto.estoque_atual <= 0) {
            alert('Produto sem estoque disponível!');
            return;
        }

        const itemExistente = this.carrinho.find(item => item.produto_id === produtoId);
        
        if (itemExistente) {
            if (itemExistente.quantidade < produto.estoque_atual) {
                itemExistente.quantidade++;
                itemExistente.preco_total = itemExistente.quantidade * itemExistente.preco_unitario;
            } else {
                alert('Quantidade máxima em estoque atingida!');
                return;
            }
        } else {
            this.carrinho.push({
                produto_id: produto.id,
                produto: produto.nome,
                quantidade: 1,
                preco_unitario: produto.preco_venda,
                preco_total: produto.preco_venda,
                categoria: produto.categoria
            });
        }
        
        this.atualizarCarrinho();
        console.log('✅ Produto adicionado:', produto.nome);
        
        // Feedback visual
        this.mostrarFeedbackProdutoAdicionado(produto.nome);
    }

    mostrarFeedbackProdutoAdicionado(nomeProduto) {
        // Criar feedback visual temporário
        const feedback = document.createElement('div');
        feedback.className = 'product-added-feedback';
        feedback.innerHTML = `
            <div class="feedback-content">
                <span class="feedback-icon">✅</span>
                <span class="feedback-text">${nomeProduto} adicionado ao carrinho!</span>
            </div>
        `;
        
        document.body.appendChild(feedback);
        
        // Remover após 2 segundos
        setTimeout(() => {
            if (feedback.parentNode) {
                feedback.parentNode.removeChild(feedback);
            }
        }, 2000);
    }

    atualizarCarrinho() {
        const cartContainer = document.getElementById('saleCart');
        if (!cartContainer) return;
        
        if (this.carrinho.length === 0) {
            cartContainer.innerHTML = `
                <div class="empty-cart">
                    <div class="empty-icon">🛒</div>
                    <p>Carrinho vazio</p>
                    <p>Adicione produtos para iniciar uma venda</p>
                </div>
            `;
            return;
        }
        
        const subtotal = this.carrinho.reduce((total, item) => total + item.preco_total, 0);
        
        cartContainer.innerHTML = `
            <div class="cart-items">
                ${this.carrinho.map((item, index) => `
                    <div class="cart-item">
                        <div class="item-info">
                            <div class="item-name">${item.produto}</div>
                            <div class="item-category">${this.formatCategory(item.categoria)}</div>
                            <div class="item-price">R$ ${item.preco_unitario.toFixed(2)}</div>
                        </div>
                        <div class="item-controls">
                            <div class="quantity-controls">
                                <button class="btn-quantity" onclick="vendasSystem.alterarQuantidade(${index}, ${item.quantidade - 1})">-</button>
                                <span class="quantity">${item.quantidade}</span>
                                <button class="btn-quantity" onclick="vendasSystem.alterarQuantidade(${index}, ${item.quantidade + 1})">+</button>
                            </div>
                            <div class="item-total">R$ ${item.preco_total.toFixed(2)}</div>
                            <button class="btn-remove" onclick="vendasSystem.removerDoCarrinho(${index})">🗑️</button>
                        </div>
                    </div>
                `).join('')}
            </div>
            <div class="cart-summary">
                <div class="summary-row">
                    <span>Total:</span>
                    <span class="total-value">R$ ${subtotal.toFixed(2)}</span>
                </div>
                <div class="cart-actions">
                    <button class="btn-clear" onclick="vendasSystem.limparCarrinho()">🗑️ Limpar</button>
                    <button class="btn-checkout" onclick="vendasSystem.finalizarVenda()">💳 Finalizar Venda</button>
                </div>
            </div>
        `;
    }

    removerDoCarrinho(index) {
        this.carrinho.splice(index, 1);
        this.atualizarCarrinho();
    }

    alterarQuantidade(index, novaQuantidade) {
        if (novaQuantidade < 1) {
            this.removerDoCarrinho(index);
            return;
        }
        
        const item = this.carrinho[index];
        const produto = this.produtos.find(p => p.id === item.produto_id);
        
        if (produto && novaQuantidade <= produto.estoque_atual) {
            item.quantidade = novaQuantidade;
            item.preco_total = item.quantidade * item.preco_unitario;
            this.atualizarCarrinho();
        } else {
            alert('Quantidade indisponível em estoque!');
        }
    }

    limparCarrinho() {
        if (this.carrinho.length === 0) return;
        
        if (confirm('Deseja limpar o carrinho?')) {
            this.carrinho = [];
            this.atualizarCarrinho();
        }
    }

    async finalizarVenda() {
        if (this.carrinho.length === 0) {
            alert('Adicione produtos ao carrinho antes de finalizar a venda.');
            return;
        }
        
        const cliente = document.getElementById('saleCustomer')?.value.trim() || 'Cliente Avulso';
        const metodoPagamento = document.getElementById('paymentMethod')?.value;
        
        if (!metodoPagamento) {
            alert('Selecione a forma de pagamento.');
            return;
        }

        try {
            const total = this.carrinho.reduce((sum, item) => sum + item.preco_total, 0);
            
            const vendaData = {
                cliente: cliente,
                itens: this.carrinho.map(item => ({
                    produto: item.produto,
                    quantidade: parseInt(item.quantidade) || 1,
                    preco_Unitario: parseFloat(item.preco_unitario) || 0,
                    preco_Total: parseFloat(item.preco_total) || 0
                })),
                total_venda: parseFloat(total.toFixed(2)),
                forma_pagamento: metodoPagamento,
                observacoes: "Venda rápida - Sistema WebOS",
                data_venda: new Date().toISOString().slice(0, 19).replace('T', ' '),
                usuario_id: parseInt(this.usuarioLogado?.id) || 1,
                loja_id: 1,
                status: "concluida"
            };

            console.log('💾 Dados da venda:', vendaData);
            
            // Mostrar loading
            const btnCheckout = document.querySelector('.btn-checkout');
            const originalText = btnCheckout?.textContent;
            if (btnCheckout) {
                btnCheckout.innerHTML = '⏳ Processando...';
                btnCheckout.disabled = true;
            }
            
            const response = await fetch(`${API_BASE}/api/vendas`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': this.usuarioLogado.token
                },
                body: JSON.stringify(vendaData)
            });
            
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(`Erro ${response.status}: ${errorData.detail || 'Erro desconhecido'}`);
            }
            
            const responseData = await response.json();
            console.log('✅ Venda registrada com sucesso:', responseData);
            
            alert(`✅ Venda registrada com sucesso!\n\nCliente: ${cliente}\nTotal: R$ ${total.toFixed(2)}\nPagamento: ${this.formatarMetodoPagamento(metodoPagamento)}`);
            
            // Limpar carrinho e formulário
            this.carrinho = [];
            if (document.getElementById('saleCustomer')) {
                document.getElementById('saleCustomer').value = '';
            }
            if (document.getElementById('paymentMethod')) {
                document.getElementById('paymentMethod').value = '';
            }
            
            this.atualizarCarrinho();
            
        } catch (error) {
            console.error('❌ Erro ao finalizar venda:', error);
            alert('Erro ao finalizar venda: ' + error.message);
        } finally {
            // Restaurar botão
            const btnCheckout = document.querySelector('.btn-checkout');
            if (btnCheckout) {
                btnCheckout.textContent = '💳 Finalizar Venda';
                btnCheckout.disabled = false;
            }
        }
    }

    setupEventListeners() {
        // Categorias
        document.addEventListener('click', (e) => {
            const categoriaBtn = e.target.closest('.categoria-rapida');
            if (categoriaBtn) {
                const categoria = categoriaBtn.dataset.categoria;
                this.filtrarPorCategoria(categoria);
            }
        });

        // Forma de pagamento
        const paymentMethod = document.getElementById('paymentMethod');
        if (paymentMethod) {
            paymentMethod.addEventListener('change', (e) => {
                this.atualizarCamposPagamento(e.target.value);
            });
        }
    }

    filtrarPorCategoria(categoria) {
        console.log('🎯 Filtrando por categoria:', categoria);
        this.categoriaAtiva = categoria;
        
        // Atualizar botões ativos
        document.querySelectorAll('.categoria-rapida').forEach(btn => {
            btn.classList.remove('active');
        });
        
        if (categoria) {
            const btnAtivo = document.querySelector(`[data-categoria="${categoria}"]`);
            if (btnAtivo) btnAtivo.classList.add('active');
        } else {
            // Se categoria vazia (todos), ativar o botão "Todos"
            const btnTodos = document.querySelector('[data-categoria=""]');
            if (btnTodos) btnTodos.classList.add('active');
        }
        
        this.renderProdutos();
    }

    atualizarCamposPagamento(metodo) {
        // Esta função pode ser expandida para mostrar campos adicionais
        // baseados no método de pagamento selecionado
        console.log('Método de pagamento selecionado:', metodo);
    }

    getCategoryIcon(categoria) {
        const icons = {
            'sutia': '👙', 
            'calcinha': '🩲', 
            'conjunto': '👘', 
            'pijama': '🛌',
            'body': '👗', 
            'calca': '👖', 
            'camiseta': '👕', 
            'camisa': '👔',
            'bermuda': '🩳',
            'shorts': '🩳',
            'bone': '🧢'
        };
        return icons[categoria] || '📦';
    }

    formatCategory(categoria) {
        const categories = {
            'sutia': 'Sutiã', 
            'calcinha': 'Calcinha', 
            'conjunto': 'Conjunto',
            'pijama': 'Pijama', 
            'body': 'Body', 
            'calca': 'Calça',
            'camiseta': 'Camiseta', 
            'camisa': 'Camisa',
            'bermuda': 'Bermuda',
            'shorts': 'Shorts',
            'bone': 'Boné'
        };
        return categories[categoria] || categoria;
    }

    formatarMetodoPagamento(metodo) {
        const metodos = {
            'dinheiro': '💵 Dinheiro',
            'cartao_debito': '💳 Cartão Débito',
            'cartao_credito': '💳 Cartão Crédito',
            'pix': '📱 PIX',
            'transferencia': '🏦 Transferência'
        };
        return metodos[metodo] || metodo;
    }

    // Método para recarregar produtos
    recarregarProdutos() {
        this.carregarProdutos();
    }
}

// ✅ INICIALIZAÇÃO GLOBAL
let vendasSystem;

document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 DOM Carregado - Iniciando sistema de vendas...');
    
    // Inicializar sistema de vendas
    vendasSystem = new VendasSystem();
    window.vendasSystem = vendasSystem;
    
    console.log('✅ Sistema de vendas inicializado com sucesso');
});

// ✅ CSS DINÂMICO PARA MELHORIAS VISUAIS E HISTÓRICO
const dynamicCSS = `
    <style>
        .categorias-rapidas {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(100px, 1fr));
            gap: 10px;
            margin-bottom: 20px;
        }
        
        .categoria-rapida {
            display: flex;
            flex-direction: column;
            align-items: center;
            padding: 10px;
            border: 2px solid #e2e8f0;
            border-radius: 8px;
            background: white;
            cursor: pointer;
            transition: all 0.3s ease;
        }
        
        .categoria-rapida:hover {
            border-color: #3b82f6;
            transform: translateY(-2px);
        }
        
        .categoria-rapida.active {
            border-color: #3b82f6;
            background-color: #3b82f6;
            color: white;
        }
        
        .icone-categoria {
            font-size: 1.5em;
            margin-bottom: 5px;
        }
        
        .sale-products-grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
            gap: 15px;
            max-height: 60vh;
            overflow-y: auto;
            padding: 10px;
        }
        
        .product-card {
            border: 1px solid #e2e8f0;
            border-radius: 8px;
            padding: 15px;
            background: white;
            transition: all 0.3s ease;
        }
        
        .product-card:hover {
            box-shadow: 0 4px 12px rgba(0,0,0,0.1);
            transform: translateY(-2px);
        }
        
        .product-image {
            text-align: center;
            margin-bottom: 10px;
        }
        
        .product-category-icon {
            font-size: 2em;
        }
        
        .product-name {
            font-weight: bold;
            margin-bottom: 5px;
            color: #1e293b;
        }
        
        .product-category {
            color: #64748b;
            font-size: 0.9em;
            margin-bottom: 5px;
        }
        
        .product-price {
            font-weight: bold;
            color: #059669;
            margin-bottom: 5px;
        }
        
        .product-stock {
            font-size: 0.8em;
            margin-bottom: 10px;
        }
        
        .stock-in {
            color: #059669;
        }
        
        .stock-out {
            color: #dc2626;
        }
        
        .btn-add-cart {
            width: 100%;
            padding: 8px 12px;
            background: #3b82f6;
            color: white;
            border: none;
            border-radius: 6px;
            cursor: pointer;
            transition: background 0.3s ease;
        }
        
        .btn-add-cart:hover:not(:disabled) {
            background: #2563eb;
        }
        
        .btn-add-cart:disabled {
            background: #9ca3af;
            cursor: not-allowed;
        }
        
        .cart-item {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 10px;
            border-bottom: 1px solid #e2e8f0;
        }
        
        .item-info {
            flex: 1;
        }
        
        .item-name {
            font-weight: bold;
        }
        
        .item-category {
            color: #64748b;
            font-size: 0.9em;
        }
        
        .item-controls {
            display: flex;
            align-items: center;
            gap: 10px;
        }
        
        .quantity-controls {
            display: flex;
            align-items: center;
            gap: 5px;
        }
        
        .btn-quantity {
            width: 30px;
            height: 30px;
            border: 1px solid #d1d5db;
            background: white;
            border-radius: 4px;
            cursor: pointer;
        }
        
        .quantity {
            padding: 0 10px;
            font-weight: bold;
        }
        
        .item-total {
            font-weight: bold;
            color: #059669;
        }
        
        .btn-remove {
            background: #ef4444;
            color: white;
            border: none;
            border-radius: 4px;
            padding: 5px 8px;
            cursor: pointer;
        }
        
        .cart-summary {
            margin-top: 20px;
            padding-top: 15px;
            border-top: 2px solid #e2e8f0;
        }
        
        .summary-row {
            display: flex;
            justify-content: space-between;
            font-size: 1.2em;
            font-weight: bold;
            margin-bottom: 15px;
        }
        
        .total-value {
            color: #059669;
        }
        
        .cart-actions {
            display: flex;
            gap: 10px;
        }
        
        .btn-clear, .btn-checkout {
            flex: 1;
            padding: 10px;
            border: none;
            border-radius: 6px;
            cursor: pointer;
            font-weight: bold;
        }
        
        .btn-clear {
            background: #f3f4f6;
            color: #374151;
        }
        
        .btn-checkout {
            background: #059669;
            color: white;
        }
        
        .empty-products, .empty-cart {
            text-align: center;
            padding: 40px 20px;
            color: #6b7280;
        }
        
        .empty-icon {
            font-size: 3em;
            margin-bottom: 15px;
        }
        
        .product-added-feedback {
            position: fixed;
            top: 20px;
            right: 20px;
            background: #10b981;
            color: white;
            padding: 12px 20px;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            z-index: 1000;
            animation: slideIn 0.3s ease;
        }
        
        .feedback-content {
            display: flex;
            align-items: center;
            gap: 10px;
        }
        
        @keyframes slideIn {
            from {
                transform: translateX(100%);
                opacity: 0;
            }
            to {
                transform: translateX(0);
                opacity: 1;
            }
        }
        
        .loading {
            text-align: center;
            padding: 40px 20px;
            color: #6b7280;
        }
        
        /* Estilos para o Histórico */
        .historico-container {
            display: none;
            background: white;
            border-radius: 10px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            margin: 20px 0;
            padding: 0;
        }
        
        .historico-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 20px;
            border-bottom: 2px solid #e2e8f0;
        }
        
        .historico-header h2 {
            margin: 0;
            color: #1e293b;
        }
        
        .historico-actions {
            display: flex;
            gap: 10px;
        }
        
        .historico-content {
            padding: 20px;
        }
        
        .historico-stats {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
            gap: 15px;
            margin-bottom: 20px;
        }
        
        .stat-card {
            background: #f8fafc;
            padding: 20px;
            border-radius: 8px;
            text-align: center;
            border-left: 4px solid #3b82f6;
        }
        
        .stat-value {
            font-size: 1.5em;
            font-weight: bold;
            color: #1e293b;
        }
        
        .stat-label {
            color: #64748b;
            font-size: 0.9em;
        }
        
        .vendas-lista {
            max-height: 60vh;
            overflow-y: auto;
        }
        
        .venda-item {
            background: #f8fafc;
            border-radius: 8px;
            padding: 15px;
            margin-bottom: 10px;
            border-left: 4px solid #3b82f6;
            cursor: pointer;
            transition: all 0.3s ease;
        }
        
        .venda-item:hover {
            transform: translateX(5px);
            box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        }
        
        .venda-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
        
        .venda-info {
            flex: 1;
        }
        
        .venda-id {
            font-weight: bold;
            color: #1e293b;
            font-size: 1.1em;
        }
        
        .venda-cliente {
            color: #475569;
            margin: 5px 0;
        }
        
        .venda-data {
            color: #64748b;
            font-size: 0.9em;
        }
        
        .venda-total {
            text-align: right;
        }
        
        .total-value {
            font-size: 1.3em;
            font-weight: bold;
            color: #059669;
        }
        
        .venda-pagamento {
            color: #6b7280;
            font-size: 0.9em;
            margin: 5px 0;
        }
        
        .venda-status {
            padding: 4px 8px;
            border-radius: 4px;
            font-size: 0.8em;
            font-weight: bold;
        }
        
        .venda-status.concluida {
            background: #d1fae5;
            color: #065f46;
        }
        
        .loading-historic {
            text-align: center;
            padding: 40px 20px;
            color: #6b7280;
        }
        
        .spinner {
            border: 4px solid #f3f3f3;
            border-top: 4px solid #3b82f6;
            border-radius: 50%;
            width: 40px;
            height: 40px;
            animation: spin 1s linear infinite;
            margin: 0 auto 15px;
        }
        
        @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }
        
        .empty-state, .error-state {
            text-align: center;
            padding: 60px 20px;
            color: #6b7280;
        }
        
        .empty-icon, .error-icon {
            font-size: 4em;
            margin-bottom: 20px;
        }
        
        .error-state {
            color: #dc2626;
        }
        
        /* Modal de Detalhes */
        .modal-overlay {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0,0,0,0.5);
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 1000;
        }
        
        .modal-content {
            background: white;
            border-radius: 10px;
            max-width: 600px;
            width: 90%;
            max-height: 80vh;
            overflow-y: auto;
        }
        
        .modal-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 20px;
            border-bottom: 1px solid #e2e8f0;
        }
        
        .modal-header h3 {
            margin: 0;
        }
        
        .btn-close {
            background: none;
            border: none;
            font-size: 1.5em;
            cursor: pointer;
            color: #64748b;
        }
        
        .modal-body {
            padding: 20px;
        }
        
        .venda-info-detailed {
            margin-bottom: 20px;
        }
        
        .info-row {
            display: flex;
            justify-content: space-between;
            margin-bottom: 10px;
            padding: 8px 0;
            border-bottom: 1px solid #f1f5f9;
        }
        
        .info-label {
            font-weight: bold;
            color: #475569;
        }
        
        .info-value {
            color: #1e293b;
        }
        
        .itens-venda h4 {
            margin-bottom: 15px;
            color: #1e293b;
        }
        
        .itens-lista {
            margin-bottom: 20px;
        }
        
        .item-venda {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 10px;
            background: #f8fafc;
            border-radius: 6px;
            margin-bottom: 8px;
        }
        
        .item-nome {
            flex: 2;
            font-weight: bold;
        }
        
        .item-quantidade {
            flex: 1;
            text-align: center;
        }
        
        .item-preco {
            flex: 1;
            text-align: right;
        }
        
        .item-total {
            flex: 1;
            text-align: right;
            font-weight: bold;
            color: #059669;
        }
        
        .venda-total-detailed {
            border-top: 2px solid #e2e8f0;
            padding-top: 15px;
        }
        
        .total-row {
            display: flex;
            justify-content: space-between;
            font-size: 1.2em;
            font-weight: bold;
        }
        
        .modal-footer {
            padding: 20px;
            border-top: 1px solid #e2e8f0;
            text-align: right;
        }
    </style>
`;




// Adicionar CSS ao documento
document.head.insertAdjacentHTML('beforeend', dynamicCSS);

console.log("🎯 Sistema de Vendas Rápidas completo e pronto!");