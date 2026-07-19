// Renders the PNG icon set from public/icon.svg.
//   node scripts/generate-icons.mjs
//
// Rounded icons (icon-192/512) come straight from the SVG. Maskable and
// Apple touch icons are full-bleed squares (the platform applies its own
// mask), so those variants drop the rounded corners + border ring and
// shrink the artwork into the safe zone.
import { readFileSync, writeFileSync } from "node:fs";
import { Resvg } from "@resvg/resvg-js";

const icon = readFileSync("public/icon.svg", "utf8");

/** Full-bleed square variant with the artwork scaled about the center. */
function squareVariant(artScale) {
  return icon
    .replaceAll(' rx="116"', "")
    .replace(/<rect id="ring"[^/]*\/>/, "")
    .replace(
      '<g id="art">',
      `<g id="art" transform="translate(256 256) scale(${artScale}) translate(-256 -256)">`,
    );
}

function render(svg, size, file) {
  const png = new Resvg(svg, {
    fitTo: { mode: "width", value: size },
  }).render();
  writeFileSync(`public/${file}`, png.asPng());
  console.log(`public/${file} (${size}x${size})`);
}

render(icon, 192, "icon-192.png");
render(icon, 512, "icon-512.png");
render(squareVariant(0.78), 512, "icon-maskable-512.png");
render(squareVariant(0.88), 180, "apple-touch-icon.png");
