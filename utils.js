// Pure business-logic functions extracted from index.html for testability.
// The HTML file remains the authoritative source; keep these in sync.

const ST = {
  regular:   { mult: 1.00 },
  afternoon: { mult: 1.17 },
  night:     { mult: 1.40 },
};

// Shift type by start hour
function detectShiftType(hour) {
  if (hour >= 6  && hour < 14) return "regular";
  if (hour >= 14 && hour < 22) return "afternoon";
  return "night";
}

// Parse "HH:MM" → total minutes
function pt(t) {
  if (!t) return 0;
  const [h, m] = t.split(":").map(Number);
  return h * 60 + (m || 0);
}

// Hours between two "HH:MM" strings; handles midnight crossing
function ch(s, e) {
  let d = pt(e) - pt(s);
  if (d <= 0) d += 1440;
  return Math.max(0, d / 60);
}

// Calculate pay breakdown for a shift
function cp(hours, type, cfg, customMultPct) {
  const { baseRate, overtimeThreshold, overtime125Hours } = cfg;
  const baseMult = customMultPct ? (customMultPct / 100) : (ST[type]?.mult || 1);
  const regH    = Math.min(hours, overtimeThreshold);
  const ot      = Math.max(0, hours - overtimeThreshold);
  const ot125H  = Math.min(ot, overtime125Hours);
  const ot150H  = Math.max(0, ot - overtime125Hours);
  const regPay   = regH   * baseRate * baseMult;
  const ot125Pay = ot125H * baseRate * baseMult * 1.25;
  const ot150Pay = ot150H * baseRate * baseMult * 1.50;
  return { regH, ot125H, ot150H, regPay, ot125Pay, ot150Pay, gross: regPay + ot125Pay + ot150Pay, hours };
}

// Sum per-shift allowances for selected IDs
function csa(ids = [], als) {
  return als
    .filter(a => a.active && a.type === "per_shift" && ids.includes(a.id))
    .reduce((s, a) => s + a.amount, 0);
}

// Sum per-month allowances
function cma(als) {
  return als
    .filter(a => a.active && a.type === "per_month")
    .reduce((s, a) => s + a.amount, 0);
}

// Calculate all deductions from gross pay
function cd(gross, c) {
  const pe = gross * c.pensionEmployee / 100;
  const pr = gross * c.pensionEmployer / 100;
  const ke = gross * c.kerenEmployee   / 100;
  const kr = gross * c.kerenEmployer   / 100;
  const bl = gross * c.bituachLeumi    / 100;
  const br = gross * c.masBriut        / 100;
  const tx = gross * c.taxRate         / 100;
  const tot = pe + ke + bl + br + tx;
  return { pe, pr, ke, kr, bl, br, tx, tot, net: gross - tot };
}

// Format hours: drops ".0" suffix
function fH(n) {
  return n.toFixed(1).replace(/\.0$/, "");
}

// Elapsed time from an ISO timestamp → "HH:MM:SS"
function elapsed(fromISO) {
  const diff = Math.floor((Date.now() - new Date(fromISO).getTime()) / 1000);
  const h = Math.floor(diff / 3600);
  const m = Math.floor((diff % 3600) / 60);
  const s = diff % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

module.exports = { detectShiftType, pt, ch, cp, csa, cma, cd, fH, elapsed };
