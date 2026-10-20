/* ------------------------------------------------------------------
   Favorite Soils Report: the timeline editor (history-editor.html).
   Nobody needs to edit this file. It reads a member's soil.txt and
   history.txt, lets you edit the stages with forms and clickable soil
   columns, and writes the history.txt text for you to paste in.
------------------------------------------------------------------- */
import { parseHistory } from "./soil3d.js?v=5";   // keep ?v= in step with the pages' script links

const MEMBERS = ["member-1", "member-2", "member-3"];
const PAGES = { "member-1": "soil-1.html", "member-2": "soil-2.html", "member-3": "soil-3.html" };
const STATE_NAMES = ["not there yet", "laid down", "starts forming", "finished"];
const HEADER =
  'The stages of how this soil formed, played by "Play its history" on its 3D model. ' +
  "Made with the timeline editor (history-editor.html); you can also edit this text directly. " +
  "Each stage starts with Stage:. Deposit lists horizons laid down, Develop those that start to form, Finish those that reach how they look today.";

const $ = (sel, root = document) => root.querySelector(sel);
const load = (path) => fetch(path, { cache: "no-cache" }).then((r) => (r.ok ? r.text() : "")).catch(() => "");
const store = {
  get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
  set(k, v) { try { localStorage.setItem(k, v); } catch (e) { /* storage unavailable */ } },
  drop(k) { try { localStorage.removeItem(k); } catch (e) { /* storage unavailable */ } }
};

let member = null, soil = null, stages = [];   // stages: [{ title, when, age, text, source, states: {horizon: 0-3} }]

/* ---------- file text <-> stages with per-horizon states ---------- */
// In history.txt each stage lists events; here each stage holds where every horizon stands.
function toStates(parsed, names) {
  const match = (n) => names.find((h) => h.toLowerCase() === n.toLowerCase()) ||
    (names.filter((h) => h.toLowerCase().replace(/\d+$/, "") === n.toLowerCase().replace(/\d+$/, "")).length === 1
      ? names.find((h) => h.toLowerCase().replace(/\d+$/, "") === n.toLowerCase().replace(/\d+$/, "")) : null);
  const list = (arr) => (arr.some((n) => n.toLowerCase() === "all") ? names : arr.map(match).filter(Boolean));
  const laid = new Set(parsed.flatMap((st) => list(st.deposit)));
  const now = {};
  names.forEach((h) => { now[h] = laid.has(h) ? 0 : 1; });   // never "laid down" means there from the start
  return parsed.map((st) => {
    list(st.deposit).forEach((h) => { now[h] = Math.max(now[h], 1); });
    list(st.develop).forEach((h) => { now[h] = Math.max(now[h], 2); });
    list(st.finish).forEach((h) => { now[h] = 3; });
    return { title: st.title, when: st.when, age: st.age ? String(st.age) : "", text: st.text, source: st.source, states: { ...now } };
  });
}
function toText() {
  const names = soil.horizons.map((h) => h.name);
  const before = {};
  names.forEach((h) => { before[h] = 0; });
  const out = [HEADER, ""];
  stages.forEach((st, i) => {
    const last = i === stages.length - 1;
    const deposit = [], develop = [], finish = [];
    names.forEach((h) => {
      const s = last ? 3 : st.states[h];
      if (s >= 1 && before[h] < 1) deposit.push(h);
      if (s === 2 && before[h] < 2) develop.push(h);
      if (s === 3 && before[h] < 3) finish.push(h);
      before[h] = s;
    });
    out.push("Stage: " + (st.title.trim() || "Untitled stage"));
    if (st.when.trim()) out.push("When: " + st.when.trim());
    if (String(st.age).trim()) out.push("Age: " + String(st.age).replace(/[^\d.]/g, ""));
    if (deposit.length) out.push("Deposit: " + deposit.join(", "));
    if (develop.length) out.push("Develop: " + develop.join(", "));
    if (finish.length) out.push("Finish: " + finish.join(", "));
    if (st.text.trim()) out.push("Text: " + st.text.trim().replace(/\s*\n\s*/g, " "));
    if (st.source.trim()) out.push("Source: " + st.source.trim());
    out.push("");
  });
  return out.join("\n");
}

/* ---------- choosing a soil ---------- */
async function start() {
  const picker = $("[data-picker]");
  const soils = await Promise.all(MEMBERS.map(async (m) => {
    const s = window.parseSoil(await load("content/" + m + "/soil.txt"));
    return { member: m, soil: s, label: s.series || "Soil " + m.slice(-1) };
  }));
  soils.forEach((entry) => {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "tool";
    b.textContent = entry.label;
    b.setAttribute("aria-pressed", "false");
    b.addEventListener("click", () => {
      picker.querySelectorAll("button").forEach((x) => x.setAttribute("aria-pressed", String(x === b)));
      choose(entry);
    });
    picker.appendChild(b);
  });
  const wanted = new URLSearchParams(location.search).get("member");
  const first = soils.find((e) => e.member === wanted);
  if (first) picker.querySelectorAll("button")[soils.indexOf(first)].click();
}

async function choose(entry) {
  member = entry.member;
  soil = entry.soil;
  const picked = $("[data-picked]");
  if (!soil.horizons.length) {
    picked.textContent = "This soil has no horizons yet. Fill in content/" + member + "/soil.txt first, then come back.";
    $("[data-stages-section]").hidden = $("[data-save-section]").hidden = true;
    return;
  }
  const saved = await load("content/" + member + "/history.txt");
  const draft = store.get("history-draft:" + member);
  const usingDraft = draft !== null && draft !== saved;
  const names = soil.horizons.map((h) => h.name);
  stages = toStates(parseHistory(usingDraft ? draft : saved), names);
  if (!stages.length) {
    const all = {};
    names.forEach((h) => { all[h] = 1; });
    stages = [{ title: "", when: "", age: "", text: "", source: "", states: all }];
  }
  picked.textContent = "Editing " + (soil.series || "this soil") + ": " + names.length + " horizons from content/" + member + "/soil.txt" +
    (usingDraft ? ". You have unsaved changes from before; they're loaded below." : ".");
  $("[data-draft-note]").innerHTML = "";
  if (usingDraft) {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "tool";
    b.textContent = "Throw away my unsaved changes";
    b.addEventListener("click", () => { store.drop("history-draft:" + member); choose(entry); });
    $("[data-draft-note]").append("Your changes are kept in this browser until you paste them into history.txt. ", b);
  }
  $("[data-stages-section]").hidden = $("[data-save-section]").hidden = false;
  render();
}

/* ---------- drawing the stages ---------- */
function render() {
  const list = $("[data-stages]");
  list.textContent = "";
  stages.forEach((st, i) => list.appendChild(stageCard(st, i)));
  update();
}

function field(label, value, onInput, opts = {}) {
  const wrap = document.createElement("label");
  wrap.className = "field" + (opts.wide ? " wide" : "");
  const span = document.createElement("span");
  span.textContent = label;
  const input = document.createElement(opts.area ? "textarea" : "input");
  if (!opts.area) input.type = "text";
  if (opts.area) input.rows = 3;
  if (opts.placeholder) input.placeholder = opts.placeholder;
  if (opts.inputmode) input.inputMode = opts.inputmode;
  input.value = value;
  input.addEventListener("input", () => { onInput(input.value); update(); });
  wrap.append(span, input);
  if (opts.hint) {
    const small = document.createElement("small");
    small.textContent = opts.hint;
    wrap.appendChild(small);
  }
  return wrap;
}

function stageCard(st, i) {
  const last = i === stages.length - 1;
  const li = document.createElement("li");
  li.className = "stage-card";

  const column = document.createElement("div");
  column.className = "mini-column";
  column.setAttribute("role", "group");
  column.setAttribute("aria-label", "Soil column at stage " + (i + 1));
  const depth = soil.horizons[soil.horizons.length - 1].bottom;
  soil.horizons.forEach((h) => {
    const b = document.createElement("button");
    b.type = "button";
    const s = last ? 3 : st.states[h.name];
    b.className = "mini-hz is-" + s;
    b.style.setProperty("--hz", h.color);
    b.style.flexGrow = h.bottom - h.top;
    b.textContent = h.name;
    b.title = h.name + ": " + STATE_NAMES[s] + (last ? " (the last stage is always today)" : ". Click to change.");
    b.setAttribute("aria-label", h.name + ", " + STATE_NAMES[s]);
    b.disabled = last;
    b.addEventListener("click", () => cycle(i, h.name));
    column.appendChild(b);
  });
  column.style.setProperty("--depth", depth);

  const fields = document.createElement("div");
  fields.className = "stage-fields";
  const head = document.createElement("p");
  head.className = "stage-number";
  head.textContent = "Stage " + (i + 1) + (last ? " (today)" : "");
  fields.append(
    head,
    field("Stage title", st.title, (v) => { st.title = v; }, { placeholder: "e.g. The glacier lays down till", wide: true }),
    field("When", st.when, (v) => { st.when = v; }, { placeholder: "e.g. about 17,500 years ago" }),
    field("Years ago (optional)", st.age, (v) => { st.age = v; }, { placeholder: "e.g. 17500", inputmode: "numeric" }),
    field("What happened", st.text, (v) => { st.text = v; }, { area: true, wide: true, placeholder: "One or two sentences, in your own words." }),
    field("Source", st.source, (v) => { st.source = v; }, { wide: true, placeholder: "e.g. Official Series Description", hint: "Cite it fully in Sources on your soil page." })
  );

  const tools = document.createElement("div");
  tools.className = "stage-tools";
  const btn = (label, fn, disabled) => {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "tool small";
    b.textContent = label;
    b.disabled = !!disabled;
    b.addEventListener("click", fn);
    return b;
  };
  tools.append(
    btn("Move up", () => move(i, -1), i === 0),
    btn("Move down", () => move(i, 1), last),
    btn("Add a stage after this", () => add(i + 1)),
    btn("Delete", () => remove(i), stages.length === 1)
  );
  fields.appendChild(tools);
  li.append(column, fields);
  return li;
}

/* ---------- editing ---------- */
// Clicking moves a horizon one step on; horizons only go forward in time, so stages before and after follow.
function cycle(i, name) {
  const next = (stages[i].states[name] + 1) % 4;
  stages[i].states[name] = next;
  stages.forEach((st, j) => {
    if (j > i) st.states[name] = Math.max(st.states[name], next);
    if (j < i) st.states[name] = Math.min(st.states[name], next);
  });
  render();
}
function add(at) {
  const from = stages[Math.max(0, at - 1)];
  stages.splice(at, 0, { title: "", when: "", age: "", text: "", source: "", states: { ...from.states } });
  render();
  const target = document.querySelectorAll(".stage-card")[at];
  if (target) target.querySelector("input").focus();
}
function remove(i) {
  if (!confirm("Delete stage " + (i + 1) + (stages[i].title ? ", “" + stages[i].title + "”" : "") + "?")) return;
  stages.splice(i, 1);
  render();
}
function move(i, by) {
  const j = i + by;
  [stages[i], stages[j]] = [stages[j], stages[i]];
  // Keep the horizons moving forward in time after a reorder.
  soil.horizons.forEach((h) => {
    for (let k = 1; k < stages.length; k++) stages[k].states[h.name] = Math.max(stages[k].states[h.name], stages[k - 1].states[h.name]);
  });
  render();
}

/* ---------- output ---------- */
function update() {
  const text = toText();
  $("[data-output]").value = text;
  store.set("history-draft:" + member, text);
  $("[data-path]").textContent = "content/" + member + "/history.txt";
  // On GitHub Pages, link straight to the file's edit page in the repository.
  const gh = location.hostname.match(/^([^.]+)\.github\.io$/);
  const repo = location.pathname.split("/").filter(Boolean)[0];
  const link = $("[data-github]");
  if (gh && repo && !repo.endsWith(".html")) {
    link.href = "https://github.com/" + gh[1] + "/" + repo + "/edit/main/content/" + member + "/history.txt";
    link.hidden = false;
  } else {
    link.hidden = true;
  }
  $("[data-github-help]").hidden = !link.hidden;   // spelled-out steps only when there's no direct link
}

$("[data-add]").addEventListener("click", () => add(stages.length));
$("[data-preview]").addEventListener("click", () => {
  store.set("history-draft:" + member, toText());
  window.open(PAGES[member] + "?draft=history#main", "_blank");
});
$("[data-copy]").addEventListener("click", async () => {
  const out = $("[data-output]"), msg = $("[data-copied]");
  try {
    await navigator.clipboard.writeText(out.value);
    msg.textContent = "Copied. Now paste it into history.txt on GitHub.";
  } catch (e) {
    out.closest("details").open = true;
    out.select();
    msg.textContent = "Your browser blocked copying; the text is selected below. Press Ctrl+C (or Cmd+C) to copy it.";
  }
});

start();
