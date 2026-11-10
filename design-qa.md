# Style 1 Design QA

Date: 2026-11-04

## Visual Target

- Source: /Users/tsunghan/.codex/generated_images/019f3c4c-12d8-7672-9075-76b286aa3261/exec-e77252b9-4d94-4f2f-b6ac-069dbc8c76a2.png
- Implementation: /private/tmp/invoice-style1-final.png
- Full page: /private/tmp/invoice-style1-final-full.png
- Mobile: /private/tmp/invoice-style1-mobile.png
- Full comparison: /private/tmp/invoice-style1-comparison.png
- Focused invoice comparison: /private/tmp/invoice-style1-preview-comparison.png
- Desktop CSS viewport: 1488 x 1056, device scale factor 1.
- Source raster normalized to 1488 x 1056 for comparison; implementation 1488 x 1056.
- State: fictional buyer, two teaching/material lines, subtotal 14000, tax 700, total 14700; three teaching allocation proposals; settings collapsed; scroll position zero.

## Comparison History

1. Initial render: P1 editor/preview structure corrected to the selected two-column design. P2 item table below the first viewport and oversized proposal cards remained.
2. Moved buyer information above invoice settings; moved memo and totals below the item table; collapsed draft files, source comparison, and advanced tax fields. Increased invoice text readability; replaced the blue stamp reminder with a small neutral stamp field.
3. Tightened invoice row height and proposal cards. All three proposal cards now fit in the reference desktop viewport (last card bottom about 1021px). Re-captured at scrollY 0 and compared full and focused regions.

## Fidelity Surfaces

- Typography: system Traditional Chinese sans-serif UI, modest serif invoice heading; no hero-sized headings. Small invoice type is intentionally denser than UI text.
- Spacing/layout: 42/58 editor/preview tracks, fine vertical divider, white unframed sections, compact proposal rows. Necessary invoice-number and review fields cause a modest extra left-column height compared with the concept.
- Colors: white ground, charcoal type, restrained teal actions, muted amber draft status. No gradient cards or blue stamp panel.
- Assets: actual Lucide download/printer/plus SVG assets with license; loaded successfully in browser. The invoice is editable HTML rather than a flattened mock image.
- Copy/content: omitted unimplemented history/customer/catalog tabs because database work is deferred. Available draft import/export uses a real menu. Source proposal wording is adapted to the existing calculation engine, not the mock's illustrative proposals. Reference sample address is not invented when absent from source text.

## Functional Checks

- Description parsing and 14700 total verified.
- Advanced price/tax controls reveal and hide verified.
- Proposal B apply, selected feedback, and undo verified.
- Proposal details expansion verified.
- PNG download verified.
- Mobile 390 x 844: no whole-page horizontal overflow, editor/preview switch and download control verified; invoice can scroll horizontally within its preview.
- Lucide assets nonblank and loaded.
- Browser console: zero errors and warnings on final validation page.
- JavaScript syntax checks and git diff whitespace check passed.

## Residual Differences / Follow-up Polish

- P3: printed invoice font and rule proportions are not pixel-identical to the generated reference; the editable paper supports five rows and longer notes.
- P3: optional future history/customer/catalog navigation remains deferred with database work.
- Safari-specific PNG behavior not tested in this run.

final result: passed

## 2026-11-10 Workflow Audit Fixes

- Extended parser aliases and merchandise formats: adjacent product/price equations, colon separators, paired name/equation segments, additional quantity units, and unambiguous labeled fields. Ambiguous ASCII model/price boundaries and inconsistent arithmetic remain review errors.
- Verified both reported three-product formats: quantities 20/9/10, unit prices 600/1000/500, net 26000 and gross 27300 when untaxed. Original multiline lesson format still produces net 4800 and gross 5040.
- New buyer/source identity clears absent previous buyer fields; source parsing invalidates outstanding company queries. Undo restores fields, original parsed text, rows and pricing state together.
- Failed parsing can populate recovered buyer fields, but preserves old rows with a visible warning and prevents old-data PNG/print output.
- Initial empty state uses a neutral message. Each editable unit price is labeled taxed/untaxed/pending; manual overrides of explicit source pricing are disclosed.
- Mobile: sticky editor/preview controls and total, direct review-items action, compact secondary item tools, whole-paper fit plus explicit zoom/scroll mode. At 390px the fitted paper right edge is 374px and document width is 390px.
- Source proposal generation omits redundant merge/context versions. A single item without background yields one version; background creates a genuinely different memo version. Apply, undo and manual-input invalidation exercised in browser.
- Paper unit prices use at most two decimals and an approximation marker where multiplication differs; line totals remain unchanged with a visible reconciliation note.
- PNG exports use Blob URLs, have a retained manual download link, invalidate old links on edits and report browser-save uncertainty honestly. Downloaded PNG was opened and visually inspected; all columns and the grand total are present.
- Draft JSON exports avoid unsupported native save pickers, retain a manual download link and preserve source review metadata. Actual exported JSON was read back and loaded in browser. Invalid-format import was rejected without replacing buyer or total.
- Parser regression tests, JavaScript syntax checks and whitespace checks passed. Test evidence: output/playwright/fix-20261110/; screenshots and downloaded synthetic files are local-only and not included in deployment.
- Limits: mobile checks are viewport simulations, not physical Android/iPhone tests; physical printing and screen-reader acceptance are not established by this run.

## Transaction Parsing and Interaction Correction

- Corrected labeled multiline item names and standalone unit-price equations; regression fixtures use fictional buyer data only.
- Price confirmation now parses unprocessed source text before applying the selected price type. Explicit source pricing wins on a fresh parse unless the user deliberately confirms an override.
- Source-based proposals preserve original line items, quantities, and transaction context. Applying and undoing a proposal restores its memo as well.
- Real proposal radios, invoice-kind controls, and invoice-period selection were exercised in the browser. Fixed the period input/change event race.
- Recalibrated the two-column layout, compact review controls, invoice header, and Chinese grand-total row against the supplied reference. Navigation targets existing sections; database features remain deferred.
- Verified: multiline source with unit price 1200 and quantity 4 produces net 4800, tax 240, gross 5040 when confirmed untaxed; two-line teaching/material example produces gross 14700.
- Parser regression checks, JavaScript syntax checks, whitespace checks, PNG download, proposal selection/undo, and 390px mobile overflow checks passed. Final browser console: zero errors or warnings.
- Latest desktop: /private/tmp/invoice-corrected-desktop.png
- Latest full page: /private/tmp/invoice-corrected-full.png
- Latest mobile: /private/tmp/invoice-corrected-mobile.png
- Latest PNG export: /private/tmp/invoice-corrected-export.png
- Latest source/implementation comparison: /private/tmp/invoice-corrected-comparison.png
- Remaining limits: parsing is local rule-based recognition, not unrestricted AI; print typography is not pixel-identical to the generated reference; Safari-specific export is untested.
