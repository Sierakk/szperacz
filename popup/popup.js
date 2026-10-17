// CID = ID kategorii głównej widoczne w adresach ogłoszeń OLX (-CID103-).
// Lista zawiera kategorie zaobserwowane w „Oddam za darmo”; kolejne dopisuj tutaj.
const CATEGORIES = [
  { id: 103, name: "Zwierzęta" },
  { id: 628, name: "Dom i Ogród" },
  { id: 88, name: "Dla Dzieci" },
  { id: 87, name: "Moda" },
  { id: 99, name: "Elektronika" },
  { id: 767, name: "Sport i Hobby" },
  { id: 751, name: "Książki i Muzyka" },
  { id: 3647, name: "Zdrowie i Uroda" },
  { id: 5216, name: "Budowa i Remont" },
  { id: 757, name: "Rolnictwo" },
  { id: 4042, name: "Antyki i Kolekcje" },
];

// W storage trzymamy listę UKRYTYCH kategorii; checkbox w popupie oznacza „pokaż”.
const DEFAULTS = { enabled: true, hidden: [], hideBadges: true };

const list = document.getElementById("categories");
const enabledInput = document.getElementById("enabled");
const badgesInput = document.getElementById("hideBadges");

let state = { ...DEFAULTS };

function render() {
  document.body.classList.toggle("off", !state.enabled);
  enabledInput.checked = state.enabled;
  badgesInput.checked = state.hideBadges;
  list.replaceChildren(
    ...CATEGORIES.map(({ id, name }) => {
      const input = document.createElement("input");
      input.type = "checkbox";
      input.checked = !state.hidden.includes(id);
      input.addEventListener("change", () => {
        const next = new Set(state.hidden);
        input.checked ? next.delete(id) : next.add(id);
        save({ hidden: [...next] });
      });

      const label = document.createElement("label");
      label.append(input, name);

      const li = document.createElement("li");
      li.append(label);
      return li;
    })
  );
}

function save(patch) {
  state = { ...state, ...patch };
  chrome.storage.sync.set(patch);
  render();
}

enabledInput.addEventListener("change", () => save({ enabled: enabledInput.checked }));
badgesInput.addEventListener("change", () => save({ hideBadges: badgesInput.checked }));
document.getElementById("all").addEventListener("click", () => save({ hidden: [] }));
document.getElementById("none").addEventListener("click", () =>
  save({ hidden: CATEGORIES.map((c) => c.id) })
);

chrome.storage.sync.get(DEFAULTS).then((saved) => {
  state = saved;
  render();
});
