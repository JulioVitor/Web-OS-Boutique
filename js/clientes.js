console.log("📦 Script de clientes carregado, aguardando DOM...");

// Variáveis globais
let clientes = [];
let clienteEditando = null;
let paginaAtual = 1;
const itensPorPagina = 10;
let termoPesquisa = '';

// Aguardar o DOM carregar completamente
document.addEventListener('DOMContentLoaded', function() {
    console.log("✅ DOM pronto - Inicializando gerenciamento de clientes");
    
    try {
        // Configurar interface do usuário
        setupUserInterface();
        setupAdditionalEventListeners();
        
        // Inicializar a página (suas funções existentes)
        inicializarPagina();
        configurarEventListeners();
        
        console.log("🎉 Clientes inicializado com sucesso!");
    } catch (error) {
        console.error('❌ Erro na inicialização:', error);
        // Tentar carregar mesmo com erro
        setTimeout(() => {
            carregarClientesLocal();
        }, 1000);
    }
});
// Função para inicializar a página
function inicializarPagina() {
    try {
        carregarClientes();
        aplicarMascaras();
    } catch (error) {
        console.error('❌ Erro na inicialização da página:', error);
        // Fallback: carregar dados locais
        carregarClientesLocal();
    }
}


// Função para configurar os event listeners
function configurarEventListeners() {
    // Botão novo cliente
    document.getElementById('btn-novo-cliente').addEventListener('click', abrirModalNovoCliente);
    
    // Botão pesquisar
    document.getElementById('btn-pesquisar').addEventListener('click', pesquisarClientes);
    
    // Botão limpar pesquisa
    document.getElementById('btn-limpar-pesquisa').addEventListener('click', limparPesquisa);
    
    // Evento de input na pesquisa (busca em tempo real)
    document.getElementById('input-pesquisa').addEventListener('input', function(e) {
        if (e.target.value.length === 0) {
            limparPesquisa();
        } else if (e.target.value.length >= 3) {
            termoPesquisa = e.target.value;
            pesquisarClientes();
        }
    });
    
    // Modal de cliente
    document.getElementById('fechar-modal').addEventListener('click', fecharModalCliente);
    document.getElementById('btn-cancelar').addEventListener('click', fecharModalCliente);
    document.getElementById('btn-salvar-cliente').addEventListener('click', salvarCliente);
    
    // Modal de confirmação
    document.getElementById('fechar-confirmacao').addEventListener('click', fecharModalConfirmacao);
    document.getElementById('btn-cancelar-exclusao').addEventListener('click', fecharModalConfirmacao);
    document.getElementById('btn-confirmar-exclusao').addEventListener('click', confirmarExclusaoCliente);
    
    // Fechar modais clicando fora
    document.getElementById('modal-cliente').addEventListener('click', function(e) {
        if (e.target === this) fecharModalCliente();
    });
    
    document.getElementById('modal-confirmacao').addEventListener('click', function(e) {
        if (e.target === this) fecharModalConfirmacao();
    });
}

// Aplicar máscaras aos campos
function aplicarMascaras() {
    const telefoneInput = document.getElementById('cliente-telefone');
    if (telefoneInput) {
        telefoneInput.addEventListener('input', function(e) {
            let value = e.target.value.replace(/\D/g, '');
            if (value.length > 11) value = value.slice(0, 11);
            
            if (value.length <= 10) {
                value = value.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3');
            } else {
                value = value.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
            }
            
            e.target.value = value;
        });
    }

    const cpfInput = document.getElementById('cliente-cpf');
    if (cpfInput) {
        cpfInput.addEventListener('input', function(e) {
            let value = e.target.value.replace(/\D/g, '');
            if (value.length > 11) value = value.slice(0, 11);
            value = value.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
            e.target.value = value;
        });
    }
}

// Função para carregar clientes do servidor

async function carregarClientes() {
    try {
        mostrarLoading(true);
        
        const sessionToken = localStorage.getItem('session_token');
        if (!sessionToken) {
            console.log('🔐 Token não encontrado, usando modo offline');
            carregarClientesLocal();
            return;
        }
        
        let url = 'http://localhost:8001/api/clientes';
        
        // Adicionar parâmetros de paginação e pesquisa
        const params = new URLSearchParams();
        params.append('pagina', paginaAtual);
        params.append('limite', itensPorPagina);
        
        if (termoPesquisa) {
            params.append('pesquisa', termoPesquisa);
        }
        
        url += `?${params.toString()}`;
        
        console.log(`🔗 Fazendo requisição para: ${url}`);
        
        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': sessionToken
            }
        });
        
        console.log("📡 Status da resposta:", response.status);
        
        if (!response.ok) {
            if (response.status === 404) {
                console.log('⚠️ Rota /api/clientes não encontrada, usando fallback');
                carregarClientesLocal();
                return;
            }
            
            if (response.status === 401) {
                localStorage.removeItem('session_token');
                alert('Sessão expirada. Faça login novamente.');
                window.location.href = 'login.html';
                return;
            }
            
            const errorText = await response.text();
            console.error(`❌ Erro HTTP ${response.status}:`, errorText);
            throw new Error(`Erro HTTP: ${response.status}`);
        }
        
        const data = await response.json();
        console.log('✅ Dados recebidos do servidor:', data);
        
        // Verificar estrutura da resposta
        if (data.clientes === undefined) {
            console.warn('⚠️ Resposta não contém array "clientes", usando estrutura alternativa:', data);
            clientes = Array.isArray(data) ? data : [];
        } else {
            clientes = data.clientes || [];
        }
        
        console.log(`📊 ${clientes.length} clientes carregados`);
        
        // Renderizar a tabela
        renderizarTabelaClientes();
        
        // Renderizar paginação (usar dados da resposta ou calcular)
        const total = data.total || clientes.length;
        const totalPaginas = data.total_paginas || Math.ceil(total / itensPorPagina);
        renderizarPaginacao(total, totalPaginas);
        
    } catch (error) {
        console.error('❌ Erro ao carregar clientes:', error);
        
        // Fallback: carregar do localStorage se disponível
        carregarClientesLocal();
        
    } finally {
        mostrarLoading(false);
    }
}


// Fallback para carregar clientes do localStorage
function carregarClientesLocal() {
    try {
        const clientesLocal = JSON.parse(localStorage.getItem('clientes')) || [];
        clientes = clientesLocal;
        renderizarTabelaClientes();
        renderizarPaginacao(clientes.length, Math.ceil(clientes.length / itensPorPagina));
    } catch (error) {
        console.error('Erro ao carregar clientes do localStorage:', error);
        clientes = [];
        renderizarTabelaClientes();
    }
}

// Renderizar a tabela de clientes
function renderizarTabelaClientes() {
    const tbody = document.getElementById('corpo-tabela-clientes');
    tbody.innerHTML = '';
    
    if (clientes.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="7" class="text-center">
                    ${termoPesquisa ? 'Nenhum cliente encontrado' : 'Nenhum cliente cadastrado'}
                </td>
            </tr>
        `;
        return;
    }
    
    // Calcular índices para a paginação
    const inicio = (paginaAtual - 1) * itensPorPagina;
    const fim = inicio + itensPorPagina;
    const clientesPagina = clientes.slice(inicio, fim);
    
    clientesPagina.forEach(cliente => {
        const tr = document.createElement('tr');
        
        tr.innerHTML = `
            <td>${cliente.nome}</td>
            <td>${cliente.email || '-'}</td>
            <td>${cliente.telefone}</td>
            <td>${cliente.cpf || '-'}</td>
            <td>${formatarData(cliente.data_cadastro)}</td>
            <td>
                <span class="status-badge ${cliente.ativo ? 'status-ativo' : 'status-inativo'}">
                    ${cliente.ativo ? 'Ativo' : 'Inativo'}
                </span>
            </td>
            <td>
                <button class="btn btn-outline btn-sm btn-editar" data-id="${cliente.id}">
                    <i class="fas fa-edit"></i> Editar
                </button>
                <button class="btn btn-danger btn-sm btn-excluir" data-id="${cliente.id}" data-nome="${cliente.nome}">
                    <i class="fas fa-trash"></i> Excluir
                </button>
            </td>
        `;
        
        tbody.appendChild(tr);
    });
    
    // Adicionar event listeners aos botões de editar e excluir
    document.querySelectorAll('.btn-editar').forEach(btn => {
        btn.addEventListener('click', function() {
            const clienteId = this.getAttribute('data-id');
            abrirModalEditarCliente(clienteId);
        });
    });
    
    document.querySelectorAll('.btn-excluir').forEach(btn => {
        btn.addEventListener('click', function() {
            const clienteId = this.getAttribute('data-id');
            const clienteNome = this.getAttribute('data-nome');
            abrirModalConfirmacaoExclusao(clienteId, clienteNome);
        });
    });
}

// Renderizar controles de paginação

function setupUserInterface() {
    const userName = document.getElementById('userName');
    const userPerfil = document.getElementById('userPerfil');
    
    if (userName) {
        userName.textContent = localStorage.getItem('user_nome') || 'Usuário';
    }
    
    if (userPerfil) {
        userPerfil.textContent = localStorage.getItem('user_perfil') || 'Usuário';
    }
}

// Função de logout
function fazerLogout() {
    console.log("🚪 Fazendo logout...");
    
    const btnSair = document.getElementById('btnSair');
    if (btnSair) {
        btnSair.innerHTML = '🔄 Saindo...';
        btnSair.disabled = true;
    }

    setTimeout(() => {
        localStorage.removeItem('session_token');
        localStorage.removeItem('user_nome');
        localStorage.removeItem('user_perfil');
        localStorage.removeItem('user_id');
        window.location.href = '../index.html';
    }, 1000);
}
function setupAdditionalEventListeners() {
    // Botão voltar
    const btnVoltar = document.getElementById('btnVoltar');
    if (btnVoltar) {
        btnVoltar.addEventListener('click', function() {
            window.history.back();
        });
    }
    
    // Botão sair
    const btnSair = document.getElementById('btnSair');
    if (btnSair) {
        btnSair.addEventListener('click', function() {
            if (confirm('Deseja realmente sair do sistema?')) {
                fazerLogout();
            }
        });
    }
}
function renderizarPaginacao(totalItens, totalPaginas) {
    const paginacao = document.getElementById('paginacao');
    paginacao.innerHTML = '';
    
    if (totalPaginas <= 1) return;
    
    // Botão anterior
    if (paginaAtual > 1) {
        const btnAnterior = document.createElement('button');
        btnAnterior.innerHTML = '&laquo; Anterior';
        btnAnterior.addEventListener('click', () => mudarPagina(paginaAtual - 1));
        paginacao.appendChild(btnAnterior);
    }
    
    // Números das páginas
    for (let i = 1; i <= totalPaginas; i++) {
        const btnPagina = document.createElement('button');
        btnPagina.textContent = i;
        btnPagina.classList.toggle('active', i === paginaAtual);
        btnPagina.addEventListener('click', () => mudarPagina(i));
        paginacao.appendChild(btnPagina);
    }
    
    // Botão próximo
    if (paginaAtual < totalPaginas) {
        const btnProximo = document.createElement('button');
        btnProximo.innerHTML = 'Próximo &raquo;';
        btnProximo.addEventListener('click', () => mudarPagina(paginaAtual + 1));
        paginacao.appendChild(btnProximo);
    }
}

// Mudar página
function mudarPagina(pagina) {
    paginaAtual = pagina;
    carregarClientes();
    window.scrollTo(0, 0);
}

// Pesquisar clientes
function pesquisarClientes() {
    termoPesquisa = document.getElementById('input-pesquisa').value.trim();
    paginaAtual = 1;
    carregarClientes();
}

// Limpar pesquisa
function limparPesquisa() {
    document.getElementById('input-pesquisa').value = '';
    termoPesquisa = '';
    paginaAtual = 1;
    carregarClientes();
}

// Abrir modal para novo cliente
function abrirModalNovoCliente() {
    clienteEditando = null;
    document.getElementById('modal-titulo').textContent = 'Novo Cliente';
    document.getElementById('form-cliente').reset();
    document.getElementById('cliente-id').value = '';
    document.getElementById('cliente-status').checked = true;
    document.getElementById('modal-cliente').style.display = 'flex';
}

// Abrir modal para editar cliente
function abrirModalEditarCliente(clienteId) {
    const cliente = clientes.find(c => c.id == clienteId);
    
    if (!cliente) {
        alert('Cliente não encontrado!');
        return;
    }
    
    clienteEditando = cliente;
    document.getElementById('modal-titulo').textContent = 'Editar Cliente';
    
    // Preencher o formulário com os dados do cliente
    document.getElementById('cliente-id').value = cliente.id;
    document.getElementById('cliente-nome').value = cliente.nome;
    document.getElementById('cliente-email').value = cliente.email || '';
    document.getElementById('cliente-telefone').value = cliente.telefone;
    document.getElementById('cliente-cpf').value = cliente.cpf || '';
    document.getElementById('cliente-endereco').value = cliente.endereco || '';
    document.getElementById('cliente-cidade').value = cliente.cidade || '';
    document.getElementById('cliente-estado').value = cliente.estado || '';
    document.getElementById('cliente-observacoes').value = cliente.observacoes || '';
    document.getElementById('cliente-status').checked = cliente.ativo !== false;
    
    document.getElementById('modal-cliente').style.display = 'flex';
}

// Fechar modal de cliente
function fecharModalCliente() {
    document.getElementById('modal-cliente').style.display = 'none';
}

// Salvar cliente 
async function salvarCliente() {
    if (!validarFormularioCliente()) return;
    
    try {
        mostrarLoading(true);
        
        const sessionToken = localStorage.getItem('session_token');
        if (!sessionToken) {
            alert('❌ Sessão expirada. Faça login novamente.');
            window.location.href = 'login.html';
            return;
        }
        
        const formData = {
            nome: document.getElementById('cliente-nome').value.trim(),
            email: document.getElementById('cliente-email').value.trim() || null,
            telefone: document.getElementById('cliente-telefone').value.trim(),
            cpf: document.getElementById('cliente-cpf').value.trim() || null,
            endereco: document.getElementById('cliente-endereco').value.trim() || null,
            cidade: document.getElementById('cliente-cidade').value.trim() || null,
            estado: document.getElementById('cliente-estado').value.trim() || null,
            observacoes: document.getElementById('cliente-observacoes').value.trim() || null,
            ativo: document.getElementById('cliente-status').checked
        };
        
        let url = 'http://localhost:8001/api/clientes';
        let method = 'POST';
        
        // Se estiver editando, altera a URL e o método
        if (clienteEditando) {
            url += `/${clienteEditando.id}`;
            method = 'PUT';
        }
        
        console.log(`🔗 Enviando dados para: ${url}`, formData);
        
        const response = await fetch(url, {
            method: method,
            headers: {
                'Content-Type': 'application/json',
                'Authorization': sessionToken
            },
            body: JSON.stringify(formData)
        });
        
        if (!response.ok) {
            const errorText = await response.text();
            console.error(`❌ Erro HTTP ${response.status}:`, errorText);
            
            if (response.status === 400) {
                try {
                    const errorData = JSON.parse(errorText);
                    alert(`Erro: ${errorData.detail}`);
                } catch {
                    alert(`Erro: ${errorText}`);
                }
                return;
            }
            
            throw new Error(`Erro HTTP: ${response.status} - ${errorText}`);
        }
        
        const resultado = await response.json();
        console.log('✅ Cliente salvo com sucesso:', resultado);
        
        // Salvar também localmente como backup
        salvarClienteLocal(formData, clienteEditando?.id);
        
        alert(`✅ Cliente ${clienteEditando ? 'atualizado' : 'cadastrado'} com sucesso!`);
        fecharModalCliente();
        carregarClientes();
        
    } catch (error) {
        console.error('❌ Erro ao salvar cliente:', error);
        alert('❌ Erro ao salvar cliente. Verifique o console para mais detalhes.');
    } finally {
        mostrarLoading(false);
    }
}

// Salvar cliente no localStorage (fallback)
function salvarClienteLocal(dados, clienteId = null) {
    try {
        let clientesLocal = JSON.parse(localStorage.getItem('clientes')) || [];
        
        if (clienteId) {
            // Editar cliente existente
            const index = clientesLocal.findIndex(c => c.id == clienteId);
            if (index !== -1) {
                clientesLocal[index] = { ...clientesLocal[index], ...dados };
            }
        } else {
            // Novo cliente
            const novoCliente = {
                id: Date.now().toString(),
                data_cadastro: new Date().toISOString(),
                ...dados
            };
            clientesLocal.push(novoCliente);
        }
        
        localStorage.setItem('clientes', JSON.stringify(clientesLocal));
    } catch (error) {
        console.error('Erro ao salvar cliente no localStorage:', error);
    }
}

// Validar formulário de cliente
function validarFormularioCliente() {
    const nome = document.getElementById('cliente-nome').value.trim();
    const telefone = document.getElementById('cliente-telefone').value.trim();
    
    if (!nome) {
        alert('Por favor, informe o nome do cliente.');
        return false;
    }
    
    if (!telefone) {
        alert('Por favor, informe o telefone do cliente.');
        return false;
    }
    
    // Validar CPF se informado
    const cpf = document.getElementById('cliente-cpf').value.trim();
    if (cpf && !validarCPF(cpf)) {
        alert('Por favor, informe um CPF válido.');
        return false;
    }
    
    return true;
}

// Validar CPF
function validarCPF(cpf) {
    cpf = cpf.replace(/\D/g, '');
    
    if (cpf.length !== 11) return false;
    
    // Verificar se todos os dígitos são iguais
    if (/^(\d)\1+$/.test(cpf)) return false;
    
    // Validar dígitos verificadores
    let soma = 0;
    let resto;
    
    for (let i = 1; i <= 9; i++) {
        soma += parseInt(cpf.substring(i-1, i)) * (11 - i);
    }
    
    resto = (soma * 10) % 11;
    if ((resto === 10) || (resto === 11)) resto = 0;
    if (resto !== parseInt(cpf.substring(9, 10))) return false;
    
    soma = 0;
    for (let i = 1; i <= 10; i++) {
        soma += parseInt(cpf.substring(i-1, i)) * (12 - i);
    }
    
    resto = (soma * 10) % 11;
    if ((resto === 10) || (resto === 11)) resto = 0;
    if (resto !== parseInt(cpf.substring(10, 11))) return false;
    
    return true;
}

// Abrir modal de confirmação de exclusão
function abrirModalConfirmacaoExclusao(clienteId, clienteNome) {
    document.getElementById('nome-cliente-exclusao').textContent = clienteNome;
    document.getElementById('btn-confirmar-exclusao').setAttribute('data-id', clienteId);
    document.getElementById('modal-confirmacao').style.display = 'flex';
}

// Fechar modal de confirmação
function fecharModalConfirmacao() {
    document.getElementById('modal-confirmacao').style.display = 'none';
}

// Confirmar exclusão de cliente
async function confirmarExclusaoCliente() {
    const clienteId = document.getElementById('btn-confirmar-exclusao').getAttribute('data-id');
    
    try {
        mostrarLoading(true);
        
        const sessionToken = localStorage.getItem('session_token');
        const response = await fetch(`http://localhost:8001/api/clientes/${clienteId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': sessionToken
            }
        });
        
        if (!response.ok) {
            throw new Error(`Erro HTTP: ${response.status}`);
        }
        
        // Remover também localmente
        removerClienteLocal(clienteId);
        
        alert('Cliente excluído com sucesso!');
        fecharModalConfirmacao();
        carregarClientes();
        
    } catch (error) {
        console.error('❌ Erro ao excluir cliente:', error);
        alert('Erro ao excluir cliente. Verifique o console para mais detalhes.');
    } finally {
        mostrarLoading(false);
    }
}

// Remover cliente do localStorage (fallback)
function removerClienteLocal(clienteId) {
    try {
        let clientesLocal = JSON.parse(localStorage.getItem('clientes')) || [];
        clientesLocal = clientesLocal.filter(c => c.id != clienteId);
        localStorage.setItem('clientes', JSON.stringify(clientesLocal));
    } catch (error) {
        console.error('Erro ao remover cliente do localStorage:', error);
    }
}

// Formatador de data
function formatarData(dataString) {
    if (!dataString) return '-';
    
    const data = new Date(dataString);
    return data.toLocaleDateString('pt-BR');
}

// Mostrar/ocultar estado de carregamento
function mostrarLoading(mostrar) {
    try {
        const mainContent = document.querySelector('.main-content');
        const pageContent = document.querySelector('.page-content');
        
        // Tentar encontrar um container de loading existente ou usar o page-content
        const loadingContainer = mainContent || pageContent;
        
        if (loadingContainer) {
            if (mostrar) {
                loadingContainer.classList.add('loading');
            } else {
                loadingContainer.classList.remove('loading');
            }
        } else {
            console.warn('⚠️ Container de loading não encontrado');
            
            // Fallback: mostrar/ocultar um loading global
            if (mostrar) {
                document.body.style.opacity = '0.7';
                document.body.style.pointerEvents = 'none';
            } else {
                document.body.style.opacity = '1';
                document.body.style.pointerEvents = 'auto';
            }
        }
    } catch (error) {
        console.warn('⚠️ Erro ao controlar loading:', error);
    }
}


// Exportar clientes (função básica)
function exportarClientes() {
    try {
        // Verificar se há clientes para exportar
        if (!clientes || clientes.length === 0) {
            alert('📭 Nenhum cliente para exportar');
            return;
        }
        
        console.log('📤 Exportando clientes:', clientes);
        
        const dados = clientes.map(cliente => ({
            Nome: cliente.nome || 'N/A',
            Email: cliente.email || 'N/A',
            Telefone: cliente.telefone || 'N/A',
            CPF: cliente.cpf || 'N/A',
            'Data Cadastro': formatarData(cliente.data_cadastro) || 'N/A',
            Status: cliente.ativo ? 'Ativo' : 'Inativo',
            Endereço: cliente.endereco || 'N/A',
            Cidade: cliente.cidade || 'N/A',
            Estado: cliente.estado || 'N/A'
        }));
        
        // Verificar se temos dados válidos
        if (dados.length === 0) {
            alert('❌ Nenhum dado válido para exportar');
            return;
        }
        
        // Criar CSV
        const headers = Object.keys(dados[0]).join(';');
        const rows = dados.map(obj => {
            // Garantir que todos os valores sejam strings
            const values = Object.values(obj).map(value => 
                String(value || 'N/A')
            );
            return values.join(';');
        });
        
        const csv = [headers, ...rows].join('\n');
        
        // Download
        const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', `clientes_${new Date().toISOString().split('T')[0]}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        // Limpar URL
        setTimeout(() => URL.revokeObjectURL(url), 100);
        
        alert('📤 Clientes exportados com sucesso!');
        
    } catch (error) {
        console.error('❌ Erro ao exportar clientes:', error);
        alert('❌ Erro ao exportar clientes: ' + error.message);
    }
}
console.log("🎉 Gerenciamento de clientes inicializado com sucesso!");