const express = require('express')
const cors = require("cors");
const dotenv = require("dotenv")
const startCronJobs = require("./utils/cronJobs");

dotenv.config();
const app = express();

app.use(cors({ origin: "*", methods: "GET,HEAD,PUT,PATCH,POST,DELETE" }));
app.use(express.json());

app.use('/', require('./routes/authRoutes'));
app.use('/', require('./routes/userRoutes'));
app.use('/', require('./routes/imageRoutes'));

app.get("/", (req, res) => {
  res.send("[OK] => Server running");
});

startCronJobs();

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
