const express = require('express');
const { signUp, verifySignUpOTP, resendOTP, signIn, signOut, forgotPassword, verifyPasswordResetOTP, resetPassword } = require('../controllers/authController');
const router = express.Router();

router.post('/signup', signUp);
router.post('/signin', signIn);
router.post('/signout', signOut);

router.post('/verify-otp', verifySignUpOTP);
router.post('/verify-otp-rp', verifyPasswordResetOTP);
router.post('/resend-otp', resendOTP);

router.post('/forgot-password', forgotPassword);
router.post('/reset-password', forgotPassword);
router.post('/verify-otp-rp', verifyPasswordResetOTP);
router.patch('/set-new-password', resetPassword);

module.exports = router;