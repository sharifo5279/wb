import type { TransactionDef } from './types';

const STD = 'EDIFACT' as const;
const VER = 'D01B';

/** UN/EDIFACT directories where the message structure is broadly stable.
 *  The dictionary itself is curated against D01B; element-level qualifiers
 *  may evolve between directories. */
const ALL_VERSIONS = ['D96A', 'D01B', 'D04A'];

function sr(id: string, required: boolean, maxUse: number = 1) {
  return { id, required, maxUse };
}

export const EDIFACT_MESSAGES: Record<string, TransactionDef> = {
  ORDERS: {
    code: 'ORDERS', standard: STD, version: VER, supportedVersions: ALL_VERSIONS, full: true,
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
    code: 'ORDRSP', standard: STD, version: VER, supportedVersions: ALL_VERSIONS, full: true,
    name: 'Purchase Order Response', industry: 'Supply Chain / Retail',
    segments: [
      sr('UNH', true), sr('BGM', true), sr('DTM', false, -1), sr('FTX', false, -1),
      sr('RFF', false, -1), sr('NAD', false, -1), sr('CTA', false, -1), sr('COM', false, -1),
      sr('LIN', false, -1), sr('PIA', false, -1), sr('IMD', false, -1),
      sr('QTY', false, -1), sr('PRI', false, -1), sr('MOA', false, -1),
      sr('ALC', false, -1), sr('UNT', true),
    ],
  },
  ORDCHG: {
    code: 'ORDCHG', standard: STD, version: VER, supportedVersions: ALL_VERSIONS, full: true,
    name: 'Purchase Order Change Request', industry: 'Supply Chain',
    segments: [
      sr('UNH', true), sr('BGM', true), sr('DTM', false, -1), sr('FTX', false, -1),
      sr('RFF', false, -1), sr('NAD', false, -1), sr('LIN', false, -1),
      sr('PIA', false, -1), sr('IMD', false, -1), sr('QTY', false, -1),
      sr('PRI', false, -1), sr('UNT', true),
    ],
  },
  DESADV: {
    code: 'DESADV', standard: STD, version: VER, supportedVersions: ALL_VERSIONS, full: true,
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
    code: 'RECADV', standard: STD, version: VER, supportedVersions: ALL_VERSIONS, full: true,
    name: 'Receiving Advice', industry: 'Supply Chain / Logistics',
    segments: [
      sr('UNH', true), sr('BGM', true), sr('DTM', false, -1), sr('RFF', false, -1),
      sr('NAD', false, -1), sr('CPS', false, -1), sr('LIN', false, -1),
      sr('PIA', false, -1), sr('IMD', false, -1), sr('QTY', false, -1),
      sr('FTX', false, -1), sr('UNT', true),
    ],
  },
  INVOIC: {
    code: 'INVOIC', standard: STD, version: VER, supportedVersions: ALL_VERSIONS, full: true,
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
    code: 'PAYMUL', standard: STD, version: VER, supportedVersions: ALL_VERSIONS, full: true,
    name: 'Multiple Payment Order', industry: 'Financial Services',
    segments: [
      sr('UNH', true), sr('BGM', true), sr('DTM', false, -1), sr('RFF', false, -1),
      sr('FII', false, -1), sr('BUS', false), sr('NAD', false, -1),
      sr('MOA', false, -1), sr('PAI', false), sr('FCA', false),
      sr('UNT', true),
    ],
  },
  REMADV: {
    code: 'REMADV', standard: STD, version: VER, supportedVersions: ALL_VERSIONS, full: true,
    name: 'Remittance Advice', industry: 'Financial Services',
    segments: [
      sr('UNH', true), sr('BGM', true), sr('DTM', false, -1), sr('RFF', false, -1),
      sr('NAD', false, -1), sr('MOA', false, -1), sr('PAI', false),
      sr('FII', false, -1), sr('DOC', false, -1), sr('UNT', true),
    ],
  },
  PRICAT: {
    code: 'PRICAT', standard: STD, version: VER, supportedVersions: ALL_VERSIONS, full: true,
    name: 'Price/Sales Catalogue', industry: 'Retail / CPG',
    segments: [
      sr('UNH', true), sr('BGM', true), sr('DTM', false, -1), sr('RFF', false, -1),
      sr('NAD', false, -1), sr('LIN', false, -1), sr('PIA', false, -1),
      sr('IMD', false, -1), sr('MEA', false, -1), sr('QTY', false, -1),
      sr('ALI', false, -1), sr('GIN', false, -1), sr('EAN', false, -1),
      sr('PRI', false, -1), sr('UNT', true),
    ],
  },
  INVRPT: {
    code: 'INVRPT', standard: STD, version: VER, supportedVersions: ALL_VERSIONS, full: true,
    name: 'Inventory Report', industry: 'Retail / CPG / Manufacturing',
    segments: [
      sr('UNH', true), sr('BGM', true), sr('DTM', false, -1), sr('RFF', false, -1),
      sr('NAD', false, -1), sr('CPS', false, -1), sr('LIN', false, -1),
      sr('PIA', false, -1), sr('IMD', false, -1), sr('MEA', false, -1),
      sr('QTY', false, -1), sr('GIR', false, -1), sr('UNT', true),
    ],
  },
  IFTMIN: {
    code: 'IFTMIN', standard: STD, version: VER, supportedVersions: ALL_VERSIONS, full: true,
    name: 'Instruction Message (Transport)', industry: 'Logistics / Transportation',
    segments: [
      sr('UNH', true), sr('BGM', true), sr('DTM', false, -1), sr('RFF', false, -1),
      sr('LOC', false, -1), sr('FTX', false, -1), sr('GDS', false, -1),
      sr('GID', false, -1), sr('EQD', false, -1), sr('MEA', false, -1),
      sr('DIM', false, -1), sr('GOR', false, -1), sr('TPL', false, -1),
      sr('NAD', false, -1), sr('CTA', false, -1), sr('COM', false, -1),
      sr('UNT', true),
    ],
  },
  IFTSTA: {
    code: 'IFTSTA', standard: STD, version: VER, supportedVersions: ALL_VERSIONS, full: true,
    name: 'Transport Status Message', industry: 'Logistics / Transportation',
    segments: [
      sr('UNH', true), sr('BGM', true), sr('DTM', false, -1), sr('RFF', false, -1),
      sr('NAD', false, -1), sr('LOC', false, -1), sr('FTX', false, -1),
      sr('CNT', false, -1), sr('STS', false, -1), sr('UNT', true),
    ],
  },
  CONTRL: {
    code: 'CONTRL', standard: STD, version: VER, supportedVersions: ALL_VERSIONS, full: true,
    name: 'Syntax and Service Report (ACK)', industry: 'All',
    segments: [
      sr('UNH', true), sr('UCI', true), sr('UCM', false, -1), sr('UNT', true),
    ],
  },
};
