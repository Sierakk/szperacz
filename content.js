// OLX koduje kategorię główną ogłoszenia w jego adresie: ...-CID103-ID....html
// Ukrywamy karty, których link zawiera CID z listy wybranej w popupie.
// Reguła CSS działa też na kartach doładowanych przy nawigacji w SPA.
//
// OLX przechodzi między podstronami bez przeładowania, więc skrypt jest wstrzykiwany
// na całym olx.pl (inaczej nie byłoby go po wejściu na „Oddam za darmo” z innej strony),
// a filtr włącza się tylko, gdy aktualny adres to /oddam-za-darmo/.

const STYLE_ID = "szperacz-style";
const FREE_PATH = /^\/oddam-za-darmo(\/|$)/;
// Domyślnie wszystkie kategorie widoczne, a etykiety „Wyróżnione” ukryte.
const DEFAULTS = { enabled: true, hidden: [], hideBadges: true };

let settings = DEFAULTS;

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

function apply(state) {
  let style = document.getElementById(STYLE_ID);
  if (!style) {
    style = document.createElement("style");
    style.id = STYLE_ID;
    (document.head || document.documentElement).append(style);
  }
  style.textContent = buildCss(state);
}

function refresh() {
  const onFreePage = FREE_PATH.test(location.pathname);
  apply({ ...settings, enabled: settings.enabled && onFreePage });
}

const load = () =>
  chrome.storage.sync.get(DEFAULTS).then((saved) => {
    settings = saved;
    refresh();
  });

load();
chrome.storage.onChanged.addListener((_changes, area) => {
  if (area === "sync") load();
});

// Zmiana podstrony w SPA (pushState/replaceState/wstecz).
if (window.navigation) {
  window.navigation.addEventListener("currententrychange", refresh);
} else {
  setInterval(refresh, 500);
}
