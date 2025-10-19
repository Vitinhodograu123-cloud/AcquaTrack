const mongoose = require('mongoose');

const ReadingSchema = new mongoose.Schema({
  tankId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Tank',
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
    required: true
  },
  vibrationCount: {
    type: Number,
    default: 0
  },
  sensorStates: [{
    type: Boolean
  }],
  timestamp: {
    type: Date,
    default: Date.now
  }
});

// Índice para consultas eficientes por data
ReadingSchema.index({ tankId: 1, timestamp: -1 });

module.exports = mongoose.model('Reading', ReadingSchema);