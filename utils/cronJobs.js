const pool = require('../config/db');
const nodemailer = require("nodemailer");
const cron = require("node-cron");

const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD,
    },
});

async function sendWelcomeEmail(email) {
    try {
        await transporter.sendMail({
            from: process.env.EMAIL_USER,
            to: email,
            subject: "Welcome to notINSTA",
            text: "Thank you for joining notINSTA! We're excited to have you.",
        });
        console.log(`Welcome email sent to ${email}`);
    } catch (error) {
        console.error(`Error sending welcome email to ${email}:`, error);
    }
}

async function checkNewUsers() {
    try {
        console.log("Checking for new users...");

        const result = await pool.query(
            "SELECT email FROM users WHERE created_at >= NOW() - INTERVAL '1 minute'"
        );

        const newUsers = result.rows;

        if (newUsers.length > 0) {
            for (const user of newUsers) {
                await sendWelcomeEmail(user.email);
            }
        } else {
            console.log("No new users found.");
        }
    } catch (error) {
        console.error("Error checking for new users:", error);
    }
}

function startCronJobs() {
    cron.schedule("* * * * *", checkNewUsers);
    console.log("Cron job scheduled to check for new users every 1 minute.");
}

module.exports = startCronJobs;
