// 📦 SISTEMA DE GERENCIAMENTO DE PRODUTOS - VISUALIZAÇÃO EM GRID
console.log("👗 Inicializando sistema de produtos...");

// Variáveis globais
let produtos = [];
let paginaAtual = 1;
const produtosPorPagina = 12;
const API_BASE = 'http://localhost:8001';

// Objeto principal
const Produtos = {
    init: function() {
        console.log("🚀 Inicializando módulo de produtos...");
        this.criarModalProduto(); 
        this.configurarEventos();
        this.carregarProdutos();
    },

    // ✅ FUNÇÃO: Carregar produtos da API
    async carregarProdutos() {
        try {
            this.mostrarLoading(true);
            
            console.log("📡 Carregando produtos do FastAPI...");
            const token = localStorage.getItem('session_token');
            
            if (!token) {
                console.error('❌ Token não encontrado');
                this.carregarProdutosMock();
                return;
            }

            const response = await fetch(`${API_BASE}/api/produtos?limite=1000`, {
                headers: {
                    'Authorization': token,
                    'Content-Type': 'application/json'
                }
            });

            console.log("📡 Status da resposta:", response.status);

            if (!response.ok) {
                if (response.status === 401) {
                    this.redirectToLogin();
                    return;
                }
                throw new Error(`Erro ${response.status} na API`);
            }

            const data = await response.json();
            console.log("📊 Dados recebidos:", data);

            produtos = Array.isArray(data.produtos) ? data.produtos : [];
            console.log(`✅ ${produtos.length} produtos carregados com sucesso`);
            
            this.renderizarProdutos();
            this.renderizarPaginacao();

        } catch (error) {
            console.error('❌ Erro ao carregar produtos:', error);
            this.carregarProdutosMock();
        } finally {
            this.mostrarLoading(false);
        }
    },

    // ✅ FUNÇÃO: Carregar dados mock
    carregarProdutosMock: function() {
        console.log("🔄 Usando dados mock para demonstração");
        produtos = [
            {
                id: 1,
                nome: "Sutiã com Bojo Rendado",
                codigo_barras: "789123456101",
                categoria: "sutia",
                marca: "Victoria's Secret",
                descricao: "Sutiã confortável com renda delicada",
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
                categoria: "calcinha",
                marca: "Calvin Klein",
                descricao: "Calcinha confortável em algodão",
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
                categoria: "conjunto", 
                marca: "La Perla",
                descricao: "Conjunto sofisticado em renda",
                estoque_atual: 8,
                estoque_minimo: 3,
                preco_custo: 45.00,
                preco_venda: 89.90,
                ativo: true
            },
            {
                id: 4,
                nome: "Calça Jeans Skinny",
                codigo_barras: "789123456104",
                categoria: "calca",
                marca: "Levi's",
                descricao: "Calça jeans modelo skinny",
                estoque_atual: 20,
                estoque_minimo: 5,
                preco_custo: 45.00,
                preco_venda: 89.90,
                ativo: true
            },
            {
                id: 5,
                nome: "Camiseta Básica Algodão",
                codigo_barras: "789123456105",
                categoria: "camiseta",
                marca: "Hering",
                descricao: "Camiseta básica 100% algodão",
                estoque_atual: 30,
                estoque_minimo: 10,
                preco_custo: 12.00,
                preco_venda: 29.90,
                ativo: true
            }
        ];
        
        setTimeout(() => {
            this.renderizarProdutos();
            this.renderizarPaginacao();
            console.log("✅ Dados mock carregados e renderizados");
        }, 1000);
    },

    // ✅ FUNÇÃO: Mostrar loading
    mostrarLoading: function(mostrar) {
        const container = document.getElementById('productsContainer');
        if (!container) return;

        if (mostrar) {
            container.innerHTML = `
                <div class="loading-container">
                    <div class="loading-spinner"></div>
                    <p>Carregando produtos...</p>
                </div>
            `;
        }
    },

    // ✅ FUNÇÃO: Renderizar produtos na grid
    renderizarProdutos: function() {
        const container = document.getElementById('productsContainer');
        if (!container) {
            console.error('❌ Container de produtos não encontrado');
            return;
        }

        const produtosPaginados = this.getProdutosPaginados();
        
        if (!Array.isArray(produtosPaginados) || produtosPaginados.length === 0) {
            container.innerHTML = this.getEmptyStateHTML();
            return;
        }

        let html = `
            <div class="filters-lingerie">
                <div class="filter-group">
                    <input type="text" id="searchInput" placeholder="🔍 Buscar produto..." class="form-input">
                </div>
                <div class="filter-group">
                    <select id="filterCategoria" class="form-select">
                        <option value="">Todas as categorias</option>
                        <option value="sutia">Sutiã</option>
                        <option value="calcinha">Calcinha</option>
                        <option value="conjunto">Conjunto</option>
                        <option value="body">Body</option>
                        <option value="pijama">Pijama</option>
                        <option value="calca">Calça</option>
                        <option value="camiseta">Camiseta</option>
                        <option value="camisa">Camisa</option>
                        <option value="bermuda">Bermuda</option>
                        <option value="shorts">Shorts</option>
                        <option value="bone">Boné</option>
                        <option value="regata">Regata</option>
                        <option value="outros">Outros</option>
                    </select>
                </div>
                <div class="filter-group">
                    <select id="filterEstoque" class="form-select">
                        <option value="">Todos os estoques</option>
                        <option value="normal">Estoque Normal</option>
                        <option value="baixo">Estoque Baixo</option>
                        <option value="critico">Estoque Crítico</option>
                    </select>
                </div>
            </div>

            <div class="products-grid">
        `;

        produtosPaginados.forEach(produto => {
            if (!produto || !produto.id) return;

            const categoriaClass = this.getCategoriaClass(produto.categoria);
            const categoriaNome = this.getCategoriaNome(produto.categoria);
            const estoqueStatus = this.getEstoqueStatus(produto.estoque_atual, produto.estoque_minimo);
            const estoqueClass = this.getEstoqueClass(produto.estoque_atual, produto.estoque_minimo);
            const icone = this.getCategoriaIcon(produto.categoria);

            html += `
                <div class="produto-card" data-id="${produto.id}">
                    <div class="produto-imagem">
                        ${icone}
                    </div>
                    <div class="produto-info">
                        <div class="produto-header">
                            <h3 class="produto-titulo">${produto.nome || 'Sem nome'}</h3>
                            <span class="badge-categoria ${categoriaClass}">${categoriaNome}</span>
                        </div>
                        
                        <div class="produto-detalhes">
                            ${produto.marca ? `<div><strong>Marca:</strong> ${produto.marca}</div>` : ''}
                            ${produto.descricao ? `<div class="produto-descricao">${produto.descricao}</div>` : ''}
                        </div>

                        <div class="produto-estoque">
                            <span class="estoque-info ${estoqueClass}">
                                ${estoqueStatus}
                            </span>
                        </div>

                        <div class="produto-footer">
                            <div class="produto-preco">
                                R$ ${(produto.preco_venda || 0).toFixed(2)}
                            </div>
                            <div class="produto-actions">
                                <button class="btn-action btn-edit" onclick="Produtos.editarProduto(${produto.id})" title="Editar">
                                    ✏️
                                </button>
                                <button class="btn-action btn-delete" onclick="Produtos.excluirProduto(${produto.id})" title="Excluir">
                                    🗑️
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        });

        html += `</div>`;
        container.innerHTML = html;

        // Reconfigurar eventos após renderizar
        this.configurarEventosFiltros();
    },

    // ✅ FUNÇÕES AUXILIARES PARA RENDERIZAÇÃO
    getCategoriaClass: function(categoria) {
        const classes = {
            'sutia': 'badge-sutia',
            'calcinha': 'badge-calcinha', 
            'conjunto': 'badge-conjunto',
            'body': 'badge-body',
            'pijama': 'badge-pijama',
            'calca': 'badge-calca',
            'camiseta': 'badge-camiseta',
            'camisa': 'badge-camisa',
            'bermuda': 'badge-bermuda',
            'shorts': 'badge-shorts',
            'bone': 'badge-bone',
            'regata': 'badge-regata'
        };
        return classes[categoria] || 'badge-outros';
    },

    getCategoriaNome: function(categoria) {
        const nomes = {
            'sutia': 'Sutiã',
            'calcinha': 'Calcinha',
            'conjunto': 'Conjunto',
            'body': 'Body',
            'pijama': 'Pijama', 
            'calca': 'Calça',
            'camiseta': 'Camiseta',
            'camisa': 'Camisa',
            'bermuda': 'Bermuda',
            'shorts': 'Shorts',
            'bone': 'Boné',
            'regata': 'Regata'
        };
        return nomes[categoria] || 'Outros';
    },

    getCategoriaIcon: function(categoria) {
        const icones = {
            'sutia': '👙',
            'calcinha': '🩲',
            'conjunto': '👘',
            'body': '🩱',
            'pijama': '🌙',
            'calca': '👖',
            'camiseta': '👕',
            'camisa': '👔',
            'bermuda': '🩳',
            'shorts': '🩳',
            'bone': '🧢',
            'regata': '👚'
        };
        return icones[categoria] || '📦';
    },

    getEstoqueStatus: function(estoqueAtual, estoqueMinimo) {
        if (estoqueAtual === 0) return 'Estoque Crítico';
        if (estoqueAtual <= estoqueMinimo) return `Estoque Baixo (${estoqueAtual})`;
        return `Em Estoque (${estoqueAtual})`;
    },

    getEstoqueClass: function(estoqueAtual, estoqueMinimo) {
        if (estoqueAtual === 0) return 'critical';
        if (estoqueAtual <= estoqueMinimo) return 'warning';
        return 'normal';
    },

    getEmptyStateHTML: function() {
        return `
            <div class="empty-state">
                <div style="font-size: 4rem; margin-bottom: 1rem;">👗</div>
                <h3>Nenhum produto encontrado</h3>
                <p>Não há produtos cadastrados ou os filtros não retornaram resultados.</p>
                <button class="btn btn-primary" onclick="Produtos.abrirModalProduto()">
                    👗 Adicionar Primeiro Produto
                </button>
            </div>
        `;
    },

    getProdutosPaginados: function() {
        const startIndex = (paginaAtual - 1) * produtosPorPagina;
        const endIndex = startIndex + produtosPorPagina;
        return produtos.slice(startIndex, endIndex);
    },

    // ✅ FUNÇÃO: Renderizar paginação
    renderizarPaginacao: function() {
        const container = document.getElementById('productsPagination');
        if (!container) return;

        const totalPaginas = Math.ceil(produtos.length / produtosPorPagina);
        
        if (totalPaginas <= 1) {
            container.innerHTML = '';
            return;
        }

        let html = `<div class="pagination">`;
        
        // Botão anterior
        if (paginaAtual > 1) {
            html += `<button class="btn btn-outline" onclick="Produtos.mudarPagina(${paginaAtual - 1})">‹ Anterior</button>`;
        }

        // Páginas
        html += `<span class="pagination-current">Página ${paginaAtual} de ${totalPaginas}</span>`;

        // Botão próximo
        if (paginaAtual < totalPaginas) {
            html += `<button class="btn btn-outline" onclick="Produtos.mudarPagina(${paginaAtual + 1})">Próximo ›</button>`;
        }

        html += `</div>`;
        container.innerHTML = html;
    },

    mudarPagina: function(pagina) {
        paginaAtual = pagina;
        this.renderizarProdutos();
        this.renderizarPaginacao();
        window.scrollTo({ top: 0, behavior: 'smooth' });
    },

    // ✅ FUNÇÃO: Configurar eventos
    configurarEventos: function() {
        // Botão novo produto
        const newProductBtn = document.getElementById('newProductBtn');
        if (newProductBtn) {
            newProductBtn.addEventListener('click', () => this.abrirModalProduto());
        }
    },

    configurarEventosFiltros: function() {
        const searchInput = document.getElementById('searchInput');
        const filterCategoria = document.getElementById('filterCategoria');
        const filterEstoque = document.getElementById('filterEstoque');

        if (searchInput) searchInput.addEventListener('input', () => this.filtrarProdutos());
        if (filterCategoria) filterCategoria.addEventListener('change', () => this.filtrarProdutos());
        if (filterEstoque) filterEstoque.addEventListener('change', () => this.filtrarProdutos());
    },

    filtrarProdutos: function() {
        const searchTerm = document.getElementById('searchInput')?.value.toLowerCase() || '';
        const categoria = document.getElementById('filterCategoria')?.value || '';
        const estoque = document.getElementById('filterEstoque')?.value || '';

        const produtosFiltrados = produtos.filter(produto => {
            const matchSearch = !searchTerm || 
                produto.nome.toLowerCase().includes(searchTerm) ||
                (produto.marca && produto.marca.toLowerCase().includes(searchTerm)) ||
                (produto.descricao && produto.descricao.toLowerCase().includes(searchTerm));

            const matchCategoria = !categoria || produto.categoria === categoria;
            
            let matchEstoque = true;
            if (estoque === 'normal') {
                matchEstoque = produto.estoque_atual > produto.estoque_minimo;
            } else if (estoque === 'baixo') {
                matchEstoque = produto.estoque_atual > 0 && produto.estoque_atual <= produto.estoque_minimo;
            } else if (estoque === 'critico') {
                matchEstoque = produto.estoque_atual === 0;
            }

            return matchSearch && matchCategoria && matchEstoque;
        });

        this.renderizarProdutosFiltrados(produtosFiltrados);
    },

    renderizarProdutosFiltrados: function(produtosFiltrados) {
        const grid = document.querySelector('.products-grid');
        if (!grid) return;

        if (!Array.isArray(produtosFiltrados) || produtosFiltrados.length === 0) {
            grid.innerHTML = this.getEmptyStateHTML();
            return;
        }

        let html = '';
        produtosFiltrados.forEach(produto => {
            const categoriaClass = this.getCategoriaClass(produto.categoria);
            const categoriaNome = this.getCategoriaNome(produto.categoria);
            const estoqueStatus = this.getEstoqueStatus(produto.estoque_atual, produto.estoque_minimo);
            const estoqueClass = this.getEstoqueClass(produto.estoque_atual, produto.estoque_minimo);
            const icone = this.getCategoriaIcon(produto.categoria);

            html += `
                <div class="produto-card" data-id="${produto.id}">
                    <div class="produto-imagem">
                        ${icone}
                    </div>
                    <div class="produto-info">
                        <div class="produto-header">
                            <h3 class="produto-titulo">${produto.nome}</h3>
                            <span class="badge-categoria ${categoriaClass}">${categoriaNome}</span>
                        </div>
                        
                        <div class="produto-detalhes">
                            ${produto.marca ? `<div><strong>Marca:</strong> ${produto.marca}</div>` : ''}
                            ${produto.descricao ? `<div class="produto-descricao">${produto.descricao}</div>` : ''}
                        </div>

                        <div class="produto-estoque">
                            <span class="estoque-info ${estoqueClass}">
                                ${estoqueStatus}
                            </span>
                        </div>

                        <div class="produto-footer">
                            <div class="produto-preco">
                                R$ ${produto.preco_venda.toFixed(2)}
                            </div>
                            <div class="produto-actions">
                                <button class="btn-action btn-edit" onclick="Produtos.editarProduto(${produto.id})" title="Editar">
                                    ✏️
                                </button>
                                <button class="btn-action btn-delete" onclick="Produtos.excluirProduto(${produto.id})" title="Excluir">
                                    🗑️
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        });

        grid.innerHTML = html;
    },

    redirectToLogin: function() {
        localStorage.clear();
        window.location.href = '../index.html';
    },

    // ✅ FUNÇÕES DO MODAL DE PRODUTO
    criarModalProduto: function() {
        if (document.getElementById('modal-produto')) return;

        const modalHTML = `
            <div id="modal-produto" class="modal-overlay" style="display: none;">
                <div class="modal-content" style="max-width: 700px;">
                    <div class="modal-header">
                        <h3 id="modal-produto-titulo">👗 Novo Produto</h3>
                        <button class="modal-close" onclick="Produtos.fecharModalProduto()">&times;</button>
                    </div>
                    <div class="modal-body">
                        <form id="form-produto">
                            <input type="hidden" id="produto-id" value="">
                            
                            <div class="form-section">
                                <h4 class="section-title">📋 Informações Básicas</h4>
                                <div class="form-row">
                                    <div class="form-group">
                                        <label for="codigo-barras">📊 Código de Barras</label>
                                        <input type="text" id="codigo-barras" class="form-input" placeholder="7891234567890">
                                    </div>
                                    <div class="form-group">
                                        <label for="nome">🏷️ Nome do Produto *</label>
                                        <input type="text" id="nome" class="form-input" required placeholder="Ex: Sutiã com Bojo Rendado">
                                    </div>
                                </div>

                                <div class="form-group">
                                    <label for="descricao">📝 Descrição</label>
                                    <textarea id="descricao" class="form-input" rows="2" placeholder="Descrição detalhada do produto..."></textarea>
                                </div>
                            </div>

                            <div class="form-section">
                                <h4 class="section-title">📂 Categoria</h4>
                                <div class="form-row">
                                    <div class="form-group">
                                        <label for="categoria">👗 Categoria Principal *</label>
                                        <select id="categoria" class="form-select" required>
                                            <option value="">Selecione a categoria</option>
                                            <option value="sutia">👙 Sutiã</option>
                                            <option value="calcinha">🩲 Calcinha</option>
                                            <option value="conjunto">👘 Conjunto</option>
                                            <option value="body">🩱 Body</option>
                                            <option value="pijama">🌙 Pijama</option>
                                            <option value="calca">👖 Calça</option>
                                            <option value="camiseta">👕 Camiseta</option>
                                            <option value="camisa">👔 Camisa</option>
                                            <option value="bermuda">🩳 Bermuda</option>
                                            <option value="shorts">🩳 Shorts</option>
                                            <option value="bone">🧢 Boné</option>
                                            <option value="regata">👚 Regata</option>
                                            <option value="outros">📦 Outros</option>
                                        </select>
                                    </div>
                                    <div class="form-group">
                                        <label for="marca">🏭 Marca</label>
                                        <input type="text" id="marca" class="form-input" placeholder="Ex: Victoria's Secret, Calvin Klein">
                                    </div>
                                </div>
                            </div>

                            <div class="form-section">
                                <h4 class="section-title">💰 Estoque e Preços</h4>
                                <div class="form-row">
                                    <div class="form-group">
                                        <label for="estoque-atual">📦 Estoque Atual *</label>
                                        <input type="number" id="estoque-atual" class="form-input" required value="0" min="0">
                                    </div>
                                    <div class="form-group">
                                        <label for="estoque-minimo">⚠️ Estoque Mínimo</label>
                                        <input type="number" id="estoque-minimo" class="form-input" value="5" min="0">
                                    </div>
                                </div>
                                <div class="form-row">
                                    <div class="form-group">
                                        <label for="preco-custo">💵 Preço de Custo (R$)</label>
                                        <input type="number" id="preco-custo" class="form-input" value="0.00" min="0" step="0.01">
                                    </div>
                                    <div class="form-group">
                                        <label for="preco-venda">🏷️ Preço de Venda (R$) *</label>
                                        <input type="number" id="preco-venda" class="form-input" required value="0.00" min="0" step="0.01">
                                    </div>
                                </div>
                            </div>

                            <div class="form-section">
                                <div class="form-group">
                                    <label class="checkbox-label">
                                        <input type="checkbox" id="ativo" checked>
                                        <span class="checkmark"></span>
                                        ✅ Produto ativo
                                    </label>
                                </div>
                            </div>
                        </form>
                    </div>
                    <div class="modal-footer">
                        <button class="btn btn-outline" onclick="Produtos.fecharModalProduto()">❌ Cancelar</button>
                        <button class="btn btn-primary" onclick="Produtos.salvarProduto()">
                            💾 Salvar Produto
                        </button>
                    </div>
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', modalHTML);
    },

    abrirModalProduto: function(produtoId = null) {
        console.log('📝 Abrindo modal para produto:', produtoId);
        
        const modal = document.getElementById('modal-produto');
        const titulo = document.getElementById('modal-produto-titulo');
        
        // Resetar formulário
        document.getElementById('form-produto').reset();
        
        if (produtoId) {
            // Modo edição
            titulo.textContent = '✏️ Editar Produto';
            document.getElementById('produto-id').value = produtoId;
            
            const produto = produtos.find(p => p.id == produtoId);
            if (produto) {
                this.preencherFormulario(produto);
            } else {
                console.error('❌ Produto não encontrado:', produtoId);
                alert('Produto não encontrado para edição');
                return;
            }
        } else {
            // Modo novo produto
            titulo.textContent = '👗 Novo Produto';
            document.getElementById('produto-id').value = '';
            document.getElementById('ativo').checked = true;
        }
        
        modal.style.display = 'flex';
        
        // Focar no primeiro campo
        setTimeout(() => {
            const primeiroCampo = document.getElementById(produtoId ? 'nome' : 'codigo-barras');
            if (primeiroCampo) primeiroCampo.focus();
        }, 100);
    },

    preencherFormulario: function(produto) {
        console.log('📝 Preenchendo formulário com:', produto);
        
        // Mapear campos do produto para os IDs do formulário
        const campos = {
            'codigo-barras': 'codigo_barras',
            'nome': 'nome',
            'descricao': 'descricao',
            'categoria': 'categoria',
            'marca': 'marca',
            'estoque-atual': 'estoque_atual',
            'estoque-minimo': 'estoque_minimo',
            'preco-custo': 'preco_custo',
            'preco-venda': 'preco_venda'
        };

        for (const [campoId, campoProduto] of Object.entries(campos)) {
            const elemento = document.getElementById(campoId);
            if (elemento && produto[campoProduto] !== undefined) {
                elemento.value = produto[campoProduto];
            }
        }

        // Checkbox ativo
        const ativoCheckbox = document.getElementById('ativo');
        if (ativoCheckbox) {
            ativoCheckbox.checked = produto.ativo !== false;
        }
    },

    fecharModalProduto: function() {
        const modal = document.getElementById('modal-produto');
        modal.style.display = 'none';
    },

    async salvarProduto() {
        console.log('💾 Iniciando salvamento do produto...');
        
        const produtoId = document.getElementById('produto-id').value;
        const isEdit = !!produtoId;

        // Validação básica
        if (!this.validarFormulario()) {
            return;
        }

        // Preparar dados
        const produtoData = {
            codigo_barras: document.getElementById('codigo-barras').value || null,
            nome: document.getElementById('nome').value.trim(),
            descricao: document.getElementById('descricao').value.trim() || null,
            categoria: document.getElementById('categoria').value,
            marca: document.getElementById('marca').value.trim() || null,
            estoque_atual: parseInt(document.getElementById('estoque-atual').value) || 0,
            estoque_minimo: parseInt(document.getElementById('estoque-minimo').value) || 5,
            preco_custo: parseFloat(document.getElementById('preco-custo').value) || 0,
            preco_venda: parseFloat(document.getElementById('preco-venda').value) || 0,
            ativo: document.getElementById('ativo').checked
        };

        console.log('📤 Dados a serem enviados:', produtoData);

        try {
            this.mostrarLoadingSalvamento(true);
            
            const token = localStorage.getItem('session_token');
            if (!token) {
                this.redirectToLogin();
                return;
            }

            const url = isEdit ? 
                `${API_BASE}/api/produtos/${produtoId}` : 
                `${API_BASE}/api/produtos`;
                
            const method = isEdit ? 'PUT' : 'POST';

            const response = await fetch(url, {
                method: method,
                headers: {
                    'Authorization': token,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(produtoData)
            });

            if (response.ok) {
                const result = await response.json();
                console.log('✅ Produto salvo com sucesso:', result);
                
                alert(isEdit ? '✅ Produto atualizado com sucesso!' : '✅ Produto cadastrado com sucesso!');
                
                this.fecharModalProduto();
                this.carregarProdutos(); // Recarregar lista
                
            } else {
                const errorText = await response.text();
                console.error('❌ Erro na resposta:', response.status, errorText);
                alert('❌ Erro ao salvar produto: ' + response.status);
            }
            
        } catch (error) {
            console.error('❌ Erro na requisição:', error);
            alert('❌ Erro de conexão ao salvar produto.');
        } finally {
            this.mostrarLoadingSalvamento(false);
        }
    },

    validarFormulario: function() {
        const nome = document.getElementById('nome').value.trim();
        const precoVenda = parseFloat(document.getElementById('preco-venda').value);
        const estoqueAtual = parseInt(document.getElementById('estoque-atual').value);
        const categoria = document.getElementById('categoria').value;

        if (!nome) {
            alert('❌ Por favor, informe o nome do produto.');
            document.getElementById('nome').focus();
            return false;
        }

        if (!categoria) {
            alert('❌ Por favor, selecione uma categoria.');
            document.getElementById('categoria').focus();
            return false;
        }

        if (precoVenda <= 0) {
            alert('❌ O preço de venda deve ser maior que zero.');
            document.getElementById('preco-venda').focus();
            return false;
        }

        if (estoqueAtual < 0) {
            alert('❌ O estoque atual não pode ser negativo.');
            document.getElementById('estoque-atual').focus();
            return false;
        }

        return true;
    },

    mostrarLoadingSalvamento: function(mostrar) {
        const btnSalvar = document.querySelector('#modal-produto .btn-primary');
        if (!btnSalvar) return;
        
        if (mostrar) {
            btnSalvar.innerHTML = '⏳ Salvando...';
            btnSalvar.disabled = true;
        } else {
            btnSalvar.innerHTML = '💾 Salvar Produto';
            btnSalvar.disabled = false;
        }
    },

    editarProduto: function(id) {
        console.log('✏️ Editando produto:', id);
        this.abrirModalProduto(id);
    },

    async excluirProduto(id) {
        if (!confirm('Tem certeza que deseja excluir este produto?')) {
            return;
        }

        try {
            const token = localStorage.getItem('session_token');
            const response = await fetch(`${API_BASE}/api/produtos/${id}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': token,
                    'Content-Type': 'application/json'
                }
            });

            if (response.ok) {
                alert('✅ Produto excluído com sucesso!');
                this.carregarProdutos(); // Recarregar a lista
            } else {
                alert('❌ Erro ao excluir produto');
            }
        } catch (error) {
            console.error('Erro:', error);
            alert('❌ Erro de conexão ao excluir produto');
        }
    }
};

// Inicializar quando o DOM estiver pronto
document.addEventListener('DOMContentLoaded', function() {
    Produtos.init();
});

// Exportar para uso global
window.Produtos = Produtos;