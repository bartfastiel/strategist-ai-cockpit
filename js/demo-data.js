/* Precomputed demo content (uCORE Systems). Used when Demo-Modus is on or no API key is
   set — so the app is fully presentable offline, with no API cost. Marked clearly as DEMO. */
window.COCKPIT = window.COCKPIT || {};
COCKPIT.DEMO = {
  scanning: {
    fromCache: false,
    demo: true,
    model: "demo",
    sources: [
      { title: "EU-Kommission: Prüfung von Hochrisiko-Überwachungstechnik", url: "https://example.org/eu-surveillance-review" },
      { title: "Cyber Resilience Act — Pflichten für vernetzte Produkte ab 2027", url: "https://example.org/cra-2027" },
      { title: "Pflegestatistik: Fachkräftelücke wächst weiter", url: "https://example.org/pflege-fachkraefte" }
    ],
    json: {
      items: [
        { category: "risk", title: "Verschärfte EU-Prüfung von Hikvision-Technik", summary: "EU-Gremien weiten Sicherheits- und Beschaffungs-Prüfungen für chinesische Überwachungstechnik aus.", implication: "uCORE setzt Hikvision-Sensorik ein — Reputations-, Beschaffungs- und Compliance-Risiko in öffentlich finanzierten Pflegeprojekten.", confidence: 0.78, source_url: "https://example.org/eu-surveillance-review", horizon: "mittel" },
        { category: "risk", title: "Cyber Resilience Act: Pflichten für vernetzte Geräte", summary: "Der CRA verlangt ab 2027 nachweisbare Cybersecurity über den Produktlebenszyklus.", implication: "CORE-ONE/CORE-OS fallen in den Geltungsbereich — Aufwand für Konformität, aber auch Differenzierung möglich.", confidence: 0.7, source_url: "https://example.org/cra-2027", horizon: "mittel" },
        { category: "risk", title: "Druck auf Pflege-Budgets der Kommunen", summary: "Mehrere Träger kündigen Investitionszurückhaltung an.", implication: "Verlängerte Vertriebszyklen; Förderabhängigkeit der Kund:innen steigt.", confidence: 0.5, source_url: "", horizon: "kurz" },
        { category: "neutral", title: "Matter 1.x erweitert Smart-Home-Standard", summary: "Consumer-Smart-Home-Standard bekommt neue Geräteklassen — scheinbar Consumer-Thema.", implication: "Wirkt irrelevant (Pflege ≠ Consumer), könnte aber Interoperabilitäts­erwartungen und Sensor-Beschaffung mittelfristig verschieben.", confidence: 0.45, source_url: "", horizon: "lang" },
        { category: "neutral", title: "Großes Telko-Merger im DACH-Raum", summary: "Konsolidierung bei Konnektivitätsanbietern.", implication: "Auf den ersten Blick fern; relevant nur, falls künftige Edge-zu-Cloud-Fallbacks von diesen Netzen abhängen.", confidence: 0.35, source_url: "", horizon: "lang" },
        { category: "neutral", title: "Neue Consumer-Sturzerkennung in Smartwatches", summary: "Wearables-Hersteller bewerben Sturzerkennung am Handgelenk.", implication: "Scheinbar anderes Segment — könnte aber Erwartungshaltung und Kostenvergleich bei Einkäufer:innen prägen (schwaches Signal).", confidence: 0.4, source_url: "", horizon: "mittel" },
        { category: "opportunity", title: "Wachsende Fachkräftelücke in der Pflege", summary: "Die Personallücke in der Pflege wächst weiter.", implication: "Kern-Nachfragetreiber: Assistenzsysteme, die Pflegekräfte entlasten, gewinnen an Dringlichkeit.", confidence: 0.8, source_url: "https://example.org/pflege-fachkraefte", horizon: "mittel" },
        { category: "opportunity", title: "Förderprogramme für digitale Pflege", summary: "Neue Mittel für Digitalisierung in der Langzeitpflege angekündigt.", implication: "Kund:innen können Investitionen fördern lassen — Argument für Vertrieb, falls uCORE Förderfähigkeit nachweist.", confidence: 0.6, source_url: "", horizon: "kurz" },
        { category: "opportunity", title: "„Datensouveränität\" als Beschaffungskriterium", summary: "Öffentliche Träger gewichten lokale Datenverarbeitung stärker.", implication: "uCOREs Edge-only-Architektur ist genau hier differenzierend — offensiv positionieren.", confidence: 0.72, source_url: "", horizon: "kurz" }
      ]
    },
    cost: { eur: 0, inTok: 0, outTok: 0, searches: 0 }
  },

  interpretation: {
    demo: true, model: "demo", fromCache: false, sources: [],
    text: [
      "KONFIDENZ: mittel",
      "",
      "## Worum es geht",
      "Die EU weitet Sicherheits- und Beschaffungsprüfungen für chinesische Überwachungstechnik (u. a. Hikvision) aus. uCORE nutzt Hikvision-Komponenten in seiner Sensorik.",
      "",
      "## Implikationen für uCORE Systems GmbH (Pro / Contra)",
      "- **Contra:** In öffentlich (mit-)finanzierten Pflegeprojekten kann allein die Lieferanten-Herkunft zum Ausschlusskriterium werden — unabhängig von der tatsächlichen Sicherheit der Lösung.",
      "- **Contra:** Reputationsrisiko gegenüber datenschutzsensiblen Trägern, gerade wo uCORE mit „Datensouveränität\" wirbt.",
      "- **Pro:** uCOREs Edge-only-Architektur verarbeitet Rohdaten lokal — ein starkes Gegenargument, das den Komponenten-Ursprung relativiert, wenn es offensiv kommuniziert wird.",
      "",
      "## Zweite-Ordnungs-Effekte",
      "- Beschleunigte Diversifizierung der Sensor-Lieferkette könnte Kosten kurzfristig erhöhen, Resilienz aber langfristig stärken.",
      "- Wettbewerber ohne China-Komponenten könnten dies als Verkaufsargument nutzen.",
      "",
      "## Handlungsoptionen",
      "1. Lieferanten-Risikoanalyse + Zweitquelle für kritische Sensorik evaluieren.",
      "2. Faktenblatt „Wo bleiben die Daten?\" für Beschaffungsstellen erstellen (Edge-Argument).",
      "3. Monitoring konkreter Ausschreibungskriterien statt allgemeiner Schlagzeilen.",
      "",
      "## Was wir noch NICHT wissen (kritisch prüfen)",
      "- Betrifft die Prüfung konkret die von uCORE genutzten Komponenten/Modelle?",
      "- Gibt es bereits Ausschreibungen mit Herkunfts-Klauseln im Zielmarkt?",
      "- Wie hoch wäre der reale Umstellungsaufwand auf eine Zweitquelle?"
    ].join("\n"),
    cost: { eur: 0, inTok: 0, outTok: 0, searches: 0 }
  },

  sparring: {
    demo: true, model: "demo", fromCache: false, sources: [],
    text: [
      "Du gehst davon aus, dass „Edge-only / lokale Datenverarbeitung\" euer entscheidender Differenzierer ist. Erlaube mir, daran zu rütteln:",
      "",
      "- **Ungeprüfte Prämisse:** Ist Datensouveränität ein *Kauf*-Kriterium oder nur ein *Hygiene*-Faktor? Käufer in der Pflege entscheiden oft über Förderfähigkeit, Total Cost und Integrationsaufwand — Datenschutz wird vorausgesetzt, nicht extra bezahlt.",
      "- **Confirmation-Bias:** Ihr hört „Datensouveränität ist uns wichtig\" am lautesten von genau den Interessent:innen, die ohnehin zu euch passen. Die schweigende Mehrheit optimiert vielleicht anders.",
      "- **Gegenposition:** Cloud-Wettbewerber können mit zentralem Lernen über viele Standorte schnellere Produktverbesserung und Fernwartung bieten — ein Vorteil, den eine reine Edge-Architektur strukturell schwerer erreicht.",
      "",
      "Zwei Fragen, die ich euch stellen würde:",
      "1. Habt ihr einen *verlorenen* Deal je auf fehlende Datensouveränität zurückführen können — oder waren es Preis, Integration und Referenzen?",
      "2. Wenn morgen ein Wettbewerber „lokal + Cloud-Option\" anbietet: was bleibt dann von eurem Alleinstellungsmerkmal?"
    ].join("\n"),
    cost: { eur: 0, inTok: 0, outTok: 0, searches: 0 }
  },

  ideator: {
    demo: true, model: "demo", fromCache: false, sources: [],
    text: [
      "1. **Förderfähigkeits-Lotse als Feature.** CORE-ACCESS generiert automatisch die Nachweise, die Träger für Pflege-Digitalisierungsförderung brauchen. Wechselwirkung: macht den Datensouveränitäts-Vorteil direkt zu Geld. Realitäts-Check: erfordert Pflege der Förderkriterien. (Horizont: kurz · Wagnis: niedrig)",
      "2. **„Schwache-Signale\"-Abo für Heimbetreiber.** uCORE liefert aus aggregierten, lokalen Mustern anonyme Frühwarnungen (z. B. nächtliche Unruhe-Trends) — als Mehrwertdienst. Wechselwirkung: dreht Edge-Daten in wiederkehrenden Umsatz. Realitäts-Check: Anonymisierung & Einwilligung zentral. (Horizont: mittel · Wagnis: mittel)",
      "3. **Lieferketten-Resilienz als Produktversprechen.** „Hardware-agnostisch\": offen zertifizierte Sensoren mehrerer Hersteller, ein Klick-Austausch. Wechselwirkung: entschärft Hikvision-Risiko und wird zum Verkaufsargument. Realitäts-Check: Integrationsaufwand je Sensor. (Horizont: mittel · Wagnis: mittel)",
      "4. **Versicherungs-Partnerschaft.** Sturz-Prävention senkt Schadenslast — Modell mit Pflege-/Unfallversicherern, die Installationen mitfinanzieren. Wechselwirkung: neuer Zahler jenseits des Trägers. Realitäts-Check: lange Vertriebszyklen. (Horizont: lang · Wagnis: hoch)",
      "5. **CRA-Konformität als Gütesiegel.** Früh sichtbar CRA-konform werden und das offensiv vermarkten, bevor es Pflicht ist. Wechselwirkung: macht eine Regulierungslast zum Vertrauensargument. Realitäts-Check: Aufwand jetzt, Nutzen später. (Horizont: mittel · Wagnis: niedrig)",
      "6. **Betreutes Wohnen → Quartierslösung.** Vom Einzelapartment zur vernetzten Wohnanlage mit gemeinsamem Lagebild fürs Personal. Wechselwirkung: höherer Auftragswert pro Standort. Realitäts-Check: Datenschutz im Mehrparteienkontext. (Horizont: mittel · Wagnis: mittel)"
    ].join("\n"),
    cost: { eur: 0, inTok: 0, outTok: 0, searches: 0 }
  },

  automator: {
    demo: true, model: "demo", fromCache: false, sources: [],
    text: [
      "# Management-Briefing: Strategisches Lagebild",
      "",
      "## Kernaussage",
      "- Regulatorischer Gegenwind (Lieferketten-Prüfung, CRA) trifft auf strukturellen Rückenwind (Pflegekräftemangel, Förderung).",
      "- uCOREs Edge-/Datensouveränitäts-Position ist genau dort ein Hebel, wo Risiken entstehen — wenn sie offensiv belegt wird.",
      "- Größtes blindes Feld: scheinbar irrelevante Consumer-/Standard-Entwicklungen, die Erwartungen verschieben.",
      "",
      "## Top-Risiken",
      "1. EU-Prüfung der Hikvision-Sensorik → Beschaffungs-/Reputationsrisiko.",
      "2. CRA-Konformitätsaufwand ab 2027.",
      "3. Investitionszurückhaltung kommunaler Träger.",
      "",
      "## Top-Chancen",
      "1. Wachsende Fachkräftelücke = steigende Dringlichkeit der Entlastungs-Technik.",
      "2. Förderprogramme als Vertriebshebel.",
      "3. Datensouveränität als Beschaffungs-Differenzierer.",
      "",
      "## Empfohlene nächste Schritte",
      "1. Lieferketten-Risikoanalyse + Zweitquelle prüfen.",
      "2. „Wo bleiben die Daten?\"-Faktenblatt für Beschaffung.",
      "3. Förderfähigkeit nachweisbar machen.",
      "",
      "## Offene Fragen & Annahmen (kritisch zu prüfen)",
      "- Betrifft die EU-Prüfung konkret die genutzten Komponenten?",
      "- Ist Datensouveränität wirklich kaufentscheidend (siehe Sparring)?",
      "- Realer Umstellungsaufwand auf Zweitquelle?"
    ].join("\n"),
    cost: { eur: 0, inTok: 0, outTok: 0, searches: 0 }
  }
};
