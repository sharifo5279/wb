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
    code: '824', standard: STD, version: VER, full: true,
    name: 'Application Advice', industry: 'Supply Chain',
    segments: [
      sr('ST', true), sr('BGN', true), sr('REF', false, -1), sr('DTM', false, -1),
      sr('PER', false, -1), sr('OTI', false, -1), sr('TED', false, -1),
      sr('NTE', false, -1), sr('SE', true),
    ],
  },
  '830': {
    code: '830', standard: STD, version: VER, full: true,
    name: 'Planning Schedule with Release Capability', industry: 'Manufacturing / Supply Chain',
    segments: [
      sr('ST', true), sr('BFR', true), sr('REF', false, -1), sr('PER', false, -1),
      sr('DTM', false, -1), sr('FOB', false), sr('SAC', false, -1),
      sr('CUR', false), sr('N1', false, -1), sr('N3', false, -1), sr('N4', false, -1),
      sr('LIN', false, -1), sr('PID', false, -1), sr('PO4', false, -1),
      sr('TXI', false, -1), sr('FST', false, -1), sr('SDQ', false, -1),
      sr('AMT', false, -1), sr('CTT', false), sr('SE', true),
    ],
  },
  '832': {
    code: '832', standard: STD, version: VER, full: true,
    name: 'Price/Sales Catalog', industry: 'Retail / CPG',
    segments: [
      sr('ST', true), sr('BCT', true), sr('REF', false, -1), sr('DTM', false, -1),
      sr('PER', false, -1), sr('N1', false, -1), sr('N3', false, -1), sr('N4', false, -1),
      sr('LIN', false, -1), sr('PID', false, -1), sr('PO3', false, -1), sr('PO4', false, -1),
      sr('CTP', false, -1), sr('SAC', false, -1), sr('AMT', false, -1),
      sr('MEA', false, -1), sr('CTT', false), sr('SE', true),
    ],
  },
  '846': {
    code: '846', standard: STD, version: VER, full: true,
    name: 'Inventory Inquiry / Advice', industry: 'Retail / CPG / Manufacturing',
    segments: [
      sr('ST', true), sr('BIA', true), sr('REF', false, -1), sr('DTM', false, -1),
      sr('N1', false, -1), sr('N3', false, -1), sr('N4', false, -1),
      sr('LIN', false, -1), sr('PID', false, -1), sr('QTY', false, -1),
      sr('MEA', false, -1), sr('REF', false, -1), sr('SDQ', false, -1),
      sr('AMT', false, -1), sr('CTT', false), sr('SE', true),
    ],
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
    code: '852', standard: STD, version: VER, full: true,
    name: 'Product Activity Data', industry: 'Retail / CPG',
    segments: [
      sr('ST', true), sr('XQ', true), sr('GIS', false, -1),
      sr('LIN', false, -1), sr('ZA', false, -1), sr('QTY', false, -1),
      sr('REF', false, -1), sr('DTM', false, -1), sr('PRD', false, -1),
      sr('SE', true),
    ],
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
    code: '860', standard: STD, version: VER, full: true,
    name: 'Purchase Order Change Request - Buyer Initiated', industry: 'Supply Chain',
    segments: [
      sr('ST', true), sr('BCH', true), sr('CUR', false), sr('REF', false, -1),
      sr('PER', false, -1), sr('FOB', false, -1), sr('CSH', false, -1),
      sr('SAC', false, -1), sr('ITD', false, -1), sr('DIS', false, -1),
      sr('INC', false), sr('LDT', false, -1), sr('TD5', false, -1),
      sr('MAN', false, -1), sr('NTE', false, -1), sr('N1', false, -1),
      sr('N3', false, -1), sr('N4', false, -1), sr('PO1', false, -1),
      sr('ACK', false, -1), sr('CTP', false, -1), sr('CTT', false), sr('SE', true),
    ],
  },
  '861': {
    code: '861', standard: STD, version: VER, full: true,
    name: 'Receiving Advice / Acceptance Certificate', industry: 'Supply Chain / Logistics',
    segments: [
      sr('ST', true), sr('BRA', true), sr('REF', false, -1), sr('DTM', false, -1),
      sr('PER', false, -1), sr('N1', false, -1), sr('N3', false, -1), sr('N4', false, -1),
      sr('RCD', false, -1), sr('LIN', false, -1), sr('PID', false, -1),
      sr('PWK', false, -1), sr('REF', false, -1), sr('MEA', false, -1),
      sr('AMT', false, -1), sr('CTT', false), sr('SE', true),
    ],
  },
  '865': {
    code: '865', standard: STD, version: VER, full: true,
    name: 'Purchase Order Change Acknowledgment - Seller Initiated', industry: 'Supply Chain',
    segments: [
      sr('ST', true), sr('BCA', true), sr('CUR', false), sr('REF', false, -1),
      sr('PER', false, -1), sr('ITD', false, -1), sr('DIS', false, -1),
      sr('INC', false), sr('LDT', false, -1), sr('NTE', false, -1),
      sr('N1', false, -1), sr('PO1', false, -1), sr('CTP', false, -1),
      sr('ACK', false, -1), sr('CTT', false), sr('SE', true),
    ],
  },
  '869': {
    code: '869', standard: STD, version: VER, full: true,
    name: 'Order Status Inquiry', industry: 'Supply Chain',
    segments: [
      sr('ST', true), sr('BIG', true), sr('REF', false, -1), sr('DTM', false, -1),
      sr('N1', false, -1), sr('N3', false, -1), sr('N4', false, -1),
      sr('OID', false, -1), sr('SE', true),
    ],
  },
  '870': {
    code: '870', standard: STD, version: VER, full: true,
    name: 'Order Status Report', industry: 'Supply Chain',
    segments: [
      sr('ST', true), sr('BSR', true), sr('REF', false, -1), sr('DTM', false, -1),
      sr('N9', false, -1), sr('N1', false, -1), sr('N3', false, -1), sr('N4', false, -1),
      sr('OID', false, -1), sr('NTE', false, -1), sr('CTT', false), sr('SE', true),
    ],
  },
  '875': {
    code: '875', standard: STD, version: VER, full: true,
    name: 'Grocery Products Purchase Order', industry: 'Grocery / Cold Chain',
    segments: [
      sr('ST', true), sr('BIG', true), sr('NTE', false, -1), sr('REF', false, -1),
      sr('PER', false, -1), sr('FOB', false, -1), sr('CSH', false, -1),
      sr('ITD', false, -1), sr('DTM', false, -1), sr('N1', false, -1),
      sr('N3', false, -1), sr('N4', false, -1), sr('LIN', false, -1),
      sr('PID', false, -1), sr('PO4', false, -1), sr('ALD', false, -1),
      sr('AMT', false, -1), sr('CTT', false), sr('SE', true),
    ],
  },
  '876': {
    code: '876', standard: STD, version: VER, full: true,
    name: 'Grocery Products Purchase Order Change', industry: 'Grocery / Cold Chain',
    segments: [
      sr('ST', true), sr('BCH', true), sr('REF', false, -1), sr('NTE', false, -1),
      sr('N1', false, -1), sr('LIN', false, -1), sr('ALD', false, -1),
      sr('AMT', false, -1), sr('CTT', false), sr('SE', true),
    ],
  },
  '880': {
    code: '880', standard: STD, version: VER, full: true,
    name: 'Grocery Products Invoice', industry: 'Grocery / Cold Chain',
    segments: [
      sr('ST', true), sr('BIG', true), sr('NTE', false, -1), sr('REF', false, -1),
      sr('PER', false, -1), sr('ITD', false, -1), sr('DTM', false, -1),
      sr('FOB', false, -1), sr('N1', false, -1), sr('N3', false, -1),
      sr('N4', false, -1), sr('IT1', false, -1), sr('PID', false, -1),
      sr('MEA', false, -1), sr('ALD', false, -1), sr('TDS', true),
      sr('CAD', false, -1), sr('AMT', false, -1), sr('CTT', false), sr('SE', true),
    ],
  },
  '894': {
    code: '894', standard: STD, version: VER, full: true,
    name: 'Delivery / Return Base Record', industry: 'Grocery / Cold Chain',
    segments: [
      sr('ST', true), sr('G82', true), sr('REF', false, -1), sr('N1', false, -1),
      sr('LX', false, -1), sr('G83', false, -1), sr('G72', false, -1),
      sr('G84', true), sr('G85', false), sr('G86', false), sr('SE', true),
    ],
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
    code: '210', standard: STD, version: VER, full: true,
    name: 'Motor Carrier Freight Details and Invoice', industry: 'Logistics / Transportation',
    segments: [
      sr('ST', true), sr('B3', true), sr('C3', false), sr('ITD', false),
      sr('N9', false, -1), sr('N1', false, -1), sr('N3', false, -1), sr('N4', false, -1),
      sr('LX', false, -1), sr('L5', false, -1), sr('L0', false, -1),
      sr('L1', false, -1), sr('L7', false, -1), sr('L4', false, -1),
      sr('L3', false, -1), sr('L9', false, -1), sr('K1', false, -1),
      sr('FA1', false), sr('SE', true),
    ],
  },
  '211': {
    code: '211', standard: STD, version: VER, full: true,
    name: 'Motor Carrier Bill of Lading', industry: 'Logistics / Transportation',
    segments: [
      sr('ST', true), sr('BOL', true), sr('X1', false), sr('MS3', false),
      sr('M3', false), sr('N9', false, -1), sr('N1', false, -1), sr('N3', false, -1),
      sr('N4', false, -1), sr('R3', false, -1), sr('K1', false, -1),
      sr('FOB', false), sr('MS1', false), sr('AT8', false), sr('LX', false, -1),
      sr('L5', false, -1), sr('L0', false, -1), sr('L1', false, -1),
      sr('L9', false, -1), sr('L4', false, -1), sr('OID', false, -1),
      sr('MAN', false, -1), sr('L11', false, -1), sr('AT5', false, -1),
      sr('SE', true),
    ],
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
    code: '215', standard: STD, version: VER, full: true,
    name: 'Motor Carrier Pick-up Manifest', industry: 'Logistics / Transportation',
    segments: [
      sr('ST', true), sr('M10', true), sr('N9', false, -1), sr('N1', false, -1),
      sr('N3', false, -1), sr('N4', false, -1), sr('LX', false, -1),
      sr('M11', false, -1), sr('M12', false), sr('M7', false, -1),
      sr('MAN', false, -1), sr('L11', false, -1), sr('SE', true),
    ],
  },
  '990': {
    code: '990', standard: STD, version: VER, full: true,
    name: 'Response to a Load Tender', industry: 'Logistics / Transportation',
    segments: [
      sr('ST', true), sr('B1', true), sr('A4', true),
      sr('M5', false), sr('V9', false, -1), sr('NTE', false, -1),
      sr('K1', false, -1), sr('SE', true),
    ],
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
    code: '943', standard: STD, version: VER, full: true,
    name: 'Warehouse Stock Transfer Shipment Advice', industry: 'Warehouse',
    segments: [
      sr('ST', true), sr('W06', true), sr('N1', false, -1), sr('G62', false, -1),
      sr('NTE', false, -1), sr('W27', false), sr('W6', false),
      sr('LX', false, -1), sr('N9', false, -1), sr('MAN', false, -1),
      sr('W12', false, -1), sr('W03', true), sr('SE', true),
    ],
  },
  '944': {
    code: '944', standard: STD, version: VER, full: true,
    name: 'Warehouse Stock Transfer Receipt Advice', industry: 'Warehouse',
    segments: [
      sr('ST', true), sr('W17', true), sr('N1', false, -1), sr('N9', false, -1),
      sr('G62', false, -1), sr('NTE', false, -1),
      sr('LX', false, -1), sr('MAN', false, -1), sr('W11', false, -1),
      sr('N9', false, -1), sr('W14', true), sr('SE', true),
    ],
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
    code: '947', standard: STD, version: VER, full: true,
    name: 'Warehouse Inventory Adjustment Advice', industry: 'Warehouse',
    segments: [
      sr('ST', true), sr('W15', true), sr('W2', false), sr('N1', false, -1),
      sr('N9', false, -1), sr('G62', false, -1), sr('NTE', false, -1),
      sr('LX', false, -1), sr('W13', false, -1), sr('SE', true),
    ],
  },

  // ── Financial Services (additional) ──────────────────────────────────────
  '821': {
    code: '821', standard: STD, version: VER, full: true,
    name: 'Financial Information Reporting', industry: 'Financial Services',
    segments: [
      sr('ST', true), sr('BFI', true), sr('REF', false, -1), sr('DTM', false, -1),
      sr('N1', false, -1), sr('ENT', false, -1), sr('ACT', false, -1),
      sr('AMT', false, -1), sr('BAL', false, -1), sr('REF', false, -1),
      sr('SE', true),
    ],
  },
  '822': {
    code: '822', standard: STD, version: VER, full: true,
    name: 'Account Analysis', industry: 'Financial Services',
    segments: [
      sr('ST', true), sr('BCD', true), sr('N1', false, -1), sr('BAS', false),
      sr('IDD', false, -1), sr('ITM', false, -1), sr('RAS', false, -1),
      sr('ACR', false, -1), sr('SE', true),
    ],
  },
  '823': {
    code: '823', standard: STD, version: VER, full: true,
    name: 'Lockbox', industry: 'Financial Services',
    segments: [
      sr('ST', true), sr('LX', true, -1), sr('BLR', true), sr('BAI', false),
      sr('AMT', false, -1), sr('BCO', false, -1), sr('NTE', false, -1),
      sr('K3', false, -1), sr('REF', false, -1), sr('SE', true),
    ],
  },
  '827': {
    code: '827', standard: STD, version: VER, full: true,
    name: 'Financial Return Notice', industry: 'Financial Services',
    segments: [
      sr('ST', true), sr('BFR', true), sr('N1', false, -1), sr('N3', false, -1),
      sr('N4', false, -1), sr('RAR', false, -1), sr('SE', true),
    ],
  },
  '828': {
    code: '828', standard: STD, version: VER, full: true,
    name: 'Debit Authorization', industry: 'Financial Services',
    segments: [
      sr('ST', true), sr('BDA', true), sr('REF', false, -1), sr('DTM', false, -1),
      sr('N1', false, -1), sr('ENT', false, -1), sr('DAU', false, -1),
      sr('AMT', false, -1), sr('SE', true),
    ],
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
    code: '999', standard: STD, version: VER, full: true,
    name: 'Implementation Acknowledgment', industry: 'All',
    segments: [
      sr('ST', true), sr('AK1', true), sr('AK2', false, -1),
      sr('IK3', false, -1), sr('CTX', false, -1), sr('IK4', false, -1),
      sr('IK5', false), sr('AK9', true), sr('SE', true),
    ],
  },
};
