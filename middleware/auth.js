const jwt = require('jsonwebtoken');
const User = require('../database/models/User');

module.exports = async (req, res, next) => {
  try {
    // Verifica o token no header Authorization
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ message: 'Token não fornecido' });
    }

    // Decodifica o token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Busca o usuário
    const user = await User.findById(decoded.userId);
    
    if (!user) {
      throw new Error();
    }

    // Adiciona o usuário ao request
    req.user = user;
    req.token = token;
    
    next();
  } catch (error) {
    res.status(401).json({ message: 'Não autorizado' });
  }
};