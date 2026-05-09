import type { SegmentDef } from './types';

// ─── X12 005010 shared segment dictionary ────────────────────────────────────
//
// Hand-curated reference for the most common segments across the supported
// transaction sets. Element positions are 1-based in the X12 spec; the array
// here is 0-indexed so `elements[0]` corresponds to ISA01, GS01, etc.
//
// Coverage in this file is intentionally pragmatic: envelope/control segments
// have full element detail; business segments have element detail for the
// fields most often validated (qualifiers, codes, dates, amounts), and looser
// AN type for free-text/free-form fields.

export const X12_SEGMENTS: Record<string, SegmentDef> = {
  // ── Envelope ──────────────────────────────────────────────────────────────
  ISA: {
    id: 'ISA',
    name: 'Interchange Control Header',
    verified: true,
    elements: [
      { name: 'Auth Info Qualifier',     required: true, type: 'ID', minLength: 2, maxLength: 2,
        codes: { '00': 'No Authorization', '03': 'Additional Data Identification' } },
      { name: 'Auth Information',        required: true, type: 'AN', minLength: 10, maxLength: 10 },
      { name: 'Security Info Qualifier', required: true, type: 'ID', minLength: 2, maxLength: 2,
        codes: { '00': 'No Security', '01': 'Password' } },
      { name: 'Security Information',    required: true, type: 'AN', minLength: 10, maxLength: 10 },
      { name: 'Sender ID Qualifier',     required: true, type: 'ID', minLength: 2, maxLength: 2 },
      { name: 'Interchange Sender ID',   required: true, type: 'AN', minLength: 15, maxLength: 15 },
      { name: 'Receiver ID Qualifier',   required: true, type: 'ID', minLength: 2, maxLength: 2 },
      { name: 'Interchange Receiver ID', required: true, type: 'AN', minLength: 15, maxLength: 15 },
      { name: 'Interchange Date',        required: true, type: 'DT', minLength: 6,  maxLength: 6 },
      { name: 'Interchange Time',        required: true, type: 'TM', minLength: 4,  maxLength: 4 },
      { name: 'Repetition Separator',    required: true, type: 'AN', minLength: 1,  maxLength: 1 },
      {
        name: 'Control Version Number', required: true, type: 'ID', minLength: 5, maxLength: 5,
        codes: {
          '00200': 'X12.5 / Version 2 Release 0',
          '00204': 'X12.5 / Version 2 Release 4',
          '00300': 'X12.6 / Version 3',
          '00301': 'X12.6 / Version 3 Release 1',
          '00400': 'Version 4 Release 0',
          '00401': 'Version 4 Release 1',
          '00402': 'Version 4 Release 2',
          '00403': 'Version 4 Release 3',
          '00404': 'Version 4 Release 4',
          '00500': 'Version 5 Release 0',
          '00501': 'Version 5 Release 1',
          '00502': 'Version 5 Release 2',
          '00600': 'Version 6 Release 0',
          '00601': 'Version 6 Release 1',
          '00602': 'Version 6 Release 2',
          '00700': 'Version 7 Release 0',
          '00701': 'Version 7 Release 1',
          '00702': 'Version 7 Release 2',
          '00800': 'Version 8 Release 0',
          '00801': 'Version 8 Release 1',
          '00802': 'Version 8 Release 2',
        },
      },
      { name: 'Interchange Control #',   required: true, type: 'N0', minLength: 9,  maxLength: 9 },
      { name: 'Ack Requested',           required: true, type: 'ID', minLength: 1,  maxLength: 1,
        codes: { '0': 'No Acknowledgment', '1': 'Acknowledgment Requested' } },
      { name: 'Usage Indicator',         required: true, type: 'ID', minLength: 1,  maxLength: 1,
        codes: { 'P': 'Production', 'T': 'Test', 'I': 'Information' } },
      { name: 'Component Element Sep',   required: true, type: 'AN', minLength: 1,  maxLength: 1 },
    ],
  },
  IEA: {
    id: 'IEA',
    name: 'Interchange Control Trailer',
    verified: true,
    elements: [
      { name: 'Functional Group Count',  required: true, type: 'N0', minLength: 1, maxLength: 5 },
      { name: 'Interchange Control #',   required: true, type: 'N0', minLength: 9, maxLength: 9 },
    ],
  },
  GS: {
    id: 'GS',
    name: 'Functional Group Header',
    verified: true,
    elements: [
      { name: 'Functional ID Code',      required: true, type: 'ID', minLength: 2, maxLength: 2 },
      { name: 'Application Sender Code', required: true, type: 'AN', minLength: 2, maxLength: 15 },
      { name: 'Application Receiver Code', required: true, type: 'AN', minLength: 2, maxLength: 15 },
      { name: 'Date',                    required: true, type: 'DT', minLength: 8, maxLength: 8 },
      { name: 'Time',                    required: true, type: 'TM', minLength: 4, maxLength: 8 },
      { name: 'Group Control #',         required: true, type: 'N0', minLength: 1, maxLength: 9 },
      { name: 'Responsible Agency Code', required: true, type: 'ID', minLength: 1, maxLength: 2,
        codes: { 'X': 'Accredited Standards Committee X12', 'T': 'TDCC' } },
      { name: 'Version Release Code',    required: true, type: 'AN', minLength: 1, maxLength: 12 },
    ],
  },
  GE: {
    id: 'GE',
    name: 'Functional Group Trailer',
    verified: true,
    elements: [
      { name: 'Number of Transactions',  required: true, type: 'N0', minLength: 1, maxLength: 6 },
      { name: 'Group Control #',         required: true, type: 'N0', minLength: 1, maxLength: 9 },
    ],
  },
  ST: {
    id: 'ST',
    name: 'Transaction Set Header',
    verified: true,
    elements: [
      { name: 'Transaction Set ID',      required: true, type: 'ID', minLength: 3, maxLength: 3 },
      { name: 'Transaction Control #',   required: true, type: 'AN', minLength: 4, maxLength: 9 },
      { name: 'Implementation Conv. Ref', required: false, type: 'AN', minLength: 1, maxLength: 35 },
    ],
  },
  SE: {
    id: 'SE',
    name: 'Transaction Set Trailer',
    verified: true,
    elements: [
      { name: 'Number of Segments',      required: true, type: 'N0', minLength: 1, maxLength: 10 },
      { name: 'Transaction Control #',   required: true, type: 'AN', minLength: 4, maxLength: 9 },
    ],
  },

  // ── Common reference / contact / date segments ────────────────────────────
  REF: {
    id: 'REF', name: 'Reference Identification',
    elements: [
      { name: 'Reference Qualifier',     required: true,  type: 'ID', minLength: 2, maxLength: 3 },
      { name: 'Reference ID',            required: false, type: 'AN', minLength: 1, maxLength: 50 },
      { name: 'Description',             required: false, type: 'AN', minLength: 1, maxLength: 80 },
      { name: 'Reference ID Composite',  required: false, type: 'AN', minLength: 0, maxLength: 0 },
    ],
  },
  PER: {
    id: 'PER', name: 'Administrative Communications Contact',
    elements: [
      { name: 'Contact Function Code',   required: true,  type: 'ID', minLength: 2, maxLength: 2 },
      { name: 'Name',                    required: false, type: 'AN', minLength: 1, maxLength: 60 },
      { name: 'Communication Qual',      required: false, type: 'ID', minLength: 2, maxLength: 2 },
      { name: 'Communication Number',    required: false, type: 'AN', minLength: 1, maxLength: 80 },
      { name: 'Communication Qual',      required: false, type: 'ID', minLength: 2, maxLength: 2 },
      { name: 'Communication Number',    required: false, type: 'AN', minLength: 1, maxLength: 80 },
      { name: 'Communication Qual',      required: false, type: 'ID', minLength: 2, maxLength: 2 },
      { name: 'Communication Number',    required: false, type: 'AN', minLength: 1, maxLength: 80 },
      { name: 'Contact Inquiry Ref',     required: false, type: 'AN', minLength: 1, maxLength: 20 },
    ],
  },
  DTM: {
    id: 'DTM', name: 'Date/Time Reference',
    elements: [
      { name: 'Date/Time Qualifier',     required: true,  type: 'ID', minLength: 3, maxLength: 3 },
      { name: 'Date',                    required: false, type: 'DT', minLength: 8, maxLength: 8 },
      { name: 'Time',                    required: false, type: 'TM', minLength: 4, maxLength: 8 },
    ],
  },
  NTE: {
    id: 'NTE', name: 'Note/Special Instruction',
    elements: [
      { name: 'Note Reference Code',     required: false, type: 'ID', minLength: 3, maxLength: 3 },
      { name: 'Description',             required: true,  type: 'AN', minLength: 1, maxLength: 80 },
    ],
  },
  MSG: {
    id: 'MSG', name: 'Message Text',
    elements: [
      { name: 'Free-Form Message Text',  required: true,  type: 'AN', minLength: 1, maxLength: 264 },
      { name: 'Printer Carriage Ctrl',   required: false, type: 'ID', minLength: 2, maxLength: 2 },
    ],
  },
  AMT: {
    id: 'AMT', name: 'Monetary Amount Information',
    elements: [
      { name: 'Amount Qualifier Code',   required: true,  type: 'ID', minLength: 1, maxLength: 3 },
      { name: 'Monetary Amount',         required: true,  type: 'R',  minLength: 1, maxLength: 18 },
      { name: 'Credit/Debit Flag',       required: false, type: 'ID', minLength: 1, maxLength: 1 },
    ],
  },
  CUR: {
    id: 'CUR', name: 'Currency',
    elements: [
      { name: 'Entity ID Code',          required: true,  type: 'ID', minLength: 2, maxLength: 3 },
      { name: 'Currency Code',           required: true,  type: 'ID', minLength: 3, maxLength: 3 },
    ],
  },
  ITD: {
    id: 'ITD', name: 'Terms of Sale / Deferred Terms',
    elements: [
      { name: 'Terms Type Code',         required: false, type: 'ID', minLength: 2, maxLength: 2 },
      { name: 'Terms Basis Date Code',   required: false, type: 'ID', minLength: 1, maxLength: 2 },
      { name: 'Terms Discount Pct',      required: false, type: 'R',  minLength: 1, maxLength: 6 },
    ],
  },
  FOB: {
    id: 'FOB', name: 'F.O.B. Related Instructions',
    elements: [
      { name: 'Shipment Method Pmt',     required: true,  type: 'ID', minLength: 2, maxLength: 2 },
      { name: 'Location Qualifier',      required: false, type: 'ID', minLength: 1, maxLength: 2 },
      { name: 'Description',             required: false, type: 'AN', minLength: 1, maxLength: 80 },
    ],
  },
  SAC: {
    id: 'SAC', name: 'Service, Promotion, Allowance, Charge',
    elements: [
      { name: 'Allowance/Charge Code',   required: true,  type: 'ID', minLength: 1, maxLength: 1 },
      { name: 'Service/Promotion Code',  required: false, type: 'ID', minLength: 4, maxLength: 4 },
    ],
  },

  // ── Address / name (N1 group) ─────────────────────────────────────────────
  N1: {
    id: 'N1', name: 'Name',
    elements: [
      { name: 'Entity Identifier Code',  required: true,  type: 'ID', minLength: 2, maxLength: 3 },
      { name: 'Name',                    required: false, type: 'AN', minLength: 1, maxLength: 60 },
      { name: 'ID Code Qualifier',       required: false, type: 'ID', minLength: 1, maxLength: 2 },
      { name: 'ID Code',                 required: false, type: 'AN', minLength: 2, maxLength: 80 },
    ],
  },
  N2: { id: 'N2', name: 'Additional Name Information', elements: [
    { name: 'Name', required: true, type: 'AN', minLength: 1, maxLength: 60 },
    { name: 'Name', required: false, type: 'AN', minLength: 1, maxLength: 60 },
  ]},
  N3: { id: 'N3', name: 'Address Information', elements: [
    { name: 'Address Information', required: true, type: 'AN', minLength: 1, maxLength: 55 },
    { name: 'Address Information', required: false, type: 'AN', minLength: 1, maxLength: 55 },
  ]},
  N4: {
    id: 'N4', name: 'Geographic Location',
    elements: [
      { name: 'City Name',               required: false, type: 'AN', minLength: 2, maxLength: 30 },
      { name: 'State/Province Code',     required: false, type: 'ID', minLength: 2, maxLength: 2 },
      { name: 'Postal Code',             required: false, type: 'ID', minLength: 3, maxLength: 15 },
      { name: 'Country Code',            required: false, type: 'ID', minLength: 2, maxLength: 3 },
    ],
  },
  N9: {
    id: 'N9', name: 'Reference Identification',
    elements: [
      { name: 'Reference ID Qualifier',  required: true,  type: 'ID', minLength: 2, maxLength: 3 },
      { name: 'Reference ID',            required: false, type: 'AN', minLength: 1, maxLength: 50 },
    ],
  },
  NM1: {
    id: 'NM1', name: 'Individual or Organizational Name',
    elements: [
      { name: 'Entity Identifier Code',  required: true,  type: 'ID', minLength: 2, maxLength: 3 },
      { name: 'Entity Type Qualifier',   required: true,  type: 'ID', minLength: 1, maxLength: 1 },
      { name: 'Name Last/Org Name',      required: false, type: 'AN', minLength: 1, maxLength: 60 },
      { name: 'Name First',              required: false, type: 'AN', minLength: 1, maxLength: 35 },
      { name: 'Name Middle',             required: false, type: 'AN', minLength: 1, maxLength: 25 },
      { name: 'Name Prefix',             required: false, type: 'AN', minLength: 1, maxLength: 10 },
      { name: 'Name Suffix',             required: false, type: 'AN', minLength: 1, maxLength: 10 },
      { name: 'ID Code Qualifier',       required: false, type: 'ID', minLength: 1, maxLength: 2 },
      { name: 'ID Code',                 required: false, type: 'AN', minLength: 2, maxLength: 80 },
    ],
  },

  // ── 850 / 855 / 856 line item area ─────────────────────────────────────────
  BEG: {
    id: 'BEG', name: 'Beginning Segment for Purchase Order',
    elements: [
      { name: 'Transaction Set Purpose', required: true, type: 'ID', minLength: 2, maxLength: 2 },
      { name: 'Purchase Order Type',     required: true, type: 'ID', minLength: 2, maxLength: 2 },
      { name: 'Purchase Order Number',   required: true, type: 'AN', minLength: 1, maxLength: 22 },
      { name: 'Release Number',          required: false, type: 'AN', minLength: 1, maxLength: 30 },
      { name: 'Date',                    required: true, type: 'DT', minLength: 8, maxLength: 8 },
    ],
  },
  BAK: {
    id: 'BAK', name: 'Beginning Segment for Purchase Order Acknowledgment',
    elements: [
      { name: 'Transaction Set Purpose', required: true, type: 'ID', minLength: 2, maxLength: 2 },
      { name: 'Acknowledgment Type',     required: true, type: 'ID', minLength: 2, maxLength: 2 },
      { name: 'Purchase Order Number',   required: true, type: 'AN', minLength: 1, maxLength: 22 },
      { name: 'Date',                    required: true, type: 'DT', minLength: 8, maxLength: 8 },
    ],
  },
  ACK: {
    id: 'ACK', name: 'Line Item Acknowledgment',
    elements: [
      { name: 'Line Item Status Code',   required: true,  type: 'ID', minLength: 2, maxLength: 2 },
      { name: 'Quantity',                required: false, type: 'R',  minLength: 1, maxLength: 15 },
      { name: 'Unit of Measure',         required: false, type: 'ID', minLength: 2, maxLength: 2 },
    ],
  },
  PO1: {
    id: 'PO1', name: 'Baseline Item Data',
    elements: [
      { name: 'Assigned Identification', required: false, type: 'AN', minLength: 1, maxLength: 20 },
      { name: 'Quantity Ordered',        required: false, type: 'R',  minLength: 1, maxLength: 15 },
      { name: 'Unit of Measure',         required: false, type: 'ID', minLength: 2, maxLength: 2 },
      { name: 'Unit Price',              required: false, type: 'R',  minLength: 1, maxLength: 17 },
      { name: 'Basis of Unit Price',     required: false, type: 'ID', minLength: 2, maxLength: 2 },
      { name: 'Product/Service Qual',    required: false, type: 'ID', minLength: 2, maxLength: 2 },
      { name: 'Product/Service ID',      required: false, type: 'AN', minLength: 1, maxLength: 48 },
    ],
  },
  PID: {
    id: 'PID', name: 'Product/Item Description',
    elements: [
      { name: 'Item Description Type',   required: true,  type: 'ID', minLength: 1, maxLength: 1 },
      { name: 'Product Characteristic',  required: false, type: 'ID', minLength: 2, maxLength: 3 },
      { name: 'Agency Qualifier Code',   required: false, type: 'ID', minLength: 1, maxLength: 3 },
      { name: 'Product Description Code', required: false, type: 'AN', minLength: 1, maxLength: 12 },
      { name: 'Description',             required: false, type: 'AN', minLength: 1, maxLength: 80 },
    ],
  },
  PO3: { id: 'PO3', name: 'Additional Item Detail', elements: [
    { name: 'Change Reason Code',  required: true,  type: 'ID', minLength: 2, maxLength: 2 },
    { name: 'Date',                required: false, type: 'DT', minLength: 8, maxLength: 8 },
  ]},
  PO4: { id: 'PO4', name: 'Item Physical Details', elements: [
    { name: 'Pack',                required: false, type: 'N0', minLength: 1, maxLength: 6 },
    { name: 'Size',                required: false, type: 'R',  minLength: 1, maxLength: 8 },
    { name: 'Unit of Measure',     required: false, type: 'ID', minLength: 2, maxLength: 2 },
  ]},
  CTP: { id: 'CTP', name: 'Pricing Information', elements: [
    { name: 'Class of Trade Code',     required: false, type: 'ID', minLength: 2, maxLength: 2 },
    { name: 'Price ID Code',           required: false, type: 'ID', minLength: 3, maxLength: 3 },
    { name: 'Unit Price',              required: false, type: 'R',  minLength: 1, maxLength: 17 },
  ]},
  CTT: {
    id: 'CTT', name: 'Transaction Totals',
    elements: [
      { name: 'Number of Line Items',    required: true,  type: 'N0', minLength: 1, maxLength: 6 },
      { name: 'Hash Total',              required: false, type: 'R',  minLength: 1, maxLength: 10 },
    ],
  },
  LIN: { id: 'LIN', name: 'Item Identification', elements: [
    { name: 'Assigned Identification', required: false, type: 'AN', minLength: 1, maxLength: 20 },
    { name: 'Product/Service Qual',    required: true,  type: 'ID', minLength: 2, maxLength: 2 },
    { name: 'Product/Service ID',      required: true,  type: 'AN', minLength: 1, maxLength: 48 },
  ]},
  SLN: { id: 'SLN', name: 'Subline Item Detail', elements: [
    { name: 'Assigned Identification', required: true,  type: 'AN', minLength: 1, maxLength: 20 },
    { name: 'Subline ID',              required: false, type: 'AN', minLength: 1, maxLength: 20 },
    { name: 'Relationship Code',       required: true,  type: 'ID', minLength: 1, maxLength: 1 },
  ]},

  // ── 856 ASN ───────────────────────────────────────────────────────────────
  BSN: {
    id: 'BSN', name: 'Beginning Segment for Ship Notice',
    elements: [
      { name: 'Transaction Set Purpose', required: true, type: 'ID', minLength: 2, maxLength: 2 },
      { name: 'Shipment Identification', required: true, type: 'AN', minLength: 2, maxLength: 30 },
      { name: 'Date',                    required: true, type: 'DT', minLength: 8, maxLength: 8 },
      { name: 'Time',                    required: true, type: 'TM', minLength: 4, maxLength: 8 },
    ],
  },
  HL: {
    id: 'HL', name: 'Hierarchical Level',
    elements: [
      { name: 'Hierarchical ID',         required: true,  type: 'AN', minLength: 1, maxLength: 12 },
      { name: 'Hierarchical Parent ID',  required: false, type: 'AN', minLength: 1, maxLength: 12 },
      { name: 'Hierarchical Level Code', required: true,  type: 'ID', minLength: 1, maxLength: 2 },
      { name: 'Hierarchical Child Code', required: false, type: 'ID', minLength: 1, maxLength: 1 },
    ],
  },
  MAN: { id: 'MAN', name: 'Marks and Numbers', elements: [
    { name: 'Marks/Numbers Qualifier', required: true,  type: 'ID', minLength: 1, maxLength: 2 },
    { name: 'Marks and Numbers',       required: true,  type: 'AN', minLength: 1, maxLength: 48 },
  ]},
  TD1: { id: 'TD1', name: 'Carrier Details (Quantity & Weight)', elements: [
    { name: 'Packaging Code',      required: false, type: 'AN', minLength: 3, maxLength: 5 },
    { name: 'Lading Quantity',     required: false, type: 'N0', minLength: 1, maxLength: 7 },
  ]},
  TD3: { id: 'TD3', name: 'Carrier Details (Equipment)', elements: [
    { name: 'Equipment Description Code', required: false, type: 'ID', minLength: 2, maxLength: 2 },
    { name: 'Equipment Initial',          required: false, type: 'AN', minLength: 1, maxLength: 4 },
    { name: 'Equipment Number',           required: false, type: 'AN', minLength: 1, maxLength: 10 },
  ]},
  TD4: { id: 'TD4', name: 'Carrier Details (Hazardous)', elements: [
    { name: 'Special Handling Code', required: false, type: 'ID', minLength: 2, maxLength: 3 },
    { name: 'Hazardous Class Qual',  required: false, type: 'ID', minLength: 1, maxLength: 1 },
  ]},
  TD5: { id: 'TD5', name: 'Carrier Details (Routing)', elements: [
    { name: 'Routing Sequence Code', required: false, type: 'ID', minLength: 1, maxLength: 2 },
    { name: 'ID Code Qualifier',     required: false, type: 'ID', minLength: 1, maxLength: 2 },
    { name: 'ID Code',               required: false, type: 'AN', minLength: 2, maxLength: 80 },
  ]},
  SN1: { id: 'SN1', name: 'Item Detail (Shipment)', elements: [
    { name: 'Assigned Identification', required: false, type: 'AN', minLength: 1, maxLength: 20 },
    { name: 'Number of Units Shipped', required: true,  type: 'R',  minLength: 1, maxLength: 15 },
    { name: 'Unit of Measure',         required: true,  type: 'ID', minLength: 2, maxLength: 2 },
  ]},
  PRF: { id: 'PRF', name: 'Purchase Order Reference', elements: [
    { name: 'Purchase Order Number', required: true, type: 'AN', minLength: 1, maxLength: 22 },
  ]},
  ATH: { id: 'ATH', name: 'Authentication', elements: [
    { name: 'Identification Code', required: true, type: 'AN', minLength: 1, maxLength: 80 },
  ]},
  MEA: { id: 'MEA', name: 'Measurements', elements: [
    { name: 'Measurement Reference', required: false, type: 'ID', minLength: 2, maxLength: 2 },
    { name: 'Measurement Qualifier', required: false, type: 'ID', minLength: 1, maxLength: 3 },
    { name: 'Measurement Value',     required: false, type: 'R',  minLength: 1, maxLength: 20 },
  ]},
  PWK: { id: 'PWK', name: 'Paperwork', elements: [
    { name: 'Report Type Code',  required: true,  type: 'ID', minLength: 2, maxLength: 2 },
    { name: 'Report Trans Code', required: false, type: 'ID', minLength: 1, maxLength: 2 },
  ]},

  // ── 810 Invoice ───────────────────────────────────────────────────────────
  BIG: {
    id: 'BIG', name: 'Beginning Segment for Invoice',
    elements: [
      { name: 'Invoice Date',            required: true,  type: 'DT', minLength: 8, maxLength: 8 },
      { name: 'Invoice Number',          required: true,  type: 'AN', minLength: 1, maxLength: 22 },
      { name: 'Purchase Order Date',     required: false, type: 'DT', minLength: 8, maxLength: 8 },
      { name: 'Purchase Order Number',   required: false, type: 'AN', minLength: 1, maxLength: 22 },
    ],
  },
  IT1: { id: 'IT1', name: 'Baseline Item Data (Invoice)', elements: [
    { name: 'Assigned Identification', required: false, type: 'AN', minLength: 1, maxLength: 20 },
    { name: 'Quantity Invoiced',       required: false, type: 'R',  minLength: 1, maxLength: 10 },
    { name: 'Unit of Measure',         required: false, type: 'ID', minLength: 2, maxLength: 2 },
    { name: 'Unit Price',              required: false, type: 'R',  minLength: 1, maxLength: 17 },
  ]},
  TDS: { id: 'TDS', name: 'Total Monetary Value Summary', elements: [
    { name: 'Total Invoice Amount', required: true,  type: 'N2', minLength: 1, maxLength: 15 },
    { name: 'Total Amount Subject', required: false, type: 'N2', minLength: 1, maxLength: 15 },
  ]},
  ITA: { id: 'ITA', name: 'Allowance, Charge or Service', elements: [
    { name: 'Allowance/Charge Code', required: true, type: 'ID', minLength: 1, maxLength: 1 },
    { name: 'Agency Qualifier Code', required: false, type: 'ID', minLength: 1, maxLength: 2 },
  ]},

  // ── 820 Payment Order / Remittance ────────────────────────────────────────
  BPR: {
    id: 'BPR', name: 'Beginning Segment for Payment Order/Remittance Advice',
    elements: [
      { name: 'Transaction Handling',    required: true,  type: 'ID', minLength: 1, maxLength: 2 },
      { name: 'Monetary Amount',         required: true,  type: 'R',  minLength: 1, maxLength: 18 },
      { name: 'Credit/Debit Flag',       required: true,  type: 'ID', minLength: 1, maxLength: 1 },
      { name: 'Payment Method Code',     required: true,  type: 'ID', minLength: 3, maxLength: 3 },
    ],
  },
  TRN: { id: 'TRN', name: 'Trace', elements: [
    { name: 'Trace Type Code', required: true, type: 'ID', minLength: 1, maxLength: 2 },
    { name: 'Reference ID',    required: true, type: 'AN', minLength: 1, maxLength: 50 },
  ]},
  RMR: { id: 'RMR', name: 'Remittance Advice Accounts Receivable Open Item Reference', elements: [
    { name: 'Reference ID Qualifier', required: true,  type: 'ID', minLength: 2, maxLength: 3 },
    { name: 'Reference ID',           required: true,  type: 'AN', minLength: 1, maxLength: 50 },
    { name: 'Payment Action Code',    required: false, type: 'ID', minLength: 2, maxLength: 2 },
    { name: 'Monetary Amount',        required: false, type: 'R',  minLength: 1, maxLength: 18 },
  ]},
  ADX: { id: 'ADX', name: 'Adjustment', elements: [
    { name: 'Monetary Amount',     required: true, type: 'R',  minLength: 1, maxLength: 18 },
    { name: 'Adjustment Reason',   required: true, type: 'ID', minLength: 2, maxLength: 2 },
  ]},

  // ── Warehouse 940 / 945 ───────────────────────────────────────────────────
  W05: { id: 'W05', name: 'Shipping Order Identification', elements: [
    { name: 'Reporting Code',           required: true,  type: 'ID', minLength: 1, maxLength: 2 },
    { name: 'Depositor Order Number',   required: true,  type: 'AN', minLength: 1, maxLength: 22 },
  ]},
  W06: { id: 'W06', name: 'Warehouse Shipment Identification', elements: [
    { name: 'Reporting Code',          required: true,  type: 'ID', minLength: 1, maxLength: 2 },
    { name: 'Depositor Order Number',  required: true,  type: 'AN', minLength: 1, maxLength: 22 },
    { name: 'Date',                    required: true,  type: 'DT', minLength: 8, maxLength: 8 },
  ]},
  W66: { id: 'W66', name: 'Warehouse Carrier Information', elements: [
    { name: 'Shipment Method',     required: true,  type: 'ID', minLength: 2, maxLength: 2 },
    { name: 'Routing Sequence',    required: false, type: 'ID', minLength: 1, maxLength: 2 },
  ]},
  W12: { id: 'W12', name: 'Item Detail For Shipment', elements: [
    { name: 'Shipment/Order Status', required: true,  type: 'ID', minLength: 2, maxLength: 2 },
    { name: 'Quantity Ordered',      required: true,  type: 'R',  minLength: 1, maxLength: 10 },
    { name: 'Quantity Shipped',      required: false, type: 'R',  minLength: 1, maxLength: 10 },
  ]},
  W27: { id: 'W27', name: 'Carrier Detail', elements: [
    { name: 'Carrier Transport Mode', required: true, type: 'ID', minLength: 1, maxLength: 2 },
    { name: 'Carrier Code',           required: true, type: 'AN', minLength: 2, maxLength: 4 },
  ]},
  W6:  { id: 'W6',  name: 'Carrier Identification', elements: [
    { name: 'Identification Code', required: false, type: 'AN', minLength: 1, maxLength: 80 },
  ]},
  W76: { id: 'W76', name: 'Total Shipment Information', elements: [
    { name: 'Number of Units Shipped', required: true,  type: 'R',  minLength: 1, maxLength: 10 },
    { name: 'Weight',                  required: false, type: 'R',  minLength: 1, maxLength: 10 },
    { name: 'Unit of Measure',         required: false, type: 'ID', minLength: 2, maxLength: 2 },
  ]},
  W03: { id: 'W03', name: 'Total Shipment Information', elements: [
    { name: 'Number of Units Received', required: true,  type: 'R',  minLength: 1, maxLength: 10 },
    { name: 'Weight',                   required: false, type: 'R',  minLength: 1, maxLength: 10 },
    { name: 'Unit of Measure',          required: false, type: 'ID', minLength: 2, maxLength: 2 },
  ]},
  G62: { id: 'G62', name: 'Date/Time', elements: [
    { name: 'Date Qualifier', required: false, type: 'ID', minLength: 2, maxLength: 2 },
    { name: 'Date',           required: false, type: 'DT', minLength: 8, maxLength: 8 },
  ]},
  G69: { id: 'G69', name: 'Line Item Detail – Description', elements: [
    { name: 'Free-Form Description', required: true, type: 'AN', minLength: 1, maxLength: 45 },
  ]},
  G61: { id: 'G61', name: 'Contact', elements: [
    { name: 'Contact Function Code', required: true, type: 'ID', minLength: 2, maxLength: 2 },
    { name: 'Name',                  required: true, type: 'AN', minLength: 1, maxLength: 60 },
  ]},
  LX:  { id: 'LX', name: 'Assigned Number', elements: [
    { name: 'Assigned Number', required: true, type: 'N0', minLength: 1, maxLength: 6 },
  ]},

  // ── 997 Functional Acknowledgment ─────────────────────────────────────────
  AK1: { id: 'AK1', name: 'Functional Group Response Header', elements: [
    { name: 'Functional ID Code', required: true,  type: 'ID', minLength: 2, maxLength: 2 },
    { name: 'Group Control #',    required: true,  type: 'N0', minLength: 1, maxLength: 9 },
  ]},
  AK2: { id: 'AK2', name: 'Transaction Set Response Header', elements: [
    { name: 'Transaction Set ID',      required: true, type: 'ID', minLength: 3, maxLength: 3 },
    { name: 'Transaction Control #',   required: true, type: 'AN', minLength: 4, maxLength: 9 },
  ]},
  AK3: { id: 'AK3', name: 'Data Segment Note', elements: [
    { name: 'Segment ID',          required: true,  type: 'ID', minLength: 2, maxLength: 3 },
    { name: 'Segment Position',    required: true,  type: 'N0', minLength: 1, maxLength: 10 },
  ]},
  AK4: { id: 'AK4', name: 'Data Element Note', elements: [
    { name: 'Position In Segment', required: true,  type: 'N0', minLength: 1, maxLength: 4 },
    { name: 'Data Element Ref',    required: false, type: 'N0', minLength: 1, maxLength: 4 },
    { name: 'Syntax Error Code',   required: false, type: 'ID', minLength: 1, maxLength: 3 },
  ]},
  AK5: { id: 'AK5', name: 'Transaction Set Response Trailer', elements: [
    { name: 'Transaction Set Ack Code', required: true, type: 'ID', minLength: 1, maxLength: 1,
      codes: { 'A': 'Accepted', 'E': 'Accepted with Errors', 'M': 'Rejected, Message Auth Error',
               'P': 'Partially Accepted', 'R': 'Rejected', 'W': 'Rejected, Assurance Failed',
               'X': 'Rejected, Content Auth Failed' } },
  ]},
  AK9: { id: 'AK9', name: 'Functional Group Response Trailer', elements: [
    { name: 'Functional Group Ack',     required: true, type: 'ID', minLength: 1, maxLength: 1,
      codes: { 'A': 'Accepted', 'E': 'Accepted with Errors', 'M': 'Rejected, Message Auth Error',
               'P': 'Partially Accepted', 'R': 'Rejected' } },
    { name: 'Number of Trans Sets',     required: true, type: 'N0', minLength: 1, maxLength: 6 },
    { name: 'Number of Received Sets',  required: true, type: 'N0', minLength: 1, maxLength: 6 },
    { name: 'Number of Accepted Sets',  required: true, type: 'N0', minLength: 1, maxLength: 6 },
  ]},

  // ── Transportation 204 / 214 ──────────────────────────────────────────────
  B2:  { id: 'B2', name: 'Beginning Segment for Shipment Information Transaction', elements: [
    { name: 'Standard Carrier Alpha',  required: false, type: 'ID', minLength: 2, maxLength: 4 },
    { name: 'Standard Point Loc Code', required: false, type: 'ID', minLength: 1, maxLength: 9 },
    { name: 'Reference ID',            required: false, type: 'AN', minLength: 1, maxLength: 30 },
  ]},
  B2A: { id: 'B2A', name: 'Set Purpose', elements: [
    { name: 'Transaction Set Purpose', required: true, type: 'ID', minLength: 2, maxLength: 2 },
    { name: 'Application Type',        required: false, type: 'ID', minLength: 2, maxLength: 2 },
  ]},
  L11: { id: 'L11', name: 'Business Instructions and Reference Number', elements: [
    { name: 'Reference ID',          required: false, type: 'AN', minLength: 1, maxLength: 50 },
    { name: 'Reference ID Qualifier', required: false, type: 'ID', minLength: 2, maxLength: 3 },
  ]},
  MS3: { id: 'MS3', name: 'Interline Information', elements: [
    { name: 'Standard Carrier Alpha', required: true, type: 'ID', minLength: 2, maxLength: 4 },
  ]},
  OID: { id: 'OID', name: 'Order Identification Detail', elements: [
    { name: 'Reference ID', required: false, type: 'AN', minLength: 1, maxLength: 30 },
  ]},
  L5:  { id: 'L5', name: 'Description, Marks and Numbers', elements: [
    { name: 'Lading Line Item #', required: false, type: 'N0', minLength: 1, maxLength: 4 },
    { name: 'Lading Description', required: false, type: 'AN', minLength: 1, maxLength: 50 },
  ]},
  AT8: { id: 'AT8', name: 'Shipment Weight, Packaging and Quantity Data', elements: [
    { name: 'Weight Qualifier',    required: false, type: 'ID', minLength: 1, maxLength: 2 },
    { name: 'Weight Unit Code',    required: false, type: 'ID', minLength: 1, maxLength: 1 },
    { name: 'Weight',              required: false, type: 'R',  minLength: 1, maxLength: 10 },
  ]},
  LH1: { id: 'LH1', name: 'Hazardous Identification Information', elements: [
    { name: 'Unit/Basis Measure', required: true, type: 'ID', minLength: 2, maxLength: 2 },
  ]},
  B10: { id: 'B10', name: 'Beginning Segment for Transportation Carrier Shipment Status', elements: [
    { name: 'Reference ID',           required: false, type: 'AN', minLength: 1, maxLength: 30 },
    { name: 'Shipment Identification', required: false, type: 'AN', minLength: 1, maxLength: 30 },
    { name: 'Standard Carrier Alpha', required: true,  type: 'ID', minLength: 2, maxLength: 4 },
  ]},
  K1:  { id: 'K1', name: 'Remarks', elements: [
    { name: 'Free-Form Message', required: true, type: 'AN', minLength: 1, maxLength: 30 },
  ]},
  MS1: { id: 'MS1', name: 'Equipment, Shipment, or Real Property Location', elements: [
    { name: 'City Name',             required: false, type: 'AN', minLength: 2, maxLength: 30 },
    { name: 'State/Province Code',   required: false, type: 'ID', minLength: 2, maxLength: 2 },
    { name: 'Country Code',          required: false, type: 'ID', minLength: 2, maxLength: 3 },
  ]},
  MS2: { id: 'MS2', name: 'Equipment or Container Owner and Type', elements: [
    { name: 'Standard Carrier Alpha', required: false, type: 'ID', minLength: 2, maxLength: 4 },
    { name: 'Equipment Initial',      required: false, type: 'AN', minLength: 1, maxLength: 4 },
    { name: 'Equipment Number',       required: false, type: 'AN', minLength: 1, maxLength: 10 },
  ]},
  AT7: { id: 'AT7', name: 'Shipment Status Details', elements: [
    { name: 'Shipment Status Code',         required: false, type: 'ID', minLength: 2, maxLength: 2 },
    { name: 'Shipment Status Reason',       required: false, type: 'ID', minLength: 3, maxLength: 3 },
    { name: 'Shipment Appointment Reason',  required: false, type: 'ID', minLength: 2, maxLength: 2 },
    { name: 'Shipment Status or Appoint Code', required: false, type: 'ID', minLength: 2, maxLength: 2 },
  ]},

  // ── Misc / line item / quantity ───────────────────────────────────────────
  QTY: { id: 'QTY', name: 'Quantity', elements: [
    { name: 'Quantity Qualifier', required: true,  type: 'ID', minLength: 2, maxLength: 2 },
    { name: 'Quantity',           required: false, type: 'R',  minLength: 1, maxLength: 15 },
  ]},
  LM:  { id: 'LM', name: 'Code Source Information', elements: [
    { name: 'Agency Qualifier Code', required: true,  type: 'ID', minLength: 1, maxLength: 2 },
    { name: 'Source Subqualifier',   required: false, type: 'AN', minLength: 1, maxLength: 15 },
  ]},
  LQ:  { id: 'LQ', name: 'Industry Code', elements: [
    { name: 'Industry Code Qualifier', required: false, type: 'ID', minLength: 1, maxLength: 3 },
    { name: 'Industry Code',           required: false, type: 'AN', minLength: 1, maxLength: 30 },
  ]},
  TXI: { id: 'TXI', name: 'Tax Information', elements: [
    { name: 'Tax Type Code',     required: true,  type: 'ID', minLength: 2, maxLength: 2 },
    { name: 'Monetary Amount',   required: false, type: 'R',  minLength: 1, maxLength: 18 },
  ]},

  // ── Beginning segments for additional transactions ───────────────────────
  BCT: { id: 'BCT', name: 'Beginning Segment for Price/Sales Catalog', elements: [
    { name: 'Catalog Purpose Code',  required: true,  type: 'ID', minLength: 2, maxLength: 2 },
    { name: 'Catalog Number',        required: false, type: 'AN', minLength: 1, maxLength: 35 },
    { name: 'Catalog Revision',      required: false, type: 'AN', minLength: 1, maxLength: 35 },
    { name: 'Date',                  required: false, type: 'DT', minLength: 8, maxLength: 8 },
  ]},
  BIA: { id: 'BIA', name: 'Beginning Segment for Inventory Inquiry/Advice', elements: [
    { name: 'Transaction Set Purpose', required: true,  type: 'ID', minLength: 2, maxLength: 2 },
    { name: 'Report Type Code',        required: true,  type: 'ID', minLength: 2, maxLength: 2 },
    { name: 'Reference Identification', required: false, type: 'AN', minLength: 1, maxLength: 30 },
    { name: 'Date',                    required: true,  type: 'DT', minLength: 8, maxLength: 8 },
  ]},
  BCH: { id: 'BCH', name: 'Beginning Segment for Purchase Order Change', elements: [
    { name: 'Transaction Set Purpose', required: true,  type: 'ID', minLength: 2, maxLength: 2 },
    { name: 'Purchase Order Type',     required: true,  type: 'ID', minLength: 2, maxLength: 2 },
    { name: 'Purchase Order Number',   required: true,  type: 'AN', minLength: 1, maxLength: 22 },
    { name: 'Release Number',          required: false, type: 'AN', minLength: 1, maxLength: 30 },
    { name: 'Change Order Sequence #', required: false, type: 'AN', minLength: 1, maxLength: 8 },
    { name: 'Date',                    required: true,  type: 'DT', minLength: 8, maxLength: 8 },
  ]},
  BCA: { id: 'BCA', name: 'Beginning Segment for Purchase Order Change Acknowledgment', elements: [
    { name: 'Transaction Set Purpose',  required: true,  type: 'ID', minLength: 2, maxLength: 2 },
    { name: 'Acknowledgment Type Code', required: true,  type: 'ID', minLength: 2, maxLength: 2 },
    { name: 'Purchase Order Type',      required: false, type: 'ID', minLength: 2, maxLength: 2 },
    { name: 'Purchase Order Number',    required: true,  type: 'AN', minLength: 1, maxLength: 22 },
    { name: 'Date',                     required: true,  type: 'DT', minLength: 8, maxLength: 8 },
  ]},
  BRA: { id: 'BRA', name: 'Beginning Segment for Receiving Advice', elements: [
    { name: 'Date',                    required: true,  type: 'DT', minLength: 8, maxLength: 8 },
    { name: 'Receiving Advice ID',     required: true,  type: 'AN', minLength: 1, maxLength: 30 },
    { name: 'Transaction Set Purpose', required: true,  type: 'ID', minLength: 2, maxLength: 2 },
    { name: 'Receiving Type Code',     required: false, type: 'ID', minLength: 2, maxLength: 2 },
  ]},
  BSR: { id: 'BSR', name: 'Beginning Segment for Order Status Report', elements: [
    { name: 'Transaction Set Purpose', required: true,  type: 'ID', minLength: 2, maxLength: 2 },
    { name: 'Reference Identification', required: false, type: 'AN', minLength: 1, maxLength: 30 },
    { name: 'Date',                    required: false, type: 'DT', minLength: 8, maxLength: 8 },
  ]},
  BFI: { id: 'BFI', name: 'Beginning Segment for Financial Information Reporting', elements: [
    { name: 'Transaction Set Purpose',  required: true,  type: 'ID', minLength: 2, maxLength: 2 },
    { name: 'Period of Calendar Code',  required: false, type: 'ID', minLength: 2, maxLength: 2 },
    { name: 'Account Type Code',        required: true,  type: 'ID', minLength: 2, maxLength: 2 },
    { name: 'Date',                     required: false, type: 'DT', minLength: 8, maxLength: 8 },
  ]},
  BFR: { id: 'BFR', name: 'Beginning Segment for Planning Schedule / Financial Return', elements: [
    { name: 'Transaction Set Purpose', required: true,  type: 'ID', minLength: 2, maxLength: 2 },
    { name: 'Forecast Order Number',   required: false, type: 'AN', minLength: 1, maxLength: 30 },
    { name: 'Release Number',          required: false, type: 'AN', minLength: 1, maxLength: 30 },
    { name: 'Schedule Type Qualifier', required: false, type: 'ID', minLength: 2, maxLength: 2 },
    { name: 'Schedule Quantity Qual',  required: false, type: 'ID', minLength: 1, maxLength: 1 },
    { name: 'Schedule Horizon Start',  required: false, type: 'DT', minLength: 8, maxLength: 8 },
    { name: 'Schedule Horizon End',    required: false, type: 'DT', minLength: 8, maxLength: 8 },
  ]},
  BDA: { id: 'BDA', name: 'Beginning Segment for Debit Authorization', elements: [
    { name: 'Transaction Set Purpose', required: true,  type: 'ID', minLength: 2, maxLength: 2 },
    { name: 'Authorization Type Code', required: true,  type: 'ID', minLength: 2, maxLength: 2 },
    { name: 'Reference Identification', required: false, type: 'AN', minLength: 1, maxLength: 30 },
    { name: 'Date',                    required: true,  type: 'DT', minLength: 8, maxLength: 8 },
  ]},
  BCD: { id: 'BCD', name: 'Beginning Segment for Account Analysis', elements: [
    { name: 'Cycle Begin Date',  required: true,  type: 'DT', minLength: 8, maxLength: 8 },
    { name: 'Cycle End Date',    required: true,  type: 'DT', minLength: 8, maxLength: 8 },
    { name: 'Reference ID',      required: false, type: 'AN', minLength: 1, maxLength: 30 },
  ]},
  // ── Common business segments referenced across transactions ──────────────
  ALD: { id: 'ALD', name: 'Allowance/Charge', elements: [
    { name: 'Allowance/Charge Indicator', required: true,  type: 'ID', minLength: 1, maxLength: 1 },
    { name: 'Service/Promotion Code',     required: false, type: 'ID', minLength: 4, maxLength: 4 },
    { name: 'Allowance/Charge Number',    required: false, type: 'AN', minLength: 1, maxLength: 12 },
    { name: 'Method of Handling Code',    required: false, type: 'ID', minLength: 2, maxLength: 2 },
  ]},
  RCD: { id: 'RCD', name: 'Receiving Conditions', elements: [
    { name: 'Quantity Received', required: false, type: 'R',  minLength: 1, maxLength: 15 },
    { name: 'Unit of Measure',   required: false, type: 'ID', minLength: 2, maxLength: 2 },
    { name: 'Receiving Cond Code', required: false, type: 'ID', minLength: 2, maxLength: 2 },
  ]},
  FST: { id: 'FST', name: 'Forecast', elements: [
    { name: 'Quantity',          required: true,  type: 'R',  minLength: 1, maxLength: 15 },
    { name: 'Forecast Qualifier', required: true, type: 'ID', minLength: 1, maxLength: 1 },
    { name: 'Forecast Timing',   required: false, type: 'ID', minLength: 1, maxLength: 1 },
    { name: 'Date',              required: false, type: 'DT', minLength: 8, maxLength: 8 },
  ]},
  SDQ: { id: 'SDQ', name: 'Destination Quantity', elements: [
    { name: 'Unit of Measure',   required: true,  type: 'ID', minLength: 2, maxLength: 2 },
    { name: 'ID Code Qualifier', required: false, type: 'ID', minLength: 1, maxLength: 2 },
  ]},
  CSH: { id: 'CSH', name: 'Sales Requirements', elements: [
    { name: 'Sales Requirement Code', required: false, type: 'ID', minLength: 1, maxLength: 2 },
    { name: 'Do Not Exceed Action',   required: false, type: 'ID', minLength: 1, maxLength: 1 },
  ]},
  DIS: { id: 'DIS', name: 'Discount Detail', elements: [
    { name: 'Discount Type Code', required: true, type: 'ID', minLength: 2, maxLength: 2 },
    { name: 'Percent',            required: false, type: 'R', minLength: 1, maxLength: 6 },
  ]},
  INC: { id: 'INC', name: 'Installment Information', elements: [
    { name: 'Terms Type Code',    required: true, type: 'ID', minLength: 2, maxLength: 2 },
    { name: 'Number of Periods',  required: true, type: 'N0', minLength: 1, maxLength: 4 },
  ]},
  LDT: { id: 'LDT', name: 'Lead Time', elements: [
    { name: 'Lead Time Code', required: true, type: 'ID', minLength: 2, maxLength: 2 },
    { name: 'Number of Periods', required: true, type: 'N0', minLength: 1, maxLength: 6 },
  ]},
  CAD: { id: 'CAD', name: 'Carrier Detail', elements: [
    { name: 'Transportation Method/Type', required: false, type: 'ID', minLength: 1, maxLength: 2 },
    { name: 'Equipment Initial',          required: false, type: 'AN', minLength: 1, maxLength: 4 },
    { name: 'Equipment Number',           required: false, type: 'AN', minLength: 1, maxLength: 10 },
    { name: 'Standard Carrier Alpha',     required: false, type: 'ID', minLength: 2, maxLength: 4 },
  ]},
  IT3: { id: 'IT3', name: 'Additional Item Data', elements: [
    { name: 'Number of Units Shipped', required: false, type: 'R', minLength: 1, maxLength: 10 },
    { name: 'Unit of Measure',         required: false, type: 'ID', minLength: 2, maxLength: 2 },
  ]},

  // ── 852 Product Activity Data ────────────────────────────────────────────
  XQ: { id: 'XQ', name: 'Reporting Period Date Range', elements: [
    { name: 'Date Period Format Qualifier', required: true, type: 'ID', minLength: 2, maxLength: 3 },
    { name: 'Date Period',                  required: true, type: 'AN', minLength: 1, maxLength: 35 },
  ]},
  GIS: { id: 'GIS', name: 'General Indicator', elements: [
    { name: 'Code', required: true, type: 'ID', minLength: 1, maxLength: 2 },
  ]},
  ZA: { id: 'ZA', name: 'Product Activity', elements: [
    { name: 'Product Activity Code', required: true, type: 'ID', minLength: 2, maxLength: 2 },
  ]},
  PRD: { id: 'PRD', name: 'Product Transfer / Resale', elements: [
    { name: 'Quantity', required: false, type: 'R', minLength: 1, maxLength: 15 },
  ]},

  // ── 824 Application Advice ───────────────────────────────────────────────
  BGN: { id: 'BGN', name: 'Beginning Segment', elements: [
    { name: 'Transaction Set Purpose', required: true,  type: 'ID', minLength: 2, maxLength: 2 },
    { name: 'Reference Identification', required: true, type: 'AN', minLength: 1, maxLength: 50 },
    { name: 'Date',                    required: true,  type: 'DT', minLength: 8, maxLength: 8 },
  ]},
  OTI: { id: 'OTI', name: 'Original Transaction Identification', elements: [
    { name: 'Application Acknowledge Code', required: true, type: 'ID', minLength: 2, maxLength: 2 },
    { name: 'Reference Identification Qualifier', required: true, type: 'ID', minLength: 2, maxLength: 3 },
    { name: 'Reference Identification', required: true, type: 'AN', minLength: 1, maxLength: 50 },
  ]},
  TED: { id: 'TED', name: 'Technical Error Description', elements: [
    { name: 'Application Error Condition Code', required: true, type: 'ID', minLength: 1, maxLength: 3 },
    { name: 'Free Form Message',               required: false, type: 'AN', minLength: 1, maxLength: 60 },
  ]},

  // ── Transport (210, 211, 215, 990) ────────────────────────────────────────
  B3: { id: 'B3', name: 'Beginning Segment for Carrier Invoice', elements: [
    { name: 'Shipment Qualifier',     required: false, type: 'ID', minLength: 1, maxLength: 1 },
    { name: 'Invoice Number',         required: true,  type: 'AN', minLength: 1, maxLength: 22 },
    { name: 'Shipment Identification', required: false, type: 'AN', minLength: 1, maxLength: 30 },
    { name: 'Standard Carrier Alpha', required: true,  type: 'ID', minLength: 2, maxLength: 4 },
  ]},
  BOL: { id: 'BOL', name: 'Beginning Segment for Bill of Lading', elements: [
    { name: 'Standard Carrier Alpha', required: false, type: 'ID', minLength: 2, maxLength: 4 },
    { name: 'Bill of Lading Number',  required: false, type: 'AN', minLength: 1, maxLength: 30 },
  ]},
  B1: { id: 'B1', name: 'Beginning Segment (Response/Booking)', elements: [
    { name: 'Standard Carrier Alpha', required: false, type: 'ID', minLength: 2, maxLength: 4 },
    { name: 'Shipment Identification', required: true, type: 'AN', minLength: 1, maxLength: 30 },
    { name: 'Date',                    required: true, type: 'DT', minLength: 8, maxLength: 8 },
  ]},
  M10: { id: 'M10', name: 'Manifest Identifying Information', elements: [
    { name: 'Standard Carrier Alpha', required: true, type: 'ID', minLength: 2, maxLength: 4 },
    { name: 'Transportation Method', required: true, type: 'ID', minLength: 1, maxLength: 2 },
  ]},
  C3: { id: 'C3', name: 'Currency', elements: [
    { name: 'Currency Code', required: true, type: 'ID', minLength: 3, maxLength: 3 },
  ]},
  L0: { id: 'L0', name: 'Line Item — Quantity and Weight', elements: [
    { name: 'Lading Line Item Number', required: false, type: 'N0', minLength: 1, maxLength: 4 },
    { name: 'Billed/Rated Quantity',   required: false, type: 'R',  minLength: 1, maxLength: 11 },
    { name: 'Weight',                  required: false, type: 'R',  minLength: 1, maxLength: 10 },
  ]},
  L1: { id: 'L1', name: 'Rate and Charges', elements: [
    { name: 'Lading Line Item Number', required: false, type: 'N0', minLength: 1, maxLength: 4 },
    { name: 'Freight Rate',            required: false, type: 'R',  minLength: 1, maxLength: 9 },
    { name: 'Charge',                  required: false, type: 'R',  minLength: 1, maxLength: 12 },
  ]},
  L3: { id: 'L3', name: 'Total Weight and Charges', elements: [
    { name: 'Weight',  required: false, type: 'R', minLength: 1, maxLength: 10 },
    { name: 'Charge',  required: false, type: 'R', minLength: 1, maxLength: 12 },
  ]},
  L4: { id: 'L4', name: 'Measurement', elements: [
    { name: 'Length', required: false, type: 'R', minLength: 1, maxLength: 8 },
  ]},
  L9: { id: 'L9', name: 'Charge Detail', elements: [
    { name: 'Special Charge Code', required: true, type: 'ID', minLength: 3, maxLength: 3 },
    { name: 'Charge',              required: true, type: 'R',  minLength: 1, maxLength: 12 },
  ]},
  R3: { id: 'R3', name: 'Route Information', elements: [
    { name: 'Standard Carrier Alpha', required: true, type: 'ID', minLength: 2, maxLength: 4 },
    { name: 'Routing Sequence Code', required: false, type: 'ID', minLength: 1, maxLength: 2 },
  ]},
  M3: { id: 'M3', name: 'Release', elements: [
    { name: 'Release Code', required: true, type: 'ID', minLength: 1, maxLength: 1 },
  ]},
  M5: { id: 'M5', name: 'Equipment Identification', elements: [
    { name: 'Standard Carrier Alpha', required: false, type: 'ID', minLength: 2, maxLength: 4 },
    { name: 'Equipment Initial',      required: false, type: 'AN', minLength: 1, maxLength: 4 },
    { name: 'Equipment Number',       required: false, type: 'AN', minLength: 1, maxLength: 10 },
  ]},
  M7: { id: 'M7', name: 'Seal Numbers', elements: [
    { name: 'Seal Number', required: true, type: 'AN', minLength: 2, maxLength: 15 },
  ]},
  M11: { id: 'M11', name: 'Manifest Bill of Lading Details', elements: [
    { name: 'Bill of Lading Number',  required: false, type: 'AN', minLength: 1, maxLength: 30 },
    { name: 'Number of Pieces',       required: false, type: 'N0', minLength: 1, maxLength: 7 },
    { name: 'Weight',                 required: false, type: 'R',  minLength: 1, maxLength: 10 },
  ]},
  M12: { id: 'M12', name: 'In-bond Identifying Information', elements: [
    { name: 'In-bond Code', required: false, type: 'ID', minLength: 2, maxLength: 2 },
  ]},
  V9: { id: 'V9', name: 'Event Detail', elements: [
    { name: 'Event Code', required: true, type: 'ID', minLength: 3, maxLength: 3 },
    { name: 'Event',      required: false, type: 'AN', minLength: 1, maxLength: 25 },
  ]},
  A4: { id: 'A4', name: 'Tender Status', elements: [
    { name: 'Tender Decision Code', required: true, type: 'ID', minLength: 1, maxLength: 1 },
  ]},
  FA1: { id: 'FA1', name: 'Type of Financial Accounting Data', elements: [
    { name: 'Agency Qualifier Code', required: true, type: 'ID', minLength: 2, maxLength: 2 },
  ]},
  X1: { id: 'X1', name: 'Export License', elements: [
    { name: 'License Number', required: false, type: 'AN', minLength: 1, maxLength: 35 },
  ]},

  // ── Warehouse (943, 944, 947) ────────────────────────────────────────────
  W17: { id: 'W17', name: 'Warehouse Receipt Identification', elements: [
    { name: 'Reporting Code',         required: true, type: 'ID', minLength: 1, maxLength: 2 },
    { name: 'Date',                   required: true, type: 'DT', minLength: 8, maxLength: 8 },
    { name: 'Warehouse Receipt #',    required: true, type: 'AN', minLength: 1, maxLength: 22 },
  ]},
  W2: { id: 'W2', name: 'Equipment Identification', elements: [
    { name: 'Equipment Initial',         required: false, type: 'AN', minLength: 1, maxLength: 4 },
    { name: 'Equipment Number',          required: false, type: 'AN', minLength: 1, maxLength: 10 },
  ]},
  W11: { id: 'W11', name: 'Receipt Item Detail', elements: [
    { name: 'Quantity Received', required: true,  type: 'R',  minLength: 1, maxLength: 10 },
    { name: 'Unit of Measure',   required: true,  type: 'ID', minLength: 2, maxLength: 2 },
  ]},
  W13: { id: 'W13', name: 'Item Detail For Adjustment', elements: [
    { name: 'Reason Code',     required: true, type: 'ID', minLength: 2, maxLength: 2 },
    { name: 'Quantity',        required: true, type: 'R',  minLength: 1, maxLength: 10 },
    { name: 'Unit of Measure', required: true, type: 'ID', minLength: 2, maxLength: 2 },
  ]},
  W14: { id: 'W14', name: 'Total Receipt Information', elements: [
    { name: 'Total Quantity Received', required: true, type: 'N0', minLength: 1, maxLength: 10 },
  ]},
  W15: { id: 'W15', name: 'Warehouse Inventory Adjustment Identification', elements: [
    { name: 'Reporting Code', required: true, type: 'ID', minLength: 1, maxLength: 2 },
    { name: 'Date',           required: true, type: 'DT', minLength: 8, maxLength: 8 },
  ]},

  // ── 894 Delivery/Return Base Record ──────────────────────────────────────
  G82: { id: 'G82', name: 'Delivery Identification', elements: [
    { name: 'Delivery/Return Code', required: true, type: 'ID', minLength: 1, maxLength: 1 },
    { name: 'Supplier Number',      required: true, type: 'AN', minLength: 2, maxLength: 10 },
    { name: 'Receivers ID Qual',    required: true, type: 'ID', minLength: 1, maxLength: 2 },
  ]},
  G83: { id: 'G83', name: 'Line Item Detail — Description', elements: [
    { name: 'Line Item Number', required: true,  type: 'N0', minLength: 1, maxLength: 6 },
    { name: 'Quantity',         required: true,  type: 'R',  minLength: 1, maxLength: 10 },
    { name: 'Unit of Measure',  required: false, type: 'ID', minLength: 2, maxLength: 2 },
  ]},
  G72: { id: 'G72', name: 'Allowances or Charges', elements: [
    { name: 'Allowance/Charge Code', required: true, type: 'ID', minLength: 1, maxLength: 1 },
    { name: 'Service/Promotion Code', required: false, type: 'ID', minLength: 4, maxLength: 4 },
  ]},
  G84: { id: 'G84', name: 'Delivery Totals', elements: [
    { name: 'Total Quantity', required: true, type: 'R', minLength: 1, maxLength: 10 },
  ]},
  G85: { id: 'G85', name: 'Delivery Hash Total', elements: [
    { name: 'Hash Total', required: true, type: 'AN', minLength: 1, maxLength: 12 },
  ]},
  G86: { id: 'G86', name: 'Signature', elements: [
    { name: 'Signature', required: true, type: 'AN', minLength: 1, maxLength: 20 },
  ]},

  // ── Financial (821, 822, 823, 827, 828) ──────────────────────────────────
  ENT: { id: 'ENT', name: 'Entity', elements: [
    { name: 'Entity Identifier Code', required: true,  type: 'ID', minLength: 2, maxLength: 3 },
    { name: 'Entity ID Qualifier',    required: false, type: 'ID', minLength: 1, maxLength: 2 },
  ]},
  ACT: { id: 'ACT', name: 'Account Identification', elements: [
    { name: 'Account Identifier',   required: true,  type: 'AN', minLength: 1, maxLength: 35 },
    { name: 'Account Type Qualifier', required: false, type: 'ID', minLength: 1, maxLength: 2 },
  ]},
  BAL: { id: 'BAL', name: 'Balance Detail', elements: [
    { name: 'Balance Type Code', required: true, type: 'ID', minLength: 1, maxLength: 2 },
    { name: 'Balance Amount',    required: true, type: 'R',  minLength: 1, maxLength: 18 },
  ]},
  BLR: { id: 'BLR', name: 'Beginning Segment for Lockbox Remittance', elements: [
    { name: 'Lockbox Number', required: true, type: 'AN', minLength: 1, maxLength: 14 },
  ]},
  BAI: { id: 'BAI', name: 'Beginning Account Identification', elements: [
    { name: 'Bank Account Number', required: true, type: 'AN', minLength: 1, maxLength: 35 },
  ]},
  BCO: { id: 'BCO', name: 'Beginning Check or Other', elements: [
    { name: 'Check Number', required: true, type: 'AN', minLength: 1, maxLength: 16 },
    { name: 'Date',         required: true, type: 'DT', minLength: 8, maxLength: 8 },
  ]},
  K3: { id: 'K3', name: 'File Information', elements: [
    { name: 'Fixed Format Information', required: true, type: 'AN', minLength: 1, maxLength: 80 },
  ]},
  IDD: { id: 'IDD', name: 'Item Detail Description', elements: [
    { name: 'Account Type Code', required: true, type: 'ID', minLength: 2, maxLength: 2 },
  ]},
  ITM: { id: 'ITM', name: 'Account Analysis Item Information', elements: [
    { name: 'Account Analysis Item', required: true, type: 'AN', minLength: 1, maxLength: 35 },
    { name: 'Quantity',              required: false, type: 'R',  minLength: 1, maxLength: 15 },
  ]},
  RAS: { id: 'RAS', name: 'Account Service Information', elements: [
    { name: 'Service Type Code', required: true, type: 'ID', minLength: 2, maxLength: 4 },
  ]},
  ACR: { id: 'ACR', name: 'Account Creditor Reference', elements: [
    { name: 'Creditor Reference', required: true, type: 'AN', minLength: 1, maxLength: 35 },
  ]},
  RAR: { id: 'RAR', name: 'Reason for Return', elements: [
    { name: 'Reason Code', required: true, type: 'ID', minLength: 2, maxLength: 2 },
  ]},
  DAU: { id: 'DAU', name: 'Debit Authorization', elements: [
    { name: 'Authorization Type', required: true, type: 'ID', minLength: 2, maxLength: 2 },
  ]},
  BAS: { id: 'BAS', name: 'Beginning Account Statement', elements: [
    { name: 'Statement Identifier', required: true, type: 'AN', minLength: 1, maxLength: 35 },
  ]},

  // ── 999 Implementation Acknowledgment ────────────────────────────────────
  IK3: { id: 'IK3', name: 'Implementation Data Segment Note', elements: [
    { name: 'Segment ID',           required: true, type: 'ID', minLength: 2, maxLength: 3 },
    { name: 'Segment Position',     required: true, type: 'N0', minLength: 1, maxLength: 10 },
  ]},
  IK4: { id: 'IK4', name: 'Implementation Data Element Note', elements: [
    { name: 'Element Position', required: true,  type: 'N0', minLength: 1, maxLength: 4 },
    { name: 'Data Element Reference', required: false, type: 'N0', minLength: 1, maxLength: 4 },
    { name: 'Element Error Code', required: false, type: 'ID', minLength: 1, maxLength: 3 },
  ]},
  IK5: { id: 'IK5', name: 'Implementation Transaction Set Response Trailer', elements: [
    { name: 'Transaction Set Ack Code', required: true, type: 'ID', minLength: 1, maxLength: 1 },
  ]},
  CTX: { id: 'CTX', name: 'Context', elements: [
    { name: 'Context Identification', required: true, type: 'AN', minLength: 1, maxLength: 35 },
  ]},
};

