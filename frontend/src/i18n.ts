import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

const resources = {
  en: {
    translation: {
      // General
      cancel: "Cancel",
      save: "Save",
      loading: "Loading...",
      thinking: "Thinking...",
      error: "Error",
      success: "Success",
      yes: "Yes",
      no: "No",
      confirm: "Confirm",
      close: "Close",

      // Sidebar
      dashboard: "Dashboard",
      agents: "Agents",
      skills: "Skills",
      knowledge: "Knowledge",
      chatStudio: "Studio Chat",
      logout: "Sign Out",
      languageToggle: "Cambiar a Español",

      // Dashboard Header
      welcome: "Welcome back",
      overview: "Here is the overview of your agentic workspace.",

      // Login
      loginTitle: "Davinovate Orchestrator",
      loginSubtitle: "Welcome back to your orchestrator",
      registerSubtitle: "Create your agentic workspace",
      emailLabel: "Email Address",
      passwordLabel: "Password",
      emailPlaceholder: "you@example.com",
      signInBtn: "Sign In",
      createAccountBtn: "Create Account",
      alreadyAccount: "Already have an account? Sign in",
      noAccount: "Don't have an account? Register",
      authFailed: "Authentication failed. Please try again.",

      // Agents View
      activeAgents: "Active Agents",
      newAgentBtn: "New Agent",
      noAgentsTitle: "No agents found",
      noAgentsSubtitle: "You haven't created any AI agents yet. Click New Agent to get started.",
      agentCardCreated: "Created",

      // Agent Modal
      editAgent: "Edit Agent",
      newAgent: "New Agent",
      agentName: "Agent Name",
      agentNamePlaceholder: "e.g. Code Architect",
      systemPrompt: "System Prompt",
      systemPromptPlaceholder: "You are an expert AI assistant designed to...",
      modelLabel: "Model",
      temperatureLabel: "Temperature",
      saveAgentBtn: "Save Agent",

      // Skills View
      customSkills: "Custom Skills",
      newSkillBtn: "New Skill",
      noSkillsTitle: "No skills configured",
      noSkillsSubtitle: "Define custom functions that your available agents can call.",

      // Skill Modal
      editSkill: "Edit Skill",
      newSkill: "New Skill",
      skillName: "Skill Name",
      skillNamePlaceholder: "e.g. search_web",
      skillDescription: "Description (seen by the AI)",
      skillDescriptionPlaceholder: "What this skill does and when to use it...",
      parametersSchema: "Parameters Schema (JSON)",
      actionLogic: "Action Logic (JavaScript)",
      registerSkillBtn: "Register Skill",

      // Knowledge View
      knowledgeBase: "Knowledge Base",
      uploadTitle: "Upload Knowledge Files",
      uploadProcessing: "Processing...",
      uploadSubtitle: "Drag & drop PDF or TXT files to train your agents with custom knowledge.",
      selectFilesBtn: "Select Files",
      pleaseWait: "Please wait...",
      indexedKnowledge: "Indexed Knowledge",
      noKnowledge: "No knowledge items indexed yet.",
      addedOn: "Added ",
      confirmDeleteKnowledge: "Delete this knowledge item?",
      uploadFailed: "Failed to upload file",

      // Chat Studio
      ragActive: "RAG Active",
      selectAgentToStart: "Select an agent and start chatting to test your orchestration and skills.",
      typeMessage: "Type a message to your agent...",
      chatError: "Sorry, I encountered an error. Please try again.",

      // System Bot
      botTitle: "Orion — AI Assistant",
      botGreeting: "Hi! I'm **Orion**, your Davinovate assistant. I can help you navigate the platform, explain features, or give advice on building AI agents.\n\nWhat can I do for you?",
      botHint: "Ask me to 'go to agents', 'what are skills?', or 'open knowledge'. I'll operate the UI for you!",
      botAskAnything: "Ask me anything...",
      botChipGoToAgents: "Go to agents",
      botChipWhatAreSkills: "What are skills?",
      botChipHowRagWorks: "How does RAG work?"
    }
  },
  es: {
    translation: {
      // General
      cancel: "Cancelar",
      save: "Guardar",
      loading: "Cargando...",
      thinking: "Pensando...",
      error: "Error",
      success: "Éxito",
      yes: "Sí",
      no: "No",
      confirm: "Confirmar",
      close: "Cerrar",

      // Sidebar
      dashboard: "Panel",
      agents: "Agentes",
      skills: "Habilidades",
      knowledge: "Conocimiento",
      chatStudio: "Estudio de Chat",
      logout: "Cerrar Sesión",
      languageToggle: "Switch to English",

      // Dashboard Header
      welcome: "Bienvenido",
      overview: "Aquí está el resumen de tu espacio de trabajo agéntico.",

      // Login
      loginTitle: "Davinovate Orchestrator",
      loginSubtitle: "Bienvenido de nuevo a tu orquestador",
      registerSubtitle: "Crea tu espacio de trabajo agéntico",
      emailLabel: "Correo Electrónico",
      passwordLabel: "Contraseña",
      emailPlaceholder: "tu@ejemplo.com",
      signInBtn: "Iniciar Sesión",
      createAccountBtn: "Crear Cuenta",
      alreadyAccount: "¿Ya tienes cuenta? Inicia sesión",
      noAccount: "¿No tienes cuenta? Regístrate",
      authFailed: "Autenticación fallida. Por favor, inténtalo de nuevo.",

      // Agents View
      activeAgents: "Agentes Activos",
      newAgentBtn: "Nuevo Agente",
      noAgentsTitle: "No se encontraron agentes",
      noAgentsSubtitle: "Aún no has creado ningún agente de IA. Haz clic en Nuevo Agente para empezar.",
      agentCardCreated: "Creado",

      // Agent Modal
      editAgent: "Editar Agente",
      newAgent: "Nuevo Agente",
      agentName: "Nombre del Agente",
      agentNamePlaceholder: "ej. Arquitecto de Código",
      systemPrompt: "Prompt del Sistema",
      systemPromptPlaceholder: "Eres un experto asistente de IA diseñado para...",
      modelLabel: "Modelo",
      temperatureLabel: "Temperatura",
      saveAgentBtn: "Guardar Agente",

      // Skills View
      customSkills: "Habilidades Personalizadas",
      newSkillBtn: "Nueva Habilidad",
      noSkillsTitle: "Sin habilidades configuradas",
      noSkillsSubtitle: "Define funciones personalizadas que tus agentes disponibles puedan llamar.",

      // Skill Modal
      editSkill: "Editar Habilidad",
      newSkill: "Nueva Habilidad",
      skillName: "Nombre de la Habilidad",
      skillNamePlaceholder: "ej. buscar_web",
      skillDescription: "Descripción (vista por la IA)",
      skillDescriptionPlaceholder: "Qué hace esta habilidad y cuándo usarla...",
      parametersSchema: "Esquema de Parámetros (JSON)",
      actionLogic: "Lógica de Acción (JavaScript)",
      registerSkillBtn: "Registrar Habilidad",

      // Knowledge View
      knowledgeBase: "Base de Conocimiento",
      uploadTitle: "Subir Archivos de Conocimiento",
      uploadProcessing: "Procesando...",
      uploadSubtitle: "Arrastra y suelta archivos PDF o TXT para entrenar a tus agentes con conocimiento personalizado.",
      selectFilesBtn: "Seleccionar Archivos",
      pleaseWait: "Por favor espera...",
      indexedKnowledge: "Conocimiento Indexado",
      noKnowledge: "Aún no hay elementos de conocimiento indexados.",
      addedOn: "Añadido el ",
      confirmDeleteKnowledge: "¿Eliminar este elemento de conocimiento?",
      uploadFailed: "Fallo al subir el archivo",

      // Chat Studio
      ragActive: "RAG Activo",
      selectAgentToStart: "Selecciona un agente y comienza a chatear para probar tu orquestación y habilidades.",
      typeMessage: "Escribe un mensaje a tu agente...",
      chatError: "Lo siento, encontré un error. Por favor inténtalo de nuevo.",

      // System Bot
      botTitle: "Orión — Asistente de IA",
      botGreeting: "¡Hola! Soy **Orión**, tu asistente Davinovate. Puedo ayudarte a navegar por la plataforma, explicar características o dar consejos sobre la creación de agentes de IA.\n\n¿Qué puedo hacer por ti?",
      botHint: "Pídeme que 'vaya a agentes', 'qué son las habilidades' o 'abra conocimiento'. ¡Operaré la UI por ti!",
      botAskAnything: "Pregúntame cualquier cosa...",
      botChipGoToAgents: "Ir a agentes",
      botChipWhatAreSkills: "¿Qué son habilidades?",
      botChipHowRagWorks: "¿Cómo funciona RAG?"
    }
  }
};

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false // React already escapes values
    }
  });

export default i18n;
