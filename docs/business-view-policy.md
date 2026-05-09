# Business View policy — every transaction ships with a dedicated renderer

**Owner:** EDI Notepad 2026 maintainers
**Last updated:** 2026-05-09 (introduced after PR #19 BV expansion)

## Rule

> When a new transaction set / message is added to the curated dictionary
> (`src/lib/edi/dictionaries/*-transactions.ts` or `*-messages.ts`), a
> matching dedicated Business View renderer **must ship in the same PR**.
> The Generic fallback is a placeholder of last resort, not the default
> for new work.

This rule covers X12, EDIFACT, and TRADACOMS equally.

## Why

- The Generic fallback dumps a segment table — it's accurate but it's
  not a "business view." It tells a power user nothing about whether
  the document is valid in domain terms (totals match, dates make
  sense, parties are clear).
- Coverage page status is binary: **Complete** = full segment list +
  full element metadata. Without a dedicated renderer, the user only
  gets the data layer; the *interpretation* layer is missing.
- Adding the renderer at the same time as the dictionary keeps the
  two artifacts honest about scope. If we can describe what the
  message *means* well enough to render it, we know the dictionary
  entry is real; if we can't, we shouldn't claim coverage.

## What "dedicated renderer" means

At minimum:

1. **Header** — title that matches business naming (not just the code:
   "Purchase Order" not "850"), envelope subtitle (sender → receiver +
   ICN), and a status pill via `statusPillFor()`.
2. **Doc-meta block** — 3–5 fields parsed from the header segment
   (BEG / BCH / BPR / W05 / BGM etc.). Format dates with `formatDate()`
   and amounts with `formatAmount()`.
3. **Error panel** — gated by `block.showErrors !== false`. The user
   can hide the panel via the toggle on `PanelEditor`; renderers must
   honour that.
4. **Sections** — typically: References (REF / RFF), Dates (DTM),
   Parties (N1 loops via `collectN1Loops` + `renderParty`, or NAD
   loops via `collectNADs` + `renderNADParty` for EDIFACT), Line items,
   Totals (where applicable), Footer with control numbers.
5. **Code-list labels** — define a small `Record<string, string>` at
   the top of the file mapping qualifier codes to human labels for
   any field where the user needs context (BAK02, AT7, MOA qual, etc.).
   Keep these short — they're a UX aid, not a spec.

## File layout

```
app/edi-notepad/components/document-studio/business-view/
├── BusinessView.tsx          ← dispatcher
├── helpers.tsx               ← shared X12 helpers
├── edifact-helpers.tsx       ← shared EDIFACT helpers (NAD, DTM, MOA, QTY)
├── ErrorPanel.tsx
├── ErrorDrawer.tsx
├── Generic.tsx               ← last-resort fallback
├── X12_<code>.tsx            ← e.g. X12_850.tsx, X12_855.tsx
└── Edifact_<MSG>.tsx         ← e.g. Edifact_ORDERS.tsx
```

The dispatcher in `BusinessView.tsx` uses a `switch` on `block.code`
inside `if (block.standard === 'X12')` / `'EDIFACT'` blocks — add the
new `case` line that returns your render function.

## Naming convention

- Files: `X12_<code>.tsx`, `Edifact_<MSG>.tsx`, `Tradacoms_<MSG>.tsx`.
- Exported function: `renderX12_<code>`, `renderEdifact_<MSG>`,
  `renderTradacoms_<MSG>`. The dispatcher imports each as a function
  (lower-case `render` prefix).

## Status pill

Add an entry to `statusPillFor()` in `helpers.tsx` for any new
transaction code. If the transaction has no deterministic status code
(no purpose / ack / lifecycle field), return `null` and the header
will simply omit the pill — better than fabricating "Original".

## Renderers shipped today

**X12 (12):** 810 · 820 · 832 · 846 · 850 · 855 · 856 · 860 · 940 · 945 ·
997 · 999 (mapped to 997 renderer) · 214

**EDIFACT (4):** ORDERS · INVOIC · DESADV · CONTRL

**TRADACOMS:** none yet — add as needed; reuse `helpers.tsx`
patterns.

## Outstanding gaps (to be addressed in subsequent PRs)

X12 still falling through to Generic: 824, 830, 852, 861, 865, 869,
870, 875, 876, 880, 894, 204, 210, 211, 215, 943, 944, 947, 990.

EDIFACT: ORDRSP, ORDCHG, RECADV, PAYMUL, REMADV, PRICAT, INVRPT,
IFTMIN, IFTSTA.

TRADACOMS: ORDHDR, ORDERS, ORDTLR, INVFIL, INVOIC, ACKHDR, ACKTLR,
DLHDR, DLDET.

Each gap is a single new file + one switch-case + a status-pill
entry. Estimated 80–200 lines per renderer, depending on how much
domain interpretation the layout deserves.

## When the rule is *not* enforceable

If a transaction is added to the dictionary purely for parse / split
support (e.g. a low-volume control transaction we don't expect users
to inspect via Business view), the PR description must call out the
omission and add the transaction to the gap list above. Reviewers
should push back on omissions that lack justification.
