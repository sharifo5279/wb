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
    {
      name: 'Reference', required: true, type: 'AN', minLength: 1, maxLength: 70,
      versionNotes: 'C506.1154 max length was an..35 in D96A; expanded to an..70 by D04A (UN/CEFACT).',
    },
  ]},
  NAD: { id: 'NAD', name: 'Name and Address', elements: [
    { name: 'Party Function Code',    required: true,  type: 'ID', minLength: 1, maxLength: 3 },
    { name: 'Party Identification',   required: false, type: 'AN', minLength: 1, maxLength: 35 },
    { name: 'Name and Address',       required: false, type: 'AN', minLength: 1, maxLength: 35 },
    { name: 'Party Name',             required: false, type: 'AN', minLength: 1, maxLength: 35 },
    { name: 'Street',                 required: false, type: 'AN', minLength: 1, maxLength: 35 },
    { name: 'City',                   required: false, type: 'AN', minLength: 1, maxLength: 35 },
    {
      name: 'Country Subdivision',    required: false, type: 'AN', minLength: 1, maxLength: 70,
      versionNotes: 'C819 free-text "Country sub-entity name" element 3228 (an..70) added in D04A. D96A used coded sub-entity (an..9) only (UN/CEFACT).',
    },
    {
      name: 'Postal Code',            required: false, type: 'AN', minLength: 1, maxLength: 17,
      versionNotes: 'Element 3251 expanded an..9 → an..17 by D04A (UN/CEFACT).',
    },
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
    {
      name: 'Quantity Details', required: true, type: 'AN', minLength: 1, maxLength: 35,
      versionNotes: 'C186.6060 was n..15 in D96A; expanded to an..35 by D04A. C186.6411 unit code expanded an..3 → an..8 (UN/CEFACT).',
    },
  ]},
  PRI: { id: 'PRI', name: 'Price Details', elements: [
    { name: 'Price Information', required: false, type: 'AN', minLength: 1, maxLength: 35 },
    { name: 'Sub-line Price Type', required: false, type: 'ID', minLength: 1, maxLength: 3 },
  ]},
  MOA: { id: 'MOA', name: 'Monetary Amount', elements: [
    {
      name: 'Monetary Amount', required: true, type: 'AN', minLength: 1, maxLength: 35,
      versionNotes: 'C516.5004 was n..18 in D96A; expanded to an..35 by D04A (UN/CEFACT).',
    },
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

  // ── Additional message body segments ──────────────────────────────────────
  CPS: { id: 'CPS', name: 'Consignment Packing Sequence', elements: [
    { name: 'Hierarchical Structure Level', required: true, type: 'AN', minLength: 1, maxLength: 12 },
    { name: 'Hierarchical Parent ID',       required: false, type: 'AN', minLength: 1, maxLength: 12 },
  ]},
  FII: { id: 'FII', name: 'Financial Institution Information', elements: [
    { name: 'Party Function Code',  required: true,  type: 'ID', minLength: 1, maxLength: 3 },
    { name: 'Account Holder ID',    required: false, type: 'AN', minLength: 1, maxLength: 35 },
    { name: 'Institution ID',       required: false, type: 'AN', minLength: 1, maxLength: 70 },
    { name: 'Country',              required: false, type: 'ID', minLength: 2, maxLength: 3 },
  ]},
  BUS: { id: 'BUS', name: 'Business Function', elements: [
    { name: 'Business Function Code',     required: false, type: 'ID', minLength: 1, maxLength: 3 },
    { name: 'Business Description Code',  required: false, type: 'AN', minLength: 1, maxLength: 35 },
  ]},
  PAI: { id: 'PAI', name: 'Payment Instructions', elements: [
    { name: 'Payment Conditions Code', required: true, type: 'AN', minLength: 1, maxLength: 35 },
  ]},
  FCA: { id: 'FCA', name: 'Financial Charges Allocation', elements: [
    { name: 'Allocation Code', required: true, type: 'ID', minLength: 1, maxLength: 3 },
  ]},
  DOC: { id: 'DOC', name: 'Document/Message Details', elements: [
    { name: 'Document Name Code',      required: true,  type: 'ID', minLength: 1, maxLength: 3 },
    { name: 'Document Identifier',     required: false, type: 'AN', minLength: 1, maxLength: 70 },
  ]},
  ALI: { id: 'ALI', name: 'Additional Information', elements: [
    { name: 'Country of Origin',  required: false, type: 'ID', minLength: 2, maxLength: 3 },
    { name: 'Duty Regime Type',   required: false, type: 'ID', minLength: 1, maxLength: 3 },
  ]},
  GIN: { id: 'GIN', name: 'Goods Identity Number', elements: [
    { name: 'Object Identification Code Qualifier', required: true, type: 'ID', minLength: 1, maxLength: 3 },
    { name: 'Identity Number',                       required: true, type: 'AN', minLength: 1, maxLength: 35 },
  ]},
  EAN: { id: 'EAN', name: 'European Article Number', elements: [
    { name: 'EAN', required: true, type: 'AN', minLength: 1, maxLength: 35 },
  ]},
  GIR: { id: 'GIR', name: 'Related Identification Numbers', elements: [
    { name: 'Set Type Code', required: true, type: 'ID', minLength: 1, maxLength: 3 },
  ]},
  GDS: { id: 'GDS', name: 'Nature of Cargo', elements: [
    { name: 'Nature of Cargo Code', required: true, type: 'ID', minLength: 1, maxLength: 3 },
  ]},
  GID: { id: 'GID', name: 'Goods Item Details', elements: [
    { name: 'Goods Item Number', required: false, type: 'N0', minLength: 1, maxLength: 5 },
    { name: 'Number of Packages', required: false, type: 'N0', minLength: 1, maxLength: 8 },
  ]},
  DIM: { id: 'DIM', name: 'Dimensions', elements: [
    { name: 'Dimension Type Code Qualifier', required: true, type: 'ID', minLength: 1, maxLength: 3 },
  ]},
  GOR: { id: 'GOR', name: 'Governmental Requirements', elements: [
    { name: 'Transport Movement Code', required: false, type: 'ID', minLength: 1, maxLength: 3 },
  ]},
  TPL: { id: 'TPL', name: 'Transport Placement', elements: [
    { name: 'Transport Stage Code Qualifier', required: true, type: 'ID', minLength: 1, maxLength: 3 },
  ]},
  FTX: { id: 'FTX', name: 'Free Text', elements: [
    { name: 'Text Subject Code Qualifier', required: true, type: 'ID', minLength: 1, maxLength: 3 },
    { name: 'Text Function Code',           required: false, type: 'ID', minLength: 1, maxLength: 3 },
  ]},
  CNT: { id: 'CNT', name: 'Control Total', elements: [
    { name: 'Control Total Type Code Qualifier', required: true, type: 'ID', minLength: 1, maxLength: 3 },
    { name: 'Control Total Value',                required: true, type: 'R',  minLength: 1, maxLength: 18 },
  ]},
  STS: { id: 'STS', name: 'Status', elements: [
    { name: 'Status Category Code Qualifier', required: false, type: 'ID', minLength: 1, maxLength: 3 },
    { name: 'Status Description Code',         required: false, type: 'ID', minLength: 1, maxLength: 3 },
  ]},
  RCS: { id: 'RCS', name: 'Requirements and Conditions', elements: [
    { name: 'Sector / Subject Identification', required: true, type: 'ID', minLength: 1, maxLength: 3 },
  ]},
};
