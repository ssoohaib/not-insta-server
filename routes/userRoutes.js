const express = require('express');
const { storeInterests, getUserDetails, updateInterests} = require('../controllers/userController');
const router = express.Router();

router.get('/user-details', getUserDetails)
router.post('/store-interests', storeInterests);
router.patch('/update-interests', updateInterests);

module.exports = router;