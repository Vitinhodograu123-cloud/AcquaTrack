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