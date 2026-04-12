export const translations = {
  fr: {
    // Nav
    navProduct: "Produit",
    navWorkflow: "Workflow",
    navPricing: "Tarifs",
    navContact: "Contact",
    langSwitch: "EN",

    // Hero
    badge: "Plateforme desktop pour watchlists, signaux et workflows de publication",
    heroTitle: "Chaque jour, des opportunités",
    heroTitleHighlight: "vous échappent",
    heroLead:
      "adoptan.ai transforme des signaux dispersés en décisions concrètes. Surveillez votre marché, vos sources et vos workflows créateur depuis un seul espace.",
    ctaPrimary: "Demander une démo",
    ctaSecondary: "Voir le workflow",

    // Stats
    stats: [
      { value: "24/7", label: "surveillance continue" },
      { value: "1", label: "workspace pour centraliser" },
      { value: "<5 min", label: "pour qualifier un signal" }
    ],

    // Problem
    problemTitle: "Pourquoi les équipes perdent du temps",
    problemLead:
      "Sites, réseaux, catalogues, retours clients, contenus: les signaux existent déjà. Le vrai problème, c'est de les capter à temps et de savoir quoi faire ensuite.",
    problems: [
      {
        icon: "🧩",
        title: "Signal partout, contexte nulle part",
        description: "Les informations utiles sont dispersées entre sites, feeds, documents et outils internes."
      },
      {
        icon: "⏳",
        title: "Validation manuelle et lente",
        description: "Chaque décision passe par des captures, des messages et des allers-retours sans vraie priorisation."
      },
      {
        icon: "🚨",
        title: "Fenêtres de réaction ratées",
        description: "Quand un changement important apparaît, l'équipe le voit souvent trop tard pour vraiment agir."
      },
      {
        icon: "🗂️",
        title: "Outils cloisonnés",
        description: "La veille, l'analyse et la publication vivent dans des outils séparés qui ne partagent pas le même contexte."
      }
    ],

    // Solution
    solutionTitle: "Une couche d'analyse et d'action",
    solutionLead: "adoptan.ai collecte, classe et pousse les signaux utiles vers le bon workflow.",
    solutions: [
      {
        icon: "🛰️",
        title: "Watchlists multi-sources",
        description: "Sites, catalogues, réseaux sociaux, retours clients, contenus: vous choisissez les sources à suivre."
      },
      {
        icon: "🧠",
        title: "Résumé utile, pas du bruit",
        description: "L'IA regroupe les changements, extrait le contexte et fait remonter uniquement ce qui mérite une décision."
      },
      {
        icon: "🤝",
        title: "Validation d'équipe",
        description: "Chaque signal peut être relu, commenté et validé avant de déclencher une suite d'actions."
      },
      {
        icon: "⚙️",
        title: "Actions connectées",
        description: "Alertes, exports, publishing workflows ou synchronisation vers vos outils: le bon signal déclenche la bonne suite."
      }
    ],

    // How it works
    howTitle: "Le workflow adoptan.ai",
    howLead: "Surveiller, comprendre, décider, agir. Sans bricoler cinq outils.",
    steps: [
      { number: "1", title: "Configurez vos watchlists", description: "Ajoutez vos sources, vos pages ou vos comptes à suivre dans un seul workspace." },
      { number: "2", title: "Recevez des signaux priorisés", description: "adoptan.ai détecte les changements, les regroupe et vous montre ce qui compte vraiment." },
      { number: "3", title: "Validez puis déclenchez l'action", description: "L'équipe approuve, commente et lance l'alerte, l'export ou la publication voulue." }
    ],

    // Creator workflow
    creatorTitle: "Workflow créateur et publication",
    creatorLead:
      "Pour les équipes contenu, adoptan.ai prépare une publication courte avec un vrai contrôle utilisateur.",
    creatorItems: [
      {
        icon: "🎬",
        title: "Sélection manuelle du contenu",
        description: "L'utilisateur authentifié choisit le clip ou l'extrait à publier. Rien n'est envoyé sans validation."
      },
      {
        icon: "✍️",
        title: "Légende et paramètres",
        description: "L'utilisateur renseigne la légende puis choisit les options de confidentialité et d'interaction disponibles."
      },
      {
        icon: "🚀",
        title: "Publication depuis le workspace",
        description: "adoptan.ai lance uniquement la publication demandée par l'utilisateur connecté, au moment voulu."
      }
    ],

    // What we track
    trackTitle: "Ce qu'adoptan.ai peut surveiller",
    trackLead: "Des signaux marché aux workflows créateur, selon votre équipe.",
    trackItems: [
      { icon: "🌐", title: "Sites & pages stratégiques", description: "Pages produit, pages tarifaires, changelogs, documentations" },
      { icon: "💰", title: "Prix & catalogues", description: "Évolutions de prix, stock, bundles, offres et listings" },
      { icon: "🚀", title: "Lancements & changelogs", description: "Nouvelles features, campagnes, annonces et signaux de mouvement" },
      { icon: "📱", title: "Comptes sociaux & créateurs", description: "Posts, profils, nouveaux formats, activité et cadence de publication" },
      { icon: "⭐", title: "Réputation & feedback", description: "Avis clients, commentaires, sentiment et points de friction répétés" },
      { icon: "🗃️", title: "Queues de publication", description: "Contenus à relire, approuver puis publier depuis un workflow encadré" }
    ],

    // Pricing
    pricingTitle: "Des plans simples",
    pricingLead: "Commencez avec un workflow léger, puis ajoutez des sources, des utilisateurs et des automatisations.",
    plans: [
      {
        name: "Starter",
        price: "29€",
        period: "/mois",
        description: "Pour une première watchlist opérationnelle",
        features: ["3 watchlists", "Digest email quotidien", "1 workflow de validation", "1 utilisateur"],
        cta: "Démarrer",
        featured: false
      },
      {
        name: "Pro",
        price: "99€",
        period: "/mois",
        description: "Pour une équipe qui veut agir vite",
        features: ["20 watchlists", "Alertes temps réel", "Workflows créateur et publishing", "Analyses IA avancées", "5 utilisateurs"],
        cta: "Choisir Pro",
        featured: true
      },
      {
        name: "Enterprise",
        price: "Sur devis",
        period: "",
        description: "Pour les équipes multi-marques ou multi-pays",
        features: ["Sources illimitées", "SSO / RBAC", "Workflows sur mesure", "Support prioritaire", "API & exports"],
        cta: "Parler à un expert",
        featured: false
      }
    ],

    // CTA
    ctaTitle: "Voir plus tôt. Décider plus vite.",
    ctaLead:
      "adoptan.ai aide les équipes à détecter les signaux utiles, coordonner la validation et lancer les actions au bon moment.",
    ctaButton: "Parler à l'équipe",
    complianceNote:
      "Les intégrations tierces nécessitent l'autorisation de l'utilisateur et respectent les paramètres de publication disponibles par plateforme.",

    // Footer
    footerTagline: "Signals in. Decisions out.",
    footerProduct: "Produit",
    footerWorkflow: "Workflow",
    footerPricing: "Tarifs",
    footerContact: "Contact",
    footerPrivacy: "Confidentialité",
    footerTerms: "Conditions",
    footerNote:
      "Workspace desktop et web pour veille, analyse et workflows de publication validés par l'utilisateur."
  },

  en: {
    // Nav
    navProduct: "Product",
    navWorkflow: "Workflow",
    navPricing: "Pricing",
    navContact: "Contact",
    langSwitch: "FR",

    // Hero
    badge: "Desktop workspace for watchlists, signals, and publishing workflows",
    heroTitle: "Every day, opportunities",
    heroTitleHighlight: "slip past you",
    heroLead:
      "adoptan.ai turns scattered signals into concrete decisions. Monitor your market, your sources, and your creator workflows from one workspace.",
    ctaPrimary: "Book a demo",
    ctaSecondary: "See the workflow",

    // Stats
    stats: [
      { value: "24/7", label: "continuous monitoring" },
      { value: "1", label: "workspace to centralize decisions" },
      { value: "<5 min", label: "to qualify a signal" }
    ],

    // Problem
    problemTitle: "Why teams lose time",
    problemLead:
      "Websites, social feeds, catalogs, customer feedback, content queues: the signals already exist. The real issue is catching them early and knowing what to do next.",
    problems: [
      {
        icon: "🧩",
        title: "Signals everywhere, context nowhere",
        description: "Important changes live across sites, feeds, documents, and internal tools without one shared view."
      },
      {
        icon: "⏳",
        title: "Manual validation slows everything down",
        description: "Each decision still depends on screenshots, chat threads, and slow back-and-forth without real prioritization."
      },
      {
        icon: "🚨",
        title: "Reaction windows get missed",
        description: "By the time a critical change is visible to the team, the best response window is often already gone."
      },
      {
        icon: "🗂️",
        title: "Tools stay fragmented",
        description: "Monitoring, analysis, and publishing happen in separate products that do not share the same context."
      }
    ],

    // Solution
    solutionTitle: "A layer for analysis and action",
    solutionLead: "adoptan.ai collects, ranks, and routes useful signals into the right workflow.",
    solutions: [
      {
        icon: "🛰️",
        title: "Multi-source watchlists",
        description: "Websites, catalogs, social accounts, customer feedback, and content sources live in one monitored workspace."
      },
      {
        icon: "🧠",
        title: "Useful summaries, not noise",
        description: "AI groups related changes, extracts context, and surfaces only the movements that deserve a decision."
      },
      {
        icon: "🤝",
        title: "Team validation",
        description: "Signals can be reviewed, commented, and approved before they trigger any next step."
      },
      {
        icon: "⚙️",
        title: "Connected actions",
        description: "Alerts, exports, publishing workflows, or downstream sync: the right signal starts the right action."
      }
    ],

    // How it works
    howTitle: "The adoptan.ai workflow",
    howLead: "Monitor, understand, decide, act. Without stitching together five tools.",
    steps: [
      { number: "1", title: "Configure your watchlists", description: "Add the sources, pages, or accounts you want to monitor inside one workspace." },
      { number: "2", title: "Receive prioritized signals", description: "adoptan.ai detects changes, groups them, and shows what actually matters first." },
      { number: "3", title: "Approve and trigger action", description: "Your team validates the signal, adds context, and launches the alert, export, or publish step you want." }
    ],

    // Creator workflow
    creatorTitle: "Creator workflow and publishing",
    creatorLead:
      "For content teams, adoptan.ai supports short-form publishing with real user control.",
    creatorItems: [
      {
        icon: "🎬",
        title: "Manual content selection",
        description: "The authenticated user chooses the clip or excerpt to publish. Nothing is sent without approval."
      },
      {
        icon: "✍️",
        title: "Caption and settings",
        description: "The user writes the caption and chooses the available privacy and interaction settings."
      },
      {
        icon: "🚀",
        title: "Publish from the workspace",
        description: "adoptan.ai only starts the publish action requested by the signed-in user, at the moment they choose."
      }
    ],

    // What we track
    trackTitle: "What adoptan.ai can monitor",
    trackLead: "From market signals to creator workflows, depending on your team.",
    trackItems: [
      { icon: "🌐", title: "Strategic pages", description: "Product pages, pricing pages, changelogs, and documentation" },
      { icon: "💰", title: "Pricing and catalogs", description: "Price changes, stock changes, bundles, offers, and listings" },
      { icon: "🚀", title: "Launches and changelogs", description: "New features, campaigns, announcements, and movement signals" },
      { icon: "📱", title: "Social accounts and creators", description: "Posts, profiles, new formats, activity levels, and publishing cadence" },
      { icon: "⭐", title: "Reputation and feedback", description: "Reviews, comments, sentiment, and repeated friction points" },
      { icon: "🗃️", title: "Publishing queues", description: "Content waiting to be reviewed, approved, and published through a controlled workflow" }
    ],

    // Pricing
    pricingTitle: "Simple plans",
    pricingLead: "Start with a light workflow, then add more sources, teammates, and automation as you grow.",
    plans: [
      {
        name: "Starter",
        price: "€29",
        period: "/month",
        description: "For a first production-ready watchlist",
        features: ["3 watchlists", "Daily email digest", "1 approval workflow", "1 user"],
        cta: "Get started",
        featured: false
      },
      {
        name: "Pro",
        price: "€99",
        period: "/month",
        description: "For teams that need to move faster",
        features: ["20 watchlists", "Real-time alerts", "Creator and publishing workflows", "Advanced AI analysis", "5 users"],
        cta: "Start Pro",
        featured: true
      },
      {
        name: "Enterprise",
        price: "Custom",
        period: "",
        description: "For multi-brand or multi-country teams",
        features: ["Unlimited sources", "SSO / RBAC", "Custom workflows", "Priority support", "API & exports"],
        cta: "Talk to sales",
        featured: false
      }
    ],

    // CTA
    ctaTitle: "See sooner. Decide faster.",
    ctaLead:
      "adoptan.ai helps teams detect useful signals, coordinate validation, and launch the right action at the right moment.",
    ctaButton: "Talk to the team",
    complianceNote:
      "Third-party integrations require user authorization and respect the publishing settings made available by each platform.",

    // Footer
    footerTagline: "Signals in. Decisions out.",
    footerProduct: "Product",
    footerWorkflow: "Workflow",
    footerPricing: "Pricing",
    footerContact: "Contact",
    footerPrivacy: "Privacy",
    footerTerms: "Terms",
    footerNote:
      "Desktop and web workspace for monitoring, analysis, and user-approved publishing workflows."
  }
};

export type Lang = keyof typeof translations;
