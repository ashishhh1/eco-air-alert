const express = require("express");
const { getEnvironmentData } = require("../services/environmentService");

const router = express.Router();

/**
 * GET /environment/current?lat=..&lng=..
 * Returns current AQI + wind data for a location.
 */
router.get("/current", async (req, res) => {
  try {
    const { lat, lng } = req.query;

    if (!lat || !lng) {
      return res.status(400).json({ error: "lat and lng query params are required" });
    }

    const data = await getEnvironmentData(Number(lat), Number(lng));
    res.json(data);
  } catch (err) {
    console.error("GET /environment/current error:", err.message);
    res.status(500).json({ error: "Failed to fetch environment data" });
  }
});

module.exports = router;
