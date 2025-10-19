const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true
  },
  password: {
    type: String,
    required: true
  },
  role: {
    type: String,
    enum: ['admin', 'user'],
    default: 'user'
  },
  units: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Unit'
  }],
  lastAccessedLocation: {
    type: String // Armazena o último condomínio acessado (ex: "THE ONE", "LE VILAGE")
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('User', UserSchema);