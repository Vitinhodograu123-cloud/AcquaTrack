// Configuração dos gráficos
let levelChart, tempChart, vibChart;

function setupCharts(unit) {
    // Configuração do gráfico de nível
    const levelCtx = document.getElementById('levelChart').getContext('2d');
    levelChart = new Chart(levelCtx, {
        type: 'line',
        data: {
            labels: [],
            datasets: [{
                label: 'Nível da Água (%)',
                data: [],
                borderColor: '#007bff',
                tension: 0.4
            }]
        },
        options: {
            responsive: true,
            scales: {
                y: {
                    beginAtZero: true,
                    max: 100
                }
            }
        }
    });

    // Configuração do gráfico de temperatura
    const tempCtx = document.getElementById('tempChart').getContext('2d');
    tempChart = new Chart(tempCtx, {
        type: 'line',
        data: {
            labels: [],
            datasets: [{
                label: 'Temperatura (°C)',
                data: [],
                borderColor: '#dc3545',
                tension: 0.4
            }]
        },
        options: {
            responsive: true
        }
    });

    // Configuração do gráfico de vibrações
    const vibCtx = document.getElementById('vibChart').getContext('2d');
    vibChart = new Chart(vibCtx, {
        type: 'bar',
        data: {
            labels: [],
            datasets: [{
                label: 'Vibrações por Dia',
                data: [],
                backgroundColor: '#ffc107'
            }]
        },
        options: {
            responsive: true,
            scales: {
                y: {
                    beginAtZero: true
                }
            }
        }
    });

    // Carrega dados históricos
    loadHistoricalData(unit);
}

// Carregar dados históricos
async function loadHistoricalData(unit) {
    try {
        // Calcula data de início (últimos 7 dias)
        const endDate = new Date();
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - 7);

        const response = await fetch(`/api/units/${unit._id}/data?start=${startDate.toISOString()}&end=${endDate.toISOString()}`, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });

        if (!response.ok) throw new Error('Erro ao carregar dados históricos');

        const history = await response.json();
        
        // Converte os dados históricos para o formato esperado
        const readings = history.map(data => ({
            waterLevel: data.waterLevel,
            temperature: data.temperature,
            vibration: data.isVibrating,
            timestamp: data.timestamp
        }));

        updateChartsWithHistory(readings);
    } catch (error) {
        console.error('Erro ao carregar dados históricos:', error);
    }
}

// Atualizar gráficos com dados históricos
function updateChartsWithHistory(readings) {
    // Organiza dados por dia
    const dailyData = readings.reduce((acc, reading) => {
        const date = new Date(reading.timestamp).toLocaleDateString();
        if (!acc[date]) {
            acc[date] = {
                levels: [],
                temps: [],
                vibs: 0
            };
        }
        acc[date].levels.push(reading.waterLevel);
        acc[date].temps.push(reading.temperature);
        if (reading.vibration) acc[date].vibs++;
        return acc;
    }, {});

    // Atualiza gráficos
    const dates = Object.keys(dailyData);
    
    // Nível médio por dia
    levelChart.data.labels = dates;
    levelChart.data.datasets[0].data = dates.map(date => {
        const levels = dailyData[date].levels;
        return levels.reduce((sum, val) => sum + val, 0) / levels.length;
    });
    levelChart.update();

    // Temperatura média por dia
    tempChart.data.labels = dates;
    tempChart.data.datasets[0].data = dates.map(date => {
        const temps = dailyData[date].temps;
        return temps.reduce((sum, val) => sum + val, 0) / temps.length;
    });
    tempChart.update();

    // Total de vibrações por dia
    vibChart.data.labels = dates;
    vibChart.data.datasets[0].data = dates.map(date => dailyData[date].vibs);
    vibChart.update();
}

// Atualizar gráficos com novos dados
function updateCharts(data) {
    const time = new Date(data.timestamp).toLocaleTimeString();

    // Atualiza gráfico de nível
    if (levelChart.data.labels.length > 50) {
        levelChart.data.labels.shift();
        levelChart.data.datasets[0].data.shift();
    }
    levelChart.data.labels.push(time);
    levelChart.data.datasets[0].data.push(data.waterLevel);
    levelChart.update();

    // Atualiza gráfico de temperatura
    if (tempChart.data.labels.length > 50) {
        tempChart.data.labels.shift();
        tempChart.data.datasets[0].data.shift();
    }
    tempChart.data.labels.push(time);
    tempChart.data.datasets[0].data.push(data.temperature);
    tempChart.update();

    // Atualiza gráfico de vibrações se necessário
    if (data.vibration) {
        const today = new Date().toLocaleDateString();
        const lastLabel = vibChart.data.labels[vibChart.data.labels.length - 1];
        
        if (lastLabel === today) {
            vibChart.data.datasets[0].data[vibChart.data.datasets[0].data.length - 1]++;
        } else {
            vibChart.data.labels.push(today);
            vibChart.data.datasets[0].data.push(1);
        }
        vibChart.update();
    }
}