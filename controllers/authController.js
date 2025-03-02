const pool = require('../config/db');
const nodemailer = require("nodemailer");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { v4: uuidv4 } = require("uuid");
const {generateAccessToken,  generateRefreshToken, generateOTP} = require('../utils/helper')
const {getObjectSignedUrl}=require('../utils/s3Helper')

const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASSWORD,
    },
});

async function sendOTP(email, otp) {
    console.log(`[senOTP] => {${email}}`)
    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: email,
      subject: "[OTP Verification] - notINSTA",
      text: `Your OTP code is: ${otp}`,
    });
  }

async function signUp(req, res){
    const { email } = req.body;
    console.log(`[signUn] => {${email}}`)
    try {
      const userCheck = await pool.query("SELECT * FROM users WHERE email = $1", [email]);
      if (userCheck.rows.length > 0) return res.status(400).json({ message: "Email already registered!" });
  
      const otp = generateOTP();
      const expiresAt = new Date(Date.now() + 1 * 60 * 1000);
  
      await pool.query(
        "INSERT INTO otp_codes (email, otp_code, expires_at, is_used) VALUES ($1, $2, $3, $4) ON CONFLICT (email) DO UPDATE SET otp_code = $2, expires_at = $3, is_used = $4",
        [email, otp, expiresAt, false]
      );

      await sendOTP(email, otp);
  
      res.json({ message: "OTP sent successfully!" });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
}

async function verifySignUpOTP(req, res) {
    const { email, otp, name, password } = req.body;
    console.log(`[verifyOTP] => {${email}}`)
    try {
      const otpCheck = await pool.query("SELECT * FROM otp_codes WHERE email = $1 AND otp_code = $2 AND expires_at > NOW() AND is_used = FALSE", [email, otp]);
      if (otpCheck.rows.length === 0) return res.status(400).json({ message: "Invalid or expired OTP!" });

      await pool.query("UPDATE otp_codes SET is_used = TRUE WHERE email = $1", [email]);
  
      const hashedPassword = await bcrypt.hash(password, 10);
      const userId = uuidv4();
  
      await pool.query(
        "INSERT INTO users (uuid, name, email, password_hash, is_verified) VALUES ($1, $2, $3, $4, $5)",
        [userId, name, email, hashedPassword, true]
      );
  
      res.json({ message: "Account verified & created successfully!" });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
}

async function resendOTP(req, res) {
    const { email } = req.body;
    console.log(`[resendOTP] => {${email}}`)
    try {
        const otp = generateOTP();
        const expiresAt = new Date(Date.now() + 1 * 60 * 1000);
    
        const result = await pool.query(
          "UPDATE otp_codes SET otp_code = $1, expires_at = $2, is_used = $4 WHERE email = $3 RETURNING *",
          [otp, expiresAt, email, false]
        );

        if (result.rowCount === 0) {
            res.json({message: "Email not found" });
            return
        }

        await sendOTP(email, otp)
        res.json({ message: "OTP re-sent successfully!" })
      } catch (error) {
        console.error("Error resending OTP:", error);
        res.status(500).json({ error: error.message });
      }
}

async function signIn(req, res) {
  const { email, password } = req.body;
  console.log(`[signIn] => {${email}}`)

  try {
    const userQuery = await pool.query("SELECT * FROM users WHERE email = $1 AND is_verified = TRUE", [email]);
    if (userQuery.rows.length === 0) return res.status(400).json({ message: "Invalid credentials!" });

    const user = userQuery.rows[0];

    const isPasswordValid = await bcrypt.compare(password, user.password_hash);
    if (!isPasswordValid) return res.status(400).json({ message: "Invalid credentials!" });
    const { atExp, accessToken } = generateAccessToken(user);
    const { rtExp, refreshToken } = generateRefreshToken(user);

    const tokenId = uuidv4();
    await pool.query(
      "INSERT INTO user_tokens (uuid, user_id, accessToken, accessToken_expires_at, refreshToken, refreshToken_expires_at) VALUES ($1, $2, $3, $4, $5, $6) ON CONFLICT (user_id) DO UPDATE SET accessToken = $3, accessToken_expires_at = $4, refreshToken = $5, refreshToken_expires_at = $6",
      [tokenId, user.uuid, accessToken, atExp, refreshToken, rtExp]
    );

    const interestsQuery = await pool.query("SELECT interest_id FROM user_interests WHERE user_id = $1", [user.uuid]);
    const interests = interestsQuery.rows.map(row => row.interest_id);

    let profilePictureUrl = null;
    if (user.profile_picture && user.profile_picture !== 'N/A') {
      profilePictureUrl = await getObjectSignedUrl(user.profile_picture);
    }else{
      profilePictureUrl='N/A'
    }

    res.json({
      data: {
        name: user.name,
        email: user.email,
        profile_picture: profilePictureUrl,
        interests
      },
      tokens: {
        accessToken,
        refreshToken
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

async function signOut(req, res) {
    console.log('[logout]')
    const token = req.headers.authorization && req.headers.authorization.split(' ')[1];

    if (!token) return res.status(400).json({ message: "Token not provided!" });
    
    try {
        const result = await pool.query("DELETE FROM user_tokens WHERE accessToken = $1 RETURNING *", [token]);
        if (result.rowCount === 0) return res.status(400).json({ message: "Invalid token or no active sessions!" });

        res.json({ message: "Logout successful!" });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}

async function forgotPassword(req, res) {
    const { email } = req.body;
    console.log(`[forgotPassword|resetPassword] => {${email}}`)
    try {
        const userQuery = await pool.query("SELECT * FROM users WHERE email = $1", [email]);
        if (userQuery.rows.length === 0) return res.status(400).json({ message: "Email not registered!" });

        const otp = generateOTP();
        const expiresAt = new Date(Date.now() + 1 * 60 * 1000);

        await pool.query(
            "INSERT INTO otp_codes (email, otp_code, expires_at, is_used) VALUES ($1, $2, $3, $4) ON CONFLICT (email) DO UPDATE SET otp_code = $2, expires_at = $3, is_used = $4",
            [email, otp, expiresAt, false]
        );

        await sendOTP(email, otp);

        res.json({ message: "OTP sent successfully!" });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}

async function verifyPasswordResetOTP(req, res) {
    const { email, otp } = req.body;
    console.log(`[verifyPasswordResetOTP] => {${email}}`)
    try {
        const otpCheck = await pool.query("SELECT * FROM otp_codes WHERE email = $1 AND otp_code = $2 AND expires_at > NOW() AND is_used = FALSE", [email, otp]);
        if (otpCheck.rows.length === 0) return res.status(400).json({ message: "Invalid or expired OTP!" });

        await pool.query("UPDATE otp_codes SET is_used = TRUE WHERE email = $1", [email]);

        res.json({ message: "OTP verified successfully!" });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}

async function resetPassword(req, res) {
  const { intent, payload } = req.body;
  const { email, newPassword, oldPassword = '' } = payload;

  console.log(`[resetPassword] => {${email}}`)
  if (intent !== 'reset-password' && intent !== 'forgot-password') {
    return res.status(400).json({ message: "Invalid intent!" });
  }

  if (intent === 'reset-password' && !oldPassword) {
    return res.status(400).json({ message: "Old password is required for reset-password intent!" });
  }

  try {
    const userQuery = await pool.query("SELECT password_hash FROM users WHERE email = $1", [email]);
    if (userQuery.rows.length === 0) return res.status(400).json({ message: "Email not registered!" });

    const user = userQuery.rows[0];

    if (intent === 'reset-password') {
      const isOldPasswordValid = await bcrypt.compare(oldPassword, user.password_hash);
      if (!isOldPasswordValid) return res.status(400).json({ message: "Old password is incorrect!" });
    }

    const isSamePassword = await bcrypt.compare(newPassword, user.password_hash);
    if (isSamePassword) return res.status(400).json({ message: "New password cannot be the same as the old password!" });

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await pool.query(
      "UPDATE users SET password_hash = $1 WHERE email = $2",
      [hashedPassword, email]
    );

    res.json({ message: "Password reset successfully!" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

async function refreshToken(req, res) {
    const token = req.headers.authorization && req.headers.authorization.split(' ')[1];
    console.log(`[refreshToken] => {${token}}`)
    if (!token) return res.status(400).json({ message: "Token not provided!" });

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const userQuery = await pool.query("SELECT * FROM users WHERE uuid = $1 AND is_verified = TRUE", [decoded.uuid]);
        if (userQuery.rows.length === 0) return res.status(400).json({ message: "Invalid token!" });

        const user = userQuery.rows[0];
        const newToken = jwt.sign({ uuid: user.uuid, email: user.email }, process.env.JWT_SECRET, { expiresIn: '14d' });
        const expiresAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);

        const tokenId = uuidv4();
        await pool.query(
            "INSERT INTO user_tokens (uuid, user_id, token, expires_at) VALUES ($1, $2, $3, $4) ON CONFLICT (user_id) DO UPDATE SET token = $3, expires_at = $4",
            [tokenId, user.uuid, newToken, expiresAt]
        );

        res.json({ message: "Token refreshed successfully!", token: newToken });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}

module.exports = {
  signUp,
  sendOTP,
  verifySignUpOTP,
  resendOTP,
  signIn,
  signOut,
  forgotPassword,
  resetPassword,
  verifyPasswordResetOTP,
//   refreshToken
}