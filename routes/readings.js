const express = require('express');
const router = express.Router();
const Tank = require('../database/models/Tank');
const Reading = require('../database/models/Reading');
const { validateApiKey, validateDeviceData } = require('../middleware/validation');

// Receber dados do ESP32
router.post('/receive', validateApiKey, validateDeviceData, async (req, res) => {
  try {
    const { device_id, water_level, temperature, vibration, vibration_count, boias } = req.body;

    // Busca o tanque pelo device_id
    let tank = await Tank.findOne({ deviceId: device_id });

    if (!tank) {
      // Se o tanque não existe, cria um novo
      tank = new Tank({
        unitId: req.unit._id,
        deviceId: device_id,
        name: `Tanque ${device_id}`,
        totalCapacity: 1000, // Valor padrão
        numberOfSensors: boias ? boias.length : 1
      });
      await tank.save();

      // Adiciona o tanque à unidade
      await req.unit.updateOne({ $push: { tanks: tank._id } });
    }

    // Cria nova leitura
    const reading = new Reading({
      tankId: tank._id,
      waterLevel: water_level,
      temperature: temperature,
      vibration: vibration,
      vibrationCount: vibration_count || 0,
      sensorStates: boias ? boias.map(b => b.estado === 'ativo') : []
    });

    await reading.save();

    // Atualiza última leitura do tanque
    await tank.updateOne({
      lastReading: {
        waterLevel: water_level,
        temperature: temperature,
        vibration: vibration,
        vibrationCount: vibration_count || 0,
        timestamp: new Date()
      }
    });

    res.status(201).json({ message: 'Dados recebidos com sucesso' });
  } catch (error) {
    console.error('Erro ao processar dados:', error);
    res.status(500).json({ message: 'Erro ao processar dados' });
  }
});

// Buscar histórico de leituras
router.get('/:tankId/history', async (req, res) => {
  try {
    const { start, end } = req.query;
    const query = { tankId: req.params.tankId };

    if (start || end) {
      query.timestamp = {};
      if (start) query.timestamp.$gte = new Date(start);
      if (end) query.timestamp.$lte = new Date(end);
    }

    const readings = await Reading.find(query)
      .sort({ timestamp: -1 })
      .limit(1000);

    res.json(readings);
  } catch (error) {
    res.status(500).json({ message: 'Erro ao buscar histórico' });
  }
});

module.exports = router;