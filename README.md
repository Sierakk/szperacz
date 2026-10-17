# Szperacz

> Szperaj tam, gdzie warto.

Rozszerzenie do Chrome, które pozwala wybrać, jakie kategorie ogłoszeń widzisz w zakładce
[OLX → Oddam za darmo](https://www.olx.pl/oddam-za-darmo/), bo OLX nie daje tam żadnych filtrów.
Domyślnie wszystkie kategorie są zaznaczone (widoczne), więc żeby ukryć np. **Zwierzęta**,
odznacz je w popupie.

## Instalacja (tryb deweloperski)

1. Otwórz `chrome://extensions`.
2. Włącz **Tryb dewelopera** (prawy górny róg).
3. Kliknij **Załaduj rozpakowane** i wskaż ten folder.
4. Kliknij ikonę rozszerzenia, odznacz „Zwierzęta” i wejdź na
   https://www.olx.pl/oddam-za-darmo/.

Po zmianie kodu kliknij w `chrome://extensions` ikonę odświeżenia przy „Szperacz”
i **raz** przeładuj już otwarte karty OLX. Chrome nie podmienia skryptu w kartach otwartych
przed odświeżeniem rozszerzenia, więc stare karty przestają reagować na popup. Nowe karty
i zmiany ustawień w popupie działają już bez przeładowania.

## Użycie

Kliknij ikonę rozszerzenia na pasku Chrome. W popupie:

- przełącznik w prawym górnym rogu włącza i wyłącza całe filtrowanie,
- **zaznaczona** kategoria jest pokazywana, **odznaczona** jest ukrywana,
- „Zaznacz wszystkie” pokazuje wszystko, „Odznacz wszystkie” ukrywa wszystkie znane kategorie,
- przełącznik „Ukryj etykiety „Wyróżnione”” (domyślnie włączony) usuwa plakietki „Wyróżnione”
  z listy, niezależnie od wybranych kategorii.

Zmiany działają od razu, bez odświeżania strony, i są zapamiętane
(`chrome.storage.sync`, więc synchronizują się między Twoimi urządzeniami z Chrome).

## Jak to działa

Każdy link do ogłoszenia na OLX zawiera ID kategorii głównej, np. `...-CID103-ID1cFG9C.html`
(`CID103` = Zwierzęta). [`content.js`](content.js) buduje z odznaczonych w popupie ID regułę CSS
`[data-cy="l-card"]:has(a[href*="-CID103-"]) { display: none }` i wstrzykuje ją na stronę.
Tą samą regułą ukrywana jest warstwa etykiet „Wyróżnione”
(`[data-olx-listing-item-badge-portal-root]`), jeśli włączony jest przełącznik w popupie.
Bez zapytań sieciowych i bez zbierania danych. OLX przechodzi między stronami wyników bez
przeładowania, a wstrzyknięty CSS działa od razu na nowych kartach.

Z tego samego powodu skrypt jest wstrzykiwany na całym `olx.pl`, a nie tylko na
`/oddam-za-darmo/`: gdyby tak było, po wejściu na „Oddam za darmo” z innej podstrony OLX
(bez pełnego przeładowania) skryptu by nie było i filtr nie działałby do odświeżenia karty.
Filtr włącza się tylko wtedy, gdy adres zaczyna się od `/oddam-za-darmo/`, i reaguje na
zmianę podstrony w locie.

Znane kategorie:

| CID | Kategoria | CID | Kategoria |
|---|---|---|---|
| 87 | Moda | 751 | Książki i Muzyka |
| 88 | Dla Dzieci | 757 | Rolnictwo |
| 99 | Elektronika | 767 | Sport i Hobby |
| 103 | Zwierzęta | 3647 | Zdrowie i Uroda |
| 628 | Dom i Ogród | 4042 | Antyki i Kolekcje |
| | | 5216 | Budowa i Remont |

Kolejną kategorię dopiszesz w `CATEGORIES` w [`popup/popup.js`](popup/popup.js)
(ID znajdziesz w adresie ogłoszenia, `-CID<liczba>-`).

## Struktura projektu

```
manifest.json          konfiguracja rozszerzenia (Manifest V3)
content.js             ukrywa karty na stronie OLX
popup/                 popup z wyborem kategorii (HTML, CSS, JS)
icons/szperacz.svg     logo (źródło)
icons/szperacz-16.svg  uproszczona wersja logo pod 16 px
icons/icon*.png        ikony 16/48/128 wyrenderowane z SVG
```

## Identyfikacja wizualna

Logo: gruba lupa z iskrą w szkle, czyli „perełka” znaleziona wśród ogłoszeń.
Na 16 px używana jest wersja uproszczona (kropka zamiast iskry), bo iskra by się rozmyła.

| Rola | Kolor | Hex |
|---|---|---|
| Tło / tekst | Atrament | `#283446` |
| Główny | Bursztyn | `#FEBD3D` |
| Jasny | Krem | `#FEF2CE` |

Ikony PNG odświeżysz z SVG komendą `rsvg-convert -w 128 -h 128 icons/szperacz.svg -o icons/icon128.png`
(analogicznie 48 px z `szperacz.svg` i 16 px z `szperacz-16.svg`).

## Znane ograniczenia

- Filtruje tylko kategorie główne. Ukrycie „Zwierząt” usuwa też akcesoria (np. „Buda dla psa”)
  i rośliny akwariowe. Na stronach 1–2 sprawdzonych ręcznie 80 z 80 ukrytych to psy i koty.
- Strona dalej ładuje 52 ogłoszenia na stronę, więc po ukryciu zostaje ich mniej.
- Etykiety „Wyróżnione” można tylko ukryć wszystkie naraz (przełącznik w popupie). OLX rysuje
  je w osobnej warstwie, w pozycjach liczonych z numeru karty na liście, więc po ukryciu kart
  przy wyłączonym przełączniku zostają w pustych miejscach, a powiązać ich z konkretną kartą
  się nie da. Dlatego przełącznik jest domyślnie włączony.
- Działa tylko na adresach zaczynających się od `/oddam-za-darmo/`. Warianty z miastem lub
  frazą wyszukiwania (np. `/warszawa/oddam-za-darmo/`) trzeba dopisać w `FREE_PATH`
  w `content.js` i przetestować.
- Lista kategorii w popupie obejmuje te zaobserwowane w „Oddam za darmo”; nie ma tam
  np. Motoryzacji, bo takie ogłoszenia się nie pojawiły.
- Jeśli OLX zmieni atrybut `data-cy="l-card"` albo format adresu, filtr przestanie działać.
- Nazwa i logo nie zostały sprawdzone pod kątem dostępności w Chrome Web Store ani znaku
  towarowego.
