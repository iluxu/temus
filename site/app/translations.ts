export const translations = {
  en: {
    // Nav
    navProduct: "Product",
    navPricing: "Pricing",
    navDocs: "Docs",
    navContact: "Contact",
    langSwitch: "FR",

    // Hero
    badge: "Now in private beta",
    heroTitle: "Infrastructure for",
    heroTitleHighlight: "AI agents",
    heroLead: "Deploy, monitor, and control AI agents across your organization. One platform for visibility, compliance, and governance.",
    ctaPrimary: "Request access",
    ctaSecondary: "View demo",

    // Stats
    stats: [
      { value: "99.9%", label: "Uptime SLA" },
      { value: "<50ms", label: "Latency" },
      { value: "SOC 2", label: "Compliant" }
    ],

    // Features
    featuresTitle: "Everything you need to manage AI agents",
    featuresLead: "From deployment to monitoring to compliance. All in one platform.",
    features: [
      {
        icon: "🎯",
        title: "Centralized control",
        description: "All AI agents run through your ADOPTAN dashboard. See every action, every query, every response."
      },
      {
        icon: "📊",
        title: "Real-time monitoring",
        description: "Track usage, performance, and costs across all agents. Get alerts when something needs attention."
      },
      {
        icon: "🔒",
        title: "Enterprise security",
        description: "SSO, role-based access, audit logs, and data encryption. Meet compliance requirements easily."
      },
      {
        icon: "⚡",
        title: "Easy deployment",
        description: "Deploy agents from our registry or bring your own. One-click setup, instant scaling."
      }
    ],

    // How it works
    howTitle: "How it works",
    howLead: "Get started in minutes, not months.",
    steps: [
      { number: "1", title: "Connect", description: "Integrate with SSO and existing tools" },
      { number: "2", title: "Deploy", description: "Install agents from registry" },
      { number: "3", title: "Monitor", description: "Track all AI activity" },
      { number: "4", title: "Control", description: "Set policies and permissions" }
    ],

    // Value prop
    valueTitle: "Your AI agents, under control",
    valueLead: "ADOPTAN.AI gives you complete visibility and control over every AI agent in your organization. No more shadow AI, no more compliance risks.",
    valuePoints: [
      "Full audit trail for every action",
      "Role-based access controls",
      "Data loss prevention built-in",
      "GDPR and SOC 2 compliant"
    ],

    // Pricing
    pricingTitle: "Simple, transparent pricing",
    pricingLead: "Start free, scale as you grow. No hidden fees.",
    plans: [
      {
        name: "Starter",
        price: "Free",
        period: "",
        description: "For teams exploring AI agents",
        features: ["Up to 5 users", "3 agents", "7-day logs", "Community support"],
        cta: "Get started",
        featured: false
      },
      {
        name: "Team",
        price: "€49",
        period: "/user/month",
        description: "For growing teams that need control",
        features: ["Unlimited users", "Unlimited agents", "90-day logs", "SSO integration", "Priority support"],
        cta: "Start free trial",
        featured: true
      },
      {
        name: "Enterprise",
        price: "Custom",
        period: "",
        description: "For organizations with advanced needs",
        features: ["Everything in Team", "Unlimited logs", "Custom policies", "Dedicated support", "SLA guarantee", "On-premise option"],
        cta: "Contact sales",
        featured: false
      }
    ],

    // CTA
    ctaTitle: "Ready to take control?",
    ctaLead: "Join leading companies using ADOPTAN.AI to manage their AI infrastructure.",
    ctaButton: "Request access",

    // Footer
    footerLinks: ["Product", "Pricing", "Docs", "Contact"]
  },

  fr: {
    // Nav
    navProduct: "Produit",
    navPricing: "Tarifs",
    navDocs: "Docs",
    navContact: "Contact",
    langSwitch: "EN",

    // Hero
    badge: "Bêta privée",
    heroTitle: "L'infrastructure pour",
    heroTitleHighlight: "vos agents IA",
    heroLead: "Déployez, surveillez et contrôlez les agents IA dans votre organisation. Une plateforme pour la visibilité, la conformité et la gouvernance.",
    ctaPrimary: "Demander un accès",
    ctaSecondary: "Voir la démo",

    // Stats
    stats: [
      { value: "99.9%", label: "SLA Uptime" },
      { value: "<50ms", label: "Latence" },
      { value: "SOC 2", label: "Conforme" }
    ],

    // Features
    featuresTitle: "Tout ce qu'il faut pour gérer vos agents IA",
    featuresLead: "Du déploiement au monitoring à la conformité. Tout en une plateforme.",
    features: [
      {
        icon: "🎯",
        title: "Contrôle centralisé",
        description: "Tous les agents IA passent par votre dashboard ADOPTAN. Voyez chaque action, chaque requête, chaque réponse."
      },
      {
        icon: "📊",
        title: "Monitoring temps réel",
        description: "Suivez l'usage, la performance et les coûts de tous vos agents. Alertes quand quelque chose nécessite attention."
      },
      {
        icon: "🔒",
        title: "Sécurité entreprise",
        description: "SSO, contrôle d'accès par rôle, logs d'audit et chiffrement des données. Conformité simplifiée."
      },
      {
        icon: "⚡",
        title: "Déploiement simple",
        description: "Déployez des agents depuis notre registry ou apportez les vôtres. Setup en un clic, scaling instantané."
      }
    ],

    // How it works
    howTitle: "Comment ça marche",
    howLead: "Démarrez en minutes, pas en mois.",
    steps: [
      { number: "1", title: "Connecter", description: "Intégrez via SSO et outils existants" },
      { number: "2", title: "Déployer", description: "Installez des agents depuis le registry" },
      { number: "3", title: "Monitorer", description: "Suivez toute l'activité IA" },
      { number: "4", title: "Contrôler", description: "Définissez politiques et permissions" }
    ],

    // Value prop
    valueTitle: "Vos agents IA, sous contrôle",
    valueLead: "ADOPTAN.AI vous donne une visibilité et un contrôle complets sur chaque agent IA de votre organisation. Plus de shadow AI, plus de risques de conformité.",
    valuePoints: [
      "Traçabilité complète de chaque action",
      "Contrôle d'accès par rôle",
      "Protection des données intégrée",
      "Conforme RGPD et SOC 2"
    ],

    // Pricing
    pricingTitle: "Tarifs simples et transparents",
    pricingLead: "Commencez gratuitement, évoluez selon vos besoins. Pas de frais cachés.",
    plans: [
      {
        name: "Starter",
        price: "Gratuit",
        period: "",
        description: "Pour les équipes qui découvrent les agents IA",
        features: ["Jusqu'à 5 utilisateurs", "3 agents", "Logs 7 jours", "Support communauté"],
        cta: "Commencer",
        featured: false
      },
      {
        name: "Team",
        price: "49€",
        period: "/utilisateur/mois",
        description: "Pour les équipes qui ont besoin de contrôle",
        features: ["Utilisateurs illimités", "Agents illimités", "Logs 90 jours", "Intégration SSO", "Support prioritaire"],
        cta: "Essai gratuit",
        featured: true
      },
      {
        name: "Enterprise",
        price: "Sur mesure",
        period: "",
        description: "Pour les organisations avec des besoins avancés",
        features: ["Tout Team inclus", "Logs illimités", "Politiques custom", "Support dédié", "SLA garanti", "Option on-premise"],
        cta: "Contacter",
        featured: false
      }
    ],

    // CTA
    ctaTitle: "Prêt à reprendre le contrôle ?",
    ctaLead: "Rejoignez les entreprises leaders qui utilisent ADOPTAN.AI pour gérer leur infrastructure IA.",
    ctaButton: "Demander un accès",

    // Footer
    footerLinks: ["Produit", "Tarifs", "Docs", "Contact"]
  }
};

export type Lang = keyof typeof translations;
