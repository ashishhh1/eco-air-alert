const express = require("express");
const multer = require("multer");
const supabase = require("../config/supabase");
const { analyzeReport } = require("../services/aiEngine");
const { getEnvironmentData } = require("../services/environmentService");
const { predictSpread } = require("../services/predictionEngine");
const { generateAlertMessage } = require("../services/alertGenerator");

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

/**
 * POST /reports
 * Citizen submits a new pollution report with an image/video + location.
 */
router.post("/", upload.single("media"), async (req, res) => {
  try {
    const { user_id, category, description, lat, lng, location_name } = req.body;

    if (!lat || !lng || !category) {
      return res.status(400).json({ error: "lat, lng, and category are required" });
    }

    let mediaUrl = null;

    // 1. Upload media to Supabase Storage, if provided
    if (req.file) {
      const fileExt = req.file.originalname.split(".").pop();
      const fileName = `reports/${Date.now()}-${Math.random()
        .toString(36)
        .slice(2)}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("pollution-media")
        .upload(fileName, req.file.buffer, {
          contentType: req.file.mimetype,
        });

      if (uploadError) throw uploadError;

      const { data: publicUrlData } = supabase.storage
        .from("pollution-media")
        .getPublicUrl(fileName);

      mediaUrl = publicUrlData.publicUrl;
    }

    // 2. Insert initial report row
    const { data: report, error: insertError } = await supabase
      .from("reports")
      .insert({
        user_id: user_id || null,
        image_url: mediaUrl,
        category,
        description: description || null,
        lat: Number(lat),
        lng: Number(lng),
        location_name: location_name || null,
        status: "pending_analysis",
      })
      .select()
      .single();

    if (insertError) throw insertError;

    res.status(201).json({ report });
  } catch (err) {
    console.error("POST /reports error:", err.message);
    res.status(500).json({ error: "Failed to submit report" });
  }
});

/**
 * POST /reports/:id/analyze
 * Runs the detection engine + generates the human-readable alert message.
 */
router.post("/:id/analyze", async (req, res) => {
  try {
    const { id } = req.params;

    const { data: report, error: fetchError } = await supabase
      .from("reports")
      .select("*")
      .eq("id", id)
      .single();

    if (fetchError || !report) {
      return res.status(404).json({ error: "Report not found" });
    }

    // 1. Get environmental context (AQI + wind)
    const env = await getEnvironmentData(report.lat, report.lng);

    // 2. Run detection engine
    const detection = analyzeReport({
      category: report.category,
      description: report.description,
      currentAqi: env.aqi,
    });

    // 3. Generate human-readable alert message
    const aiMessage = await generateAlertMessage({
      category: detection.detected_type,
      locationName: report.location_name,
      lat: report.lat,
      lng: report.lng,
      windSpeed: env.wind_speed,
    });

    // 4. Update report with analysis results
    const { data: updatedReport, error: updateError } = await supabase
      .from("reports")
      .update({
        detected_type: detection.detected_type,
        confidence: detection.confidence,
        severity: detection.severity,
        ai_message: aiMessage,
        status: "analyzed",
      })
      .eq("id", id)
      .select()
      .single();

    if (updateError) throw updateError;

    res.json({ report: updatedReport, environment: env });
  } catch (err) {
    console.error("POST /reports/:id/analyze error:", err.message);
    res.status(500).json({ error: "Failed to analyze report" });
  }
});

/**
 * GET /reports/heatmap
 * Returns all active reports for map rendering.
 */
router.get("/heatmap", async (req, res) => {
  try {
    const { data: reports, error } = await supabase
      .from("reports")
      .select("id, lat, lng, category, detected_type, severity, ai_message, status, created_at")
      .neq("status", "resolved")
      .order("created_at", { ascending: false });

    if (error) throw error;

    res.json({ reports });
  } catch (err) {
    console.error("GET /reports/heatmap error:", err.message);
    res.status(500).json({ error: "Failed to fetch heatmap data" });
  }
});

/**
 * GET /reports/:id/prediction
 * Returns 24h pollution spread prediction for a specific report.
 */
router.get("/:id/prediction", async (req, res) => {
  try {
    const { id } = req.params;

    const { data: report, error } = await supabase
      .from("reports")
      .select("*")
      .eq("id", id)
      .single();

    if (error || !report) {
      return res.status(404).json({ error: "Report not found" });
    }

    const env = await getEnvironmentData(report.lat, report.lng);

    const prediction = predictSpread({
      severity: report.severity || "Low",
      windSpeed: env.wind_speed,
      windDirection: env.wind_direction,
    });

    res.json({ report_id: id, prediction, environment: env });
  } catch (err) {
    console.error("GET /reports/:id/prediction error:", err.message);
    res.status(500).json({ error: "Failed to generate prediction" });
  }
});

module.exports = router;
