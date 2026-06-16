# uCORE Marktradar

Ein fokussiertes Werkzeug, das für ein Startup — hier am Beispiel **uCORE Systems GmbH** — laufend bewertet,
wie sich **Chancen und Risiken durch aktuelle Ereignisse** verändern.

Stündlich werden Nachrichtenquellen gescannt; jedes relevante Ereignis bekommt einen Einfluss-Faktor von
**−1 (Risiko)** bis **+1 (Chance)** und eine kurze Begründung, **inwiefern es das Geschäftsmodell betrifft**.

👉 **Live:** <https://bartfastiel.github.io/ucore-radar/>

## So funktioniert es

```
            ┌── GitHub Actions (stündlicher Cron, kostenlos) ──────────────┐
            │  1. Google-News-RSS zu uCORE-Themen abrufen (dpa, Reuters…)  │
            │  2. Claude Haiku  → schneller, günstiger Relevanz-Vorfilter  │
            │  3. Claude Opus   → genaue Analyse: Faktor −1…+1 + Begründung│
            │  4. Ergebnis in data/news.json schreiben & committen         │
            └───────────────────────────┬─────────────────────────────────┘
                                         ▼
              GitHub Pages serviert das Dashboard (liest data/news.json)
```

- **Zweistufig & kostenbewusst:** Das günstige Modell (Haiku) filtert die Masse vor; nur die wenigen
  relevanten Treffer gehen an das starke Modell (Opus). So bleiben die Kosten pro Stunde minimal.
- **Persistenz:** Die Bewertungen liegen versioniert in `data/news.json` — jede Stunde ein nachvollziehbarer
  Commit (die „Datenbank“ ist Teil des Repos, kein Server nötig).
- **Datensatz je Ereignis:** Link, Titel, Quelle, Datum, **Faktor (−1…+1)**, Kategorie, **Begründung** und
  Konfidenz.
- **Schwache Signale sichtbar:** Auch scheinbar nebensächliche Meldungen landen mit Faktor nahe 0 im Radar,
  statt nur Gut/Schlecht zu zeigen.

## Hosting & Kosten

Komplett **kostenlos** und ohne eigene Infrastruktur — dieselbe Idee wie bei
`vocabulary-learning-app`: **GitHub Pages** (statisches Frontend) plus **GitHub Actions** (Cron). Kein AWS,
kein Server, keine Datenbank-Instanz. Der API-Key liegt ausschließlich als **GitHub-Actions-Secret** vor und
wird nie an den Browser ausgeliefert.

> Eine AWS-Variante (Terraform: Lambda + EventBridge-Schedule + DynamoDB + S3/CloudFront) wäre möglich, ist
> hier aber bewusst nicht gewählt: sie verursacht laufende Kosten und Betrieb, ohne für diesen Anwendungsfall
> einen Vorteil gegenüber dem kostenlosen GitHub-Setup zu bieten.

## Einrichtung (einmalig)

1. **Anthropic-API-Key als Repo-Secret hinterlegen:**
   ```bash
   gh secret set ANTHROPIC_API_KEY --repo bartfastiel/ucore-radar
   # Wert (sk-ant-…) eingeben — bleibt geheim, nur in Actions verfügbar.
   ```
2. **Ersten Scan auslösen** (statt auf die volle Stunde zu warten):
   ```bash
   gh workflow run hourly-news-scan --repo bartfastiel/ucore-radar
   ```
   Danach läuft der Scan automatisch stündlich. Manuell jederzeit über den **Actions**-Tab → *Run workflow*.

Ohne Key tut der Cron nichts; das Dashboard zeigt dann die mitgelieferten **Startwerte** (`seed`), bis die
ersten Live-Bewertungen eintreffen.

## Unternehmensprofil anpassen

Alles Unternehmensspezifische steht zentral in [`config/profile.json`](config/profile.json):
Beschreibung/Geschäftsmodell (für die KI-Bewertung), die **Suchanfragen** (`queries`), die Modelle
(`triage` = Haiku, `analysis` = Opus) und Limits. uCORE ist dort fix hinterlegt.

## Struktur

```
config/profile.json          fixes Unternehmensprofil + Suchanfragen + Modelle
scripts/sources.mjs          Google-News-RSS abrufen & parsen (zero-dependency)
scripts/scan.mjs             Pipeline: Triage (Haiku) → Analyse (Opus) → data/news.json
.github/workflows/scan.yml   stündlicher Cron + manueller Trigger
data/news.json               versionierter Datenspeicher der Bewertungen
index.html · css · js/app.js Dashboard (liest data/news.json, kein API-Key im Browser)
```

## Modelle

`claude-haiku-4-5` (Vorfilter) und `claude-opus-4-8` (Analyse, mit Structured Outputs für robustes JSON).
Anpassbar in `config/profile.json`.
