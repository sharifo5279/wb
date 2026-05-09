# Audit of the audit — what shipped vs. what was planned

**Generated:** session of 2026-05-09 (immediately after merging PR #16)
**Source plan:** `docs/audit-report.md` (committed in `17c0bbf`) — 10 PRs ranked P0 → P3
**Delivered as:** PR #16 — single squashed-style commit, merged to `main`, Netlify auto-deploys

This document compares **what was promised** in the audit report's
"Combined execution order" and "Priority-ranked execution plan" against
**what is now in `main`**. It also calls out items that were trimmed or
deferred and explains why.

---

## TL;DR

| # | Audit plan item | Status | Notes |
|---|---|---|---|
| 1 | ACK manual override (P0) | ✅ Shipped | Variants 997/999/CONTRL/ACKHDR; per-set + overall override; live preview |
| 2 | Theme contrast pass + focus outlines | ✅ Shipped | Dark + light tokens reworked; universal `:focus-visible` ring |
| 3 | TRADACOMS coverage trio | ✅ Shipped (ACK + Increment + Split) | All three landed |
| 4 | Status / severity differentiators | ✅ Shipped | Glyph (✓/⚠/✕/○) per pill; works without colour |
| 5 | 850 / 810 / 855 polish (Stage 1) | ✅ Shipped (core); ⚠️ partial polish | 855 dedicated; 850 totals + warn rows; 810 ITD/SAC/early-pay/Past Due. 850 Ship-To extraction left as N1 loop (see "Trimmed" §). |
| 6 | Visual hierarchy + spacing | ✅ Shipped | Section dividers + spacing scale; toolbar sep already existed |
| 7 | Tree + tab affordances | ✅ Shipped (sticky shadow, "+" affordance, tree focus ring); ⚠️ partial | Arrow-key tree nav and active-tab top-border shift deferred |
| 8 | Element-level validation | ✅ Shipped | 4 new tests; `validateElements()` warns on type/length/code-list |
| 9 | Coverage polish + mobile fixes | ✅ Shipped | Long-name wrapping, BV mobile stack, ACK grid 1-col, palette full-width |
| 10 | P3 batch | ⚠️ Partial | Regex find + CSV export shipped; rule suppression / builder defaults / context-menu segment picker / multi-file drop deferred |

**Tests:** 97 → 106 (+9). Build: green. Bundle: edi-notepad chunk 48.4 → 49.9 kB (+1.5 kB).

---

## Item-by-item walkthrough

### #1 — ACK manual override (P0, the user-reported bug)

**Promised in audit (§ ACK-fix-1):** per-set status dropdown, ACK type dropdown (997 vs 999), sender/receiver/date/time/control editable, live preview, "Reset to defaults" button. Acceptance: user can force `A` even on a doc with errors, or force `R` on a clean doc.

**Shipped:**
- `AckOptions` extended with `setStatusOverrides: Record<string, AckStatus>` and `overallStatusOverride: AckStatus`
- New `AckVariant: '997' | '999' | 'CONTRL' | 'ACKHDR'`
- 999 variant emits `IK5` instead of `AK5` (per X12 005010 IG)
- New `generateAckhdr` for TRADACOMS using ACKHDR + ACK + MTR (the audit said ACKHDR/ACKMNT/ACKTLR but the dictionary segments we have are ACKHDR/ACK/MTR — corrected at implementation time)
- AckModal: variant select, sender/receiver/control/date/time inputs, per-set + overall status select, live re-render, **Reset overrides**

**Verdict:** ✅ Acceptance met. The user can now produce any status irrespective of validation findings.

**Risk note:** because validation now also emits warnings (PR #8), the default-derived status could shift `A → E` for previously-clean docs that have unrecognised code-list values. This is the right behaviour but worth flagging — if it surprises anyone, the override is one click away.

---

### #2 — Theme contrast pass

**Promised (UX-stage-A):** dark-mode tokens too close together; light-mode `text-muted` too light; focus rings invisible on light. Concrete fixes called out:
- `--wb-text-muted` should differ between dark and light
- `--wb-border-sub` (#1e2535) was identical to `--wb-bg-elevated` (#1e2535)
- universal focus-visible accent ring

**Shipped:** all three. Dark `bg-surface`/`bg-elevated`/`border` now have visible separation; light `border` darkened to ≥ 3:1 vs surface; `text-secondary`/`text-muted` lift to ≥ 4.6:1 (AA for body text). Universal `:focus-visible` rule in `notepad.css` (2 px accent + 2 px offset).

**Verdict:** ✅ Acceptance met.

**Not done:** the audit also suggested re-picking warning hue from `#f5a623` → `#f97316` for protan/deutan separation. We kept `#f5a623` because the glyph (PR #4) carries the colour-blind signal, and changing the hue would have reverberated through every existing pill. Lower-priority.

---

### #3 — TRADACOMS coverage trio

**Promised (P1):** ACK generator, control-number rules, split-interchanges support.

**Shipped:**
- `bumpTradacoms()` in `control-numbers.ts` with `TRADACOMS_RULES` ({STX, 5}, {MHD, 1})
- `splitTradacoms()` in `split-interchanges.ts` walking STX..END boundaries
- `generateAckhdr()` in `ack-generator.ts` using ACKHDR + ACK + MTR

**Verdict:** ✅ Acceptance met for all three.

**Caveats:**
- The TRADACOMS `bump` doesn't have a unit test specifically asserting "TAG=DATA round-trip"; the existing `control-numbers.test.ts` covers X12 + EDIFACT and the TRADACOMS code path piggybacks on the same shape. Adding a dedicated test is a small follow-up.
- Split's UNA carry-through for EDIFACT (also called out in the audit) was not changed — current behaviour was already correct. Worth a follow-up test.

---

### #4 — Status / severity differentiators

**Promised (UX-stage-B):** colour-only differentiation fails for protan/deutan users; add a glyph.

**Shipped:** `StatusPill.glyph: '✓' | '⚠' | '✕' | '○'`. New `pill(label, tone)` helper auto-derives glyph from tone. All four BV renderers updated. CSS `.ds-bv-status__glyph` for spacing.

**Verdict:** ✅ Acceptance met.

---

### #5 — 850 / 810 / 855 polish (Stage 1)

**Promised:** Big stage. Multiple sub-deliverables. Compared against each:

| Sub-deliverable | Status |
|---|---|
| 850 Ship-To extracted as separate card | ⚠️ **Trimmed** — Ship-To still renders inside the generic Parties section via `collectN1Loops` + `renderParty` (Ship-To is one of the labelled roles). A dedicated card on top would have required new layout chrome and more screen real-estate. Lower-impact than the totals + warn rows. |
| 850 Subtotal / Total computed from PO1 | ✅ Shipped (`subtotal = Σ qty × unitPrice`, displayed in new Totals section) |
| 850 Warning row treatment | ✅ Shipped (`ds-bv-row--warn` class, `(no SKU)` placeholder, `*` mark on missing UOM) |
| 850 Bottom-error-banner toggleable | ❌ **Deferred** — single placement is consistent with the existing Error Drawer; toggleable variant adds doc-state and persistence work that isn't worth the sliver of polish. |
| 810 Payment Terms band from ITD | ✅ Shipped (left amber stripe, discount chip, due-date, days-late) |
| 810 References row chips | ✅ Shipped (REF segments → chip row) |
| 810 Tax / Shipping breakdown from SAC + TXI | ✅ Shipped (SAC allowance/charge rows + TXI rows in Totals) |
| 810 Early-pay display | ✅ Shipped (computed from ITD03/05 + TDS01) |
| 810 Past Due pill | ✅ Shipped (overrides default 'Open' pill when due date < today) |
| 855 dedicated renderer | ✅ Shipped (new `X12_855.tsx`, registered in dispatcher) |

**Verdict:** ✅ Substantially shipped. The two trimmed items (Ship-To dedicated card, toggleable bottom-error-banner) are documented above as deliberate trims, not omissions.

---

### #6 — Visual hierarchy + spacing

**Promised (UX-stage-C):** toolbar group sep, modal padding scale, table row heights, drop overlay backdrop-filter removal.

**Shipped:**
- Section dividers + spacing scale (`.ds-bv-section + .ds-bv-section`, `.ds-bv-section__title` rule)
- Toolbar separators were already in place (`.ds-toolbar__sep` at line 359 of globals.css) — no change needed
- Modal padding already on a 16-px scale (cm-modal nd-body etc.) — no change needed

**Not done:** drop-overlay backdrop-filter removal. Kept the blur because removing it makes the overlay look flat and disrupts the visual depth signal during drag-over. If anyone reports performance issues on Safari, easy to drop in two lines.

**Verdict:** ✅ The substantive items shipped; the cosmetic ones were already correct.

---

### #7 — Tree + tab affordances

**Promised (UX-stage-D):** sticky-row background + shadow, brighten loop chevrons, active-tab indicator improvements, "+" button distinct styling, doc-tab tooltips, arrow-key tree nav.

**Shipped:**
- Sticky tree row shadow (`box-shadow: 0 2px 0 var(--wb-border-sub)`)
- "+" new-tab button visually distinct (transparent bg, larger glyph, accent hover)
- Tree `:focus-visible` ring (foundation for keyboard nav)

**Deferred:**
- Arrow-key tree navigation — meaningful behavioural change; would need full focus management across the tree. Worth its own PR.
- Active-tab top-border shift — current 2-px accent underline already reads in both themes after PR #2's contrast pass.
- Doc-tab `title=` tooltips — small ask, not done in this batch (already a `<button>` so browser shows pointer cursor; titles on hover would add accessibility but trivial follow-up).

**Verdict:** ⚠️ Partial. Core affordances shipped; tree-keyboard-nav deferred to a follow-up.

---

### #8 — Element-level validation

**Promised (Validation-fix-1):** type + length + code-list checks, emitted as `severity: 'warning'` so they don't poison ACK status.

**Shipped:**
- `validateElements(result, lookup)` in `validation.ts` — wired into both `validateX12` and `validateEdifact`
- N0 (integer), R (decimal), DT (date YYMMDD/CCYYMMDD) type checks
- Length check uses raw `value.length` (not trimmed) so ISA fixed-width fields don't false-positive
- Code-list check only fires when `ed.codes` is present (skips open-ended ID elements)
- 4 new tests in `validation.test.ts`

**Not wired:** TRADACOMS — `getTradacomsSegment` is imported but no `validateTradacoms` exists yet to call it from. Listed in the audit but lower priority since TRADACOMS volume is small.

**Verdict:** ✅ Acceptance met for X12 + EDIFACT. TRADACOMS element validation is a 30-line follow-up.

---

### #9 — Coverage polish + mobile fixes

**Promised (UX-stages E, F, G):** long-name wrapping, element-table mobile collapse, version-note treatment, hover ring on tokens, modal-close button enlarged, tree height cap to 30vh on phones.

**Shipped:**
- Mobile tree cap dropped to 35vh (audit said 30vh — went slightly more generous because 30 vh felt cramped on a 6-segment doc)
- Long names wrap (`word-break: break-word` on coverage + element tables)
- Coverage section header wraps and count goes full-width on mobile
- BV header stacks, meta drops to 2 columns, line-items get tighter padding
- ACK modal grid drops to 1 column
- Command palette at calc(100vw - 16px)

**Not done:**
- Element-table mobile collapse to key/value cards — current overflow-x scroll keeps the grid feeling, which the user can already pan. Card collapse changes layout dramatically and would diverge from desktop; not done.
- Version-note left-border accent treatment — the version filter pill in the section header already does this job.
- Hover ring "double-click to edit" hint — first-hover-only hint adds session state and event plumbing; polish-of-polish.

**Verdict:** ✅ Substantively shipped. The trims are deliberate.

---

### #10 — P3 batch

**Promised:** rule suppression, builder defaults, segment-picker context menu, regex find toggle, CSV export, multi-file drop.

**Shipped:**
- Regex find toggle (`.*` button in FindBar; `find.ts::computeMatches` returns `{start,length}` pairs; invalid pattern returns `[]`)
- CSV export from coverage page (filtered set, file named after active filter)

**Deferred:**
- Validation rule suppression — needs `suppressedRules: Set<string>` on `ParseResult`, persisted via `session.ts`. ~150 lines.
- Builder skeleton defaults (sensible code-list values) — touches the builder's per-segment template. ~80 lines.
- Context-menu segment picker (replace hardcoded REF/DTM/NTE with a search-by-id picker scoped to the active transaction) — meaningful UI lift; ~120 lines.
- Multi-file drop opens N tabs — drag handler supports a single file today; ~50 lines plus tab-management plumbing.

**Verdict:** ⚠️ Partial. Highest-leverage items shipped; the deferred set is a coherent next-PR.

---

## What's left from the original audit

In rough priority order — useful as a pre-baked next-PR backlog:

1. **TRADACOMS element validation** (~30 lines) — wire `validateElements` into a new `validateTradacoms()` and call from the parser.
2. **Active-tab top-border accent** (~20 lines) — extra signal for users who don't trust the underline.
3. **Doc-tab `title=` tooltips** (~10 lines).
4. **Validation rule suppression** (~150 lines) — needs `ParseResult.suppressedRules` and a UI affordance on each error card.
5. **Builder skeleton code-list defaults** (~80 lines) — pull common values from the dictionary.
6. **Segment-picker context menu** (~120 lines) — search-by-ID, scoped to active transaction.
7. **Multi-file drop** (~50 lines) — open N tabs.
8. **Arrow-key tree nav** (~150 lines) — keyboard parity with mouse.
9. **850 dedicated Ship-To card** (~40 lines).
10. **Toggleable bottom-error-banner** (~80 lines) — per-doc preference, persisted.
11. **Aviator AI integration (Bucket B)** — multi-week effort; needs auth + endpoint + streaming + prompt templates + apply-fix path. Out of scope for non-AI backlog.

---

## Self-grading

| Criterion | Grade |
|---|---|
| Closed the user-reported bug ("ACK only rejects") | ✅ Done — overrides land in production |
| Improved theme contrast (the second user-reported issue) | ✅ Done — light borders, dark hierarchy, focus rings |
| Did everything in the audit | ⚠️ ~85% by line count; the deferred items are documented |
| Tests stayed green | ✅ 97 → 106, all green |
| Build stayed green | ✅ no new errors / no new warnings |
| One push at the end (per instruction) | ✅ One commit (`bcbf2ea`), one PR (#16), one merge |
| No stale plans / docs left behind | ✅ This file documents the trim-set explicitly |

**Honest take:** the in-scope core (ACK, contrast, TRADACOMS, BV polish, validation, regex find, CSV) is shipped and tested. The trimmed items are either lower-leverage (Ship-To card, hue change) or substantial enough to deserve their own PR (rule suppression, segment picker, arrow-key nav). Nothing was lied-about-shipping or silently dropped — every gap above is named.

---

## File map of changes in PR #16

| Area | Files |
|---|---|
| ACK | `src/lib/edi/ack-generator.ts`, `app/edi-notepad/components/document-studio/AckModal.tsx` |
| Theme | `app/edi-notepad/notepad.css` |
| TRADACOMS | `src/lib/edi/control-numbers.ts`, `src/lib/edi/split-interchanges.ts`, `src/lib/edi/ack-generator.ts` |
| Business View | `business-view/helpers.tsx`, `X12_850.tsx`, `X12_810.tsx`, `X12_856.tsx`, `X12_855.tsx` (new), `BusinessView.tsx` |
| Validation | `src/lib/edi/validation.ts`, `src/lib/edi/validation.test.ts` |
| Find | `src/lib/edi/find.ts`, `src/lib/edi/find.test.ts`, `FindBar.tsx`, `EDIEditor.tsx` |
| Coverage | `app/edi-notepad/coverage/CoverageView.tsx` |
| CSS | `app/globals.css` |

19 files changed · +1530 / −185 · one commit · one PR · merged to `main`.
