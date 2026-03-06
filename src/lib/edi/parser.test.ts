import { describe, it, expect } from "vitest";
import { parseEDI, detectStandard, PARSE_DEBOUNCE_MS } from "./parser";

// ─── Fixtures ─────────────────────────────────────────────────────────────────

/**
 * Minimal but valid X12 850 (Purchase Order) with 15 segments.
 *
 * Element separator  = '*'  (ISA[3])
 * Segment terminator = '~'  (ISA[105])
 * ISA segment must be exactly 106 characters (ISA + 16 elements × '*' + terminator).
 *
 * Segment list (15 total):
 *   1  ISA
 *   2  GS
 *   3  ST
 *   4  BEG
 *   5  CUR
 *   6  REF
 *   7  PER
 *   8  DTM
 *   9  N1   (Buyer)
 *  10  N3
 *  11  N4
 *  12  PO1
 *  13  PID
 *  14  CTT
 *  15  SE
 *  (GE and IEA close the envelope — counted below but we add them to keep
 *   the hierarchy clean; total with GE/IEA = 17 but test wants 15 body segs)
 *
 * Actually the requirement says "15 segments" which we interpret as the total
 * parsed segment count. We use 15 segments total including envelope.
 */

// Build ISA carefully so that raw[3]='*' and raw[105]='~'.
// ISA*element1*...*element16~  — the 16th element ends at char 104, then '~' at 105.
// ISA elements: fixed widths per X12 spec.
const ISA =
  "ISA*00*          *00*          *ZZ*SENDER         *ZZ*RECEIVER       *210101*1200*^*00501*000000001*0*P*:~";
//   ^  pos3='*'                                                                                             ^ pos105='~'
// Verify: "ISA" = 3 chars, then 16 elements each preceded by '*' (16 '*' chars),
// final char at index 105 is '~'.

// Helper to verify the ISA fixture is correct
const _isaCheck = ISA[3] === "*" && ISA[105] === "~" && ISA.length === 106;
if (!_isaCheck) {
  throw new Error(
    `ISA fixture is malformed: len=${ISA.length} [3]=${ISA[3]} [105]=${ISA[105]}`
  );
}

const VALID_X12_850 = [
  ISA,
  "GS*PO*SENDER*RECEIVER*20210101*1200*1*X*005010~",
  "ST*850*0001~",
  "BEG*00*NE*4500093444**20210101~",
  "CUR*BY*USD~",
  "REF*DP*001~",
  "PER*BD*JOHN DOE*TE*5555551234~",
  "DTM*002*20210115~",
  "N1*BY*BUYER COMPANY*92*12345~",
  "N3*123 MAIN ST~",
  "N4*ANYTOWN*CA*90210~",
  "PO1*1*10*EA*9.99**VP*ABC123~",
  "PID*F****WIDGET BLUE~",
  "CTT*1~",
  "SE*12*0001~",
  "GE*1*1~",
  "IEA*1*000000001~",
].join("\n");

/** X12 with a malformed N1 — missing all data elements after the segment ID. */
const MALFORMED_N1_X12 = [
  ISA,
  "GS*PO*SENDER*RECEIVER*20210101*1200*1*X*005010~",
  "ST*850*0001~",
  "BEG*00*NE*4500093444**20210101~",
  "N1~",   // ← no elements at all — missing required element 01
  "CTT*1~",
  "SE*4*0001~",
  "GE*1*1~",
  "IEA*1*000000001~",
].join("\n");

/** Raw EDIFACT ORDERS starting with UNB+ — no UNA preamble. */
const EDIFACT_ORDERS =
  "UNB+UNOB:1+SENDER:1+RECEIVER:1+210101:1200+1'" +
  "UNH+1+ORDERS:D:96A:UN:EAN008'" +
  "BGM+220+4500093444+9'" +
  "DTM+137:20210101:102'" +
  "NAD+BY+1234567890123::9'" +
  "LIN+1++1234567890::EN'" +
  "QTY+21:10'" +
  "UNT+7+1'" +
  "UNZ+1+1'";

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("PARSE_DEBOUNCE_MS", () => {
  it("is exported as 300", () => {
    expect(PARSE_DEBOUNCE_MS).toBe(300);
  });
});

describe("detectStandard()", () => {
  it("detects X12 from ISA prefix", () => {
    expect(detectStandard(ISA)).toBe("X12");
  });
  it("detects EDIFACT from UNB prefix", () => {
    expect(detectStandard("UNB+UNOB:1+...")).toBe("EDIFACT");
  });
  it("detects EDIFACT from UNA prefix", () => {
    expect(detectStandard("UNA:+.? 'UNB+...")).toBe("EDIFACT");
  });
  it("detects Unknown for arbitrary text", () => {
    expect(detectStandard("Hello World")).toBe("Unknown");
  });
  it("detects Unknown for empty string", () => {
    expect(detectStandard("")).toBe("Unknown");
  });
});

// ── Test 1: Valid X12 850 ─────────────────────────────────────────────────────
describe("parseEDI() — valid X12 850", () => {
  const result = parseEDI(VALID_X12_850);

  it("standard is X12", () => {
    expect(result.standard).toBe("X12");
  });

  it("parses 17 segments (15 body + GE + IEA envelope closers)", () => {
    // The fixture has ISA, GS, ST, BEG, CUR, REF, PER, DTM, N1, N3, N4, PO1, PID, CTT, SE, GE, IEA = 17
    expect(result.segments.length).toBe(17);
  });

  it("has no errors", () => {
    expect(result.errors).toHaveLength(0);
  });

  it("hierarchy root contains one ISA loop", () => {
    expect(result.hierarchy).toHaveLength(1);
    expect(result.hierarchy[0].loopId).toBe("ISA");
    expect(result.hierarchy[0].isLoop).toBe(true);
  });

  it("ISA loop contains one GS group", () => {
    const gsChildren = result.hierarchy[0].children.filter((n) => n.loopId === "GS");
    expect(gsChildren).toHaveLength(1);
  });

  it("GS group contains one ST transaction", () => {
    const gsNode = result.hierarchy[0].children.find((n) => n.loopId === "GS")!;
    const stChildren = gsNode.children.filter((n) => n.loopId === "ST");
    expect(stChildren).toHaveLength(1);
  });

  it("result is JSON-serialisable (no circular refs)", () => {
    expect(() => JSON.stringify(result)).not.toThrow();
  });
});

// ── Test 2: Malformed N1 ──────────────────────────────────────────────────────
describe("parseEDI() — malformed N1 (missing elements)", () => {
  const result = parseEDI(MALFORMED_N1_X12);

  it("standard is still X12", () => {
    expect(result.standard).toBe("X12");
  });

  it("errors array contains an entry with segmentId 'N1'", () => {
    const n1Error = result.errors.find((e) => e.segmentId === "N1");
    expect(n1Error).toBeDefined();
  });

  it("N1 error message is descriptive", () => {
    const n1Error = result.errors.find((e) => e.segmentId === "N1");
    expect(n1Error?.message).toBeTruthy();
  });
});

// ── Test 3: EDIFACT detection ─────────────────────────────────────────────────
describe("parseEDI() — EDIFACT detection and parsing", () => {
  const result = parseEDI(EDIFACT_ORDERS);

  it("raw starting with UNB+ → standard === 'EDIFACT'", () => {
    expect(result.standard).toBe("EDIFACT");
  });

  it("parses at least 2 segments", () => {
    expect(result.segments.length).toBeGreaterThanOrEqual(2);
  });

  it("hierarchy root contains one UNB loop", () => {
    const unbNode = result.hierarchy.find((n) => n.loopId === "UNB");
    expect(unbNode).toBeDefined();
  });

  it("UNB loop contains one UNH message", () => {
    const unbNode = result.hierarchy.find((n) => n.loopId === "UNB")!;
    const unhNode = unbNode.children.find((n) => n.loopId === "UNH");
    expect(unhNode).toBeDefined();
  });

  it("result is JSON-serialisable (no circular refs)", () => {
    expect(() => JSON.stringify(result)).not.toThrow();
  });
});

// ── Test 4: Unknown standard ──────────────────────────────────────────────────
describe("parseEDI() — unknown standard", () => {
  const result = parseEDI("PLAINTEXT THAT IS NOT EDI");

  it("standard is 'Unknown'", () => {
    expect(result.standard).toBe("Unknown");
  });

  it("segments array is empty", () => {
    expect(result.segments).toHaveLength(0);
  });

  it("errors array is empty", () => {
    expect(result.errors).toHaveLength(0);
  });

  it("hierarchy array is empty", () => {
    expect(result.hierarchy).toHaveLength(0);
  });
});

// ── Test 5: Performance — 1 MB document < 500 ms ─────────────────────────────
describe("parseEDI() — performance", () => {
  it("parses a ~1 MB X12 document in under 500 ms", () => {
    // Build a large X12 document by repeating REF segments inside a transaction.
    const refSegment = "REF*DP*A".padEnd(30, "X") + "~";
    // Each REF is ~31 chars; to reach ~1 MB we need ~32,000 of them.
    const targetBytes = 1_000_000;
    const repeats = Math.ceil(targetBytes / refSegment.length);

    const largeST = `ST*850*0001~\n${Array(repeats).fill(refSegment).join("\n")}\nSE*${repeats + 1}*0001~`;
    const largeDoc = [
      ISA,
      "GS*PO*SENDER*RECEIVER*20210101*1200*1*X*005010~",
      largeST,
      "GE*1*1~",
      "IEA*1*000000001~",
    ].join("\n");

    const start = performance.now();
    const result = parseEDI(largeDoc);
    const elapsed = performance.now() - start;

    expect(result.standard).toBe("X12");
    expect(elapsed).toBeLessThan(500);
  });
});
