import test from 'node:test';
import assert from 'node:assert/strict';
import { PALETTE_KEYS, cssVarName, themeBlocks } from '../scripts/gen-themes.mjs';

const DUAL = {
  name: 'Gruvbox',
  dark: { screen_bg: '#282828', overlay_bg: '#3C3836', card_bg: '#504945',
    elevated_bg: '#665C54', border: '#7C6F64', text: '#EBDBB2',
    text_muted: '#D5C4A1', text_subtle: '#928374', primary: '#83A598',
    secondary: '#D3869B', tertiary: '#8EC07C', info: '#83A598',
    success: '#B8BB26', warning: '#FABD2F', danger: '#FB4934', focus: '#83A598' },
  light: { screen_bg: '#FBF1C7', overlay_bg: '#EBDBB2', card_bg: '#D5C4A1',
    elevated_bg: '#BDAE93', border: '#A89984', text: '#3C3836',
    text_muted: '#504945', text_subtle: '#665C54', primary: '#458588',
    secondary: '#B16286', tertiary: '#689D6A', info: '#458588',
    success: '#79740E', warning: '#B57614', danger: '#CC241D', focus: '#458588' },
  border_radius_size: 3, border_width: 1, shadow_intensity: 0,
};

const DARK_ONLY = { name: 'Dracula', dark: DUAL.dark, border_radius_size: 3, border_width: 1 };

// A theme that legitimately sets border_width to 0 (a hairline-free look).
// This is the case that distinguishes `?? DEFAULT` (0 survives as-is) from
// `|| DEFAULT` (0 is falsy and would be coerced back to 1px).
const ZERO_BORDER = { name: 'Cupertino', dark: DUAL.dark, border_radius_size: 3, border_width: 0 };

// Pulls the `{ ... }` body out of one [data-theme][data-mode] selector from
// a themeBlocks() result, so a test can assert on one mode's declarations
// without a bug confined to the other mode masking it.
function extractBlock(css, slug, mode) {
  const match = css.match(
    new RegExp(`\\[data-theme="${slug}"\\]\\[data-mode="${mode}"\\] \\{([\\s\\S]*?)\\n\\}`)
  );
  return match ? match[1] : null;
}

test('exposes exactly the 16 palette keys the app defines', () => {
  assert.equal(PALETTE_KEYS.length, 16);
  assert.ok(PALETTE_KEYS.includes('screen_bg'));
  assert.ok(PALETTE_KEYS.includes('focus'));
});

test('converts snake_case keys to prefixed kebab-case custom properties', () => {
  assert.equal(cssVarName('screen_bg'), '--hx-screen-bg');
  assert.equal(cssVarName('text_muted'), '--hx-text-muted');
});

test('emits one selector block per supported mode', () => {
  const css = themeBlocks('gruvbox', DUAL);
  assert.match(css, /\[data-theme="gruvbox"\]\[data-mode="dark"\]/);
  assert.match(css, /\[data-theme="gruvbox"\]\[data-mode="light"\]/);
});

test('emits every palette key in each block', () => {
  const css = themeBlocks('gruvbox', DUAL);
  const dark = extractBlock(css, 'gruvbox', 'dark');
  const light = extractBlock(css, 'gruvbox', 'light');
  assert.ok(dark, 'could not locate the dark block');
  assert.ok(light, 'could not locate the light block');
  for (const key of PALETTE_KEYS) {
    // Checked per-block (not on the concatenated string) so a bug that
    // drops keys from only one mode can't hide behind the other mode.
    assert.ok(dark.includes(cssVarName(key)), `dark block missing ${key}`);
    assert.ok(light.includes(cssVarName(key)), `light block missing ${key}`);
  }
});

test('each declaration carries the theme\'s own value, not a placeholder', () => {
  const css = themeBlocks('gruvbox', DUAL);
  const dark = extractBlock(css, 'gruvbox', 'dark');
  const light = extractBlock(css, 'gruvbox', 'light');
  for (const key of PALETTE_KEYS) {
    const varName = cssVarName(key);
    const darkValue = dark.match(new RegExp(`${varName}: ([^;]+);`))?.[1];
    const lightValue = light.match(new RegExp(`${varName}: ([^;]+);`))?.[1];
    assert.equal(darkValue, DUAL.dark[key], `dark ${key} should equal the source palette value`);
    assert.equal(lightValue, DUAL.light[key], `light ${key} should equal the source palette value`);
  }
});

test('dark and light carry different values for the same key', () => {
  const css = themeBlocks('gruvbox', DUAL);
  const dark = extractBlock(css, 'gruvbox', 'dark');
  const light = extractBlock(css, 'gruvbox', 'light');
  for (const key of PALETTE_KEYS) {
    const varName = cssVarName(key);
    const darkValue = dark.match(new RegExp(`${varName}: ([^;]+);`))?.[1];
    const lightValue = light.match(new RegExp(`${varName}: ([^;]+);`))?.[1];
    assert.notEqual(darkValue, lightValue, `${key} should differ between dark and light modes`);
  }
});

test('a dark-only theme emits no light block', () => {
  const css = themeBlocks('dracula', DARK_ONLY);
  assert.match(css, /\[data-mode="dark"\]/);
  assert.doesNotMatch(css, /\[data-mode="light"\]/);
});

test('emits structural rules and never a shadow', () => {
  const css = themeBlocks('gruvbox', DUAL);
  assert.match(css, /--hx-radius:\s*3px/);
  assert.match(css, /--hx-border-width:\s*1px/);
  assert.doesNotMatch(css, /shadow/i);
});

test('defaults structural values when a theme omits them', () => {
  const css = themeBlocks('bare', { name: 'Bare', dark: DUAL.dark });
  assert.match(css, /--hx-radius:\s*3px/);
  assert.match(css, /--hx-border-width:\s*1px/);
});

test('an explicit border_width of 0 is preserved, not coerced to the default', () => {
  const css = themeBlocks('cupertino', ZERO_BORDER);
  assert.match(css, /--hx-border-width:\s*0px/);
  assert.doesNotMatch(css, /--hx-border-width:\s*1px/);
});
