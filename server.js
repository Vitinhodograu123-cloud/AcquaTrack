const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const http = require('http');
const { Server } = require('socket.io');
require('dotenv').config();

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Conexão com MongoDB
const connectDB = async () => {
    try {
        await mongoose.connect('mongodb://localhost:27017/watertank', {
            useNewUrlParser: true,
            useUnifiedTopology: true,
            serverSelectionTimeoutMS: 5000
        });
        console.log('✅ MongoDB conectado com sucesso');
    } catch (err) {
        console.error('❌ Erro ao conectar ao MongoDB:', err.message);
        console.log('🔄 Tentando reconectar em 5 segundos...');
        setTimeout(connectDB, 5000);
    }
};

// Conectar ao MongoDB
connectDB();

// Importar modelos
const Unit = require('./database/models/Unit');
const UnitData = require('./database/models/UnitData');
const User = require('./database/models/User');

// Rotas
app.use('/api/auth', require('./routes/auth'));
app.use('/api/units', require('./routes/units'));
app.use('/api/readings', require('./routes/readings'));
app.use('/api/units', require('./routes/unitData'));
app.use('/api/bases', require('./routes/bases'));
app.use('/api/users', require('./routes/users'));

// =============================================
// ROTAS ADICIONAIS PARA O DASHBOARD
// =============================================

// GET /api/units/list - Listar todas as unidades
app.get('/api/units/list', async (req, res) => {
    try {
        console.log('📋 Buscando unidades para dashboard...');
        const units = await Unit.find({});
        console.log(`✅ Encontradas ${units.length} unidades`);
        
        res.json(units);
    } catch (error) {
        console.error('❌ Erro ao listar unidades:', error);
        res.status(500).json({ error: 'Erro ao listar unidades' });
    }
});

// POST /api/units/create - Criar nova unidade
app.post('/api/units/create', async (req, res) => {
    try {
        const { name, type, location, numberOfSensors, description } = req.body;
        
        console.log('🎯 Criando nova unidade:', { name, type, location });

        // Verifica se já existe uma unidade com este nome
        const existingUnit = await Unit.findOne({ name });
        if (existingUnit) {
            return res.status(400).json({ success: false, error: 'Já existe uma unidade com este nome' });
        }

        // Cria uma nova unidade
        const unit = new Unit({
            name,
            type,
            location,
            numberOfSensors: numberOfSensors || 4,
            description: description || `${type} em ${location}`,
            apiKey: require('crypto').randomBytes(32).toString('hex')
        });

        await unit.save();
        console.log('✅ Nova unidade criada:', unit.name);

        // Emitir evento via Socket.io
        io.emit('newUnit', { unitId: unit._id });

        res.json({
            success: true,
            unit: {
                _id: unit._id,
                name: unit.name,
                type: unit.type,
                location: unit.location,
                apiEndpoint: '/api/units/data',
                apiToken: unit.apiKey
            }
        });
    } catch (error) {
        console.error('❌ Erro ao criar unidade:', error);
        res.status(500).json({ success: false, error: 'Erro ao criar unidade' });
    }
});

// GET /api/units/:id/data - Buscar dados de uma unidade específica
app.get('/api/units/:id/data', async (req, res) => {
    try {
        const unitId = req.params.id;
        
        // Busca os dados mais recentes da unidade
        const latestData = await UnitData.findOne({ unitId })
            .sort({ timestamp: -1 });
        
        if (!latestData) {
            return res.json({
                waterLevel: 0,
                temperature: 0,
                isVibrating: false,
                isLowLevel: false,
                isHighTemp: false,
                vibrationCount: 0
            });
        }

        res.json({
            waterLevel: latestData.waterLevel || 0,
            temperature: latestData.temperature || 0,
            isVibrating: latestData.isVibrating || false,
            isLowLevel: latestData.isLowLevel || false,
            isHighTemp: latestData.isHighTemp || false,
            vibrationCount: latestData.vibrationCount || 0,
            timestamp: latestData.timestamp
        });
    } catch (error) {
        console.error('Erro ao buscar dados da unidade:', error);
        res.status(500).json({ error: 'Erro ao buscar dados' });
    }
});

// Rota para debug - Ver todas as unidades com detalhes
app.get('/api/debug/units', async (req, res) => {
    try {
        const units = await Unit.find({});
        
        res.json({
            total: units.length,
            units: units.map(unit => ({
                id: unit._id,
                name: unit.name,
                location: unit.location,
                type: unit.type,
                apiKey: unit.apiKey,
                isOnline: unit.isOnline,
                numberOfSensors: unit.numberOfSensors,
                lastData: unit.lastData
            }))
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// =============================================
// FIM DAS ROTAS DO DASHBOARD
// =============================================

// Health check endpoint
app.get('/health', (req, res) => {
    res.status(200).json({ 
        status: 'OK', 
        message: 'Servidor funcionando',
        timestamp: new Date().toISOString()
    });
});

// Página inicial
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Dashboard
app.get('/dashboard.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'dashboard.html'));
});

// Endpoint para gerenciar unidades
app.get('/manage-units', async (req, res) => {
  try {
    const units = await Unit.find({});
    res.send(`
      <html>
        <head>
          <title>Gerenciar Unidades</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; }
            table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
            th { background-color: #f4f4f4; }
            .delete-btn { background-color: #ff4444; color: white; border: none; padding: 5px 10px; cursor: pointer; }
            .create-btn { background-color: #44aa44; color: white; border: none; padding: 10px 20px; cursor: pointer; margin-bottom: 20px; }
          </style>
        </head>
        <body>
          <h1>Gerenciar Unidades</h1>
          <button class="create-btn" onclick="window.location.href='/create-test-unit'">Criar Nova Unidade</button>
          <table>
            <tr>
              <th>Nome</th>
              <th>Local</th>
              <th>Tipo</th>
              <th>API Key</th>
              <th>Status</th>
              <th>Ações</th>
            </tr>
            ${units.map(unit => `
              <tr>
                <td>${unit.name}</td>
                <td>${unit.location}</td>
                <td>${unit.type}</td>
                <td style="font-size: 10px;">${unit.apiKey}</td>
                <td>${unit.isOnline ? 'Online' : 'Offline'}</td>
                <td>
                  <button class="delete-btn" onclick="deleteUnit('${unit._id}', '${unit.name}')">Apagar</button>
                </td>
              </tr>
            `).join('')}
          </table>

          <script>
            function deleteUnit(id, name) {
              if (confirm('Tem certeza que deseja apagar a unidade ' + name + '?')) {
                fetch('/delete-unit/' + id, { method: 'DELETE' })
                  .then(response => response.json())
                  .then(data => {
                    if (data.success) {
                      alert('Unidade apagada com sucesso!');
                      window.location.reload();
                    } else {
                      alert('Erro ao apagar unidade: ' + data.error);
                    }
                  })
                  .catch(error => alert('Erro ao apagar unidade: ' + error));
              }
            }
          </script>
        </body>
      </html>
    `);
  } catch (error) {
    console.error('Erro ao listar unidades:', error);
    res.status(500).json({ error: 'Erro ao listar unidades' });
  }
});

// Endpoint para apagar unidade
app.delete('/delete-unit/:id', async (req, res) => {
  try {
    console.log('Tentando apagar unidade:', req.params.id);
    
    // Primeiro apaga os dados históricos
    await UnitData.deleteMany({ unitId: req.params.id });
    
    // Depois apaga a unidade
    const unit = await Unit.findByIdAndDelete(req.params.id);
    
    if (!unit) {
      return res.status(404).json({ success: false, error: 'Unidade não encontrada' });
    }
    
    console.log('Unidade apagada com sucesso:', unit.name);
    res.json({ success: true, message: 'Unidade apagada com sucesso' });
  } catch (error) {
    console.error('Erro ao apagar unidade:', error);
    res.status(500).json({ success: false, error: 'Erro ao apagar unidade' });
  }
});

// Endpoint temporário para criar unidade de teste
app.get('/create-test-unit', async (req, res) => {
  try {
    // Verifica se já existe uma unidade de teste
    let unit = await Unit.findOne({ name: "THE ONE pa" });
    
    if (!unit) {
      // Cria uma nova unidade
      unit = new Unit({
        name: "THE ONE pa",
        description: "Unidade de teste",
        location: "THE ONE",
        type: "CAIXA",
        numberOfSensors: 1,
        apiKey: require('crypto').randomBytes(32).toString('hex')
      });
      await unit.save();
      console.log('Nova unidade criada:', unit);
    }
    
    res.json({
      message: 'Configure o ESP32 com:',
      api_url: `http://192.168.100.120:3000/api/units/data`,
      api_token: unit.apiKey
    });
  } catch (error) {
    console.error('Erro ao criar unidade:', error);
    res.status(500).json({ error: 'Erro ao criar unidade' });
  }
});

// Verificar conexões das unidades periodicamente
setInterval(async () => {
    try {
        const offlineThreshold = new Date(Date.now() - 2 * 60 * 1000);
        await Unit.updateMany(
            { lastUpdate: { $lt: offlineThreshold } },
            { isOnline: false }
        );
    } catch (error) {
        console.error('Erro ao verificar status das unidades:', error);
    }
}, 30000);

// WebSocket para atualizações em tempo real
io.on('connection', (socket) => {
  console.log('👤 Cliente conectado via Socket.IO');

  socket.on('join-unit', (unitId) => {
    socket.join(`unit-${unitId}`);
    console.log(`📡 Cliente entrou na unidade: ${unitId}`);
  });

  socket.on('leave-unit', (unitId) => {
    socket.leave(`unit-${unitId}`);
  });

  socket.on('disconnect', () => {
    console.log('👤 Cliente desconectado');
  });
});

// Exporta io para ser usado em outras partes da aplicação
app.set('io', io);

// Inicia o servidor
const PORT = Number(process.env.PORT) || 3000;

const startApplication = async () => {
  try {
    await new Promise((resolve, reject) => {
      server.listen(PORT, '0.0.0.0', () => {
        const interfaces = require('os').networkInterfaces();
        console.log('\n=== 🚀 SERVIDOR INICIADO ===');
        console.log(`📍 Local: http://localhost:${PORT}`);
        console.log(`📊 Dashboard: http://localhost:${PORT}/dashboard.html`);
        console.log(`🔧 Gerenciar: http://localhost:${PORT}/manage-units`);
        console.log(`🩺 Health: http://localhost:${PORT}/health`);
        
        // Lista todos os IPs disponíveis
        Object.values(interfaces).forEach(iface => {
          iface.forEach(details => {
            if (details.family === 'IPv4' && !details.internal) {
              console.log(`🌐 Rede: http://${details.address}:${PORT}`);
            }
          });
        });
        console.log('============================\n');
        resolve();
      }).on('error', (error) => {
        if (error.code === 'EADDRINUSE') {
          console.error(`❌ A porta ${PORT} já está em uso.`);
          process.exit(1);
        }
        reject(error);
      });
    });
  } catch (error) {
    console.error('❌ Erro ao iniciar o servidor:', error);
    process.exit(1);
  }
};

startApplication();

module.exports = app;