/**
 * Demo showcase asset generator.
 *
 * The "Load Instant Demo Showcase" preset must work with zero backend, so every
 * pipeline artifact (raw frame, SAM 3.1 overlay, cutout, studio shot, price tag)
 * is synthesized at runtime as vector art and inlined as an SVG data URI.
 * One stylized product illustration, rendered through the five pipeline stages.
 */

const W = 640;
const H = 480;

const svgUri = (svg: string): string =>
  `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;

const MONO = `'JetBrains Mono', ui-monospace, Menlo, Consolas, monospace`;

/* ------------------------------------------------------------------ */
/* Shared defs                                                          */
/* ------------------------------------------------------------------ */

const DEFS = `
<defs>
  <radialGradient id="spot" cx="50%" cy="26%" r="85%">
    <stop offset="0%" stop-color="#1B2130"/>
    <stop offset="52%" stop-color="#0D1019"/>
    <stop offset="100%" stop-color="#06070C"/>
  </radialGradient>
  <radialGradient id="spotWarm" cx="50%" cy="24%" r="90%">
    <stop offset="0%" stop-color="#20293C"/>
    <stop offset="50%" stop-color="#0E111B"/>
    <stop offset="100%" stop-color="#06070C"/>
  </radialGradient>
  <radialGradient id="vign" cx="50%" cy="50%" r="74%">
    <stop offset="60%" stop-color="#000000" stop-opacity="0"/>
    <stop offset="100%" stop-color="#000000" stop-opacity="0.55"/>
  </radialGradient>
  <linearGradient id="floor" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0%" stop-color="#141A28" stop-opacity="0.9"/>
    <stop offset="100%" stop-color="#06070C" stop-opacity="0"/>
  </linearGradient>
  <linearGradient id="cyanglow" x1="0" y1="0" x2="1" y2="0">
    <stop offset="0%" stop-color="#00F0FF"/>
    <stop offset="100%" stop-color="#0066FF"/>
  </linearGradient>
  <linearGradient id="taggrad" x1="0" y1="0" x2="1" y2="1">
    <stop offset="0%" stop-color="#FF6B35"/>
    <stop offset="100%" stop-color="#F7C948"/>
  </linearGradient>
  <radialGradient id="lensglass" cx="38%" cy="34%" r="80%">
    <stop offset="0%" stop-color="#3E5F8F"/>
    <stop offset="45%" stop-color="#16233B"/>
    <stop offset="100%" stop-color="#05070C"/>
  </radialGradient>
  <filter id="nz"><feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" stitchTiles="stitch"/><feColorMatrix type="saturate" values="0"/></filter>
  <filter id="soft" x="-40%" y="-40%" width="180%" height="180%"><feGaussianBlur stdDeviation="7"/></filter>
  <filter id="soft2" x="-40%" y="-40%" width="180%" height="180%"><feGaussianBlur stdDeviation="3"/></filter>
  <filter id="desat"><feColorMatrix type="saturate" values="0.35"/></filter>
  <filter id="drop" x="-40%" y="-40%" width="180%" height="180%"><feDropShadow dx="0" dy="16" stdDeviation="12" flood-color="#000000" flood-opacity="0.55"/></filter>
  <filter id="tagGlow" x="-60%" y="-60%" width="220%" height="220%"><feDropShadow dx="0" dy="8" stdDeviation="14" flood-color="#FF6B35" flood-opacity="0.45"/></filter>
  <pattern id="scan" width="4" height="4" patternUnits="userSpaceOnUse">
    <rect width="4" height="1.3" fill="#000000" opacity="0.16"/>
  </pattern>
  <pattern id="checker" width="28" height="28" patternUnits="userSpaceOnUse">
    <rect width="28" height="28" fill="#10131B"/>
    <rect width="14" height="14" fill="#161A25"/>
    <rect x="14" y="14" width="14" height="14" fill="#161A25"/>
  </pattern>
</defs>`;

const frame = (body: string): string =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}">${DEFS}${body}</svg>`;

/** HUD chrome: dashed bbox + solid corner brackets + label chip. */
function bboxHud(
  bbox: [number, number, number, number],
  label: string,
  dashed: boolean,
): string {
  const [x1, y1, x2, y2] = bbox;
  const w = x2 - x1;
  const h = y2 - y1;
  const c = 16; // corner length
  const corners = `
    <path d="M ${x1} ${y1 + c} V ${y1} H ${x1 + c}" stroke="#00F0FF" stroke-width="3" fill="none"/>
    <path d="M ${x2 - c} ${y1} H ${x2} V ${y1 + c}" stroke="#00F0FF" stroke-width="3" fill="none"/>
    <path d="M ${x2} ${y2 - c} V ${y2} H ${x2 - c}" stroke="#00F0FF" stroke-width="3" fill="none"/>
    <path d="M ${x1 + c} ${y2} H ${x1} V ${y2 - c}" stroke="#00F0FF" stroke-width="3" fill="none"/>`;
  const chipW = label.length * 8.4 + 20;
  return `
  <g font-family="${MONO}">
    ${dashed ? `<rect x="${x1}" y="${y1}" width="${w}" height="${h}" fill="none" stroke="#00F0FF" stroke-opacity="0.55" stroke-width="1.5" stroke-dasharray="6 5"/>` : ""}
    ${corners}
    <rect x="${x1}" y="${y1 - 26}" width="${chipW}" height="20" rx="5" fill="#00F0FF" fill-opacity="0.14" stroke="#00F0FF" stroke-opacity="0.4" stroke-width="1"/>
    <text x="${x1 + 10}" y="${y1 - 12}" font-size="11.5" fill="#8DF4FF" letter-spacing="1">${label}</text>
  </g>`;
}

function recChrome(tLabel: string): string {
  return `
  <g font-family="${MONO}">
    <circle cx="606" cy="28" r="5" fill="#FF4D4D"/>
    <circle cx="606" cy="28" r="9" fill="none" stroke="#FF4D4D" stroke-opacity="0.35" stroke-width="1.5"/>
    <text x="592" y="32" font-size="11" fill="#FF7B7B" text-anchor="end" letter-spacing="1.5">REC</text>
    <text x="26" y="${H - 20}" font-size="12" fill="#8B93A7" letter-spacing="1.5">T+${tLabel}</text>
    <text x="26" y="${H - 38}" font-size="10" fill="#565E72" letter-spacing="1.5">PANDROP · FIELD CAM 01 · 24FPS</text>
  </g>`;
}

function stageChip(text: string, color: string): string {
  const w = text.length * 8 + 24;
  return `
  <g font-family="${MONO}">
    <rect x="${W / 2 - w / 2}" y="${H - 44}" width="${w}" height="24" rx="7" fill="#0B0E15" fill-opacity="0.85" stroke="${color}" stroke-opacity="0.45" stroke-width="1"/>
    <text x="${W / 2}" y="${H - 28}" font-size="11" fill="${color}" text-anchor="middle" letter-spacing="2">${text}</text>
  </g>`;
}

/* ------------------------------------------------------------------ */
/* Product illustrations                                                */
/* ------------------------------------------------------------------ */

interface Product {
  key: string;
  /** Full-color illustration group (centered in the 640x480 scene). */
  art: string;
  /** Simplified mask shape using currentColor, for the SAM stage. */
  silhouette: string;
  bbox: [number, number, number, number];
}

const HEADPHONES: Product = {
  key: "headphones",
  bbox: [168, 112, 472, 346],
  art: `
  <g>
    <path d="M 226 216 C 226 128, 414 128, 414 216" fill="none" stroke="url(#hpBand)" stroke-width="26" stroke-linecap="round"/>
    <path d="M 236 214 C 238 150, 402 150, 404 214" fill="none" stroke="#0A0C13" stroke-width="10" stroke-linecap="round"/>
    <rect x="216" y="200" width="22" height="44" rx="10" fill="#2C3244"/>
    <rect x="402" y="200" width="22" height="44" rx="10" fill="#2C3244"/>
    <ellipse cx="227" cy="274" rx="54" ry="64" fill="url(#hpCup)"/>
    <ellipse cx="413" cy="274" rx="54" ry="64" fill="url(#hpCup)"/>
    <ellipse cx="227" cy="274" rx="40" ry="50" fill="none" stroke="#00F0FF" stroke-opacity="0.4" stroke-width="2"/>
    <ellipse cx="413" cy="274" rx="40" ry="50" fill="none" stroke="#00F0FF" stroke-opacity="0.4" stroke-width="2"/>
    <ellipse cx="227" cy="274" rx="24" ry="33" fill="#0F1220"/>
    <ellipse cx="413" cy="274" rx="24" ry="33" fill="#0F1220"/>
    <path d="M 196 242 q 14 -22 40 -26" stroke="#9BEBF7" stroke-opacity="0.5" stroke-width="4" fill="none" stroke-linecap="round"/>
    <path d="M 384 244 q 12 -20 34 -24" stroke="#9BEBF7" stroke-opacity="0.35" stroke-width="4" fill="none" stroke-linecap="round"/>
    <circle cx="413" cy="318" r="3.5" fill="#00F0FF" opacity="0.8"/>
    <circle cx="227" cy="318" r="3.5" fill="#00F0FF" opacity="0.5"/>
  </g>`,
  silhouette: `
  <g fill="currentColor" stroke="currentColor">
    <path d="M 226 216 C 226 128, 414 128, 414 216" fill="none" stroke-width="30" stroke-linecap="round"/>
    <ellipse cx="227" cy="274" rx="54" ry="64" stroke="none"/>
    <ellipse cx="413" cy="274" rx="54" ry="64" stroke="none"/>
  </g>`,
};

const KEYBOARD: Product = {
  key: "keyboard",
  bbox: [156, 186, 484, 336],
  art: `
  <g>
    <rect x="164" y="192" width="312" height="136" rx="16" fill="url(#kbDeck)"/>
    <rect x="164" y="192" width="312" height="136" rx="16" fill="none" stroke="#313A52" stroke-width="1.5"/>
    <rect x="176" y="202" width="288" height="116" rx="10" fill="#0D1018"/>
    ${Array.from({ length: 4 })
      .map((_, r) => {
        const y = [210, 234, 258, 284][r];
        const isBottom = r === 3;
        const n = isBottom ? 4 : 12;
        return Array.from({ length: n })
          .map((_, k) => {
            if (isBottom) {
              const ws = [46, 148, 46, 34];
              const gap = 4;
              const total = ws.reduce((a, b) => a + b, 0) + gap * (n - 1);
              let x = 176 + (288 - total) / 2;
              for (let i = 0; i < k; i++) x += ws[i] + gap;
              return `<rect x="${x}" y="${y}" width="${ws[k]}" height="20" rx="4" fill="#1C2231" stroke="#2B344A" stroke-width="1"/>`;
            }
            const x = 180 + k * 24;
            const fill = r === 0 && k === 0 ? "#F7C948" : "#1C2231";
            return `<rect x="${x}" y="${y}" width="20" height="19" rx="4" fill="${fill}" stroke="#2B344A" stroke-width="1"/>`;
          })
          .join("");
      })
      .join("")}
    <rect x="168" y="322" width="304" height="6" rx="3" fill="url(#cyanglow)" opacity="0.65"/>
    <rect x="168" y="322" width="304" height="6" rx="3" fill="url(#cyanglow)" opacity="0.35" filter="url(#soft2)"/>
    <circle cx="452" cy="212" r="4" fill="#00F0FF" opacity="0.9"/>
  </g>`,
  silhouette: `
  <g fill="currentColor" stroke="currentColor">
    <rect x="164" y="192" width="312" height="136" rx="16" stroke="none"/>
  </g>`,
};

const CAMERA: Product = {
  key: "camera",
  bbox: [172, 146, 468, 326],
  art: `
  <g>
    <rect x="284" y="152" width="72" height="26" rx="8" fill="url(#camTop)"/>
    <rect x="180" y="170" width="280" height="36" rx="10" fill="url(#camTop)"/>
    <rect x="180" y="198" width="280" height="122" rx="16" fill="url(#camBody)"/>
    <rect x="180" y="198" width="280" height="122" rx="16" fill="none" stroke="#000" stroke-opacity="0.5" stroke-width="1.5"/>
    <circle cx="238" cy="184" r="9" fill="#F7C948"/>
    <circle cx="238" cy="184" r="9" fill="none" stroke="#B98A1E" stroke-width="1.5"/>
    <circle cx="414" cy="185" r="13" fill="#171B26" stroke="#39415A" stroke-width="2"/>
    <path d="M 414 176 v 5 M 414 189 v 5 M 405 185 h 5 M 418 185 h 5" stroke="#5A647F" stroke-width="2"/>
    <circle cx="320" cy="260" r="60" fill="#0A0D14"/>
    <circle cx="320" cy="260" r="60" fill="none" stroke="#2A3145" stroke-width="3"/>
    <circle cx="320" cy="260" r="47" fill="#10141F"/>
    <circle cx="320" cy="260" r="46" fill="none" stroke="#39415A" stroke-width="1.5"/>
    <circle cx="320" cy="260" r="33" fill="url(#lensglass)"/>
    <path d="M 300 240 a 27 27 0 0 1 22 -8" stroke="#9FD8FF" stroke-opacity="0.65" stroke-width="4" fill="none" stroke-linecap="round"/>
    <rect x="414" y="240" width="26" height="14" rx="3" fill="#E23B3B" opacity="0.92"/>
    <text x="427" y="251" font-size="9" fill="#FFF5F5" text-anchor="middle" font-family="${MONO}">AE</text>
    <rect x="196" y="288" width="60" height="10" rx="5" fill="#0C0F16"/>
    <rect x="384" y="288" width="60" height="10" rx="5" fill="#0C0F16"/>
  </g>`,
  silhouette: `
  <g fill="currentColor" stroke="currentColor">
    <rect x="180" y="170" width="280" height="150" rx="16" stroke="none"/>
    <rect x="284" y="152" width="72" height="26" rx="8" stroke="none"/>
    <circle cx="320" cy="260" r="60" stroke="none"/>
  </g>`,
};

const SNEAKER: Product = {
  key: "sneaker",
  bbox: [168, 200, 472, 346],
  art: `
  <g>
    <path d="M 186 316 C 196 320, 240 312, 300 310 C 366 308, 428 314, 448 322 C 458 326, 456 338, 446 338 L 198 338 C 188 338, 182 322, 186 316 Z" fill="url(#sole)"/>
    <path d="M 196 318 C 202 272, 226 234, 264 220 C 302 206, 334 216, 360 242 C 390 272, 424 292, 448 318 C 420 310, 366 306, 306 308 C 258 310, 216 316, 196 318 Z" fill="url(#upper)"/>
    <path d="M 404 292 C 420 298, 436 306, 448 316 C 430 310, 402 307, 380 306 C 388 300, 396 295, 404 292 Z" fill="#F4EFE2"/>
    <ellipse cx="258" cy="228" rx="26" ry="14" fill="#22252F" transform="rotate(-18 258 228)"/>
    <path d="M 296 234 L 342 262 M 308 226 L 354 254 M 320 220 L 366 248" stroke="#EDE7D8" stroke-width="5" stroke-linecap="round"/>
    <path d="M 208 302 C 268 290, 380 292, 442 314" stroke="url(#taggrad)" stroke-width="9" fill="none" stroke-linecap="round"/>
    <path d="M 214 262 C 232 252, 252 248, 270 250" stroke="#DDD5C2" stroke-width="4" fill="none" stroke-linecap="round"/>
  </g>`,
  silhouette: `
  <g fill="currentColor" stroke="currentColor">
    <path d="M 186 316 C 196 320, 240 312, 300 310 C 366 308, 428 314, 448 322 C 458 326, 456 338, 446 338 L 198 338 C 188 338, 182 322, 186 316 Z" stroke="none"/>
    <path d="M 196 318 C 202 272, 226 234, 264 220 C 302 206, 334 216, 360 242 C 390 272, 424 292, 448 318 C 420 310, 366 306, 306 308 C 258 310, 216 316, 196 318 Z" stroke="none"/>
  </g>`,
};

/* ------------------------------------------------------------------ */
/* Stage scene builders                                                 */
/* ------------------------------------------------------------------ */

function sceneShell(body: string): string {
  return `
  <rect width="${W}" height="${H}" fill="#08090E"/>
  <rect width="${W}" height="${H}" fill="url(#spot)"/>
  ${body}`;
}

function rawScene(p: Product, tc: string, conf: string): string {
  return frame(`
    ${sceneShell(`
      <g filter="url(#desat)" opacity="0.6">${p.art}</g>
      <rect width="${W}" height="${H}" fill="#0A0C12" opacity="0.28"/>
    `)}
    <rect width="${W}" height="${H}" fill="url(#vign)"/>
    <rect width="${W}" height="${H}" fill="url(#scan)"/>
    <rect width="${W}" height="${H}" filter="url(#nz)" opacity="0.05"/>
    <g font-family="${MONO}">
      <circle cx="${320}" cy="${240}" r="3" fill="#00F0FF" opacity="0.9"/>
      <path d="M 320 228 v 8 M 320 244 v 8 M 308 240 h 8 M 324 240 h 8" stroke="#00F0FF" stroke-opacity="0.5" stroke-width="1.5"/>
    </g>
    ${bboxHud(p.bbox, `${conf} · 0.97`, true)}
    ${recChrome(tc)}
  `);
}

function samScene(p: Product, tc: string): string {
  const mask = `<g color="#00F0FF">${p.silhouette}</g>`;
  return frame(`
    ${sceneShell(`
      <g filter="url(#desat)" opacity="0.5">${p.art}</g>
      <rect width="${W}" height="${H}" fill="#0A0C12" opacity="0.34"/>
    `)}
    ${mask.replace(/<g /, '<g filter="url(#soft)" opacity="0.55" ')}
    ${mask.replace("<g ", '<g opacity="0.30" ')}
    <g color="#7DF3FF" fill="none" stroke="currentColor" stroke-width="2.5" stroke-opacity="0.95">${p.silhouette
      .replace(/fill="currentColor"/g, "")
      .replace(/stroke="currentColor"/g, "")
      .replace(/ stroke="none"/g, "")}</g>
    <rect width="${W}" height="${H}" fill="url(#scan)"/>
    <rect width="${W}" height="${H}" filter="url(#nz)" opacity="0.045"/>
    ${bboxHud(p.bbox, "SAM 3.1 · MASK 0.97", false)}
    ${recChrome(tc)}
    ${stageChip("SEGMENT ANYTHING · POINT PROMPT", "#00F0FF")}
  `);
}

function cutoutScene(p: Product): string {
  const [x1, , x2, y2] = p.bbox;
  const cx = (x1 + x2) / 2;
  const base = y2 + 8;
  return frame(`
    <rect width="${W}" height="${H}" fill="url(#checker)"/>
    <ellipse cx="${cx}" cy="${base + 14}" rx="${(x2 - x1) * 0.46}" ry="18" fill="#000" opacity="0.5" filter="url(#soft)"/>
    <g filter="url(#drop)">${p.art}</g>
    <g font-family="${MONO}" opacity="0.85">
      <path d="M 40 ${H - 58} v 24 M 40 ${H - 34} h 24" stroke="#3A4358" stroke-width="2"/>
      <path d="M ${W - 40} ${H - 58} v 24 M ${W - 40} ${H - 34} h -24" stroke="#3A4358" stroke-width="2"/>
    </g>
    ${stageChip("ALPHA EXTRACTED · PNG", "#F7C948")}
  `);
}

function studioScene(p: Product, warm = false): string {
  const [x1, , x2, y2] = p.bbox;
  const cx = (x1 + x2) / 2;
  const base = y2 + 10;
  const horizon = y2 + 22;
  const glow = `<g color="#00F0FF" opacity="0.35" filter="url(#soft)" transform="translate(0 4)">${p.silhouette}</g>`;
  return frame(`
    <rect width="${W}" height="${H}" fill="#07080D"/>
    <rect width="${W}" height="${H}" fill="url(#${warm ? "spotWarm" : "spot"})"/>
    <rect x="0" y="${horizon}" width="${W}" height="${H - horizon}" fill="url(#floor)"/>
    <line x1="60" y1="${horizon}" x2="${W - 60}" y2="${horizon}" stroke="#2A3348" stroke-width="1" opacity="0.7"/>
    <ellipse cx="${cx}" cy="${base + 14}" rx="${(x2 - x1) * 0.44}" ry="16" fill="#000" opacity="0.55" filter="url(#soft)"/>
    ${glow}
    <g filter="url(#drop)">${p.art}</g>
    <g font-family="${MONO}" opacity="0.7">
      <path d="M 44 40 v 18 M 44 40 h 18" stroke="#39415A" stroke-width="2" fill="none"/>
      <path d="M ${W - 44} ${H - 46} v 18 M ${W - 44} ${H - 28} h -18" stroke="#39415A" stroke-width="2" fill="none"/>
      <text x="26" y="${H - 18}" font-size="10" fill="#565E72" letter-spacing="2">PANDROP STUDIO · COMPOSITE v1.0</text>
    </g>
  `);
}

function pricetagScene(p: Product, price: string): string {
  const studio = studioScene(p, true);
  const tag = `
  <g transform="rotate(-4 452 372)" font-family="${MONO}">
    <rect x="352" y="332" width="200" height="82" rx="16" fill="url(#taggrad)" filter="url(#tagGlow)"/>
    <rect x="352" y="332" width="200" height="82" rx="16" fill="none" stroke="#FFE9B8" stroke-opacity="0.55" stroke-width="1.5"/>
    <circle cx="368" cy="346" r="5" fill="#171106" opacity="0.55"/>
    <path d="M 368 346 q 20 26 44 30" stroke="#171106" stroke-opacity="0.35" stroke-width="1.5" fill="none"/>
    <text x="466" y="377" font-size="38" font-weight="800" fill="#1A1005" text-anchor="middle" letter-spacing="-1">${price}</text>
    <text x="466" y="398" font-size="10.5" font-weight="700" fill="#4A2E07" text-anchor="middle" letter-spacing="2.5">AI VERIFIED ✓</text>
  </g>`;
  return studio.replace("</svg>", `${tag}</svg>`);
}

/* ------------------------------------------------------------------ */
/* Product-specific gradients injected per document                     */
/* ------------------------------------------------------------------ */

const PRODUCT_DEFS: Record<string, string> = {
  headphones: `
    <linearGradient id="hpBand" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#E9EDF5"/><stop offset="55%" stop-color="#AAB3C6"/><stop offset="100%" stop-color="#6E778D"/>
    </linearGradient>
    <linearGradient id="hpCup" x1="0" y1="0" x2="0.4" y2="1">
      <stop offset="0%" stop-color="#343B50"/><stop offset="55%" stop-color="#1B2131"/><stop offset="100%" stop-color="#0D1120"/>
    </linearGradient>`,
  keyboard: `
    <linearGradient id="kbDeck" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#2A3143"/><stop offset="100%" stop-color="#141926"/>
    </linearGradient>`,
  camera: `
    <linearGradient id="camTop" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#DFE5EF"/><stop offset="100%" stop-color="#8C95A8"/>
    </linearGradient>
    <linearGradient id="camBody" x1="0" y1="0" x2="0.3" y2="1">
      <stop offset="0%" stop-color="#23262F"/><stop offset="100%" stop-color="#101218"/>
    </linearGradient>`,
  sneaker: `
    <linearGradient id="sole" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#E2B075"/><stop offset="100%" stop-color="#B97F41"/>
    </linearGradient>
    <linearGradient id="upper" x1="0" y1="0" x2="0.25" y2="1">
      <stop offset="0%" stop-color="#FBF7EC"/><stop offset="70%" stop-color="#E8E1CF"/><stop offset="100%" stop-color="#CDC5AE"/>
    </linearGradient>`,
};

export interface DemoAssetSet {
  raw: string;
  sam: string;
  cutout: string;
  studio: string;
  pricetag: string;
}

/** Build the five stage assets for one demo product. */
export function buildDemoAssets(p: Product, price: string): DemoAssetSet {
  const extra = PRODUCT_DEFS[p.key] ?? "";
  const withDefs = (svg: string) => svg.replace("</defs>", `${extra}</defs>`);
  return {
    raw: svgUri(withDefs(rawScene(p, "00:00.4", "SAM3.1"))),
    sam: svgUri(withDefs(samScene(p, "00:00.6"))),
    cutout: svgUri(withDefs(cutoutScene(p))),
    studio: svgUri(withDefs(studioScene(p))),
    pricetag: svgUri(withDefs(pricetagScene(p, price))),
  };
}

export const DEMO_PRODUCTS: Record<string, Product> = {
  headphones: HEADPHONES,
  keyboard: KEYBOARD,
  camera: CAMERA,
  sneaker: SNEAKER,
};
