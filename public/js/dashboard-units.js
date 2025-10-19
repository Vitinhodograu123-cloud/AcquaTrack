// Adicione este código ao seu arquivo public/js/dashboard.js existente

// Função para criar modal de adicionar unidade
function createAddUnitModal() {
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.id = 'addUnitModal';
    
    modal.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <h2>Adicionar Nova Unidade</h2>
                <span class="close">&times;</span>
            </div>
            <div class="modal-body">
                <form id="addUnitForm">
                    <div class="form-group">
                        <label for="unitName">Nome da Unidade:</label>
                        <input type="text" id="unitName" required placeholder="Ex: THE ONE CAIXAS">
                    </div>
                    <div class="form-group">
                        <label for="unitType">Tipo:</label>
                        <select id="unitType" required>
                            <option value="CAIXA">CAIXA</option>
                            <option value="CISTERNA">CISTERNA</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label for="unitLocation">Localização:</label>
                        <input type="text" id="unitLocation" required placeholder="Ex: THE ONE">
                    </div>
                    <button type="submit" class="btn-primary">Criar Unidade</button>
                </form>
            </div>
            <div class="modal-footer" id="modalFooter" style="display: none;">
                <div class="api-info">
                    <h3>Configuração do ESP32</h3>
                    <p>Use estas informações para configurar seu ESP32:</p>
                    <div class="code-block">
                        <p><strong>URL da API:</strong> <span id="apiUrl"></span></p>
                        <p><strong>Token:</strong> <span id="apiToken"></span></p>
                    </div>
                    <p class="warning">⚠️ Guarde o token! Ele não será mostrado novamente.</p>
                </div>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    // Adicionar eventos
    const closeBtn = modal.querySelector('.close');
    closeBtn.onclick = () => {
        modal.style.display = 'none';
        document.getElementById('modalFooter').style.display = 'none';
    };
    
    window.onclick = (event) => {
        if (event.target == modal) {
            modal.style.display = 'none';
            document.getElementById('modalFooter').style.display = 'none';
        }
    };
    
    const form = modal.querySelector('#addUnitForm');
    form.onsubmit = async (e) => {
        e.preventDefault();
        
        const formData = {
            name: document.getElementById('unitName').value,
            type: document.getElementById('unitType').value,
            location: document.getElementById('unitLocation').value
        };
        
        try {
            const response = await fetch('/api/units/create', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(formData)
            });
            
            const data = await response.json();
            
            if (data.success) {
                // Mostrar informações da API
                document.getElementById('apiUrl').textContent = `${window.location.origin}${data.unit.apiEndpoint}`;
                document.getElementById('apiToken').textContent = data.unit.apiToken;
                document.getElementById('modalFooter').style.display = 'block';
                
                // Limpar formulário
                form.reset();
                
                // Atualizar lista de unidades
                updateUnitsList();
            } else {
                alert('Erro ao criar unidade: ' + data.error);
            }
        } catch (error) {
            console.error('Erro:', error);
            alert('Erro ao criar unidade');
        }
    };
}

// Função para atualizar lista de unidades
async function updateUnitsList() {
    try {
        const response = await fetch('/api/units/list');
        const units = await response.json();
        
        // Atualizar container de unidades
        const container = document.querySelector('.units-container');
        if (!container) return;
        
        container.innerHTML = ''; // Limpar container
        
        units.forEach(unit => {
            const unitCard = document.createElement('div');
            unitCard.className = 'unit-card';
            unitCard.innerHTML = `
                <div class="unit-header">
                    <h3>${unit.name}</h3>
                    <span class="unit-status ${unit.isOnline ? 'online' : 'offline'}">
                        ${unit.isOnline ? 'Online' : 'Offline'}
                    </span>
                </div>
                <div class="unit-info">
                    <p><strong>Tipo:</strong> ${unit.type}</p>
                    <p><strong>Local:</strong> ${unit.location}</p>
                    <p><strong>Última atualização:</strong> ${unit.lastUpdate ? new Date(unit.lastUpdate).toLocaleString() : 'Nunca'}</p>
                </div>
                <div class="unit-data" id="unit-data-${unit._id}">
                    <p>Carregando dados...</p>
                </div>
            `;
            container.appendChild(unitCard);
            
            // Carregar dados iniciais da unidade
            loadUnitData(unit._id);
        });
        
        // Adicionar botão de nova unidade se não existir
        let addButton = document.getElementById('addUnitButton');
        if (!addButton) {
            addButton = document.createElement('button');
            addButton.id = 'addUnitButton';
            addButton.className = 'btn-primary add-unit-btn';
            addButton.innerHTML = '+ Adicionar Unidade';
            addButton.onclick = () => {
                const modal = document.getElementById('addUnitModal');
                if (modal) {
                    modal.style.display = 'block';
                }
            };
            container.appendChild(addButton);
        }
    } catch (error) {
        console.error('Erro ao atualizar lista:', error);
    }
}

// Função para carregar dados de uma unidade
async function loadUnitData(unitId) {
    try {
        const response = await fetch(`/api/units/${unitId}/data`);
        const data = await response.json();
        
        const container = document.getElementById(`unit-data-${unitId}`);
        if (!container) return;
        
        container.innerHTML = `
            <div class="sensor-data">
                <div class="sensor-item">
                    <span class="sensor-label">Nível de Água:</span>
                    <span class="sensor-value ${data.isLowLevel ? 'alert' : ''}">${data.waterLevel}%</span>
                </div>
                <div class="sensor-item">
                    <span class="sensor-label">Temperatura:</span>
                    <span class="sensor-value ${data.isHighTemp ? 'alert' : ''}">${data.temperature}°C</span>
                </div>
                <div class="sensor-item">
                    <span class="sensor-label">Vibração:</span>
                    <span class="sensor-value ${data.isVibrating ? 'alert' : ''}">${data.isVibrating ? 'Detectada' : 'Normal'}</span>
                </div>
            </div>
        `;
    } catch (error) {
        console.error('Erro ao carregar dados:', error);
    }
}

// Configurar Socket.IO para atualizações em tempo real
const socket = io();

socket.on('unitUpdate', (data) => {
    // Atualizar dados da unidade quando receber atualização
    loadUnitData(data.unitId);
});

socket.on('newUnit', () => {
    // Atualizar lista de unidades quando uma nova unidade for criada
    updateUnitsList();
});

// Adicionar estilos necessários
const styles = `
.modal {
    display: none;
    position: fixed;
    z-index: 1000;
    left: 0;
    top: 0;
    width: 100%;
    height: 100%;
    background-color: rgba(0,0,0,0.5);
}

.modal-content {
    background-color: white;
    margin: 10% auto;
    padding: 20px;
    border-radius: 8px;
    width: 80%;
    max-width: 600px;
}

.close {
    float: right;
    font-size: 28px;
    font-weight: bold;
    cursor: pointer;
}

.form-group {
    margin-bottom: 15px;
}

.form-group label {
    display: block;
    margin-bottom: 5px;
}

.form-group input,
.form-group select {
    width: 100%;
    padding: 8px;
    border: 1px solid #ddd;
    border-radius: 4px;
}

.add-unit-btn {
    width: 100%;
    padding: 15px;
    margin-top: 20px;
    background-color: #4CAF50;
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;
}

.unit-card {
    background: white;
    padding: 15px;
    margin: 10px 0;
    border-radius: 8px;
    box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

.unit-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 10px;
}

.unit-status {
    padding: 4px 8px;
    border-radius: 12px;
    font-size: 12px;
}

.unit-status.online {
    background-color: #4CAF50;
    color: white;
}

.unit-status.offline {
    background-color: #f44336;
    color: white;
}

.sensor-data {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
    gap: 10px;
    margin-top: 10px;
}

.sensor-item {
    padding: 8px;
    border: 1px solid #ddd;
    border-radius: 4px;
}

.sensor-value.alert {
    color: #f44336;
    font-weight: bold;
}

.api-info {
    margin-top: 20px;
    padding: 15px;
    background-color: #f5f5f5;
    border-radius: 4px;
}

.code-block {
    background-color: #2b2b2b;
    color: #fff;
    padding: 15px;
    border-radius: 4px;
    margin: 10px 0;
}

.warning {
    color: #856404;
    background-color: #fff3cd;
    padding: 10px;
    border-radius: 4px;
    margin-top: 10px;
}
`;

// Adicionar estilos ao documento
const styleSheet = document.createElement('style');
styleSheet.textContent = styles;
document.head.appendChild(styleSheet);

// Inicialização
document.addEventListener('DOMContentLoaded', () => {
    createAddUnitModal();
    updateUnitsList();
});