import { writeFile } from "node:fs/promises";
const start =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 360" fill="none" stroke="#d6ad7e" stroke-width="1.25" stroke-linecap="round" stroke-linejoin="round">';
const end = "</svg>";
const embroidery = Array.from(
  { length: 9 },
  (_, i) =>
    `<g transform="translate(0 ${i * 12})"><path d="M-14 0q-8-9-13-3q1 8 13 3q-8 8-13 4M14 0q8-9 13-3q-1 8-13 3q8 8 13 4"/></g>`,
).join("");
const barong =
  start +
  `<path fill="#493a2c" d="m112 204-9 123q14 5 31 0l15-107 7 107q17 5 32 0l-7-123Z"/><path d="m149 221-1 72m-28-78-4 101m57-100 4 100" stroke="#89735b"/>
<path fill="#d7c09a" stroke="#ead8b6" d="m119 49-37 18-24 130 23 7 25-94-6 112q49 12 99 0l-6-112 25 94 23-7-25-130-36-18-30 12Z"/>
<g stroke="#a18a64"><path d="m119 49 17-12h28l16 12-22 26-8-14-8 14Z" fill="#e4d1ae"/><path d="m150 61 1 130M142 75l2 116h14l1-116M105 109l-3-28m91 28 4-28M65 179l22 7m126 0 23-7M101 209q49 10 97 0"/><path d="M111 96v101m78-101v101" stroke-dasharray="1 4"/><g transform="translate(150 88) scale(.68)">${embroidery}</g><path d="m120 122 8-7m-8 20 8-7m46-6 7-7m-7 20 7-7"/><circle cx="150" cy="92" r="1"/><circle cx="150" cy="111" r="1"/><circle cx="150" cy="130" r="1"/></g>
<path fill="#3b2d23" d="m104 325-10 12q13 5 40 0l-1-13m24 0-1 13q28 5 39 0l-8-12"/><path d="M80 347h142" stroke="#d6ad7e55"/>` +
  end;
const gown =
  start +
  `<path d="M127 31q23-18 46 0m-23-14v-9"/><path fill="#ad6348" stroke="#dfb28b" d="m125 52-5 22q-4 17 14 39l-8 42q-22 59-53 176q76 15 154 0-31-115-54-176l-8-42q18-22 14-39l-5-22-11 14q-13 9-27 0Z"/>
<path stroke="#e2bba0" d="m126 53 3 29 21 18 21-18 3-29m-40 61q16 9 31 0m-39 41q24 10 48 0m-37 6-26 165m39-163v168m13-170 25 166M129 174 91 329m82-157 37 157m-83-239 12 19m34-19-12 19M111 266l-7 48m91-48 8 48"/><path d="M70 347h160" stroke="#d6ad7e55"/>` +
  end;
const guests =
  start +
  `<path fill="#a58a68" d="m54 91-13 22 18 24 10-10-4 36-26 121q40 14 79 0l-27-121-4-36 10 10 18-24-13-22-18 8H72Z"/><path d="m54 91 11 28 18 9 18-37M65 163q14 8 27 0M69 171l-15 109m26-108v115m9-115 15 108"/>
<path fill="#473629" d="m179 191-7 130h26l12-103 9 103h26l-7-130Z"/><path stroke="#927654" d="m209 217 1-23m-24 12-3 103m47-103 4 103"/>
<path fill="#bba17c" d="m186 74-28 17-12 95 20 4 13-65-3 78q35 8 65 0l-3-78 13 65 20-4-13-95-27-17-21 9Z"/><path stroke="#73543a" d="m186 74 13-10h23l9 10-14 22-7-13-8 13Z" fill="#d3b995"/><path d="m210 83 1 111m-51-17 19 4m64 0 20-4m-69-69v23h-13v-20" stroke="#796047"/><circle cx="211" cy="116" r="1"/><circle cx="211" cy="138" r="1"/><circle cx="211" cy="160" r="1"/>
<path d="m56 286 1 38m42-38-1 38m-40 0-12 12h20l-2-12m34 0-1 12h20l-12-12m69-3-9 14h32l1-14m21 0 1 14h33l-10-14" fill="#3b2d23"/><path d="M30 347h252" stroke="#d6ad7e55"/>` +
  end;
for (const [name, svg] of [
  ["barong", barong],
  ["gown", gown],
  ["guests", guests],
])
  await writeFile(
    new URL("../assets/images/attire-" + name + ".svg", import.meta.url),
    svg,
  );
