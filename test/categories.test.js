const test = require("node:test");
const assert = require("node:assert/strict");

const { CATEGORIES, STATS_MESSAGE, sumHidden } = require("../categories.js");

test("CATEGORIES: unikalne, całkowite ID i niepuste nazwy", () => {
  const ids = CATEGORIES.map((c) => c.id);
  assert.equal(new Set(ids).size, ids.length);
  assert.ok(ids.every(Number.isInteger));
  assert.ok(CATEGORIES.every((c) => c.name.trim().length > 0));
});

test("STATS_MESSAGE: stały identyfikator wiadomości popup → content.js", () => {
  assert.equal(STATS_MESSAGE, "szperacz:stats");
});

test("sumHidden: sumuje tylko ukryte kategorie", () => {
  const counts = { 103: 14, 628: 11, 88: 6 };
  assert.equal(sumHidden(counts, [103]), 14);
  assert.equal(sumHidden(counts, [103, 88]), 20);
  assert.equal(sumHidden(counts, []), 0);
});

test("sumHidden: brak danych o kategorii lub liczników daje 0", () => {
  assert.equal(sumHidden({ 103: 5 }, [999]), 0);
  assert.equal(sumHidden(undefined, [103]), 0);
  assert.equal(sumHidden({ 103: 5 }, undefined), 0);
});
