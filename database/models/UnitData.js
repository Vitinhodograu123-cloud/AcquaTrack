const mongoose = require('mongoose');

const UnitDataSchema = new mongoose.Schema({
    unitId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Unit',
        required: true
    },
    waterLevel: {
        type: Number,
        required: true
    },
    temperature: {
        type: Number,
        required: true
    },
    vibration: {
        type: Boolean,
        default: false
    },
    vibrationCount: {
        type: Number,
        default: 0
    },
    isLowLevel: {
        type: Boolean,
        default: false
    },
    isHighTemp: {
        type: Boolean,
        default: false
    },
    isVibrating: {
        type: Boolean,
        default: false
    },
    boias: [{
        pino: Number,
        porcentagem: Number,
        estado: String
    }],
    timestamp: {
        type: Date,
        default: Date.now
    }
});

// Índice para consultas mais rápidas
UnitDataSchema.index({ unitId: 1, timestamp: -1 });

// Método estático para limpar dados antigos
UnitDataSchema.statics.cleanOldData = async function(days = 30) {
    const date = new Date();
    date.setDate(date.getDate() - days);
    
    return this.deleteMany({ timestamp: { $lt: date } });
};

module.exports = mongoose.model('UnitData', UnitDataSchema);