const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const auth = require('../middleware/auth');
const User = require('../database/models/User');

// Login
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    // Verifica se o usuário existe
    const user = await User.findOne({ username });
    if (!user) {
      return res.status(401).json({ message: 'Credenciais inválidas' });
    }

    // Verifica a senha
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Credenciais inválidas' });
    }

    // Gera o token
    const token = jwt.sign(
      { userId: user._id },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      token,
      user: {
        id: user._id,
        username: user.username,
        role: user.role
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Erro no servidor' });
  }
});

// Registro (apenas admin)
router.post('/register', auth, async (req, res) => {
  try {
    // Verifica se é admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Acesso negado' });
    }

    const { username, password, role } = req.body;

    // Verifica se o usuário já existe
    let user = await User.findOne({ username });
    if (user) {
      return res.status(400).json({ message: 'Usuário já existe' });
    }

    // Cria o novo usuário
    user = new User({
      username,
      password: await bcrypt.hash(password, 12),
      role: role || 'user'
    });

    await user.save();

    res.status(201).json({ message: 'Usuário criado com sucesso' });
  } catch (error) {
    res.status(500).json({ message: 'Erro no servidor' });
  }
});

// Verificar token
router.get('/verify', auth, (req, res) => {
  res.json({ 
    user: {
      id: req.user._id,
      username: req.user.username,
      role: req.user.role
    }
  });
});

module.exports = router;