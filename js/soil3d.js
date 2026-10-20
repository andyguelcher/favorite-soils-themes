/* ------------------------------------------------------------------
   Favorite Soils Report: the 3D soil monolith on each soil page.
   Nobody needs to edit this file. The model draws itself from
   soil.txt (horizons, depths, colours), the official series
   description pasted into osd.txt if there is one (structure,
   redox features, roots, boundaries), and the DRoCTS+ table in
   page.md (texture, structure, rocks, HCl, pH). A soil with no
   horizons yet, or a browser without WebGL, gets nothing extra.
------------------------------------------------------------------- */
const IN = 2.54;
const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)");

/* ---------- field codes, for the details card ---------- */
const TEXTURES = {
  s: "sand", cos: "coarse sand", fs: "fine sand", vfs: "very fine sand",
  lcos: "loamy coarse sand", ls: "loamy sand", lfs: "loamy fine sand", lvfs: "loamy very fine sand",
  cosl: "coarse sandy loam", sl: "sandy loam", fsl: "fine sandy loam", vfsl: "very fine sandy loam",
  l: "loam", sil: "silt loam", si: "silt",
  scl: "sandy clay loam", cl: "clay loam", sicl: "silty clay loam",
  sc: "sandy clay", sic: "silty clay", c: "clay"
};
const SANDY = ["s", "cos", "fs", "vfs", "lcos", "ls", "lfs", "lvfs", "cosl", "sl", "fsl", "vfsl"];
const CLAYEY = ["scl", "cl", "sicl", "sc", "sic", "c"];
const STRUCTURES = {
  gr: "granular", sbk: "subangular blocky", abk: "angular blocky", pr: "prismatic",
  cpr: "columnar", pl: "platy", ma: "massive", sg: "single grain"
};
const HCL = {
  ne: "non-effervescent", vs: "very slightly effervescent", sl: "slightly effervescent", se: "slightly effervescent",
  st: "strongly effervescent", ve: "violently effervescent", e: "effervescent"
};
const MASTERS = { O: "organic layer", A: "topsoil", E: "leached layer", B: "subsoil", C: "parent material", R: "bedrock" };
const SUFFIXES = {
  p: "plowed", g: "gleyed", d: "dense", t: "clay build-up", k: "carbonates", w: "weathered",
  b: "buried", h: "humus build-up", s: "iron and aluminium build-up", ss: "slickensides",
  y: "gypsum", z: "salts", n: "sodium", r: "soft bedrock", c: "concretions", o: "oxides"
};

/* ---------- reading the codes people type in the table ---------- */
// Exact codes are read as they are. Full words, common abbreviations and
// one-letter slips are read too, but marked as a guess so the card can say
// "read as ...". A typo that is equally close to two codes is not guessed.
const ALIASES = {
  structure: {
    pris: "pr", prism: "pr", prisms: "pr", pri: "pr", sab: "sbk", sabk: "sbk", subang: "sbk", subangular: "sbk", blocky: "sbk",
    ab: "abk", ang: "abk", angular: "abk", gran: "gr", gra: "gr", grn: "gr", plat: "pl", plt: "pl", mas: "ma", mass: "ma",
    col: "cpr", colm: "cpr", colum: "cpr", single: "sg"
  },
  hcl: {
    none: "ne", no: "ne", non: "ne", noneffervescent: "ne", nonefervescent: "ne",
    slight: "sl", slightly: "sl", strong: "st", strongly: "st", violent: "ve", violently: "ve", effervescent: "e"
  },
  texture: {}
};
// Texture modifiers for rock fragments: "grsl" is gravelly sandy loam.
const TEXTURE_MODIFIERS = {
  gr: "gravelly", vgr: "very gravelly", xgr: "extremely gravelly", cb: "cobbly", vcb: "very cobbly",
  st: "stony", vst: "very stony", ch: "channery", vch: "very channery", cn: "channery"
};
function editDistance(a, b) {
  const d = Array.from({ length: a.length + 1 }, (_, i) => [i]);
  for (let j = 1; j <= b.length; j++) d[0][j] = j;
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    }
  }
  return d[a.length][b.length];
}
// Every code found in a cell, in order: [{ code, label, guessed }].
function readCodes(text, dict) {
  const kind = dict === TEXTURES ? "texture" : dict === STRUCTURES ? "structure" : "hcl";
  const aliases = ALIASES[kind], found = [];
  let rest = (text || "").toLowerCase();
  const add = (code, label, guessed) => { if (!found.some((f) => f.code === code)) found.push({ code, label, guessed }); };
  // Full names first, longest first: "fine sandy loam", "subangular blocky", "strongly effervescent".
  Object.entries(dict).sort((x, y) => y[1].length - x[1].length).forEach(([code, name]) => {
    const re = new RegExp("\\b" + name.replace(/-/g, "[- ]?") + "\\b");
    if (re.test(rest)) { add(code, name, false); rest = rest.replace(re, " "); }
  });
  rest.split(/[^a-z]+/).filter(Boolean).forEach((w) => {
    if (w in dict) return add(w, dict[w], false);
    if (aliases[w]) return add(aliases[w], dict[aliases[w]], true);
    if (kind === "texture") {
      const mod = Object.keys(TEXTURE_MODIFIERS).sort((x, y) => y.length - x.length).find((m) => w.startsWith(m) && w.slice(m.length) in dict);
      if (mod) return add(w.slice(mod.length), TEXTURE_MODIFIERS[mod] + " " + dict[w.slice(mod.length)], true);
    }
    if (w.length < 3) return;   // two-letter slips are too ambiguous ("nr" may mean "not recorded")
    const near = Object.keys(dict).filter((c) => c.length > 1 && editDistance(w, c) === 1);
    if (near.length === 1) add(near[0], dict[near[0]], true);
  });
  return found;
}
const codeIn = (text, dict) => (readCodes(text, dict)[0] || {}).code || null;
const EMPTY_CELL = /^\s*(n\/?a|n\/l|-+|—|not given|not listed|not recorded)\s*$/i;
function spell(raw, dict) {
  if (!raw || EMPTY_CELL.test(raw)) return "";
  // A mixed horizon's cell ("E: l/fsl B: l, scl, cl"): spell each labelled part on its own.
  const parts = raw.split(/\s+(?=[A-Z][A-Za-z/]{0,3}:\s)/);
  if (parts.length > 1 && parts.every((p) => /^[A-Z][A-Za-z/]{0,3}:\s/.test(p))) {
    return parts.map((p) => p.replace(/^([^:]+:)\s*(.*)$/, (m, label, rest) => label + " " + spell(rest, dict))).join("; ");
  }
  const found = readCodes(raw, dict);
  if (!found.length) return raw + " (code not recognised)";
  const labels = found.map((f) => f.label).join(", ");
  if (raw.trim().toLowerCase() === labels) return raw;
  if (found.some((f) => f.guessed)) return raw + " (read as " + labels + ")";
  return found.length === 1 && raw.toLowerCase() === found[0].code ? raw + ", " + labels : raw + " (" + labels + ")";
}

// "2Cd" -> { lith: "2", master: "C", suffix: "d" }
function nameParts(name) {
  const m = name.trim().match(/^(\d*)([A-Z/&]*)([a-z]*)/);
  return { lith: m[1], master: m[2], suffix: m[3] };
}
function nameMeaning(name) {
  const { lith, master, suffix } = nameParts(name);
  const out = [];
  const letters = master.replace(/[^A-Z]/g, "").split("").filter((x) => MASTERS[x]);
  if (letters.length === 1) out.push(MASTERS[letters[0]]);
  else if (letters.length > 1) out.push("transition, " + letters.map((x) => MASTERS[x]).join(" to "));
  const sx = suffix === "ss" ? ["ss"] : suffix.split("");
  sx.forEach((x) => { if (SUFFIXES[x]) out.push(SUFFIXES[x]); });
  const nth = { 2: "second", 3: "third", 4: "fourth", 5: "fifth" }[lith];
  if (nth) out.push("in the " + nth + " parent material");
  return out.join(", ");
}

/* ---------- the DRoCTS+ table, read from the rendered page ---------- */
function readTable() {
  const rows = {};
  document.querySelectorAll("[data-body] tr[data-hz]").forEach((tr) => {
    const heads = [...tr.closest("table").querySelectorAll("thead th")].map((th) => th.textContent.toLowerCase());
    const col = (re) => {
      const k = heads.findIndex((h) => re.test(h));
      // innerText keeps the line break between the parts of a mixed horizon ("E: ..." / "B: ...") as a space.
      return k > -1 && tr.children[k] ? tr.children[k].innerText.replace(/\s*\n\s*/g, " ").trim() : "";
    };
    if (rows[tr.dataset.hz]) return;
    rows[tr.dataset.hz] = {
      rocks: col(/rock|coarse frag/), color: col(/colou?r/), texture: col(/textur/),
      structure: col(/struct/), hcl: col(/hcl|efferv/), ph: col(/^\s*ph/)
    };
  });
  return rows;
}

/* ---------- colour helpers ---------- */
const probe = document.createElement("canvas").getContext("2d", { willReadFrequently: true });
function rgbOf(css) {
  probe.clearRect(0, 0, 1, 1);
  probe.fillStyle = "#6b635b";
  probe.fillStyle = css;
  probe.fillRect(0, 0, 1, 1);
  const d = probe.getImageData(0, 0, 1, 1).data;
  return [d[0], d[1], d[2]];
}
const mix = (a, b, t) => a.map((v, i) => v + (b[i] - v) * t);
const shade = (c, k) => (k >= 0 ? mix(c, [255, 255, 255], k) : mix(c, [0, 0, 0], -k));
const css = (c, a = 1) => "rgba(" + c.map((v) => Math.round(Math.max(0, Math.min(255, v)))).join(",") + "," + a + ")";
const cssVar = (name, fallback) => getComputedStyle(document.documentElement).getPropertyValue(name).trim() || fallback;

// Seeded random numbers, so each horizon looks the same on every visit.
function rng(seed) {
  let h = 2166136261;
  for (const ch of seed) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
  return () => {
    h += 0x6d2b79f5;
    let t = h;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/* ---------- the official series description, if pasted into osd.txt ---------- */
// Longest names first, so "fine sandy loam" wins over "sandy loam" and "loam".
const OSD_TEXTURES = [
  ["very fine sandy loam", "vfsl"], ["fine sandy loam", "fsl"], ["coarse sandy loam", "cosl"],
  ["loamy very fine sand", "lvfs"], ["loamy fine sand", "lfs"], ["loamy coarse sand", "lcos"], ["loamy sand", "ls"],
  ["sandy clay loam", "scl"], ["silty clay loam", "sicl"], ["sandy loam", "sl"], ["silt loam", "sil"], ["clay loam", "cl"],
  ["silty clay", "sic"], ["sandy clay", "sc"], ["very fine sand", "vfs"], ["fine sand", "fs"], ["coarse sand", "cos"],
  ["loam", "l"], ["silt", "si"], ["clay", "c"], ["sand", "s"]
];
const OSD_STRUCTURES = [
  ["subangular blocky", "sbk"], ["angular blocky", "abk"], ["granular", "gr"], ["prismatic", "pr"], ["columnar", "cpr"],
  ["platy", "pl"], ["wedge", "abk"], ["single grain", "sg"], ["massive", "ma"]
];
const SIZE_WORDS = /\b(extremely coarse|very coarse|very thick|very fine|very thin|coarse|thick|medium|fine|thin)\b/;
const SIZE_CLASS = { "very fine": 0, "very thin": 0, fine: 1, thin: 1, medium: 2, coarse: 3, thick: 3, "very coarse": 4, "very thick": 4, "extremely coarse": 5 };
// Ped size in cm for each size class, by structure type (USDA field book classes).
const PED_CM = {
  gr: [0.05, 0.15, 0.35, 0.75, 1.2, 1.5], pl: [0.05, 0.15, 0.35, 0.75, 1.2, 1.5],
  sbk: [0.4, 0.75, 1.5, 3.5, 6, 8], abk: [0.4, 0.75, 1.5, 3.5, 6, 8],
  pr: [0.7, 1.5, 3.5, 7.5, 15, 25], cpr: [0.7, 1.5, 3.5, 7.5, 15, 25]
};
const GRADE = { weak: 1, moderate: 2, strong: 3 };
const ABUNDANCE = { "very few": 0.004, few: 0.012, common: 0.06, many: 0.22 };   // share of the face
const FEATURE_R = { fine: 0.2, medium: 0.5, coarse: 0.9, "very coarse": 1.4, "extremely coarse": 2 };   // blob radius, cm
const ROOTS_PER_CM = { "very few": 0.08, few: 0.25, common: 0.6, many: 1.2 };
const ROOT_W = { "very fine": 0.04, fine: 0.1, medium: 0.25, coarse: 0.6, "very coarse": 1 };
// Rock fragment radius range in cm, by kind (gravel 0.2-7.5 cm, cobbles 7.5-25 cm, stones 25-60 cm across).
const FRAG_R = { gravel: [0.3, 1.6], channers: [0.5, 2.5], cobbles: [4, 10], stones: [13, 20] };
const fragKind = (word) => (/cobbl/.test(word) ? "cobbles" : /ston/.test(word) ? "stones" : /channer/.test(word) ? "channers" : "gravel");
const BOUNDARY_CM = { "very abrupt": 0.3, abrupt: 1, clear: 3.5, gradual: 10, diffuse: 20 };
const BOUNDARY_WAVE = { smooth: [0.3, 40], wavy: [2.5, 20], irregular: [4, 7], broken: [3, 10] };   // amplitude, wavelength (cm)

function munsellsIn(text) {
  return [...text.matchAll(/\(?\s*(\d+(?:\.\d+)?\s*(?:YR|GY|BG|PB|RP|R|Y|G|B|P)|N)\s*(\d+(?:\.\d+)?)\s*\/\s*(\d+(?:\.\d+)?)?\s*\)/gi)]
    .map((m) => m[1].toUpperCase().replace(/\s+/g, "") + " " + m[2] + "/" + (m[3] || ""));
}

// Pull out the horizon paragraphs ("Ap--0 to 23 cm; black (10YR 2/1) ...") and ignore everything else.
function parseOSD(text) {
  const out = {};
  const head = /^\s*(0[a-z][A-Za-z0-9]*|[0-9]*[A-Z][A-Za-z0-9'’/&]*)\s*-{1,2}\s*(\d+(?:\.\d+)?)\s*to\s*(\d+(?:\.\d+)?)\s*(cm|centimeters|in|inches)\b[^;]*;\s*(.*)$/;
  let cur = null;
  text.replace(/\r/g, "").split("\n").forEach((line) => {
    const m = line.match(head);
    if (m) {
      // Some descriptions type "0i" (zero) for an Oi horizon.
      const name = m[1].replace(/^0(?=[a-z])/, "O");
      cur = { name: name, text: m[5] };
      out[name] = cur;
    } else if (cur && line.trim() && !/^[A-Z][A-Z ]{4,}:/.test(line.trim())) {
      cur.text += " " + line.trim();
    } else {
      cur = null;
    }
  });
  Object.keys(out).forEach((k) => { out[k] = readHorizon(out[k].text); });
  return out;
}

function readHorizon(text) {
  const o = { features: [], structures: [] };
  const clauses = text.split(";").map((c) => c.trim().replace(/\.$/, "")).filter(Boolean);
  // The texture is the first one named, e.g. "black (10YR 2/1) fine sandy loam, ..." or
  // "(65 percent E), reddish brown (5YR 5/4) loam, ...". Longer names win at the same spot.
  const first = (clauses[0] || "").toLowerCase();
  let at = Infinity;
  o.texture = null;
  OSD_TEXTURES.forEach(([n, code]) => {
    const m = first.match(new RegExp("\\b" + n + "\\b"));
    if (m && m.index < at) { at = m.index; o.texture = code; }
  });
  // A combination horizon (E/B) is described as separate parts: "(65 percent E), ... (5YR 4/4) moist,
  // and (35 percent B), ... (2.5YR 3/6) moist". Keep each part's share and moist colour.
  const marks = [...(clauses[0] || "").matchAll(/\((\d+(?:\.\d+)?)\s*percent\s+([A-Z][A-Za-z]*)\)/g)];
  if (marks.length > 1) {
    o.parts = marks.map((m, i) => {
      const seg = clauses[0].slice(m.index + m[0].length, i + 1 < marks.length ? marks[i + 1].index : undefined);
      const moist = seg.match(/\(([^)]*\/[^)]*)\)\s*moist/i);
      return { label: m[2], pct: parseFloat(m[1]), color: moist ? munsellsIn("(" + moist[1] + ")")[0] : munsellsIn(seg)[0] };
    }).filter((p) => p.color);
  }
  const modifier = first.match(/\b(very |extremely )?(gravelly|cobbly|channery|stony)\b/);
  if (modifier) {
    o.rocks = modifier[1] ? 45 : 22;
    o.fragments = [{ pct: o.rocks, kind: fragKind(modifier[2]) }];
  }

  clauses.slice(1).forEach((raw) => {
    const c = raw.toLowerCase();
    let m;
    if (/structure\b|^massive|^single grain/.test(c)) {
      o.structureText = raw;
      o.partings = /partings/.test(c);
      o.structures = c.split(/parting to/).map((part) => {
        const type = OSD_STRUCTURES.find(([n]) => part.includes(n));
        const size = part.match(SIZE_WORDS), grade = part.match(/\b(weak|moderate|strong)\b/);
        return type && { type: type[1], grade: grade ? GRADE[grade[1]] : 2, size: size ? SIZE_CLASS[size[1]] : 2 };
      }).filter(Boolean);
      return;
    }
    // Rock fragments, adding up every kind listed: "8 percent gravel, 4 percent cobbles, 2 percent stones".
    const frags = [...c.matchAll(/(\d+(?:\.\d+)?)\s*(?:to\s*\d+(?:\.\d+)?\s*)?percent\s+[a-z ]*?(rock fragments|fragments|gravel|cobbles?|channers|stones|pebbles)/g)];
    if (frags.length) {
      o.fragments = frags.map((f) => ({ pct: parseFloat(f[1]), kind: fragKind(f[2]) }));
      o.rocks = o.fragments.reduce((sum, f) => sum + f.pct, 0);
      return;
    }
    if ((m = c.match(/\b(very few|few|common|many)\s+((?:very fine|fine|medium|very coarse|coarse)(?:\s*(?:and|,)\s*(?:very fine|fine|medium|very coarse|coarse))*)\s+roots/))) {
      const widths = [...m[2].matchAll(/very fine|very coarse|fine|medium|coarse/g)].map((x) => ROOT_W[x[0]]);
      o.roots = { text: raw, per: ROOTS_PER_CM[m[1]], width: Math.max(...widths) };
      return;
    }
    if ((m = c.match(/(very abrupt|abrupt|clear|gradual|diffuse)\s+(smooth|wavy|irregular|broken)\s+boundary/))) {
      o.boundary = { text: m[1] + " " + m[2], width: BOUNDARY_CM[m[1]], wave: BOUNDARY_WAVE[m[2]] };
      return;
    }
    if ((m = c.match(/(noneffervescent|very slightly effervescent|slightly effervescent|strongly effervescent|violently effervescent)/))) {
      o.hcl = m[1];
      return;
    }
    if (/^(ultra|extremely|very strongly|strongly|moderately|slightly) (acid|alkaline)$|^neutral$/.test(c)) {
      o.reaction = c;
      return;
    }
    // One clause can hold several features: "2 percent gray (10YR 5/1) iron depletions in matrix and
    // 4 percent ... masses of oxidized iron". Split before each new amount; a part that names no
    // feature ("common ... yellowish brown (10YR 5/6) and few ... masses of iron") borrows the next one's.
    const kindOf = (t) => /depletion/.test(t) ? "depl"
      : /coating|films|skeletans/.test(t) ? "coat"
      : /carbonate|calcium|lime\b/.test(t) ? "carb"
      : /iron|manganese|redox|mottle|concentration|concretion|nodule|masses/.test(t) ? "conc" : null;
    if (!kindOf(c)) return;
    const pieces = raw.split(/\s+and\s+(?=(?:\d+(?:\.\d+)?\s*percent|very few|few|common|many)\b)/i);
    const kinds = pieces.map((p) => kindOf(p.toLowerCase()));
    for (let i = kinds.length - 2; i >= 0; i--) if (!kinds[i]) kinds[i] = kinds[i + 1];
    const tail = pieces[pieces.length - 1].toLowerCase();
    pieces.forEach((piece, i) => {
      const t = piece.toLowerCase(), kind = kinds[i];
      if (!kind) return;
      const pct = t.match(/(\d+(?:\.\d+)?)\s*percent/);
      const amounts = [...t.matchAll(/\b(very few|few|common|many)\b/g)].map((x) => ABUNDANCE[x[1]]);
      const sizes = [...t.matchAll(/\b(extremely coarse|very coarse|fine|medium|coarse)\b/g)].map((x) => FEATURE_R[x[1]]);
      const where = /faces|surfaces|pores|channels|matrix/.test(t) ? t : tail;   // location is often only at the end
      o.features.push({
        kind, text: piece, colors: munsellsIn(piece),
        amount: pct ? parseFloat(pct[1]) / 100 : amounts.length ? Math.max(...amounts) : ABUNDANCE.common,
        sizes: sizes.length ? sizes : [0.5],
        faces: /faces|surfaces|pores|channels/.test(where) && !/in (the )?matrix/.test(where)
      });
    });
  });
  return o;
}

/* ---------- the soil's history, from history.txt ---------- */
// Plain "Key: value" lines; each stage starts with "Stage:". Anything else is ignored.
function parseHistory(text) {
  const stages = [];
  let cur = null, lastKey = "";
  const list = (v) => v.split(/[,;]/).map((x) => x.trim()).filter(Boolean);
  text.replace(/\r/g, "").split("\n").forEach((line) => {
    const m = line.match(/^\s*(stage|when|age|deposit|develop|finish|text|source)\s*:\s*(.*)$/i);
    if (!m) {
      if (cur && lastKey === "text" && line.trim()) cur.text += " " + line.trim();
      else lastKey = "";
      return;
    }
    const key = m[1].toLowerCase(), val = m[2].trim();
    lastKey = key;
    if (key === "stage") {
      cur = { title: val, when: "", age: 0, deposit: [], develop: [], finish: [], text: "", source: "" };
      stages.push(cur);
    } else if (cur) {
      if (key === "age") cur.age = Math.max(0, parseFloat(val.replace(/,/g, "")) || 0);
      else if (key === "deposit" || key === "develop" || key === "finish") cur[key] = cur[key].concat(list(val));
      else cur[key] = val;
    }
  });
  return stages.filter((st) => st.title);
}

/* ---------- what each horizon should look like ---------- */
// From the OSD when there is one, otherwise from the table and the horizon name.
function lookFor(hz, row, osd) {
  if (!row && !osd) return null;
  const parts = nameParts(hz.name), has = (x) => parts.suffix.includes(x);
  const L = { texture: null, structures: [], partings: false, rocks: 0, fragments: [], roots: null, features: [], boundary: null, dense: false, parts: null };
  // Without an OSD, an E/B-style horizon with two colours in soil.txt is drawn as 65% / 35% (the first letter dominates).
  const colours = (hz.munsell || "").match(/\d+(?:\.\d+)?\s*(?:YR|GY|BG|PB|RP|R|Y|G|B|P)\s+\d+(?:\.\d+)?\s*\/\s*\d+(?:\.\d+)?/gi) || [];
  if (hz.name.includes("/") && colours.length > 1) L.parts = [{ pct: 65, color: colours[0] }, { pct: 35, color: colours[1] }];
  if (row) {
    L.texture = codeIn(row.texture, TEXTURES);
    // "pris/sbk" reads as prismatic parting to subangular blocky.
    L.structures = readCodes(row.structure, STRUCTURES).map((f) => ({ type: f.code, grade: 2, size: 2 }));
    L.rocks = parseFloat((row.rocks.match(/\d+(\.\d+)?/) || ["0"])[0]);
    L.fragments = [{ pct: L.rocks, kind: "gravel" }];
  }
  if (osd) {
    L.texture = osd.texture || L.texture;
    if (osd.structures.length) L.structures = osd.structures;
    L.partings = osd.partings;
    if (osd.fragments) { L.rocks = osd.rocks; L.fragments = osd.fragments; }
    L.roots = osd.roots || null;
    L.features = osd.features.map((f) => ({ ...f, colors: f.colors.map((c) => rgbOf(window.soilColor(c))) }));
    L.boundary = osd.boundary || null;
    if (osd.parts && osd.parts.length > 1) L.parts = osd.parts;
    return L;
  }
  if (parts.master.startsWith("A")) L.roots = { per: 0.4, width: 0.08 };
  if (has("g")) {
    const rust = rgbOf(cssVar("--rust", "#9a4a22"));
    L.features = [
      { kind: "conc", amount: 0.05, sizes: [0.4, 0.8], colors: [rust, mix(rust, [196, 116, 48], 0.5)] },
      { kind: "depl", amount: 0.015, sizes: [0.6], colors: [shade(rgbOf(hz.color), 0.3)] }
    ];
  }
  L.boundary = has("p") ? { width: 0, wave: [0.15, 40], sharp: true } : { width: 1.8, wave: [0.6, 15] };
  L.dense = has("d");
  return L;
}

/* ---------- painting one horizon face ---------- */
// s is pixels per centimetre. Everything below is measured in cm and scaled.
// plan = true paints the face seen from above or below instead of from the side.
// The matrix is always exactly the horizon's Munsell colour; patterns vary around it.
function paintFace(hz, look, wcm, hcm, s, below, plan) {
  const cv = document.createElement("canvas");
  cv.width = Math.max(8, Math.round(wcm * s));
  cv.height = Math.max(8, Math.round(hcm * s));
  const w = cv.width, h = cv.height, ctx = cv.getContext("2d");
  const r = rng(hz.name + hz.top + hz.munsell + (plan ? "plan" : ""));
  const base = rgbOf(hz.color);
  ctx.fillStyle = css(base);
  ctx.fillRect(0, 0, w, h);
  if (!look) { cv.clean = cv; return cv; }

  const grain = SANDY.includes(look.texture) ? "sandy" : CLAYEY.includes(look.texture) ? "clayey" : "loamy";
  const pick = (list) => list[Math.floor(r() * list.length)];
  const jitterLine = (pts, j) => pts.map(([x, y]) => [x + (r() - 0.5) * j, y + (r() - 0.5) * j]);
  const split = (a, b, steps) => {
    const pts = [];
    for (let i = 0; i <= steps; i++) pts.push([a[0] + (b[0] - a[0]) * i / steps, a[1] + (b[1] - a[1]) * i / steps]);
    return pts;
  };
  const stroke = (pts, width, color) => {
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.beginPath();
    pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
    ctx.stroke();
  };
  function blob(x, y, rad, c, alpha) {
    if (rad < 4) {
      ctx.fillStyle = css(c, alpha * 0.8);
      ctx.beginPath(); ctx.arc(x, y, rad * 0.8, 0, Math.PI * 2); ctx.fill();
      return;
    }
    for (let k = 0; k < 3; k++) {
      const bx = x + (r() - 0.5) * rad, by = y + (r() - 0.5) * rad, br = rad * (0.6 + r() * 0.6);
      const g = ctx.createRadialGradient(bx, by, 0, bx, by, br);
      g.addColorStop(0, css(c, alpha));
      g.addColorStop(0.55, css(c, alpha * 0.6));
      g.addColorStop(1, css(c, 0));
      ctx.fillStyle = g;
      ctx.fillRect(bx - br, by - br, br * 2, br * 2);
    }
  }

  // Broad, quiet variation, balanced so the average stays on the Munsell colour.
  for (let i = 0, n = Math.round(wcm * hcm * (grain === "clayey" ? 0.012 : 0.006)); i < n; i++) {
    const x = r() * w, y = r() * h, rad = (3 + r() * 6) * s;
    const g = ctx.createRadialGradient(x, y, 0, x, y, rad);
    g.addColorStop(0, css(shade(base, (r() - 0.5) * 0.14), 0.5));
    g.addColorStop(1, css(base, 0));
    ctx.fillStyle = g;
    ctx.fillRect(x - rad, y - rad, rad * 2, rad * 2);
  }

  // Structure. Cracks are collected first so coatings can follow the same ped faces.
  const cracks = [];
  look.structures.forEach((st, k) => {
    let type = st.type, size = PED_CM[type] ? PED_CM[type][st.size] : 0;
    if (plan && (type === "pr" || type === "cpr")) type = "abk";      // prism tops seen from above
    if (plan && type === "pl") return;                                 // plates seen flat on
    const weight = (k === 0 ? 1 : 0.7) * [0, 0.4, 0.65, 0.9][st.grade];
    if (type === "sbk" || type === "abk") {
      const ped = Math.max(0.4, size) * s, jit = type === "sbk" ? 0.32 : 0.18;
      const cols = Math.ceil(w / ped) + 2, rows = Math.ceil(h / ped) + 2, grid = [];
      for (let j = 0; j < rows; j++) {
        grid.push([]);
        for (let i = 0; i < cols; i++) grid[j].push([(i - 0.5 + (r() - 0.5) * jit * 2) * ped, (j - 0.5 + (r() - 0.5) * jit * 2) * ped * 0.85]);
      }
      if (k === 0) {
        for (let j = 0; j < rows - 1; j++) {
          for (let i = 0; i < cols - 1; i++) {
            ctx.beginPath();
            [grid[j][i], grid[j][i + 1], grid[j + 1][i + 1], grid[j + 1][i]].forEach(([x, y], q) => (q ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
            ctx.fillStyle = css(shade(base, (r() - 0.5) * 0.04 * (1 + st.grade)));
            ctx.fill();
          }
        }
      }
      const steps = type === "sbk" ? 4 : 2, wob = (type === "sbk" ? 0.2 : 0.08) * ped;
      for (let j = 0; j < rows; j++) {
        for (let i = 0; i < cols; i++) {
          if (i < cols - 1 && r() > 0.1) cracks.push({ pts: jitterLine(split(grid[j][i], grid[j][i + 1], steps), wob), weight, width: 0.05 + 0.04 * st.grade });
          if (j < rows - 1 && r() > 0.1) cracks.push({ pts: jitterLine(split(grid[j][i], grid[j + 1][i], steps), wob), weight, width: 0.05 + 0.04 * st.grade, vertical: true });
        }
      }
    } else if (type === "pr" || type === "cpr") {
      const width = size * s, edges = [];
      let x = (r() - 0.5) * width;
      while (x < w + width) { edges.push(x); x += width * (0.7 + r() * 0.6); }
      edges.forEach((ex, n) => {
        if (k === 0 && n < edges.length - 1) {
          ctx.fillStyle = css(shade(base, (r() - 0.5) * 0.04 * (1 + st.grade)));
          ctx.fillRect(ex, 0, edges[n + 1] - ex, h);
        }
        const pts = [];
        for (let y = 0; y <= h + s; y += 1.5 * s) pts.push([ex + Math.sin(y / (9 * s) + ex) * 0.5 * s, y]);
        cracks.push({ pts: jitterLine(pts, 0.25 * s), weight, width: 0.08 + 0.06 * st.grade, vertical: true });
        if (n < edges.length - 1) {
          for (let y = width * (1 + r()); y < h; y += width * (1.5 + r())) {
            cracks.push({ pts: jitterLine(split([ex, y], [edges[n + 1], y + (r() - 0.5) * 2 * s], 3), 0.3 * s), weight: weight * 0.8, width: 0.05 + 0.04 * st.grade });
          }
        }
      });
    } else if (type === "gr") {
      const rad = Math.max(0.12, size / 2), cover = 0.45 + 0.15 * st.grade;
      ctx.fillStyle = css(shade(base, -0.35), 0.12 * st.grade * (k === 0 ? 1 : 0.6));
      ctx.fillRect(0, 0, w, h);
      for (let i = 0, n = Math.min(12000, Math.round(wcm * hcm * cover / (Math.PI * rad * rad))); i < n; i++) {
        const x = r() * w, y = r() * h, rr = rad * (0.6 + r() * 0.8) * s, c = shade(base, (r() - 0.45) * 0.18);
        ctx.fillStyle = css(c);
        // Crumbs only a pixel or two across are drawn as squares: they look the same and cost far less.
        if (rr < 2) { ctx.fillRect(x - rr, y - rr, rr * 2, rr * 2); continue; }
        ctx.beginPath(); ctx.ellipse(x, y, rr, rr * (0.75 + r() * 0.25), r() * 3, 0, Math.PI * 2); ctx.fill();
      }
    } else if (type === "pl") {
      const gapCm = Math.max(0.3, size);
      for (let y = r() * gapCm * s; y < h; y += gapCm * s * (0.8 + r() * 0.5)) {
        let x = -r() * 6 * s;
        while (x < w) {
          const len = (4 + r() * 8) * s;
          cracks.push({ pts: jitterLine(split([x, y], [x + len, y + (r() - 0.5) * 0.6 * s], 4), 0.1 * s), weight, width: 0.04 + 0.03 * st.grade });
          x += len + (0.8 + r() * 2) * s;
        }
      }
    }
  });
  // "Massive, with widely spaced vertical partings."
  if (look.partings) {
    for (let x = r() * 12 * s; x < w; x += (10 + r() * 10) * s) {
      const pts = [];
      for (let y = 0; y <= h + s; y += 2 * s) pts.push([x + Math.sin(y / (11 * s)) * 0.6 * s, y]);
      cracks.push({ pts: jitterLine(pts, 0.3 * s), weight: 0.5, width: 0.07, vertical: true });
    }
  }

  // A combination horizon: distinct bodies of the minor part(s) (the B in E/B) within the main one,
  // drawn over the peds and under the cracks.
  if (look.parts) {
    look.parts.slice(1).forEach((part) => {
      const c = rgbOf(window.soilColor(part.color));
      // Each body is a cluster of overlapping ellipses about 18 cm² in area; enough of them to cover the stated share.
      const n = Math.min(400, Math.round((part.pct / 100) * wcm * hcm / 18));
      for (let i = 0; i < n; i++) {
        const x = r() * w, y = r() * h, body = shade(c, (r() - 0.5) * 0.12);
        ctx.fillStyle = css(body);
        for (let k = 0; k < 4; k++) {
          ctx.beginPath();
          ctx.ellipse(x + (r() - 0.5) * 3 * s, y + (r() - 0.5) * 2 * s, (1.2 + r() * 1.8) * s, (0.9 + r() * 1.2) * s, r() * Math.PI, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    });
  }

  // Features in the matrix: iron masses and depletions, in their own Munsell colours.
  const area = wcm * hcm;
  look.features.forEach((f) => {
    if (!f.colors.length) return;
    if (f.faces && cracks.length) {
      // Coatings and carbonate on ped or prism faces follow the cracks.
      const onVertical = f.kind === "carb" && cracks.some((c) => c.vertical);
      const share = Math.min(0.85, f.amount * 8);
      cracks.forEach((c) => {
        if ((onVertical && !c.vertical) || r() > share) return;
        ctx.setLineDash(f.kind === "carb" ? [(0.6 + r()) * s, (0.8 + r() * 2) * s] : []);
        stroke(c.pts, Math.max(1.5, (f.kind === "carb" ? 0.35 : 0.3) * s), css(pick(f.colors), f.kind === "carb" ? 0.75 : 0.55));
      });
      ctx.setLineDash([]);
      return;
    }
    const avg = f.sizes.reduce((a, b) => a + b, 0) / f.sizes.length;
    for (let i = 0, n = Math.min(1500, Math.round(f.amount * area / (Math.PI * avg * avg))); i < n; i++) {
      blob(r() * w, r() * h, pick(f.sizes) * s * (0.7 + r() * 0.6), pick(f.colors), f.kind === "depl" ? 0.7 : 0.85);
    }
  });

  // The cracks themselves, over the coatings.
  const crackColor = shade(base, -0.45);
  cracks.forEach((c) => stroke(c.pts, Math.max(1, c.width * s), css(crackColor, 0.6 * c.weight)));

  // Texture: sand glints as fine speckle; clay stays quiet. Balanced lighter and darker.
  const speck = { sandy: [0.16, 0.26], loamy: [0.06, 0.16], clayey: [0.015, 0.08] }[grain];
  const dot = Math.max(1, Math.round(0.12 * s));
  for (let i = 0, n = Math.min(20000, Math.round(w * h * speck[0] / (dot * dot))); i < n; i++) {
    ctx.fillStyle = css(shade(base, (r() - 0.5) * speck[1] * 2), 0.6);
    ctx.fillRect(r() * w, r() * h, dot, dot);
  }

  // Without an OSD, a "d" horizon gets fine flattened laminae to read as dense.
  if (look.dense && !plan) {
    for (let y = r() * s; y < h; y += (0.5 + r() * 0.5) * s) {
      stroke(jitterLine(split([0, y], [w, y + (r() - 0.5) * s], 8), 0.12 * s), Math.max(1, 0.06 * s), css(shade(base, -0.4), 0.18));
    }
  }

  // Roots: threads wandering down from the side, cut ends from above.
  if (look.roots) {
    const rootColor = [214, 196, 158], rw = Math.max(0.7, look.roots.width * s);
    if (plan) {
      for (let i = 0, n = Math.round(look.roots.per * area * 0.4); i < n; i++) {
        ctx.fillStyle = css(rootColor, 0.4 + r() * 0.3);
        ctx.beginPath(); ctx.arc(r() * w, r() * h, rw * 0.8, 0, Math.PI * 2); ctx.fill();
      }
    } else {
      for (let i = 0, n = Math.max(1, Math.round(look.roots.per * wcm)); i < n; i++) {
        let x = r() * w, y = r() * h * 0.3, a = Math.PI / 2 + (r() - 0.5) * 0.6;
        const len = (0.4 + r() * 0.6) * h;
        ctx.strokeStyle = css(rootColor, 0.35 + r() * 0.3);
        ctx.lineWidth = rw * (0.6 + r() * 0.6);
        ctx.beginPath(); ctx.moveTo(x, y);
        for (let d = 0; d < len; d += 0.8 * s) {
          a = Math.max(0.35, Math.min(Math.PI - 0.35, a + (r() - 0.5) * 0.5));
          x += Math.cos(a) * 0.8 * s; y += Math.sin(a) * 0.8 * s;
          ctx.lineTo(x, y);
          if (r() < 0.05) {
            const ba = a + (r() < 0.5 ? -0.8 : 0.8);
            ctx.moveTo(x + Math.cos(ba) * 2 * s, y + Math.sin(ba) * 2 * s);
            ctx.lineTo(x, y);
          }
        }
        ctx.stroke();
      }
    }
  }

  // Rocks: scatter that share of the face with fragments sized by kind (gravel, cobbles, stones).
  const stones = [[128, 122, 112], [104, 97, 87], [146, 134, 112], [86, 82, 77], [120, 102, 82]];
  look.fragments.forEach((f) => {
   const [r0, r1] = FRAG_R[f.kind], flat = f.kind === "channers" ? 0.35 : 0.55, avg = (r0 + r1) / 2;
   const expected = (Math.min(60, f.pct) / 100) * area / (Math.PI * avg * avg * (flat + 0.2));
   for (let i = 0, n = Math.floor(expected + r()); i < n; i++) {
    const x = r() * w, y = r() * h, rx = (r0 + r() * (r1 - r0)) * s, ry = rx * (flat + r() * 0.4), rot = r() * Math.PI;
    const c = pick(stones);
    ctx.fillStyle = "rgba(0,0,0,0.3)";
    ctx.beginPath(); ctx.ellipse(x + 0.12 * s, y + 0.15 * s, rx, ry, rot, 0, Math.PI * 2); ctx.fill();
    const g = ctx.createRadialGradient(x - rx * 0.35, y - ry * 0.4, 0, x, y, rx);
    g.addColorStop(0, css(shade(c, 0.14)));
    g.addColorStop(1, css(shade(c, -0.15)));
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.ellipse(x, y, rx, ry, rot, 0, Math.PI * 2); ctx.fill();
   }
  });

  // Keep a copy without the lower boundary, for the horizon above to blend into.
  if (!plan) {
    cv.clean = document.createElement("canvas");
    cv.clean.width = w;
    cv.clean.height = h;
    cv.clean.getContext("2d").drawImage(cv, 0, 0);
  }

  // The lower boundary: the horizon below, with its own texture, reaches up into
  // this one, as wide and as wavy as the description says (abrupt is a crisp
  // edge, gradual a long blend). "below" is that horizon's face, before its own boundary.
  if (!plan && below && look.boundary) {
    const [amp, wave] = look.boundary.wave;
    const blend = Math.min(look.boundary.width, hcm * 0.45) * s;
    const band = Math.min(h, below.height, Math.ceil(amp * s + blend + 2));
    const piece = document.createElement("canvas"), mask = document.createElement("canvas");
    piece.width = mask.width = w;
    piece.height = mask.height = band;
    const pc = piece.getContext("2d"), mc = mask.getContext("2d"), phase = r() * 6;
    pc.drawImage(below, 0, 0, Math.min(w, below.width), band, 0, 0, w, band);
    for (let x = 0; x < w; x += 2) {
      const wobble = Math.sin((x / (wave * s)) * Math.PI * 2 + phase) * 0.5 + 0.5 + (r() - 0.5) * 0.15;
      const edge = band - Math.max(0.15 * s, amp * s * wobble);
      mc.fillStyle = "#000";
      mc.fillRect(x, edge, 2, band - edge);
      if (blend > 1) {
        const g = mc.createLinearGradient(0, edge - blend, 0, edge);
        g.addColorStop(0, "rgba(0,0,0,0)");
        g.addColorStop(1, "rgba(0,0,0,0.85)");
        mc.fillStyle = g;
        mc.fillRect(x, edge - blend, 2, blend);
      }
    }
    pc.globalCompositeOperation = "destination-in";
    pc.drawImage(mask, 0, 0);
    ctx.drawImage(piece, 0, h - band);
    if (look.boundary.sharp) {
      ctx.fillStyle = css(shade(base, -0.45));
      ctx.fillRect(0, h - Math.max(2, 0.25 * s), w, Math.max(2, 0.25 * s));
    }
  }
  return cv;
}

function labelled(face, name, s, hcm) {
  const cv = document.createElement("canvas");
  cv.width = face.width; cv.height = face.height;
  const ctx = cv.getContext("2d");
  ctx.drawImage(face, 0, 0);
  const size = Math.round(Math.min(4.2, hcm * 0.42) * s);
  ctx.font = "500 " + size + 'px "IBM Plex Mono", ui-monospace, monospace';
  ctx.textBaseline = "top";
  ctx.shadowColor = "rgba(0,0,0,0.75)";
  ctx.shadowBlur = size * 0.25;
  ctx.fillStyle = "#f4efe6";
  ctx.fillText(name, 1.4 * s, Math.min(1.2 * s, hcm * 0.2 * s));
  return cv;
}

/* ---------- waiting for site.js to build the page ---------- */
function pageReady() {
  if (window.soilPage) return Promise.resolve(window.soilPage);
  return new Promise((done) => document.addEventListener("soil:page", () => done(window.soilPage), { once: true }));
}

function webglWorks() {
  try {
    const c = document.createElement("canvas");
    const gl = c.getContext("webgl2") || c.getContext("webgl");
    if (gl) gl.getExtension("WEBGL_lose_context")?.loseContext();
    return !!gl;
  } catch (e) {
    return false;
  }
}

function describe(soil, table) {
  const hz = soil.horizons;
  return "Three-dimensional model of the " + (soil.series || "soil") + " profile, " + hz[hz.length - 1].bottom +
    " cm deep, with " + hz.length + " horizons from the surface down: " +
    hz.map((h) => {
      const row = table[h.name], bits = [h.name + ", " + h.top + " to " + h.bottom + " cm"];
      if (h.munsell) bits.push(h.munsell);
      if (row) {
        const t = codeIn(row.texture, TEXTURES), st = codeIn(row.structure, STRUCTURES);
        if (t) bits.push(TEXTURES[t]);
        if (st) bits.push(STRUCTURES[st]);
      }
      return bits.join(", ");
    }).join("; ") + ". The same information is in the profile column and the table.";
}

/* ---------- the page section ---------- */
function buildSection(soil, table, hasOSD, history) {
  const section = document.createElement("section");
  section.className = "monolith-section";
  section.innerHTML =
    "<h2>The profile in 3D</h2>" +
    '<p class="notes">A soil monolith built from the horizons above. Drag to turn it, scroll or pinch to zoom, and click or tap a horizon to read it.</p>' +
    '<figure class="monolith">' +
    '<div class="stage" role="img"><p class="stage-note">Loading the 3D model…</p></div>' +
    '<div class="bar">' +
    '<button type="button" data-explode aria-pressed="false">Explode</button>' +
    '<button type="button" data-spin aria-pressed="false">Turn slowly</button>' +
    '<button type="button" data-reset>Reset view</button>' +
    "</div>" +
    '<div class="card" data-card></div>' +
    (history.length ? '<div class="history" data-history hidden></div>' : "") +
    "<figcaption>Depths are to scale; width and thickness are not. Each horizon is its moist Munsell colour, and the surface patterns are drawn from " +
    (hasOSD ? "the official series description (structure, redox features, roots and boundaries) and the DRoCTS+ table." : "the texture, structure and rock codes in the table.") +
    "</figcaption>" +
    "</figure>";
  section.querySelector(".stage").setAttribute("aria-label", describe(soil, table));
  if (history.length) {
    // The whole history as text, for reading at your own pace and for screen readers.
    const details = document.createElement("details");
    details.className = "history-list";
    const summary = document.createElement("summary");
    summary.textContent = "How this soil formed, stage by stage";
    const ol = document.createElement("ol");
    history.forEach((st) => {
      const li = document.createElement("li");
      const b = document.createElement("b");
      b.textContent = st.title + (st.when ? " (" + st.when + ")" : "");
      li.append(b, document.createTextNode(" " + st.text));
      if (st.source) {
        const src = document.createElement("small");
        src.textContent = "Source: " + st.source;
        li.append(document.createElement("br"), src);
      }
      ol.appendChild(li);
    });
    details.append(summary, ol);
    section.querySelector(".monolith").after(details);
  }

  const body = document.querySelector("[data-body]");
  const row = body.querySelector("tr[data-hz]");
  const heading = [...body.querySelectorAll("section > h2")].find((h) => /drocts/i.test(h.textContent));
  const after = (row && row.closest("section")) || (heading && heading.parentNode);
  if (after) after.after(section); else body.prepend(section);
  return section;
}

const FEATURE_LABEL = { conc: "Iron masses", depl: "Iron depletions", coat: "Coatings", carb: "Carbonate" };
function featureLabel(f) {
  const t = f.text.toLowerCase();
  if (f.kind === "coat") return /organic/.test(t) ? "Organic coatings" : /clay/.test(t) ? "Clay films" : "Coatings";
  if (f.kind === "conc") return /manganese/.test(t) ? "Manganese masses" : /concretion|nodule/.test(t) ? "Concretions" : /mottle/.test(t) ? "Mottles" : "Iron masses";
  return FEATURE_LABEL[f.kind];
}
function osdFor(osd, name) {
  const keys = Object.keys(osd), low = name.toLowerCase();
  const same = keys.find((k) => k.toLowerCase() === low);
  if (same) return osd[same];
  // "Agb" in the description and "Agb1" in soil.txt: match when only a trailing number differs, and only one does.
  const bare = (k) => k.toLowerCase().replace(/\d+$/, "");
  const close = keys.filter((k) => bare(k) === bare(name));
  return close.length === 1 ? osd[close[0]] : null;
}

function fillCard(card, soil, table, osd, name) {
  card.textContent = "";
  const hz = soil.horizons.find((h) => h.name === name);
  if (!hz) {
    const p = document.createElement("p");
    p.className = "card-hint";
    p.textContent = "Click or tap a horizon in the model, the profile column or the table to read it here.";
    card.appendChild(p);
    return;
  }
  const title = document.createElement("h3");
  title.textContent = hz.name;
  const meaning = nameMeaning(hz.name);
  if (meaning) {
    const small = document.createElement("small");
    small.textContent = meaning;
    title.appendChild(small);
  }
  card.appendChild(title);

  const row = table[hz.name] || {};
  const described = osdFor(osd, hz.name);
  const facts = [
    ["Depth", hz.top + "–" + hz.bottom + " cm (" + Math.round(hz.top / IN) + "–" + Math.round(hz.bottom / IN) + " in)"],
    ["Colour", hz.munsell ? hz.munsell + " moist" : ""],
    ["Texture", spell(row.texture, TEXTURES)],
    ["Structure", spell(row.structure, STRUCTURES)],
    ["Rocks", row.rocks ? row.rocks + (/^[\d.]+$/.test(row.rocks) ? "%" : "") : ""],
    ["HCl", row.hcl && !codeIn(row.hcl, HCL) && described && described.hcl
      ? row.hcl + " (code not recognised; the OSD says " + described.hcl + ")" : spell(row.hcl, HCL)],
    ["pH", row.ph]
  ];
  const dl = document.createElement("dl");
  facts.forEach(([k, v]) => {
    if (!v) return;
    const dt = document.createElement("dt"), dd = document.createElement("dd");
    dt.textContent = k;
    if (k === "Colour") {
      // One chip per colour, so an E/B shows both its parts.
      const all = (hz.munsell || "").match(/\d+(?:\.\d+)?\s*(?:YR|GY|BG|PB|RP|R|Y|G|B|P)\s+\d+(?:\.\d+)?\s*\/\s*\d+(?:\.\d+)?|N\s*\d+(?:\.\d+)?\s*\//gi) || [hz.munsell];
      all.forEach((m) => {
        const chip = document.createElement("span");
        chip.className = "chip";
        chip.style.background = all.length > 1 ? window.soilColor(m) : hz.color;
        dd.appendChild(chip);
      });
    }
    dd.appendChild(document.createTextNode(v));
    dl.append(dt, dd);
  });
  card.appendChild(dl);

  if (!described) return;
  const head = document.createElement("h4");
  head.textContent = "From the official series description";
  const more = document.createElement("dl");
  const add = (k, v, colors) => {
    if (!v) return;
    const dt = document.createElement("dt"), dd = document.createElement("dd");
    dt.textContent = k;
    (colors || []).forEach((c) => {
      const chip = document.createElement("span");
      chip.className = "chip";
      chip.style.background = window.soilColor(c);
      chip.title = c;
      dd.appendChild(chip);
    });
    dd.appendChild(document.createTextNode(v));
    more.append(dt, dd);
  };
  add("Structure", described.structureText);
  described.features.forEach((f) => {
    const pct = f.text.match(/(\d+(?:\.\d+)?)\s*percent/i);
    const amount = pct ? pct[1] + "%" : (f.text.toLowerCase().match(/\b(very few|few|common|many)\b/) || [""])[0];
    add(featureLabel(f), [amount, f.colors.join(", ")].filter(Boolean).join(", "), f.colors);
  });
  add("Roots", described.roots && described.roots.text);
  add("Boundary", described.boundary && described.boundary.text + " to the horizon below");
  card.append(head, more);
}

/* ---------- the 3D scene ---------- */
async function buildModel(section, soil, table, osd, history, page, pending) {
  const THREE = await import("three");
  const { OrbitControls } = await import("three/addons/controls/OrbitControls.js");
  try { await document.fonts.load('500 20px "IBM Plex Mono"'); } catch (e) { /* the fallback font is fine */ }

  const stage = section.querySelector(".stage");
  const card = section.querySelector("[data-card]");
  const hzs = soil.horizons;
  const D = hzs[hzs.length - 1].bottom;
  const W = Math.max(30, D * 0.4), T = Math.max(10, D * 0.15);
  const gap = D * 0.05;
  const s = Math.min(9, 1400 / Math.max(W, ...hzs.map((h) => h.bottom - h.top)));

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  const canvas = renderer.domElement;
  stage.textContent = "";
  stage.appendChild(canvas);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(30, 1, 1, D * 40);
  // Calibrated so a face turned to the viewer shows its true Munsell colour.
  scene.add(new THREE.HemisphereLight(0xffffff, 0x7d7466, 2.9));
  const sun = new THREE.DirectionalLight(0xffffff, 1.95);
  sun.position.set(-0.6, 0.8, 1).multiplyScalar(D);
  scene.add(sun);

  const maxAniso = renderer.capabilities.getMaxAnisotropy();
  const tex = (cv, repeatX = 1, offsetX = 0) => {
    const t = new THREE.CanvasTexture(cv);
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = Math.min(8, maxAniso);
    t.repeat.set(repeatX, 1);
    t.offset.set(offsetX, 0);
    return t;
  };
  const flat = (c) => new THREE.MeshLambertMaterial({ color: new THREE.Color().setRGB(c[0] / 255, c[1] / 255, c[2] / 255, THREE.SRGBColorSpace) });

  const model = new THREE.Group();
  scene.add(model);
  // Paint from the bottom up, so each face can blend into the one below it.
  const looks = hzs.map((hz) => lookFor(hz, table[hz.name], osdFor(osd, hz.name)));
  const faces = [];
  for (let i = hzs.length - 1; i >= 0; i--) faces[i] = paintFace(hzs[i], looks[i], W, hzs[i].bottom - hzs[i].top, s, faces[i + 1] && faces[i + 1].clean, false);
  const slabs = hzs.map((hz, i) => {
    const h = hz.bottom - hz.top;
    const look = looks[i], face = faces[i];
    const plan = tex(paintFace(hz, look, W, T, s / 2, null, true));
    const front = tex(labelled(face, hz.name, s, h));
    const back = tex(face);
    const side = T / W;
    // Box faces in order: right, left, top, bottom, front, back.
    const mats = [
      new THREE.MeshLambertMaterial({ map: tex(face, side, 1 - side) }),
      new THREE.MeshLambertMaterial({ map: tex(face, side, 0) }),
      new THREE.MeshLambertMaterial({ map: plan, color: i === 0 ? 0xffffff : 0xe6e6e6 }),
      new THREE.MeshLambertMaterial({ map: plan, color: 0xcccccc }),
      new THREE.MeshLambertMaterial({ map: front }),
      new THREE.MeshLambertMaterial({ map: back })
    ];
    mats.forEach((m) => { m.userData.base = m.color.clone(); });
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(W, h, T), mats);
    const y = D / 2 - (hz.top + hz.bottom) / 2;
    mesh.position.y = y;
    mesh.userData = {
      name: hz.name, y: y, h: h, i: i,
      now: { lift: 0, off: 0, dim: 1, grow: 1, mix: 1 }, goal: { lift: 0, off: 0, dim: 1, grow: 1, mix: 1 }
    };
    model.add(mesh);
    return mesh;
  });

  // A plinth to stand on, like a museum monolith, and a depth ruler.
  const light = rgbOf(cssVar("--stage-ink", "#d9d6cf"));
  const plinth = new THREE.Mesh(new THREE.BoxGeometry(W + 6, 2.5, T + 6), flat(rgbOf(cssVar("--gley", "#6b635b"))));
  plinth.position.y = -D / 2 - 1.25;
  model.add(plinth);

  const ruler = new THREE.Group();
  const rulerMat = flat(light);
  const rx = -W / 2 - 3, rz = T / 2;
  const bar = new THREE.Mesh(new THREE.BoxGeometry(0.5, D, 0.5), rulerMat);
  bar.position.set(rx, 0, rz);
  ruler.add(bar);
  const labelH = Math.max(4, D * 0.032);
  for (let d = 0; d <= D; d += 10) {
    const major = d % 50 === 0 || d === 0;
    const tick = new THREE.Mesh(new THREE.BoxGeometry(major ? 2.4 : 1.2, 0.35, 0.35), rulerMat);
    tick.position.set(rx - (major ? 1.2 : 0.6), D / 2 - d, rz);
    ruler.add(tick);
    if (!major) continue;
    const lc = document.createElement("canvas");
    lc.width = 160; lc.height = 48;
    const lx = lc.getContext("2d");
    lx.font = '500 30px "IBM Plex Mono", ui-monospace, monospace';
    lx.textAlign = "right"; lx.textBaseline = "middle";
    lx.fillStyle = cssVar("--stage-ink", "#d9d6cf");
    lx.fillText(d + (d === 0 ? " cm" : ""), 156, 24);
    const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex(lc), depthWrite: false }));
    sprite.scale.set(labelH * (160 / 48), labelH, 1);
    sprite.position.set(rx - 3 - labelH * (160 / 48) / 2, D / 2 - d, rz);
    ruler.add(sprite);
  }
  model.add(ruler);

  /* camera and controls */
  const controls = new OrbitControls(camera, canvas);
  controls.enablePan = false;
  controls.enableDamping = !reduceMotion.matches;
  controls.dampingFactor = 0.12;
  controls.minPolarAngle = Math.PI * 0.12;
  controls.maxPolarAngle = Math.PI * 0.6;
  controls.autoRotateSpeed = 0.8;
  controls.rotateSpeed = 0.8;

  let exploded = false;
  const view = { polar: Math.PI * 0.44, azimuth: Math.PI * 0.17 };
  function fitDistance() {
    const tall = (exploded ? D + gap * (hzs.length - 1) : D) * 1.12 + 12;
    const wide = Math.hypot(W, T) * 1.35 + 30;
    const half = THREE.MathUtils.degToRad(camera.fov / 2);
    return Math.max(tall / 2 / Math.tan(half), wide / 2 / (Math.tan(half) * camera.aspect)) + T / 2;
  }
  function setLimits() {
    const fit = fitDistance();
    controls.minDistance = fit * 0.35;
    controls.maxDistance = fit * 1.6;
    return fit;
  }
  function resetView() {
    const fit = setLimits();
    controls.target.set(0, 0, 0);
    camera.position.setFromSphericalCoords(fit, view.polar, view.azimuth);
    camera.lookAt(controls.target);
    controls.update();
    dirty = true;
  }
  let dolly = null;  // a smooth move to a new viewing distance

  function resize() {
    const w = stage.clientWidth, h = stage.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    setLimits();
    dirty = true;
  }

  /* selection */
  let selected = null, dirty = true;
  function select(name, fromPage) {
    selected = slabs.some((m) => m.userData.name === name) ? name : null;
    slabs.forEach((m) => {
      const on = m.userData.name === selected;
      m.userData.goal.lift = on ? T * 0.45 : 0;
      m.userData.goal.dim = selected && !on ? 0.55 : 1;
    });
    fillCard(card, soil, table, osd, selected);
    if (!fromPage) page.show(selected);
    dirty = true;
  }
  function setExploded(on) {
    exploded = on;
    slabs.forEach((m) => { m.userData.goal.off = on ? gap * ((hzs.length - 1) / 2 - m.userData.i) : 0; });
    ruler.visible = !on;
    const fit = setLimits();
    dolly = fit;
    dirty = true;
  }

  /* ---------- "Play its history" ---------- */
  // Each horizon starts as raw parent material and blends into how it looks today
  // ("mix"); horizons not yet laid down are hidden, then grow in from below ("grow").
  const panel = section.querySelector("[data-history]");
  let historyOn = false, stageIndex = 0, playing = false, timer = null;
  const ghost = new THREE.LineSegments(
    new THREE.EdgesGeometry(new THREE.BoxGeometry(W, D, T)),
    new THREE.LineBasicMaterial({ color: new THREE.Color().setRGB(light[0] / 255, light[1] / 255, light[2] / 255, THREE.SRGBColorSpace), transparent: true, opacity: 0.35 })
  );
  ghost.visible = false;
  model.add(ghost);

  function prepareHistory() {
    if (slabs[0].userData.mix) return;
    slabs.forEach((m, i) => {
      const hz = hzs[i], h = hz.bottom - hz.top, look = looks[i];
      const rgb = rgbOf(hz.color), grey = (rgb[0] + rgb[1] + rgb[2]) / 3;
      // Raw parent material: paler and greyer than today's horizon, with its grains and rocks but no structure.
      const rawHz = { ...hz, color: css(shade(mix(rgb, [grey, grey, grey], 0.4), 0.12)) };
      const rawLook = {
        texture: look ? look.texture : null, structures: [], partings: false, rocks: look ? look.rocks : 0,
        fragments: look ? look.fragments : [], roots: null, features: [], boundary: null, dense: false
      };
      const rawFace = paintFace(rawHz, rawLook, W, h, s, null, false);
      const raw = { face: rawFace, front: labelled(rawFace, hz.name, s, h), plan: paintFace(rawHz, rawLook, W, T, s / 2, null, true) };
      const fin = { face: faces[i], front: m.material[4].map.image, plan: m.material[2].map.image };
      const blank = (src) => Object.assign(document.createElement("canvas"), { width: src.width, height: src.height });
      const out = { face: blank(fin.face), front: blank(fin.front), plan: blank(fin.plan) };
      const side = T / W;
      const texs = [tex(out.face, side, 1 - side), tex(out.face, side, 0), tex(out.plan), tex(out.plan), tex(out.front), tex(out.face)];
      m.userData.mix = { raw, fin, out, texs, finals: m.material.map((mat) => mat.map), drawn: -1 };
    });
  }
  function drawMix(m, t) {
    const x = m.userData.mix;
    ["face", "front", "plan"].forEach((k) => {
      const ctx = x.out[k].getContext("2d");
      ctx.globalAlpha = 1;
      ctx.drawImage(x.raw[k], 0, 0, x.out[k].width, x.out[k].height);
      if (t > 0) { ctx.globalAlpha = t; ctx.drawImage(x.fin[k], 0, 0, x.out[k].width, x.out[k].height); }
      ctx.globalAlpha = 1;
    });
    x.texs.forEach((tx) => { tx.needsUpdate = true; });
    x.drawn = t;
  }
  function useHistoryMaps(on) {
    slabs.forEach((m) => m.material.forEach((mat, j) => {
      mat.map = on ? m.userData.mix.texs[j] : m.userData.mix.finals[j];
      mat.needsUpdate = true;
    }));
  }
  function place(m) {
    const u = m.userData, n = u.now, grow = Math.max(0.001, n.grow);
    m.visible = n.grow > 0.002;
    m.scale.y = grow;
    m.position.set(0, u.y - u.h / 2 + (u.h * grow) / 2 + n.off, n.lift);
  }

  // Horizon names in history.txt, matched like the OSD ("Agb" finds "Agb1"); "all" means every horizon.
  function horizonsNamed(list) {
    if (list.some((n) => n.toLowerCase() === "all")) return hzs.map((h) => h.name);
    const bare = (k) => k.toLowerCase().replace(/\d+$/, "");
    return list.map((n) => {
      const exact = hzs.find((h) => h.name.toLowerCase() === n.toLowerCase());
      if (exact) return exact.name;
      const close = hzs.filter((h) => bare(h.name) === bare(n));
      return close.length === 1 ? close[0].name : null;
    }).filter(Boolean);
  }
  const laidDown = new Set(history.flatMap((st) => horizonsNamed(st.deposit)));
  function stateAt(k) {
    const grow = {}, mixes = {};
    hzs.forEach((h) => { grow[h.name] = laidDown.has(h.name) ? 0 : 1; mixes[h.name] = 0; });
    history.slice(0, k + 1).forEach((st) => {
      horizonsNamed(st.deposit).forEach((n) => { grow[n] = 1; });
      horizonsNamed(st.develop).forEach((n) => { mixes[n] = Math.max(mixes[n], 0.55); });
      horizonsNamed(st.finish).forEach((n) => { mixes[n] = 1; });
    });
    if (k === history.length - 1) hzs.forEach((h) => { grow[h.name] = 1; mixes[h.name] = 1; });   // the last stage is today
    return { grow, mixes };
  }

  // Stages sit evenly along the timeline: the ages span 280 million years to today, so a
  // true scale would bunch them up. Each stage's own date is written in the caption.
  const along = (i) => (history.length > 1 ? i / (history.length - 1) : 1);
  function buildPanel() {
    panel.innerHTML =
      '<p class="history-when"><span data-count></span> <span data-when></span></p>' +
      '<h3 data-title tabindex="-1"></h3><p class="history-text" data-text></p><p class="history-source" data-source></p>' +
      '<div class="timeline"><div class="track"></div><div class="ticks" role="group" aria-label="Stages"></div>' +
      '<span class="end start">Oldest</span><span class="end now">Today</span></div>' +
      '<div class="history-controls">' +
      '<button type="button" data-prev>Back</button><button type="button" data-play>Pause</button><button type="button" data-next>Next</button>' +
      "</div>";
    const ticks = panel.querySelector(".ticks");
    history.forEach((st, i) => {
      const b = document.createElement("button");
      b.type = "button";
      b.style.left = (along(i) * 100).toFixed(2) + "%";
      b.setAttribute("aria-label", "Stage " + (i + 1) + ": " + st.title);
      b.title = st.title + (st.when ? " (" + st.when + ")" : "");
      b.addEventListener("click", () => { stop(); applyStage(i); });
      ticks.appendChild(b);
    });
    panel.querySelector("[data-prev]").addEventListener("click", () => { stop(); applyStage(Math.max(0, stageIndex - 1)); });
    panel.querySelector("[data-next]").addEventListener("click", () => { stop(); applyStage(Math.min(history.length - 1, stageIndex + 1)); });
    panel.querySelector("[data-play]").addEventListener("click", () => {
      if (playing) return stop();
      if (stageIndex === history.length - 1) applyStage(0);
      play();
    });
  }
  function showStage() {
    const st = history[stageIndex];
    panel.querySelector("[data-count]").textContent = "Stage " + (stageIndex + 1) + " of " + history.length + " ·";
    panel.querySelector("[data-when]").textContent = st.when;
    panel.querySelector("[data-title]").textContent = st.title;
    panel.querySelector("[data-text]").textContent = st.text;
    panel.querySelector("[data-source]").textContent = st.source ? "Source: " + st.source : "";
    panel.querySelectorAll(".ticks button").forEach((b, i) => {
      b.classList.toggle("is-on", i === stageIndex);
      b.classList.toggle("is-past", i < stageIndex);
    });
    panel.querySelector(".track").style.setProperty("--done", (along(stageIndex) * 100).toFixed(2) + "%");
    panel.querySelector("[data-prev]").disabled = stageIndex === 0;
    panel.querySelector("[data-next]").disabled = stageIndex === history.length - 1;
    panel.querySelector("[data-play]").textContent = playing ? "Pause" : stageIndex === history.length - 1 ? "Replay" : "Play";
  }
  function applyStage(k) {
    stageIndex = k;
    const { grow, mixes } = stateAt(k);
    slabs.forEach((m) => { m.userData.goal.grow = grow[m.userData.name]; m.userData.goal.mix = mixes[m.userData.name]; });
    showStage();
    dirty = true;
  }
  function stop() {
    playing = false;
    clearTimeout(timer);
    if (historyOn) showStage();
  }
  function play() {
    playing = true;
    showStage();
    const words = history[stageIndex].text.split(/\s+/).length;
    timer = setTimeout(() => {
      if (!historyOn || !playing) return;
      if (stageIndex >= history.length - 1) return stop();
      applyStage(stageIndex + 1);
      play();
    }, Math.min(11000, 2800 + words * 60));
  }
  function enterHistory() {
    prepareHistory();
    historyOn = true;
    select(null, false);
    if (exploded) { setExploded(false); explodeBtn.setAttribute("aria-pressed", "false"); }
    explodeBtn.disabled = true;
    useHistoryMaps(true);
    ghost.visible = true;
    if (!panel.firstChild) buildPanel();
    panel.hidden = false;
    card.hidden = true;
    applyStage(0);
    // Jump straight to the first stage, then play forward from there.
    slabs.forEach((m) => {
      const n = m.userData.now, g = m.userData.goal;
      n.grow = g.grow;
      n.mix = g.mix;
      drawMix(m, n.mix);
      place(m);
    });
    historyBtn.textContent = "Back to today";
    historyBtn.setAttribute("aria-pressed", "true");
    panel.querySelector("[data-title]").focus({ preventScroll: true });
    if (reduceMotion.matches) showStage(); else play();
  }
  function exitHistory() {
    stop();
    historyOn = false;
    slabs.forEach((m) => {
      const n = m.userData.now, g = m.userData.goal;
      n.grow = g.grow = 1;
      n.mix = g.mix = 1;
      place(m);
    });
    useHistoryMaps(false);
    ghost.visible = false;
    panel.hidden = true;
    card.hidden = false;
    explodeBtn.disabled = false;
    historyBtn.textContent = "Play its history";
    historyBtn.setAttribute("aria-pressed", "false");
    dirty = true;
  }

  /* animation */
  const settle = (now, goal, k) => (Math.abs(goal - now) < 0.01 ? goal : now + (goal - now) * k);
  function step(dt) {
    const k = reduceMotion.matches ? 1 : 1 - Math.exp(-dt * 9);
    const kGrow = reduceMotion.matches ? 1 : 1 - Math.exp(-dt * 2.6);
    const kMix = reduceMotion.matches ? 1 : 1 - Math.exp(-dt * 1.8);
    let busy = false;
    slabs.forEach((m) => {
      const u = m.userData, n = u.now, g = u.goal;
      if (n.lift === g.lift && n.off === g.off && n.dim === g.dim && n.grow === g.grow && n.mix === g.mix) return;
      n.lift = settle(n.lift, g.lift, k);
      n.off = settle(n.off, g.off, k);
      n.dim = settle(n.dim, g.dim, k);
      n.grow = settle(n.grow, g.grow, kGrow);
      if (n.mix !== g.mix) {
        n.mix = settle(n.mix, g.mix, kMix);
        // Repainting is the costly part, so only when the blend has visibly moved.
        if (u.mix && (Math.abs(n.mix - u.mix.drawn) > 0.08 || n.mix === g.mix)) drawMix(m, n.mix);
      }
      place(m);
      m.material.forEach((mat) => { mat.color.copy(mat.userData.base).multiplyScalar(n.dim); });
      busy = true;
    });
    const low = slabs[slabs.length - 1];
    plinth.position.y = -D / 2 - 1.25 + low.userData.now.off;
    if (dolly !== null) {
      const dir = camera.position.clone().sub(controls.target);
      const d = dir.length(), next = settle(d, dolly, k);
      camera.position.copy(controls.target).add(dir.setLength(next));
      if (next === dolly) dolly = null;
      busy = true;
    }
    return busy;
  }

  let visible = true, running = false, last = performance.now();
  function frame(now) {
    const dt = Math.min(0.1, (now - last) / 1000);
    last = now;
    const moved = step(dt);
    const changed = controls.update();
    if (moved || changed || dirty) {
      renderer.render(scene, camera);
      dirty = false;
    }
    if (visible) requestAnimationFrame(frame); else running = false;
  }
  function run() {
    if (running) return;
    running = true;
    last = performance.now();
    requestAnimationFrame(frame);
  }
  new IntersectionObserver((e) => { visible = e[0].isIntersecting; if (visible) run(); }).observe(stage);
  new ResizeObserver(resize).observe(stage);

  /* picking with the pointer: a tap selects, a drag only turns */
  const ray = new THREE.Raycaster(), pointer = new THREE.Vector2();
  function hit(e) {
    const box = canvas.getBoundingClientRect();
    pointer.set(((e.clientX - box.left) / box.width) * 2 - 1, -((e.clientY - box.top) / box.height) * 2 + 1);
    ray.setFromCamera(pointer, camera);
    const found = ray.intersectObjects(slabs, false)[0];
    return found ? found.object.userData.name : null;
  }
  let down = null;
  canvas.addEventListener("pointerdown", (e) => { if (e.isPrimary) down = { x: e.clientX, y: e.clientY, t: e.timeStamp }; });
  canvas.addEventListener("pointerup", (e) => {
    if (!e.isPrimary || !down) return;
    const tap = Math.hypot(e.clientX - down.x, e.clientY - down.y) < 6 && e.timeStamp - down.t < 600;
    down = null;
    if (!tap || historyOn) return;
    const name = hit(e);
    select(name && name === selected ? null : name, false);
  });
  canvas.addEventListener("pointermove", (e) => {
    if (e.pointerType === "mouse" && !e.buttons) canvas.style.cursor = hit(e) ? "pointer" : "grab";
  });
  document.addEventListener("soil:pick", (e) => { if (!historyOn) select(e.detail, true); });

  /* buttons */
  const explodeBtn = section.querySelector("[data-explode]");
  let historyBtn = null;
  if (history.length && panel) {
    historyBtn = document.createElement("button");
    historyBtn.type = "button";
    historyBtn.className = "history-btn";
    historyBtn.textContent = "Play its history";
    historyBtn.setAttribute("aria-pressed", "false");
    historyBtn.addEventListener("click", () => (historyOn ? exitHistory() : enterHistory()));
    section.querySelector(".bar").prepend(historyBtn);
    const edit = document.createElement("a");
    edit.className = "edit-timeline";
    edit.href = section.dataset.editor;
    edit.textContent = "Edit this timeline";
    historyBtn.after(edit);
  }
  const spinBtn = section.querySelector("[data-spin]");
  explodeBtn.addEventListener("click", () => {
    setExploded(!exploded);
    explodeBtn.setAttribute("aria-pressed", String(exploded));
  });
  function syncMotion() {
    spinBtn.hidden = reduceMotion.matches;
    controls.enableDamping = !reduceMotion.matches;
    if (reduceMotion.matches) {
      controls.autoRotate = false;
      spinBtn.setAttribute("aria-pressed", "false");
    }
  }
  spinBtn.addEventListener("click", () => {
    controls.autoRotate = !controls.autoRotate;
    spinBtn.setAttribute("aria-pressed", String(controls.autoRotate));
    dirty = true;
  });
  reduceMotion.addEventListener("change", syncMotion);
  syncMotion();
  section.querySelector("[data-reset]").addEventListener("click", () => { dolly = null; resetView(); });

  resize();
  resetView();
  select(pending.name, true);
  section.classList.add("is-ready");
  run();
  // Paint the history's raw-material textures while the browser is idle, so the button responds at once.
  if (historyBtn) (window.requestIdleCallback || ((f) => setTimeout(f, 1500)))(() => prepareHistory());
}

/* ---------- start ---------- */
pageReady().then(async (page) => {
  const soil = page.soil;
  // Wait for js/theme.js, so the model picks up the group's colours (but never for long).
  if (!window.siteTheme) await new Promise((done) => { document.addEventListener("site:theme", done, { once: true }); setTimeout(done, 1500); });
  if (!soil.horizons.length || !webglWorks()) return;

  // Remember a horizon picked in the table or column before the model is ready.
  const pending = { name: null };
  const early = (e) => { pending.name = e.detail; };
  document.addEventListener("soil:pick", early);

  // The optional osd.txt next to soil.txt: the series description, pasted in.
  const folder = document.querySelector("[data-person]").dataset.person;
  const osdText = await fetch("content/" + folder + "/osd.txt", { cache: "no-cache" })
    .then((r) => (r.ok ? r.text() : ""))
    .catch(() => "");
  const osd = parseOSD(osdText);
  // The optional history.txt: the stages played by "Play its history".
  // ?draft=history previews an unsaved timeline from the timeline editor (history-editor.html).
  let draft = null;
  if (new URLSearchParams(location.search).get("draft") === "history") {
    try { draft = localStorage.getItem("history-draft:" + folder); } catch (e) { /* storage unavailable */ }
  }
  const historyText = draft !== null ? draft : await fetch("content/" + folder + "/history.txt", { cache: "no-cache" })
    .then((r) => (r.ok ? r.text() : ""))
    .catch(() => "");
  const history = parseHistory(historyText);
  const table = readTable();
  const section = buildSection(soil, table, soil.horizons.some((hz) => osdFor(osd, hz.name)), history);
  const editorLink = "history-editor.html?member=" + encodeURIComponent(folder);
  if (!history.length) {
    // No timeline yet: point the group to the editor, so they know "Play its history" exists.
    const todo = document.createElement("div");
    todo.className = "todo";
    todo.innerHTML = '<p><strong>Still to do.</strong> Make this soil\'s timeline for \u201cPlay its history\u201d, ' +
      'which rebuilds the soil stage by stage on the model. Use the <a href="' + editorLink + '">Timeline editor</a>; ' +
      "no code needed. (Optional.)</p>";
    section.querySelector("h2").after(todo);
  }
  section.dataset.editor = editorLink;
  fillCard(section.querySelector("[data-card]"), soil, table, osd, null);
  if (draft !== null) {
    const note = document.createElement("div");
    note.className = "todo";
    note.innerHTML = "<p><strong>Previewing your draft.</strong> This is the unsaved timeline from the timeline editor. " +
      "It isn't on your site until you paste it into your <code>history.txt</code>. Press \u201cPlay its history\u201d to watch it.</p>";
    section.querySelector("h2").after(note);
  }

  // Fetch Three.js only when the model is about to scroll into view.
  const watch = new IntersectionObserver((entries) => {
    if (!entries[0].isIntersecting) return;
    watch.disconnect();
    buildModel(section, soil, table, osd, history, page, pending)
      .catch((err) => {
        console.warn("3D soil model could not load:", err);
        section.remove();
      })
      .finally(() => document.removeEventListener("soil:pick", early));
  }, { rootMargin: "300px 0px" });
  watch.observe(section);
});

// Shared with the timeline editor (history-editor.html).
export { parseHistory };
