const express = require('express');
const router = express.Router();
const Unit = require('../database/models/Unit');
const Tank = require('../database/models/Tank');
const auth = require('../middleware/auth');
const crypto = require('crypto');

// Listar condomínios disponíveis para o usuário
router.get('/locations', auth, async (req, res) => {
  try {
    const locations = await Unit.distinct('location', { 
      _id: { $in: req.user.units } 
    });
    res.json(locations);
  } catch (error) {
    res.status(500).json({ message: 'Erro ao buscar condomínios' });
  }
});

// Listar unidades do usuário por condomínio
router.get('/by-location/:location', auth, async (req, res) => {
  try {
    const units = await Unit.find({ 
      _id: { $in: req.user.units },
      location: req.params.location 
    }).populate('tanks');
    
    // Atualiza o último condomínio acessado
    await req.user.updateOne({ lastAccessedLocation: req.params.location });
    
    res.json(units);
  } catch (error) {
    res.status(500).json({ message: 'Erro ao buscar unidades' });
  }
});

// Listar todas as unidades do usuário
router.get('/', auth, async (req, res) => {
  try {
    console.log('User ID:', req.user._id); // Debug
    console.log('User Units:', req.user.units); // Debug

    const units = await Unit.find({ _id: { $in: req.user.units } })
      .populate({
        path: 'tanks',
        select: 'name deviceId totalCapacity numberOfSensors lastReading'
      });

    console.log('Found Units:', units); // Debug

    res.json(units);
  } catch (error) {
    console.error('Erro ao buscar unidades:', error);
    res.status(500).json({ message: 'Erro ao buscar unidades: ' + error.message });
  }
});

// Criar nova unidade (admin)
router.post('/', auth, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Acesso negado' });
    }

    const { name, description, location, type, numberOfSensors } = req.body;

    // Validações
    if (!name || !location || !type) {
      return res.status(400).json({ 
        message: 'Nome, localização e tipo são obrigatórios' 
      });
    }

    // Gera API Key única
    const apiKey = crypto.randomBytes(32).toString('hex');

    const unit = new Unit({
      name,
      description,
      location,
      type,
      numberOfSensors: numberOfSensors || 4,
      apiKey
    });

    await unit.save();

    // Associa a unidade ao usuário admin
    await req.user.updateOne({ $push: { units: unit._id } });

    res.status(201).json({
      message: 'Unidade criada com sucesso',
      unit: {
        id: unit._id,
        name: unit.name,
        apiKey: unit.apiKey
      }
    });
  } catch (error) {
    if (error.code === 11000) {
      res.status(400).json({ message: 'Nome da unidade já existe' });
    } else {
      res.status(500).json({ message: 'Erro ao criar unidade' });
    }
  }
});

// Atualizar unidade
router.put('/:id', auth, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Acesso negado' });
    }

    const { name, description, location } = req.body;
    const unit = await Unit.findByIdAndUpdate(
      req.params.id,
      { name, description, location },
      { new: true }
    );

    if (!unit) {
      return res.status(404).json({ message: 'Unidade não encontrada' });
    }

    res.json(unit);
  } catch (error) {
    res.status(500).json({ message: 'Erro ao atualizar unidade' });
  }
});

// Gerar nova API Key
router.post('/:id/refresh-key', auth, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Acesso negado' });
    }

    const apiKey = crypto.randomBytes(16).toString('hex');
    const unit = await Unit.findByIdAndUpdate(
      req.params.id,
      { apiKey },
      { new: true }
    );

    if (!unit) {
      return res.status(404).json({ message: 'Unidade não encontrada' });
    }

    res.json({ apiKey: unit.apiKey });
  } catch (error) {
    res.status(500).json({ message: 'Erro ao atualizar API Key' });
  }
});

module.exports = router;