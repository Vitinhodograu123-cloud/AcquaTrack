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
    
    // Mostra botão de adicionar unidade para admin
    if (user.role === 'admin') {
        document.getElementById('addUnitBtn').style.display = 'block';
    }
}

// Setup de event listeners
function setupEventListeners() {
    document.getElementById('logoutBtn').addEventListener('click', () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = '/';
    });
}

// Carregar unidades
async function loadUnits() {
    try {
        const response = await fetch('/api/units', {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });

        if (!response.ok) {
            throw new Error('Erro ao carregar unidades');
        }

        const units = await response.json();
        
        if (!units || units.length === 0) {
            document.getElementById('unitsList').innerHTML = '<div class="no-units">Nenhuma unidade encontrada</div>';
            return;
        }

        displayUnits(units);
        
        // Se tiver apenas uma unidade, seleciona automaticamente após um pequeno delay
        // para garantir que os elementos do DOM foram criados
        if (units.length === 1) {
            setTimeout(() => selectUnit(units[0]), 100);
        }
    } catch (error) {
        console.error('Erro:', error);
        document.getElementById('unitsList').innerHTML = `<div class="error-message">Erro ao carregar unidades</div>`;
    }
}

// Exibir unidades
function displayUnits(units) {
    const unitsList = document.getElementById('unitsList');
    unitsList.innerHTML = '';

    units.forEach(unit => {
        const unitElement = document.createElement('div');
        unitElement.className = 'unit-item';
        unitElement.innerHTML = `
            <h3 data-id="${unit._id}">${unit.name}</h3>
            <p class="unit-location">${unit.location || ''}</p>
            <div class="unit-status ${unit.isOnline ? 'online' : 'offline'}">
                ${unit.isOnline ? 'Online' : 'Offline'}
            </div>
        `;
        unitElement.addEventListener('click', (e) => selectUnit(unit, unitElement));
        unitsList.appendChild(unitElement);
    });
}

// Selecionar uma unidade
function selectUnit(unit, clickedElement = null) {
    currentUnit = unit;
    document.getElementById('currentUnit').textContent = unit.name;
    document.getElementById('noSelection').style.display = 'none';
    document.getElementById('tankContent').style.display = 'block';

    // Remove seleção anterior
    const unitItems = document.querySelectorAll('.unit-item');
    unitItems.forEach(item => item.classList.remove('active'));
    
    // Adiciona classe active apenas se foi clicado
    if (clickedElement) {
        clickedElement.classList.add('active');
    } else {
        // Se foi seleção automática, encontra e ativa o elemento correspondente
        const unitElement = document.querySelector(`.unit-item h3[data-id="${unit._id}"]`)?.parentElement;
        if (unitElement) {
            unitElement.classList.add('active');
        }
    }

    // Exibe os dados atuais da unidade
    if (unit.lastData) {
        displayUnitData(unit.lastData);
    } else {
        displayUnitData({});
    }
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
            <div class="update-time">
                Última atualização: ${data.timestamp ? new Date(data.timestamp).toLocaleString() : 'Nunca'}
            </div>
        </div>
    `;
}

// Socket.IO event listeners
socket.on('connect', () => {
    console.log('Conectado ao servidor');
});

socket.on('unitUpdate', (data) => {
    console.log('Atualização recebida:', data);
    if (currentUnit && data.unitId === currentUnit._id) {
        displayUnitData(data.data);
    }
});


class WaterTankVisualization {
    constructor(containerId, options = {}) {
        this.container = document.getElementById(containerId);
        this.options = {
            numberOfSensors: options.numberOfSensors || 4,
            updateInterval: options.updateInterval || 1000,
            ...options
        };
        
        this.setup();
    }

    setup() {
        // Criar estrutura HTML
        this.container.innerHTML = `
            <div class="water-tank">
                <div class="water-level">
                    <div class="water-wave"></div>
                </div>
                <div class="tank-markers">
                    ${this.createMarkers()}
                </div>
                <div class="boia-indicators">
                    ${this.createBoiaIndicators()}
                </div>
            </div>
            <div class="tank-info">
                <div class="sensor-readings">
                    <div class="sensor-reading" id="level-reading">
                        <div class="sensor-label">Nível de Água</div>
                        <div class="sensor-value">0%</div>
                    </div>
                    <div class="sensor-reading" id="temp-reading">
                        <div class="sensor-label">Temperatura</div>
                        <div class="sensor-value">0°C</div>
                    </div>
                    <div class="sensor-reading" id="vibration-reading">
                        <div class="sensor-label">Vibração</div>
                        <div class="sensor-value">Normal</div>
                    </div>
                </div>
                <div class="tank-status">
                    <div class="status-indicator offline" id="connection-status">
                        <i class="fas fa-circle"></i>
                        <span>Offline</span>
                    </div>
                </div>
            </div>
        `;

        // Inicializar elementos
        this.waterLevel = this.container.querySelector('.water-level');
        this.levelReading = this.container.querySelector('#level-reading .sensor-value');
        this.tempReading = this.container.querySelector('#temp-reading .sensor-value');
        this.vibrationReading = this.container.querySelector('#vibration-reading .sensor-value');
        this.connectionStatus = this.container.querySelector('#connection-status');
    }

    createMarkers() {
        const markers = [];
        const increment = 100 / this.options.numberOfSensors;
        
        for (let i = this.options.numberOfSensors; i >= 0; i--) {
            const level = i * increment;
            markers.push(`<div class="tank-marker" data-level="${level}%"></div>`);
        }
        
        return markers.join('');
    }

    createBoiaIndicators() {
        const indicators = [];
        const increment = 100 / this.options.numberOfSensors;
        
        for (let i = 0; i < this.options.numberOfSensors; i++) {
            const position = 100 - (i * increment);
            indicators.push(`
                <div class="boia-indicator" 
                     style="top: ${position}%" 
                     data-boia="${i}">
                </div>
            `);
        }
        
        return indicators.join('');
    }

    update(data) {
        // Atualizar nível de água
        this.waterLevel.style.height = `${data.waterLevel}%`;
        this.levelReading.textContent = `${data.waterLevel}%`;
        
        // Atualizar temperatura
        this.tempReading.textContent = `${data.temperature}°C`;
        if (data.isHighTemp) {
            this.tempReading.parentElement.classList.add('warning');
        } else {
            this.tempReading.parentElement.classList.remove('warning');
        }
        
        // Atualizar vibração
        this.vibrationReading.textContent = data.isVibrating ? 'Detectada' : 'Normal';
        if (data.isVibrating) {
            this.vibrationReading.parentElement.classList.add('warning');
        } else {
            this.vibrationReading.parentElement.classList.remove('warning');
        }
        
        // Atualizar status de conexão
        this.connectionStatus.className = `status-indicator ${data.isOnline ? 'online' : 'offline'}`;
        this.connectionStatus.querySelector('span').textContent = data.isOnline ? 'Online' : 'Offline';
        
        // Atualizar indicadores das boias
        if (data.boias) {
            const boiaIndicators = this.container.querySelectorAll('.boia-indicator');
            data.boias.forEach((boia, index) => {
                if (boiaIndicators[index]) {
                    boiaIndicators[index].className = `boia-indicator ${boia.estado === 'ativo' ? 'boia-active' : 'boia-inactive'}`;
                }
            });
        }
    }
}

// Exportar para uso global
window.WaterTankVisualization = WaterTankVisualization;
