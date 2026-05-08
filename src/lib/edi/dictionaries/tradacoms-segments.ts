import type { SegmentDef } from './types';

// ─── TRADACOMS shared segment dictionary ─────────────────────────────────────
//
// TRADACOMS is the UK retail EDI standard formerly maintained by GS1 UK /
// the ANA. Syntax uses TAG=ELEM1+ELEM2+ELEM3' — `=` separates the segment
// tag from the data area, `+` separates elements, and `'` terminates the
// segment. Composite sub-elements use `:`, escape character is `?`.
//
// Coverage here matches the most-deployed message types in retail (ORDHDR,
// ORDERS, INVFIL, INVOIC, ACKHDR, ACKTLR, DLHDR, DLDET) plus the envelope
// segments STX / END and batch wrappers BAT / EOB.

export const TRADACOMS_SEGMENTS: Record<string, SegmentDef> = {
  // ── Envelope ──────────────────────────────────────────────────────────────
  STX: {
    id: 'STX', name: 'Start of Transmission', verified: true,
    elements: [
      { name: 'STDS Identity (composite)', required: true,  type: 'AN', minLength: 3, maxLength: 17 },
      { name: 'From (sender, composite)', required: true,  type: 'AN', minLength: 1, maxLength: 35 },
      { name: 'To (recipient, composite)', required: true,  type: 'AN', minLength: 1, maxLength: 35 },
      { name: 'Date / Time of Transmission', required: true,  type: 'AN', minLength: 6, maxLength: 13 },
      { name: 'Transmission Sender Reference', required: true, type: 'AN', minLength: 1, maxLength: 14 },
      { name: 'Recipient Reference / Password', required: false, type: 'AN', minLength: 1, maxLength: 14 },
      { name: 'Application Reference', required: false, type: 'AN', minLength: 1, maxLength: 14 },
      { name: 'Priority Code', required: false, type: 'ID', minLength: 1, maxLength: 1 },
    ],
  },
  END: {
    id: 'END', name: 'End of Transmission', verified: true,
    elements: [
      { name: 'Number of Messages in Transmission', required: true, type: 'N0', minLength: 1, maxLength: 10 },
    ],
  },

  // ── Batch wrappers (optional) ─────────────────────────────────────────────
  BAT: {
    id: 'BAT', name: 'Batch Header',
    elements: [
      { name: 'Batch Reference',  required: true, type: 'AN', minLength: 1, maxLength: 14 },
      { name: 'Application Code', required: true, type: 'ID', minLength: 1, maxLength: 6 },
    ],
  },
  EOB: {
    id: 'EOB', name: 'End of Batch',
    elements: [
      { name: 'Number of Messages in Batch', required: true, type: 'N0', minLength: 1, maxLength: 10 },
    ],
  },

  // ── Message wrappers ──────────────────────────────────────────────────────
  MHD: {
    id: 'MHD', name: 'Message Header', verified: true,
    elements: [
      { name: 'Message Reference Number', required: true, type: 'AN', minLength: 1, maxLength: 12 },
      { name: 'Message Type / Version (composite)', required: true, type: 'AN', minLength: 5, maxLength: 14 },
    ],
  },
  MTR: {
    id: 'MTR', name: 'Message Trailer', verified: true,
    elements: [
      { name: 'Number of Segments in Message', required: true, type: 'N0', minLength: 1, maxLength: 10 },
    ],
  },

  // ── Common message body ───────────────────────────────────────────────────
  TYP: { id: 'TYP', name: 'Transaction Type', elements: [
    { name: 'Transaction Code',  required: true, type: 'AN', minLength: 1, maxLength: 4 },
    { name: 'Transaction Type',  required: true, type: 'AN', minLength: 1, maxLength: 35 },
  ]},
  SDT: { id: 'SDT', name: 'Supplier Details', elements: [
    { name: 'Supplier Identity',  required: true,  type: 'AN', minLength: 1, maxLength: 17 },
    { name: 'Supplier Name',      required: false, type: 'AN', minLength: 1, maxLength: 40 },
  ]},
  CDT: { id: 'CDT', name: 'Customer Details', elements: [
    { name: 'Customer Identity',  required: true,  type: 'AN', minLength: 1, maxLength: 17 },
    { name: 'Customer Name',      required: false, type: 'AN', minLength: 1, maxLength: 40 },
  ]},
  FIL: { id: 'FIL', name: 'File Details', elements: [
    { name: 'File Generation Number', required: true, type: 'N0', minLength: 1, maxLength: 9 },
    { name: 'File Version Number',    required: false, type: 'N0', minLength: 1, maxLength: 5 },
    { name: 'Date of File Generation', required: true, type: 'DT', minLength: 6, maxLength: 8 },
  ]},
  DNA: { id: 'DNA', name: 'Date Naming', elements: [
    { name: 'Date Naming', required: true, type: 'AN', minLength: 1, maxLength: 35 },
  ]},
  ORD: { id: 'ORD', name: 'Order References', elements: [
    { name: 'Customer Order Number', required: true,  type: 'AN', minLength: 1, maxLength: 17 },
    { name: 'Supplier Reference',    required: false, type: 'AN', minLength: 1, maxLength: 17 },
  ]},
  DLD: { id: 'DLD', name: 'Delivery Date', elements: [
    { name: 'Required Delivery Date', required: true,  type: 'DT', minLength: 6, maxLength: 8 },
    { name: 'Required Delivery Loc',  required: false, type: 'AN', minLength: 1, maxLength: 17 },
  ]},
  ITM: { id: 'ITM', name: 'Item Details', elements: [
    { name: 'Line Number',     required: true,  type: 'N0', minLength: 1, maxLength: 6 },
    { name: 'Product Code',    required: false, type: 'AN', minLength: 1, maxLength: 17 },
    { name: 'Quantity / UOM',  required: false, type: 'AN', minLength: 1, maxLength: 17 },
    { name: 'Unit Price',      required: false, type: 'R',  minLength: 1, maxLength: 12 },
  ]},
  PRI: { id: 'PRI', name: 'Price', elements: [
    { name: 'Price Indicator', required: true,  type: 'ID', minLength: 1, maxLength: 4 },
    { name: 'Unit Price',      required: true,  type: 'R',  minLength: 1, maxLength: 12 },
  ]},
  OTR: { id: 'OTR', name: 'Order Trailer', elements: [
    { name: 'Number of Item Lines', required: true, type: 'N0', minLength: 1, maxLength: 10 },
  ]},
  CLO: { id: 'CLO', name: 'Customer Location', elements: [
    { name: 'Buyer Location', required: false, type: 'AN', minLength: 1, maxLength: 17 },
  ]},
  IRF: { id: 'IRF', name: 'Invoice References', elements: [
    { name: 'Invoice Number', required: true,  type: 'AN', minLength: 1, maxLength: 17 },
    { name: 'Invoice Date',   required: false, type: 'DT', minLength: 6, maxLength: 8 },
  ]},
  ILD: { id: 'ILD', name: 'Invoice Line Details', elements: [
    { name: 'Line Number',  required: true,  type: 'N0', minLength: 1, maxLength: 6 },
    { name: 'Product Code', required: false, type: 'AN', minLength: 1, maxLength: 17 },
    { name: 'Quantity',     required: false, type: 'R',  minLength: 1, maxLength: 12 },
  ]},
  STL: { id: 'STL', name: 'Settlement Total', elements: [
    { name: 'Total Settlement', required: true, type: 'R', minLength: 1, maxLength: 14 },
  ]},
  TLR: { id: 'TLR', name: 'Total Line Records', elements: [
    { name: 'Number of Lines', required: true, type: 'N0', minLength: 1, maxLength: 10 },
  ]},
  ACK: { id: 'ACK', name: 'Acknowledgement', elements: [
    { name: 'Reference Acknowledged', required: true, type: 'AN', minLength: 1, maxLength: 14 },
    { name: 'Acknowledge Code',       required: true, type: 'ID', minLength: 1, maxLength: 4 },
  ]},
};
