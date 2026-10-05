// ATENÇÃO: Substitua pelo link gerado no seu Google Apps Script (Nova Implantação)
const WEB_APP_URL = "https://script.google.com/macros/s/AKfycby3eynRSmSiPQXTnQqXkWeZsmtzBERusOAdKlRfQB_D84Eh06QC4iPYP3kjkwm8E-4l1Q/exec"; 

let allEntrevistas = [];
let currentEntrevista = null;
let isEditing = false;
let selectedStatus = ''; // Armazena o status clicado no modal ('Entrevista Concluída' ou 'Entrevista pendente')

document.addEventListener("DOMContentLoaded", () => {
    loadEntrevistas();
});

function showLoader() { document.getElementById('loader-overlay').style.display = 'flex'; }
function hideLoader() { document.getElementById('loader-overlay').style.display = 'none'; }

// === CARREGAR E RENDERIZAR ===
async function loadEntrevistas() {
    showLoader();
    try {
        const response = await fetch(`${WEB_APP_URL}?action=getEntrevistas`);
        const data = await response.json();
        allEntrevistas = data;
        filterEntrevistas(); // Renderiza usando os filtros atuais
    } catch (error) {
        console.error("Erro ao carregar Entrevistas:", error);
    } finally {
        hideLoader();
    }
}

function renderEntrevistasList(lista) {
    const container = document.getElementById('entrevistas-list-container');
    container.innerHTML = '';

    if(lista.length === 0) {
        container.innerHTML = '<p style="padding: 20px; text-align: center; color: #363636;">Nenhuma entrevista encontrada.</p>';
        return;
    }

    lista.forEach(ent => {
        // Separar primeiro nome do resto
        const nomeCompleto = ent.nome ? ent.nome.trim().split(' ') : [''];
        const primeiroNome = nomeCompleto[0];
        const restoNome = nomeCompleto.slice(1).join(' ');

        // Configuração do botão de status direto na lista
        const isConcluida = ent.status === 'Entrevista Concluída';
        const iconClass = isConcluida ? 'fa-check' : 'fa-xmark';
        const btnClass = isConcluida ? 'concluida' : 'pendente';
        const proximoStatus = isConcluida ? 'Entrevista pendente' : 'Entrevista Concluída';

        const div = document.createElement('div');
        div.className = 'gc-item'; 
        
        div.innerHTML = `
            <div class="entrevista-info" onclick="openEditModal('${ent.codigo}')" style="flex: 1; cursor: pointer;">
                <h3>${primeiroNome}</h3>
                <p>${restoNome}</p>
            </div>
            <button class="list-status-btn ${btnClass}" onclick="toggleStatusrRapido('${ent.codigo}', '${proximoStatus}')">
                <i class="fa-solid ${iconClass}"></i>
            </button>
        `;
        container.appendChild(div);
    });
}

function filterEntrevistas() {
    const termo = document.getElementById('search-input').value.toLowerCase();
    const filtroStatus = document.getElementById('filtro-status').value;
    
    // Tratamento de data (garante que formato do input baterá com retorno do sheets se for ISO)
    let filtroData = document.getElementById('filtro-data').value;

    const filtrados = allEntrevistas.filter(ent => {
        const matchTermo = (ent.nome || '').toLowerCase().includes(termo);
        const matchStatus = filtroStatus === '' || ent.status === filtroStatus;
        
        let matchData = true;
        if (filtroData) {
            // Converte a data do sheets para YYYY-MM-DD para comparar com o input type="date"
            const dataSheetFormatada = ent.data ? new Date(ent.data).toISOString().split('T')[0] : '';
            matchData = dataSheetFormatada === filtroData;
        }

        return matchTermo && matchStatus && matchData;
    });
    renderEntrevistasList(filtrados);
}

function limparFiltros() {
    document.getElementById('filtro-status').value = '';
    document.getElementById('filtro-data').value = '';
    filterEntrevistas();
    closeModal('modal-filtro');
}

// === TROCA RÁPIDA DE STATUS NA LISTA ===
async function toggleStatusrRapido(codigo, novoStatus) {
    showLoader();
    try {
        const payload = {
            action: 'toggleStatusEntrevista',
            codigo: codigo,
            status: novoStatus
        };
        const response = await fetch(WEB_APP_URL, {
            method: 'POST',
            body: JSON.stringify(payload)
        });
        const result = await response.json();
        if(result.success) {
            await loadEntrevistas(); // Recarrega a lista para atualizar a cor
        } else {
            alert("Erro ao alterar status.");
        }
    } catch(err) {
        alert("Erro na conexão.");
    } finally {
        hideLoader();
    }
}

// === MODAIS ===
function openModal(id) { document.getElementById(id).classList.add('active'); }
function closeModal(id) { document.getElementById(id).classList.remove('active'); }
function closeAllModals(event) {
    if (event.target.classList.contains('modal-overlay')) {
        event.target.classList.remove('active');
    }
}

// === LÓGICA DO FORMULÁRIO ===
function selectStatus(status) {
    selectedStatus = status;
    document.getElementById('btn-status-check').classList.remove('active');
    document.getElementById('btn-status-cross').classList.remove('active');
    
    if (status === 'Entrevista Concluída') {
        document.getElementById('btn-status-check').classList.add('active');
    } else if (status === 'Entrevista pendente') {
        document.getElementById('btn-status-cross').classList.add('active');
    }
}

function openAddModal() {
    isEditing = false;
    currentEntrevista = null;
    document.getElementById('add-entrevista-form').reset();
    document.getElementById('modal-add-title').innerText = "Adicionar entrevista";
    selectStatus(''); // Limpa o status selecionado
    openModal('modal-add-entrevista');
}

function openEditModal(codigo) {
    const ent = allEntrevistas.find(e => e.codigo === codigo);
    if (!ent) return;

    isEditing = true;
    currentEntrevista = ent;
    
    document.getElementById('modal-add-title').innerText = 'Editar entrevista';
    document.getElementById('ent-nome').value = ent.nome || '';
    
    // Tratamento para jogar data do sheet pro input type date
    if (ent.data) {
        document.getElementById('ent-data').value = new Date(ent.data).toISOString().split('T')[0];
    } else {
        document.getElementById('ent-data').value = '';
    }

    // Tratamento de telefone
    if (ent.telefone) {
        document.getElementById('ent-telefone').value = ent.telefone;
    } else {
        document.getElementById('ent-telefone').value = '';
    }

    selectStatus(ent.status || '');
    openModal('modal-add-entrevista');
}

async function submitEntrevista() {
    if (!selectedStatus) {
        alert("Por favor, informe se a entrevista foi realizada marcando Check ou X.");
        return;
    }

    const payload = {
        action: isEditing ? 'editEntrevista' : 'saveEntrevista',
        codigo: isEditing ? currentEntrevista.codigo : undefined,
        payload: {
            nome: document.getElementById('ent-nome').value.trim(),
            data: document.getElementById('ent-data').value,
            telefone: document.getElementById('ent-telefone').value,
            status: selectedStatus
        }
    };

    showLoader();
    try {
        const response = await fetch(WEB_APP_URL, {
            method: 'POST',
            body: JSON.stringify(payload)
        });
        
        const result = await response.json();
        if(result.success) {
            closeModal('modal-add-entrevista');
            await loadEntrevistas(); 
        } else {
            alert("Erro ao salvar: " + result.error);
        }
    } catch(err) {
        alert("Erro na conexão.");
        console.error(err);
    } finally {
        hideLoader();
    }
}
