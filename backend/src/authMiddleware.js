const jwt = require('jsonwebtoken');
require('dotenv').config();

const authMiddleware = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Access denied. No token provided.' });
    }

    const token = authHeader.split(' ')[1];

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        // Ensure only admins are authorized
        if (decoded.role !== 'admin') {
            return res.status(403).json({ error: 'Access denied. Admins only. Middle' });
        }

        req.user = { 
            userId: decoded.userId, 
            role: decoded.role, 
            isAdmin: decoded.role === 'admin' // Ensures `isAdmin` is always set correctly
        };

        next();
    } catch (error) {
        console.error('Auth Middleware Error:', error);
        return res.status(403).json({ error: 'Unauthorized - Invalid token' });
    }
};

module.exports = authMiddleware;
