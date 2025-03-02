const pool = require('../config/db');
const { v4: uuidv4 } = require("uuid");
const jwt = require("jsonwebtoken");
const {getObjectSignedUrl} = require("../utils/s3Helper");

async function storeInterests(req, res) {
    console.log('[storeInterests] => ');
    try {
        const token = req.headers.authorization.split(" ")[1];
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        const email = decoded.email;
        const { interests } = req.body;

        const userResult = await pool.query('SELECT uuid FROM users WHERE email = $1', [email]);
        if (userResult.rows.length === 0) {
            return res.status(404).json({ message: 'User not found' });
        }
        const userId = userResult.rows[0].uuid;

        for (const interestId of interests) {
            await pool.query(
                'INSERT INTO user_interests (user_id, interest_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
                [userId, interestId]
            );
        }

        res.status(200).json({ message: 'Interests stored successfully' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Internal server error' });
    }
}

async function updateInterests(req, res) {
    console.log('[updateInterests] => ');
    try {
        const token = req.headers.authorization.split(" ")[1];
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        const email = decoded.email;
        const { interests } = req.body;

        const userResult = await pool.query('SELECT uuid FROM users WHERE email = $1', [email]);
        if (userResult.rows.length === 0) {
            return res.status(404).json({ message: 'User not found' });
        }
        const userId = userResult.rows[0].uuid;

        await pool.query('DELETE FROM user_interests WHERE user_id = $1', [userId]);

        for (const interestId of interests) {
            await pool.query(
                'INSERT INTO user_interests (user_id, interest_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
                [userId, interestId]
            );
        }

        res.status(200).json({ message: 'Interests updated successfully' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Internal server error' });
    }
}

async function getUserDetails(req, res) {
    console.log('[getUserDetails] => ');
    try {
        const token = req.headers.authorization.split(" ")[1];
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        const email = decoded.email;

        const userResult = await pool.query('SELECT uuid, email, name, profile_picture FROM users WHERE email = $1', [email]);
        if (userResult.rows.length === 0) {
            return res.status(404).json({ message: 'User not found' });
        }

        const user = userResult.rows[0];

        const interestsResult = await pool.query('SELECT interest_id FROM user_interests WHERE user_id = $1', [user.uuid]);
        const interests = interestsResult.rows.map(row => row.interest_id);

        const profilePictureUrl = user.profile_picture !=='N/A' ? await getObjectSignedUrl(user.profile_picture) : 'N/A';

        res.json({
            name: user.name,
            email: user.email,
            profile_picture: profilePictureUrl,
            interests
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Internal server error' });
    }
}
module.exports = {
  storeInterests,
    getUserDetails,
    updateInterests
}