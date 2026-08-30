const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const root = path.resolve(__dirname, '..');
assert.ok(fs.existsSync(path.join(root, 'data/item-icons.json')), 'named entries need a verified native icon manifest');
const manifest = require('../data/item-icons.json');
assert.equal(manifest.icons.length, 20);
assert.equal(new Set(manifest.icons.map(i => `${i.kind}:${i.id}`)).size, 20);
for (const icon of manifest.icons) {
  const png = fs.readFileSync(path.join(root, icon.src));
  assert.equal(crypto.createHash('sha256').update(png).digest('hex'), icon.sha256, icon.id);
  assert.equal(png.readUInt32BE(16), icon.width);
  assert.equal(png.readUInt32BE(20), icon.height);
  assert.match(icon.spriteSha256, /^[a-f0-9]{64}$/);
  assert.match(icon.textureSha256, /^[a-f0-9]{64}$/);
  assert.ok(icon.spritePathId && icon.texturePathId);
  for (const prefix of ['', 'zh/']) {
    const hub = fs.readFileSync(path.join(root, prefix, 'database.html'), 'utf8');
    const page = fs.readFileSync(path.join(root, prefix, 'database', `${icon.kind}.html`), 'utf8');
    const link = hub.match(new RegExp(`<a href="/${prefix}database/${icon.kind}#${icon.id}">([\\s\\S]*?)</a>`))?.[1];
    assert.ok(link?.includes(icon.src), `${prefix}${icon.id}: native icon accompanies the hub name`);
    assert.match(link, /alt=""/);
    if (prefix && icon.id === 'wood-log') {
      const native = require('../data/build-resources.json').items.find(i => i.materialId === icon.id);
      assert.ok(link.includes(`>${native.zhName}</span>`), 'compact Chinese lookup uses the verified native name');
      assert.ok(!link.includes(native.name), 'English aliases belong in the profile, not the Chinese navigation');
    }
    const profile = page.match(new RegExp(`<section[^>]*id="${icon.id}"[^>]*>[\\s\\S]*?</section>`))?.[0];
    assert.ok(profile?.match(/<h2[^>]*>[\s\S]*?<\/h2>/)?.[0].includes(icon.src), `${prefix}${icon.id}: profile uses the same icon`);
    assert.doesNotMatch(hub, /coverage-summary|knowledge-category-number|ANSWER PAGES|EVIDENCE LEVELS|hero-stats/i);
  }
}
console.log('PASS: 20 native icons retain source hashes, paired names and profile destinations.');
