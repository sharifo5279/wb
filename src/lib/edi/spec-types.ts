/**
 * Spec Intelligence — type definitions.
 *
 * These types are shared between the API extraction endpoint and the
 * Spec Intelligence UI components.  They are intentionally separate from the
 * EDI parser types so the two subsystems remain loosely coupled.
 */

/** Category of a single extracted specification item. */
export type SpecItemType = 'segment' | 'rule' | 'code_list' | 'note';

/**
 * A single item extracted from the implementation guide PDF.
 *
 * @property type     — category used for filter chips and colour coding
 * @property id       — short identifier shown in the list (e.g. "CLM", "Rule 4.2")
 * @property summary  — one-liner shown in the list row
 * @property detail   — full description shown in the detail panel; may contain
 *                      newline characters but is otherwise plain text
 */
export interface SpecItem {
  type: SpecItemType;
  id: string;
  summary: string;
  detail: string;
}

/**
 * The complete extraction produced by the Spec Intelligence endpoint.
 *
 * @property standard         — detected EDI standard ('X12' | 'EDIFACT' | 'Unknown')
 * @property source_filename  — original PDF filename as reported by the client
 * @property extracted_at     — ISO-8601 timestamp set by the server
 * @property items            — ordered list of extracted specification items
 */
export interface SpecExtraction {
  standard: string;
  source_filename: string;
  extracted_at: string;
  items: SpecItem[];
}
