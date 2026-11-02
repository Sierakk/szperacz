// Wspólne dla popupu i content.js (oba ładują ten plik jako zwykły skrypt).
//
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

// Wiadomość popup → content.js z prośbą o statystyki bieżącej karty.
const STATS_MESSAGE = "szperacz:stats";

// Suma ogłoszeń w ukrytych kategoriach; counts: { [CID]: liczba ogłoszeń na stronie }.
function sumHidden(counts, hidden) {
  return (hidden || []).reduce((n, id) => n + ((counts && counts[id]) || 0), 0);
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = { CATEGORIES, STATS_MESSAGE, sumHidden };
}
