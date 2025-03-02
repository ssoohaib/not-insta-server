const pool = require('../config/db');
const {verifyToken}=require('../utils/helper')
const jwt = require("jsonwebtoken");

const accessVerifier = async (req, res, next) => {
    const authHeader = req.headers['authorization'];
    if (!authHeader) {
        return res.status(401).json({ message: 'Authorization header missing' });
    }

    const token = authHeader.split(' ')[1];
    if (!token) {
        return res.status(401).json({ message: 'Token missing' });
    }

    try {
        const decoded = verifyToken(token);
        const email = decoded.email;

        const client = await pool.connect();
        try {
            const result = await client.query('SELECT * FROM users WHERE email = $1', [email]);
            if (result.rows.length === 0) {
                return res.status(401).json({ message: 'User not found' });
            }

            const user = result.rows[0];
            const tokenResult = await client.query('SELECT * FROM user_tokens WHERE user_id = $1 AND accessToken = $2', [user.uuid, token]);
            if (tokenResult.rows.length === 0) {
                return res.status(401).json({ message: 'Token does not belong to the user' });
            }

            req.user = decoded;
            next();
        } finally {
            client.release();
        }
    } catch (error) {
        return res.status(401).json({ message: 'Invalid token' });
    }
};

module.exports = accessVerifier;