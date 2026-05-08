import type { TransactionDef } from './types';

const STD = 'EDIFACT' as const;
const VER = 'D01B';

function sr(id: string, required: boolean, maxUse: number = 1) {
  return { id, required, maxUse };
}

export const EDIFACT_MESSAGES: Record<string, TransactionDef> = {
  ORDERS: {
    code: 'ORDERS', standard: STD, version: VER, full: true,
    name: 'Purchase Order', industry: 'Supply Chain / Retail / CPG',
    segments: [
      sr('UNH', true), sr('BGM', true), sr('DTM', false, -1), sr('RFF', false, -1),
      sr('NAD', false, -1), sr('CTA', false, -1), sr('COM', false, -1),
      sr('LIN', false, -1), sr('PIA', false, -1), sr('IMD', false, -1),
      sr('QTY', false, -1), sr('PRI', false, -1), sr('MOA', false, -1),
      sr('TAX', false, -1), sr('ALC', false, -1), sr('LOC', false, -1),
      sr('PAC', false, -1), sr('UNT', true),
    ],
  },
  ORDRSP: {
    code: 'ORDRSP', standard: STD, version: VER, full: false,
    name: 'Purchase Order Response', industry: 'Supply Chain / Retail',
    segments: [],
  },
  ORDCHG: {
    code: 'ORDCHG', standard: STD, version: VER, full: false,
    name: 'Purchase Order Change Request', industry: 'Supply Chain',
    segments: [],
  },
  DESADV: {
    code: 'DESADV', standard: STD, version: VER, full: true,
    name: 'Despatch Advice (ASN)', industry: 'Supply Chain / Logistics',
    segments: [
      sr('UNH', true), sr('BGM', true), sr('DTM', false, -1), sr('RFF', false, -1),
      sr('NAD', false, -1), sr('CTA', false, -1), sr('COM', false, -1),
      sr('TDT', false, -1), sr('LOC', false, -1), sr('EQD', false, -1),
      sr('PAC', false, -1), sr('LIN', false, -1), sr('PIA', false, -1),
      sr('IMD', false, -1), sr('QTY', false, -1), sr('UNT', true),
    ],
  },
  RECADV: {
    code: 'RECADV', standard: STD, version: VER, full: false,
    name: 'Receiving Advice', industry: 'Supply Chain / Logistics',
    segments: [],
  },
  INVOIC: {
    code: 'INVOIC', standard: STD, version: VER, full: true,
    name: 'Invoice', industry: 'Supply Chain / Retail / CPG / Financial Services',
    segments: [
      sr('UNH', true), sr('BGM', true), sr('DTM', false, -1), sr('RFF', false, -1),
      sr('NAD', false, -1), sr('CTA', false, -1), sr('COM', false, -1),
      sr('TAX', false, -1), sr('MOA', false, -1), sr('ALC', false, -1),
      sr('LIN', false, -1), sr('PIA', false, -1), sr('IMD', false, -1),
      sr('QTY', false, -1), sr('PRI', false, -1), sr('PCD', false, -1),
      sr('UNT', true),
    ],
  },
  PAYMUL: {
    code: 'PAYMUL', standard: STD, version: VER, full: false,
    name: 'Multiple Payment Order', industry: 'Financial Services',
    segments: [],
  },
  REMADV: {
    code: 'REMADV', standard: STD, version: VER, full: false,
    name: 'Remittance Advice', industry: 'Financial Services',
    segments: [],
  },
  PRICAT: {
    code: 'PRICAT', standard: STD, version: VER, full: false,
    name: 'Price/Sales Catalogue', industry: 'Retail / CPG',
    segments: [],
  },
  INVRPT: {
    code: 'INVRPT', standard: STD, version: VER, full: false,
    name: 'Inventory Report', industry: 'Retail / CPG / Manufacturing',
    segments: [],
  },
  IFTMIN: {
    code: 'IFTMIN', standard: STD, version: VER, full: false,
    name: 'Instruction Message (Transport)', industry: 'Logistics / Transportation',
    segments: [],
  },
  IFTSTA: {
    code: 'IFTSTA', standard: STD, version: VER, full: false,
    name: 'Transport Status Message', industry: 'Logistics / Transportation',
    segments: [],
  },
  CONTRL: {
    code: 'CONTRL', standard: STD, version: VER, full: true,
    name: 'Syntax and Service Report (ACK)', industry: 'All',
    segments: [
      sr('UNH', true), sr('UCI', true), sr('UCM', false, -1), sr('UNT', true),
    ],
  },
};
