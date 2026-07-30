# Project Notes

## Project Shape
- This is a static HTML/CSS/JS guide site for `theranchersguide.com`.
- Root-level `.html` files are top-level site pages.
- `guides/` contains long-form guide articles.
- `database/` contains searchable table pages.
- `tools/` contains interactive static tools.
- `assets/css/`, `assets/js/`, and `assets/img/` contain shared styling, scripts, and images.
- `scripts/` contains repository maintenance checks; use verb-first names and keep them dependency-free.

## Editing Rules
- Keep the site deployable as plain static files.
- Do not introduce a build step unless the project first adds documentation explaining why it is needed.
- Do not publish unverified game numbers as facts. Use `TBD`, `pending launch confirmation`, or cite the exact source.
- Keep fan-site disclaimers visible wherever game assets, names, or data are discussed.
- After changes, run a local reference check for relative `href` and `src` links.
- Internal page links must use the same extensionless root-relative routes as canonical URLs and `sitemap.xml`; never link users or crawlers to `.html` redirect URLs.
- Run `powershell -NoProfile -ExecutionPolicy Bypass -File scripts/check-internal-links.ps1` after changing HTML navigation or page URLs.

## Launch Data Rule
- The Ranchers Early Access date must be kept consistent across metadata, visible copy, FAQ schema, countdown logic, README, and outreach documents.
- As of this project note, the public launch date used by the site is July 30, 2026.

## Monitoring Automation Rule
- Do not create an AdSense or Search Console monitoring automation until the authenticated browser can reliably read the required fields from both services in a live test.
- A visible tab or successful login is not sufficient verification; confirm actual status or metric values before scheduling recurring checks.
- Before attributing an AdSense or Search Console status to a deployment, compare the dashboard's last-updated time with the commit and deployment times.
- Do not change `ads.txt` based only on a stale dashboard label; first verify the root-domain file with HTTP, HTTPS, `www`, and Google advertising crawler user agents.
