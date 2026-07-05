const express = require("express");
const cors = require("cors");
require("dotenv").config();

const reportsRouter = require("./routes/reports");
const environmentRouter = require("./routes/environment");
const alertsRouter = require("./routes/alerts");

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// Health check
app.get("/", (req, res) => {
  res.json({ status: "ok", service: "Pollution Guardian AI backend" });
});

// Routes
app.use("/reports", reportsRouter);
app.use("/environment", environmentRouter);
app.use("/alerts", alertsRouter);

// Fallback 404 handler
app.use((req, res) => {
  res.status(404).json({ error: "Route not found" });
});

app.listen(PORT, () => {
  console.log(`Pollution Guardian AI backend running on port ${PORT}`);
});
