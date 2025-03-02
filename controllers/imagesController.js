const crypto = require('crypto')
const { v4: uuidv4 } = require("uuid");
const bcrypt = require("bcrypt");
const pool = require('../config/db');
const jwt = require("jsonwebtoken");
const dotenv = require('dotenv');
const {uploadFile, deleteFile, getObjectSignedUrl} = require('../utils/s3Helper')

dotenv.config()

const generateFileName = (bytes = 32) => crypto.randomBytes(bytes).toString('hex')

async function uploadProfilePicture(req, res) {
  const file = req.file;
  const imageName = generateFileName();
  const bearerHeader = req.headers['authorization'];

  if (!bearerHeader) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const token = bearerHeader.split(' ')[1];
  let userEmail = '';
  try {
    const decodedToken = jwt.verify(token, process.env.JWT_SECRET);
    userEmail = decodedToken.email;
  } catch (error) {
    console.log(error);
    return res.status(401).json({ message: "Invalid Token" });
  }

  try {
    const userResult = await pool.query('SELECT uuid, profile_picture FROM users WHERE email = $1', [userEmail]);
    const userId = userResult.rows[0].uuid;

    await uploadFile(file.buffer, imageName, file.mimetype);

    await pool.query(
      'UPDATE users SET profile_picture = $1 WHERE uuid = $2',
      [imageName, userId]
    );

    res.json({ message: "Profile Picture Upload Success" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Profile Picture Upload Failed", error: error.message });
  }
}

async function uploadImage(req,res){
  const categories = JSON.parse(req.body.categories);
  const file = req.file
  const imageName = generateFileName()
  const bearerHeader = req.headers['authorization']

  console.log(categories)
  if (!bearerHeader) {
    return res.status(401).json({ message: "Unauthorized" })
  }

  const token = bearerHeader.split(' ')[1]
  let userEmail=''
  try {
    const decodedToken = jwt.verify(token, process.env.JWT_SECRET)
    userEmail = decodedToken.email
  } catch (error) {
    console.log(error)
    return res.status(401).json({ message: "Invalid Token" })
  }

  try {
    const userResult = await pool.query('SELECT uuid FROM users WHERE email = $1', [userEmail])
    const userId = userResult.rows[0].uuid

    await uploadFile(file.buffer, imageName, file.mimetype)

    const imageID=uuidv4();
    await pool.query(
      'INSERT INTO user_images (uuid, user_id, image_name) VALUES ($1, $2, $3)',
      [imageID, userId, imageName]
    )

    for (const categoryId of categories) {
      await pool.query(
      'INSERT INTO images_categories (image_id, category_id) VALUES ($1, $2)',
      [imageID, categoryId]
      )
    }

    res.json({ message: "Image Upload Success" })
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: "Image Upload Failed", error: error.message })
  }
}

async function getImages(req, res) {
  const token = req.headers['authorization'].split(' ')[1];
  let userEmail = '';
  try {
    const decodedToken = jwt.verify(token, process.env.JWT_SECRET);
    userEmail = decodedToken.email;
  } catch (error) {
    console.log(error);
    return res.status(401).json({ message: "Invalid Token" });
  }

  try {
    const userResult = await pool.query('SELECT uuid FROM users WHERE email = $1', [userEmail]);
    const userId = userResult.rows[0].uuid;

    const imagesResult = await pool.query('SELECT * FROM user_images WHERE user_id != $1', [userId]);
    const images = imagesResult.rows;

    const response = [];

    for (const image of images) {
      const signedUrl = await getObjectSignedUrl(image.image_name);

      const userResult = await pool.query('SELECT name FROM users WHERE uuid = $1', [image.user_id]);
      const uploaderName = userResult.rows[0].name;

      const categoriesResult = await pool.query('SELECT category_id FROM images_categories WHERE image_id = $1', [image.uuid]);
      const categories = categoriesResult.rows.map(row => row.category_id);

      response.push({
        uri: signedUrl,
        uploaderName: uploaderName,
        categories: categories
      });
    }

    return res.json(response);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Failed to retrieve images", error: error.message });
  }
}

async function getMyImages(req, res) {
  const token = req.headers['authorization'].split(' ')[1];
  let userEmail = '';
  try {
    const decodedToken = jwt.verify(token, process.env.JWT_SECRET);
    userEmail = decodedToken.email;
  } catch (error) {
    console.log(error);
    return res.status(401).json({ message: "Invalid Token" });
  }

  try {
    const userResult = await pool.query('SELECT uuid FROM users WHERE email = $1', [userEmail]);
    const userId = userResult.rows[0].uuid;

    const imagesResult = await pool.query('SELECT * FROM user_images WHERE user_id = $1', [userId]);
    const images = imagesResult.rows;

    const response = [];

    for (const image of images) {
      const signedUrl = await getObjectSignedUrl(image.image_name);

      const categoriesResult = await pool.query('SELECT category_id FROM images_categories WHERE image_id = $1', [image.uuid]);
      const categories = categoriesResult.rows.map(row => row.category_id);

      response.push({
        uri: signedUrl,
        categories: categories
      });
    }

    return res.json(response);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Failed to retrieve images", error: error.message });
  }
}

async function getImagesByCatID(req, res) {
  let { interestIds } = req.body;
  if (interestIds.length === 0) {
    interestIds = Array.from({ length: 19 }, (_, i) => i + 1);
  }
  const token = req.headers['authorization'].split(' ')[1];
  let userEmail = '';
  try {
    const decodedToken = jwt.verify(token, process.env.JWT_SECRET);
    userEmail = decodedToken.email;
  } catch (error) {
    console.log(error);
    return res.status(401).json({ message: "Invalid Token" });
  }

  try {
    const userResult = await pool.query('SELECT uuid FROM users WHERE email = $1', [userEmail]);
    const userId = userResult.rows[0].uuid;

    const imagesResult = await pool.query(
      'SELECT DISTINCT ui.* FROM user_images ui JOIN images_categories ic ON ui.uuid = ic.image_id WHERE ic.category_id = ANY($1::int[]) AND ui.user_id != $2',
      [interestIds, userId]
    );
    const images = imagesResult.rows;

    const response = [];

    for (const image of images) {
      const signedUrl = await getObjectSignedUrl(image.image_name);

      const userResult = await pool.query('SELECT name FROM users WHERE uuid = $1', [image.user_id]);
      const uploaderName = userResult.rows[0].name;

      const categoriesResult = await pool.query('SELECT category_id FROM images_categories WHERE image_id = $1', [image.uuid]);
      const categories = categoriesResult.rows.map(row => row.category_id);

      response.push({
        uri: signedUrl,
        uploaderName: uploaderName,
        categories: categories
      });
    }

    return res.json(response);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Failed to retrieve images", error: error.message });
  }
}

module.exports={
    uploadImage,
    getImages,
    getMyImages,
    getImagesByCatID,
    uploadProfilePicture
}