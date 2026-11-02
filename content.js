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

const COUNTER_STYLE =
  "position:fixed;right:12px;bottom:12px;z-index:2147483647;" +
  "background:rgba(28,28,30,.92);color:#fff;font:12px/1.4 system-ui,sans-serif;" +
  "padding:6px 10px;border-radius:8px;pointer-events:none;";
const OBSERVER_OPTS = { childList: true, subtree: true };

let settings = DEFAULTS;
let observer = null;
let refreshScheduled = false;

// Etykiety „Wyróżnione” OLX rysuje w osobnej warstwie poza kartami, w pozycjach liczonych
// z numeru karty na liście. Po ukryciu kart bez ukrycia etykiet zostałyby w starych miejscach.
const BADGES_SELECTOR =
  '[data-olx-listing-item-badge-portal-root] > :not([data-testid="listing-grid"])';

function buildCss({ enabled, hidden, hideBadges }) {
  if (!enabled) return "";
  const ids = (hidden || []).filter((id) => Number.isInteger(id));
  const selectors = ids.map(
    (id) => `[data-cy="l-card"]:has(a[href*="-CID${id}-"])`
  );
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

function countHidden(hidden) {
  const ids = (hidden || []).filter((id) => Number.isInteger(id));
  let total = 0;
  for (const id of ids) {
    total += document.querySelectorAll(
      `[data-cy="l-card"]:has(a[href*="-CID${id}-"])`
    ).length;
  }
  return total;
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

function updateCounter(hidden) {
  let el = document.getElementById(COUNTER_ID);
  const n = countHidden(hidden);
  if (n === 0) {
    if (el) el.remove();
    return;
  }
  if (!el) {
    el = document.createElement("div");
    el.id = COUNTER_ID;
    el.setAttribute("style", COUNTER_STYLE);
    (document.body || document.documentElement).append(el);
  }
  el.textContent = `Szperacz: ukryto ${n} ${plural(n, ["ogłoszenie", "ogłoszenia", "ogłoszeń"])}`;
}

function refresh() {
  const onFreePage = FREE_PATH.test(location.pathname);
  // Poza stroną „Oddam za darmo” lub przy wyłączonym filtrze nie ruszamy DOM strony.
  if (!settings.enabled || !onFreePage) {
    if (observer) observer.disconnect();
    removeElement(STYLE_ID);
    removeElement(COUNTER_ID);
    if (observer) observer.observe(document.documentElement, OBSERVER_OPTS);
    return;
  }
  const state = { ...settings, enabled: true };
  // Własne zmiany DOM (style, licznik) wykonujemy przy odłączonym obserwatorze.
  if (observer) observer.disconnect();
  apply(state);
  if (state.showCounter) updateCounter(state.hidden);
  else removeElement(COUNTER_ID);
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
