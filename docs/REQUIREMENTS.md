# Campaign Services Rate Calculator, Requirements

## What's in this

- A single published Artifact that prices Campaign Services work from the four SKUs in the Campaign Definitions doc, replacing the scoping spreadsheet.
- The whole estimate lives in the URL, so a link is the estimate. This is why the calculator lives on GitHub Pages rather than as a Claude Artifact.
- The page is client-safe by default, with hours, the hourly rate and the capacity readout hidden until internal view is unlocked per viewer.
- Internal view unlocks on `?internal=1` or an Option-click, and turns on the switches for rate editing and volume pricing.
- Three flip cards at the bottom carry the client-facing inclusions on the face and the internal counting rules on the back.
- Requirements were captured in a 15 question interview on 17 September 2026.

## Current scope

### Audience and use

Used three ways, all confirmed: Sammy scoping solo, screen-shared live on a client call, and self-serve by CSMs. A client may also open a shared link unsupervised and change quantities.

### SKUs

Four, exactly as published in the Campaign Definitions doc. The hourly rate is 65 dollars.

| Key | Label | Price | Hours | Accent |
| --- | --- | --- | --- | --- |
| `e2ebc` | End-to-End Campaign Setup, Bluecore Designed Creative | 1,105 | 17 | Gold |
| `e2ecc` | End-to-End Campaign Setup, Customer Provided Creative | 585 | 9 | Blue |
| `rev` | Campaign Update and Revision | 130 | 2 | Orange |
| `touch` | Subsequent Touch, same End-to-End SKU | 470 | 7 | Green |

Subsequent touch hours are not published in the doc. Seven is derived from 470 divided by 65 and rounded, and is flagged in code as an assumption to confirm.

### Inputs

- Account name, free text, with a datalist of 60 names from the FY25-27 active customer cache. The datalist renders only when internal mode is on.
- Namespace, always free text, never a list.
- Contract term, selected from one-time, 3, 6, 12 and 24 months.
- Line items, added and removed freely, each with a SKU and a monthly quantity entered through a number input.

### Calculation

Quantity on each row is a monthly volume. The first money column is monthly, the second is monthly multiplied by the contract term, and its header renames itself to match the selected term. Both money columns are right-aligned and formatted as whole-dollar US currency. The grand total updates live.

### URL state

The whole estimate lives in the query string, written on change through `history.replaceState` and read once on load.

```
?a=Alo%20LLC&ns=alo&t=12&l=e2ecc:10:585,touch:24:470&d=2026-09-17
```

- `a` account, `ns` namespace, `t` term in months, `d` date stamp
- `l` line items, each `sku:quantity:unitPrice`
- `h` hours overrides, only written when a SKU's hours differ from the published default, so a client-safe link carries no effort figures in the address bar

Unit price is always written into the URL, so a shared link is a frozen quote. When rates change and the site is redeployed, links already sent keep the prices they were created with.

This was impossible on the original Claude Artifact, which renders inside a cross-origin iframe on `claudeusercontent.com` and never receives the outer query string or hash. Verified in the browser on 17 September 2026. Moving to GitHub Pages restored it.

### Hidden parameters

| Parameter | Effect |
| --- | --- |
| `discount=1` | Reveals the volume tier ladder. Client-facing, so the share button keeps it |
| `edit=1` | Makes unit price and hours editable inline. Implies `internal=1` |
| `internal=1` | Reveals hours, the hourly rate, the capacity readout and the account datalist |

Internal view has a second route that does not need the parameter: Option-click the eyebrow above the title, or press Alt and Shift and I. That route persists per browser in `localStorage`, while `?internal=1` does not, so a link someone sends never sticks. A lock pill in the header hides everything again in one click before a screen share.

### Discounting

A volume-tier ladder, measured against total campaign build units across the contract term. Revisions are deliberately excluded from the threshold count. Thresholds and percentages sit in one editable object so they can move after Sammy consults his manager.

The display always uses anchored framing: list total struck through, discounted total in full weight, a savings callout in dollars and percent, the effective per-build rate, and a nudge naming how many more builds unlock the next tier.

### Presets

Five one-click presets built from the worked examples in the doc. Each sets the term to one-time so its total reconciles exactly against the published figure: 7,980 and 8,775 and 23,400 and 2,925 and 3,830.

### Sharing

The main share button copies a client-safe URL, stripping `internal`, `edit` and `h` while keeping `discount`. A second button, visible only in internal view, copies the URL with every flag and the hours overrides intact, for handing to a CSM.

### Cards

Three cards, End-to-End and Subsequent Touch and Revision. The face carries client-safe inclusions. The back, revealed on click or by a keyboard-reachable control, carries the counting rules that get applied wrongly, including the rule that a subsequent touch must never be booked as a Revision SKU. Cards lift and deepen their shadow on hover, and all motion is suppressed under reduced-motion preferences.

### Footer

Permanently visible in every view: "Estimate for discussion, not a binding quote", plus the date the estimate was generated.

## Future scope

- Refreshing the baked account list, which is a snapshot and needs a republish to update.
- Changing the discount thresholds, percentages and basis once the executive framing is settled.
- Confirming the subsequent touch hours figure.

## Non-goals

- Contract usage tracking, meaning how much of a client's contracted allowance is already consumed. Explicitly ruled out.
- Custom line items with no SKU. The four SKUs are the whole list.
- CSV export, PDF export and clipboard summary export. The link is the deliverable.
- Renaming, adding or deleting SKUs.

## Constraints and assumptions

- The site is deployed to GitHub Pages at `https://sammy-bluecore.github.io/cs-rate-calculator/`, from the `main` branch root of the public repo `sammy-bluecore/cs-rate-calculator`. Pushing to `main` is the deploy.
- URL parameters and URL state are impossible in a published Claude Artifact. Verified, not assumed. That is why this is not an artifact.
- **The site is public.** A GitHub Pages site is served publicly even from a private repo, and private Pages needs Enterprise Cloud, which would also stop clients opening it. So the account list, the $65 hourly rate and the per-SKU hours are readable by anyone holding the URL or finding the repo. Sammy accepted this on 17 September 2026. A `robots.txt` and a `noindex` meta keep it out of search results, which prevents discovery but not access.
- Hours are omitted from a client share URL, so a client-safe link carries no effort figures in the address bar. The page source is a different matter, see above.
- The account cache was fetched on 16 July 2026 and is a point-in-time snapshot.
- Visual direction follows the Migration Handbook artifact for typography and token architecture, pushed further into gradients, larger radii and layered shadows at Sammy's request.

## Coverage check

| Area | Questions | What was learned |
| --- | --- | --- |
| 1. Problem and success | 1, 2 | Replaces a scoping spreadsheet that is clunky to share, easy to break, and leaks hours and rate |
| 2. Current scope | 3, 4, 11, 14 | Four SKUs, monthly quantity times contract term, flip cards, capacity readout and presets |
| 3. Users, access, permissions | 1, 5 | Sammy, CSMs and clients, with client-safe as the default and internal behind a parameter |
| 4. Inputs and data sources | 9 | Baked account names from the FY25-27 cache in internal mode, namespace free text |
| 5. Outputs and destinations | 10 | URL only, no export formats. Delivered as originally specified once the site moved to GitHub Pages |
| 6. Aesthetic and UX | 8 | Handbook structure and typography, pushed fully 3D and colourful |
| 7. Cost tolerance, build versus buy | SKIPPED | A published Artifact carries no incremental cost and no vendor choice, so there was nothing to trade off. Flagged here rather than assumed silently |
| 8. Future scope and 10x | 12, 15 | Prices freeze into shared links, so rate changes do not disturb estimates already sent |
| 9. Non-goals | 15 | Contract usage tracking ruled out |
| 10. Integration and platform | 10, 15 | Standalone page, no Wrike or Salesforce write-back requested |
| 11. Maintenance ownership | INFERRED | Sammy owns it, consistent with every other artifact in this workspace. Not asked directly |

## What I did not ask

- Cost tolerance and build versus buy, area 7, was skipped deliberately. The deliverable is a published Artifact with no licence, no hosting bill and no vendor shortlist, so a cost question would have produced no decision.
- Maintenance ownership, area 11, was inferred from the existing pattern in this workspace rather than confirmed. If someone other than Sammy will edit the rates, that changes where the config object should be documented.
- Whether the artifact should be shared organisation-wide or link-only was assumed to be Sammy's call at publish time, not confirmed.
- The subsequent touch hours figure was derived rather than confirmed, because it is absent from the source doc.
- Wrike and Salesforce write-back was offered as a non-goal and not selected, so it is recorded as neither in nor out. Treated as out for this build.

## Open questions

- Are 7 hours correct for a subsequent touch, or does the team book a different figure?
- Should the discount tier thresholds be measured on build units or on contract dollar value once the executive framing is settled?
- Should Wrike or Salesforce write-back be formally ruled out, or held open for a later version?
