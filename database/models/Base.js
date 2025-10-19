const mongoose = require('mongoose');

const BaseSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        unique: true
    },
    description: String,
    adminUser: {
        username: {
            type: String,
            required: true,
            unique: true
        },
        password: {
            type: String,
            required: true
        }
    },
    units: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Unit'
    }],
    users: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'BaseUser'
    }],
    createdAt: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('Base', BaseSchema);