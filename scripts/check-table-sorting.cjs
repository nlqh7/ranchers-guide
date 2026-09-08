const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');

function header(cellIndex) {
  return { cellIndex, attrs: {}, events: {}, classList: { toggle() {} },
    setAttribute(key, value) { this.attrs[key] = value; },
    addEventListener(type, handler) { this.events[type] = handler; } };
}
const headers = [header(0), header(1)];
const cell = textContent => ({ textContent, getAttribute() { return null; } });
const rows = [
  { children: [cell('A'), cell('20')], textContent: 'A 20', style: {}, getAttribute() { return null; } },
  { children: [cell('B'), cell('3')], textContent: 'B 3', style: {}, getAttribute() { return null; } }
];
const body = { querySelectorAll() { return rows.slice(); }, appendChild(row) { rows.splice(rows.indexOf(row), 1); rows.push(row); } };
const table = { querySelector() { return body; }, querySelectorAll(selector) { return selector === 'th' ? headers : [headers[1]]; } };
vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../assets/js/database.js'), 'utf8'), {
  URLSearchParams,
  window: { location: { search: '' } },
  document: { documentElement: { lang: 'en' }, querySelector() { return null; }, getElementById(id) { return id === 'crops-table' ? table : null; } }
});
assert.equal(headers[1].tabIndex, 0, 'sortable headers must be keyboard reachable');
let prevented = false;
headers[1].events.keydown({ key: 'Enter', preventDefault() { prevented = true; } });
assert.ok(prevented);
assert.deepEqual(rows.map(row => row.children[1].textContent), ['3', '20'], 'use the actual column, not the sortable-header subset index');
assert.equal(headers[1].attrs['aria-sort'], 'ascending');
headers[1].events.keydown({ key: ' ', preventDefault() {} });
assert.deepEqual(rows.map(row => row.children[1].textContent), ['20', '3']);
assert.equal(headers[1].attrs['aria-sort'], 'descending');
headers[1].events.click();
assert.deepEqual(rows.map(row => row.children[1].textContent), ['3', '20']);
console.log('PASS: keyboard and pointer sorting use the correct column and expose direction.');
