import type { SegmentDef } from './types';

// ─── EDIFACT D01B shared segment dictionary ──────────────────────────────────
//
// EDIFACT segment composition is more complex than X12 (heavy use of composite
// elements). Element entries here represent the position-ordered composites
// as the parser sees them — each composite is treated as a single AN element
// for length/required validation. Sub-element decomposition is a Phase 5 task.

export const EDIFACT_SEGMENTS: Record<string, SegmentDef> = {
  // ── Service / envelope ──────────────────────────────────────────────────
  UNA: { id: 'UNA', name: 'Service String Advice', verified: true, elements: [] },
  UNB: {
    id: 'UNB', name: 'Interchange Header', verified: true,
    elements: [
      { name: 'Syntax Identifier',       required: true, type: 'AN', minLength: 4, maxLength: 17 },
      { name: 'Interchange Sender',      required: true, type: 'AN', minLength: 1, maxLength: 35 },
      { name: 'Interchange Recipient',   required: true, type: 'AN', minLength: 1, maxLength: 35 },
      { name: 'Date/Time of Preparation', required: true, type: 'AN', minLength: 9, maxLength: 13 },
      { name: 'Interchange Control Ref', required: true, type: 'AN', minLength: 1, maxLength: 14 },
    ],
  },
  UNZ: {
    id: 'UNZ', name: 'Interchange Trailer', verified: true,
    elements: [
      { name: 'Interchange Control Cnt', required: true, type: 'N0', minLength: 1, maxLength: 6 },
      { name: 'Interchange Control Ref', required: true, type: 'AN', minLength: 1, maxLength: 14 },
    ],
  },
  UNG: {
    id: 'UNG', name: 'Functional Group Header', verified: true,
    elements: [
      { name: 'Message Group Identifier', required: true, type: 'AN', minLength: 1, maxLength: 6 },
      { name: 'Application Sender',       required: true, type: 'AN', minLength: 1, maxLength: 35 },
      { name: 'Application Recipient',    required: true, type: 'AN', minLength: 1, maxLength: 35 },
      { name: 'Date/Time of Preparation', required: true, type: 'AN', minLength: 9, maxLength: 13 },
      { name: 'Group Reference Number',   required: true, type: 'AN', minLength: 1, maxLength: 14 },
      { name: 'Controlling Agency',       required: true, type: 'AN', minLength: 1, maxLength: 3 },
      { name: 'Message Version',          required: true, type: 'AN', minLength: 1, maxLength: 35 },
    ],
  },
  UNE: {
    id: 'UNE', name: 'Functional Group Trailer', verified: true,
    elements: [
      { name: 'Number of Messages',       required: true, type: 'N0', minLength: 1, maxLength: 6 },
      { name: 'Group Reference Number',   required: true, type: 'AN', minLength: 1, maxLength: 14 },
    ],
  },
  UNH: {
    id: 'UNH', name: 'Message Header', verified: true,
    elements: [
      { name: 'Message Reference Number', required: true, type: 'AN', minLength: 1, maxLength: 14 },
      { name: 'Message Identifier',       required: true, type: 'AN', minLength: 1, maxLength: 35 },
    ],
  },
  UNT: {
    id: 'UNT', name: 'Message Trailer', verified: true,
    elements: [
      { name: 'Number of Segments',       required: true, type: 'N0', minLength: 1, maxLength: 10 },
      { name: 'Message Reference Number', required: true, type: 'AN', minLength: 1, maxLength: 14 },
    ],
  },

  // ── Common message body ─────────────────────────────────────────────────
  BGM: { id: 'BGM', name: 'Beginning of Message', elements: [
    { name: 'Document/Message Name', required: false, type: 'AN', minLength: 1, maxLength: 17 },
    { name: 'Document/Message Number', required: false, type: 'AN', minLength: 1, maxLength: 35 },
    { name: 'Message Function Code', required: false, type: 'ID', minLength: 1, maxLength: 3 },
  ]},
  DTM: { id: 'DTM', name: 'Date/Time/Period', elements: [
    { name: 'Date/Time/Period', required: true, type: 'AN', minLength: 1, maxLength: 35 },
  ]},
  RFF: { id: 'RFF', name: 'Reference', elements: [
    { name: 'Reference', required: true, type: 'AN', minLength: 1, maxLength: 35 },
  ]},
  NAD: { id: 'NAD', name: 'Name and Address', elements: [
    { name: 'Party Function Code',    required: true,  type: 'ID', minLength: 1, maxLength: 3 },
    { name: 'Party Identification',   required: false, type: 'AN', minLength: 1, maxLength: 35 },
    { name: 'Name and Address',       required: false, type: 'AN', minLength: 1, maxLength: 35 },
    { name: 'Party Name',             required: false, type: 'AN', minLength: 1, maxLength: 35 },
    { name: 'Street',                 required: false, type: 'AN', minLength: 1, maxLength: 35 },
    { name: 'City',                   required: false, type: 'AN', minLength: 1, maxLength: 35 },
    { name: 'Country Subdivision',    required: false, type: 'AN', minLength: 1, maxLength: 9 },
    { name: 'Postal Code',            required: false, type: 'AN', minLength: 1, maxLength: 17 },
    { name: 'Country',                required: false, type: 'ID', minLength: 1, maxLength: 3 },
  ]},
  CTA: { id: 'CTA', name: 'Contact Information', elements: [
    { name: 'Contact Function Code', required: false, type: 'ID', minLength: 1, maxLength: 3 },
    { name: 'Contact Information',   required: false, type: 'AN', minLength: 1, maxLength: 35 },
  ]},
  COM: { id: 'COM', name: 'Communication Contact', elements: [
    { name: 'Communication Contact', required: true, type: 'AN', minLength: 1, maxLength: 512 },
  ]},
  LIN: { id: 'LIN', name: 'Line Item', elements: [
    { name: 'Line Item Number', required: false, type: 'N0', minLength: 1, maxLength: 6 },
    { name: 'Action Request',   required: false, type: 'ID', minLength: 1, maxLength: 3 },
    { name: 'Item Number ID',   required: false, type: 'AN', minLength: 1, maxLength: 35 },
  ]},
  PIA: { id: 'PIA', name: 'Additional Product Identification', elements: [
    { name: 'Product ID Function Code', required: true, type: 'ID', minLength: 1, maxLength: 3 },
    { name: 'Item Number ID',           required: true, type: 'AN', minLength: 1, maxLength: 35 },
  ]},
  IMD: { id: 'IMD', name: 'Item Description', elements: [
    { name: 'Description Format Code', required: false, type: 'ID', minLength: 1, maxLength: 3 },
    { name: 'Item Description',        required: false, type: 'AN', minLength: 1, maxLength: 35 },
  ]},
  QTY: { id: 'QTY', name: 'Quantity', elements: [
    { name: 'Quantity Details', required: true, type: 'AN', minLength: 1, maxLength: 35 },
  ]},
  PRI: { id: 'PRI', name: 'Price Details', elements: [
    { name: 'Price Information', required: false, type: 'AN', minLength: 1, maxLength: 35 },
    { name: 'Sub-line Price Type', required: false, type: 'ID', minLength: 1, maxLength: 3 },
  ]},
  MOA: { id: 'MOA', name: 'Monetary Amount', elements: [
    { name: 'Monetary Amount', required: true, type: 'AN', minLength: 1, maxLength: 35 },
  ]},
  TAX: { id: 'TAX', name: 'Duty/Tax/Fee Details', elements: [
    { name: 'Duty Tax Fee Function', required: false, type: 'ID', minLength: 1, maxLength: 3 },
    { name: 'Duty Tax Fee Type',     required: false, type: 'AN', minLength: 1, maxLength: 35 },
  ]},
  ALC: { id: 'ALC', name: 'Allowance or Charge', elements: [
    { name: 'Allowance/Charge Code', required: true,  type: 'ID', minLength: 1, maxLength: 3 },
    { name: 'Allowance/Charge ID',   required: false, type: 'AN', minLength: 1, maxLength: 35 },
  ]},
  LOC: { id: 'LOC', name: 'Place/Location Identification', elements: [
    { name: 'Location Function Code', required: true,  type: 'ID', minLength: 1, maxLength: 3 },
    { name: 'Location ID',            required: false, type: 'AN', minLength: 1, maxLength: 35 },
  ]},
  PAC: { id: 'PAC', name: 'Package', elements: [
    { name: 'Number of Packages', required: false, type: 'N0', minLength: 1, maxLength: 8 },
    { name: 'Packaging Details',  required: false, type: 'AN', minLength: 1, maxLength: 35 },
  ]},
  PCD: { id: 'PCD', name: 'Percentage Details', elements: [
    { name: 'Percentage Details', required: true, type: 'AN', minLength: 1, maxLength: 35 },
  ]},
  TDT: { id: 'TDT', name: 'Details of Transport', elements: [
    { name: 'Transport Stage Code',  required: true,  type: 'ID', minLength: 1, maxLength: 3 },
    { name: 'Means of Transport ID', required: false, type: 'AN', minLength: 1, maxLength: 17 },
  ]},
  EQD: { id: 'EQD', name: 'Equipment Details', elements: [
    { name: 'Equipment Type Qualifier', required: true,  type: 'ID', minLength: 1, maxLength: 3 },
    { name: 'Equipment Identification', required: false, type: 'AN', minLength: 1, maxLength: 17 },
  ]},
  UCI: { id: 'UCI', name: 'Interchange Response', elements: [
    { name: 'Interchange Control Reference', required: true,  type: 'AN', minLength: 1, maxLength: 14 },
    { name: 'Interchange Sender/Recipient',  required: true,  type: 'AN', minLength: 1, maxLength: 35 },
    { name: 'Action Code',                   required: false, type: 'ID', minLength: 1, maxLength: 3 },
  ]},
  UCM: { id: 'UCM', name: 'Message Response', elements: [
    { name: 'Message Reference Number', required: false, type: 'AN', minLength: 1, maxLength: 14 },
    { name: 'Message Identifier',       required: false, type: 'AN', minLength: 1, maxLength: 35 },
    { name: 'Action Code',              required: false, type: 'ID', minLength: 1, maxLength: 3 },
  ]},
};
