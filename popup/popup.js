// CATEGORIES, STATS_MESSAGE i sumHidden pochodzą z ../categories.js.

// W storage trzymamy listę UKRYTYCH kategorii; checkbox w popupie oznacza „pokaż”.
const DEFAULTS = { enabled: true, hidden: [], hideBadges: true, showCounter: true };

const $ = (id) => document.getElementById(id);
const list = $("categories");
const enabledInput = $("enabled");
const badgesInput = $("hideBadges");
const counterInput = $("showCounter");
const summary = $("summary");

let state = { ...DEFAULTS };
// Statystyki bieżącej karty: null = jeszcze nie wiadomo, { onFreePage: false } = nie jesteśmy
// w „Oddam za darmo”, inaczej { onFreePage: true, total, counts }.
let stats = null;

// Wiersze budujemy raz i tylko aktualizujemy, żeby klawiatura nie traciła fokusu.
const rows = CATEGORIES.map(({ id, name }) => {
  const input = document.createElement("input");
  input.type = "checkbox";
  input.addEventListener("change", () => {
    const next = new Set(state.hidden);
    input.checked ? next.delete(id) : next.add(id);
    save({ hidden: [...next] });
  });

  const box = document.createElement("span");
  box.className = "box";
  const label = document.createElement("span");
  label.className = "name";
  label.textContent = name;

  const row = document.createElement("label");
  row.className = "row";
  row.append(input, box, label);

  const li = document.createElement("li");
  li.append(row);
  return { id, input, li };
});
list.append(...rows.map((r) => r.li));
// Nieparzysta liczba kategorii: puste pole dopełnia siatkę.
if (rows.length % 2) {
  const filler = document.createElement("li");
  filler.setAttribute("aria-hidden", "true");
  list.append(filler);
}

function renderSummary() {
  if (!stats) {
    summary.replaceChildren();
  } else if (!stats.onFreePage) {
    const link = document.createElement("a");
    link.href = "https://www.olx.pl/oddam-za-darmo/";
    link.target = "_blank";
    link.rel = "noopener";
    link.textContent = "„Oddam za darmo”";
    summary.replaceChildren("Wejdź na ", link, ", by zobaczyć efekt.");
  } else if (!stats.total) {
    summary.textContent = "Brak ogłoszeń na tej stronie";
  } else {
    const n = state.enabled ? sumHidden(stats.counts, state.hidden) : 0;
    const strong = document.createElement("strong");
    strong.textContent = n;
    summary.replaceChildren("Ukryto ", strong, ` z ${stats.total} ogłoszeń na tej stronie`);
  }
}

function render() {
  const hidden = new Set(state.hidden);
  const visible = CATEGORIES.filter((c) => !hidden.has(c.id)).length;

  enabledInput.checked = state.enabled;
  $("status").textContent = state.enabled ? "Włączony" : "Wyłączony";
  $("main").classList.toggle("off", !state.enabled);
  $("main").inert = !state.enabled;
  badgesInput.checked = state.hideBadges;
  counterInput.checked = state.showCounter;

  $("count").textContent = `${visible}/${CATEGORIES.length}`;
  $("all").disabled = visible === CATEGORIES.length;
  $("none").disabled = visible === 0;
  for (const { id, input } of rows) input.checked = !hidden.has(id);

  renderSummary();
}

function save(patch) {
  state = { ...state, ...patch };
  chrome.storage.sync.set(patch);
  render();
}

async function loadStats() {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    const reply = tab && (await chrome.tabs.sendMessage(tab.id, { type: STATS_MESSAGE }));
    stats = reply && reply.onFreePage ? reply : { onFreePage: false };
  } catch {
    // Brak content.js na tej karcie (inna strona niż olx.pl).
    stats = { onFreePage: false };
  }
  renderSummary();
}

enabledInput.addEventListener("change", () => save({ enabled: enabledInput.checked }));
badgesInput.addEventListener("change", () => save({ hideBadges: badgesInput.checked }));
counterInput.addEventListener("change", () => save({ showCounter: counterInput.checked }));
$("all").addEventListener("click", () => save({ hidden: [] }));
$("none").addEventListener("click", () => save({ hidden: CATEGORIES.map((c) => c.id) }));

chrome.storage.sync.get(DEFAULTS).then((saved) => {
  state = saved;
  render();
});
loadStats();
