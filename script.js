// ATENÇÃO: Substitua pelo link gerado no seu Google Apps Script (Implantação de Aplicativo da Web)
const WEB_APP_URL = "https://script.google.com/macros/s/AKfycbyztFHTnZVmc0oxYfCcGleLtI5855H4Ca9pLsOsTVLAENMMoS69RxqR07hEXrpEAp9x5Q/exec"; 

let allGCs = [];
let addressCache = null;

// Ao carregar a página
document.addEventListener("DOMContentLoaded", () => {
    initMembrosForm();
    loadGCs();
});

// Funções de Loader
function showLoader() {
    document.getElementById('loader-overlay').style.display = 'flex';
}
function hideLoader() {
    document.getElementById('loader-overlay').style.display = 'none';
}

// === LÓGICA DE LISTAGEM E PESQUISA ===
async function loadGCs() {
    showLoader();
    try {
        const response = await fetch(`${WEB_APP_URL}?action=getGCs`);
        const data = await response.json();
        allGCs = data;
        renderGCList(allGCs);
    } catch (error) {
        console.error("Erro ao carregar GCs:", error);
    } finally {
        hideLoader();
    }
}

function renderGCList(lista) {
    const container = document.getElementById('gc-list-container');
    container.innerHTML = '';

    if(lista.length === 0) {
        container.innerHTML = '<p style="padding: 20px; text-align: center; color: #363636;">Nenhum GC encontrado.</p>';
        return;
    }

    lista.forEach(gc => {
        const div = document.createElement('div');
        div.className = 'gc-item';
        div.onclick = () => openViewModal(gc);
        
        div.innerHTML = `
            <div class="gc-info">
                <h3>${gc.nomeGC}</h3>
                <p>Bairro ${gc.bairro}</p>
            </div>
            <i class="fa-solid fa-chevron-right gc-arrow"></i>
        `;
        container.appendChild(div);
    });
}

function filterGCs() {
    const termo = document.getElementById('search-input').value.toLowerCase();
    const filtrados = allGCs.filter(gc => 
        gc.nomeGC.toLowerCase().includes(termo) || 
        gc.bairro.toLowerCase().includes(termo)
    );
    renderGCList(filtrados);
}

// === MODAIS ===
function openModal(id) {
    document.getElementById(id).classList.add('active');
}

function closeModal(id) {
    document.getElementById(id).classList.remove('active');
}

function closeAllModals(event) {
    if (event.target.classList.contains('modal-overlay')) {
        event.target.classList.remove('active');
    }
}

// Modal Visualizar GC
function openViewModal(gc) {
    document.getElementById('view-gc-name').innerText = gc.nomeGC;
    document.getElementById('view-gc-bairro').innerText = gc.bairro;
    document.getElementById('view-gc-diahora').innerText = gc.diaHora;
    
    let lideres = gc.lider1;
    if(gc.lider2) lideres += ` e ${gc.lider2}`;
    document.getElementById('view-gc-lider').innerText = lideres;

    // Remove caracteres especiais para o link do zap
    const numeroLimpo = gc.telefone.replace(/\D/g, '');
    document.getElementById('btn-contatar-lider').href = `https://wa.me/55${numeroLimpo}`;

    openModal('modal-view-gc');
}

// === FORMULÁRIO ENDEREÇO ===
function saveAddressCache() {
    const cidade = document.getElementById('end-cidade').value.trim();
    const bairro = document.getElementById('end-bairro').value.trim();
    const rua = document.getElementById('end-rua').value.trim();
    const numero = document.getElementById('end-numero').value.trim();

    if(!cidade || !bairro || !rua || !numero) {
        alert("Preencha todos os campos do endereço.");
        return;
    }

    addressCache = { cidade, bairro, rua, numero };
    document.getElementById('address-btn-text').innerText = `${rua}, ${numero} - ${bairro}`;
    closeModal('modal-address');
}

// === FORMULÁRIO MEMBROS ===
function initMembrosForm() {
    const container = document.getElementById('membros-container');
    container.innerHTML = '';
    // Adiciona os 3 primeiros membros exigidos pelo escopo
    for(let i = 0; i < 3; i++) addMemberRow();
}

function addMemberRow() {
    const container = document.getElementById('membros-container');
    const div = document.createElement('div');
    div.className = 'member-row';
    div.innerHTML = `
        <input type="text" class="membro-nome" placeholder="Nome">
        <input type="tel" class="membro-telefone" placeholder="Telefone">
    `;
    container.appendChild(div);
}

// === SALVAR DADOS NO BANCO ===
async function submitGC() {
    if(!addressCache) {
        alert("Por favor, preencha o Endereço Principal.");
        openModal('modal-address');
        return;
    }

    // Coleta Membros (apenas os que preencheram pelo menos o nome)
    const membrosElements = document.querySelectorAll('.member-row');
    const membros = [];
    membrosElements.forEach(row => {
        const nome = row.querySelector('.membro-nome').value.trim();
        const telefone = row.querySelector('.membro-telefone').value.trim();
        if(nome) {
            membros.push({ nome, telefone });
        }
    });

    const payload = {
        action: 'saveGC',
        payload: {
            nomeGC: document.getElementById('gc-nome').value,
            lider1: document.getElementById('gc-lider1').value,
            lider2: document.getElementById('gc-lider2').value,
            telefone: document.getElementById('gc-telefone').value,
            diaHora: document.getElementById('gc-diahora').value,
            endereco: addressCache,
            membros: membros
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
            alert("GC salvo com sucesso!");
            document.getElementById('add-gc-form').reset();
            addressCache = null;
            document.getElementById('address-btn-text').innerText = "Endereço principal";
            initMembrosForm();
            closeModal('modal-add-gc');
            loadGCs(); // Atualiza a lista da página
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
