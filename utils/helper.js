const jwt = require("jsonwebtoken");
const dotenv = require('dotenv')
dotenv.config()

const generateAccessToken = (user) => {
    return {
        atExp: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
        accessToken: jwt.sign({ uuid: user.uuid, email: user.email }, process.env.JWT_SECRET, { expiresIn: '14d' })
    }
  };
  
  const generateRefreshToken = (user) => {
    return {
        rtExp: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
        refreshToken: jwt.sign({ uuid: user.uuid }, process.env.JWT_SECRET, { expiresIn: '14d' })
    }
  };

const verifyToken = (token) => {
    try {
        return jwt.verify(token, process.env.JWT_SECRET);
    } catch (err) {
        return null;
    }
};

function generateOTP() {
    return Math.floor(100000 + Math.random() * 900000).toString();
}

module.exports={
    generateAccessToken,
    generateRefreshToken,
    generateOTP,
    verifyToken
}