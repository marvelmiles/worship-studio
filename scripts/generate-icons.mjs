import { readFileSync, writeFileSync } from "node:fs";
import { Resvg } from "@resvg/resvg-js";

const icon = readFileSync("public/icon.svg", "utf8");

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
