const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const app = require('../app.js');

test('normalizeTapeCollection strips any director field from archive entries', () => {
  const tapes = app.normalizeTapeCollection([
    { id: 'ABCD', title: 'The Matrix', director: 'The Wachowskis', year: 1999 },
    { id: 'EFGH', title: 'Alien', year: 1979 }
  ]);

  assert.deepEqual(tapes, [
    { id: 'ABCD', title: 'The Matrix', year: 1999 },
    { id: 'EFGH', title: 'Alien', year: 1979 }
  ]);
});

test('repairTapeIds strips director fields before persisting imported tapes', () => {
  const result = app.repairTapeIds([
    { title: 'Spirited Away', director: 'Hayao Miyazaki', genre: 'Animation' },
    { id: 'WXYZ', title: 'Moonlight', genre: 'Drama' }
  ], new Set());

  assert.equal(result.tapes.length, 2);
  assert.ok(!Object.hasOwn(result.tapes[0], 'director'));
  assert.ok(!Object.hasOwn(result.tapes[1], 'director'));
});

test('the form markup no longer exposes a director field', () => {
  const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');

  assert.doesNotMatch(html, /name="director"/i);
  assert.doesNotMatch(html, /<label[^>]*>\s*Director\s*<input/i);
});
