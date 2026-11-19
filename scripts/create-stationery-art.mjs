import { writeFile, mkdir } from "node:fs/promises";
// Original vector ornaments for this invitation. Product references inform the
// stationery composition only; no third-party illustration is reproduced.
const directory = new URL("../assets/images/", import.meta.url);
await mkdir(directory, { recursive: true });
const leaf = `<path d="M0 0C-32-13-45-42-35-69C-7-55 9-25 0 0Z"/><path d="M0 0Q-20-32-35-69M-9-20l-16-4M-18-36l-13-3M-13-28l1-17"/>`;
const rose = `<g fill="#873f2e">${Array.from({ length: 9 }, (_, i) => `<path transform="rotate(${i * 40})" d="M-5 14C-30 10-59-15-52-37C-59-55-42-74-25-67C-10-83 16-64 22-46C31-25 20-2-5 14Z"/>`).join("")}${Array.from({ length: 7 }, (_, i) => `<path transform="rotate(${i * 51.43 + 15})" d="M0 9C-20 4-35-17-29-35C-15-48 4-43 13-30C25-16 16 5 0 9Z"/>`).join("")}<path d="M-10 8C-25-7-15-24 2-21C19-20 24-1 10 9C-2 20-19 7-12-3C-5-13 10-10 9 0C8 8-3 9-3 1"/></g>`;
const daisy = `<g>${Array.from({ length: 13 }, (_, i) => `<path transform="rotate(${i * 27.69})" d="M-4-8C-14-24-13-57 0-65C13-59 16-25 4-8"/>`).join("")}<circle r="11"/>${Array.from({ length: 14 }, (_, i) => `<circle cx="${Math.cos(i * 2.4) * Math.sqrt(i) * 2.1}" cy="${Math.sin(i * 2.4) * Math.sqrt(i) * 2.1}" r="1.2"/>`).join("")}</g>`;
const bud =
  '<path d="M0 7C-19-8-23-32-9-42C4-49 23-29 16-14L0 7ZM0 7Q9-17-9-42M0 7l-5 12M-4 10l-13-4M1 8l12-3"/>';
const leafAt = (x, y, angle, scale = 1) =>
  `<use href="#leaf" transform="translate(${x} ${y}) rotate(${angle}) scale(${scale})"/>`;
const stems =
  '<path d="M182 810C169 669 240 566 260 434S267 195 216 85M178 809C97 692 54 594 83 435M185 807C278 707 374 608 373 471M187 810C224 677 185 525 139 387M257 462Q358 408 370 285M264 356Q171 296 157 206M220 620Q324 593 333 540M117 650Q45 553 29 538M212 124Q260 66 287 45"/>';
const leaves = [
  leafAt(218, 628, -50, 1.25),
  leafAt(192, 690, 60, 1.2),
  leafAt(235, 555, 60, 1.15),
  leafAt(259, 442, -25, 1.1),
  leafAt(265, 354, 60, 0.85),
  leafAt(249, 245, -50, 0.9),
  leafAt(230, 156, 65, 0.7),
  leafAt(89, 465, -45, 0.9),
  leafAt(91, 568, 95, 1.2),
  leafAt(126, 672, -30, 1.2),
  leafAt(286, 694, 8, 1.2),
  leafAt(337, 594, 80, 1.1),
  leafAt(370, 502, -30, 1.05),
  leafAt(190, 574, 100, 0.9),
  leafAt(164, 457, -35, 0.9),
  leafAt(331, 403, -15, 0.75),
  leafAt(351, 341, 75, 0.7),
  leafAt(177, 276, 80, 0.65),
].join("");
const art = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 460 840" fill="none" stroke="#dfba87" stroke-width="1.15" stroke-linecap="round" stroke-linejoin="round"><defs><g id="leaf">${leaf}</g><g id="rose">${rose}</g><g id="daisy">${daisy}</g><g id="bud">${bud}</g></defs>${stems}${leaves}<use href="#rose" transform="translate(117 642) rotate(-17) scale(1.12)"/><use href="#rose" transform="translate(264 435) rotate(30) scale(.83)"/><use href="#rose" transform="translate(211 168) rotate(-24) scale(.58)"/><use href="#daisy" transform="translate(369 472) rotate(22) scale(.85)"/><use href="#daisy" transform="translate(139 390) rotate(-20) scale(.65)"/><use href="#bud" transform="translate(83 440) rotate(-22) scale(.9)"/><use href="#bud" transform="translate(369 286) rotate(45) scale(.7)"/><use href="#bud" transform="translate(157 207) rotate(-38) scale(.6)"/><use href="#bud" transform="translate(288 45) rotate(45) scale(.65)"/><use href="#bud" transform="translate(32 540) rotate(-50) scale(.7)"/></svg>`;
await writeFile(new URL("botanical-engraving.svg", directory), art);
await writeFile(
  new URL("paper-grain.svg", directory),
  `<svg xmlns="http://www.w3.org/2000/svg" width="180" height="180" viewBox="0 0 180 180"><filter id="paper"><feTurbulence type="fractalNoise" baseFrequency=".76" numOctaves="3" stitchTiles="stitch"/><feColorMatrix type="saturate" values="0"/></filter><path fill="#fff" filter="url(#paper)" opacity=".12" d="M0 0h180v180H0z"/></svg>`,
);
await writeFile(
  new URL("vine-divider.svg", directory),
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 280 65" fill="none" stroke="#dfba87" stroke-width="1"><path d="M5 42Q70 53 140 31Q206 52 275 42M140 31v-18"/><path d="M22 45Q29 22 49 26Q44 46 22 45ZM53 45Q68 26 82 33Q74 50 53 45ZM88 41Q103 19 120 25Q113 43 88 41ZM258 45Q251 22 231 26Q236 46 258 45ZM227 45Q212 26 198 33Q206 50 227 45ZM192 41Q177 19 160 25Q167 43 192 41ZM140 20C122 8 131 0 140 9C149 0 158 8 140 20Z"/></svg>`,
);
