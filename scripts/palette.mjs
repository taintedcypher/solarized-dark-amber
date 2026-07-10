import { readFile, writeFile } from "node:fs/promises";

const source = new URL("../palette.json", import.meta.url);
const target = new URL("../palette.css", import.meta.url);
const { colors } = JSON.parse(await readFile(source, "utf8"));
const css = `/* Generated from palette.json by scripts/palette.mjs. */\n:root {\n${Object.entries(colors).map(([name, hex]) => `  --${name}: ${hex};`).join("\n")}\n}\n`;

if (process.argv.includes("--check")) {
  if (await readFile(target, "utf8") !== css) throw new Error("palette.css is out of date; run: node scripts/palette.mjs");
} else {
  await writeFile(target, css);
}
