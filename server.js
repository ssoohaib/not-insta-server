const express = require('express')
const cors = require("cors");
const dotenv = require("dotenv")
const startCronJobs = require("./utils/cronJobs");

dotenv.config();
const app = express();

app.use(cors());
app.use(express.json());

app.use('/', require('./routes/authRoutes'));
app.use('/', require('./routes/userRoutes'));
app.use('/', require('./routes/imageRoutes'));

app.get("/", (req, res) => {
  res.send("[OK] => Server running");
});

startCronJobs();

const PORT = process.env.PORT;
app.listen(PORT, async () => console.log(`Server running on http://localhost:${PORT}`));
