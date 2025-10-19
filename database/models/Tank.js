const mongoose = require('mongoose');

const TankSchema = new mongoose.Schema({
  unitId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Unit',
    required: true
  },
  name: {
    type: String,
    required: true
  },
  deviceId: {
    type: String,
    required: true,
    unique: true
  },
  totalCapacity: {
    type: Number,
    required: true
  },
  numberOfSensors: {
    type: Number,
    required: true
  },
  sensorPercentages: [{
    type: Number
  }],
  lastReading: {
    waterLevel: Number,
    temperature: Number,
    vibration: Boolean,
    vibrationCount: Number,
    timestamp: Date
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Tank', TankSchema);