# Campaign Services Rate Calculator

Prices Bluecore Campaign Services work from the four SKUs in the Campaign Services campaign definitions doc, then shares the estimate as a link.

**Live:** https://sammy-bluecore.github.io/cs-rate-calculator/

The whole estimate lives in the query string, so a link is the estimate. Send someone the link and they see exactly what you built, and can change it themselves.

## URL parameters

Stack them freely, for example `?internal=1&edit=1&discount=1`.

| Parameter | Effect |
| --- | --- |
| `a` | Account name |
| `d` | Date stamp, `YYYY-MM-DD` |
| `discount=1` | Shows the volume tier ladder. Client-facing, so the Share button keeps it |
| `edit=1` | Makes unit price and hours editable inline. Implies `internal=1` |
| `h` | Hours overrides, `sku:hours` comma separated. Only ever written to an internal link |
| `internal=1` | Reveals hours, the hourly rate, the capacity readout and the account list |
| `l` | Line items, `sku:quantity:unitPrice` comma separated |
| `ns` | Namespace |
| `t` | Contract term in months. `1` means one-time |

SKU keys are `e2ebc`, `e2ecc`, `rev` and `touch`.

## Internal view

Two ways in, and they behave differently on purpose.

- `?internal=1` opens it for that page load only, and does **not** persist. A link someone sends you never sticks.
- **Option-click** the "Bluecore Campaign Services" label above the title, or press **Alt+Shift+I**. This persists in `localStorage` for your browser, so you do not have to type the parameter every session. A plain click does nothing, so a client cannot stumble into it.

While internal view is on, a "lock" pill sits in the header. One click hides everything again before a screen share.

## Sharing

- **Copy share link** produces a client-safe URL: no `internal`, no `edit`, no `h`. The discount flag stays, because the discount is part of the client story.
- **Copy internal link**, visible only in internal view, keeps every flag and the hours overrides, for handing to a CSM.

Unit price always rides in the URL, so a link you sent last quarter keeps last quarter's prices even after the rates in this file change.

## Changing the numbers

Everything a rate change touches sits in one block near the top of the `<script>` in `index.html`.

| Constant | What it controls |
| --- | --- |
| `ACCOUNTS` | The 60 account names in the internal datalist |
| `DISCOUNT_TIERS` | Volume thresholds and percentages |
| `HOURLY_RATE` | The internal hourly rate |
| `PRESETS` | The five worked examples from the definitions doc |
| `SKUS` | Label, price, hours and accent colour per SKU |
| `TIER_BASIS` | Which SKUs count toward a volume threshold. Revisions are deliberately excluded |

After editing, run the tests, then commit and push to `main`. GitHub Pages redeploys on its own.

## Tests

```
node test/e2e.js
```

101 assertions in jsdom covering the money path, URL round trips, the client-safe boundary, the discount ladder boundaries, and the cards. The suite looks for jsdom in `node_modules/`, then falls back to the copy under `Campaign-Services-claude`.

The page also carries a self-check callable from the browser console:

```js
demo()
```

## Deployment

Single self-contained `index.html` at the repo root. GitHub Pages serves `main` at `/`, legacy build, no Actions workflow. Pushing to `main` is the deploy.

## A note on what is public

A GitHub Pages site is served publicly. Anyone with this URL, or anyone who finds this repo, can read the account list, the hourly rate and the per-SKU hours from the page source. `robots.txt` and a `noindex` meta keep it out of search results, which prevents discovery but not access. This was a deliberate trade, taken knowingly.

## Docs

`docs/REQUIREMENTS.md` carries the full requirements, the coverage check and the open questions.
