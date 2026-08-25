import test from 'node:test';
import assert from 'node:assert/strict';
import { writeFileSync, mkdtempSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { buildPrinters } from '../scripts/gen-printers.mjs';

function fixture(printers) {
  const dir = mkdtempSync(join(tmpdir(), 'hx-printers-'));
  const path = join(dir, 'printer_database.json');
  writeFileSync(path, JSON.stringify({ version: '2.0', printers }));
  return path;
}

const SAMPLE = [
  { id: 'voron_24', name: 'Voron 2.4', manufacturer: 'Voron' },
  { id: 'voron_0_1', name: 'Voron 0.2', manufacturer: 'Voron', aliases: ['Voron 0.1'] },
  { id: 'ad5m', name: 'FlashForge Adventurer 5M', manufacturer: 'FlashForge' },
  {
    id: 'qidi_plus4', name: 'QIDI Plus 4', manufacturer: 'Qidi',
    notes: 'Stock display is a TJC HMI on serial bus.',
    note: 'The load-cell fingerprint is smart_effector + hx711.',
  },
  { id: 'kamp_user', name: 'KAMP', manufacturer: 'Generic', show_in_list: false },
];

test('drops entries flagged show_in_list:false', () => {
  const out = buildPrinters(fixture(SAMPLE));
  assert.equal(out.count, 4);
  assert.ok(!out.printers.some((p) => p.id === 'kamp_user'));
});

test('count always equals the number of printers emitted', () => {
  const out = buildPrinters(fixture(SAMPLE));
  assert.equal(out.count, out.printers.length);
});

test('sorts by manufacturer then model so the page needs no sort of its own', () => {
  const out = buildPrinters(fixture(SAMPLE));
  assert.deepEqual(
    out.printers.map((p) => p.name),
    ['FlashForge Adventurer 5M', 'QIDI Plus 4', 'Voron 0.2', 'Voron 2.4']
  );
});

test('counts manufacturers, largest first', () => {
  const out = buildPrinters(fixture(SAMPLE));
  assert.deepEqual(out.manufacturers[0], { name: 'Voron', count: 2 });
  assert.equal(out.manufacturers.reduce((n, m) => n + m.count, 0), out.count);
});

// Ruling 4: `notes` is written for users; `note` is the detector author's
// reasoning and reads as leaked internals on a public page.
test('publishes notes and never publishes note', () => {
  const out = buildPrinters(fixture(SAMPLE));
  const qidi = out.printers.find((p) => p.id === 'qidi_plus4');
  assert.equal(qidi.notes, 'Stock display is a TJC HMI on serial bus.');
  assert.ok(!('note' in qidi));
  assert.ok(!JSON.stringify(out).includes('load-cell fingerprint'));
});

test('aliases default to an empty array rather than undefined', () => {
  const out = buildPrinters(fixture(SAMPLE));
  assert.deepEqual(out.printers.find((p) => p.id === 'voron_24').aliases, []);
  assert.deepEqual(out.printers.find((p) => p.id === 'voron_0_1').aliases, ['Voron 0.1']);
});
