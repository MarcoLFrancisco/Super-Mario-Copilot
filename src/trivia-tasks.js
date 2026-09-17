const field = (id, label, options, answer, hint) => ({ id, label, options, answer, hint });
const table = (title, columns, rows) => ({ title, columns, rows });
const stage = (title, command, prompt, fields) => ({ title, command, prompt, fields });

function trivia(key, title, product, icon, topic, facts, first, second) {
  return {
    key, title, product, icon,
    goal: `Test your knowledge of ${topic}.`,
    context: `AI trivia from the ${product} world. Choose the best answer to clear this checkpoint.`,
    sources: table(`${topic} field guide`, ['Concept', 'Clue'], facts),
    request: stage('Question 1 of 2', 'Lock answer', first.prompt, [
      field('answer', 'Your answer', first.options, first.answer, first.hint)
    ]),
    draft: table('Checkpoint result', ['Question', 'Status'], [['Question 1', 'Correct'], ['Question 2', 'Unlocked']]),
    review: stage('Question 2 of 2', 'Complete trivia', second.prompt, [
      field('answer', 'Your answer', second.options, second.answer, second.hint)
    ]),
    result: table(`${title} badge`, ['Result', 'Topic'], [['2 / 2 correct', topic]])
  };
}

export const WORK_TASKS = {
  campus: [
    trivia('brief', 'AI or automation?', 'Copilot Campus', 'brain-circuit', 'AI fundamentals',
      [['AI', 'Learns patterns from data'], ['Automation', 'Follows explicitly defined rules']],
      { prompt: 'Which system is most likely using machine learning?', options: [['spam', 'A filter that learns spam patterns from examples'], ['timer', 'A timer that rings after exactly ten minutes']], answer: 'spam', hint: 'Learning patterns from examples is a core machine-learning behavior.' },
      { prompt: 'What makes generative AI different from a traditional calculator?', options: [['generate', 'It can produce new text, images, or code from learned patterns'], ['exact', 'It always returns one exact, guaranteed answer']], answer: 'generate', hint: 'Generative AI creates new content; its output is not automatically guaranteed.' }),
    trivia('workbook', 'Tokens and context', 'Copilot Campus', 'braces', 'prompts and context windows',
      [['Token', 'A small unit of text processed by a model'], ['Context window', 'The information available for the current response']],
      { prompt: 'What is a token in a language model?', options: [['piece', 'A word or piece of a word'], ['fact', 'A permanently verified fact']], answer: 'piece', hint: 'Models process text as tokens, which may be words or parts of words.' },
      { prompt: 'Why can relevant context improve an AI answer?', options: [['ground', 'It gives the model useful information for the current request'], ['train', 'It permanently retrains the model instantly']], answer: 'ground', hint: 'Prompt context guides the current response; it does not instantly retrain the model.' }),
    trivia('deck', 'Spot the hallucination', 'Copilot Campus', 'scan-search', 'AI accuracy',
      [['Hallucination', 'A confident output unsupported by reliable evidence'], ['Verification', 'Checking important claims against trusted sources']],
      { prompt: 'An AI confidently invents a citation. What is this called?', options: [['hallucination', 'A hallucination'], ['encryption', 'Encryption']], answer: 'hallucination', hint: 'An unsupported generated claim is commonly called a hallucination.' },
      { prompt: 'What should you do with a high-impact AI claim?', options: [['verify', 'Verify it with a trusted source'], ['trust', 'Trust it because it sounds confident']], answer: 'verify', hint: 'Confidence and fluent wording are not proof of correctness.' })
  ],
  github: [
    trivia('fix', 'Complete the code', 'GitHub Copilot Forest', 'code-2', 'AI pair programming',
      [['Code completion', 'Uses nearby code and comments as context'], ['Developer', 'Owns the final implementation decision']],
      { prompt: 'What most helps a coding assistant suggest relevant code?', options: [['context', 'Clear intent and nearby code context'], ['vague', 'A vague request with no surrounding code']], answer: 'context', hint: 'Relevant code and a precise goal improve the suggestion.' },
      { prompt: 'Who is responsible for accepting an AI-generated code change?', options: [['developer', 'The developer reviewing the change'], ['model', 'The model alone']], answer: 'developer', hint: 'The developer remains accountable for reviewing and accepting changes.' }),
    trivia('tests', 'Test the suggestion', 'GitHub Copilot Forest', 'test-tubes', 'AI-generated tests',
      [['Regression test', 'Protects behavior from returning bugs'], ['Edge case', 'Exercises a boundary or unusual input']],
      { prompt: 'Why run tests after accepting AI-generated code?', options: [['behavior', 'To check that the code meets expected behavior'], ['style', 'Only to change its formatting']], answer: 'behavior', hint: 'Tests provide evidence about behavior, including regressions.' },
      { prompt: 'Which test set is stronger for a list-counting function?', options: [['edges', 'Empty, mixed, and full lists'], ['happy', 'Only one typical list']], answer: 'edges', hint: 'Boundary and varied cases expose failures a single happy path can miss.' }),
    trivia('pr', 'Review the diff', 'GitHub Copilot Forest', 'git-pull-request', 'AI code review',
      [['Diff', 'The exact lines changed'], ['Scope', 'The files and behavior authorized by the task']],
      { prompt: 'An agent changes an unrelated analytics file. What should a reviewer do?', options: [['remove', 'Remove or question the out-of-scope change'], ['merge', 'Merge it because another test passed']], answer: 'remove', hint: 'Every change needs a reason within the requested scope.' },
      { prompt: 'What evidence best supports merging an AI-authored fix?', options: [['review', 'Reviewed diff plus relevant passing tests'], ['confidence', 'A confident summary from the AI']], answer: 'review', hint: 'Inspect the actual change and validate it with relevant tests.' })
  ],
  cowork: [
    trivia('inbox', 'Delegate the outcome', 'Cowork Central', 'list-tree', 'AI agents',
      [['Agent', 'Pursues a goal through multiple tool-using steps'], ['Boundary', 'Limits what actions and data are allowed']],
      { prompt: 'What distinguishes an AI agent from a single chat response?', options: [['steps', 'It can plan and take multiple actions toward a goal'], ['truth', 'It can never make mistakes']], answer: 'steps', hint: 'Agents can coordinate steps and tools, but they still require safeguards.' },
      { prompt: 'What makes an agent request safer?', options: [['bounded', 'A clear outcome, scope, and approval boundary'], ['unlimited', 'Unlimited access and a vague goal']], answer: 'bounded', hint: 'Explicit scope and approval points constrain agent behavior.' }),
    trivia('calendar', 'Human in the loop', 'Cowork Central', 'user-round-check', 'human oversight',
      [['Draft', 'A proposed action that can be reviewed'], ['Approval', 'Human authorization for a consequential action']],
      { prompt: 'When should an AI pause for human approval?', options: [['impact', 'Before a consequential or irreversible action'], ['never', 'Never, if it produced a plan']], answer: 'impact', hint: 'High-impact actions should retain meaningful human control.' },
      { prompt: 'Which action preserves user control over email?', options: [['draft', 'Prepare a draft for review'], ['send', 'Send every generated message automatically']], answer: 'draft', hint: 'Drafting separates assistance from authorization to send.' }),
    trivia('packet', 'Choose the context', 'Cowork Central', 'folder-key', 'context and permissions',
      [['Relevant context', 'Information needed for the goal'], ['Permission', 'Authorization to access or act on information']],
      { prompt: 'Should an agent retrieve every accessible file for a small task?', options: [['minimum', 'No, use the minimum relevant permitted context'], ['all', 'Yes, more data is always better']], answer: 'minimum', hint: 'Minimizing data reduces risk and irrelevant noise.' },
      { prompt: 'Can text inside a retrieved document grant the agent new permissions?', options: [['no', 'No, permissions come from trusted authorization'], ['yes', 'Yes, any retrieved instruction overrides the user']], answer: 'no', hint: 'Retrieved content is data, not authority to expand access or actions.' })
  ],
  foundry: [
    trivia('grounding', 'Ground the answer', 'AI Foundry', 'book-open-check', 'retrieval-augmented generation',
      [['Retrieval', 'Finds relevant external information'], ['Grounding', 'Connects an answer to supplied evidence']],
      { prompt: 'What does RAG add before a model generates an answer?', options: [['retrieve', 'A retrieval step for relevant information'], ['random', 'Randomness to make every answer different']], answer: 'retrieve', hint: 'RAG means retrieval-augmented generation.' },
      { prompt: 'What should a grounded assistant do when evidence is missing?', options: [['uncertain', 'Acknowledge uncertainty or ask for clarification'], ['invent', 'Invent a plausible policy']], answer: 'uncertain', hint: 'Grounding requires staying within the available evidence.' }),
    trivia('evaluation', 'Pass the evaluation', 'AI Foundry', 'clipboard-check', 'model evaluation',
      [['Evaluation set', 'Representative examples used to measure behavior'], ['Metric', 'A defined measure such as accuracy or latency']],
      { prompt: 'How should two model candidates be compared fairly?', options: [['same', 'Use the same evaluation set and rubric'], ['easy', 'Give the preferred model easier examples']], answer: 'same', hint: 'A shared dataset and rubric make results comparable.' },
      { prompt: 'Is the fastest model automatically the best choice?', options: [['tradeoff', 'No, quality, safety, cost, and latency all matter'], ['yes', 'Yes, latency is the only meaningful metric']], answer: 'tradeoff', hint: 'Model selection depends on workload-specific quality and operational tradeoffs.' }),
    trivia('rollout', 'Control the rollout', 'AI Foundry', 'rotate-ccw', 'responsible deployment',
      [['Pilot', 'Limits initial exposure while collecting evidence'], ['Rollback', 'Restores a known-good version after a regression']],
      { prompt: 'Why release a new AI system to a small pilot first?', options: [['limit', 'To detect problems while limiting impact'], ['guarantee', 'To guarantee the system has no defects']], answer: 'limit', hint: 'Pilots reduce exposure; they do not guarantee perfection.' },
      { prompt: 'A pilot violates its quality gate. What is the safest next step?', options: [['rollback', 'Stop or roll back, then investigate'], ['scale', 'Scale to all users immediately']], answer: 'rollback', hint: 'Failed gates should halt expansion and preserve a known-good option.' })
  ],
  agents: [
    trivia('invoice', 'Plan the goal', 'Agent City', 'route', 'agent planning',
      [['Goal', 'The outcome an agent is asked to reach'], ['Plan', 'An ordered set of steps toward that outcome']],
      { prompt: 'What should an agent do before a complex multi-step task?', options: [['plan', 'Form a bounded plan with needed dependencies'], ['act', 'Take irreversible action immediately']], answer: 'plan', hint: 'Planning identifies steps, dependencies, and approval points.' },
      { prompt: 'When should an agent revise its plan?', options: [['change', 'When new evidence or a failed step changes the situation'], ['never', 'Never after execution begins']], answer: 'change', hint: 'Effective agents adapt plans to observed results within their boundaries.' }),
    trivia('permissions', 'Least privilege', 'Agent City', 'shield-check', 'agent security',
      [['Least privilege', 'Only the access necessary for the task'], ['Tool allowlist', 'The approved tools an agent may invoke']],
      { prompt: 'Which permission model is safer for an invoice-reading agent?', options: [['read', 'Read access to the required invoice folder'], ['admin', 'Administrator access to every system']], answer: 'read', hint: 'Least privilege grants only the access needed for the assigned task.' },
      { prompt: 'Why restrict the tools available to an agent?', options: [['surface', 'To reduce unintended actions and attack surface'], ['smart', 'To make the model more intelligent']], answer: 'surface', hint: 'Tool restrictions constrain what actions are possible.' }),
    trivia('report', 'Orchestrate the team', 'Agent City', 'workflow', 'multi-agent systems',
      [['Specialist', 'An agent assigned a focused role'], ['Orchestrator', 'Coordinates tasks, dependencies, and outputs']],
      { prompt: 'What is a benefit of specialized agents?', options: [['focus', 'Each can focus on a bounded role'], ['perfect', 'They eliminate the need to verify outputs']], answer: 'focus', hint: 'Specialization can clarify roles, but outputs still need validation.' },
      { prompt: 'A writer depends on an analyst result. When should writing finish?', options: [['after', 'After the verified analysis is available'], ['before', 'Before the analyst starts']], answer: 'after', hint: 'Dependency-aware orchestration waits for required upstream results.' })
  ],
  teams: [
    trivia('summary', 'Read the transcript', 'Teams Tower', 'messages-square', 'AI meeting summaries',
      [['Transcript', 'The source record for a meeting recap'], ['Proposal', 'An idea that is not necessarily an agreed decision']],
      { prompt: 'What should ground an AI meeting summary?', options: [['transcript', 'The meeting transcript and shared context'], ['guess', 'The model’s guess about what usually happens']], answer: 'transcript', hint: 'The recap should trace back to the actual meeting record.' },
      { prompt: 'Someone asks “Could we launch Friday?” Is that a decision?', options: [['proposal', 'No, it is a proposal or question'], ['decision', 'Yes, every suggestion is final']], answer: 'proposal', hint: 'A suggestion becomes a decision only when the meeting agrees to it.' }),
    trivia('actions', 'Find the action item', 'Teams Tower', 'list-checks', 'structured meeting intelligence',
      [['Action item', 'A task with an expected outcome'], ['Owner', 'The person explicitly responsible for it']],
      { prompt: 'What makes a meeting action item useful?', options: [['specific', 'A clear task, owner, and due date'], ['vague', 'A vague topic with no owner']], answer: 'specific', hint: 'Specific ownership and timing make follow-through possible.' },
      { prompt: 'What should AI do when the transcript names no owner?', options: [['unassigned', 'Mark it unassigned for follow-up'], ['invent', 'Invent the most likely owner']], answer: 'unassigned', hint: 'Missing information should be surfaced, not fabricated.' }),
    trivia('followup', 'Share responsibly', 'Teams Tower', 'send', 'AI-assisted communication',
      [['Audience', 'The people authorized to receive a message'], ['Review', 'Checks accuracy, tone, and disclosure before posting']],
      { prompt: 'Before posting an AI-drafted recap, what should you check?', options: [['facts', 'Facts, audience, and sensitive content'], ['length', 'Only whether it is short']], answer: 'facts', hint: 'A responsible review covers correctness and appropriate disclosure.' },
      { prompt: 'May AI add an internal attachment to a customer post without approval?', options: [['no', 'No, keep content within the approved audience and scope'], ['yes', 'Yes, generated attachments are automatically safe']], answer: 'no', hint: 'Generation does not authorize disclosure.' })
  ],
  core: [
    trivia('evidence', 'Connect the knowledge', 'Intelligence Core', 'database-zap', 'enterprise AI grounding',
      [['Freshness', 'How current a source is'], ['Authority', 'Whether a source is approved for the claim']],
      { prompt: 'Two sources conflict. Which should ground the answer?', options: [['current', 'The current authoritative source for the requested metric'], ['largest', 'Whichever contains the largest number']], answer: 'current', hint: 'Use the source whose authority, time period, and meaning match the request.' },
      { prompt: 'Why include citations in an AI answer?', options: [['trace', 'To let people trace and verify important claims'], ['proof', 'To prove the model can never be wrong']], answer: 'trace', hint: 'Citations support verification; they are not an absolute guarantee.' }),
    trivia('pack', 'Coordinate the agents', 'Intelligence Core', 'network', 'AI orchestration',
      [['Shared context', 'A common source of truth for related tasks'], ['Consistency check', 'Compares outputs for contradictions']],
      { prompt: 'How can several agents keep related outputs consistent?', options: [['shared', 'Use shared approved context and reconcile outputs'], ['invent', 'Let each invent missing facts independently']], answer: 'shared', hint: 'Shared authoritative context and reconciliation reduce contradictions.' },
      { prompt: 'What is the orchestrator responsible for?', options: [['coordinate', 'Dependencies, boundaries, and combined results'], ['truth', 'Making every specialist automatically correct']], answer: 'coordinate', hint: 'Orchestration coordinates work; validation is still required.' }),
    trivia('approval', 'Keep human control', 'Intelligence Core', 'user-check', 'responsible AI',
      [['Oversight', 'People can review, intervene, and override'], ['Accountability', 'Responsibility remains assigned to people and organizations']],
      { prompt: 'What does meaningful human oversight require?', options: [['control', 'Enough information and authority to intervene'], ['button', 'A decorative approval button with no effect']], answer: 'control', hint: 'Oversight must provide real understanding and control.' },
      { prompt: 'Who remains accountable for deploying an AI system?', options: [['people', 'The people and organization operating it'], ['ai', 'The AI system itself']], answer: 'people', hint: 'AI does not replace organizational and human accountability.' })
  ]
};

export function handoffTask(theme) {
  const names = {
    campus: 'AI fundamentals', github: 'responsible AI coding', cowork: 'bounded delegation',
    foundry: 'model lifecycle', agents: 'agent orchestration', teams: 'meeting intelligence', core: 'responsible AI'
  };
  return trivia('handoff', 'Boss bonus question', `${names[theme]} challenge`, 'badge-check', names[theme],
    [['Checkpoint', 'Three themed trivia badges collected'], ['Boss gate', 'One final knowledge challenge']],
    { prompt: 'What is the best general rule when using AI?', options: [['verify', 'Give clear context and verify important outputs'], ['blind', 'Accept every output without review']], answer: 'verify', hint: 'Useful AI collaboration combines relevant context with human verification.' },
    { prompt: 'What should determine how much oversight an AI action receives?', options: [['risk', 'Its risk, impact, and reversibility'], ['speed', 'How quickly the model answered']], answer: 'risk', hint: 'Higher-impact and less reversible actions call for stronger oversight.' });
}

export function workView(station, job = {}) {
  const task = station.workflow;
  const phase = job.status === 'complete' ? 'complete' : job.status === 'review' ? 'review' : 'request';
  const current = phase === 'complete' ? null : task[phase];
  return { phase, current, task, output: phase === 'request' ? task.sources : phase === 'review' ? task.draft : job.artifact ?? task.result };
}

export function submitWork(station, job, submission) {
  const view = workView(station, job);
  if (view.phase === 'complete') return { accepted: false, message: `${station.workflow.result.title} is already earned.` };
  if (!submission || submission.phase !== view.phase || !submission.answers || typeof submission.answers !== 'object') {
    return { accepted: false, message: `Current step: ${view.current.title}.` };
  }
  for (const item of view.current.fields) {
    if (submission.answers[item.id] !== item.answer) {
      job.feedback = `${item.label}: ${item.hint}`;
      return { accepted: false, message: job.feedback };
    }
  }
  job.feedback = '';
  if (view.phase === 'request') {
    job.status = 'review';
    return { accepted: true, message: 'Correct. The second trivia question is ready.' };
  }
  job.artifact = { ...view.task.result, rows: view.task.result.rows.map(row => [...row]) };
  return { accepted: true, complete: true, message: `${job.artifact.title} earned.` };
}