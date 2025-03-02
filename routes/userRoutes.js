const express = require('express');
const { storeInterests, getUserDetails, updateInterests} = require('../controllers/userController');
const accessVerifier = require('../middlewares/acccessVerfier');
const router = express.Router();

router.get('/user-details', accessVerifier, getUserDetails)
router.post('/store-interests', accessVerifier, storeInterests);
router.patch('/update-interests', accessVerifier, updateInterests);

module.exports = router;