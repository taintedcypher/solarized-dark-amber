import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const html = await readFile(new URL("../palette-rebuild.html", import.meta.url), "utf8");
const css = await readFile(new URL("../palette.css", import.meta.url), "utf8");
const specimen = await readFile(new URL("../index.html", import.meta.url), "utf8");
const extract = id => JSON.parse(html.match(new RegExp(`<script type="application/json" id="${id}">([\\s\\S]*?)</script>`))[1]);
const current = extract("palette-current");
const rebuilt = extract("palette-rebuilt");
const palette = JSON.parse(await readFile(new URL("../palette.json", import.meta.url), "utf8"));
const canonical = palette.colors;
const terminal = JSON.parse(await readFile(new URL("../ports/windows-terminal.json", import.meta.url), "utf8"));
const bases = ["base03", "base02", "base01", "base00", "base0", "base1", "base2", "base3"];
const accents = ["yellow", "orange", "red", "magenta", "violet", "blue", "cyan", "green"];
const targets = [15, 20, 45, 50, 60, 65, 92, 97];

function luminance(hex) {
  const channels = hex.match(/[0-9a-f]{2}/gi).map(value => parseInt(value, 16) / 255).map(value => value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4);
  return 0.2126729 * channels[0] + 0.7151522 * channels[1] + 0.072175 * channels[2];
}

function lightness(hex) {
  const y = luminance(hex);
  return 116 * (y > 216 / 24389 ? Math.cbrt(y) : (24389 / 27 * y + 16) / 116) - 16;
}

function contrast(a, b) {
  const [bright, dark] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (bright + 0.05) / (dark + 0.05);
}

const delta = (a, b) => Math.abs(lightness(rebuilt[a]) - lightness(rebuilt[b]));
assert.notDeepEqual(current, canonical, "design record must retain the previous palette");
assert.deepEqual(rebuilt, canonical, "adopted comparison values must match palette.json");
assert.deepEqual(Object.keys(rebuilt), Object.keys(current), "rebuilt palette must keep the canonical color names");
assert.deepEqual(Object.fromEntries([...css.matchAll(/--([\w-]+):\s*(#[0-9A-F]{6});/g)].map(([, name, hex]) => [name, hex])), canonical, "palette.css must match palette.json");
assert.deepEqual(palette.roles, { background: "base03", surface: "base02", border: "base01", mutedText: "base00", text: "base0", strongText: "base1", focus: "yellow" });
assert.deepEqual(
  { background: terminal.background, foreground: terminal.foreground, selection: terminal.selectionBackground, cursor: terminal.cursorColor },
  { background: canonical.base03, foreground: canonical.base0, selection: canonical.base02, cursor: canonical.yellow },
  "terminal roles must match the canonical palette",
);
assert.match(specimen, /<link rel="stylesheet" href="palette\.css">/, "main specimen must load the canonical stylesheet");
assert.doesNotMatch(specimen, /color:\s*var\(--base[23]\)/, "dark specimen text must not use inverse-surface colors");
for (const selector of ["body", "\\.subtitle", "\\.swatch strong", "\\.swatch span", "\\.status", "\\.dim"]) {
  assert.match(specimen, new RegExp(`${selector}\\s*\\{[^}]*color:\\s*var\\(--base0\\)`, "s"), `${selector} must use base0`);
}
assert.match(specimen, /\.dot:nth-child\(2\) \{ background: var\(--base1\); \}/, "secondary window dot must use base1");
bases.forEach((name, index) => assert.ok(Math.abs(lightness(rebuilt[name]) - targets[index]) <= 0.2, `${name} missed its L* target`));
assert.ok(Math.abs(delta("base03", "base0") - 45) <= 0.15);
assert.ok(Math.abs(delta("base02", "base1") - 45) <= 0.15);
assert.ok(Math.abs(delta("base03", "base0") - delta("base02", "base1")) <= 0.1);
assert.ok(Math.abs(delta("base01", "base2") - 47) <= 0.35);
assert.ok(Math.abs(delta("base00", "base3") - 47) <= 0.35);
assert.ok(contrast(rebuilt.base03, rebuilt.base0) >= 4.5);
assert.ok(contrast(rebuilt.base02, rebuilt.base1) >= 4.5);
accents.forEach(name => assert.ok(contrast(rebuilt.base03, rebuilt[name]) >= 4.5, `${name} failed AA on base03`));

console.log("Canonical palette verified: sources, roles, CIELAB pairs, and dark-theme AA contrast pass.");
