const express = require('express');
const router = express.Router();
const Unit = require('../database/models/Unit');
const UnitData = require('../database/models/UnitData');

// Middleware para verificar token de autenticação
const verifyToken = async (req, res, next) => {
    try {
        const token = req.headers['x-api-key'] || req.headers.authorization?.split(' ')[1];
        if (!token) {
            return res.status(401).json({ error: 'Token não fornecido' });
        }

        // Procura por nome do dispositivo primeiro
        const device_id = req.body.device_id;
        console.log('Procurando unidade com device_id:', device_id);
        
        let unit = null;
        
        if (device_id) {
            unit = await Unit.findOne({ name: device_id });
            console.log('Unidade encontrada por nome:', unit?.name);
        }
        
        // Se não encontrou por nome, tenta pelo token
        if (!unit) {
            unit = await Unit.findOne({ apiKey: token });
            console.log('Unidade encontrada por token:', unit?.name);
        }

        if (!unit) {
            console.log('Tokens ativos no sistema:');
            const allUnits = await Unit.find({}, 'name apiKey');
            console.log(allUnits.map(u => ({ name: u.name, apiKey: u.apiKey })));
            return res.status(401).json({ error: 'Token inválido ou unidade não encontrada' });
        }

        req.unit = unit;
        next();
    } catch (error) {
        console.error('Erro ao verificar token:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
};

// Rota para receber dados do ESP32
router.post('/data', verifyToken, async (req, res) => {
    try {
        const { unit } = req;
        console.log('Token recebido:', req.headers['x-api-key'] || req.headers.authorization?.split(' ')[1]);
        console.log('Dados recebidos:', JSON.stringify(req.body, null, 2));
        console.log('Unidade encontrada:', unit.name);

        const {
            device_id,
            water_level,
            temperature,
            vibration,
            vibration_count,
            is_low_level,
            is_high_temp,
            is_vibrating,
            boias
        } = req.body;

        // Criar novo registro de dados históricos
        const unitData = new UnitData({
            unitId: unit._id,
            waterLevel: water_level,
            temperature,
            vibration,
            vibrationCount: vibration_count,
            isLowLevel: is_low_level,
            isHighTemp: is_high_temp,
            isVibrating: is_vibrating,
            boias
        });

        await unitData.save();

        // Atualizar dados atuais da unidade
        unit.lastData = {
            waterLevel: water_level,
            temperature,
            vibration,
            vibrationCount: vibration_count,
            isLowLevel: is_low_level,
            isHighTemp: is_high_temp,
            isVibrating: is_vibrating,
            boias,
            timestamp: new Date()
        };
        unit.lastUpdate = new Date();
        unit.isOnline = true;
        await unit.save();

        // Emitir evento via Socket.IO para atualização em tempo real
        req.app.get('io').emit('unitUpdate', {
            unitId: unit._id,
            data: unit.lastData
        });

        res.json({ success: true, message: 'Dados recebidos com sucesso' });
    } catch (error) {
        console.error('Erro ao receber dados:', error);
        res.status(500).json({ error: 'Erro ao processar dados' });
    }
});

// Rota para buscar histórico de dados
router.get('/:unitId/data', async (req, res) => {
    try {
        const { start, end } = req.query;
        const query = { unitId: req.params.unitId };

        if (start || end) {
            query.timestamp = {};
            if (start) query.timestamp.$gte = new Date(start);
            if (end) query.timestamp.$lte = new Date(end);
        }

        const history = await UnitData.find(query)
            .sort({ timestamp: -1 })
            .limit(1000);

        res.json(history);
    } catch (error) {
        console.error('Erro ao buscar histórico:', error);
        res.status(500).json({ error: 'Erro ao buscar histórico de dados' });
    }
});

module.exports = router;