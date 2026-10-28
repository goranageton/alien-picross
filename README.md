# Retro Picross Archaeologist - Game Boy Edition 🎮🏺

En komplett webbapplikation i autentisk grön 4-tons Game Boy-retrodesign (`#0f380f`, `#306230`, `#8bac0f`, `#9bbc0f`), hämtad direkt från Stitch-projektet **"Retro Picross Archaeologist UI"** och sammankopplad till en fullt spelbar upplevelse redo för Android-paketering med Capacitor.

---

## 🏛️ Inhämtade Skärmar från Stitch

De ursprungliga HTML/CSS-skärmarna från Stitch finns sparade i mappen `screens/`:
1. `screens/main-menu.html` – **Huvudmeny (Archaeology Picross Main Menu)**: Tempelpelare, hieroglyfer, 1995 Nintex-arkitektur, mejselpekare och knappar (`HOW TO PLAY`, `EASY PICROSS`, `PICROSS`).
2. `screens/level-select.html` – **Nivåväljare (Select A Problem)**: 8x8 rutnät (1-A till 8-H), statistik (FIRST, TIMES, BEST), pixel-pyramid och Kinoko Course-stämpel.
3. `screens/game-board.html` – **Spelplan (Archaeology Picross 10x10)**: Interaktivt nonogram med rad-/kolumnledtrådar, Mario-arkeolog, digital timer, mini-radar och Game Boy-handkontroll (D-Pad, Chisel A, Mark B).
4. `screens/gameboy-view.html` – **Game Boy-vy (Retro 8-Bit Handheld DMG 15x15)**: Klassiskt grått DMG-chassi med röd batteridiod, 15x15 nonogram-matris och sneda A/B-knappar.

---

## 🕹️ Navigationsflöde

Applikationen är en responsiv Single Page Application (`index.html`) där skärmarna är sömlöst ihopkopplade:

```
[Huvudmeny] 
     │
     ├──► Klicka "PICROSS" eller "EASY PICROSS" (eller 'A') ──► [Nivåväljare]
     │                                                               │
     │◄── Klicka "B EXIT" eller "Cancel" ────────────────────────────┤
     │                                                               │
     │                                     Klicka nivå (t.ex. 1-A) ──┼──► [Spelplan 10x10]
     │                                                               │          │
     │                                                               │◄── Klicka "PAUSE/MENU"
     │                                                                          │
     └──► Klicka "GAME BOY 15x15 VY" ─────────────────────────► [Game Boy 15x15]
```

- **Snabbväljare / Toppbalk**: Överst finns en retro-flikmeny (`1. MENY`, `2. NIVÅER`, `3. SPELPLAN`, `4. GAME BOY`) samt ljudväxlare (`🔊`) för direkt åtkomst under utveckling och testning. Flikmenyn kan döljas med `▼` för maximal mobilinlevelse.
- **Interaktivt spel**:
  - Klicka/peka direkt på spelplanens rutor (Hugg ut / Sätt kryss / Rensa).
  - Eller navigera med D-Pad och använd knapp **A** (Hugg/Gräv) och **B** (Kryssmarkera).
  - Web Audio 8-bitars ljudeffekter för mejselhugg, kryss, klick och segerfanfar.
  - Vinstdetektering när pusslet är korrekt löst!

---

## 🚀 Köra Lokalt

Eftersom projektet består av ren HTML, CSS och modern modulär JavaScript kan du starta det med valfri lokal webbserver:

```bash
# Alternativ 1: Med npm (Serve)
npx serve .

# Alternativ 2: Med Python
python -m http.server 8080
```

Öppna sedan `http://localhost:3000` (eller den port som visas) i valfri webbläsare eller mobilvy.

---

## 📱 Paketera till Android med Capacitor

När du vill bygga en native Android-APK kör du följande steg:

```bash
# 1. Installera Capacitor
npm install @capacitor/core @capacitor/cli @capacitor/android

# 2. Initiera Capacitor (ange Appnamn och Package ID)
npx cap init "Retro Picross" "com.archaeo.picross" --web-dir "."

# 3. Lägg till Android-plattformen
npx cap add android

# 4. Synka webbfilerna
npx cap sync android

# 5. Öppna projektet i Android Studio och bygg APK:
npx cap open android
```
