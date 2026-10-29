import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { parseBackends } from '../scripts/gen-backends.mjs';

const HEADER = `
inline constexpr AmsTypeTraits kAmsTypeTraits[] = {
    {AmsType::NONE, "None", "", "unknown", "", AmsBufferRows::None, nullptr},
    {AmsType::AFC, "AFC", "AFC (Armored Turtle)", "afc", "AFC", AmsBufferRows::UnitBuffer,
     TR_NOOP("AFC buffer")},
    {AmsType::QIDI_BOX, "QIDI Box", "QIDI Box", "qidi_box", "qidi_box", AmsBufferRows::None,
     nullptr},
};
`;

test('reads every registered system by display name, NONE excluded', () => {
  assert.deepEqual(parseBackends(HEADER), ['AFC', 'QIDI Box']);
});

test('a header without the registry yields nothing rather than a guess', () => {
  assert.deepEqual(parseBackends('enum class AmsType { NONE = 0 };'), []);
});

// The Spotlight paragraph lists the systems by hand, with the qualifiers a
// generated list cannot carry. It must still name every one the app ships.
test('the multi-material spotlight names every shipped system', () => {
  const { names } = JSON.parse(readFileSync('src/data/backends.generated.json', 'utf8'));
  const copy = readFileSync('src/components/marketing/Spotlight.astro', 'utf8');
  for (const name of names) {
    const re = new RegExp(`\\b${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}s?\\b`, 'i');
    assert.ok(re.test(copy), `Spotlight.astro does not name ${name}`);
  }
});
