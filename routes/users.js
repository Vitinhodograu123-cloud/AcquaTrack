const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const BaseUser = require('../database/models/BaseUser');
const Base = require('../database/models/Base');
const auth = require('../middleware/auth');

// GET /api/users - Listar todos os usuários
router.get('/', auth, async (req, res) => {
    try {
        const users = await BaseUser.find()
            .select('-password')
            .populate('base', 'name description');
        
        res.json(users);
    } catch (error) {
        console.error('Erro ao buscar usuários:', error);
        res.status(500).json({ message: 'Erro ao listar usuários' });
    }
});

// POST /api/users - Criar novo usuário
router.post('/', auth, async (req, res) => {
    try {
        const { username, password, base } = req.body;

        // Verificar se usuário já existe
        const existingUser = await BaseUser.findOne({ username });
        if (existingUser) {
            return res.status(400).json({ message: 'Nome de usuário já está em uso' });
        }

        // Verificar se base existe
        const baseExists = await Base.findById(base);
        if (!baseExists) {
            return res.status(400).json({ message: 'Base não encontrada' });
        }

        // Criar usuário
        const user = new BaseUser({
            username,
            password: await bcrypt.hash(password, 12),
            base: base,
            role: 'user'
        });

        await user.save();

        // Adicionar usuário à base
        baseExists.users.push(user._id);
        await baseExists.save();

        res.status(201).json({
            message: 'Usuário criado com sucesso',
            user: {
                id: user._id,
                username: user.username,
                base: baseExists.name,
                role: user.role
            }
        });
    } catch (error) {
        console.error('Erro ao criar usuário:', error);
        res.status(500).json({ message: 'Erro ao criar usuário' });
    }
});

// DELETE /api/users/:id - Deletar usuário
router.delete('/:id', auth, async (req, res) => {
    try {
        const user = await BaseUser.findById(req.params.id);
        
        if (!user) {
            return res.status(404).json({ message: 'Usuário não encontrado' });
        }

        // Remover usuário da base
        await Base.findByIdAndUpdate(user.base, {
            $pull: { users: user._id }
        });

        await BaseUser.findByIdAndDelete(req.params.id);

        res.json({ message: 'Usuário deletado com sucesso' });
    } catch (error) {
        console.error('Erro ao deletar usuário:', error);
        res.status(500).json({ message: 'Erro ao deletar usuário' });
    }
});

// GET /api/users/:id - Buscar usuário específico
router.get('/:id', auth, async (req, res) => {
    try {
        const user = await BaseUser.findById(req.params.id)
            .select('-password')
            .populate('base', 'name description');
        
        if (!user) {
            return res.status(404).json({ message: 'Usuário não encontrado' });
        }

        res.json(user);
    } catch (error) {
        console.error('Erro ao buscar usuário:', error);
        res.status(500).json({ message: 'Erro ao buscar usuário' });
    }
});

module.exports = router;