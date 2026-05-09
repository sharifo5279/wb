# EDI Notepad 2026 — Tool coverage audit

**Generated:** session of 2026-05-09
**Scope:** Every tool / utility / surface currently shipped on `main`. For each one: what's covered, what's missing, what's broken, and what to do about it.

User-reported issue that triggered this audit: "The ACK tool only allows me to create a reject acknowledgment. Why? For what reason?"

The audit confirmed: ACK generation is purely error-driven with **no manual status override**. Several other tools have similar rigidity. Full findings + an execution plan below.

---

## TL;DR

| Tool | Standards | Transactions | Status |
|---|---|---|---|
| Parse + validate | X12, EDIFACT, TRADACOMS | All | ✅ |
| Raw view + Find/Replace | All | All | ✅ |
| Hex view | All | All | ✅ |
| Business view (dedicated) | X12 only | 850, 856, 810, 997 | ⚠️ Limited |
| Business view (Generic fallback) | X12, EDIFACT, TRADACOMS | All others | ✅ |
| Convert JSON/XML | All | All | ✅ |
| Increment control numbers | X12, EDIFACT | All | ⚠️ TRADACOMS missing |
| Summary report | All | All | ✅ |
| **Generate ACK** | X12 (997), EDIFACT (CONTRL) | All | ❌ **No status override; TRADACOMS missing; 999 not offered** |
| Split interchanges | X12, EDIFACT | All | ⚠️ TRADACOMS missing |
| Print business view | All | All (via Business view) | ⚠️ Generic fallback unprintable for some |
| New Document (build wizard) | X12, EDIFACT, TRADACOMS | Only `full: true` transactions | ✅ |
| Element-edit popover | All | All — uses dictionary | ✅ |
| Segment context menu | All | All | ⚠️ Only Insert REF/DTM/NTE; no per-transaction segment picker |
| Multi-doc tabs / session | All | All | ✅ |
| Coverage page + version filter | All | All | ✅ |
| Command palette / shortcuts | — | — | ✅ |

---

## Detailed findings

### 1. Generate ACK (the reported issue)

**Code:** `src/lib/edi/ack-generator.ts`

**Current behaviour:**
- For X12: builds 997 only. Per-set status derived purely from parse errors:
  - 0 errors → `A` (Accepted)
  - warnings only → `E` (Accepted with Errors)
  - any error → `R` (Rejected)
- For EDIFACT: builds CONTRL with the same logic.
- For TRADACOMS: throws `unsupported standard`.

**Gaps:**
1. **No manual override.** The user can't override per-set or overall status. If the parser flags an error (even one the user disagrees with), the ACK is forced to `R`.
2. **No 999 option.** X12 has a newer Implementation Acknowledgment (999) that supersedes 997 for HIPAA. We don't offer it.
3. **No ACK-type choice for X12 855 / 865.** These are full transaction-level acknowledgments (richer than 997). We don't generate them.
4. **TRADACOMS not supported.** TRADACOMS uses ACKHDR/ACKMNT/ACKTLR (we have these segments in the dictionary) but the generator throws.
5. **AckModal preview is read-only.** No UI to override status before downloading.
6. **Always swaps sender/receiver.** Reasonable default but should be editable in the modal.
7. **Date / time fields are auto-filled from `new Date()` at generate time.** Not editable.
8. **No way to mark specific segments / elements as the cause of rejection** (would surface in AK3/AK4).

**Why it shows up as "always reject":** if the user pastes a real-world EDI doc, our cross-segment validator (mandatory segments, trailer counts, control numbers) is strict. Any mismatch → ACK status R. The user can't override.

### 2. Increment control numbers

**Code:** `src/lib/edi/control-numbers.ts`

**Coverage:** X12 (ISA13 / IEA02 / GS06 / GE02 / ST02 / SE02) and EDIFACT (UNB05 / UNZ02 / UNG05 / UNE02 / UNH01 / UNT02).

**Gaps:**
1. **TRADACOMS missing.** Pre-conditions exist (we know STX has a control reference, MHD/MTR pair) but no `TRADACOMS_RULES` defined.
2. **No "set to specific value" option.** Only +1 increment. Can't set to a target value, or randomize, or reset to "1".
3. **No "increment only X envelope" option.** All control numbers in the document bump together.
4. **No undo.** Increment is destructive on the editor content; only Ctrl+Z within textarea recovers.

### 3. Split interchanges

**Code:** `src/lib/edi/split-interchanges.ts`

**Coverage:** X12 (ISA…IEA boundaries) and EDIFACT (UNB…UNZ).

**Gaps:**
1. **TRADACOMS missing.** STX…END boundaries are well-defined but unimplemented.
2. **Doesn't preserve UNA service string per interchange** for EDIFACT. UNA is global to the document; if we split, each EDIFACT chunk should carry the UNA preamble.
3. **Doesn't provide a "merge" inverse.** Useful but missing.

### 4. Business view dedicated renderers

**Code:** `app/edi-notepad/components/document-studio/business-view/*.tsx`

**Coverage:**
- ✅ X12 850, 856, 810, 997
- ❌ X12 855 (falls through to Generic — explicit user-mockup case)
- ❌ X12 820 (Payment) — financial flow
- ❌ X12 940, 945 (Warehouse)
- ❌ X12 204, 214 (Transportation)
- ❌ X12 999 (Implementation Ack) — variant of 997
- ❌ X12 824, 830, 832, 846, 852, 860, 861, 865, 869, 870, 875, 876, 880, 894, 821, 822, 823, 827, 828, 210, 211, 215, 990, 943, 944, 947 (all stub Generic)
- ❌ EDIFACT ORDERS, ORDRSP, ORDCHG, DESADV, RECADV, INVOIC, PAYMUL, REMADV, PRICAT, INVRPT, IFTMIN, IFTSTA, CONTRL — all Generic
- ❌ TRADACOMS ORDHDR, ORDERS, ORDTLR, INVFIL, INVOIC, ACKHDR, ACKTLR, DLHDR, DLDET — all Generic

**Status pills** (`statusPillFor` in `helpers.tsx`) only handle 850/855/810/856/997/999/860/865/875/876/880. Other transactions render no pill.

**Existing renderers, gap audit:**
- **850** lacks Ship-To card; lacks computed totals; lacks malformed-line warning treatment.
- **810** lacks Payment Terms band, References row, Tax/Shipping breakdown, early-pay display, "Past Due" derivation.
- **855** has no dedicated renderer.
- **856** OK structurally; HL hierarchy is correct.
- **997** OK; derives status from AK9 correctly.

### 5. Validation strictness

**Code:** `src/lib/edi/validation.ts`

**What it checks:**
- ISA/IEA control number agreement + GS count
- GS/GE control number + ST count
- ST/SE control number + segment count
- UNB/UNZ for EDIFACT (analogous)
- UNH/UNT
- Mandatory segments per transaction code (when `full: true` in dictionary)

**Gaps:**
1. **No element-level data type / length validation.** We have the dictionary; we don't use it.
2. **No code-list validation.** ISA12 has 21 codes documented; if the user puts `99999`, no warning.
3. **Only X12 + EDIFACT cross-segment checks.** TRADACOMS has its own MTR/END count check inside the parser but no central validator.
4. **No way to suppress / override** specific validation rules per partner. Real-world impl guides relax some defaults; we treat the dictionary's mandatory flag as universal.

### 6. Print business view

**Code:** Toolbar Tools → "Print Business View" + `@media print` in `globals.css`.

**Behaviour:** Switches to Business view, calls `window.print()`. Browsers can save as PDF.

**Gaps:**
1. **Generic fallback prints ugly.** Non-dedicated transactions render the segment grid; works but doesn't look like a business document.
2. **Status pills lose color in print mode.** The print stylesheet forces black/white but doesn't preserve status semantics.
3. **No paginated multi-page handling for very long docs.** Browser handles it but page breaks aren't designed for.
4. **No "Print Raw" option.** Some users want the raw EDI on paper.

### 7. New Document (Build wizard)

**Code:** `src/lib/edi/builder.ts` + `NewDocumentModal.tsx`.

**Coverage:** Generates skeletons for any transaction with `full: true` in the dictionary (10 X12 + 4 EDIFACT + 6 TRADACOMS).

**Gaps:**
1. **Doesn't pre-populate based on dictionary element data.** All elements are blank or have hardcoded placeholder text. Could use `ElementDef.codes` to put a realistic default.
2. **Date / time hardcoded to today.** Not parametrised.
3. **No "save as template"** — would let users build a starting point and reuse it.

### 8. Element-edit popover

**Code:** `ElementEditor.tsx`. Triggered by double-click on an element token.

**Coverage:** Works for any segment with element-level metadata in the dictionary. Code-list dropdown when `ElementDef.codes` is present.

**Gaps:**
1. **No multi-element edit.** Can only edit one at a time.
2. **No required-element flag in the popover beyond the small "required" tag.**
3. **Doesn't validate the new value against `type` / `minLength` / `maxLength`** before applying. (Validation runs after, on next parse.)

### 9. Segment context menu (right-click)

**Code:** `SegmentContextMenu.tsx`.

**Available actions:** Duplicate, Insert REF after, Insert DTM after, Insert NTE after, Delete.

**Gaps:**
1. **Only 3 hardcoded "Insert" choices.** Should let users insert any segment from the active transaction's expected list (or the full dictionary).
2. **No "Insert before".** Helper exists (`insertSegmentBefore`) but isn't wired.
3. **No "Move up / Move down".**
4. **No "Convert to N1 loop / PO1 loop"** (smart group ops).

### 10. Coverage page + filter

**Code:** `app/edi-notepad/coverage/*`.

**Coverage:** Lists every transaction with status pill (Complete / Incomplete) and version filter.

**Gaps:**
1. **EDIFACT and TRADACOMS detail pages render but have less polished segment lists** than X12.
2. **No "report this dictionary entry as wrong"** — useful for community-curation feedback.
3. **No search across element names, only segment IDs.**

### 11. Convert JSON / XML

**Code:** `src/lib/edi/converters.ts` + `ConvertModal.tsx`.

**Coverage:** All standards. JSON / XML.

**Gaps:**
1. **No CSV export.** Useful for line-item-heavy transactions (PO, Invoice, ASN).
2. **No "flatten loops" toggle.** Sometimes JSON consumers want a flat segment list, sometimes hierarchical.
3. **No partner-specific schema mapping.** XML output is generic.

### 12. Find / Replace

**Code:** `src/lib/edi/find.ts` + `FindBar.tsx`.

**Coverage:** Plain text find with case sensitivity toggle. Replace / Replace All.

**Gaps:**
1. **No regex.**
2. **No "search within selection".**
3. **No "find in all open tabs".**

### 13. Drag-and-drop / Upload / Paste

**Coverage:** Single-file drop, upload, paste. 1 MB cap.

**Gaps:**
1. **No multi-file drop** — drop 5 files, get 5 tabs. Currently only the first file is loaded.
2. **No URL fetch** — paste an http(s) URL and have it fetch.
3. **No drop folder** — upload an entire folder of EDI files.

---

## UX audit

User-reported issues that triggered this section:
- "There isn't enough contrast in the light mode."
- "Some of the colors are blending in in the dark mode."

The audit below confirms both reports and surfaces a set of additional UX
issues found during the sweep.

### UX-1 — Light theme contrast

**Code:** `app/edi-notepad/notepad.css` (light-theme override block).

**What's wrong:**
- `--wb-text-muted: #8892a4` is **shared between dark and light themes**.
  On white (`#ffffff`) this gives a contrast ratio of ≈ 3.0:1 — below
  the WCAG AA minimum of 4.5:1 for body text and even below the 3:1
  minimum for large text. It's used by tree-empty placeholder text,
  status-bar version label, "ID Code" badges, and footer line-numbers.
- `--wb-border: #d1d8e0` against `--wb-bg-primary: #ffffff` — contrast
  is ≈ 1.4:1 against white. Borders are nearly invisible in light mode.
  Affected: every panel boundary, tree nodes, table cells, party cards.
- `--wb-border-sub: #e6eaf0` is even lighter — practically invisible
  inside elevated backgrounds.
- `--wb-bg-surface: #f5f7fa` and `--wb-bg-elevated: #eaeef4` only differ
  by ≈ 4 lightness units — surfaces meant to be visually distinct
  (tab strip vs panel) lose their hierarchy.
- The dark accent `#4f46e5` reads OK on white but `#4338ca` is very
  close in tone — accent text and accent surface blend.

### UX-2 — Dark theme blending

**Code:** same file, top of `.wb-shell` block.

**What's wrong:**
- Three "background" tokens are nearly the same gradient:
  - `--wb-bg-primary: #0f1117`
  - `--wb-bg-surface: #161b27`
  - `--wb-bg-elevated: #1e2535`
  Visual difference between primary and surface is tiny (Δ ≈ 7 in RGB).
  Tabs against the workbench shell, the toolbar against the panel body,
  and the segment tree against the editor body all look almost identical.
- `--wb-border-sub: #1e2535` is **identical to `--wb-bg-elevated`** —
  borders disappear inside elevated surfaces (accordion expand panels,
  segment table rows, modal sections).
- `--wb-text-muted: #55637a` against `--wb-bg-primary: #0f1117` is
  ≈ 4.1:1 — just below WCAG AA for body text.

### UX-3 — Status / severity colour usage

**Affected files:** `globals.css` status pill definitions, error panel
classes.

**What's wrong:**
- We rely on red/green/amber to distinguish status pills (Original /
  Acknowledged / Open / Past Due) and error severity. **No additional
  shape, icon, or text differentiator** — colour-blind users (red/green
  protan/deutan ≈ 5–8% of men) can't tell `A` from `R` ACK pills.
- The "warning" amber (`#f5a623`) and "error" red (`#ef4444`) sit close
  on the perceptual hue wheel; protans confuse them.

### UX-4 — Focus indicators / accessibility

**What's wrong:**
- Most buttons have CSS `transition: background` on hover but **no
  visible `:focus-visible` outline**. Keyboard users tabbing through
  the toolbar can't tell where focus is.
- The hidden file `<input>` used by the upload command has
  `tabIndex={-1}` (correct) but the wrapper button doesn't restore
  focus after the file dialog closes.
- The element-edit popover and segment context menu trap focus when
  open but **don't return focus to the triggering element on close**.

### UX-5 — Visual hierarchy / spacing

- Toolbar buttons have inconsistent right-margin: `Paste` / `Upload` /
  `Convert` / `Clear` are part of one `.ds-toolbar__group`, but the
  separator placement creates uneven gaps between groups.
- Coverage detail page row densities differ: header rows (segment
  list) are 32px; element table rows are 28px — the hairline of
  difference looks like a bug.
- Modal headers and bodies have different vertical padding scales
  (12 / 16 / 20 px) — inconsistent.
- Editor's drop overlay uses `backdrop-filter: blur(4px)` which is
  inconsistent with other overlays (no blur) and noticeably slow on
  Firefox.

### UX-6 — Affordances / discoverability

- The element-edit popover only opens on **double-click** — no other
  affordance hints at this. New users won't discover it without the
  shortcut modal.
- Segment context-menu opens on **right-click** only. No long-press
  on touch devices.
- The Find bar floats over the editor in the top-right — when the
  user has the editor scrolled, the bar can occlude content.
- The drop overlay disappears as soon as the user moves outside the
  layout, even if they're still dragging — flickers if the cursor
  passes between layout regions.

### UX-7 — Tree pane

- Sticky envelope rows don't have a drop shadow or background colour
  override when stuck — they overlap the rows below at zero opacity.
- "Loop expand" chevron is the same color as the row text — hard to
  see at low contrast.
- No keyboard navigation between tree nodes (arrow keys don't work).

### UX-8 — Tabs

- Doc tab title truncates with `text-overflow: ellipsis` but no
  tooltip on hover (the segment tree has `title=`, the tab doesn't).
- Active tab indicator is a 2px accent line at the bottom — fine
  in dark mode, **invisible** in light mode against the same-toned
  accent surface.
- "+" new-tab button is the same width and styling as a tab —
  visually it reads as a tab, not an action.

### UX-9 — Coverage / detail pages

- Long transaction names overflow on narrow viewports.
- Element table on the detail page has 6 columns; on mobile (<768px)
  it horizontally-scrolls — usable but cramped.
- "Version note" rows are visually similar to element rows — the
  italic and "Version note" label are the only differentiators; the
  user can miss them.

### UX-10 — Mobile

- Mobile breakpoint shipped (≤ 768px). But:
  - Modals "go full-screen" — fine, but the close `×` is small and
    in the top-right corner where the system browser chrome usually
    sits.
  - The segment tree's 50vh cap means on a phone the editor below it
    has < 50vh visible — too cramped for typing.
  - Drag-drop overlay never fires on touch devices — long-press to
    upload would be ideal.

---

## UX execution plan (additive to the tool-coverage plan above)

### UX-stage-A — Theme contrast pass (high impact, ≈ 200 lines)
- Audit every `--wb-*` token for AA / AAA contrast in both themes.
- Lighten dark-theme borders / surfaces; darken light-theme borders /
  muted text. Aim for ≥ 4.5:1 for all body text and ≥ 3:1 for borders
  and meta text.
- Add explicit `:focus-visible` outlines (2px accent) to all
  interactive elements.
- Verify with browser devtools + an automated check (e.g. Lighthouse).

### UX-stage-B — Status / severity differentiators (≈ 80 lines)
- Add a small icon to each status pill (✓ / ⚠ / ✕ / ⏱) so colour
  isn't the only signal.
- Re-pick warning / error hues for better protan/deutan contrast
  (e.g. amber → orange #f97316; error red stays).

### UX-stage-C — Visual hierarchy + spacing (≈ 120 lines)
- Normalize toolbar group separators (consistent 12 px gap, 1 px
  separator, 12 px gap).
- Snap modal padding to a single 16-px scale.
- Align row heights across all tables (segment list, element list,
  coverage table) at 32 px.
- Drop the `backdrop-filter: blur` on the drop overlay.

### UX-stage-D — Tree + tab affordances (≈ 150 lines)
- Add background + shadow to sticky envelope rows.
- Brighten loop chevrons + give them a hover state.
- Active tab indicator becomes a 2px line **plus** a 1px top border
  shift, so it works in both themes regardless of accent saturation.
- Re-style the "+" new-tab button as a smaller, square icon-only
  control (visually distinct from tabs).
- Add `title=` to doc tab labels.
- Optional: arrow-key tree navigation.

### UX-stage-E — Coverage page polish (≈ 80 lines)
- Long transaction names wrap responsibly (clamp to 2 lines).
- Element-table mobile collapse: stack key/value pairs into cards.
- Stronger "Version note" treatment (left-border accent + slightly
  different background).

### UX-stage-F — Affordance hints (≈ 100 lines)
- Subtle hover ring on element tokens that says "double-click to edit"
  on hover (just on first hover per session).
- Long-press on segment tree → context menu (touch parity).
- Pin the Find bar to the bottom of the editor body when the editor
  has scrolled past 200 px (so it doesn't occlude active content).

### UX-stage-G — Mobile fixes (≈ 100 lines)
- Modal close button enlarged + moved away from the top-right corner.
- Tree height cap reduced to 30 vh on phones; editor gets the
  remainder.
- Long-press to upload on touch (already covered by Stage F).

---

## Combined execution order (tool coverage + UX)

The user asked us to bundle these. Here's the recommended order; each
row is one PR / one Netlify deploy.

| # | PR | Includes | Approx lines |
|---|---|---|---|
| 1 | **ACK manual override** | P0 ACK-fix-1 | 200 |
| 2 | **Theme contrast pass + focus outlines** | UX-stage-A | 200 |
| 3 | **TRADACOMS coverage trio** | P1 ACK + Increment + Split for TRADACOMS | 350 |
| 4 | **Status / severity differentiators** | UX-stage-B | 80 |
| 5 | **Stage 1 from prior plan** | 850/810/855 polished layouts | 600 |
| 6 | **Visual hierarchy + spacing pass** | UX-stage-C | 120 |
| 7 | **Tree + tab affordances** | UX-stage-D | 150 |
| 8 | **Status pills for missing transactions + element validation** | P2 BV-fix-1 + Validation-fix-1 | 330 |
| 9 | **Coverage page polish + affordance hints + mobile fixes** | UX-stages-E + F + G | 280 |
| 10 | **Validation rule suppression + builder defaults + context-menu segment picker + regex find + CSV export** | P3 batch | 400 |
| 11+ | **Big features (deferred until prioritised)** | Diff view / Minimap / Aviator AI integration | varies |

---

## How to use this report

This document is checked into `docs/audit-report.md`. Update it as we
ship items so it doubles as a living progress tracker. When an item
ships, strike it through and link to the PR.

## Priority-ranked execution plan

Each item below is a discrete PR. Listed roughly in user-impact order.

### P0 — fixes the user's reported bug

**ACK-fix-1: Manual status override in Generate ACK modal.**
- Add per-set status dropdown (A / E / R / P) in `AckModal.tsx`.
- Add ACK type dropdown for X12 (997 vs 999).
- Add sender / receiver / date / time / control # editable inputs.
- Re-render the ACK preview live as the user changes overrides.
- Add "Reset to validation defaults" button.
- Acceptance: user can take a doc with errors and still produce an `A` status if they choose; conversely, force an `R` even on a clean doc.

### P1 — fills coverage gaps users will hit

**ACK-fix-2: TRADACOMS ACK generator.**
- Implement `generateAckhdr(parseResult, opts)` in `ack-generator.ts`.
- Use ACKHDR / ACKMNT / ACKTLR segment family (already in TRADACOMS dictionary).
- Wire into `AckModal` — option appears only for TRADACOMS docs.

**Increment-fix-1: TRADACOMS control-number rules.**
- Add `TRADACOMS_RULES` to `control-numbers.ts`: STX5 + MHD1 + MTR* (no real "control" but a transmission ref).
- Test round-trip with the parser.

**Split-fix-1: TRADACOMS split + preserve UNA per EDIFACT split.**
- Implement TRADACOMS split (STX…END boundaries).
- Carry UNA service string into each EDIFACT split chunk.

### P2 — polish that closes the audit

**Stage-1 from existing plan: 850 / 810 / 855 polish.** Already planned above; runs in parallel.

**BV-fix-1: Status pills for the remaining transaction codes** (820, 940, 945, 999, EDIFACT ORDERS / DESADV / INVOIC / CONTRL, TRADACOMS).

**Validation-fix-1: Element-level data type / length validation.**
- Walk segments at parse time; for each element with a dictionary `ElementDef`, check type + length + code-list.
- Emit `severity: 'warning'` so it doesn't break ACK accept-default.

**Validation-fix-2: Per-rule suppression.**
- Add a `suppressedRules: Set<string>` to `ParseResult` (rule id like `"mandatory-segment-CTT"`).
- UI: in the inline error panel, allow the user to dismiss a rule (and persist the suppression in the doc state).

### P3 — quality-of-life

**Builder-fix-1: Pre-populate skeletons with sensible code-list defaults.**

**Context-menu-fix-1: Replace the 3 hardcoded "Insert REF/DTM/NTE" with a segment picker** (search by ID, scoped to the active transaction).

**Find-fix-1: Regex toggle in FindBar.**

**Convert-fix-1: CSV export option for line-item-heavy transactions.**

**Print-fix-1: Print Raw view as a separate command.**

**Drop-fix-1: Multi-file drop opens N tabs.**

### P4 — bigger features (defer)

- Diff view between two open tabs
- Minimap
- Per-partner profile (who you trade with → which dictionary tweaks apply)
- Aviator AI integration (Bucket B in the implementation plan)

---

## Suggested order of execution

1. **P0 ACK-fix-1** (≈ 200 lines) — addresses the user's reported issue head-on. One PR.
2. **P1 trio** — TRADACOMS ACK + Increment + Split (≈ 350 lines combined) — closes the "TRADACOMS gaps" pattern across three tools at once.
3. **Stage 1 from the existing plan** — 850/810/855 polish (≈ 600 lines).
4. **P2 BV-fix-1** — status pills for everything else (≈ 80 lines).
5. **P2 Validation-fix-1** — element-level checks (≈ 250 lines).
6. **P2 Validation-fix-2** — rule suppression (≈ 200 lines).
7. **P3 batch** — bundle 4–5 small fixes in one PR (≈ 400 lines).

Each PR ships independently; Netlify auto-deploys; tests stay green at every checkpoint.

---

## Files referenced in this audit

- `src/lib/edi/ack-generator.ts`
- `src/lib/edi/control-numbers.ts`
- `src/lib/edi/split-interchanges.ts`
- `src/lib/edi/validation.ts`
- `src/lib/edi/builder.ts`
- `src/lib/edi/find.ts`
- `src/lib/edi/converters.ts`
- `app/edi-notepad/components/document-studio/AckModal.tsx`
- `app/edi-notepad/components/document-studio/business-view/*.tsx` (renderers + dispatcher + helpers)
- `app/edi-notepad/components/document-studio/SegmentContextMenu.tsx`
- `app/edi-notepad/components/document-studio/ElementEditor.tsx`
- `app/edi-notepad/components/document-studio/Toolbar.tsx`
- `app/edi-notepad/components/document-studio/DocumentStudio.tsx`
- `app/edi-notepad/coverage/*`
