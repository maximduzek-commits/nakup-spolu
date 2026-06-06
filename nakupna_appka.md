# Nákupní seznam – CLAUDE.md

## Přehled projektu

Mobilní webová aplikace pro sdílený nákupní seznam pro dvě osoby (Max + manželka). Real-time synchronizace, chytré návrhy, kategorizace podle sekcí českých obchodů.

---

## Tech stack (Claude Code rozhodne, ale vodítka níže)

### Frontend
- **React** (Vite) – komponentová architektura, rychlý vývoj
- **CSS Modules nebo Tailwind** – mobile-first, čisté styly
- **PWA-ready** (service worker pro offline fallback), ale deployment jako webová stránka

### Backend / Real-time sync
- **Firebase Firestore** (free Spark plán – dostatečný pro 2 uživatele, real-time listenery)
- **Firebase Authentication** – jednoduché email/heslo přihlášení pro 2 účty
- Alternativa pokud Firebase nevyhovuje: **Supabase free tier** (PostgreSQL + real-time)

### Deployment
- **Vercel** nebo **Netlify** – free, automatický deploy z Githubu

---

## Architektura dat (Firestore)

```
/household/{householdId}
  /currentList           – aktivní nákupní seznam (items: [{id, name, category, checked, addedAt}])
  /masterItems           – hlavní seznam všech položek (id, name, category, lastPurchased, purchaseCount)
  /history/{listId}      – archiv dokončených nákupů (max 5, timestamp, items[])
```

---

## Hlavní funkcionality

### 1. Hlavní seznam položek (Master List)
- Zobrazuje **všechny položky** (předvyplněno ze seedovacích dat níže)
- **Vyhledávání** v reálném čase (filtruje při psaní)
- Kliknutím na položku → přidá/odebere z aktuálního nákupního seznamu
- Kategorie viditelné jako skupiny / vizuální oddělení
- Dá se **přidat nová vlastní položka** – uloží se do master listu natrvalo

### 2. Aktuální nákupní seznam (Shopping View)
- Jednoduchý **checklist** – kliknutím zaškrtnutí = koupeno
- Zůstává viditelné i po zaškrtnutí (přeškrtnuté, šedé) dokud se seznam neuzavře
- Možnost **odebrat položku** ze seznamu swipem nebo ikonkou
- Tlačítko "Dokončit nákup" → uloží do historie, vymaže aktuální seznam
- Zobrazení počtu zbývajících položek

### 3. Chytré návrhy (Suggestions Slider)
- Na konci aktuálního nákupního seznamu: **horizontálně scrollovatelný slider** s návrhy
- Logika návrhů:
  - Položky z master listu, které **nebyly přidány v posledních 2+ týdnech** (na základě `lastPurchased`)
  - Položky, které se historicky **kupují pravidelně** (purchaseCount > 3) ale v tomto nákupu chybí
  - Seřazeno podle "jak moc chybí" (delší absence = vyšší priorita)
- Kliknutím na návrh → okamžitě přidá do aktuálního seznamu

### 4. Historie nákupů
- Posledních 5 dokončených nákupů
- Zobrazení co bylo koupeno, datum
- Možnost "znovu přidat vše" z konkrétního nákupu do aktuálního seznamu

### 5. Real-time sync
- Oba uživatelé vidí změny okamžitě (Firestore real-time listeners)
- Optimistické UI update (položka se přidá lokálně ihned, pak sync s backendem)
- Indikátor online/offline stavu

---

## Kategorie (podle sekcí v českých obchodech)

Používej tyto kategorie konzistentně v celé aplikaci:

| Kategorie | Emoji | Příklady |
|-----------|-------|---------|
| Pečivo | 🍞 | pečivo, tortily, droždí |
| Ovoce a zelenina | 🥦 | banány, špenát, rajčata, mrkev, paprika, avokádo, brambory, batát, brokolice, salát, okurka, cibule, citron, dýně, kukuřice, maliny, jahody, čučoriedky |
| Maso a ryby | 🥩 | kuřecí prsa, vepřová kotleta, krkovička, losos, tuňák, hovězí, bio krůtí prsa |
| Mléčné výrobky a vejce | 🧀 | mléko, jogurty, tvaroh, vajíčka, sýr, mozzarella, cottage, hermelín, ostiepok, cheddar, haloumi, žervé, tvarůžky |
| Trvanlivé potraviny | 🥫 | rýže, mouka, olej, těstoviny, bulgur, cizrna, kešu, orechy, müsli, ořechové máslo, nudle, kečup, kyselé okurky, nutella, sůl, kmín |
| Nápoje | 🧃 | minerálky, kojenecká voda, káva, gingershot |
| Dětské potřeby | 👶 | dětské kapsičky, dětské krupky, Pampers 3, kojenecká voda |
| Drogerie a domácnost | 🧴 | prací gel |

---

## Seed data – Master List (předvyplněné položky)

Vlož při prvním spuštění / inicializaci Firebase. Odstraněny duplikáty, normalizovaná čeština.

```json
[
  { "name": "Pečivo", "category": "Pečivo" },
  { "name": "Tortily", "category": "Pečivo" },
  { "name": "Čerstvé droždí", "category": "Pečivo" },
  { "name": "Banány", "category": "Ovoce a zelenina" },
  { "name": "Citróny", "category": "Ovoce a zelenina" },
  { "name": "Rajčata", "category": "Ovoce a zelenina" },
  { "name": "Špenát", "category": "Ovoce a zelenina" },
  { "name": "Mrkev", "category": "Ovoce a zelenina" },
  { "name": "Papriky", "category": "Ovoce a zelenina" },
  { "name": "Avokádo", "category": "Ovoce a zelenina" },
  { "name": "Salát", "category": "Ovoce a zelenina" },
  { "name": "Okurka", "category": "Ovoce a zelenina" },
  { "name": "Jarní cibulka", "category": "Ovoce a zelenina" },
  { "name": "Brokolice", "category": "Ovoce a zelenina" },
  { "name": "Kukuřice", "category": "Ovoce a zelenina" },
  { "name": "Dýně Hokkaido", "category": "Ovoce a zelenina" },
  { "name": "Brambory", "category": "Ovoce a zelenina" },
  { "name": "Batát", "category": "Ovoce a zelenina" },
  { "name": "Maliny", "category": "Ovoce a zelenina" },
  { "name": "Jahody", "category": "Ovoce a zelenina" },
  { "name": "Čučoriedky", "category": "Ovoce a zelenina" },
  { "name": "Bio kuřecí prsa", "category": "Maso a ryby" },
  { "name": "Bio kuřecí stehna", "category": "Maso a ryby" },
  { "name": "Bio krůtí prsa", "category": "Maso a ryby" },
  { "name": "Vepřová kotleta", "category": "Maso a ryby" },
  { "name": "Krkovička bez kosti", "category": "Maso a ryby" },
  { "name": "Trhané vepřové", "category": "Maso a ryby" },
  { "name": "Hovězí maso", "category": "Maso a ryby" },
  { "name": "Šunka", "category": "Maso a ryby" },
  { "name": "Losos", "category": "Maso a ryby" },
  { "name": "Tuňák ve vlastní šťávě", "category": "Maso a ryby" },
  { "name": "Mléko", "category": "Mléčné výrobky a vejce" },
  { "name": "Vajíčka", "category": "Mléčné výrobky a vejce" },
  { "name": "Jogurty", "category": "Mléčné výrobky a vejce" },
  { "name": "Bio jogurt bílý", "category": "Mléčné výrobky a vejce" },
  { "name": "Tvaroh", "category": "Mléčné výrobky a vejce" },
  { "name": "Cottage", "category": "Mléčné výrobky a vejce" },
  { "name": "Mozzarella", "category": "Mléčné výrobky a vejce" },
  { "name": "Haloumi", "category": "Mléčné výrobky a vejce" },
  { "name": "Cheddar", "category": "Mléčné výrobky a vejce" },
  { "name": "Hermelín", "category": "Mléčné výrobky a vejce" },
  { "name": "Ostiepok", "category": "Mléčné výrobky a vejce" },
  { "name": "Žervé", "category": "Mléčné výrobky a vejce" },
  { "name": "Tvarůžky", "category": "Mléčné výrobky a vejce" },
  { "name": "Parmezán", "category": "Mléčné výrobky a vejce" },
  { "name": "Ovesné vločky jemné", "category": "Trvanlivé potraviny" },
  { "name": "Rýže", "category": "Trvanlivé potraviny" },
  { "name": "Bulgur", "category": "Trvanlivé potraviny" },
  { "name": "Hladká mouka", "category": "Trvanlivé potraviny" },
  { "name": "Mouka pšeničná chlebová T650", "category": "Trvanlivé potraviny" },
  { "name": "Mouka žitná chlebová T930", "category": "Trvanlivé potraviny" },
  { "name": "Tatarka", "category": "Trvanlivé potraviny" },
  { "name": "Cizrna v plechovce", "category": "Trvanlivé potraviny" },
  { "name": "Kešu", "category": "Trvanlivé potraviny" },
  { "name": "Müsli", "category": "Trvanlivé potraviny" },
  { "name": "Ořechové máslo", "category": "Trvanlivé potraviny" },
  { "name": "Olej řepkový", "category": "Trvanlivé potraviny" },
  { "name": "Kečup", "category": "Trvanlivé potraviny" },
  { "name": "Kyselé okurky", "category": "Trvanlivé potraviny" },
  { "name": "Sůl", "category": "Trvanlivé potraviny" },
  { "name": "Kmín drcený", "category": "Trvanlivé potraviny" },
  { "name": "Nutella", "category": "Trvanlivé potraviny" },
  { "name": "Celestýnské nudle do polévky", "category": "Trvanlivé potraviny" },
  { "name": "Minerálky", "category": "Nápoje" },
  { "name": "Kojenecká voda", "category": "Nápoje" },
  { "name": "Káva", "category": "Nápoje" },
  { "name": "Gingershot", "category": "Nápoje" },
  { "name": "Dětské kapsičky", "category": "Dětské potřeby" },
  { "name": "Dětské krupky velké", "category": "Dětské potřeby" },
  { "name": "Pampers 3", "category": "Dětské potřeby" },
  { "name": "Prací gel", "category": "Drogerie a domácnost" }
]
```

---

## UX & Design požadavky

### Mobile-first priority
- Primárně optimalizováno pro telefon (375px+)
- Velká dotyková plocha pro checkboxy (min 44px)
- Swipe gesta pro rychlé odebrání položky ze seznamu
- Sticky header s vyhledáváním

### Navigace (bottom navigation bar)
1. **Seznam** – aktuální nákupní checklist
2. **Přidat** – výběr z master listu + vyhledávání
3. **Historie** – posledních 5 nákupů

### Vizuální design
- Čistý, přehledný, funkční – žádná zbytečná dekorace
- Kategorie odděleny vizuálně (nadpis sekce + emoji)
- Zaškrtnuté položky: přeškrtnutý text, šedá barva, posunuté na konec sekce
- Suggestions slider: horizontální scroll, kartičky s "+" ikonkou
- Indikátor sync stavu (malá ikona v rohu – online/offline/syncing)

### Výkon
- Optimistické UI updaty (nektekat na Firebase potvrzení)
- Debounce na vyhledávání (300ms)

---

## Firebase setup instrukce

1. Vytvořit projekt na console.firebase.google.com (free Spark plán)
2. Povolit Firestore Database + Authentication (Email/Password)
3. Vytvořit 2 uživatelské účty ručně v Firebase Console
4. Firebase config vložit do `.env.local`:
   ```
   VITE_FIREBASE_API_KEY=...
   VITE_FIREBASE_AUTH_DOMAIN=...
   VITE_FIREBASE_PROJECT_ID=...
   VITE_FIREBASE_APP_ID=...
   ```
5. Firestore security rules: číst/psát mohou jen přihlášení uživatelé stejné domácnosti

---

## Firestore Security Rules (základ)

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /household/{householdId}/{document=**} {
      allow read, write: if request.auth != null;
    }
  }
}
```

---

## Budoucí rozšíření (neprogramuj teď, jen drž v paměti)

- Podmíněné návrhy (sezónní, denní vzorce – "pátek → maso na víkend")
- Víc uživatelů (rodina)
- Správa receptů → automatické přidání ingrediencí do seznamu
- Per-user statistiky co kdo přidával
- Notifikace ("nezapomněli jste na jogurty?")

---

## Co Claude Code NEDĚLÁ

- Neřeší platby, žádný e-commerce
- Neposílá emaily / notifikace (v1)
- Neintegruje se s žádným externím API kromě Firebase
