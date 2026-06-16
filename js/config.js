/* Strategist–AI Cockpit — configuration, models, default company profile, thesis content.
   Plain classic script: everything hangs off the global `COCKPIT` namespace so the app
   runs from file:// as well as GitHub Pages (no bundler, no ES-module CORS issues). */
window.COCKPIT = window.COCKPIT || {};

COCKPIT.config = {
  // Anthropic Messages API, called directly from the browser.
  apiUrl: "https://api.anthropic.com/v1/messages",
  apiVersion: "2023-06-01",

  // Models. `temperature` was removed on the Opus 4.8 / 4.7 / Fable 5 tier (returns 400),
  // so the creativity slider only maps to the temperature parameter on models that accept
  // it; on the others it steers the prompt instead. This distinction is surfaced in the UI.
  models: [
    { id: "claude-opus-4-8",   label: "Claude Opus 4.8 (höchste Qualität)", temperature: false, websearch: true,  effort: true },
    { id: "claude-sonnet-4-6", label: "Claude Sonnet 4.6 (schnell, Temperatur)", temperature: true, websearch: true, effort: true },
    { id: "claude-opus-4-6",   label: "Claude Opus 4.6 (Temperatur)", temperature: true, websearch: true, effort: true }
  ],

  // Approx. published API pricing ($ / 1M tokens) for a rough live cost readout.
  pricing: {
    "claude-opus-4-8":   { in: 5,  out: 25 },
    "claude-sonnet-4-6": { in: 3,  out: 15 },
    "claude-opus-4-6":   { in: 5,  out: 25 }
  },

  usdToEur: 0.92,
  webSearchCostUsd: 0.01, // ~$10 / 1k searches

  defaults: {
    model: "claude-opus-4-8",
    creativity: 0.4,   // 0 = nüchtern/wörtlich, 1 = mutig/lateral
    effort: "medium",
    cacheTtlMin: 720   // 12h
  },

  cacheVersion: "v1"
};

modelById = function (id) {
  return COCKPIT.config.models.find((m) => m.id === id) || COCKPIT.config.models[0];
};

/* Default Unternehmensprofil — uCORE Systems GmbH (recherchiert).
   Fully editable in the UI; this is only the seed. */
COCKPIT.defaultProfile = {
  name: "uCORE Systems GmbH",
  oneLiner:
    "Modulare, lokal betriebene Plattform für situationsbasierte Assistenzsysteme in Wohn- und Pflegeumgebungen (Edge-Computing, Datensouveränität).",
  products:
    "CORE-ONE (lokaler IoT-Hub/Gateway), CORE-OS (KI-Betriebssystem zur regelbasierten Situationserkennung), CORE-ACCESS (Portal zur Verwaltung mehrerer Installationen). Funktionen: Sturz-/Präsenzerkennung (Radar), Notfallalarmierung, Energiemonitoring, Gebäudesteuerung.",
  markets:
    "Altenpflege, betreutes Wohnen / Assistenz für Menschen mit Behinderung, Notfallerkennung, Gebäudeautomation & Energieeffizienz, Wohnungswirtschaft / Smart-Building-Betreiber.",
  technologies:
    "Edge-Computing (lokale Verarbeitung, keine Cloud-Pflicht), Radarsensorik, Funkprotokolle EnOcean / ELDAT-EasyWave / MQTT, regelbasierte KI, offene/modulare Architektur.",
  dependencies:
    "Hardware-/Sensorpartner: Hikvision, Shelly, EnOcean Alliance, DEUTA Controls, Yealink, Wissner-Bosserhoff, EMB CARE-Light, Puresec. Mitglied SmartHome Initiative Deutschland e.V.",
  positioning:
    "Leitlinie: „Technik dort einsetzen, wo sie Menschen wirklich hilft.\" Slogan: „Lokal. Sicher. Partnerorientiert.\" Werte: Datensouveränität, Transparenz, Interoperabilität, Technik die den Menschen (Pflegekraft) unterstützt statt ersetzt.",
  context:
    "Sitz: Andernach, Rheinland-Pfalz. Gegründet 2022. Erste Finanzierungsrunde ~800.000 € (Mai 2025, 3B Beteiligungs GmbH + ISB). Früh­phasiges Start-up. Relevante Treiber: demografischer Wandel & Pflegekräftemangel, DSGVO/Datenschutz, Pflegekassen-Förderung, EU Cyber Resilience Act, geopolitisches Lieferketten-/Sanktionsrisiko (z. B. Hikvision)."
};

/* Inhalt für die Methodik-Seite — Perkhofers Dissertation getreu zusammengefasst. */
COCKPIT.thesis = {
  title: "AI and the Strategizing Process",
  subtitle:
    "Strategist-AI Collaboration in Strategic Issue Scanning and Interpretation Activities",
  author: "Dr. Franziskus Perkhofer",
  institution: "TUM School of Management · Dr. rer. pol., angenommen 15.02.2026",
  abstract:
    "Die Dissertation untersucht, wie Strateg:innen und KI in den sensemaking-Aktivitäten „strategic issue scanning\" und „interpretation\" zusammenarbeiten — und wie sich dabei Vertrauen in KI und die wahrgenommene Unsicherheit gegenseitig beeinflussen. Zentrale Gefahr: In Knight'scher Unsicherheit kann hohes Vertrauen die wahrgenommene Unsicherheit senken und zu Overreliance führen, niedriges Vertrauen verschenkt die Rechenvorteile der KI (Underreliance).",
  studies: [
    {
      n: "Studie 1",
      title: "Das Unsicherheits-Vertrauens-Dilemma in der Strategieinitiierung (SPI)",
      body:
        "Ein rekursives Prozessmodell verknüpft KI-Output, das sich entwickelnde Vertrauen der Strateg:innen, ihre wahrgenommene Unsicherheit und das anschließende Scanning-/Interpretationsverhalten. Drei Pfade: KI-Pfad, Strateg:innen-Pfad, Strateg:in-KI-Pfad. Kernrisiko: trügerische Sicherheit — wahrgenommene ≠ tatsächliche Unsicherheit."
    },
    {
      n: "Studie 2",
      title: "Strateg:in-KI-Kollaboration im strategischen Sensemaking",
      body:
        "KI ist mehr als ein analytisches Tool: sie kann zum aktiven „sensegiver\" werden. Vier Rollen entstehen aus den Interviews: Sparringspartner (fordert Biases heraus), Insight-Giver (strukturiert/synthetisiert schnell), Automator (übernimmt repetitive Aufgaben, Visualisierung), Ideator (kreative Ideen am Anfang). Adoption ist iterativ (trial & error); KI-Output verlangt stets kritische Prüfung."
    },
    {
      n: "Studie 3",
      title: "Das Fit-Misfit-Paradox der KI in Strategieprozessen",
      body:
        "KI passt (fit) durch schnelle, breite Datenverarbeitung und Mustererkennung — und passt zugleich nicht (misfit) bei Kontextverständnis, tazitem Wissen und Nuancen. Die Spannung manifestiert sich in Scanning [S], Interpretation [I] und ihrer Verbindung [S→I]. Aktiv gemanagt entstehen tugendhafte (virtuous) Zyklen; schlecht gemanagt teuflische (vicious) — Overreliance oder Nicht-Adoption."
    }
  ],
  roles: [
    { key: "sparring", icon: "⚔️", name: "Sparringspartner", desc: "Unparteiischer Gegenüber, der Annahmen & Biases herausfordert und frische Perspektiven liefert." },
    { key: "insight", icon: "🔎", name: "Insight-Giver", desc: "Liefert schnell strukturierte Information, synthetisiert komplexe Daten zu einem ersten Überblick." },
    { key: "automator", icon: "⚙️", name: "Automator", desc: "Übernimmt zeitintensive, repetitive Aufgaben — Aufbereitung, Visualisierung, Vorstandsvorlagen." },
    { key: "ideator", icon: "💡", name: "Ideator", desc: "Generiert am Anfang kreative Ideen, erweitert den strategischen Horizont, sieht laterale Wechselwirkungen." }
  ]
};
