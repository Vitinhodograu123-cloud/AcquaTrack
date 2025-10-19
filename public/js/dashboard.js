// Configuração do Socket.IO
const socket = io();

// Variáveis globais
let currentUnit = null;

// Inicialização
document.addEventListener('DOMContentLoaded', () => {
    checkAuth();
    setupEventListeners();
    loadUnits();
});

// Verificação de autenticação
function checkAuth() {
    const token = localStorage.getItem('token');
    if (!token) {
        window.location.href = '/';
        return;
    }

    const user = JSON.parse(localStorage.getItem('user'));
    document.getElementById('username').textContent = user.username;

    // Mostra botão de adicionar unidade apenas para admin
    if (user.role === 'admin') {
        document.getElementById('addUnitBtn').style.display = 'block';
    }
}

// Setup de event listeners
function setupEventListeners() {
    // Logout
    document.getElementById('logoutBtn').addEventListener('click', () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = '/';
    });

    // Modal de adicionar unidade
    const addUnitBtn = document.getElementById('addUnitBtn');
    const addUnitModal = document.getElementById('addUnitModal');
    const addUnitForm = document.getElementById('addUnitForm');

    if (addUnitBtn) {
        addUnitBtn.addEventListener('click', () => {
            addUnitModal.style.display = 'block';
        });
    }

    addUnitForm.addEventListener('submit', handleAddUnit);

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
        // Pega a porta atual do servidor
        const port = window.location.port || '3000';
        const baseUrl = `${window.location.protocol}//${window.location.hostname}:${port}`;
        
        const response = await fetch(`${baseUrl}/api/units`, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'Erro ao carregar unidades');
        }

        const units = await response.json();
        console.log('Unidades carregadas:', units); // Debug
        
        if (!units || units.length === 0) {
            const unitsList = document.getElementById('unitsList');
            unitsList.innerHTML = '<div class="no-units">Nenhuma unidade encontrada</div>';
            return;
        }

        displayUnits(units);
    } catch (error) {
        console.error('Erro ao carregar unidades:', error);
        const unitsList = document.getElementById('unitsList');
        unitsList.innerHTML = `<div class="error-message">Erro ao carregar unidades: ${error.message}</div>`;
    }
}

// Exibir unidades na sidebar
function displayUnits(units) {
    const unitsList = document.getElementById('unitsList');
    unitsList.innerHTML = '';

    console.log('Exibindo unidades:', units); // Debug

    units.forEach(unit => {
        console.log('Processando unidade:', unit); // Debug
        const unitElement = document.createElement('div');
        unitElement.className = 'unit-item';
        unitElement.innerHTML = `
            <h3>${unit.name}</h3>
            <p class="unit-location">${unit.location || ''}</p>
            <p class="unit-type">${unit.type || ''}</p>
            <div class="unit-status ${unit.status?.toLowerCase() || 'active'}">
                ${unit.status || 'ACTIVE'}
            </div>
        `;
        unitElement.addEventListener('click', () => selectUnit(unit));
        unitsList.appendChild(unitElement);
    });
}

// Selecionar uma unidade
function selectUnit(unit) {
    currentUnit = unit;
    document.getElementById('currentUnit').textContent = unit.name;
    document.getElementById('noSelection').style.display = 'none';
    document.getElementById('tankContent').style.display = 'block';

    // Remove seleção anterior
    const unitItems = document.querySelectorAll('.unit-item');
    unitItems.forEach(item => item.classList.remove('active'));
    event.currentTarget.classList.add('active');

    displayTanks(unit.tanks);
    setupCharts(unit);
}

// Exibir dados da unidade
function displayUnitData(data) {
    const tanksGrid = document.getElementById('tanksGrid');
    tanksGrid.innerHTML = `
        <div class="data-display">
            <div class="data-item ${data.isLowLevel ? 'warning' : ''}">
                <span class="data-label">Nível:</span>
                <span class="data-value">${data.waterLevel || 0}%</span>
            </div>
            <div class="data-item ${data.isHighTemp ? 'warning' : ''}">
                <span class="data-label">Temperatura:</span>
                <span class="data-value">${data.temperature || 0}°C</span>
            </div>
            <div class="data-item ${data.isVibrating ? 'warning' : ''}">
                <span class="data-label">Vibração:</span>
                <span class="data-value">${data.isVibrating ? 'Detectada' : 'Normal'}</span>
            </div>
            <div class="data-item">
                <span class="data-label">Contagem de Vibrações:</span>
                <span class="data-value">${data.vibrationCount || 0}</span>
            </div>
        </div>
    `;
}

// Criar HTML do tanque
function createTankHTML(tank) {
    const { waterLevel, temperature, vibration } = tank.lastReading || { waterLevel: 0, temperature: 0, vibration: false };
    const numberOfSensors = tank.numberOfSensors || 4;
    const increment = 100 / numberOfSensors;
    
    // Criar marcadores de nível baseados no número de sensores
    let markers = '';
    for (let i = numberOfSensors; i >= 0; i--) {
        const level = i * increment;
        markers += `<div class="tank-marker" data-level="${level}%"></div>`;
    }
    
    return `
        <h3>${tank.name}</h3>
        <div class="tank-visual">
            <div class="water-level" style="height: ${waterLevel}%"></div>
            <div class="tank-markers">${markers}</div>
        </div>
        <div class="tank-percentage">${waterLevel}%</div>
        <div class="tank-info">
            <div class="tank-info-item">
                <strong>Temperatura:</strong>
                <span class="${temperature > 50 ? 'text-danger' : 'text-normal'}">${temperature}°C</span>
            </div>
            <div class="tank-info-item">
                <strong>Vibração:</strong>
                <span class="tank-status ${vibration ? 'bg-warning' : 'bg-success'}">
                    ${vibration ? 'Detectada' : 'Normal'}
                </span>
            </div>
            <div class="tank-info-item">
                <strong>Sensores:</strong>
                <span>${numberOfSensors}</span>
            </div>
            <div class="tank-info-item">
                <strong>Incremento:</strong>
                <span>${increment}%</span>
            </div>
        </div>
    `;
}

// Adicionar nova unidade
async function handleAddUnit(e) {
    e.preventDefault();

    const formData = {
        name: document.getElementById('unitName').value,
        location: document.getElementById('unitLocation').value,
        type: document.getElementById('unitType').value,
        numberOfSensors: parseInt(document.getElementById('unitSensors').value),
        description: document.getElementById('unitDescription').value
    };

    try {
        const response = await fetch('/api/units', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify(formData)
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.message || 'Erro ao criar unidade');
        }

        // Mostra mensagem de sucesso
        const successMessage = document.createElement('div');
        successMessage.className = 'alert alert-success';
        successMessage.textContent = 'Unidade criada com sucesso!';
        document.querySelector('.modal-content').prepend(successMessage);

        // Fecha o modal após 2 segundos
        setTimeout(() => {
            closeModal();
            loadUnits();
        }, 2000);
    } catch (error) {
        // Mostra mensagem de erro
        const errorMessage = document.createElement('div');
        errorMessage.className = 'alert alert-error';
        errorMessage.textContent = error.message;
        document.querySelector('.modal-content').prepend(errorMessage);

        // Remove a mensagem após 5 segundos
        setTimeout(() => {
            errorMessage.remove();
        }, 5000);

        console.error('Erro:', error);
    }
}

// Fechar modal
function closeModal() {
    document.getElementById('addUnitModal').style.display = 'none';
    document.getElementById('addUnitForm').reset();
}

// Socket.IO event listeners
socket.on('unitUpdate', (data) => {
    console.log('Atualização recebida:', data);
    if (currentUnit && data.unitId === currentUnit._id) {
        // Atualiza visualização do tanque
        const tankVis = document.querySelector('.tank-card').tankVis;
        if (tankVis) {
            tankVis.update({
                waterLevel: data.data.waterLevel || 0,
                temperature: data.data.temperature || 0,
                isHighTemp: data.data.isHighTemp || false,
                isVibrating: data.data.isVibrating || false,
                isOnline: true,
                boias: data.data.boias || []
            });
        }
        
        // Atualiza gráficos
        const chartData = {
            waterLevel: data.data.waterLevel,
            temperature: data.data.temperature,
            vibration: data.data.isVibrating,
            timestamp: new Date(data.data.timestamp).toLocaleTimeString()
        };
        updateCharts(chartData);
    }
});