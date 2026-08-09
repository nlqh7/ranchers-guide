const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const html = fs.readFileSync(path.join(root, "index.html"), "utf8");
const cards = Array.from(html.matchAll(/<article class="card">([\s\S]*?)<\/article>/g)).map((match) => match[1]);
const guideCards = cards.filter((card) => /class="card-link"/.test(card));

assert.ok(guideCards.length >= 10, "homepage should keep its guide cards");
assert.doesNotMatch(html, /<span class="card-link">/, "visible card CTAs must be real links, not spans");

for (const card of guideCards) {
  const titleHref = (card.match(/<h3><a class="stretched" href="([^"]+)"/) || [])[1];
  const ctaHref = (card.match(/<a class="card-link" href="([^"]+)"/) || [])[1];
  assert.ok(titleHref, "each guide card needs a linked title");
  assert.equal(ctaHref, titleHref, `card CTA must match its title link: ${titleHref || "unknown"}`);
}

const css = fs.readFileSync(path.join(root, "assets", "css", "style.css"), "utf8");
assert.match(css, /\.card \.card-link[\s\S]*min-height:\s*44px/);
assert.match(css, /\.card \.card-link:focus-visible/);

console.log(`PASS: ${guideCards.length} homepage card CTAs are touch-sized links with matching destinations.`);
