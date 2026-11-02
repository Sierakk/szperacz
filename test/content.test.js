const test = require("node:test");
const assert = require("node:assert/strict");

const { FREE_PATH, DEFAULTS, BADGES_SELECTOR, buildCss, plural } = require("../content.js");

test("FREE_PATH: /oddam-za-darmo/ i realne warianty OLX (miasto/fraza po kategorii)", () => {
  assert.ok(FREE_PATH.test("/oddam-za-darmo/"));
  assert.ok(FREE_PATH.test("/oddam-za-darmo"));
  assert.ok(FREE_PATH.test("/oddam-za-darmo/warszawa/"));
  assert.ok(FREE_PATH.test("/oddam-za-darmo/q-meble/"));
  assert.ok(FREE_PATH.test("/oddam-za-darmo/mazowieckie/"));
});

test("FREE_PATH: pozostałe adresy OLX nie pasują", () => {
  assert.ok(!FREE_PATH.test("/"));
  assert.ok(!FREE_PATH.test("/oferty/"));
  assert.ok(!FREE_PATH.test("/warszawa/oddam-za-darmo/")); // na żywym OLX 404
  assert.ok(!FREE_PATH.test("/oddam-za-darmo2/"));
  assert.ok(!FREE_PATH.test("/oddam/za-darmo/"));
});

test("buildCss: wyłączone filtrowanie zwraca pusty CSS", () => {
  assert.equal(buildCss({ enabled: false, hidden: [103], hideBadges: true }), "");
});

test("buildCss: selektory CID plus etykiety Wyróżnione", () => {
  const css = buildCss({ enabled: true, hidden: [103, 88], hideBadges: true });
  assert.ok(css.includes('[data-cy="l-card"]:has(a[href*="-CID103-"])'));
  assert.ok(css.includes('[data-cy="l-card"]:has(a[href*="-CID88-"])'));
  assert.ok(css.includes(BADGES_SELECTOR));
  assert.ok(css.endsWith("{ display: none !important; }"));
});

test("buildCss: brak ukrytych kategorii i wyłączone etykiety dają pusty CSS", () => {
  assert.equal(buildCss({ enabled: true, hidden: [], hideBadges: false }), "");
});

test("buildCss: hideBadges=false nie dodaje selektora etykiet", () => {
  const css = buildCss({ enabled: true, hidden: [103], hideBadges: false });
  assert.ok(css.includes("CID103"));
  assert.ok(!css.includes(BADGES_SELECTOR));
});

test("buildCss: ignoruje ID niebędące liczbami całkowitymi", () => {
  const css = buildCss({ enabled: true, hidden: ["103", 103.5, 99], hideBadges: false });
  assert.ok(css.includes("CID99"));
  assert.ok(!css.includes("CID103"));
});

test("plural: odmiana rzeczownika „ogłoszenie”", () => {
  const forms = ["ogłoszenie", "ogłoszenia", "ogłoszeń"];
  assert.equal(plural(1, forms), "ogłoszenie");
  assert.equal(plural(2, forms), "ogłoszenia");
  assert.equal(plural(4, forms), "ogłoszenia");
  assert.equal(plural(5, forms), "ogłoszeń");
  assert.equal(plural(12, forms), "ogłoszeń");
  assert.equal(plural(22, forms), "ogłoszenia");
  assert.equal(plural(112, forms), "ogłoszeń");
});

test("DEFAULTS: licznik ukrytych ogłoszeń domyślnie włączony", () => {
  assert.equal(DEFAULTS.showCounter, true);
});
