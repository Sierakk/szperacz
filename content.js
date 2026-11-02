// OLX koduje kategorię główną ogłoszenia w jego adresie: ...-CID103-ID....html
// Ukrywamy karty, których link zawiera CID z listy wybranej w popupie.
// Reguła CSS działa też na kartach doładowanych przy nawigacji w SPA.
//
// OLX przechodzi między podstronami bez przeładowania, więc skrypt jest wstrzykiwany
// na całym olx.pl (inaczej nie byłoby go po wejściu na „Oddam za darmo” z innej strony),
// a filtr włącza się tylko, gdy aktualny adres zaczyna się od /oddam-za-darmo/
// (co obejmuje też realne warianty OLX: /oddam-za-darmo/warszawa/, /oddam-za-darmo/q-meble/).

const STYLE_ID = "szperacz-style";
const COUNTER_ID = "szperacz-counter";
const FREE_PATH = /^\/oddam-za-darmo(\/|$)/;
// Domyślnie wszystkie kategorie widoczne, a etykiety „Wyróżnione” ukryte.
const DEFAULTS = { enabled: true, hidden: [], hideBadges: true, showCounter: true };

// Licznik żyje w Shadow DOM, żeby style OLX go nie ruszały (a jego style nie ruszały OLX).
const COUNTER_HOST_STYLE =
  "all:initial;position:fixed;right:12px;bottom:12px;z-index:2147483647;";
const COUNTER_CSS = `
[hidden] { display: none !important; }
* { box-sizing: border-box; }
.card {
  width: max-content; overflow: hidden; border-radius: 8px;
  background: #1a212c; color: #f1f3f6;
  font: 12px/16px system-ui, -apple-system, "Segoe UI", sans-serif;
  box-shadow: 0 0 0 1px rgba(255,255,255,.08), 0 2px 8px rgba(0,0,0,.18);
}
.card.open { width: 248px; }
.panel { padding: 4px; }
ul { margin: 0; padding: 0; list-style: none; }
.row {
  position: relative; display: flex; align-items: center; gap: 8px;
  height: 28px; padding: 0 8px; border-radius: 6px; cursor: pointer;
}
.row:hover { background: #242d3b; }
.row input { position: absolute; width: 0; height: 0; margin: 0; opacity: 0; }
.box {
  flex: none; width: 16px; height: 16px; border: 1px solid #6b7890; border-radius: 4px;
  display: flex; align-items: center; justify-content: center;
}
input:checked + .box { background: #febd3d; border-color: #febd3d; }
input:checked + .box::after {
  content: ""; width: 8px; height: 4px; border: solid #283446; border-width: 0 0 2px 2px;
  transform: rotate(-45deg) translate(1px, -1px);
}
input:focus-visible + .box { outline: 2px solid #febd3d; outline-offset: 2px; }
.name { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.name.off, .count, .label { color: #aab3c1; }
.count, .label { font-variant-numeric: tabular-nums; }
.actions { display: flex; gap: 4px; margin-top: 4px; padding-top: 4px; border-top: 1px solid rgba(255,255,255,.08); }
.ghost {
  height: 24px; padding: 0 8px; border: 0; border-radius: 6px; background: transparent;
  color: #aab3c1; font: inherit; cursor: pointer;
}
.ghost:hover:not(:disabled) { background: #242d3b; color: #f1f3f6; }
.ghost:disabled { opacity: .4; cursor: default; }
.ghost:focus-visible, .toggle:focus-visible { outline: 2px solid #febd3d; outline-offset: -2px; }
.toggle {
  display: flex; align-items: center; gap: 6px; width: 100%; padding: 6px 10px;
  border: 0; background: transparent; color: inherit; font: inherit; text-align: left; cursor: pointer;
}
.open .toggle { border-top: 1px solid rgba(255,255,255,.08); }
.brand { font-weight: 600; }
.chev {
  flex: none; margin-left: auto; width: 6px; height: 6px;
  border: solid #aab3c1; border-width: 1.6px 0 0 1.6px;
  transform: rotate(45deg) translate(1px, 1px); transition: transform .15s;
}
.open .chev { transform: rotate(225deg) translate(1px, 1px); }
@media (prefers-reduced-motion: reduce) { .chev { transition: none; } }
`;
const OBSERVER_OPTS = { childList: true, subtree: true };

let settings = DEFAULTS;
let observer = null;
let refreshScheduled = false;
let counterUi = null; // powłoka licznika budowana raz, potem tylko aktualizowana
let counterOpen = false; // czy lista kategorii przy liczniku jest rozwinięta

// Etykiety „Wyróżnione” OLX rysuje w osobnej warstwie poza kartami, w pozycjach liczonych
// z numeru karty na liście. Po ukryciu kart bez ukrycia etykiet zostałyby w starych miejscach.
const BADGES_SELECTOR =
  '[data-olx-listing-item-badge-portal-root] > :not([data-testid="listing-grid"])';

const CARD_SELECTOR = '[data-cy="l-card"]';
const cardSelector = (id) => `${CARD_SELECTOR}:has(a[href*="-CID${id}-"])`;

function buildCss({ enabled, hidden, hideBadges }) {
  if (!enabled) return "";
  const ids = (hidden || []).filter((id) => Number.isInteger(id));
  const selectors = ids.map(cardSelector);
  if (hideBadges) selectors.push(BADGES_SELECTOR);
  if (selectors.length === 0) return "";
  return `${selectors.join(",\n")} { display: none !important; }`;
}

// Odmiana: 1 ogłoszenie, 2–4 ogłoszenia (poza 12–14), dalej ogłoszeń.
function plural(n, [one, few, many]) {
  if (n === 1) return one;
  const d = n % 10;
  const h = n % 100;
  if (d >= 2 && d <= 4 && (h < 12 || h > 14)) return few;
  return many;
}

// Liczba kart na stronie w każdej znanej kategorii (ukryte też się liczą: display:none
// nie usuwa ich z DOM). CATEGORIES pochodzi z categories.js.
function countByCategory() {
  const counts = {};
  for (const { id } of CATEGORIES) {
    counts[id] = document.querySelectorAll(cardSelector(id)).length;
  }
  return counts;
}

// Odpowiedź na zapytanie popupu o statystyki bieżącej karty.
function getStats() {
  if (!FREE_PATH.test(location.pathname)) return { onFreePage: false };
  return {
    onFreePage: true,
    total: document.querySelectorAll(CARD_SELECTOR).length,
    counts: countByCategory(),
  };
}

function apply(state) {
  const css = buildCss(state);
  let style = document.getElementById(STYLE_ID);
  if (!style) {
    if (!css) return;
    style = document.createElement("style");
    style.id = STYLE_ID;
    (document.head || document.documentElement).append(style);
  }
  if (style.textContent !== css) style.textContent = css;
}

function removeElement(id) {
  const el = document.getElementById(id);
  if (el) el.remove();
}

function el(tag, className, ...children) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  node.append(...children);
  return node;
}

function saveHidden(hidden) {
  settings = { ...settings, hidden };
  chrome.storage.sync.set({ hidden });
  refresh();
}

function setCounterOpen(open) {
  counterOpen = open;
  refresh();
}

function createCounter() {
  const rows = CATEGORIES.map(({ id, name }) => {
    const input = el("input");
    input.type = "checkbox";
    input.addEventListener("change", () => {
      const next = new Set(settings.hidden);
      input.checked ? next.delete(id) : next.add(id);
      saveHidden([...next]);
    });
    const nameEl = el("span", "name", name);
    const countEl = el("span", "count");
    const li = el("li", "", el("label", "row", input, el("span", "box"), nameEl, countEl));
    return { id, input, nameEl, countEl, li };
  });

  const all = el("button", "ghost", "Wszystkie");
  all.type = "button";
  all.setAttribute("aria-label", "Pokaż wszystkie kategorie");
  all.addEventListener("click", () => saveHidden([]));
  const none = el("button", "ghost", "Żadne");
  none.type = "button";
  none.setAttribute("aria-label", "Ukryj wszystkie kategorie");
  none.addEventListener("click", () => saveHidden(CATEGORIES.map((c) => c.id)));

  const panel = el(
    "div",
    "panel",
    el("ul", "", ...rows.map((r) => r.li)),
    el("div", "actions", all, none)
  );
  panel.id = "panel";

  const label = el("span", "label");
  const toggle = el("button", "toggle", el("span", "brand", "Szperacz"), label, el("span", "chev"));
  toggle.type = "button";
  toggle.setAttribute("aria-controls", "panel");
  toggle.addEventListener("click", () => setCounterOpen(!counterOpen));

  const card = el("div", "card", panel, toggle);
  card.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && counterOpen) {
      setCounterOpen(false);
      toggle.focus();
    }
  });

  const host = document.createElement("div");
  host.id = COUNTER_ID;
  host.setAttribute("style", COUNTER_HOST_STYLE);
  const style = el("style");
  style.textContent = COUNTER_CSS;
  host.attachShadow({ mode: "open" }).append(style, card);

  return { host, card, panel, toggle, label, rows, all, none };
}

function removeCounter() {
  if (counterUi) counterUi.host.remove();
  counterUi = null;
  removeElement(COUNTER_ID);
}

function updateCounter(hidden) {
  const counts = countByCategory();
  const n = sumHidden(counts, hidden);
  if (!counterUi) counterUi = createCounter();
  const ui = counterUi;
  if (!ui.host.isConnected) (document.body || document.documentElement).append(ui.host);

  const hiddenIds = new Set(hidden);
  // Gdy nic nie jest ukryte, zostaje sama nazwa ze strzałką (dostęp do listy kategorii).
  ui.label.hidden = n === 0;
  ui.label.textContent = `ukryto ${n} ${plural(n, ["ogłoszenie", "ogłoszenia", "ogłoszeń"])}`;
  for (const row of ui.rows) {
    const visible = !hiddenIds.has(row.id);
    row.input.checked = visible;
    row.nameEl.classList.toggle("off", !visible);
    row.countEl.textContent = counts[row.id];
  }
  const visibleCount = CATEGORIES.filter((c) => !hiddenIds.has(c.id)).length;
  ui.all.disabled = visibleCount === CATEGORIES.length;
  ui.none.disabled = visibleCount === 0;
  ui.card.classList.toggle("open", counterOpen);
  ui.panel.hidden = !counterOpen;
  ui.toggle.setAttribute("aria-expanded", String(counterOpen));
}

function refresh() {
  const onFreePage = FREE_PATH.test(location.pathname);
  // Poza stroną „Oddam za darmo” lub przy wyłączonym filtrze nie ruszamy DOM strony.
  if (!settings.enabled || !onFreePage) {
    if (observer) observer.disconnect();
    removeElement(STYLE_ID);
    removeCounter();
    counterOpen = false;
    if (observer) observer.observe(document.documentElement, OBSERVER_OPTS);
    return;
  }
  const state = { ...settings, enabled: true };
  // Własne zmiany DOM (style, licznik) wykonujemy przy odłączonym obserwatorze.
  if (observer) observer.disconnect();
  apply(state);
  if (state.showCounter) updateCounter(state.hidden);
  else removeCounter();
  if (observer) observer.observe(document.documentElement, OBSERVER_OPTS);
}

function scheduleRefresh() {
  if (refreshScheduled) return;
  refreshScheduled = true;
  requestAnimationFrame(() => {
    refreshScheduled = false;
    refresh();
  });
}

const load = () =>
  chrome.storage.sync.get(DEFAULTS).then((saved) => {
    settings = saved;
    refresh();
  });

if (typeof chrome !== "undefined" && chrome.storage) {
  load();
  chrome.storage.onChanged.addListener((_changes, area) => {
    if (area === "sync") load();
  });
  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (message && message.type === STATS_MESSAGE) sendResponse(getStats());
  });
}

if (typeof window !== "undefined" && typeof document !== "undefined") {
  // Zmiana podstrony w SPA (pushState/replaceState/wstecz).
  if (window.navigation) {
    window.navigation.addEventListener("currententrychange", refresh);
  } else {
    setInterval(refresh, 500);
  }
  // Doładowanie kart przy przewijaniu też zmienia licznik ukrytych ogłoszeń.
  observer = new MutationObserver(scheduleRefresh);
  observer.observe(document.documentElement, OBSERVER_OPTS);
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = { FREE_PATH, DEFAULTS, BADGES_SELECTOR, buildCss, plural };
}
