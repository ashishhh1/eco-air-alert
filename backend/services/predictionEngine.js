/**
 * Prediction Engine
 * -----------------------------------------------------------------------
 * Simplified PHYSICAL model (not machine learning) that estimates how far
 * pollution might spread over the next few hours based on wind speed and
 * direction. Good enough for a hackathon demo heatmap animation; a real
 * system would use atmospheric dispersion modeling (e.g. Gaussian plume).
 * -----------------------------------------------------------------------
 */

const SEVERITY_BASE_RADIUS_KM = {
  Low: 0.5,
  Medium: 1,
  High: 2,
};

const TIME_STEPS_HOURS = [0.5, 1, 2, 4, 24];

/**
 * @param {Object} params
 * @param {string} params.severity - "Low" | "Medium" | "High"
 * @param {number} params.windSpeed - m/s
 * @param {number} params.windDirection - degrees (meteorological, 0=N)
 * @returns {Array<{ time_hours: number, radius_km: number, direction_deg: number }>}
 */
function predictSpread({ severity = "Low", windSpeed = 2, windDirection = 0 }) {
  const baseRadius = SEVERITY_BASE_RADIUS_KM[severity] ?? 0.5;

  return TIME_STEPS_HOURS.map((hours) => {
    // radius grows with time and wind speed (simple linear model)
    const radiusKm = Number(
      (baseRadius + windSpeed * hours * 0.15).toFixed(2)
    );
    return {
      time_hours: hours,
      radius_km: radiusKm,
      direction_deg: windDirection,
    };
  });
}

module.exports = { predictSpread };
