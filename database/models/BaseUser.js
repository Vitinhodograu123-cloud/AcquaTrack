const mongoose = require('mongoose');

const BaseUserSchema = new mongoose.Schema({
    username: {
        type: String,
        required: true,
        unique: true
    },
    password: {
        type: String,
        required: true
    },
    base: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Base',
        required: true
    },
    role: {
        type: String,
        enum: ['user', 'admin'],
        default: 'user'
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    lastLogin: Date
});

module.exports = mongoose.model('BaseUser', BaseUserSchema);