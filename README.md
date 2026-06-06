# Nákup spolu 🛒

Sdílený nákupní seznam pro dva (Max + manželka). Real-time synchronizace přes Firebase Firestore, mobile-first PWA.

---

## Live

| | URL |
|---|---|
| **Appka** | https://nakupni-seznam.pages.dev |
| **GitHub** | https://github.com/maximduzek-commits/nakup-spolu |

---

## Tech stack

| Vrstva | Technologie |
|---|---|
| Frontend | React 19 + Vite |
| Styling | CSS (vlastní design system, Fraunces + Plus Jakarta Sans) |
| Backend / real-time | Firebase Firestore (Spark free tier) |
| Auth | ~~Firebase Auth~~ — odstraněno, nepotřebné pro 2 uživatele |
| Deployment | Cloudflare Pages |
| CI/CD | `wrangler pages deploy dist` (manuálně po buildu) |

---

## Architektura dat (Firestore)

```
/household/default/
  /meta/currentList          – aktivní seznam (items: [{id, name, category, qty, addedAt}])
  /masterItems/{id}          – hlavní katalog položek (name, category, purchaseCount, lastPurchased)
  /history/{id}              – posledních 5 dokončených nákupů (items[], completedAt)
  /savedLists/{id}           – uložené šablony (name, emoji, itemNames[])
```

---

## Struktura projektu

```
src/
  App.jsx                    – root, seed při prvním načtení
  App.css                    – celý design system
  firebase/
    config.js                – inicializace Firebase
    firestore.js             – všechny DB operace
  hooks/
    useFirestore.js          – real-time React hooks
  screens/
    NakupScreen.jsx          – checklist + suggestions slider
    PridatScreen.jsx         – master list s vyhledáváním
    SeznamyScreen.jsx        – uložené šablony seznamů
    HistorieScreen.jsx       – posledních 5 nákupů
  components/
    BottomNav.jsx
    SyncBadge.jsx
  data/
    seedData.js              – 74 položek + 4 výchozí seznamy
```

---

## Funkcionality

### Nákup
- Checklist položek seskupených podle kategorie (8 kategorií s emoji)
- Kliknutím na položku → animované zmizení (koupeno)
- Stepper ks u každé položky
- Suggestions slider — položky které se pravidelně kupují ale chybí
- Tlačítko "Dokončit nákup" → uloží do historie, vymaže seznam

### Přidat
- Prohledávatelný master list (74 položek ve 2 sloupcích)
- Kliknutím přidá/odebere z aktuálního nákupu
- Po přidání: zelený stepper ks přímo v mřížce
- Vlastní položka — přidá do master listu i do nákupu

### Seznamy
- Uložené šablony (Grilovačka, Snídaňový balíček, Dětský týden, Základní zásoby)
- Jeden klik → celý seznam přidán do nákupu
- Upravit → Smazat seznam

### Historie
- Posledních 5 dokončených nákupů
- "Znovu přidat" — celý nákup zpět do seznamu

### Real-time sync
- Firestore onSnapshot listenery — oba uživatelé vidí změny okamžitě
- SyncBadge indikátor (online / ukládám… / offline)

---

## Seed data

Při prvním načtení se automaticky do Firestore zapíší:
- **74 masterItems** (batch write)
- **4 savedLists** (Grilovačka víkend, Snídaňový balíček, Dětský týden, Základní zásoby)

Seed se spustí jen jednou (kontrola `masterItems.size > 0`).

---

## Kategorie

| Kategorie | Emoji |
|---|---|
| Pečivo | 🍞 |
| Ovoce a zelenina | 🥦 |
| Maso a ryby | 🥩 |
| Mléčné výrobky a vejce | 🧀 |
| Trvanlivé potraviny | 🥫 |
| Nápoje | 🧃 |
| Dětské potřeby | 👶 |
| Drogerie a domácnost | 🧴 |

---

## Firestore Security Rules

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /household/{householdId}/{document=**} {
      allow read, write: if true;
    }
  }
}
```

---

## Lokální vývoj

```bash
npm install
npm run dev          # http://localhost:5173
```

`.env.local` (neverzováno):
```
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=...
VITE_FIREBASE_PROJECT_ID=...
VITE_FIREBASE_APP_ID=...
```

## Deploy

```bash
npm run build
wrangler pages deploy dist --project-name nakupni-seznam --commit-dirty=true
```

---

## Cena

**$0 / měsíc** — Cloudflare Pages (free) + Firebase Spark free tier (50k reads/den, 20k writes/den — pro 2 uživatele zcela dostačující).

---

## Budoucí rozšíření (zatím neimplementováno)

- Editace uloženého seznamu (přidávání/odebírání položek)
- Vytvoření nového vlastního seznamu z UI
- Podmíněné návrhy (sezónní, víkend → maso)
- PWA service worker pro offline fallback
- Per-user statistiky
