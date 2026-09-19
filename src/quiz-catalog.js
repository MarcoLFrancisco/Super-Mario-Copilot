const reference = (referenceUrl, lastVerified = null) => ({ referenceUrl, lastVerified });
const sources = {
  copilot: reference('https://learn.microsoft.com/en-us/microsoft-365/copilot/microsoft-365-copilot-overview', '2026-09-19'),
  workIQ: reference('https://learn.microsoft.com/en-us/microsoft-365/copilot/extensibility/work-iq/', '2026-09-19'),
  cowork: reference('https://learn.microsoft.com/en-us/microsoft-365/copilot/cowork/', '2026-09-19'),
  studio: reference('https://learn.microsoft.com/en-us/microsoft-copilot-studio/fundamentals-what-is-copilot-studio', '2026-09-19'),
  pages: reference('https://support.microsoft.com/en-gb/microsoft-365-copilot/get-started-with-microsoft-365-copilot-pages', '2026-09-19'),
  notebooks: reference('https://support.microsoft.com/en-gb/microsoft-365-copilot/get-started-with-microsoft-365-copilot-notebooks', '2026-09-19'),
  chat: reference('https://support.microsoft.com/copilot-microsoft365-chat'),
  github: reference('https://docs.github.com/en/copilot/get-started/what-is-github-copilot'),
  codingAgent: reference('https://docs.github.com/en/copilot/concepts/coding-agent/coding-agent'),
  instructions: reference('https://docs.github.com/en/copilot/customizing-copilot/adding-repository-custom-instructions-for-github-copilot'),
  codeReview: reference('https://docs.github.com/en/copilot/concepts/code-review/code-review'),
  secretScanning: reference('https://docs.github.com/en/code-security/secret-scanning/introduction/about-secret-scanning'),
  research: reference('https://www.microsoft.com/en-us/microsoft-365/blog/2025/03/25/introducing-researcher-and-analyst-in-microsoft-365-copilot/'),
  foundry: reference('https://learn.microsoft.com/en-us/azure/ai-foundry/what-is-azure-ai-foundry'),
  models: reference('https://learn.microsoft.com/en-us/azure/foundry/concepts/foundry-models-overview', '2026-09-19'),
  search: reference('https://learn.microsoft.com/en-us/azure/search/search-what-is-azure-search'),
  rag: reference('https://learn.microsoft.com/en-us/azure/search/retrieval-augmented-generation-overview'),
  vectors: reference('https://learn.microsoft.com/en-us/azure/search/vector-search-overview'),
  evaluation: reference('https://learn.microsoft.com/en-us/azure/ai-foundry/concepts/evaluation-evaluators/rag-evaluators'),
  topics: reference('https://learn.microsoft.com/en-us/microsoft-copilot-studio/authoring-create-edit-topics'),
  tools: reference('https://learn.microsoft.com/en-us/microsoft-copilot-studio/advanced-plugin-actions'),
  connectors: reference('https://learn.microsoft.com/en-us/connectors/overview'),
  flows: reference('https://learn.microsoft.com/en-us/microsoft-copilot-studio/advanced-flow'),
  agentService: reference('https://learn.microsoft.com/en-us/azure/ai-foundry/agents/overview'),
  interpreter: reference('https://learn.microsoft.com/en-us/azure/ai-foundry/agents/how-to/tools/code-interpreter'),
  functions: reference('https://learn.microsoft.com/en-us/azure/ai-foundry/agents/how-to/tools/function-calling'),
  teams: reference('https://learn.microsoft.com/en-us/microsoftteams/copilot-teams-transcription'),
  recap: reference('https://learn.microsoft.com/en-us/microsoftteams/intelligent-recap-calls-meetings'),
  recording: reference('https://learn.microsoft.com/en-us/microsoftteams/tmr-meeting-recording-change'),
  speech: reference('https://learn.microsoft.com/en-us/azure/ai-services/speech-service/overview'),
  translator: reference('https://learn.microsoft.com/en-us/azure/ai-services/translator/overview'),
  documents: reference('https://learn.microsoft.com/en-us/azure/ai-services/document-intelligence/overview'),
  language: reference('https://learn.microsoft.com/en-us/azure/ai-services/language-service/overview'),
  vault: reference('https://learn.microsoft.com/en-us/azure/key-vault/general/overview'),
  identity: reference('https://learn.microsoft.com/en-us/entra/identity/managed-identities-azure-resources/overview'),
  privateEndpoint: reference('https://learn.microsoft.com/en-us/azure/ai-services/cognitive-services-virtual-networks'),
  safety: reference('https://learn.microsoft.com/en-us/azure/ai-services/content-safety/overview'),
  shields: reference('https://learn.microsoft.com/en-us/azure/ai-services/content-safety/concepts/jailbreak-detection'),
  purview: reference('https://learn.microsoft.com/en-us/purview/information-protection'),
  labels: reference('https://learn.microsoft.com/en-us/purview/sensitivity-labels'),
  dlp: reference('https://learn.microsoft.com/en-us/purview/dlp-learn-about-dlp'),
  entra: reference('https://learn.microsoft.com/en-us/entra/fundamentals/whatis'),
  rbac: reference('https://learn.microsoft.com/en-us/azure/role-based-access-control/overview'),
  policy: reference('https://learn.microsoft.com/en-us/azure/governance/policy/overview')
};

const question = (id, prompt, options, correctOption, explanation, source) => ({ id, question: prompt,
  options: options.map(([optionId, text]) => ({ id: optionId, text })), correctOption, explanation, ...source });
const quiz = (key, title, product, icon, questions) => ({ key, title, product, icon, questions });

export const QUIZ_THEMES = {
  campus: 'Microsoft 365 Copilot, Work IQ, and everyday AI features.',
  github: 'AI coding assistance, agents, and code review.',
  cowork: 'Copilot Cowork, research, analysis, and workplace tasks.',
  foundry: 'Models, playgrounds, grounding, and evaluation.',
  agents: 'Copilot Studio, agent tools, and connected actions.',
  teams: 'Meeting Copilot, recap, transcription, and collaboration.',
  orbit: 'Azure AI services for speech, language, documents, and security.',
  core: 'Responsible AI, information protection, and enterprise controls.'
};

export const WORK_TASKS = {
  campus: [
    quiz('copilot', 'Meet Copilot', 'Microsoft 365 Copilot', 'sparkles', [
      question('copilot-purpose', 'What is Microsoft 365 Copilot designed to help you do?',
        [['hardware', 'Repair computer hardware'], ['work', 'Write, summarize, and work with information'], ['furniture', 'Install office furniture']], 'work',
        'Microsoft 365 Copilot helps people create content and work with information across supported Microsoft 365 experiences.', sources.copilot),
      question('copilot-email', 'Which app includes Copilot features for drafting emails?',
        [['outlook', 'Outlook'], ['paint', 'Paint'], ['calculator', 'Calculator']], 'outlook',
        'Copilot in Outlook helps draft emails and summarize conversations.', sources.copilot),
      question('copilot-presentations', 'Which app includes Copilot features for creating presentations?',
        [['defender', 'Microsoft Defender'], ['onedrive', 'OneDrive'], ['powerpoint', 'PowerPoint']], 'powerpoint',
        'Copilot in PowerPoint helps create and refine presentations.', sources.copilot)
    ]),
    quiz('work-iq', 'Discover Work IQ', 'Work IQ', 'network', [
      question('work-iq-context', 'What does Work IQ help Copilot understand?',
        [['context', 'Your work context'], ['cooling', "Your computer's cooling system"], ['electricity', "Your home's electricity usage"]], 'context',
        'Work IQ is a workplace intelligence layer that helps ground Copilot in organizational context.', sources.workIQ),
      question('work-iq-information', 'Which information is relevant to Work IQ?',
        [['news', 'Only public news headlines'], ['work', 'Work emails, documents, meetings, and chats'], ['keyboard', 'Only your keyboard settings']], 'work',
        'Work IQ brings relevant Microsoft 365 work information into the context used by Copilot.', sources.workIQ),
      question('work-iq-permissions', 'Does Work IQ allow Copilot to ignore document access permissions?',
        [['everyone', 'Yes, for every employee'], ['old', 'Yes, if the document is old'], ['permissions', 'No, access permissions still apply']], 'permissions',
        'Work IQ uses permission-aware governance and only accesses information the user is authorized to access.', sources.workIQ)
    ]),
    quiz('beyond-chat', 'Beyond the Chat', 'Microsoft 365 Copilot', 'notebook-pen', [
      question('copilot-pages', 'What are Copilot Pages designed for?',
        [['printers', 'Managing printer settings'], ['pages', 'Turning Copilot content into editable, collaborative pages'], ['calls', 'Blocking unwanted phone calls']], 'pages',
        'Copilot Pages turns Copilot content into an editable page that people can collaborate on.', sources.pages),
      question('copilot-notebooks', 'What are Copilot Notebooks designed to help you do?',
        [['references', 'Work with a focused collection of reference materials'], ['os', "Replace your computer's operating system"], ['account', 'Create a new Microsoft account']], 'references',
        'Copilot Notebooks focuses assistance on a selected collection of reference materials.', sources.notebooks),
      question('copilot-history', 'Which Copilot feature helps you return to an earlier conversation?',
        [['brightness', 'Screen brightness'], ['transitions', 'Slide transitions'], ['history', 'Chat history']], 'history',
        'Chat history lets you revisit available earlier conversations.', sources.chat)
    ])
  ],
  github: [
    quiz('assistant', 'Coding Assistant', 'GitHub Copilot', 'code-2', [
      question('github-purpose', 'What is GitHub Copilot primarily designed to help with?',
        [['development', 'Software development'], ['rooms', 'Meeting room bookings'], ['expenses', 'Expense reimbursements']], 'development',
        'GitHub Copilot is an AI coding assistant for software development.', sources.github),
      question('github-inline', 'What is an inline code suggestion?',
        [['calendar', 'A calendar reminder'], ['completion', 'A suggested code completion shown in your editor'], ['badge', 'A security badge on your profile']], 'completion',
        'Inline suggestions offer code completions directly in the editor.', sources.github),
      question('github-chat', 'Which feature lets you ask Copilot to explain a function?',
        [['pages', 'GitHub Pages'], ['stars', 'Repository stars'], ['chat', 'Copilot Chat']], 'chat',
        'Copilot Chat can explain code in a conversational interface.', sources.github)
    ]),
    quiz('coding-agents', 'Coding Agents', 'GitHub Copilot', 'bot', [
      question('github-agent-mode', 'What can GitHub Copilot agent mode do in a supported editor?',
        [['colors', "Only change the editor's colors"], ['tasks', 'Work through coding tasks using edits and tools'], ['computer', 'Manufacture a new computer']], 'tasks',
        'Agent mode can make edits and use supported tools to work through a coding task.', sources.github),
      question('github-agent-pr', 'What can the GitHub Copilot coding agent create for a coding task?',
        [['pr', 'A pull request containing proposed changes'], ['contract', 'A new employee contract'], ['recording', 'A Teams meeting recording']], 'pr',
        'The coding agent can propose changes through a pull request for review.', sources.codingAgent),
      question('github-instructions', 'What do repository custom instructions give Copilot?',
        [['access', 'Unlimited access to private repositories'], ['source-control', 'A replacement for source control'], ['guidance', 'Project-specific guidance and conventions']], 'guidance',
        'Repository instructions provide project-specific context and conventions.', sources.instructions)
    ]),
    quiz('review-test', 'Review and Test', 'GitHub Copilot and GitHub', 'git-pull-request', [
      question('github-review', 'What does Copilot code review provide?',
        [['feedback', 'Feedback on code changes'], ['guarantee', 'Guaranteed bug-free software'], ['approval', 'Automatic approval from your manager']], 'feedback',
        'Copilot code review provides suggestions and feedback, not a guarantee of correctness.', sources.codeReview),
      question('github-tests', "What can Copilot help generate to check a function's behavior?",
        [['invitation', 'A meeting invitation'], ['tests', 'Unit tests'], ['warranty', 'A hardware warranty']], 'tests',
        'Copilot can help generate unit tests that check expected code behavior.', sources.github),
      question('github-secrets', 'Which GitHub feature detects supported credentials accidentally committed to a repository?',
        [['discussions', 'GitHub Discussions'], ['pages', 'GitHub Pages'], ['secrets', 'Secret scanning']], 'secrets',
        'Secret scanning detects supported secret patterns in repository content.', sources.secretScanning)
    ])
  ],
  cowork: [
    quiz('cowork', 'Meet Copilot Cowork', 'Copilot Cowork', 'workflow', [
      question('cowork-purpose', 'Which description best matches Copilot Cowork?',
        [['spelling', 'A tool focused only on spelling corrections'], ['tasks', 'An experience for helping carry out multi-step work'], ['hardware', 'A computer hardware diagnostic tool']], 'tasks',
        'Copilot Cowork carries out work through connected steps across Microsoft 365.', sources.cowork),
      question('cowork-briefing', 'Which task best fits a Cowork-style experience?',
        [['briefing', 'Prepare a meeting briefing using relevant work information'], ['monitor', 'Change the physical size of your monitor'], ['battery', "Replace your laptop's battery"]], 'briefing',
        'Cowork can gather relevant work information and prepare a meeting briefing.', sources.cowork),
      question('cowork-steps', 'What distinguishes multi-step AI assistance from a simple question-and-answer chat?',
        [['permissions', 'It always works without permissions.'], ['input', 'It never needs user input.'], ['actions', 'It can coordinate several actions toward an outcome.']], 'actions',
        'Multi-step assistance coordinates actions toward an outcome while retaining permissions and approval boundaries.', sources.cowork)
    ]),
    quiz('research-analysis', 'Researcher and Analyst', 'Microsoft 365 Copilot agents', 'chart-no-axes-combined', [
      question('researcher-purpose', 'Which Microsoft 365 Copilot agent is intended for in-depth research?',
        [['researcher', 'Researcher'], ['designer', 'Designer'], ['translator', 'Translator']], 'researcher',
        'Researcher brings together information for in-depth research tasks.', sources.research),
      question('analyst-purpose', 'Which Microsoft 365 Copilot agent is intended for working through data-analysis tasks?',
        [['researcher', 'Researcher'], ['analyst', 'Analyst'], ['presenter', 'Presenter']], 'analyst',
        'Analyst helps work through data-analysis tasks and interpret results.', sources.research),
      question('analyst-trends', 'Which task is a better fit for Analyst?',
        [['logo', 'Designing a company logo'], ['background', 'Changing a Teams background'], ['trends', 'Investigating sales trends in a dataset']], 'trends',
        'Investigating trends in a dataset is a data-analysis task suited to Analyst.', sources.research)
    ]),
    quiz('right-experience', 'Choose the Right Experience', 'Microsoft 365 Copilot', 'app-window', [
      question('choose-researcher', 'You need a detailed briefing that brings together information from several sources. Which agent fits best?',
        [['researcher', 'Researcher'], ['spelling', 'A spelling checker'], ['password', 'A password manager']], 'researcher',
        'Researcher is intended to synthesize information from multiple sources.', sources.research),
      question('choose-pages', 'You want to turn an AI response into a shared, editable workspace. Which feature fits?',
        [['firewall', 'Azure Firewall'], ['pages', 'Copilot Pages'], ['releases', 'GitHub Releases']], 'pages',
        'Copilot Pages provides an editable, collaborative page for Copilot content.', sources.pages),
      question('choose-notebooks', 'You want Copilot to focus on a selected collection of project materials. Which feature fits?',
        [['backgrounds', 'Teams backgrounds'], ['signatures', 'Outlook signatures'], ['notebooks', 'Copilot Notebooks']], 'notebooks',
        'Copilot Notebooks focuses on the reference materials selected for the notebook.', sources.notebooks)
    ])
  ],
  foundry: [
    quiz('models', 'Explore the Models', 'Azure AI Foundry', 'boxes', [
      question('foundry-catalog', 'Where can you discover available models in Azure AI Foundry?',
        [['catalog', 'Model catalog'], ['inbox', 'Outlook inbox'], ['calendar', 'Teams calendar']], 'catalog',
        'The model catalog is where you discover available models.', sources.models),
      question('foundry-playground', 'What is a model playground used for?',
        [['holidays', 'Managing employee holidays'], ['prompts', 'Trying prompts and observing model responses'], ['cables', 'Creating network cables']], 'prompts',
        'A playground lets you try prompts and inspect model responses interactively.', sources.foundry),
      question('foundry-providers', 'Does Azure AI Foundry offer only models from a single provider?',
        [['one', 'Yes, only one model is available.'], ['microsoft', 'Yes, only Microsoft-built models are available.'], ['multiple', 'No, its catalog includes models from multiple providers.']], 'multiple',
        'The catalog includes models from multiple providers.', sources.models)
    ]),
    quiz('knowledge', 'Connect Your Knowledge', 'Azure AI Search', 'search', [
      question('search-documents', 'Which Azure service is commonly used to retrieve documents for an AI assistant?',
        [['search', 'Azure AI Search'], ['cost', 'Azure Cost Management'], ['dns', 'Azure DNS']], 'search',
        'Azure AI Search indexes and retrieves information that can ground an AI assistant.', sources.search),
      question('search-rag', 'What does retrieval-augmented generation, or RAG, add to an AI workflow?',
        [['account', 'A new employee account'], ['sources', 'Relevant source information for the model to use'], ['monitor', 'A larger monitor']], 'sources',
        'RAG retrieves relevant source information for a model to use when generating an answer.', sources.rag),
      question('search-embeddings', 'What are embeddings used for in an AI search solution?',
        [['passwords', 'Resetting passwords'], ['meetings', 'Scheduling meetings'], ['vectors', 'Representing content numerically for similarity search']], 'vectors',
        'Embeddings represent content as numerical vectors that enable similarity search.', sources.vectors)
    ]),
    quiz('evaluation', 'Check the Results', 'Azure AI Foundry evaluations', 'clipboard-check', [
      question('evaluation-groundedness', 'What does groundedness evaluate?',
        [['sources', 'Whether an answer is supported by the provided source material'], ['power', 'Whether a computer is connected to power'], ['monitor', 'Whether a user has a premium monitor']], 'sources',
        'Groundedness checks whether an answer is supported by the supplied context.', sources.evaluation),
      question('evaluation-relevance', 'What does response relevance evaluate?',
        [['color', 'How colorful the interface is'], ['question', 'How well an answer addresses the question'], ['users', 'How many users work at the company']], 'question',
        'Relevance evaluates how well a response addresses the user question.', sources.evaluation),
      question('evaluation-dataset', 'Why use an evaluation dataset?',
        [['authentication', 'To replace user authentication'], ['storage', 'To increase storage capacity automatically'], ['examples', 'To test AI responses consistently across examples']], 'examples',
        'A shared dataset supports consistent evaluation across a set of examples.', sources.evaluation)
    ])
  ],
  agents: [
    quiz('build-agent', 'Build an Agent', 'Microsoft Copilot Studio', 'bot', [
      question('studio-product', 'Which Microsoft product helps you build and customize business agents?',
        [['clipchamp', 'Microsoft Clipchamp'], ['studio', 'Microsoft Copilot Studio'], ['paint', 'Microsoft Paint']], 'studio',
        'Copilot Studio provides tools to build and customize agents with knowledge and actions.', sources.studio),
      question('studio-knowledge', 'What does a knowledge source give an agent?',
        [['information', 'Information it can use to answer questions'], ['processor', 'A new computer processor'], ['permissions', 'Unlimited administrator permissions']], 'information',
        'Knowledge sources supply information an agent can use to answer questions.', sources.studio),
      question('studio-topics', 'What is a topic in Copilot Studio used for?',
        [['wallpaper', 'Choosing a desktop wallpaper'], ['currency', 'Setting an Azure billing currency'], ['flow', 'Defining a conversation flow for an intent or task']], 'flow',
        'Topics define conversation flows for intents or tasks in supported Copilot Studio experiences.', sources.topics)
    ]),
    quiz('tools', 'Give Agents Tools', 'Copilot Studio and Power Automate', 'wrench', [
      question('agent-tools', 'What does an agent tool allow an agent to do?',
        [['capability', 'Perform a supported action or access a capability'], ['policies', 'Ignore all security policies'], ['owner', 'Become the owner of every connected service']], 'capability',
        'Tools give an agent supported capabilities while permissions continue to apply.', sources.tools),
      question('agent-connectors', 'What is a connector used for?',
        [['text', 'Making text larger'], ['service', 'Connecting to a service and its supported operations'], ['monitor', "Increasing a monitor's resolution"]], 'service',
        'A connector provides supported operations for connecting to a service.', sources.connectors),
      question('agent-flows', 'Which Microsoft tool can provide a workflow that an agent calls?',
        [['photos', 'Microsoft Photos'], ['calculator', 'Windows Calculator'], ['automate', 'Power Automate']], 'automate',
        'Power Automate workflows can expose supported actions to agents.', sources.flows)
    ]),
    quiz('services', 'Agent Services', 'Azure AI Foundry Agent Service', 'server', [
      question('agent-service', 'Which Azure AI Foundry service is designed for building and running AI agents?',
        [['agents', 'Agent Service'], ['dns', 'Azure DNS'], ['cost', 'Azure Cost Management']], 'agents',
        'Agent Service provides capabilities for building and running AI agents.', sources.agentService),
      question('agent-interpreter', 'Which agent tool can help run Python for calculations and data analysis?',
        [['cropping', 'Image cropping'], ['interpreter', 'Code Interpreter'], ['spelling', 'Spell check']], 'interpreter',
        'Code Interpreter can run Python in a managed environment for calculations and analysis.', sources.interpreter),
      question('agent-functions', 'What does function calling let a model request?',
        [['server', 'A new physical server'], ['access', 'Unlimited subscription access'], ['function', 'Execution of a defined function with structured arguments']], 'function',
        'Function calling produces structured requests that an application can validate and execute.', sources.functions)
    ])
  ],
  teams: [
    quiz('meeting-copilot', 'Copilot in Meetings', 'Copilot in Teams', 'messages-square', [
      question('teams-summary', 'What can Copilot help you do during a supported Teams meeting?',
        [['summary', 'Summarize the discussion so far'], ['microphone', "Repair another attendee's microphone"], ['furniture', "Change the meeting room's furniture"]], 'summary',
        'Copilot can summarize the meeting content available to it.', sources.teams),
      question('teams-actions', 'Which request is suitable for Copilot in a meeting?',
        [['laptops', '"Upgrade everyone\'s laptop."'], ['actions', '"What action items have been discussed?"'], ['channels', '"Give me access to every private channel."']], 'actions',
        'Copilot can help identify action items discussed in the meeting.', sources.teams),
      question('teams-agreement', 'Can Copilot help identify points of agreement and disagreement in a discussion?',
        [['images', 'No, it only creates images.'], ['calendars', 'No, it only manages calendars.'], ['content', 'Yes, using the meeting content available to it.']], 'content',
        'Copilot can reason over available meeting content to highlight agreements and disagreements.', sources.teams)
    ]),
    quiz('recaps', 'Transcripts and Recaps', 'Microsoft Teams', 'notebook-text', [
      question('teams-transcription', 'What does Teams transcription create?',
        [['text', 'A text record of spoken meeting content'], ['costs', 'A spreadsheet of subscription costs'], ['account', 'A new email account']], 'text',
        'Transcription creates a text record of spoken meeting content.', sources.teams),
      question('teams-recap', 'What is intelligent recap designed to help with?',
        [['router', 'Configuring a router'], ['highlights', 'Reviewing meeting highlights and follow-up information'], ['driver', 'Updating a graphics driver']], 'highlights',
        'Intelligent recap helps people review meeting highlights and follow-up information.', sources.recap),
      question('teams-after-meeting', 'What generally supports Copilot questions about spoken content after a meeting?',
        [['background', 'A custom background'], ['photo', "A participant's profile photo"], ['transcript', 'An accessible saved transcript']], 'transcript',
        'An accessible saved transcript generally supports questions about spoken meeting content afterward.', sources.teams)
    ]),
    quiz('meeting-access', 'Meeting Access', 'Microsoft Teams', 'video', [
      question('teams-recording-storage', 'Where are Teams meeting recordings generally stored?',
        [['files', 'OneDrive or SharePoint'], ['vault', 'Azure Key Vault'], ['packages', 'GitHub Packages']], 'files',
        'Teams meeting recordings are generally stored in OneDrive or SharePoint.', sources.recording),
      question('teams-policies', 'Which controls can administrators use to manage meeting transcription availability?',
        [['themes', 'PowerPoint themes'], ['policies', 'Teams meeting policies'], ['formats', 'Excel number formats']], 'policies',
        'Administrators manage transcription availability through Teams meeting policies.', sources.teams),
      question('teams-recording-permissions', 'Does a Copilot-generated summary automatically give someone permission to open the recording?',
        [['always', 'Yes, always.'], ['name', 'Yes, if the summary mentions their name.'], ['permissions', 'No, recording permissions still apply.']], 'permissions',
        'Receiving a summary does not grant access to the underlying recording.', sources.recording)
    ])
  ],
  orbit: [
    quiz('speech', 'Hear and Speak', 'Azure AI Speech and Translator', 'audio-lines', [
      question('speech-recognition', 'Which Azure AI service converts spoken audio into text?',
        [['speech', 'Azure AI Speech'], ['search', 'Azure AI Search'], ['vault', 'Azure Key Vault']], 'speech',
        'Azure AI Speech provides speech-to-text recognition.', sources.speech),
      question('speech-synthesis', 'What does text-to-speech do?',
        [['photos', 'Converts photographs into tables'], ['audio', 'Converts written text into spoken audio'], ['database', 'Translates a database into code']], 'audio',
        'Text-to-speech synthesizes spoken audio from written text.', sources.speech),
      question('text-translation', 'Which Azure AI service is designed to translate text between languages?',
        [['monitor', 'Azure Monitor'], ['policy', 'Azure Policy'], ['translator', 'Azure AI Translator']], 'translator',
        'Azure AI Translator translates text between supported languages.', sources.translator)
    ]),
    quiz('documents', 'Read and Understand', 'Azure AI Document Intelligence and Language', 'scan-text', [
      question('document-fields', 'Which service extracts fields and tables from documents such as invoices?',
        [['documents', 'Azure AI Document Intelligence'], ['dns', 'Azure DNS'], ['firewall', 'Azure Firewall']], 'documents',
        'Document Intelligence extracts text, fields, and tables from supported documents.', sources.documents),
      question('language-analysis', 'Which service provides features such as sentiment analysis and named entity recognition?',
        [['storage', 'Azure Storage'], ['language', 'Azure AI Language'], ['bastion', 'Azure Bastion']], 'language',
        'Azure AI Language provides sentiment analysis and named entity recognition.', sources.language),
      question('document-ocr', 'What does optical character recognition, or OCR, extract?',
        [['passwords', 'Passwords from user accounts'], ['sound', 'Sound from a microphone'], ['text', 'Text from images or scanned pages']], 'text',
        'OCR extracts text from images and scanned pages.', sources.documents)
    ]),
    quiz('security', 'Protect the Mission', 'Azure security and identity', 'shield-check', [
      question('key-vault', 'Which Azure service stores application secrets and API keys securely?',
        [['vault', 'Azure Key Vault'], ['translator', 'Azure AI Translator'], ['maps', 'Azure Maps']], 'vault',
        'Azure Key Vault stores and controls access to secrets, keys, and certificates.', sources.vault),
      question('managed-identity', 'What lets an Azure application authenticate to supported services without storing its own credentials?',
        [['name', 'A resource display name'], ['identity', 'A managed identity'], ['bookmark', 'A browser bookmark']], 'identity',
        'A managed identity lets supported Azure resources authenticate without application-managed credentials.', sources.identity),
      question('private-endpoint', 'Which feature provides private network connectivity to a supported Azure AI resource?',
        [['playground', 'A model playground'], ['history', 'A chat history panel'], ['endpoint', 'A private endpoint']], 'endpoint',
        'A private endpoint provides private network access to a supported resource.', sources.privateEndpoint)
    ])
  ],
  core: [
    quiz('content-safety', 'Content Safety', 'Azure AI Content Safety', 'shield-alert', [
      question('content-safety-service', 'Which service helps detect harmful text and image content?',
        [['safety', 'Azure AI Content Safety'], ['cost', 'Azure Cost Management'], ['dns', 'Azure DNS']], 'safety',
        'Azure AI Content Safety detects supported categories of harmful text and image content.', sources.safety),
      question('prompt-shields', 'What are Prompt Shields designed to help detect?',
        [['invitations', 'Missing calendar invitations'], ['injection', 'Prompt-injection attacks'], ['battery', 'Low battery warnings']], 'injection',
        'Prompt Shields helps detect prompt-injection attacks in user prompts and documents.', sources.shields),
      question('safety-accuracy', 'Does passing a content safety check guarantee that an answer is factually correct?',
        [['always', 'Yes, every time.'], ['link', 'Yes, if the answer contains a link.'], ['different', 'No, safety and factual accuracy are different checks.']], 'different',
        'Content safety screening does not by itself establish factual accuracy.', sources.safety)
    ]),
    quiz('information', 'Protect Work Information', 'Microsoft Purview', 'file-lock-2', [
      question('purview-product', 'Which Microsoft product family includes information protection and data loss prevention capabilities?',
        [['purview', 'Microsoft Purview'], ['clipchamp', 'Microsoft Clipchamp'], ['paint', 'Microsoft Paint']], 'purview',
        'Microsoft Purview includes information protection and data loss prevention capabilities.', sources.purview),
      question('sensitivity-labels', 'What can sensitivity labels do?',
        [['brightness', "Improve a monitor's brightness"], ['protection', 'Classify information and apply configured protections'], ['context', "Increase a model's context window"]], 'protection',
        'Sensitivity labels classify information and can apply configured protections.', sources.labels),
      question('data-loss-prevention', 'What is data loss prevention, or DLP, designed to help prevent?',
        [['animation', 'Slow animation effects'], ['spelling', 'Misspelled meeting titles'], ['sharing', 'Inappropriate sharing or use of sensitive information']], 'sharing',
        'DLP policies help prevent inappropriate sharing or use of sensitive information.', sources.dlp)
    ]),
    quiz('controls', 'Enterprise AI Controls', 'Microsoft Entra ID and Azure governance', 'sliders-horizontal', [
      question('entra-id', 'Which Microsoft service manages organizational identities and sign-ins?',
        [['entra', 'Microsoft Entra ID'], ['designer', 'Microsoft Designer'], ['forms', 'Microsoft Forms']], 'entra',
        'Microsoft Entra ID manages organizational identities and authentication.', sources.entra),
      question('azure-rbac', 'What does Azure role-based access control determine?',
        [['color', 'Which color an application uses'], ['actions', 'Which actions an identity can perform at a given scope'], ['language', 'Which language a model speaks by default']], 'actions',
        'Azure RBAC assigns permissions for actions at defined scopes.', sources.rbac),
      question('azure-policy', 'Which Azure service can enforce rules such as allowing deployments only in approved regions?',
        [['speech', 'Azure AI Speech'], ['translator', 'Azure AI Translator'], ['policy', 'Azure Policy']], 'policy',
        'Azure Policy can enforce organizational rules such as permitted deployment locations.', sources.policy)
    ])
  ]
};

for (const [level, quizzes] of Object.entries(WORK_TASKS)) {
  for (const item of quizzes) item.level = level;
}