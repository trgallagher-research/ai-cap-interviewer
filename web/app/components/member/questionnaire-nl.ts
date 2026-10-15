/* Dutch wording of the opening questionnaire. Keys mirror QUESTIONNAIRE / PAGES in lib/aiwd/prompts.ts,
 * which stay the English source of truth (the interviewer, the profile prompt and the organiser view
 * read the English labels; answers are stored as option keys, so both languages give the same data). */

type QNl = { label: string; sub?: string; options?: Record<string, string>; hints?: Record<string, string> };

const AGREE = { sd: "Helemaal oneens", d: "Oneens", n: "Neutraal", a: "Eens", sa: "Helemaal eens" };
const YESNO = { yes: "Ja", no: "Nee" };
const OFTEN = { never: "Nooit", sometimes: "Soms", often: "Vaak", always: "Altijd" };

export const PAGES_NL: Record<string, { title: string; intro: string }> = {
  basics: { title: "Hoe AI in je werk zit", intro: "Eerst een paar korte vragen." },
  views: {
    title: "Hoe je naar AI en je werk kijkt",
    intro: "Hoe eens ben je het met elke uitspraak? Er zijn geen goede of foute antwoorden: twijfels zijn voor ons net zo nuttig als enthousiasme. Sla gerust uitspraken over die je liever niet beantwoordt.",
  },
  skills: {
    title: "Wat je echt doet",
    intro: "Concrete dingen die mensen met AI doen, van eenvoudig tot gevorderd. Antwoord voor wat je nu doet, niet wat je zou kunnen. Het is prima om bij de meeste nee te zeggen.",
  },
  support: { title: "Hulp en ondersteuning", intro: "Bij wie je terecht kunt met vragen over AI, of je dat ook doet, en wat je de moeite waard zou vinden." },
};

export const QUESTIONS_NL: Record<string, QNl> = {
  frequency: {
    label: "Hoe vaak speelt een AI-tool (ChatGPT, Copilot, Claude, Gemini of iets vergelijkbaars) een rol in je werk?",
    options: {
      never: "Nooit",
      tried: "Ik heb het een of een paar keer geprobeerd",
      monthly: "Af en toe, een paar keer per maand",
      weekly: "De meeste weken",
      daily: "De meeste dagen",
      multi: "Elke dag, meerdere keren per dag",
      constant: "Constant: er staat de hele dag een AI-chat open, of agents voeren taken voor me uit",
    },
  },
  uses: {
    label: "Waarvoor heb je het in je werk gebruikt? Vink alles aan wat van toepassing is.",
    options: {
      writing: "Schrijven en communicatie",
      prep: "Sessies en interventies voorbereiden",
      analysis: "Analyseren en betekenis geven",
      thinking: "Sparringpartner bij een casus",
      client: "Met of voor klanten zelf",
      learning: "Onderzoek en eigen leren",
      admin: "Administratie en organiseren",
      building: "Tools, prompts of automatiseringen bouwen",
      search: "In plaats van een zoekmachine",
    },
    hints: {
      writing: "e-mails, offertes, rapporten, LinkedIn-posts, samenvattingen voor klanten",
      prep: "workshops, teamdagen, mediationgesprekken, trainingen ontwerpen",
      analysis: "gespreksnotities, enquêteresultaten en lange documenten verwerken, patronen zien",
      thinking: "een lastige klantcasus of conflict met de AI doorpraten, hypotheses toetsen",
      client: "AI in de ruimte gebruiken met een team, iets bouwen dat een klant gebruikt, klanten adviseren over AI",
      learning: "leren over methodes, theorie, een sector, een nieuwe tool",
      admin: "plannen, facturen, gespreksverslagen, roosters, vertalen",
      building: "herbruikbare prompts, AI-assistenten of agents met je eigen context, scripts, tools koppelen",
      search: "dingen opzoeken, snelle vragen, bronnen vinden: waar je vroeger Google voor gebruikte",
    },
  },
  tools: {
    label: "Welke tools?",
    options: { "Transcription tool": "Een transcriptietool (Otter, Teams, Zoom)" },
  },
  stance: {
    label: "Wat past het best bij hoe je over AI in je werk denkt?",
    options: {
      enthusiast: "Enthousiast: ik wil er (meer) mee doen",
      pragmatic: "Praktisch: handig voor sommige dingen, niet voor alles",
      cautious: "Voorzichtig: ik sta ervoor open, met kanttekeningen",
      sceptical: "Twijfelachtig: niet overtuigd dat het mijn soort werk helpt",
      worried: "Ongerust: ik heb zorgen (klanten, gegevens, kwaliteit van denken)",
    },
  },
  offer: {
    label: "Als het netwerk iets over AI zou aanbieden, wat zou je de moeite waard vinden? Vink aan wat je wilt.",
    options: {
      "peer-halfday": "Een halve dag met collega's uit dit netwerk",
      "one-to-one": "Een uur met iemand die meekijkt hoe ik werk",
      confidentiality: "Een checklist om het veilig te gebruiken met klantmateriaal",
      "prompt-library": "Een gedeelde verzameling prompts van collega's",
      demos: "Korte demo's van collega's",
      "when-not": "Een gesprek over of en wanneer je het juist niet gebruikt (klanten, gegevens, ethiek)",
      nothing: "Voorlopig niets over AI",
    },
  },
  pay: { label: "Zou je betalen voor wat je hebt aangevinkt?", options: { yes: "Ja", maybe: "Misschien", no: "Nee", unsure: "Weet ik nog niet" } },
  canShow: { label: "Is er iets wat je met AI doet dat je een collega zou kunnen laten zien?", options: { yes: "Ja", maybe: "Misschien", no: "Niet echt" } },
  viewEssential: { label: "Ik vind het gebruik van AI essentieel om mijn werk goed te doen.", sub: "Overtuiging en urgentie", options: AGREE },
  viewQuality: { label: "Ik denk dat AI de kwaliteit van mijn werk zal verbeteren.", options: AGREE },
  viewChange: { label: "Ik verwacht dat mijn werk de komende jaren flink verandert door AI.", options: AGREE },
  viewBehind: { label: "Ik heb het gevoel dat ik achterop raak als ik AI niet (ga) gebruiken.", options: AGREE },
  doubtReliability: { label: "Ik maak me zorgen over de betrouwbaarheid van wat AI oplevert.", sub: "Twijfels en terughoudendheid", options: AGREE },
  doubtPrivacy: { label: "Ik heb zorgen over privacy, gegevensbeveiliging of vertrouwelijkheid bij het gebruik van AI.", options: AGREE },
  doubtCraft: { label: "Ik heb het gevoel dat AI het vakmanschap of de menselijke kant van mijn werk kan ondermijnen.", options: AGREE },
  doubtEthics: { label: "Ik heb ethische of maatschappelijke bezwaren tegen AI (bijv. milieu-impact, auteursrecht, gevolgen voor banen).", options: AGREE },
  doubtPressure: { label: "Ik voel druk om AI te gebruiken, terwijl ik de toegevoegde waarde zelf niet zie.", options: AGREE },
  doubtTime: { label: "Ik heb gewoon de tijd of energie niet om het te leren.", options: AGREE },
  reservation: { label: "Wat is je grootste bedenking bij het gebruik van AI in je werk? (niet verplicht)" },
  skillFollowUp: { label: "Ik stel een AI-tool vervolgvragen om het eerste antwoord te verbeteren.", options: YESNO },
  skillCheck: { label: "Ik controleer wat AI oplevert op fouten voordat ik het gebruik.", options: OFTEN },
  skillOwnMaterial: { label: "Ik heb een AI-tool met mijn eigen materiaal laten werken (bijv. notities, een rapport, een transcript).", options: YESNO },
  skillPrompt: { label: "Ik schrijf prompts met context, een rol en een voorbeeld van wat ik wil krijgen.", options: OFTEN },
  skillAnonymise: {
    label: "Ik haal namen en herkenbare details weg voordat ik klantmateriaal in een AI-tool zet.",
    options: { ...OFTEN, na: "Ik zet geen klantmateriaal in AI-tools" },
  },
  skillReusable: { label: "Ik heb een herbruikbare werkwijze, template of eigen assistent gebouwd.", options: YESNO },
  skillAgents: { label: "Ik kan AI-agents opzetten die taken met meerdere stappen voor me uitvoeren (bijv. Claude Code, Codex).", options: YESNO },
  scenarioCheck: {
    label: "Een AI-tool heeft een klantrapport van 20 pagina's voor je samengevat. De samenvatting leest goed en klinkt zeker. Wat doe je voordat je hem naar de klant stuurt?",
    sub: "Twee korte situaties: wat zou jij doen?",
    options: {
      send: "Versturen: het leest goed en de tool heeft het hele rapport gelezen",
      ask: "De AI-tool vragen te bevestigen dat de samenvatting klopt",
      verify: "De belangrijkste punten en cijfers naast het rapport leggen, en kijken wat er is weggelaten",
      tone: "Nog een keer lezen op toon en typefouten, en dan versturen",
      unsure: "Ik weet het niet zeker",
    },
  },
  scenarioData: {
    label: "Je wilt hulp bij het schrijven van een rapport over een conflict in het team van een klant, met een gratis AI-chattool. Wat is de verstandigste aanpak?",
    options: {
      paste: "Mijn volledige notities erin plakken: de tool deelt ze met niemand",
      strip: "Eerst namen en herkenbare details weghalen, en nagaan wat mijn afspraken met de klant toestaan",
      gdpr: "Het alleen gebruiken als de tool zegt dat hij AVG-proof is, en dan mijn notities erin plakken",
      unsure: "Ik weet het niet zeker",
    },
  },
  supInOrg: {
    label: "In mijn organisatie is er iemand bij wie ik terecht kan met vragen over AI (bijv. een AI-coördinator, de IT-afdeling, een getrainde collega).",
    sub: "Toegang",
    options: { ...YESNO, na: "Ik werk zelfstandig" },
  },
  supOutside: { label: "Buiten mijn werk ken ik iemand met kennis van AI die ik zou kunnen benaderen (bijv. een vriend, familielid, contact uit mijn netwerk).", options: YESNO },
  supFormal: { label: "Ik heb toegang tot formeel leermateriaal over AI (bijv. trainingen, cursussen, een interne kennisbank).", options: YESNO },
  supOnline: { label: "Ik volg online bronnen om over AI te leren (bijv. YouTube, nieuwsbrieven, communities, fora).", options: YESNO },
  supAsked: { label: "Ik heb de afgelopen zes maanden een expert of deskundige collega om hulp gevraagd bij AI.", sub: "Gebruik van die hulp", options: YESNO },
  supTraining: { label: "Ik heb meegedaan aan een AI-training of -workshop.", options: YESNO },
  supSelfTaught: { label: "Ik leer vooral door zelf dingen uit te proberen.", options: YESNO },
  workshop: {
    label: "Suzanne en Aad kunnen een korte, praktische workshop geven (ongeveer een uur) om je op weg te helpen met AI en Claude, of met het bouwen van je eigen tools. Zou je daar interesse in hebben?",
    options: { yes: "Ja, daar doe ik graag aan mee", maybe: "Misschien, afhankelijk van de datum en het onderwerp", no: "Nee, dank je" },
  },
  workshopFirst: { label: "Wat is het eerste dat je zou willen leren? (niet verplicht)" },
  whyNot: {
    label: "Je hebt de laatste tijd niemand om hulp gevraagd bij AI. Waarom niet? Vink aan wat van toepassing is.",
    options: {
      dontKnow: "Ik weet niet wie ik het zou kunnen vragen",
      embarrassed: "Ik schaam me een beetje voor hoe weinig ik weet",
      noTime: "Ik heb er de tijd niet voor",
      busy: "De mensen die ik het zou kunnen vragen zijn te druk of slecht bereikbaar",
      noNeed: "Ik heb er geen behoefte aan",
    },
  },
};
