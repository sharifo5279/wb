import type { SegmentDescriptor } from "./types";

// ─── Segment descriptor lookup table ─────────────────────────────────────────
// minElements / maxElements count data elements AFTER the segment ID.
// 0 for maxElements means "no fixed upper limit defined".

const UNKNOWN_DESCRIPTOR: SegmentDescriptor = {
  name: "Unknown Segment",
  minElements: 0,
  maxElements: 0,
  known: false,
};

// ── X12 segment descriptors (50 entries) ─────────────────────────────────────
const X12_DESCRIPTORS: Record<string, SegmentDescriptor> = {
  ISA: { name: "Interchange Control Header",       minElements: 16, maxElements: 16, known: true },
  IEA: { name: "Interchange Control Trailer",      minElements: 2,  maxElements: 2,  known: true },
  GS:  { name: "Functional Group Header",          minElements: 8,  maxElements: 8,  known: true },
  GE:  { name: "Functional Group Trailer",         minElements: 2,  maxElements: 2,  known: true },
  ST:  { name: "Transaction Set Header",           minElements: 2,  maxElements: 3,  known: true },
  SE:  { name: "Transaction Set Trailer",          minElements: 2,  maxElements: 2,  known: true },
  BEG: { name: "Beginning Segment for PO",         minElements: 4,  maxElements: 9,  known: true },
  CUR: { name: "Currency",                         minElements: 2,  maxElements: 21, known: true },
  REF: { name: "Reference Identification",         minElements: 1,  maxElements: 4,  known: true },
  PER: { name: "Administrative Communications",    minElements: 1,  maxElements: 9,  known: true },
  TAX: { name: "Tax Reference",                    minElements: 1,  maxElements: 14, known: true },
  FOB: { name: "F.O.B. Related Instructions",      minElements: 1,  maxElements: 9,  known: true },
  CTP: { name: "Pricing Information",              minElements: 0,  maxElements: 7,  known: true },
  SAC: { name: "Service, Promotion, Allowance",    minElements: 1,  maxElements: 15, known: true },
  ITD: { name: "Terms of Sale/Deferred Terms",     minElements: 0,  maxElements: 12, known: true },
  DTM: { name: "Date/Time Reference",              minElements: 1,  maxElements: 3,  known: true },
  TD5: { name: "Carrier Details (Routing)",        minElements: 0,  maxElements: 12, known: true },
  TD3: { name: "Carrier Details (Equipment)",      minElements: 0,  maxElements: 7,  known: true },
  TD4: { name: "Carrier Details (Hazmat)",         minElements: 0,  maxElements: 4,  known: true },
  MRC: { name: "Mortgage Record Change",           minElements: 2,  maxElements: 5,  known: true },
  N1:  { name: "Name",                             minElements: 1,  maxElements: 4,  known: true },
  N2:  { name: "Additional Name Information",      minElements: 1,  maxElements: 2,  known: true },
  N3:  { name: "Address Information",              minElements: 1,  maxElements: 2,  known: true },
  N4:  { name: "Geographic Location",              minElements: 0,  maxElements: 6,  known: true },
  N9:  { name: "Reference Identification",         minElements: 1,  maxElements: 6,  known: true },
  V1:  { name: "Vessel Identification",            minElements: 0,  maxElements: 8,  known: true },
  R4:  { name: "Port or Terminal",                 minElements: 1,  maxElements: 7,  known: true },
  PO1: { name: "Baseline Item Data",               minElements: 1,  maxElements: 25, known: true },
  PO4: { name: "Item Physical Details",            minElements: 0,  maxElements: 13, known: true },
  TC2: { name: "Commodity",                        minElements: 1,  maxElements: 2,  known: true },
  PID: { name: "Product/Item Description",         minElements: 2,  maxElements: 9,  known: true },
  MEA: { name: "Measurements",                     minElements: 0,  maxElements: 6,  known: true },
  PWK: { name: "Paperwork",                        minElements: 0,  maxElements: 6,  known: true },
  PKG: { name: "Marking, Packaging, Loading",      minElements: 0,  maxElements: 6,  known: true },
  LM:  { name: "Code Source Information",          minElements: 1,  maxElements: 2,  known: true },
  LQ:  { name: "Industry Code",                    minElements: 0,  maxElements: 2,  known: true },
  SPI: { name: "Specification Identifier",         minElements: 1,  maxElements: 12, known: true },
  AMT: { name: "Monetary Amount",                  minElements: 2,  maxElements: 3,  known: true },
  SLN: { name: "Subline Item Detail",              minElements: 2,  maxElements: 21, known: true },
  SCH: { name: "Line Item Schedule",               minElements: 3,  maxElements: 7,  known: true },
  CTT: { name: "Transaction Totals",               minElements: 1,  maxElements: 2,  known: true },
  BGN: { name: "Beginning Segment",                minElements: 4,  maxElements: 9,  known: true },
  CLM: { name: "Health Claim Information",         minElements: 1,  maxElements: 15, known: true },
  SBR: { name: "Subscriber Information",           minElements: 1,  maxElements: 9,  known: true },
  HL:  { name: "Hierarchical Level",               minElements: 3,  maxElements: 4,  known: true },
  NM1: { name: "Individual or Org. Name",          minElements: 2,  maxElements: 10, known: true },
  DMG: { name: "Demographic Information",          minElements: 0,  maxElements: 7,  known: true },
  INS: { name: "Insured Benefit",                  minElements: 2,  maxElements: 17, known: true },
  DTP: { name: "Date or Time Period",              minElements: 3,  maxElements: 3,  known: true },
  QTY: { name: "Quantity",                         minElements: 1,  maxElements: 4,  known: true },
};

// ── EDIFACT segment descriptors (20 entries) ──────────────────────────────────
const EDIFACT_DESCRIPTORS: Record<string, SegmentDescriptor> = {
  UNA: { name: "Service String Advice",            minElements: 0,  maxElements: 0,  known: true },
  UNB: { name: "Interchange Header",               minElements: 4,  maxElements: 5,  known: true },
  UNZ: { name: "Interchange Trailer",              minElements: 2,  maxElements: 2,  known: true },
  UNG: { name: "Functional Group Header",          minElements: 1,  maxElements: 7,  known: true },
  UNE: { name: "Functional Group Trailer",         minElements: 2,  maxElements: 2,  known: true },
  UNH: { name: "Message Header",                   minElements: 2,  maxElements: 5,  known: true },
  UNT: { name: "Message Trailer",                  minElements: 2,  maxElements: 2,  known: true },
  BGM: { name: "Beginning of Message",             minElements: 0,  maxElements: 4,  known: true },
  DTM: { name: "Date/Time/Period",                 minElements: 1,  maxElements: 1,  known: true },
  NAD: { name: "Name and Address",                 minElements: 1,  maxElements: 9,  known: true },
  LIN: { name: "Line Item",                        minElements: 0,  maxElements: 3,  known: true },
  QTY: { name: "Quantity",                         minElements: 1,  maxElements: 1,  known: true },
  PRI: { name: "Price Details",                    minElements: 0,  maxElements: 2,  known: true },
  MOA: { name: "Monetary Amount",                  minElements: 0,  maxElements: 1,  known: true },
  TAX: { name: "Duty/Tax/Fee Details",             minElements: 0,  maxElements: 8,  known: true },
  ALC: { name: "Allowance or Charge",              minElements: 0,  maxElements: 5,  known: true },
  RFF: { name: "Reference",                        minElements: 1,  maxElements: 1,  known: true },
  LOC: { name: "Place/Location Identification",    minElements: 1,  maxElements: 4,  known: true },
  CTA: { name: "Contact Information",              minElements: 0,  maxElements: 2,  known: true },
  COM: { name: "Communication Contact",            minElements: 1,  maxElements: 1,  known: true },
};

// ─── Public lookup API ────────────────────────────────────────────────────────

export function getX12Descriptor(id: string): SegmentDescriptor {
  return X12_DESCRIPTORS[id] ?? { ...UNKNOWN_DESCRIPTOR, name: `Unknown X12 Segment (${id})` };
}

export function getEdifactDescriptor(id: string): SegmentDescriptor {
  return EDIFACT_DESCRIPTORS[id] ?? { ...UNKNOWN_DESCRIPTOR, name: `Unknown EDIFACT Segment (${id})` };
}
