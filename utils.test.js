const { detectShiftType, pt, ch, cp, csa, cma, cd, fH, elapsed } = require("./utils");

// Default config matching DEF_CFG in index.html
const DEF_CFG = {
  baseRate: 34.32,
  overtimeThreshold: 8.6,
  overtime125Hours: 2,
  taxRate: 10,
  bituachLeumi: 3.5,
  masBriut: 3.1,
  pensionEmployee: 6.5,
  pensionEmployer: 6.5,
  kerenEmployee: 2.5,
  kerenEmployer: 7.5,
};

// ─────────────────────────────────────────
// detectShiftType
// ─────────────────────────────────────────
describe("detectShiftType", () => {
  test("hour 5 (before dawn) → night", () => expect(detectShiftType(5)).toBe("night"));
  test("hour 6 (boundary) → regular", () => expect(detectShiftType(6)).toBe("regular"));
  test("hour 10 → regular", () => expect(detectShiftType(10)).toBe("regular"));
  test("hour 13 → regular", () => expect(detectShiftType(13)).toBe("regular"));
  test("hour 14 (boundary) → afternoon", () => expect(detectShiftType(14)).toBe("afternoon"));
  test("hour 18 → afternoon", () => expect(detectShiftType(18)).toBe("afternoon"));
  test("hour 21 → afternoon", () => expect(detectShiftType(21)).toBe("afternoon"));
  test("hour 22 (boundary) → night", () => expect(detectShiftType(22)).toBe("night"));
  test("hour 0 (midnight) → night", () => expect(detectShiftType(0)).toBe("night"));
  test("hour 23 → night", () => expect(detectShiftType(23)).toBe("night"));
});

// ─────────────────────────────────────────
// pt — parse time string to minutes
// ─────────────────────────────────────────
describe("pt (parse time)", () => {
  test("00:00 → 0", () => expect(pt("00:00")).toBe(0));
  test("01:00 → 60", () => expect(pt("01:00")).toBe(60));
  test("08:30 → 510", () => expect(pt("08:30")).toBe(510));
  test("23:59 → 1439", () => expect(pt("23:59")).toBe(1439));
  test("null → 0", () => expect(pt(null)).toBe(0));
  test("empty string → 0", () => expect(pt("")).toBe(0));
});

// ─────────────────────────────────────────
// ch — hours between two time strings
// ─────────────────────────────────────────
describe("ch (calculate hours)", () => {
  test("09:00 → 17:00 = 8h", () => expect(ch("09:00", "17:00")).toBe(8));
  test("00:00 → 08:00 = 8h", () => expect(ch("00:00", "08:00")).toBe(8));
  test("14:30 → 22:45 = 8.25h", () => expect(ch("14:30", "22:45")).toBe(8.25));
  test("22:00 → 06:00 = 8h (midnight crossing)", () => expect(ch("22:00", "06:00")).toBe(8));
  test("23:00 → 07:00 = 8h (midnight crossing)", () => expect(ch("23:00", "07:00")).toBe(8));
  test("same start/end wraps to 24h", () => expect(ch("08:00", "08:00")).toBe(24));
});

// ─────────────────────────────────────────
// cp — pay calculation
// ─────────────────────────────────────────
describe("cp (calculate pay)", () => {
  describe("regular shift (×1.00)", () => {
    test("7h — below overtime threshold, all regular pay", () => {
      const r = cp(7, "regular", DEF_CFG);
      expect(r.regH).toBe(7);
      expect(r.ot125H).toBe(0);
      expect(r.ot150H).toBe(0);
      expect(r.gross).toBeCloseTo(7 * 34.32 * 1.00, 5);
    });

    test("8.6h — exactly at threshold, no overtime", () => {
      const r = cp(8.6, "regular", DEF_CFG);
      expect(r.regH).toBeCloseTo(8.6);
      expect(r.ot125H).toBe(0);
      expect(r.ot150H).toBe(0);
    });

    test("10h — 1.4h at 125%, no 150%", () => {
      const r = cp(10, "regular", DEF_CFG);
      expect(r.regH).toBeCloseTo(8.6);
      expect(r.ot125H).toBeCloseTo(1.4);
      expect(r.ot150H).toBe(0);
      expect(r.gross).toBeCloseTo(
        8.6 * 34.32 + 1.4 * 34.32 * 1.25,
        5
      );
    });

    test("12h — 2h at 125%, 1.4h at 150%", () => {
      const r = cp(12, "regular", DEF_CFG);
      expect(r.regH).toBeCloseTo(8.6);
      expect(r.ot125H).toBe(2);
      expect(r.ot150H).toBeCloseTo(1.4);
      expect(r.gross).toBeCloseTo(
        8.6 * 34.32 + 2 * 34.32 * 1.25 + 1.4 * 34.32 * 1.50,
        5
      );
    });
  });

  describe("night shift (×1.40)", () => {
    test("8h — below threshold, base mult applied", () => {
      const r = cp(8, "night", DEF_CFG);
      expect(r.gross).toBeCloseTo(8 * 34.32 * 1.40, 5);
    });

    test("10h — overtime compounds with night mult (1.40 × 1.25 = 1.75)", () => {
      const r = cp(10, "night", DEF_CFG);
      expect(r.gross).toBeCloseTo(
        8.6 * 34.32 * 1.40 + 1.4 * 34.32 * 1.40 * 1.25,
        5
      );
    });
  });

  describe("afternoon shift (×1.17)", () => {
    test("9h — applies 1.17 mult", () => {
      const r = cp(9, "afternoon", DEF_CFG);
      expect(r.gross).toBeCloseTo(
        8.6 * 34.32 * 1.17 + 0.4 * 34.32 * 1.17 * 1.25,
        5
      );
    });
  });

  describe("custom multiplier", () => {
    test("customMultPct=150 overrides shift type", () => {
      const r = cp(8, "regular", DEF_CFG, 150);
      expect(r.gross).toBeCloseTo(8 * 34.32 * 1.50, 5);
    });
  });

  test("0h → all zeros", () => {
    const r = cp(0, "regular", DEF_CFG);
    expect(r.gross).toBe(0);
    expect(r.regH).toBe(0);
    expect(r.ot125H).toBe(0);
    expect(r.ot150H).toBe(0);
  });

  test("returns input hours in result", () => {
    expect(cp(9, "regular", DEF_CFG).hours).toBe(9);
  });
});

// ─────────────────────────────────────────
// csa — per-shift allowances
// ─────────────────────────────────────────
describe("csa (shift allowances)", () => {
  const als = [
    { id: 1, name: "כלכלה",  type: "per_shift", amount: 16,  active: true  },
    { id: 2, name: "נסיעות", type: "per_shift", amount: 50,  active: true  },
    { id: 3, name: "ביגוד",  type: "per_shift", amount: 30,  active: false },
    { id: 4, name: "חודשי",  type: "per_month", amount: 100, active: true  },
  ];

  test("sums active per_shift allowances for matching IDs", () => {
    expect(csa([1, 2], als)).toBe(66);
  });

  test("excludes inactive allowances", () => {
    expect(csa([1, 2, 3], als)).toBe(66);
  });

  test("excludes per_month type", () => {
    expect(csa([1, 4], als)).toBe(16);
  });

  test("no matching IDs → 0", () => {
    expect(csa([99], als)).toBe(0);
  });

  test("empty IDs → 0", () => {
    expect(csa([], als)).toBe(0);
  });

  test("empty allowances list → 0", () => {
    expect(csa([1, 2], [])).toBe(0);
  });
});

// ─────────────────────────────────────────
// cma — per-month allowances
// ─────────────────────────────────────────
describe("cma (monthly allowances)", () => {
  const als = [
    { id: 1, type: "per_month", amount: 200, active: true  },
    { id: 2, type: "per_month", amount: 100, active: false },
    { id: 3, type: "per_shift", amount: 50,  active: true  },
  ];

  test("sums only active per_month allowances", () => {
    expect(cma(als)).toBe(200);
  });

  test("empty list → 0", () => {
    expect(cma([])).toBe(0);
  });
});

// ─────────────────────────────────────────
// cd — deductions
// ─────────────────────────────────────────
describe("cd (calculate deductions)", () => {
  test("computes each deduction correctly for gross=1000", () => {
    const r = cd(1000, DEF_CFG);
    expect(r.pe).toBeCloseTo(65);    // pension employee 6.5%
    expect(r.pr).toBeCloseTo(65);    // pension employer 6.5%
    expect(r.ke).toBeCloseTo(25);    // keren employee 2.5%
    expect(r.kr).toBeCloseTo(75);    // keren employer 7.5%
    expect(r.bl).toBeCloseTo(35);    // bituach leumi 3.5%
    expect(r.br).toBeCloseTo(31);    // mas briut 3.1%
    expect(r.tx).toBeCloseTo(100);   // tax 10%
  });

  test("tot = sum of employee-side deductions only (not employer)", () => {
    const r = cd(1000, DEF_CFG);
    // tot = pe + ke + bl + br + tx  (employer contributions not deducted from net)
    expect(r.tot).toBeCloseTo(65 + 25 + 35 + 31 + 100);
  });

  test("net = gross − tot", () => {
    const r = cd(1000, DEF_CFG);
    expect(r.net).toBeCloseTo(1000 - r.tot, 5);
  });

  test("gross=0 → everything is 0", () => {
    const r = cd(0, DEF_CFG);
    expect(r.gross).toBeUndefined(); // gross not in returned object
    expect(r.net).toBe(0);
    expect(r.tot).toBe(0);
  });
});

// ─────────────────────────────────────────
// fH — format hours
// ─────────────────────────────────────────
describe("fH (format hours)", () => {
  test("whole number drops .0", () => expect(fH(8)).toBe("8"));
  test("half hour keeps .5", () => expect(fH(8.5)).toBe("8.5"));
  test("0 → '0'", () => expect(fH(0)).toBe("0"));
  test("decimal kept when non-zero", () => expect(fH(1.3)).toBe("1.3"));
});

// ─────────────────────────────────────────
// elapsed — HH:MM:SS since ISO timestamp
// ─────────────────────────────────────────
describe("elapsed", () => {
  afterEach(() => jest.restoreAllMocks());

  test("1 hour elapsed → '01:00:00'", () => {
    const base = new Date("2024-01-01T10:00:00.000Z");
    jest.spyOn(Date, "now").mockReturnValue(base.getTime() + 3600 * 1000);
    expect(elapsed(base.toISOString())).toBe("01:00:00");
  });

  test("90 minutes elapsed → '01:30:00'", () => {
    const base = new Date("2024-01-01T08:00:00.000Z");
    jest.spyOn(Date, "now").mockReturnValue(base.getTime() + 90 * 60 * 1000);
    expect(elapsed(base.toISOString())).toBe("01:30:00");
  });

  test("0 seconds elapsed → '00:00:00'", () => {
    const base = new Date("2024-01-01T12:00:00.000Z");
    jest.spyOn(Date, "now").mockReturnValue(base.getTime());
    expect(elapsed(base.toISOString())).toBe("00:00:00");
  });

  test("pads single-digit hours and minutes", () => {
    const base = new Date("2024-01-01T00:00:00.000Z");
    jest.spyOn(Date, "now").mockReturnValue(base.getTime() + (1 * 3600 + 5 * 60 + 9) * 1000);
    expect(elapsed(base.toISOString())).toBe("01:05:09");
  });
});
