# VARIETY & PROGRAMS

Samodzielne archiwum GitHub Pages programów i występów telewizyjnych THE BOYZ. Wygląd, kolorystyka, fonty, kafelki oraz responsywny układ są zgodne z pozostałymi repozytoriami THE BOYZ FAN ARCHIVE.

## Funkcje

- kolekcja `Programs by Year` obejmująca foldery roczne 2017–2026,
- osobne kolekcje `Weekly Idol`, `Qn ASMR & Review` i `THE BOYZ General Meeting`,
- automatyczne kafelki dla nowych głównych podfolderów Google Drive,
- automatyczne dołączanie nowych folderów rocznych do `Programs by Year`,
- wyszukiwanie po nazwie programu, nazwie pliku, numerze odcinka lub dacie `YYMMDD`,
- filtrowanie według kolekcji, roku, rodzaju programu, rodzaju pliku oraz członka,
- pliki napisów `.srt`, `.vtt` i `.ass` pozostają na Dysku Google, ale są ukryte na stronie,
- miniatury filmów generowane przez Google Drive i prowadzące bezpośrednio do odtwarzacza Drive,
- sortowanie od najnowszych materiałów,
- automatyczna synchronizacja dwa razy dziennie.

## Uruchomienie lokalne

Wymagany jest Node.js 22 oraz pnpm.

```bash
pnpm install
pnpm dev
```

Test i kompilacja:

```bash
pnpm test
```

## Publikacja na GitHub Pages

1. Utwórz puste repozytorium GitHub, np. `variety-programs`.
2. Jeśli korzystasz z pobranego ZIP-a, rozpakuj go i w jego folderze wykonaj:

   ```bash
   git init -b main
   git add .
   git commit -m "Initial commit"
   git remote add origin https://github.com/TWOJ_LOGIN/variety-programs.git
   git push -u origin main
   ```

3. Otwórz `Settings → Pages`.
4. W `Build and deployment` wybierz `Source → GitHub Actions`.
5. Workflow `Deploy GitHub Pages` zbuduje i opublikuje stronę.

## Automatyczna synchronizacja

1. Udostępnij główny folder jako `Każda osoba mająca link → Wyświetlający`.
2. W projekcie Google Cloud włącz `Google Drive API`.
3. Utwórz klucz API i ogranicz go do Google Drive API.
4. W GitHub otwórz `Settings → Secrets and variables → Actions`.
5. Dodaj sekret:

   ```text
   GOOGLE_DRIVE_API_KEY
   ```

6. Uruchom ręcznie `Actions → Sync Variety and Programs → Run workflow`.

Synchronizacja działa o `05:17` i `17:17` UTC. Skanuje całe drzewo folderów rekurencyjnie, dlatego nowe foldery, odcinki i filmy trafiają na stronę automatycznie. Pliki napisów są indeksowane, lecz nie są wyświetlane.

## Źródło

- [Główny folder Google Drive](https://drive.google.com/drive/folders/1O5vlhVVIfJRsjBLMmgTHiNW7fz_uprrw)
