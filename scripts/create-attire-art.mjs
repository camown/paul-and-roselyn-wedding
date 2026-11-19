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
const filipiniana =
  start +
  `<path d="M127 31q23-18 46 0m-23-14v-9"/>
<path fill="#ad6348" stroke="#dfb28b" d="M127 59q23 13 46 0l12 38-20 37 8 29 39 167q-62 17-124 0l39-167 8-29-20-37Z"/>
<path fill="#b97254" stroke="#dfb28b" d="M128 60C114 39 94 51 83 78l5 37 31-10 13-24Zm44 0c14-21 34-9 45 18l-5 37-31-10-13-24Z"/>
<g stroke="#e2bba0"><path d="m128 62 9 23q13 9 26 0l9-23m-37 72q15 7 30 0m-38 29q23 9 46 0m-34 9-27 154m38-151v158m12-161 27 154m-60-143-26 145m68-145 26 145M88 78q13-10 31-10m93 10q-13-10-31-10M91 87l11 21m-2-35 11 32m98-18-11 21m2-35-11 32"/>
<path d="m139 107 11-7 11 7-11 8Zm0 15 11-7 11 7-11 8M143 189l7-5 7 5-7 6Zm-5 31 12-8 12 8-12 9Zm-7 34 19-12 19 12-19 13Z" stroke="#d8ad7c"/></g><path d="M70 347h160" stroke="#d6ad7e55"/>` +
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
  ["filipiniana", filipiniana],
  ["guests", guests],
])
  await writeFile(
    new URL("../assets/images/attire-" + name + ".svg", import.meta.url),
    svg,
  );
