import type { ResourceRecord } from "./i18nFallback";

const directKeyFallbackResources: Record<string, ResourceRecord> = {
  en: {
    adminUsers: { smtpAuditAllOutcomes: "All outcomes" },
    apiRecovery: { preparing: "Preparing your workspace…", preparingDescription: "We’ll reconnect automatically when the service is ready.", reconnecting: "Reconnecting…", reconnected: "You’re back online.", reconnectedDescription: "Get Phame is connected and ready to use.", unavailableTitle: "We’re reconnecting Get Phame.", unavailableDescription: "The service is taking a little longer than expected. Your work is safe; try again when you’re ready.", offlineTitle: "You’re offline right now.", offlineDescription: "Check your Wi-Fi or mobile data, then try again. Your work stays safe on this device.", offlineStepOne: "Turn on Wi-Fi or mobile data.", offlineStepTwo: "Return here and tap Retry Connection.", retrying: "Trying again…", retry: "Try again", retryNow: "Retry now", retryConnection: "Retry Connection", networkStatusLabel: "Network status", networkOnline: "Online", networkOffline: "Offline" },
    nav: { mobileSettings: "Settings", mobileDashboard: "Stats", mobileAdmin: "Admin" },
    mainForm: {
      previewCustomer: "Customer", subjectRequired: "Enter an email subject.", subjectTooLong: "Keep the subject under {{max}} characters.", subjectSingleLine: "Keep the subject on one line.", bodyRequired: "Enter an email message.", bodyTooLong: "Keep the message under {{max}} characters.", yelpDirectLinkBlocked: "Remove the direct Yelp link. Get Phame will add a plain-text search instruction instead.", editMessageTitle: "Edit this message", editMessageDescription: "Personalize this email without changing your saved template.", resetToTemplate: "Reset", subjectLabel: "Subject", messageLabel: "Message", placeholderHelp: "Placeholders such as {{customerName}}, {{businessName}}, and {{platformLinks}} are filled automatically.", livePreview: "Live email preview", previewPlaceholder: "Add the customer and message details to see the final email.", sendingTo: "Sending to {{name}} ({{email}})", reviewAndSend: "Review & send", complianceReminderTitle: "Send responsibly", complianceReminderBody: "Use neutral wording, contact real customers only, and never offer incentives or filter by satisfaction.", finalPreviewTitle: "Review the final email", finalPreviewDescription: "Check the recipient and exact message before sending.", to: "To:", backToEdit: "Back to edit", confirmAndSend: "Confirm & send",
    },
    onboardingWizard: {
      dismissError: "Setup was closed, but we couldn't save that preference. You can resume it later from Settings.",
      stepContent: { step4: { title: "Connect WordPress", description: "Install the connector plugin on your WordPress site to auto-sync customers." } },
      steps: { wpConnector: "WP Plugin" },
      tooltips: {
        smtpPassword: { label: "Help with your email password", text: "Most email providers require an app password, not your regular sign-in password. Create one in your email account's security settings." },
        testConnection: { label: "Why test the connection?", text: "Test first to confirm your provider accepts these details. Nothing is saved or sent until you connect." },
        reviewPlatform: { label: "Help choosing a review platform", text: "Choose the place where customers should leave their reviews. You can add more platforms later in Settings." },
        reviewUrl: { label: "Help finding your review link", text: "Paste the direct review link—not your public profile page—so customers land on the write-a-review screen." },
        firstRequest: { label: "Why send a first request?", text: "Send one request to yourself first. It lets you review the customer experience before using it with clients." },
      },
      tour: { skip: "Skip Tour", show: "Show tips", skipTooltip: "Hide onboarding tips on this device", showTooltip: "Show onboarding tips again", skipSuccess: "Onboarding tips hidden. You can show them again at any time.", saveError: "We couldn't save your onboarding tips preference.", tipsRemaining: "{{count}} tips remain in this setup", tipsRemaining_one: "{{count}} tip remains in this setup", tipsRemaining_other: "{{count}} tips remain in this setup" },
    },
    activityTrend: { title: "Activity Trend", rangeAria: "Show {{days}} day trend", range: "{{days}}d", loading: "Loading activity trend", empty: "No activity in the last {{days}} days. Send your first request to see trends here.", sent: "Sent", opens: "Opens", clicks: "Clicks", openRate: "Open rate", clickRate: "Click rate", thisWeek: "This Week", priorWeek: "Prior Week", allTime: "All Time" },
    homePage: { setupProgressEyebrow: "Get started", setupProgressDescription: "Complete these four steps to make your review requests ready to send.", setupProgressCount: "{{completed}} of {{total}} complete", setupStepEmail: "Connect your email", setupStepEmailDescription: "Add your SMTP sending account.", setupActionEmail: "Connect", setupStepPlatform: "Add a review platform", setupStepPlatformDescription: "Choose where customers will leave reviews.", setupActionPlatform: "Add platform", setupStepContacts: "Import contacts", setupStepContactsDescription: "Upload or add your first customers.", setupActionContacts: "Import", setupStepSend: "Send your first request", setupStepSendDescription: "Preview the customer experience with a first send.", setupActionSend: "Send", setupStepComplete: "Complete", setupStepNumber: "Step {{step}}", loadingAnalytics: "Loading analytics" },
    settings: {
      fromNameDescription: "Customers will see this as the sender name in their inbox.",
      fromNameHint: "shown as sender",
      googleWorkspaceDescription: "We couldn't auto-detect your SMTP settings. Select your email provider below or enter settings manually.",
      googleWorkspaceTitle: "Using Google Workspace or a custom domain?",
      optional: "optional",
      replyToDescription: "Where customer replies will go. Leave blank to use your sending address.",
      smtpAutoDetected: "SMTP settings auto-detected for {{domain}}",
      onboardingTips: { title: "Onboarding tips", description: "Show contextual setup tips the next time you open onboarding. You can also change this inside the setup wizard.", enable: "Enable onboarding tips", disable: "Disable onboarding tips" },
      hapticFeedback: { title: "Haptic Feedback", description: "Use supported device vibration for taps and recovery confirmations. Reduced-motion settings are always respected.", enable: "Enable haptic feedback", disable: "Disable haptic feedback" },
    },
    step3Send: { optionalConnectorButton: "Set up WordPress connector instead (optional)" },
    pricingGrid: { title: "Choose the plan that fits your growth", savingsEyebrow: "Savings calculator", savingsTitle: "See what each commitment saves", savingsBasis: "Compared with paying monthly", monthlyAnnualCost: "for 12 months", annualSave: "Save {{amount}}", annualSavingsDetail: "{{price}} instead of {{monthly}} for year one", lifetimeSave: "Save {{amount}} by year two", lifetimePayback: "Pays for itself in about {{months}} months", heroSendRequests: "Send requests", heroAutomateFollowUps: "Automate follow-ups", heroTrackGrowth: "Track your growth", closeComparison: "Close comparison", includedLabel: "Included", planFeaturesLabel: "{{plan}} plan features", approximateThb: "≈ {{amount}} THB", guidance: { monthly: "Best for short-term flexibility.", annual: "Best recurring value at about $24.17 per month.", lifetime: "Best long-term value: $349 once, with no renewals." } },
    comparisonTable: { mobileTitle: "Compare plan features", mobileSubtitle: "Open the compact feature comparison", mobileAction: "Compare", mobileEyebrow: "Feature comparison", mobileDescription: "Compare Free, Pro, and Lifetime without leaving the upgrade page." },
  },
  es: {
    adminUsers: { smtpAuditAllOutcomes: "Todos los resultados" },
    apiRecovery: { preparing: "Preparando tu espacio de trabajo…", preparingDescription: "Nos reconectaremos automáticamente cuando el servicio esté listo.", reconnecting: "Reconectando…", reconnected: "Ya estás de nuevo en línea.", reconnectedDescription: "Get Phame está conectado y listo para usar.", unavailableTitle: "Estamos reconectando Get Phame.", unavailableDescription: "El servicio está tardando un poco más de lo esperado. Tu trabajo está seguro; inténtalo de nuevo cuando quieras.", offlineTitle: "Ahora mismo no tienes conexión.", offlineDescription: "Revisa tu Wi-Fi o datos móviles y vuelve a intentarlo. Tu trabajo permanece seguro en este dispositivo.", offlineStepOne: "Activa el Wi-Fi o los datos móviles.", offlineStepTwo: "Vuelve aquí y toca Reintentar conexión.", retrying: "Intentándolo de nuevo…", retry: "Intentar de nuevo", retryNow: "Reintentar ahora", retryConnection: "Reintentar conexión", networkStatusLabel: "Estado de la red", networkOnline: "En línea", networkOffline: "Sin conexión" },
    nav: { mobileSettings: "Ajustes", mobileDashboard: "Panel", mobileAdmin: "Admin" },
    mainForm: {
      previewCustomer: "Cliente", subjectRequired: "Introduce el asunto del correo.", subjectTooLong: "Mantén el asunto por debajo de {{max}} caracteres.", subjectSingleLine: "Mantén el asunto en una sola línea.", bodyRequired: "Introduce el mensaje del correo.", bodyTooLong: "Mantén el mensaje por debajo de {{max}} caracteres.", yelpDirectLinkBlocked: "Elimina el enlace directo de Yelp. Get Phame añadirá una instrucción de búsqueda en texto sin formato.", editMessageTitle: "Editar este mensaje", editMessageDescription: "Personaliza este correo sin cambiar la plantilla guardada.", resetToTemplate: "Restablecer", subjectLabel: "Asunto", messageLabel: "Mensaje", placeholderHelp: "Los marcadores {{customerName}}, {{businessName}} y {{platformLinks}} se completan automáticamente.", livePreview: "Vista previa del correo", previewPlaceholder: "Añade los datos del cliente y del mensaje para ver el correo final.", sendingTo: "Enviando a {{name}} ({{email}})", reviewAndSend: "Revisar y enviar", complianceReminderTitle: "Envía de forma responsable", complianceReminderBody: "Usa un lenguaje neutral, contacta solo a clientes reales y nunca ofrezcas incentivos ni filtres por satisfacción.", finalPreviewTitle: "Revisa el correo final", finalPreviewDescription: "Comprueba el destinatario y el mensaje exacto antes de enviarlo.", to: "Para:", backToEdit: "Volver a editar", confirmAndSend: "Confirmar y enviar",
    },
    onboardingWizard: {
      dismissError: "La configuración se cerró, pero no pudimos guardar esa preferencia. Puedes retomarla más tarde desde Configuración.",
      stepContent: { step4: { title: "Conectar WordPress", description: "Instala el plugin conector en tu sitio WordPress para sincronizar clientes automáticamente." } },
      steps: { wpConnector: "Plugin de WP" },
      tooltips: {
        smtpPassword: { label: "Ayuda con la contraseña de correo", text: "La mayoría de proveedores de correo requieren una contraseña de aplicación, no la contraseña habitual de inicio de sesión. Créala en la configuración de seguridad de tu cuenta de correo." },
        testConnection: { label: "¿Por qué probar la conexión?", text: "Haz una prueba primero para confirmar que tu proveedor acepta estos datos. No se guarda ni se envía nada hasta que te conectes." },
        reviewPlatform: { label: "Ayuda para elegir una plataforma de reseñas", text: "Elige el lugar donde los clientes deben dejar sus reseñas. Puedes añadir más plataformas después en Configuración." },
        reviewUrl: { label: "Ayuda para encontrar tu enlace de reseña", text: "Pega el enlace directo para dejar una reseña, no la página pública de tu perfil, para que los clientes lleguen a la pantalla de escribir una reseña." },
        firstRequest: { label: "¿Por qué enviar una primera solicitud?", text: "Envíate primero una solicitud a ti mismo. Así podrás revisar la experiencia del cliente antes de usarla con tus clientes." },
      },
      tour: { skip: "Omitir recorrido", show: "Mostrar consejos", skipTooltip: "Ocultar los consejos de configuración en este dispositivo", showTooltip: "Volver a mostrar los consejos de configuración", skipSuccess: "Los consejos de configuración se han ocultado. Puedes mostrarlos de nuevo cuando quieras.", saveError: "No pudimos guardar tu preferencia de consejos de configuración.", tipsRemaining: "Quedan {{count}} consejos en esta configuración", tipsRemaining_one: "Queda {{count}} consejo en esta configuración", tipsRemaining_other: "Quedan {{count}} consejos en esta configuración" },
    },
    activityTrend: { title: "Tendencia de actividad", rangeAria: "Mostrar tendencia de {{days}} días", range: "{{days}} días", loading: "Cargando tendencia de actividad", empty: "No hubo actividad en los últimos {{days}} días. Envía tu primera solicitud para ver tendencias aquí.", sent: "Enviados", opens: "Aperturas", clicks: "Clics", openRate: "Tasa de apertura", clickRate: "Tasa de clics", thisWeek: "Esta semana", priorWeek: "Semana anterior", allTime: "Todo el tiempo" },
    homePage: { setupProgressEyebrow: "Primeros pasos", setupProgressDescription: "Completa estos cuatro pasos para dejar listas tus solicitudes de reseña.", setupProgressCount: "{{completed}} de {{total}} completados", setupStepEmail: "Conecta tu correo", setupStepEmailDescription: "Añade tu cuenta de envío SMTP.", setupActionEmail: "Conectar", setupStepPlatform: "Añade una plataforma de reseñas", setupStepPlatformDescription: "Elige dónde dejarán las reseñas tus clientes.", setupActionPlatform: "Añadir", setupStepContacts: "Importa contactos", setupStepContactsDescription: "Carga o añade tus primeros clientes.", setupActionContacts: "Importar", setupStepSend: "Envía tu primera solicitud", setupStepSendDescription: "Prueba la experiencia del cliente con un primer envío.", setupActionSend: "Enviar", setupStepComplete: "Completado", setupStepNumber: "Paso {{step}}", loadingAnalytics: "Cargando analíticas" },
    settings: {
      fromNameDescription: "Los clientes verán esto como el nombre del remitente en su bandeja de entrada.",
      fromNameHint: "mostrado como remitente",
      googleWorkspaceDescription: "No pudimos detectar automáticamente tu configuración SMTP. Selecciona tu proveedor de correo abajo o introduce la configuración manualmente.",
      googleWorkspaceTitle: "¿Usas Google Workspace o un dominio personalizado?",
      optional: "opcional",
      replyToDescription: "A dónde se enviarán las respuestas de los clientes. Déjalo en blanco para usar tu dirección de envío.",
      smtpAutoDetected: "Configuración SMTP detectada automáticamente para {{domain}}",
      onboardingTips: { title: "Consejos de configuración", description: "Muestra consejos contextuales la próxima vez que abras la configuración. También puedes cambiarlo dentro del asistente.", enable: "Activar consejos de configuración", disable: "Desactivar consejos de configuración" },
      hapticFeedback: { title: "Respuesta háptica", description: "Usa la vibración compatible del dispositivo para los toques y las confirmaciones de reconexión. Siempre se respeta la preferencia de movimiento reducido.", enable: "Activar la respuesta háptica", disable: "Desactivar la respuesta háptica" },
    },
    step3Send: { optionalConnectorButton: "Configurar conector de WordPress en su lugar (opcional)" },
    pricingGrid: { title: "Elige el plan que se adapta a tu crecimiento", savingsEyebrow: "Calculadora de ahorro", savingsTitle: "Mira cuánto ahorra cada compromiso", savingsBasis: "Comparado con pagar mensualmente", monthlyAnnualCost: "por 12 meses", annualSave: "Ahorra {{amount}}", annualSavingsDetail: "{{price}} en lugar de {{monthly}} el primer año", lifetimeSave: "Ahorra {{amount}} antes del segundo año", lifetimePayback: "Se amortiza en unos {{months}} meses", heroSendRequests: "Enviar solicitudes", heroAutomateFollowUps: "Automatizar seguimientos", heroTrackGrowth: "Seguir tu crecimiento", closeComparison: "Cerrar comparación", includedLabel: "Incluido", planFeaturesLabel: "Funciones del plan {{plan}}", approximateThb: "≈ {{amount}} THB", guidance: { monthly: "Ideal para flexibilidad a corto plazo.", annual: "La mejor opción recurrente: unos $24.17 al mes.", lifetime: "La mejor opción a largo plazo: $349 una vez, sin renovaciones." } },
    comparisonTable: { mobileTitle: "Compara las funciones de los planes", mobileSubtitle: "Abre la comparación compacta de funciones", mobileAction: "Comparar", mobileEyebrow: "Comparación de funciones", mobileDescription: "Compara Gratis, Pro y De por vida sin salir de la página de mejora." },
  },
  fr: {
    adminUsers: { smtpAuditAllOutcomes: "Tous les résultats" },
    apiRecovery: { preparing: "Préparation de votre espace de travail…", preparingDescription: "Nous nous reconnecterons automatiquement lorsque le service sera prêt.", reconnecting: "Reconnexion…", reconnected: "Vous êtes de nouveau en ligne.", reconnectedDescription: "Get Phame est connecté et prêt à être utilisé.", unavailableTitle: "Nous reconnectons Get Phame.", unavailableDescription: "Le service prend un peu plus de temps que prévu. Votre travail est en sécurité ; réessayez quand vous êtes prêt.", offlineTitle: "Vous êtes actuellement hors ligne.", offlineDescription: "Vérifiez votre Wi-Fi ou vos données mobiles, puis réessayez. Votre travail reste en sécurité sur cet appareil.", offlineStepOne: "Activez le Wi-Fi ou les données mobiles.", offlineStepTwo: "Revenez ici et appuyez sur Réessayer la connexion.", retrying: "Nouvelle tentative…", retry: "Réessayer", retryNow: "Réessayer maintenant", retryConnection: "Réessayer la connexion", networkStatusLabel: "État du réseau", networkOnline: "En ligne", networkOffline: "Hors ligne" },
    nav: { mobileSettings: "Réglages", mobileDashboard: "Stats", mobileAdmin: "Admin" },
    mainForm: {
      previewCustomer: "Client", subjectRequired: "Saisissez l’objet de l’e-mail.", subjectTooLong: "Limitez l’objet à {{max}} caractères.", subjectSingleLine: "Conservez l’objet sur une seule ligne.", bodyRequired: "Saisissez le message de l’e-mail.", bodyTooLong: "Limitez le message à {{max}} caractères.", yelpDirectLinkBlocked: "Supprimez le lien Yelp direct. Get Phame ajoutera plutôt une instruction de recherche en texte brut.", editMessageTitle: "Modifier ce message", editMessageDescription: "Personnalisez cet e-mail sans modifier votre modèle enregistré.", resetToTemplate: "Réinitialiser", subjectLabel: "Objet", messageLabel: "Message", placeholderHelp: "Les variables {{customerName}}, {{businessName}} et {{platformLinks}} sont remplies automatiquement.", livePreview: "Aperçu de l’e-mail", previewPlaceholder: "Ajoutez les coordonnées du client et le message pour voir l’e-mail final.", sendingTo: "Envoi à {{name}} ({{email}})", reviewAndSend: "Vérifier et envoyer", complianceReminderTitle: "Envoyez de manière responsable", complianceReminderBody: "Utilisez un ton neutre, contactez uniquement de vrais clients et n’offrez jamais d’avantage ni de filtrage selon la satisfaction.", finalPreviewTitle: "Vérifiez l’e-mail final", finalPreviewDescription: "Vérifiez le destinataire et le message exact avant l’envoi.", to: "À :", backToEdit: "Revenir à la modification", confirmAndSend: "Confirmer et envoyer",
    },
    onboardingWizard: {
      dismissError: "La configuration a été fermée, mais nous n'avons pas pu enregistrer cette préférence. Vous pouvez la reprendre plus tard depuis Paramètres.",
      stepContent: { step4: { title: "Connecter WordPress", description: "Installez le plugin connecteur sur votre site WordPress pour synchroniser automatiquement les clients." } },
      steps: { wpConnector: "Plugin WP" },
      tooltips: {
        smtpPassword: { label: "Aide pour le mot de passe de messagerie", text: "La plupart des fournisseurs de messagerie exigent un mot de passe d'application, et non votre mot de passe de connexion habituel. Créez-en un dans les paramètres de sécurité de votre compte." },
        testConnection: { label: "Pourquoi tester la connexion ?", text: "Testez d'abord pour confirmer que votre fournisseur accepte ces informations. Rien n'est enregistré ni envoyé avant la connexion." },
        reviewPlatform: { label: "Aide pour choisir une plateforme d'avis", text: "Choisissez l'endroit où les clients doivent laisser leurs avis. Vous pourrez ajouter d'autres plateformes plus tard dans les Paramètres." },
        reviewUrl: { label: "Aide pour trouver votre lien d'avis", text: "Collez le lien direct pour laisser un avis, et non votre page de profil publique, afin que les clients arrivent sur l'écran de rédaction d'un avis." },
        firstRequest: { label: "Pourquoi envoyer une première demande ?", text: "Envoyez-vous d'abord une demande. Vous pourrez ainsi vérifier l'expérience client avant de l'utiliser avec vos clients." },
      },
      tour: { skip: "Ignorer la visite", show: "Afficher les conseils", skipTooltip: "Masquer les conseils de configuration sur cet appareil", showTooltip: "Afficher à nouveau les conseils de configuration", skipSuccess: "Les conseils de configuration sont masqués. Vous pouvez les afficher à nouveau à tout moment.", saveError: "Nous n'avons pas pu enregistrer votre préférence de conseils de configuration.", tipsRemaining: "Il reste {{count}} conseils dans cette configuration", tipsRemaining_one: "Il reste {{count}} conseil dans cette configuration", tipsRemaining_other: "Il reste {{count}} conseils dans cette configuration" },
    },
    activityTrend: { title: "Tendance d’activité", rangeAria: "Afficher la tendance sur {{days}} jours", range: "{{days}} j", loading: "Chargement de la tendance d’activité", empty: "Aucune activité au cours des {{days}} derniers jours. Envoyez votre première demande pour voir les tendances ici.", sent: "Envoyés", opens: "Ouvertures", clicks: "Clics", openRate: "Taux d’ouverture", clickRate: "Taux de clics", thisWeek: "Cette semaine", priorWeek: "Semaine précédente", allTime: "Depuis toujours" },
    homePage: { setupProgressEyebrow: "Premiers pas", setupProgressDescription: "Terminez ces quatre étapes pour préparer vos demandes d’avis.", setupProgressCount: "{{completed}} sur {{total}} terminées", setupStepEmail: "Connectez votre messagerie", setupStepEmailDescription: "Ajoutez votre compte d’envoi SMTP.", setupActionEmail: "Connecter", setupStepPlatform: "Ajoutez une plateforme d’avis", setupStepPlatformDescription: "Choisissez où vos clients laisseront leurs avis.", setupActionPlatform: "Ajouter", setupStepContacts: "Importez des contacts", setupStepContactsDescription: "Importez ou ajoutez vos premiers clients.", setupActionContacts: "Importer", setupStepSend: "Envoyez votre première demande", setupStepSendDescription: "Prévisualisez l’expérience client avec un premier envoi.", setupActionSend: "Envoyer", setupStepComplete: "Terminé", setupStepNumber: "Étape {{step}}", loadingAnalytics: "Chargement des statistiques" },
    settings: {
      fromNameDescription: "Les clients verront ceci comme nom de l'expéditeur dans leur boîte de réception.",
      fromNameHint: "affiché comme expéditeur",
      googleWorkspaceDescription: "Nous n'avons pas pu détecter automatiquement vos paramètres SMTP. Sélectionnez votre fournisseur de messagerie ci-dessous ou saisissez les paramètres manuellement.",
      googleWorkspaceTitle: "Utilisez-vous Google Workspace ou un domaine personnalisé ?",
      optional: "facultatif",
      replyToDescription: "Où les réponses des clients seront envoyées. Laissez vide pour utiliser votre adresse d'envoi.",
      smtpAutoDetected: "Paramètres SMTP détectés automatiquement pour {{domain}}",
      onboardingTips: { title: "Conseils de configuration", description: "Affiche des conseils contextuels à la prochaine ouverture de la configuration. Vous pouvez aussi modifier ce réglage dans l’assistant.", enable: "Activer les conseils de configuration", disable: "Désactiver les conseils de configuration" },
      hapticFeedback: { title: "Retour haptique", description: "Utilisez la vibration des appareils compatibles pour les interactions et les confirmations de reconnexion. Le réglage de réduction des animations est toujours respecté.", enable: "Activer le retour haptique", disable: "Désactiver le retour haptique" },
    },
    step3Send: { optionalConnectorButton: "Configurer le connecteur WordPress à la place (facultatif)" },
    pricingGrid: { title: "Choisissez le plan adapté à votre croissance", heroSendRequests: "Envoyer des demandes", heroAutomateFollowUps: "Automatiser les relances", heroTrackGrowth: "Suivre votre croissance", closeComparison: "Fermer la comparaison", includedLabel: "Inclus", planFeaturesLabel: "Fonctionnalités du forfait {{plan}}", approximateThb: "≈ {{amount}} THB", guidance: { monthly: "Idéal pour une flexibilité à court terme.", annual: "Meilleure valeur récurrente, environ 24,17 $ par mois.", lifetime: "Meilleure valeur à long terme : 349 $ une fois, sans renouvellement." } },
    comparisonTable: { mobileTitle: "Comparez les fonctionnalités des plans", mobileSubtitle: "Ouvrez la comparaison compacte des fonctionnalités", mobileAction: "Comparer", mobileEyebrow: "Comparaison des fonctionnalités", mobileDescription: "Comparez Gratuit, Pro et À vie sans quitter la page de mise à niveau." },
  },
  it: {
    adminUsers: { smtpAuditAllOutcomes: "Tutti i risultati" },
    apiRecovery: { preparing: "Preparazione del tuo spazio di lavoro…", preparingDescription: "Ci ricollegheremo automaticamente quando il servizio sarà pronto.", reconnecting: "Riconnessione in corso…", reconnected: "Sei di nuovo online.", reconnectedDescription: "Get Phame è connesso e pronto all’uso.", unavailableTitle: "Stiamo riconnettendo Get Phame.", unavailableDescription: "Il servizio sta impiegando un po’ più del previsto. Il tuo lavoro è al sicuro; riprova quando vuoi.", offlineTitle: "Al momento sei offline.", offlineDescription: "Controlla il Wi-Fi o i dati mobili, quindi riprova. Il tuo lavoro resta al sicuro su questo dispositivo.", offlineStepOne: "Attiva il Wi-Fi o i dati mobili.", offlineStepTwo: "Torna qui e tocca Riprova connessione.", retrying: "Nuovo tentativo…", retry: "Riprova", retryNow: "Riprova ora", retryConnection: "Riprova connessione", networkStatusLabel: "Stato della rete", networkOnline: "Online", networkOffline: "Offline" },
    nav: { mobileSettings: "Impostaz.", mobileDashboard: "Dati", mobileAdmin: "Admin" },
    mainForm: {
      previewCustomer: "Cliente", subjectRequired: "Inserisci l’oggetto dell’email.", subjectTooLong: "Mantieni l’oggetto entro {{max}} caratteri.", subjectSingleLine: "Mantieni l’oggetto su una sola riga.", bodyRequired: "Inserisci il messaggio dell’email.", bodyTooLong: "Mantieni il messaggio entro {{max}} caratteri.", yelpDirectLinkBlocked: "Rimuovi il link diretto a Yelp. Get Phame inserirà invece un’istruzione di ricerca in testo semplice.", editMessageTitle: "Modifica questo messaggio", editMessageDescription: "Personalizza questa email senza modificare il modello salvato.", resetToTemplate: "Reimposta", subjectLabel: "Oggetto", messageLabel: "Messaggio", placeholderHelp: "I segnaposto {{customerName}}, {{businessName}} e {{platformLinks}} vengono compilati automaticamente.", livePreview: "Anteprima email in tempo reale", previewPlaceholder: "Aggiungi i dati del cliente e il messaggio per vedere l’email finale.", sendingTo: "Invio a {{name}} ({{email}})", reviewAndSend: "Rivedi e invia", complianceReminderTitle: "Invia responsabilmente", complianceReminderBody: "Usa un linguaggio neutro, contatta solo clienti reali e non offrire mai incentivi né filtrare in base alla soddisfazione.", finalPreviewTitle: "Rivedi l’email finale", finalPreviewDescription: "Controlla il destinatario e il messaggio esatto prima dell’invio.", to: "A:", backToEdit: "Torna alla modifica", confirmAndSend: "Conferma e invia",
    },
    onboardingWizard: {
      dismissError: "La configurazione è stata chiusa, ma non abbiamo potuto salvare quella preferenza. Puoi riprenderla più tardi da Impostazioni.",
      stepContent: { step4: { title: "Connetti WordPress", description: "Installa il plugin connettore sul tuo sito WordPress per sincronizzare automaticamente i clienti." } },
      steps: { wpConnector: "Plugin WP" },
      tooltips: {
        smtpPassword: { label: "Aiuto per la password email", text: "La maggior parte dei provider email richiede una password per l'app, non la normale password di accesso. Creala nelle impostazioni di sicurezza del tuo account email." },
        testConnection: { label: "Perché testare la connessione?", text: "Esegui prima un test per confermare che il tuo provider accetti questi dati. Nulla viene salvato o inviato fino alla connessione." },
        reviewPlatform: { label: "Aiuto nella scelta della piattaforma di recensioni", text: "Scegli dove i clienti devono lasciare le recensioni. Potrai aggiungere altre piattaforme in seguito dalle Impostazioni." },
        reviewUrl: { label: "Aiuto per trovare il link delle recensioni", text: "Incolla il link diretto per lasciare una recensione, non la pagina pubblica del profilo, così i clienti arrivano alla schermata per scrivere una recensione." },
        firstRequest: { label: "Perché inviare una prima richiesta?", text: "Invia prima una richiesta a te stesso. Potrai controllare l'esperienza del cliente prima di usarla con i tuoi clienti." },
      },
      tour: { skip: "Salta il tour", show: "Mostra suggerimenti", skipTooltip: "Nascondi i suggerimenti di configurazione su questo dispositivo", showTooltip: "Mostra di nuovo i suggerimenti di configurazione", skipSuccess: "I suggerimenti di configurazione sono nascosti. Puoi mostrarli di nuovo in qualsiasi momento.", saveError: "Non è stato possibile salvare la preferenza dei suggerimenti di configurazione.", tipsRemaining: "Restano {{count}} suggerimenti in questa configurazione", tipsRemaining_one: "Resta {{count}} suggerimento in questa configurazione", tipsRemaining_other: "Restano {{count}} suggerimenti in questa configurazione" },
    },
    activityTrend: { title: "Andamento attività", rangeAria: "Mostra andamento di {{days}} giorni", range: "{{days}} g", loading: "Caricamento andamento attività", empty: "Nessuna attività negli ultimi {{days}} giorni. Invia la tua prima richiesta per vedere le tendenze qui.", sent: "Inviati", opens: "Aperture", clicks: "Clic", openRate: "Tasso di apertura", clickRate: "Tasso di clic", thisWeek: "Questa settimana", priorWeek: "Settimana precedente", allTime: "Sempre" },
    homePage: { setupProgressEyebrow: "Per iniziare", setupProgressDescription: "Completa questi quattro passaggi per preparare le richieste di recensione.", setupProgressCount: "{{completed}} di {{total}} completati", setupStepEmail: "Collega la tua email", setupStepEmailDescription: "Aggiungi il tuo account di invio SMTP.", setupActionEmail: "Collega", setupStepPlatform: "Aggiungi una piattaforma di recensioni", setupStepPlatformDescription: "Scegli dove i clienti lasceranno le recensioni.", setupActionPlatform: "Aggiungi", setupStepContacts: "Importa contatti", setupStepContactsDescription: "Carica o aggiungi i tuoi primi clienti.", setupActionContacts: "Importa", setupStepSend: "Invia la tua prima richiesta", setupStepSendDescription: "Controlla l’esperienza cliente con un primo invio.", setupActionSend: "Invia", setupStepComplete: "Completato", setupStepNumber: "Passaggio {{step}}", loadingAnalytics: "Caricamento delle analisi" },
    settings: {
      fromNameDescription: "I clienti vedranno questo come nome del mittente nella loro casella di posta.",
      fromNameHint: "visualizzato come mittente",
      googleWorkspaceDescription: "Non siamo riusciti a rilevare automaticamente le impostazioni SMTP. Seleziona il tuo provider email qui sotto o inserisci le impostazioni manualmente.",
      googleWorkspaceTitle: "Usi Google Workspace o un dominio personalizzato?",
      optional: "opzionale",
      replyToDescription: "Dove arriveranno le risposte dei clienti. Lascia vuoto per usare il tuo indirizzo di invio.",
      smtpAutoDetected: "Impostazioni SMTP rilevate automaticamente per {{domain}}",
      onboardingTips: { title: "Suggerimenti di configurazione", description: "Mostra suggerimenti contestuali alla prossima apertura della configurazione. Puoi modificarli anche nell’assistente.", enable: "Attiva suggerimenti di configurazione", disable: "Disattiva suggerimenti di configurazione" },
      hapticFeedback: { title: "Feedback aptico", description: "Usa la vibrazione dei dispositivi supportati per i tocchi e le conferme di riconnessione. L’impostazione per ridurre il movimento viene sempre rispettata.", enable: "Attiva il feedback aptico", disable: "Disattiva il feedback aptico" },
    },
    step3Send: { optionalConnectorButton: "Configura invece il connettore WordPress (opzionale)" },
    pricingGrid: { title: "Scegli il piano adatto alla tua crescita", heroSendRequests: "Invia richieste", heroAutomateFollowUps: "Automatizza i follow-up", heroTrackGrowth: "Monitora la crescita", closeComparison: "Chiudi il confronto", includedLabel: "Incluso", planFeaturesLabel: "Funzionalità del piano {{plan}}", approximateThb: "≈ {{amount}} THB", guidance: { monthly: "Ideale per la flessibilità a breve termine.", annual: "Il miglior valore ricorrente, circa $24.17 al mese.", lifetime: "Il miglior valore a lungo termine: $349 una volta, senza rinnovi." } },
    comparisonTable: { mobileTitle: "Confronta le funzionalità dei piani", mobileSubtitle: "Apri il confronto compatto delle funzionalità", mobileAction: "Confronta", mobileEyebrow: "Confronto delle funzionalità", mobileDescription: "Confronta Gratis, Pro e A vita senza lasciare la pagina di upgrade." },
    pricingCard: { guarantee: "Garanzia di rimborso entro 7 giorni" },
    upgradeFaq: {
      title: "Domande frequenti",
      q1: "L'offerta a vita prevede davvero un solo pagamento?",
      a1: "Sì — paghi $349 una sola volta e Get Phame è tuo per sempre. Nessuna tariffa mensile, nessun rinnovo, nessuna sorpresa. Sono inoltre inclusi tutti gli aggiornamenti futuri.",
      q2: "Cosa succede se annullo un piano mensile o annuale?",
      a2: "Mantieni l'accesso fino alla fine del periodo di fatturazione in corso. Successivamente il tuo account tornerà al piano Free: 10 richieste iniziali, poi 5 ogni 30 giorni a rotazione. I tuoi contatti e la cronologia non vengono mai cancellati.",
      q3: "Posso passare da un piano mensile a uno annuale in seguito?",
      a3: "Sì. Puoi eseguire l'upgrade da mensile ad annuale o a vita in qualsiasi momento dalle Impostazioni. La parte non utilizzata del piano corrente non viene rimborsata, ma il nuovo piano parte immediatamente.",
      q4: "Esiste una politica di rimborso?",
      a4: "Offriamo un rimborso entro 7 giorni su tutti i piani, senza domande. Contatta support@getphame.app entro 7 giorni dall'acquisto e provvederemo al rimborso entro 24 ore.",
      q5: "Il piano a vita copre più sedi?",
      a5: "Il piano a vita copre una sola attività/sede. Se gestisci più sedi, avrai bisogno di un account separato per ciascuna. Contattaci per tariffe dedicate ad agenzie o multi-sede.",
      q6: "Quali metodi di pagamento sono accettati?",
      a6: "Tutte le principali carte di credito e debito tramite Stripe. Gli utenti thailandesi possono anche pagare tramite PromptPay — seleziona l'opzione PromptPay sotto il pulsante principale di checkout.",
    },
  },
  th: {
    adminUsers: { smtpAuditAllOutcomes: "ผลลัพธ์ทั้งหมด" },
    apiRecovery: { preparing: "กำลังเตรียมพื้นที่ทำงานของคุณ…", preparingDescription: "เราจะเชื่อมต่อใหม่โดยอัตโนมัติเมื่อบริการพร้อมใช้งาน", reconnecting: "กำลังเชื่อมต่อใหม่…", reconnected: "คุณกลับมาออนไลน์แล้ว", reconnectedDescription: "Get Phame เชื่อมต่อแล้วและพร้อมใช้งาน", unavailableTitle: "เรากำลังเชื่อมต่อ Get Phame ใหม่", unavailableDescription: "บริการใช้เวลานานกว่าที่คาดไว้เล็กน้อย งานของคุณยังปลอดภัย ลองอีกครั้งเมื่อคุณพร้อม", offlineTitle: "ขณะนี้คุณออฟไลน์อยู่", offlineDescription: "ตรวจสอบ Wi-Fi หรือข้อมูลมือถือ แล้วลองอีกครั้ง งานของคุณยังปลอดภัยบนอุปกรณ์นี้", offlineStepOne: "เปิด Wi-Fi หรือข้อมูลมือถือ", offlineStepTwo: "กลับมาที่นี่แล้วแตะ ลองเชื่อมต่ออีกครั้ง", retrying: "กำลังลองอีกครั้ง…", retry: "ลองอีกครั้ง", retryNow: "ลองอีกครั้งตอนนี้", retryConnection: "ลองเชื่อมต่ออีกครั้ง", networkStatusLabel: "สถานะเครือข่าย", networkOnline: "ออนไลน์", networkOffline: "ออฟไลน์" },
    nav: { mobileSettings: "ตั้งค่า", mobileDashboard: "สถิติ", mobileAdmin: "แอดมิน" },
    mainForm: {
      previewCustomer: "ลูกค้า", subjectRequired: "กรุณากรอกหัวข้ออีเมล", subjectTooLong: "หัวข้อต้องไม่เกิน {{max}} อักขระ", subjectSingleLine: "หัวข้อต้องอยู่ในบรรทัดเดียว", bodyRequired: "กรุณากรอกข้อความอีเมล", bodyTooLong: "ข้อความต้องไม่เกิน {{max}} อักขระ", yelpDirectLinkBlocked: "ลบลิงก์ Yelp โดยตรง Get Phame จะเพิ่มคำแนะนำการค้นหาแบบข้อความธรรมดาแทน", editMessageTitle: "แก้ไขข้อความนี้", editMessageDescription: "ปรับแต่งอีเมลนี้โดยไม่เปลี่ยนเทมเพลตที่บันทึกไว้", resetToTemplate: "รีเซ็ต", subjectLabel: "หัวข้อ", messageLabel: "ข้อความ", placeholderHelp: "ตัวแทนค่า เช่น {{customerName}}, {{businessName}} และ {{platformLinks}} จะถูกกรอกโดยอัตโนมัติ", livePreview: "ตัวอย่างอีเมลแบบสด", previewPlaceholder: "เพิ่มข้อมูลลูกค้าและข้อความเพื่อดูอีเมลฉบับสุดท้าย", sendingTo: "กำลังส่งถึง {{name}} ({{email}})", reviewAndSend: "ตรวจสอบและส่ง", complianceReminderTitle: "ส่งอย่างรับผิดชอบ", complianceReminderBody: "ใช้ข้อความเป็นกลาง ติดต่อเฉพาะลูกค้าจริง และห้ามเสนอสิ่งจูงใจหรือคัดกรองตามความพึงพอใจ", finalPreviewTitle: "ตรวจสอบอีเมลฉบับสุดท้าย", finalPreviewDescription: "ตรวจสอบผู้รับและข้อความทั้งหมดก่อนส่ง", to: "ถึง:", backToEdit: "กลับไปแก้ไข", confirmAndSend: "ยืนยันและส่ง",
    },
    onboardingWizard: {
      dismissError: "การตั้งค่าถูกปิด แต่เราไม่สามารถบันทึกการตั้งค่านั้นได้ คุณสามารถกลับมาดำเนินการต่อได้ภายหลังจากการตั้งค่า",
      stepContent: { step4: { title: "เชื่อมต่อ WordPress", description: "ติดตั้งปลั๊กอินตัวเชื่อมบนเว็บไซต์ WordPress ของคุณเพื่อซิงค์ลูกค้าโดยอัตโนมัติ" } },
      steps: { wpConnector: "ปลั๊กอิน WP" },
      tooltips: {
        smtpPassword: { label: "ความช่วยเหลือเกี่ยวกับรหัสผ่านอีเมล", text: "ผู้ให้บริการอีเมลส่วนใหญ่ต้องใช้รหัสผ่านสำหรับแอป ไม่ใช่รหัสผ่านเข้าสู่ระบบปกติของคุณ สร้างรหัสผ่านได้จากการตั้งค่าความปลอดภัยของบัญชีอีเมล" },
        testConnection: { label: "เหตุใดจึงต้องทดสอบการเชื่อมต่อ", text: "ทดสอบก่อนเพื่อยืนยันว่าผู้ให้บริการของคุณยอมรับข้อมูลนี้ จะไม่มีการบันทึกหรือส่งข้อมูลจนกว่าคุณจะเชื่อมต่อ" },
        reviewPlatform: { label: "ความช่วยเหลือในการเลือกแพลตฟอร์มรีวิว", text: "เลือกสถานที่ที่ต้องการให้ลูกค้าเขียนรีวิว คุณสามารถเพิ่มแพลตฟอร์มอื่นได้ภายหลังในการตั้งค่า" },
        reviewUrl: { label: "ความช่วยเหลือในการค้นหาลิงก์รีวิว", text: "วางลิงก์สำหรับเขียนรีวิวโดยตรง ไม่ใช่หน้าสาธารณะของโปรไฟล์ เพื่อให้ลูกค้าไปถึงหน้าที่เขียนรีวิวได้" },
        firstRequest: { label: "เหตุใดจึงต้องส่งคำขอแรก", text: "ส่งคำขอให้ตัวเองก่อน เพื่อให้คุณตรวจสอบประสบการณ์ของลูกค้าก่อนนำไปใช้กับลูกค้าจริง" },
      },
      tour: { skip: "ข้ามทัวร์", show: "แสดงคำแนะนำ", skipTooltip: "ซ่อนคำแนะนำการตั้งค่าบนอุปกรณ์นี้", showTooltip: "แสดงคำแนะนำการตั้งค่าอีกครั้ง", skipSuccess: "ซ่อนคำแนะนำการตั้งค่าแล้ว คุณสามารถแสดงอีกครั้งได้ทุกเมื่อ", saveError: "เราไม่สามารถบันทึกการตั้งค่าคำแนะนำการเริ่มต้นใช้งานของคุณได้", tipsRemaining: "เหลือคำแนะนำ {{count}} รายการในการตั้งค่านี้", tipsRemaining_one: "เหลือคำแนะนำ {{count}} รายการในการตั้งค่านี้", tipsRemaining_other: "เหลือคำแนะนำ {{count}} รายการในการตั้งค่านี้" },
    },
    activityTrend: { title: "แนวโน้มกิจกรรม", rangeAria: "แสดงแนวโน้ม {{days}} วัน", range: "{{days}} วัน", loading: "กำลังโหลดแนวโน้มกิจกรรม", empty: "ไม่มีกิจกรรมในช่วง {{days}} วันที่ผ่านมา ส่งคำขอแรกของคุณเพื่อดูแนวโน้มที่นี่", sent: "ส่งแล้ว", opens: "เปิดแล้ว", clicks: "คลิก", openRate: "อัตราการเปิด", clickRate: "อัตราการคลิก", thisWeek: "สัปดาห์นี้", priorWeek: "สัปดาห์ก่อน", allTime: "ทั้งหมด" },
    homePage: { setupProgressEyebrow: "เริ่มต้นใช้งาน", setupProgressDescription: "ทำ 4 ขั้นตอนนี้ให้เสร็จเพื่อเตรียมคำขอรีวิวให้พร้อมส่ง", setupProgressCount: "เสร็จแล้ว {{completed}} จาก {{total}}", setupStepEmail: "เชื่อมต่ออีเมลของคุณ", setupStepEmailDescription: "เพิ่มบัญชี SMTP สำหรับส่งอีเมล", setupActionEmail: "เชื่อมต่อ", setupStepPlatform: "เพิ่มแพลตฟอร์มรีวิว", setupStepPlatformDescription: "เลือกที่ที่ลูกค้าจะเขียนรีวิว", setupActionPlatform: "เพิ่ม", setupStepContacts: "นำเข้ารายชื่อติดต่อ", setupStepContactsDescription: "อัปโหลดหรือเพิ่มลูกค้ากลุ่มแรกของคุณ", setupActionContacts: "นำเข้า", setupStepSend: "ส่งคำขอแรกของคุณ", setupStepSendDescription: "ดูประสบการณ์ลูกค้าด้วยการส่งครั้งแรก", setupActionSend: "ส่ง", setupStepComplete: "เสร็จแล้ว", setupStepNumber: "ขั้นตอนที่ {{step}}", loadingAnalytics: "กำลังโหลดข้อมูลวิเคราะห์" },
    settings: {
      fromNameDescription: "ลูกค้าจะเห็นสิ่งนี้เป็นชื่อผู้ส่งในกล่องจดหมายของพวกเขา",
      fromNameHint: "แสดงเป็นผู้ส่ง",
      googleWorkspaceDescription: "เราไม่สามารถตรวจหาการตั้งค่า SMTP ของคุณโดยอัตโนมัติได้ เลือกผู้ให้บริการอีเมลด้านล่างหรือกรอกการตั้งค่าด้วยตนเอง",
      googleWorkspaceTitle: "ใช้ Google Workspace หรือโดเมนที่กำหนดเองหรือไม่?",
      optional: "ไม่บังคับ",
      replyToDescription: "ที่อยู่สำหรับส่งการตอบกลับจากลูกค้า หากปล่อยว่างจะใช้ที่อยู่ส่งของคุณ",
      smtpAutoDetected: "พบการตั้งค่า SMTP อัตโนมัติสำหรับ {{domain}}",
      onboardingTips: { title: "คำแนะนำการเริ่มต้นใช้งาน", description: "แสดงคำแนะนำตามบริบทเมื่อคุณเปิดการเริ่มต้นใช้งานครั้งถัดไป คุณยังเปลี่ยนได้ในตัวช่วยตั้งค่า", enable: "เปิดใช้คำแนะนำการเริ่มต้นใช้งาน", disable: "ปิดใช้คำแนะนำการเริ่มต้นใช้งาน" },
      hapticFeedback: { title: "การตอบสนองแบบสั่น", description: "ใช้การสั่นของอุปกรณ์ที่รองรับสำหรับการแตะและการยืนยันเมื่อเชื่อมต่อกลับสำเร็จ โดยจะเคารพการตั้งค่าลดการเคลื่อนไหวเสมอ", enable: "เปิดการตอบสนองแบบสั่น", disable: "ปิดการตอบสนองแบบสั่น" },
    },
    step3Send: { optionalConnectorButton: "ตั้งค่าตัวเชื่อม WordPress แทน (ไม่บังคับ)" },
    pricingGrid: { title: "เลือกแพ็กเกจที่เหมาะกับการเติบโตของคุณ", heroSendRequests: "ส่งคำขอ", heroAutomateFollowUps: "ตั้งค่าการติดตามผลอัตโนมัติ", heroTrackGrowth: "ติดตามการเติบโต", closeComparison: "ปิดการเปรียบเทียบ", includedLabel: "รวมอยู่แล้ว", planFeaturesLabel: "คุณสมบัติของแผน {{plan}}", approximateThb: "≈ {{amount}} บาท", guidance: { monthly: "เหมาะสำหรับความยืดหยุ่นระยะสั้น", annual: "คุ้มค่าที่สุดสำหรับการชำระต่อเนื่อง ประมาณ $24.17 ต่อเดือน", lifetime: "คุ้มค่าที่สุดในระยะยาว: จ่าย $349 ครั้งเดียว ไม่มีการต่ออายุ" } },
    comparisonTable: { mobileTitle: "เปรียบเทียบฟีเจอร์ของแผน", mobileSubtitle: "เปิดการเปรียบเทียบฟีเจอร์แบบกระชับ", mobileAction: "เปรียบเทียบ", mobileEyebrow: "เปรียบเทียบฟีเจอร์", mobileDescription: "เปรียบเทียบแผนฟรี Pro และตลอดชีพโดยไม่ต้องออกจากหน้าอัปเกรด" },
  },
  "zh-CN": {
    adminUsers: { smtpAuditAllOutcomes: "所有结果" },
    apiRecovery: { preparing: "正在准备您的工作区…", preparingDescription: "服务就绪后，我们会自动重新连接。", reconnecting: "正在重新连接…", reconnected: "您已恢复在线。", reconnectedDescription: "Get Phame 已连接并可使用。", unavailableTitle: "我们正在重新连接 Get Phame。", unavailableDescription: "服务比预期需要更长时间。您的工作是安全的；准备好后请再试一次。", offlineTitle: "您当前处于离线状态。", offlineDescription: "请检查 Wi-Fi 或移动数据后再试一次。您的工作仍安全地保存在此设备上。", offlineStepOne: "打开 Wi-Fi 或移动数据。", offlineStepTwo: "返回此处并点击“重试连接”。", retrying: "正在重试…", retry: "再试一次", retryNow: "立即重试", retryConnection: "重试连接", networkStatusLabel: "网络状态", networkOnline: "在线", networkOffline: "离线" },
    nav: { mobileSettings: "设置", mobileDashboard: "数据", mobileAdmin: "管理" },
    mainForm: {
      previewCustomer: "客户", subjectRequired: "请输入邮件主题。", subjectTooLong: "主题请控制在 {{max}} 个字符以内。", subjectSingleLine: "主题必须保持为一行。", bodyRequired: "请输入邮件内容。", bodyTooLong: "邮件内容请控制在 {{max}} 个字符以内。", yelpDirectLinkBlocked: "请移除 Yelp 直接链接。Get Phame 会改为添加纯文本搜索说明。", editMessageTitle: "编辑此邮件", editMessageDescription: "自定义这封邮件，不会更改已保存的模板。", resetToTemplate: "重置", subjectLabel: "主题", messageLabel: "邮件内容", placeholderHelp: "{{customerName}}、{{businessName}} 和 {{platformLinks}} 等占位符会自动填充。", livePreview: "实时邮件预览", previewPlaceholder: "填写客户和邮件内容，即可查看最终邮件。", sendingTo: "正在发送给 {{name}}（{{email}}）", reviewAndSend: "检查并发送", complianceReminderTitle: "负责任地发送", complianceReminderBody: "使用中性措辞，只联系真实客户，绝不提供奖励，也不按满意度筛选。", finalPreviewTitle: "检查最终邮件", finalPreviewDescription: "请核对收件人和完整邮件内容。", to: "收件人：", backToEdit: "返回编辑", confirmAndSend: "确认并发送",
    },
    onboardingWizard: {
      dismissError: "已关闭设置，但我们无法保存该首选项。您可以稍后在设置中恢复。",
      stepContent: { step4: { title: "连接 WordPress", description: "在您的 WordPress 网站上安装连接插件，以自动同步客户。" } },
      steps: { wpConnector: "WP 插件" },
      tooltips: {
        smtpPassword: { label: "电子邮件密码帮助", text: "大多数邮件服务商要求使用应用专用密码，而不是您通常的登录密码。请在邮箱账户的安全设置中创建应用专用密码。" },
        testConnection: { label: "为什么要测试连接？", text: "请先测试以确认您的服务商接受这些信息。在您连接之前，不会保存或发送任何内容。" },
        reviewPlatform: { label: "选择评论平台的帮助", text: "请选择您希望客户留下评论的平台。之后您可以在“设置”中添加更多平台。" },
        reviewUrl: { label: "查找评论链接的帮助", text: "请粘贴直接撰写评论的链接，而不是公开个人资料页，以便客户直接进入写评论页面。" },
        firstRequest: { label: "为什么要发送第一条请求？", text: "请先向自己发送一条请求。这样您可以在向客户使用前检查客户体验。" },
      },
      tour: { skip: "跳过导览", show: "显示提示", skipTooltip: "在此设备上隐藏设置提示", showTooltip: "再次显示设置提示", skipSuccess: "已隐藏设置提示。您可以随时再次显示它们。", saveError: "无法保存您的设置提示偏好。", tipsRemaining: "此设置中还剩 {{count}} 条提示", tipsRemaining_one: "此设置中还剩 {{count}} 条提示", tipsRemaining_other: "此设置中还剩 {{count}} 条提示" },
    },
    activityTrend: { title: "活动趋势", rangeAria: "显示 {{days}} 天趋势", range: "{{days}} 天", loading: "正在加载活动趋势", empty: "过去 {{days}} 天没有活动。发送第一条请求后可在此查看趋势。", sent: "已发送", opens: "已打开", clicks: "点击", openRate: "打开率", clickRate: "点击率", thisWeek: "本周", priorWeek: "上周", allTime: "全部时间" },
    homePage: { setupProgressEyebrow: "开始使用", setupProgressDescription: "完成以下四步，即可准备发送评价请求。", setupProgressCount: "已完成 {{completed}} / {{total}}", setupStepEmail: "连接您的邮箱", setupStepEmailDescription: "添加您的 SMTP 发件账户。", setupActionEmail: "连接", setupStepPlatform: "添加评价平台", setupStepPlatformDescription: "选择客户将留下评价的位置。", setupActionPlatform: "添加", setupStepContacts: "导入联系人", setupStepContactsDescription: "上传或添加您的首批客户。", setupActionContacts: "导入", setupStepSend: "发送第一条请求", setupStepSendDescription: "通过首次发送预览客户体验。", setupActionSend: "发送", setupStepComplete: "已完成", setupStepNumber: "第 {{step}} 步", loadingAnalytics: "正在加载分析数据" },
    settings: {
      fromNameDescription: "客户在收件箱中会看到此项作为发件人名称。",
      fromNameHint: "显示为发件人",
      googleWorkspaceDescription: "我们无法自动检测到您的 SMTP 设置。请选择下面的邮件提供商或手动输入设置。",
      googleWorkspaceTitle: "使用 Google Workspace 或自定义域？",
      optional: "可选",
      replyToDescription: "客户回复将发送到哪里。留空以使用您的发送地址。",
      smtpAutoDetected: "已自动检测到 {{domain}} 的 SMTP 设置",
      onboardingTips: { title: "设置提示", description: "下次打开设置引导时显示相关提示。您也可以在设置向导中更改此选项。", enable: "启用设置提示", disable: "停用设置提示" },
      hapticFeedback: { title: "触觉反馈", description: "在支持的设备上使用振动来反馈点击和重新连接成功。始终遵循“减少动态效果”设置。", enable: "启用触觉反馈", disable: "停用触觉反馈" },
    },
    step3Send: { optionalConnectorButton: "改为设置 WordPress 连接器（可选）" },
    pricingGrid: { title: "选择适合您业务增长的方案", heroSendRequests: "发送请求", heroAutomateFollowUps: "自动跟进", heroTrackGrowth: "跟踪增长", closeComparison: "关闭对比", includedLabel: "已包含", planFeaturesLabel: "{{plan}} 方案功能", approximateThb: "约 {{amount}} 泰铢", guidance: { monthly: "适合需要短期灵活性的用户。", annual: "最佳续订价值，约每月 $24.17。", lifetime: "最佳长期价值：一次支付 $349，无需续订。" } },
    comparisonTable: { mobileTitle: "比较套餐功能", mobileSubtitle: "打开精简功能比较", mobileAction: "比较", mobileEyebrow: "功能比较", mobileDescription: "无需离开升级页面即可比较免费版、Pro 和终身版。" },
  },
  "zh-TW": {
    adminUsers: { smtpAuditAllOutcomes: "所有結果" },
    apiRecovery: { preparing: "正在準備您的工作區…", preparingDescription: "服務就緒後，我們會自動重新連線。", reconnecting: "正在重新連線…", reconnected: "您已恢復連線。", reconnectedDescription: "Get Phame 已連線並可使用。", unavailableTitle: "我們正在重新連線 Get Phame。", unavailableDescription: "服務比預期需要更長時間。您的工作是安全的；準備好後請再試一次。", offlineTitle: "您目前處於離線狀態。", offlineDescription: "請檢查 Wi-Fi 或行動數據後再試一次。您的工作仍安全地保存在此裝置上。", offlineStepOne: "開啟 Wi-Fi 或行動數據。", offlineStepTwo: "回到這裡並點選「重試連線」。", retrying: "正在重試…", retry: "再試一次", retryNow: "立即重試", retryConnection: "重試連線", networkStatusLabel: "網路狀態", networkOnline: "在線", networkOffline: "離線" },
    nav: { mobileSettings: "設定", mobileDashboard: "數據", mobileAdmin: "管理" },
    mainForm: {
      previewCustomer: "客戶", subjectRequired: "請輸入郵件主旨。", subjectTooLong: "主旨請控制在 {{max}} 個字元以內。", subjectSingleLine: "主旨須保持為一行。", bodyRequired: "請輸入郵件內容。", bodyTooLong: "郵件內容請控制在 {{max}} 個字元以內。", yelpDirectLinkBlocked: "請移除 Yelp 直接連結。Get Phame 會改為加入純文字搜尋說明。", editMessageTitle: "編輯此郵件", editMessageDescription: "自訂這封郵件，不會變更已儲存的範本。", resetToTemplate: "重設", subjectLabel: "主旨", messageLabel: "郵件內容", placeholderHelp: "{{customerName}}、{{businessName}} 和 {{platformLinks}} 等預留位置會自動填入。", livePreview: "即時郵件預覽", previewPlaceholder: "填寫客戶和郵件內容，即可查看最終郵件。", sendingTo: "傳送給 {{name}}（{{email}}）", reviewAndSend: "檢查並傳送", complianceReminderTitle: "負責任地傳送", complianceReminderBody: "使用中性措辭，只聯絡真實客戶，絕不提供獎勵，也不依滿意度篩選。", finalPreviewTitle: "檢查最終郵件", finalPreviewDescription: "傳送前請核對收件者和完整郵件內容。", to: "收件者：", backToEdit: "返回編輯", confirmAndSend: "確認並傳送",
    },
    onboardingWizard: {
      dismissError: "設定已關閉，但我們無法儲存該偏好。您可以稍後從設定恢復。",
      stepContent: { step4: { title: "連接 WordPress", description: "在您的 WordPress 網站上安裝連接外掛，以自動同步客戶。" } },
      steps: { wpConnector: "WP 外掛" },
      tooltips: {
        smtpPassword: { label: "電子郵件密碼說明", text: "大多數電子郵件服務商需要使用應用程式密碼，而非一般登入密碼。請在電子郵件帳戶的安全性設定中建立應用程式密碼。" },
        testConnection: { label: "為何要測試連線？", text: "請先測試以確認您的服務商接受這些資料。在您連線之前，不會儲存或傳送任何內容。" },
        reviewPlatform: { label: "選擇評論平台說明", text: "請選擇您希望客戶留下評論的平台。您稍後可在設定中新增更多平台。" },
        reviewUrl: { label: "尋找評論連結說明", text: "請貼上可直接撰寫評論的連結，而非公開個人資料頁，讓客戶直接進入寫評論畫面。" },
        firstRequest: { label: "為何要發送第一則邀請？", text: "請先發送一則邀請給自己。如此您可在提供給客戶前檢查客戶體驗。" },
      },
      tour: { skip: "略過導覽", show: "顯示提示", skipTooltip: "在此裝置隱藏設定提示", showTooltip: "再次顯示設定提示", skipSuccess: "已隱藏設定提示。您可隨時再次顯示。", saveError: "無法儲存您的設定提示偏好。", tipsRemaining: "此設定中還剩 {{count}} 個提示", tipsRemaining_one: "此設定中還剩 {{count}} 個提示", tipsRemaining_other: "此設定中還剩 {{count}} 個提示" },
    },
    activityTrend: { title: "活動趨勢", rangeAria: "顯示 {{days}} 天趨勢", range: "{{days}} 天", loading: "正在載入活動趨勢", empty: "過去 {{days}} 天沒有活動。發送第一則邀請後可在此查看趨勢。", sent: "已發送", opens: "已開啟", clicks: "點擊", openRate: "開啟率", clickRate: "點擊率", thisWeek: "本週", priorWeek: "上週", allTime: "全部時間" },
    homePage: { setupProgressEyebrow: "開始使用", setupProgressDescription: "完成以下四個步驟，即可準備好發送評論邀請。", setupProgressCount: "已完成 {{completed}} / {{total}}", setupStepEmail: "連接您的電子郵件", setupStepEmailDescription: "新增您的 SMTP 寄件帳戶。", setupActionEmail: "連接", setupStepPlatform: "新增評論平台", setupStepPlatformDescription: "選擇客戶留下評論的位置。", setupActionPlatform: "新增", setupStepContacts: "匯入聯絡人", setupStepContactsDescription: "上傳或新增首批客戶。", setupActionContacts: "匯入", setupStepSend: "發送第一則邀請", setupStepSendDescription: "透過首次發送預覽客戶體驗。", setupActionSend: "發送", setupStepComplete: "已完成", setupStepNumber: "第 {{step}} 步", loadingAnalytics: "正在載入分析資料" },
    settings: {
      fromNameDescription: "客戶在收件匣中會看到此項作為寄件人名稱。",
      fromNameHint: "顯示為寄件人",
      googleWorkspaceDescription: "我們無法自動偵測到您的 SMTP 設定。請在下方選擇您的電子郵件提供者或手動輸入設定。",
      googleWorkspaceTitle: "使用 Google Workspace 或自訂網域？",
      optional: "可選",
      replyToDescription: "客戶的回覆將寄到哪裡。若留空則使用您的發信地址。",
      smtpAutoDetected: "已自動偵測到 {{domain}} 的 SMTP 設定",
      onboardingTips: { title: "設定提示", description: "下次開啟設定引導時顯示相關提示。您也可以在設定精靈中變更此選項。", enable: "啟用設定提示", disable: "停用設定提示" },
      hapticFeedback: { title: "觸覺回饋", description: "在支援的裝置上使用振動來回饋點按和重新連線成功。始終遵循「減少動態效果」設定。", enable: "啟用觸覺回饋", disable: "停用觸覺回饋" },
    },
    step3Send: { optionalConnectorButton: "改為設定 WordPress 連接器（可選）" },
    pricingGrid: { title: "選擇適合您業務成長的方案", heroSendRequests: "傳送請求", heroAutomateFollowUps: "自動追蹤", heroTrackGrowth: "追蹤成長", closeComparison: "關閉比較", includedLabel: "已包含", planFeaturesLabel: "{{plan}} 方案功能", approximateThb: "約 {{amount}} 泰銖", guidance: { monthly: "適合需要短期彈性的使用者。", annual: "最佳續訂價值，約每月 $24.17。", lifetime: "最佳長期價值：一次支付 $349，無需續訂。" } },
    comparisonTable: { mobileTitle: "比較方案功能", mobileSubtitle: "開啟精簡功能比較", mobileAction: "比較", mobileEyebrow: "功能比較", mobileDescription: "無需離開升級頁面即可比較免費版、Pro 和終身版。" },
  },
};

const mailjetProviderFallbacks: Record<string, ResourceRecord> = {
  en: { label: "Mailjet", description: "Mailjet SMTP relay", usernameLabel: "Mailjet API key", usernamePlaceholder: "Public API key", secretLabel: "Mailjet Secret key", secretPlaceholder: "Secret key shown once by Mailjet", secretHelp: "Use the API Key as the username and the Secret Key as the password. Do not use your Mailjet account password.", fromEmailHelp: "This sender address or domain must already be validated in Mailjet." },
  es: { label: "Mailjet", description: "Relé SMTP de Mailjet", usernameLabel: "Clave API de Mailjet", usernamePlaceholder: "Clave API pública", secretLabel: "Clave secreta de Mailjet", secretPlaceholder: "Clave secreta mostrada una sola vez por Mailjet", secretHelp: "Usa la clave API como nombre de usuario y la clave secreta como contraseña. No uses la contraseña de tu cuenta de Mailjet.", fromEmailHelp: "Esta dirección o dominio remitente debe estar validado previamente en Mailjet." },
  fr: { label: "Mailjet", description: "Relais SMTP Mailjet", usernameLabel: "Clé API Mailjet", usernamePlaceholder: "Clé API publique", secretLabel: "Clé secrète Mailjet", secretPlaceholder: "Clé secrète affichée une seule fois par Mailjet", secretHelp: "Utilisez la clé API comme identifiant et la clé secrète comme mot de passe. N’utilisez pas le mot de passe de votre compte Mailjet.", fromEmailHelp: "Cette adresse ou ce domaine d’expéditeur doit déjà être validé dans Mailjet." },
  it: { label: "Mailjet", description: "Relay SMTP di Mailjet", usernameLabel: "Chiave API Mailjet", usernamePlaceholder: "Chiave API pubblica", secretLabel: "Chiave segreta Mailjet", secretPlaceholder: "Chiave segreta mostrata una sola volta da Mailjet", secretHelp: "Usa la chiave API come nome utente e la chiave segreta come password. Non usare la password del tuo account Mailjet.", fromEmailHelp: "Questo indirizzo o dominio mittente deve essere già convalidato in Mailjet." },
  th: { label: "Mailjet", description: "รีเลย์ SMTP ของ Mailjet", usernameLabel: "คีย์ API ของ Mailjet", usernamePlaceholder: "คีย์ API สาธารณะ", secretLabel: "คีย์ลับของ Mailjet", secretPlaceholder: "คีย์ลับที่ Mailjet แสดงเพียงครั้งเดียว", secretHelp: "ใช้คีย์ API เป็นชื่อผู้ใช้และคีย์ลับเป็นรหัสผ่าน อย่าใช้รหัสผ่านบัญชี Mailjet ของคุณ", fromEmailHelp: "ที่อยู่อีเมลหรือโดเมนผู้ส่งนี้ต้องผ่านการยืนยันใน Mailjet แล้ว" },
  "zh-CN": { label: "Mailjet", description: "Mailjet SMTP 中继", usernameLabel: "Mailjet API 密钥", usernamePlaceholder: "公共 API 密钥", secretLabel: "Mailjet Secret Key（私密密钥）", secretPlaceholder: "Mailjet 仅显示一次的 Secret Key", secretHelp: "使用 API Key 作为用户名，使用 Secret Key 作为密码。请勿使用 Mailjet 账户密码。", fromEmailHelp: "此发件人地址或域名必须已在 Mailjet 中完成验证。" },
  "zh-TW": { label: "Mailjet", description: "Mailjet SMTP 中繼", usernameLabel: "Mailjet API 金鑰", usernamePlaceholder: "公開 API 金鑰", secretLabel: "Mailjet Secret Key（私密金鑰）", secretPlaceholder: "Mailjet 僅顯示一次的 Secret Key", secretHelp: "請使用 API Key 作為使用者名稱，並使用 Secret Key 作為密碼。請勿使用 Mailjet 帳戶密碼。", fromEmailHelp: "此寄件地址或網域必須已在 Mailjet 完成驗證。" },
};

for (const [locale, mailjet] of Object.entries(mailjetProviderFallbacks)) {
  const localeResource = directKeyFallbackResources[locale];
  if (!localeResource) continue;
  const settings = (localeResource.settings ?? {}) as ResourceRecord;
  const bulkSender = (settings.bulkSender ?? {}) as ResourceRecord;
  const providers = (bulkSender.providers ?? {}) as ResourceRecord;
  localeResource.settings = {
    ...settings,
    bulkSender: {
      ...bulkSender,
      providers: { ...providers, mailjet },
    },
  };
}

const italianBulkSendDialog = (directKeyFallbackResources.it.bulkSendDialog ?? {}) as ResourceRecord;
directKeyFallbackResources.it.bulkSendDialog = {
  ...italianBulkSendDialog,
  complianceChecklistTitle: "Lista di controllo per la conformità",
  realCustomersCheck: "Questi sono clienti reali che hanno effettuato una transazione con me",
  noIncentivesCheck: "Non vengono offerti incentivi o sconti",
  allCustomersCheck: "Invio la richiesta a tutti i clienti, senza filtrarli in base alla soddisfazione",
};
const mailManagementFallbacks: Record<string, ResourceRecord> = {
  "en": {
    "smtp": {
      "testEmailRecipient": "Send a test email to",
      "testEmailHint": "Use an address you control. This uses your saved mail server and does not save a new recipient.",
      "testEmailRecipientRequired": "Enter the address that should receive the test email.",
      "sendingTestEmail": "Sending test email…",
      "sendTestEmail": "Send test email",
      "testEmailSent": "Test email sent. Check the recipient inbox to confirm delivery.",
      "disconnectConfirmTitle": "Disconnect this mail server?",
      "disconnectConfirmDescription": "This permanently removes your saved mail-server credentials and stops future outreach until you connect a new verified server.",
      "disconnecting": "Disconnecting…",
      "disconnectConfirmAction": "Disconnect and reset",
      "retryTestEmail": "Retry",
      "disconnectAutomationPauseWarning": "Disconnecting pauses any active automated review requests. They stay paused until you configure and select a new verified mail server."
    },
    "dashboard": {
      "mailHealth": {
        "healthy": "Mail server healthy",
        "healthyDetail": "Your connected mail server is ready for outreach.",
        "attention": "Mail server needs attention",
        "attentionDetail": "Re-test or update your mail server in Settings before sending outreach.",
        "disconnected": "Mail server not connected",
        "disconnectedDetail": "Connect a user-owned mail server before sending outreach.",
        "bulkActive": "Bulk mail server active",
        "bulkActiveDetail": "Your selected bulk mail provider is active for outreach.",
        "troubleshoot": "Troubleshoot"
      }
    }
  },
  "es": {
    "smtp": {
      "testEmailRecipient": "Enviar un correo de prueba a",
      "testEmailHint": "Usa una dirección que controles. Se usa tu servidor guardado y no se guarda un destinatario nuevo.",
      "testEmailRecipientRequired": "Introduce la dirección que recibirá el correo de prueba.",
      "sendingTestEmail": "Enviando correo de prueba…",
      "sendTestEmail": "Enviar correo de prueba",
      "testEmailSent": "Correo de prueba enviado. Revisa la bandeja del destinatario.",
      "disconnectConfirmTitle": "¿Desconectar este servidor de correo?",
      "disconnectConfirmDescription": "Esto elimina permanentemente las credenciales guardadas y detiene los envíos hasta que conectes un servidor verificado.",
      "disconnecting": "Desconectando…",
      "disconnectConfirmAction": "Desconectar y restablecer",
      "retryTestEmail": "Reintentar",
      "disconnectAutomationPauseWarning": "Al desconectar se pausarán las solicitudes de reseñas automatizadas activas. Seguirán pausadas hasta que configures y selecciones un nuevo servidor verificado."
    },
    "dashboard": {
      "mailHealth": {
        "healthy": "Servidor de correo correcto",
        "healthyDetail": "Tu servidor conectado está listo para los envíos.",
        "attention": "El servidor de correo necesita atención",
        "attentionDetail": "Vuelve a probarlo o actualízalo en Ajustes antes de enviar.",
        "disconnected": "Servidor de correo no conectado",
        "disconnectedDetail": "Conecta un servidor propio antes de enviar.",
        "bulkActive": "Servidor de correo masivo activo",
        "bulkActiveDetail": "Tu proveedor masivo seleccionado está activo para los envíos.",
        "troubleshoot": "Solucionar problemas"
      }
    }
  },
  "fr": {
    "smtp": {
      "testEmailRecipient": "Envoyer un e-mail de test à",
      "testEmailHint": "Utilisez une adresse que vous contrôlez. Votre serveur enregistré est utilisé sans enregistrer de nouveau destinataire.",
      "testEmailRecipientRequired": "Saisissez l’adresse qui doit recevoir l’e-mail de test.",
      "sendingTestEmail": "Envoi de l’e-mail de test…",
      "sendTestEmail": "Envoyer l’e-mail de test",
      "testEmailSent": "E-mail de test envoyé. Vérifiez la boîte du destinataire.",
      "disconnectConfirmTitle": "Déconnecter ce serveur e-mail ?",
      "disconnectConfirmDescription": "Cela supprime définitivement vos identifiants enregistrés et arrête les envois jusqu’à la connexion d’un serveur vérifié.",
      "disconnecting": "Déconnexion…",
      "disconnectConfirmAction": "Déconnecter et réinitialiser",
      "retryTestEmail": "Réessayer",
      "disconnectAutomationPauseWarning": "La déconnexion met en pause les demandes d’avis automatisées actives. Elles restent en pause jusqu’à ce que vous configuriez et sélectionniez un nouveau serveur vérifié."
    },
    "dashboard": {
      "mailHealth": {
        "healthy": "Serveur e-mail opérationnel",
        "healthyDetail": "Votre serveur connecté est prêt pour les envois.",
        "attention": "Le serveur e-mail nécessite une intervention",
        "attentionDetail": "Testez-le à nouveau ou mettez-le à jour dans Paramètres avant d’envoyer.",
        "disconnected": "Serveur e-mail non connecté",
        "disconnectedDetail": "Connectez un serveur vous appartenant avant d’envoyer.",
        "bulkActive": "Serveur d’envoi en masse actif",
        "bulkActiveDetail": "Votre fournisseur d’envoi en masse sélectionné est actif.",
        "troubleshoot": "Dépanner"
      }
    }
  },
  "it": {
    "smtp": {
      "testEmailRecipient": "Invia un’e-mail di prova a",
      "testEmailHint": "Usa un indirizzo che controlli. Verrà usato il server salvato senza salvare un nuovo destinatario.",
      "testEmailRecipientRequired": "Inserisci l’indirizzo che deve ricevere l’e-mail di prova.",
      "sendingTestEmail": "Invio dell’e-mail di prova…",
      "sendTestEmail": "Invia e-mail di prova",
      "testEmailSent": "E-mail di prova inviata. Controlla la casella del destinatario.",
      "disconnectConfirmTitle": "Disconnettere questo server e-mail?",
      "disconnectConfirmDescription": "Questa azione elimina definitivamente le credenziali salvate e interrompe gli invii finché non colleghi un server verificato.",
      "disconnecting": "Disconnessione…",
      "disconnectConfirmAction": "Disconnetti e reimposta",
      "retryTestEmail": "Riprova",
      "disconnectAutomationPauseWarning": "La disconnessione mette in pausa le richieste di recensione automatizzate attive. Restano in pausa finché non configuri e selezioni un nuovo server verificato."
    },
    "dashboard": {
      "mailHealth": {
        "healthy": "Server e-mail integro",
        "healthyDetail": "Il server connesso è pronto per gli invii.",
        "attention": "Il server e-mail richiede attenzione",
        "attentionDetail": "Ripetere il test o aggiornarlo nelle Impostazioni prima di inviare.",
        "disconnected": "Server e-mail non connesso",
        "disconnectedDetail": "Collega un server di tua proprietà prima di inviare.",
        "bulkActive": "Server di invio massivo attivo",
        "bulkActiveDetail": "Il provider di invio massivo selezionato è attivo.",
        "troubleshoot": "Risolvi problemi"
      }
    }
  },
  "th": {
    "smtp": {
      "testEmailRecipient": "ส่งอีเมลทดสอบไปที่",
      "testEmailHint": "ใช้ที่อยู่อีเมลที่คุณควบคุม ระบบจะใช้เซิร์ฟเวอร์ที่บันทึกไว้และจะไม่บันทึกผู้รับใหม่",
      "testEmailRecipientRequired": "กรอกที่อยู่อีเมลที่จะรับอีเมลทดสอบ",
      "sendingTestEmail": "กำลังส่งอีเมลทดสอบ…",
      "sendTestEmail": "ส่งอีเมลทดสอบ",
      "testEmailSent": "ส่งอีเมลทดสอบแล้ว โปรดตรวจสอบกล่องจดหมายของผู้รับ",
      "disconnectConfirmTitle": "ตัดการเชื่อมต่อเซิร์ฟเวอร์อีเมลนี้หรือไม่?",
      "disconnectConfirmDescription": "การดำเนินการนี้จะลบข้อมูลรับรองที่บันทึกไว้ถาวรและหยุดการส่งจนกว่าคุณจะเชื่อมต่อเซิร์ฟเวอร์ที่ยืนยันแล้ว",
      "disconnecting": "กำลังตัดการเชื่อมต่อ…",
      "disconnectConfirmAction": "ตัดการเชื่อมต่อและรีเซ็ต",
      "retryTestEmail": "ลองอีกครั้ง",
      "disconnectAutomationPauseWarning": "การตัดการเชื่อมต่อจะหยุดคำขอรีวิวอัตโนมัติที่กำลังทำงานชั่วคราว และจะหยุดต่อไปจนกว่าคุณจะตั้งค่าและเลือกเซิร์ฟเวอร์ที่ยืนยันแล้วใหม่"
    },
    "dashboard": {
      "mailHealth": {
        "healthy": "เซิร์ฟเวอร์อีเมลพร้อมใช้งาน",
        "healthyDetail": "เซิร์ฟเวอร์ที่เชื่อมต่อพร้อมสำหรับการส่งข้อความ",
        "attention": "เซิร์ฟเวอร์อีเมลต้องการการดูแล",
        "attentionDetail": "ทดสอบอีกครั้งหรืออัปเดตในการตั้งค่าก่อนส่งข้อความ",
        "disconnected": "ยังไม่ได้เชื่อมต่อเซิร์ฟเวอร์อีเมล",
        "disconnectedDetail": "เชื่อมต่อเซิร์ฟเวอร์ของคุณก่อนส่งข้อความ",
        "bulkActive": "เซิร์ฟเวอร์ส่งอีเมลจำนวนมากทำงานอยู่",
        "bulkActiveDetail": "ผู้ให้บริการส่งจำนวนมากที่เลือกกำลังทำงานอยู่",
        "troubleshoot": "แก้ไขปัญหา"
      }
    }
  },
  "zh-CN": {
    "smtp": {
      "testEmailRecipient": "将测试邮件发送到",
      "testEmailHint": "请使用您可控制的地址。系统会使用已保存的邮件服务器，不会保存新的收件人。",
      "testEmailRecipientRequired": "请输入接收测试邮件的地址。",
      "sendingTestEmail": "正在发送测试邮件…",
      "sendTestEmail": "发送测试邮件",
      "testEmailSent": "测试邮件已发送。请检查收件人收件箱。",
      "disconnectConfirmTitle": "要断开此邮件服务器吗？",
      "disconnectConfirmDescription": "此操作将永久删除已保存的邮件服务器凭据，并停止未来发送，直到您连接新的已验证服务器。",
      "disconnecting": "正在断开连接…",
      "disconnectConfirmAction": "断开并重置",
      "retryTestEmail": "重试",
      "disconnectAutomationPauseWarning": "断开连接会暂停所有正在进行的自动评价请求。在您配置并选择新的已验证邮件服务器之前，它们将一直暂停。"
    },
    "dashboard": {
      "mailHealth": {
        "healthy": "邮件服务器运行正常",
        "healthyDetail": "您已连接的邮件服务器已准备好发送消息。",
        "attention": "邮件服务器需要处理",
        "attentionDetail": "请在发送前于设置中重新测试或更新邮件服务器。",
        "disconnected": "邮件服务器未连接",
        "disconnectedDetail": "请先连接您自己的邮件服务器再发送消息。",
        "bulkActive": "批量邮件服务器已启用",
        "bulkActiveDetail": "您选择的批量邮件服务商已启用。",
        "troubleshoot": "排查问题"
      }
    }
  },
  "zh-TW": {
    "smtp": {
      "testEmailRecipient": "將測試電子郵件寄送至",
      "testEmailHint": "請使用您可控制的地址。系統會使用已儲存的郵件伺服器，不會儲存新的收件者。",
      "testEmailRecipientRequired": "請輸入要接收測試電子郵件的地址。",
      "sendingTestEmail": "正在傳送測試電子郵件…",
      "sendTestEmail": "傳送測試電子郵件",
      "testEmailSent": "測試電子郵件已傳送。請檢查收件者收件匣。",
      "disconnectConfirmTitle": "要中斷此郵件伺服器嗎？",
      "disconnectConfirmDescription": "此操作會永久移除已儲存的郵件伺服器憑證，並停止後續傳送，直到您連接新的已驗證伺服器。",
      "disconnecting": "正在中斷連線…",
      "disconnectConfirmAction": "中斷並重設",
      "retryTestEmail": "重試",
      "disconnectAutomationPauseWarning": "中斷連線會暫停所有進行中的自動評論請求。在您設定並選取新的已驗證郵件伺服器之前，它們將持續暫停。"
    },
    "dashboard": {
      "mailHealth": {
        "healthy": "郵件伺服器運作正常",
        "healthyDetail": "您已連接的郵件伺服器已準備好傳送訊息。",
        "attention": "郵件伺服器需要處理",
        "attentionDetail": "請在傳送前於設定中重新測試或更新郵件伺服器。",
        "disconnected": "郵件伺服器未連接",
        "disconnectedDetail": "請先連接您自己的郵件伺服器再傳送訊息。",
        "bulkActive": "大量郵件伺服器已啟用",
        "bulkActiveDetail": "您選取的大量郵件服務商已啟用。",
        "troubleshoot": "疑難排解"
      }
    }
  }
};
const pausedAutomationFallbacks: Record<string, ResourceRecord> = {
  en: { automationPaused: { bannerTitle: "Automated review requests are paused", bannerDescription: "{{count}} pending automated request(s) are waiting for you to reconnect a verified mail server.", viewQueue: "View paused requests", queueTitle: "Paused automated requests", queueDescription: "These requests will stay pending until you connect and select a verified mail server.", reviewRequest: "Review request", followUp: "Follow-up", morePending: "{{count}} more request(s) are pending." } },
  es: { automationPaused: { bannerTitle: "Las solicitudes de reseñas automáticas están en pausa", bannerDescription: "{{count}} solicitud(es) automática(s) pendiente(s) esperan que vuelva a conectar un servidor de correo verificado.", viewQueue: "Ver solicitudes pausadas", queueTitle: "Solicitudes automáticas pausadas", queueDescription: "Estas solicitudes seguirán pendientes hasta que conecte y seleccione un servidor de correo verificado.", reviewRequest: "Solicitud de reseña", followUp: "Seguimiento", morePending: "Hay {{count}} solicitud(es) más pendiente(s)." } },
  fr: { automationPaused: { bannerTitle: "Les demandes d’avis automatiques sont en pause", bannerDescription: "{{count}} demande(s) automatique(s) en attente attendent la reconnexion d’un serveur de messagerie vérifié.", viewQueue: "Voir les demandes en pause", queueTitle: "Demandes automatiques en pause", queueDescription: "Ces demandes resteront en attente jusqu’à ce que vous connectiez et sélectionniez un serveur vérifié.", reviewRequest: "Demande d’avis", followUp: "Relance", morePending: "{{count}} demande(s) supplémentaire(s) sont en attente." } },
  it: { automationPaused: { bannerTitle: "Le richieste di recensione automatiche sono in pausa", bannerDescription: "{{count}} richiesta/e automatica/he in attesa aspettano la riconnessione di un server di posta verificato.", viewQueue: "Visualizza richieste in pausa", queueTitle: "Richieste automatiche in pausa", queueDescription: "Queste richieste resteranno in attesa finché non colleghi e selezioni un server di posta verificato.", reviewRequest: "Richiesta di recensione", followUp: "Promemoria", morePending: "Altre {{count}} richieste sono in attesa." } },
  th: { automationPaused: { bannerTitle: "คำขอรีวิวอัตโนมัติถูกพักไว้", bannerDescription: "คำขออัตโนมัติที่รอดำเนินการ {{count}} รายการกำลังรอให้คุณเชื่อมต่อเซิร์ฟเวอร์อีเมลที่ยืนยันแล้วอีกครั้ง", viewQueue: "ดูคำขอที่พักไว้", queueTitle: "คำขออัตโนมัติที่พักไว้", queueDescription: "คำขอเหล่านี้จะยังรอดำเนินการจนกว่าคุณจะเชื่อมต่อและเลือกเซิร์ฟเวอร์อีเมลที่ยืนยันแล้ว", reviewRequest: "คำขอรีวิว", followUp: "ติดตามผล", morePending: "มีคำขอเพิ่มเติม {{count}} รายการที่รอดำเนินการ" } },
  "zh-CN": { automationPaused: { bannerTitle: "自动评价请求已暂停", bannerDescription: "有 {{count}} 个待处理的自动请求，等待您重新连接已验证的邮件服务器。", viewQueue: "查看已暂停请求", queueTitle: "已暂停的自动请求", queueDescription: "这些请求会保持待处理状态，直到您连接并选择已验证的邮件服务器。", reviewRequest: "评价请求", followUp: "跟进", morePending: "另有 {{count}} 个请求待处理。" } },
  "zh-TW": { automationPaused: { bannerTitle: "自動評論請求已暫停", bannerDescription: "有 {{count}} 個待處理的自動請求，等待您重新連線已驗證的郵件伺服器。", viewQueue: "查看已暫停請求", queueTitle: "已暫停的自動請求", queueDescription: "這些請求會保持待處理狀態，直到您連線並選取已驗證的郵件伺服器。", reviewRequest: "評論請求", followUp: "跟進", morePending: "另有 {{count}} 個請求待處理。" } },
};
const dashboardRecheckFallbacks: Record<string, ResourceRecord> = {
  en: { connectionTestPassed: "Mail server connection verified.", connectionTestFailed: "Mail server still needs attention." },
  es: { connectionTestPassed: "Se verificó la conexión del servidor de correo.", connectionTestFailed: "El servidor de correo aún necesita atención." },
  fr: { connectionTestPassed: "La connexion au serveur de messagerie est vérifiée.", connectionTestFailed: "Le serveur de messagerie nécessite encore votre attention." },
  it: { connectionTestPassed: "La connessione al server di posta è stata verificata.", connectionTestFailed: "Il server di posta richiede ancora attenzione." },
  th: { connectionTestPassed: "ยืนยันการเชื่อมต่อเซิร์ฟเวอร์อีเมลแล้ว", connectionTestFailed: "เซิร์ฟเวอร์อีเมลยังต้องได้รับการตรวจสอบ" },
  "zh-CN": { connectionTestPassed: "邮件服务器连接已验证。", connectionTestFailed: "邮件服务器仍需处理。" },
  "zh-TW": { connectionTestPassed: "郵件伺服器連線已驗證。", connectionTestFailed: "郵件伺服器仍需處理。" },
};
for (const [locale, values] of Object.entries(mailManagementFallbacks)) {
  const resource = directKeyFallbackResources[locale] ?? {};
  directKeyFallbackResources[locale] = {
    ...resource,
    smtp: { ...(resource.smtp as ResourceRecord ?? {}), ...(values.smtp as ResourceRecord ?? {}), ...(dashboardRecheckFallbacks[locale] ?? {}) },
    dashboard: { ...(resource.dashboard as ResourceRecord ?? {}), ...(values.dashboard as ResourceRecord ?? {}) },
    automationPaused: { ...(resource.automationPaused as ResourceRecord ?? {}), ...(pausedAutomationFallbacks[locale]?.automationPaused as ResourceRecord ?? {}) },
  };
}

export default directKeyFallbackResources;
