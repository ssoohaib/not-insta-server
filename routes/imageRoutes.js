const express = require('express');
const {uploadImage, getImages, getMyImages, getImagesByCatID, uploadProfilePicture} = require('../controllers/imagesController')
const multer  = require('multer')

const storage = multer.memoryStorage()
const upload = multer({ storage: storage })
const router = express.Router();

router.post('/upload-image', upload.single('image'), uploadImage)
router.get("/get-images", getImages)
router.get("/get-my-images", getMyImages)
router.post("/get-images-by-category", getImagesByCatID)

router.post("/upload-profile-picture", upload.single('image'), uploadProfilePicture)

module.exports = router;