const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const Base = require('../database/models/Base');          // ← CORRETO
const BaseUser = require('../database/models/BaseUser');  // ← CORRETO
const auth = require('../middleware/auth');

// Criar nova base
router.post('/', auth, async (req, res) => {
    try {
        const { name, description, adminUsername, adminPassword } = req.body;

        // Verifica se já existe uma base com este nome
        const existingBase = await Base.findOne({ name });
        if (existingBase) {
            return res.status(400).json({ message: 'Já existe uma base com este nome' });
        }

        // Verifica se já existe um usuário com este nome
        const existingUser = await BaseUser.findOne({ username: adminUsername });
        if (existingUser) {
            return res.status(400).json({ message: 'Nome de usuário já está em uso' });
        }

        // Cria a nova base
        const base = new Base({
            name,
            description,
            adminUser: {
                username: adminUsername,
                password: await bcrypt.hash(adminPassword, 12)
            }
        });

        await base.save();

        // Cria o usuário admin da base
        const adminUser = new BaseUser({
            username: adminUsername,
            password: await bcrypt.hash(adminPassword, 12),
            base: base._id,
            role: 'admin'
        });

        await adminUser.save();

        // Adiciona o ID do usuário admin à base
        base.users.push(adminUser._id);
        await base.save();

        res.status(201).json({
            message: 'Base criada com sucesso',
            base: {
                id: base._id,
                name: base.name,
                description: base.description
            }
        });
    } catch (error) {
        console.error('Erro ao criar base:', error);
        res.status(500).json({ message: 'Erro ao criar base' });
    }
});

// Listar todas as bases
router.get('/', auth, async (req, res) => {
    try {
        const bases = await Base.find()
            .select('-adminUser.password')
            .populate('units', 'name type location')
            .populate('users', 'username role');
        
        res.json(bases);
    } catch (error) {
        res.status(500).json({ message: 'Erro ao listar bases' });
    }
});

// Adicionar usuário a uma base
router.post('/:baseId/users', auth, async (req, res) => {
    try {
        const { username, password } = req.body;
        const base = await Base.findById(req.params.baseId);

        if (!base) {
            return res.status(404).json({ message: 'Base não encontrada' });
        }

        // Verifica se já existe um usuário com este nome
        const existingUser = await BaseUser.findOne({ username });
        if (existingUser) {
            return res.status(400).json({ message: 'Nome de usuário já está em uso' });
        }

        // Cria o novo usuário
        const user = new BaseUser({
            username,
            password: await bcrypt.hash(password, 12),
            base: base._id
        });

        await user.save();

        // Adiciona o usuário à base
        base.users.push(user._id);
        await base.save();

        res.status(201).json({
            message: 'Usuário adicionado com sucesso',
            user: {
                id: user._id,
                username: user.username
            }
        });
    } catch (error) {
        res.status(500).json({ message: 'Erro ao adicionar usuário' });
    }
});

// Listar usuários de uma base
router.get('/:baseId/users', auth, async (req, res) => {
    try {
        const users = await BaseUser.find({ base: req.params.baseId })
            .select('-password')
            .populate('base', 'name');
        
        res.json(users);
    } catch (error) {
        res.status(500).json({ message: 'Erro ao listar usuários' });
    }
});

module.exports = router;