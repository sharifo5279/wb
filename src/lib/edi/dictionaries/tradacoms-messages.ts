import type { TransactionDef } from './types';

const STD = 'TRADACOMS' as const;
const VER = 'ANA001';

function sr(id: string, required: boolean, maxUse: number = 1) {
  return { id, required, maxUse };
}

// TRADACOMS message types are identified by the first sub-component of MHD02
// (e.g. "ORDHDR:9"). Most retail flows use header / detail / trailer triples.

export const TRADACOMS_MESSAGES: Record<string, TransactionDef> = {
  ORDHDR: {
    code: 'ORDHDR', standard: STD, version: VER, full: true,
    name: 'Order File Header (Purchase Order)', industry: 'Retail / Grocery',
    segments: [
      sr('MHD', true), sr('TYP', true), sr('SDT', false), sr('CDT', false),
      sr('FIL', true), sr('MTR', true),
    ],
  },
  ORDERS: {
    code: 'ORDERS', standard: STD, version: VER, full: true,
    name: 'Purchase Order Detail', industry: 'Retail / Grocery',
    segments: [
      sr('MHD', true), sr('CLO', false), sr('ORD', true), sr('DLD', false),
      sr('ITM', true, -1), sr('OTR', true), sr('MTR', true),
    ],
  },
  ORDTLR: {
    code: 'ORDTLR', standard: STD, version: VER, full: true,
    name: 'Purchase Order Trailer', industry: 'Retail / Grocery',
    segments: [sr('MHD', true), sr('TLR', true), sr('MTR', true)],
  },
  INVFIL: {
    code: 'INVFIL', standard: STD, version: VER, full: true,
    name: 'Invoice File Header', industry: 'Retail / Grocery',
    segments: [
      sr('MHD', true), sr('TYP', true), sr('SDT', false), sr('CDT', false),
      sr('FIL', true), sr('MTR', true),
    ],
  },
  INVOIC: {
    code: 'INVOIC', standard: STD, version: VER, full: true,
    name: 'Invoice Detail', industry: 'Retail / Grocery',
    segments: [
      sr('MHD', true), sr('IRF', true), sr('ILD', true, -1),
      sr('STL', true), sr('MTR', true),
    ],
  },
  ACKHDR: {
    code: 'ACKHDR', standard: STD, version: VER, full: true,
    name: 'Acknowledgement Header', industry: 'All',
    segments: [sr('MHD', true), sr('ACK', true, -1), sr('MTR', true)],
  },
  ACKTLR: {
    code: 'ACKTLR', standard: STD, version: VER, full: true,
    name: 'Acknowledgement Trailer', industry: 'All',
    segments: [sr('MHD', true), sr('TLR', true), sr('MTR', true)],
  },
  DLHDR: {
    code: 'DLHDR', standard: STD, version: VER, full: true,
    name: 'Delivery Notification Header', industry: 'Retail / Grocery',
    segments: [
      sr('MHD', true), sr('TYP', true), sr('SDT', false), sr('CDT', false),
      sr('FIL', true), sr('MTR', true),
    ],
  },
  DLDET: {
    code: 'DLDET', standard: STD, version: VER, full: true,
    name: 'Delivery Notification Detail', industry: 'Retail / Grocery',
    segments: [
      sr('MHD', true), sr('CLO', false), sr('ORD', false, -1), sr('DLD', false, -1),
      sr('ITM', true, -1), sr('OTR', true), sr('MTR', true),
    ],
  },
};
