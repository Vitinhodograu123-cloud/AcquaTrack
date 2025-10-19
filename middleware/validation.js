const Unit = require('../database/models/Unit');

module.exports = {
  validateApiKey: async (req, res, next) => {
    try {
      const apiKey = req.header('X-API-Key');
      
      if (!apiKey) {
        return res.status(401).json({ message: 'API Key não fornecida' });
      }

      // Busca a unidade pela API Key
      const unit = await Unit.findOne({ apiKey });
      
      if (!unit) {
        return res.status(401).json({ message: 'API Key inválida' });
      }

      // Adiciona a unidade ao request
      req.unit = unit;
      
      next();
    } catch (error) {
      res.status(500).json({ message: 'Erro no servidor' });
    }
  },

  validateDeviceData: (req, res, next) => {
    const { device_id, water_level, temperature, vibration } = req.body;

    if (!device_id || water_level === undefined || !temperature || vibration === undefined) {
      return res.status(400).json({ 
        message: 'Dados inválidos',
        required: ['device_id', 'water_level', 'temperature', 'vibration']
      });
    }

    next();
  }
};