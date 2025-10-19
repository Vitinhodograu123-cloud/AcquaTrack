// Configuração do Socket.IO
const socket = io();

// Variáveis globais
let currentUnit = null;

// Inicialização
document.addEventListener('DOMContentLoaded', () => {
    console.log('🚀 Dashboard inicializando...');
    checkAuth();
    setupEventListeners();
    loadUnits();
});

// Verificação de autenticação
function checkAuth() {
    const token = localStorage.getItem('token');
    const user = localStorage.getItem('user');
    
    if (!token || !user) {
        window.location.href = '/';
        return;
    }

    try {
        const userData = JSON.parse(user);
        document.getElementById('username').textContent = userData.username;

        // Mostra botão de adicionar unidade apenas para admin
        if (userData.role === 'admin') {
            document.getElementById('addUnitBtn').style.display = 'block';
        }
    } catch (error) {
        console.error('❌ Erro ao verificar autenticação:', error);
        window.location.href = '/';
    }
}

// Setup de event listeners
function setupEventListeners() {
    console.log('🔧 Configurando event listeners...');
    
    // Logout
    document.getElementById('logoutBtn').addEventListener('click', () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = '/';
    });

    // Modal de adicionar unidade
    const addUnitBtn = document.getElementById('addUnitBtn');
    const addUnitModal = document.getElementById('addUnitModal');

    if (addUnitBtn) {
        addUnitBtn.addEventListener('click', () => {
            console.log('🎯 Abrindo modal de adicionar unidade...');
            addUnitModal.style.display = 'block';
        });
    }

    // Form de adicionar unidade
    const addUnitForm = document.getElementById('addUnitForm');
    if (addUnitForm) {
        addUnitForm.addEventListener('submit', handleAddUnit);
    }

    // Fechar modal ao clicar fora
    window.addEventListener('click', (e) => {
        if (e.target === addUnitModal) {
            closeModal();
        }
    });
}

// Carregar unidades
async function loadUnits() {
    try {
        console.log('📋 Carregando unidades...');
        
        const response = await fetch('/api/units/list');
        
        if (!response.ok) {
            throw new Error(`Erro HTTP: ${response.status}`);
        }

        const units = await response.json();
        console.log(`✅ ${units.length} unidades carregadas:`, units.map(u => u.name));
        
        if (!units || units.length === 0) {
            document.getElementById('unitsList').innerHTML = '<div class="no-units">Nenhuma unidade encontrada</div>';
            return;
        }

        displayUnits(units);
        
    } catch (error) {
        console.error('❌ Erro ao carregar unidades:', error);
        document.getElementById('unitsList').innerHTML = `
            <div class="error-message">
                Erro ao carregar unidades: ${error.message}
            </div>
        `;
    }
}

// Exibir unidades na sidebar
function displayUnits(units) {
    const unitsList = document.getElementById('unitsList');
    unitsList.innerHTML = '';

    units.forEach(unit => {
        const unitElement = document.createElement('div');
        unitElement.className = 'unit-item';
        unitElement.innerHTML = `
            <div class="unit-item-content">
                <h3>${unit.name}</h3>
                <p class="unit-location">📍 ${unit.location || 'Sem localização'}</p>
                <p class="unit-type">🔧 ${unit.type || 'CAIXA'}</p>
                <div class="unit-status ${unit.isOnline ? 'online' : 'offline'}">
                    ${unit.isOnline ? '🟢 Online' : '🔴 Offline'}
                </div>
            </div>
        `;
        
        unitElement.addEventListener('click', () => {
            console.log(`🎯 Selecionando unidade: ${unit.name}`);
            selectUnit(unit, unitElement);
        });
        
        unitsList.appendChild(unitElement);
    });

    // Seleciona a primeira unidade automaticamente
    if (units.length > 0) {
        setTimeout(() => {
            const firstUnitElement = unitsList.querySelector('.unit-item');
            if (firstUnitElement) {
                selectUnit(units[0], firstUnitElement);
            }
        }, 500);
    }
}

// Selecionar uma unidade
function selectUnit(unit, unitElement = null) {
    console.log(`🎯 Selecionando unidade: ${unit.name}`);
    
    currentUnit = unit;
    
    // Atualiza o título
    document.getElementById('currentUnit').textContent = unit.name;
    document.getElementById('noSelection').style.display = 'none';
    document.getElementById('tankContent').style.display = 'block';

    // Remove seleção anterior
    const unitItems = document.querySelectorAll('.unit-item');
    unitItems.forEach(item => item.classList.remove('active'));
    
    // Adiciona seleção atual
    if (unitElement) {
        unitElement.classList.add('active');
    } else {
        // Encontra o elemento correspondente
        const items = document.querySelectorAll('.unit-item');
        for (let item of items) {
            if (item.querySelector('h3').textContent === unit.name) {
                item.classList.add('active');
                break;
            }
        }
    }

    // Carrega dados da unidade
    loadUnitData(unit._id);
}

// Carregar dados da unidade
async function loadUnitData(unitId) {
    try {
        console.log(`📊 Carregando dados da unidade: ${unitId}`);
        
        const response = await fetch(`/api/units/${unitId}/data`);
        
        if (!response.ok) {
            throw new Error(`Erro HTTP: ${response.status}`);
        }
        
        const data = await response.json();
        console.log('✅ Dados carregados:', data);
        
        displayUnitData(data);
        
    } catch (error) {
        console.error('❌ Erro ao carregar dados:', error);
        displayUnitData({ 
            waterLevel: 0, 
            temperature: 0, 
            isVibrating: false,
            error: true 
        });
    }
}

// Exibir dados da unidade
function displayUnitData(data) {
    const tanksGrid = document.getElementById('tanksGrid');
    
    if (data.error) {
        tanksGrid.innerHTML = `
            <div class="error-message">
                ❌ Erro ao carregar dados da unidade
            </div>
        `;
        return;
    }

    tanksGrid.innerHTML = `
        <div class="data-display">
            <div class="data-item ${data.isLowLevel ? 'warning' : ''}">
                <span class="data-label">💧 Nível de Água:</span>
                <span class="data-value">${data.waterLevel || 0}%</span>
                ${data.isLowLevel ? '<span class="alert-badge">⚠️ Baixo</span>' : ''}
            </div>
            <div class="data-item ${data.isHighTemp ? 'warning' : ''}">
                <span class="data-label">🌡️ Temperatura:</span>
                <span class="data-value">${data.temperature || 0}°C</span>
                ${data.isHighTemp ? '<span class="alert-badge">⚠️ Alta</span>' : ''}
            </div>
            <div class="data-item ${data.isVibrating ? 'warning' : ''}">
                <span class="data-label">📳 Vibração:</span>
                <span class="data-value">${data.isVibrating ? '🔴 Detectada' : '🟢 Normal'}</span>
            </div>
            <div class="data-item">
                <span class="data-label">🔢 Contagem de Vibrações:</span>
                <span class="data-value">${data.vibrationCount || 0}</span>
            </div>
            <div class="update-time">
                ⏰ Última atualização: ${data.timestamp ? new Date(data.timestamp).toLocaleString('pt-BR') : 'Nunca'}
            </div>
        </div>
    `;
}

// Adicionar nova unidade
async function handleAddUnit(e) {
    e.preventDefault();
    
    console.log('🎯 Iniciando criação de nova unidade...');

    const formData = {
        name: document.getElementById('unitName').value.trim(),
        location: document.getElementById('unitLocation').value.trim(),
        type: document.getElementById('unitType').value,
        numberOfSensors: parseInt(document.getElementById('unitSensors').value) || 4,
        description: document.getElementById('unitDescription').value.trim()
    };

    // Validação básica
    if (!formData.name || !formData.location || !formData.type) {
        alert('❌ Por favor, preencha todos os campos obrigatórios.');
        return;
    }

    try {
        console.log('📤 Enviando dados:', formData);
        
        const response = await fetch('/api/units/create', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(formData)
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || `Erro HTTP: ${response.status}`);
        }

        console.log('✅ Unidade criada com sucesso:', data);
        
        // Mostra mensagem de sucesso com a API Key
        alert(`✅ Unidade criada com sucesso!\n\n🏭 Nome: ${data.unit.name}\n🔑 API Key: ${data.unit.apiToken}\n\n⚠️ Guarde esta API Key! Ela não será mostrada novamente.`);
        
        // Fecha o modal e recarrega a lista
        closeModal();
        loadUnits();
        
    } catch (error) {
        console.error('❌ Erro ao criar unidade:', error);
        alert(`❌ Erro ao criar unidade:\n${error.message}`);
    }
}

// Fechar modal
function closeModal() {
    const modal = document.getElementById('addUnitModal');
    if (modal) {
        modal.style.display = 'none';
    }
    
    const form = document.getElementById('addUnitForm');
    if (form) {
        form.reset();
    }
}

// Socket.IO event listeners
socket.on('connect', () => {
    console.log('✅ Conectado ao servidor via Socket.IO');
});

socket.on('unitUpdate', (data) => {
    console.log('🔄 Atualização em tempo real recebida:', data);
    
    if (currentUnit && data.unitId === currentUnit._id.toString()) {
        console.log('🔄 Atualizando dados da unidade atual...');
        displayUnitData(data.data);
    }
});

socket.on('newUnit', (data) => {
    console.log('🆕 Nova unidade detectada, recarregando lista...', data);
    loadUnits();
});

socket.on('disconnect', () => {
    console.log('🔌 Desconectado do servidor Socket.IO');
});

// Funções auxiliares para debug
window.debugDashboard = {
    reloadUnits: () => loadUnits(),
    showCurrentUnit: () => console.log('Unidade atual:', currentUnit),
    testSocket: () => socket.emit('test', { message: 'Teste do dashboard' })
};

console.log('✅ Dashboard carregado e pronto!');
