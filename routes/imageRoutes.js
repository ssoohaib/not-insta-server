const express = require('express');
const {uploadImage, getImages, getMyImages, getImagesByCatID, uploadProfilePicture} = require('../controllers/imagesController')
const multer  = require('multer');
const accessVerifier = require('../middlewares/acccessVerfier');

const storage = multer.memoryStorage()
const upload = multer({ storage: storage })
const router = express.Router();

router.post('/upload-image', accessVerifier, upload.single('image'), uploadImage)
router.get("/get-images", accessVerifier, getImages)
router.get("/get-my-images", accessVerifier, getMyImages)
router.post("/get-images-by-category", accessVerifier, getImagesByCatID)

router.post("/upload-profile-picture", accessVerifier, upload.single('image'), uploadProfilePicture)

module.exports = router;