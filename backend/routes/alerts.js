const express = require("express");
const supabase = require("../config/supabase");

const router = express.Router();

/**
 * GET /alerts?status=pending&sort=severity
 * Municipality view of incoming alerts.
 */
router.get("/", async (req, res) => {
  try {
    const { status } = req.query;

    let query = supabase
      .from("reports")
      .select("*")
      .in("status", ["analyzed", "resolved"]);

    if (status) {
      query = query.eq("status", status);
    }

    const { data: alerts, error } = await query;
    if (error) throw error;

    // Sort by severity (High > Medium > Low), then most recent first
    const severityRank = { High: 3, Medium: 2, Low: 1 };
    alerts.sort((a, b) => {
      const rankDiff = (severityRank[b.severity] || 0) - (severityRank[a.severity] || 0);
      if (rankDiff !== 0) return rankDiff;
      return new Date(b.created_at) - new Date(a.created_at);
    });

    res.json({ alerts });
  } catch (err) {
    console.error("GET /alerts error:", err.message);
    res.status(500).json({ error: "Failed to fetch alerts" });
  }
});

/**
 * PATCH /alerts/:id/resolve
 * Marks an alert/report as resolved.
 */
router.patch("/:id/resolve", async (req, res) => {
  try {
    const { id } = req.params;
    const { resolved_by } = req.body;

    const { data: updated, error } = await supabase
      .from("reports")
      .update({
        status: "resolved",
        resolved_by: resolved_by || null,
        resolved_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;

    res.json({ report: updated });
  } catch (err) {
    console.error("PATCH /alerts/:id/resolve error:", err.message);
    res.status(500).json({ error: "Failed to resolve alert" });
  }
});

module.exports = router;
