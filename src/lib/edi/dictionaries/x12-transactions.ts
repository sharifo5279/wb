import type { TransactionDef } from './types';

// ─── X12 005010 transaction sets ─────────────────────────────────────────────
//
// Phase 2: segment-level coverage for the verticals listed in the plan
// (Supply Chain, Logistics, Retail, CPG, Manufacturing, Grocery & Cold Chain,
// Financial Services, plus 997/999 acks).
//
// `full: true` means the segment list is hand-curated and validated.
// `full: false` is a stub placeholder — the transaction is recognized but no
// segment list yet. The Coverage page surfaces this distinction.
//
// `segments` covers the body of the transaction set (between ST and SE),
// including ST and SE themselves. Envelope segments (ISA/GS/IEA/GE) are
// validated separately by the parser.

const STD = 'X12' as const;
const VER = '005010';

/** Helper to keep entries terse. */
function sr(id: string, required: boolean, maxUse: number = 1) {
  return { id, required, maxUse };
}

export const X12_TRANSACTIONS: Record<string, TransactionDef> = {
  // ── Supply Chain / Retail / CPG / Grocery / Cold Chain ───────────────────
  '810': {
    code: '810', standard: STD, version: VER, full: true,
    name: 'Invoice', industry: 'Supply Chain / Retail / CPG',
    segments: [
      sr('ST', true), sr('BIG', true), sr('NTE', false, -1), sr('CUR', false),
      sr('REF', false, -1), sr('PER', false, -1), sr('ITD', false, -1),
      sr('DTM', false, -1), sr('FOB', false), sr('N1', false, -1),
      sr('N2', false, -1), sr('N3', false, -1), sr('N4', false, -1),
      sr('IT1', false, -1), sr('PID', false, -1), sr('TXI', false, -1),
      sr('SAC', false, -1), sr('TDS', true), sr('AMT', false, -1),
      sr('CTT', false), sr('SE', true),
    ],
  },
  '820': {
    code: '820', standard: STD, version: VER, full: true,
    name: 'Payment Order / Remittance Advice', industry: 'Financial Services',
    segments: [
      sr('ST', true), sr('BPR', true), sr('TRN', false), sr('CUR', false),
      sr('REF', false, -1), sr('DTM', false, -1), sr('N1', false, -1),
      sr('N3', false, -1), sr('N4', false, -1), sr('RMR', false, -1),
      sr('REF', false, -1), sr('DTM', false, -1), sr('ADX', false, -1),
      sr('NTE', false, -1), sr('SE', true),
    ],
  },
  '824': {
    code: '824', standard: STD, version: VER, full: false,
    name: 'Application Advice', industry: 'Supply Chain',
    segments: [],
  },
  '830': {
    code: '830', standard: STD, version: VER, full: false,
    name: 'Planning Schedule with Release Capability', industry: 'Manufacturing / Supply Chain',
    segments: [],
  },
  '832': {
    code: '832', standard: STD, version: VER, full: false,
    name: 'Price/Sales Catalog', industry: 'Retail / CPG',
    segments: [],
  },
  '846': {
    code: '846', standard: STD, version: VER, full: false,
    name: 'Inventory Inquiry / Advice', industry: 'Retail / CPG / Manufacturing',
    segments: [],
  },
  '850': {
    code: '850', standard: STD, version: VER, full: true,
    name: 'Purchase Order', industry: 'Supply Chain / Retail / CPG / Manufacturing',
    segments: [
      sr('ST', true), sr('BEG', true), sr('CUR', false), sr('REF', false, -1),
      sr('PER', false, -1), sr('FOB', false, -1), sr('SAC', false, -1),
      sr('ITD', false, -1), sr('DTM', false, -1), sr('NTE', false, -1),
      sr('N1', false, -1), sr('N2', false, -1), sr('N3', false, -1),
      sr('N4', false, -1), sr('PO1', false, -1), sr('PID', false, -1),
      sr('PO3', false, -1), sr('PO4', false, -1), sr('CTP', false, -1),
      sr('SAC', false, -1), sr('AMT', false, -1), sr('LIN', false, -1),
      sr('SLN', false, -1), sr('MEA', false, -1), sr('PWK', false, -1),
      sr('CTT', true), sr('AMT', false, -1), sr('SE', true),
    ],
  },
  '852': {
    code: '852', standard: STD, version: VER, full: false,
    name: 'Product Activity Data', industry: 'Retail / CPG',
    segments: [],
  },
  '855': {
    code: '855', standard: STD, version: VER, full: true,
    name: 'Purchase Order Acknowledgment', industry: 'Supply Chain / Retail / CPG',
    segments: [
      sr('ST', true), sr('BAK', true), sr('CUR', false), sr('REF', false, -1),
      sr('PER', false, -1), sr('DTM', false, -1), sr('FOB', false, -1),
      sr('NTE', false, -1), sr('N1', false, -1), sr('N3', false, -1),
      sr('N4', false, -1), sr('PO1', false, -1), sr('ACK', false, -1),
      sr('PID', false, -1), sr('PWK', false, -1), sr('CTT', false), sr('SE', true),
    ],
  },
  '856': {
    code: '856', standard: STD, version: VER, full: true,
    name: 'Ship Notice / Manifest (ASN)', industry: 'Supply Chain / Logistics',
    segments: [
      sr('ST', true), sr('BSN', true), sr('DTM', false, -1), sr('HL', true, -1),
      sr('LIN', false, -1), sr('SN1', false, -1), sr('PRF', false, -1),
      sr('REF', false, -1), sr('N1', false, -1), sr('N3', false, -1),
      sr('N4', false, -1), sr('TD1', false, -1), sr('TD3', false, -1),
      sr('TD4', false, -1), sr('TD5', false, -1), sr('MAN', false, -1),
      sr('PID', false, -1), sr('MEA', false, -1), sr('PWK', false, -1),
      sr('PO4', false, -1), sr('ATH', false, -1), sr('CTT', true), sr('SE', true),
    ],
  },
  '860': {
    code: '860', standard: STD, version: VER, full: false,
    name: 'Purchase Order Change Request - Buyer Initiated', industry: 'Supply Chain',
    segments: [],
  },
  '861': {
    code: '861', standard: STD, version: VER, full: false,
    name: 'Receiving Advice / Acceptance Certificate', industry: 'Supply Chain / Logistics',
    segments: [],
  },
  '865': {
    code: '865', standard: STD, version: VER, full: false,
    name: 'Purchase Order Change Acknowledgment - Seller Initiated', industry: 'Supply Chain',
    segments: [],
  },
  '869': {
    code: '869', standard: STD, version: VER, full: false,
    name: 'Order Status Inquiry', industry: 'Supply Chain',
    segments: [],
  },
  '870': {
    code: '870', standard: STD, version: VER, full: false,
    name: 'Order Status Report', industry: 'Supply Chain',
    segments: [],
  },
  '875': {
    code: '875', standard: STD, version: VER, full: false,
    name: 'Grocery Products Purchase Order', industry: 'Grocery / Cold Chain',
    segments: [],
  },
  '876': {
    code: '876', standard: STD, version: VER, full: false,
    name: 'Grocery Products Purchase Order Change', industry: 'Grocery / Cold Chain',
    segments: [],
  },
  '880': {
    code: '880', standard: STD, version: VER, full: false,
    name: 'Grocery Products Invoice', industry: 'Grocery / Cold Chain',
    segments: [],
  },
  '894': {
    code: '894', standard: STD, version: VER, full: false,
    name: 'Delivery / Return Base Record', industry: 'Grocery / Cold Chain',
    segments: [],
  },

  // ── Logistics / Transportation ───────────────────────────────────────────
  '204': {
    code: '204', standard: STD, version: VER, full: true,
    name: 'Motor Carrier Load Tender', industry: 'Logistics / Transportation',
    segments: [
      sr('ST', true), sr('B2', true), sr('B2A', true), sr('L11', false, -1),
      sr('G62', false, -1), sr('MS3', false), sr('NTE', false, -1),
      sr('N1', false, -1), sr('N2', false, -1), sr('N3', false, -1),
      sr('N4', false, -1), sr('G61', false, -1), sr('OID', false, -1),
      sr('L5', false, -1), sr('AT8', false, -1), sr('LH1', false, -1),
      sr('SE', true),
    ],
  },
  '210': {
    code: '210', standard: STD, version: VER, full: false,
    name: 'Motor Carrier Freight Details and Invoice', industry: 'Logistics / Transportation',
    segments: [],
  },
  '211': {
    code: '211', standard: STD, version: VER, full: false,
    name: 'Motor Carrier Bill of Lading', industry: 'Logistics / Transportation',
    segments: [],
  },
  '214': {
    code: '214', standard: STD, version: VER, full: true,
    name: 'Transportation Carrier Shipment Status Message', industry: 'Logistics / Transportation',
    segments: [
      sr('ST', true), sr('B10', true), sr('L11', false, -1), sr('K1', false, -1),
      sr('MS1', false), sr('MS2', false, -1), sr('AT7', false, -1),
      sr('MS3', false, -1), sr('AT8', false, -1), sr('NTE', false, -1),
      sr('N1', false, -1), sr('N3', false, -1), sr('N4', false, -1), sr('SE', true),
    ],
  },
  '215': {
    code: '215', standard: STD, version: VER, full: false,
    name: 'Motor Carrier Pick-up Manifest', industry: 'Logistics / Transportation',
    segments: [],
  },
  '990': {
    code: '990', standard: STD, version: VER, full: false,
    name: 'Response to a Load Tender', industry: 'Logistics / Transportation',
    segments: [],
  },

  // ── Warehouse ────────────────────────────────────────────────────────────
  '940': {
    code: '940', standard: STD, version: VER, full: true,
    name: 'Warehouse Shipping Order', industry: 'Warehouse / Logistics',
    segments: [
      sr('ST', true), sr('W05', true), sr('N1', false, -1), sr('N2', false, -1),
      sr('N3', false, -1), sr('N4', false, -1), sr('N9', false, -1),
      sr('G62', false, -1), sr('NTE', false, -1), sr('W66', false),
      sr('LX', false, -1), sr('W01', false, -1), sr('G69', false, -1),
      sr('N9', false, -1), sr('W76', true), sr('SE', true),
    ],
  },
  '943': {
    code: '943', standard: STD, version: VER, full: false,
    name: 'Warehouse Stock Transfer Shipment Advice', industry: 'Warehouse',
    segments: [],
  },
  '944': {
    code: '944', standard: STD, version: VER, full: false,
    name: 'Warehouse Stock Transfer Receipt Advice', industry: 'Warehouse',
    segments: [],
  },
  '945': {
    code: '945', standard: STD, version: VER, full: true,
    name: 'Warehouse Shipping Advice', industry: 'Warehouse / Logistics',
    segments: [
      sr('ST', true), sr('W06', true), sr('N1', false, -1), sr('N9', false, -1),
      sr('G62', false, -1), sr('NTE', false, -1), sr('W27', false),
      sr('W6', false), sr('LX', false, -1), sr('MAN', false, -1),
      sr('W12', false, -1), sr('N9', false, -1), sr('W03', true), sr('SE', true),
    ],
  },
  '947': {
    code: '947', standard: STD, version: VER, full: false,
    name: 'Warehouse Inventory Adjustment Advice', industry: 'Warehouse',
    segments: [],
  },

  // ── Financial Services (additional) ──────────────────────────────────────
  '821': {
    code: '821', standard: STD, version: VER, full: false,
    name: 'Financial Information Reporting', industry: 'Financial Services',
    segments: [],
  },
  '822': {
    code: '822', standard: STD, version: VER, full: false,
    name: 'Account Analysis', industry: 'Financial Services',
    segments: [],
  },
  '823': {
    code: '823', standard: STD, version: VER, full: false,
    name: 'Lockbox', industry: 'Financial Services',
    segments: [],
  },
  '827': {
    code: '827', standard: STD, version: VER, full: false,
    name: 'Financial Return Notice', industry: 'Financial Services',
    segments: [],
  },
  '828': {
    code: '828', standard: STD, version: VER, full: false,
    name: 'Debit Authorization', industry: 'Financial Services',
    segments: [],
  },

  // ── Acknowledgments ──────────────────────────────────────────────────────
  '997': {
    code: '997', standard: STD, version: VER, full: true,
    name: 'Functional Acknowledgment', industry: 'All',
    segments: [
      sr('ST', true), sr('AK1', true), sr('AK2', false, -1), sr('AK3', false, -1),
      sr('AK4', false, -1), sr('AK5', false, -1), sr('AK9', true), sr('SE', true),
    ],
  },
  '999': {
    code: '999', standard: STD, version: VER, full: false,
    name: 'Implementation Acknowledgment', industry: 'All',
    segments: [],
  },
};
