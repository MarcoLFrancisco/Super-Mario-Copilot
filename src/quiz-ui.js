import { WORK_TASKS, QUIZ_THEMES } from './quiz-catalog.js';
import { validateQuiz } from './trivia-tasks.js';

export function renderQuiz(document, view, levelName, feedback = '') {
  const el = id => document.getElementById(id);
  const complete = view.phase === 'complete';
  const checked = view.phase === 'feedback';
  el('task-title').textContent = view.task.title;
  el('task-product').textContent = view.task.product;
  el('quiz-level').textContent = levelName;
  el('work-phase').textContent = complete ? 'Quiz complete' : `Question ${view.questionIndex + 1} of ${view.total}`;
  el('quiz-progress').max = view.total;
  el('quiz-progress').value = view.questionIndex + (checked ? 1 : 0);
  el('work-step-title').textContent = complete ? 'Your score' : view.current.question;
  el('quiz-result').hidden = !complete;
  el('quiz-score').textContent = `${view.score} / ${view.total}`;
  el('task-dialog').dataset.phase = view.phase;
  el('task-choices').hidden = complete;
  el('task-choices').disabled = checked || complete;
  el('task-choices').replaceChildren(...view.options.map(option => {
    const label = document.createElement('label'); label.className = 'quiz-answer';
    const input = document.createElement('input'); input.type = 'radio'; input.name = 'answer';
    input.value = option.id; input.required = true; input.checked = view.response?.answer === option.id;
    input.addEventListener('change', () => { el('task-confirm').disabled = false; });
    const name = document.createElement('span'); name.className = 'answer-text'; name.textContent = option.text;
    const mark = document.createElement('small'); mark.className = 'answer-mark';
    if (checked && option.id === view.current.correctOption) {
      label.dataset.result = 'correct'; mark.textContent = 'Correct answer';
    } else if (checked && input.checked) {
      label.dataset.result = 'incorrect'; mark.textContent = 'Your answer';
    }
    label.append(input, name, mark);
    return label;
  }));
  el('task-feedback').textContent = complete ? '' : feedback;
  el('task-feedback').hidden = complete || !feedback;
  el('task-feedback').dataset.correct = String(view.response?.correct === true);
  el('task-confirm').hidden = complete || checked;
  el('task-confirm').disabled = true;
  el('task-next').hidden = !checked;
  el('task-next-label').textContent = view.questionIndex === view.total - 1 ? 'See score' : 'Next question';
  el('task-retry').hidden = !complete;
  el('task-done').hidden = !complete;
  el('task-cancel').hidden = complete;
}

export function createQuizEditor(document, levels, getOverrides, saveOverrides) {
  const el = id => document.getElementById(id);
  const drafts = new Map();
  let draft = null;
  const option = (value, text) => {
    const node = document.createElement('option'); node.value = value; node.textContent = text; return node;
  };
  const labeled = (title, input) => {
    const label = document.createElement('label');
    const text = document.createElement('span'); text.textContent = title;
    label.append(text, input); return label;
  };
  const input = (name, value, type = 'text') => {
    const node = document.createElement(type === 'textarea' ? 'textarea' : 'input');
    if (type === 'textarea') node.rows = 2;
    else node.type = type;
    node.name = name; node.value = value ?? ''; return node;
  };
  const currentId = () => `${draft.level}-${draft.key}`;
  function readDraft() {
    const values = new FormData(el('quiz-editor-form'));
    const edited = structuredClone(draft);
    edited.title = values.get('title').trim();
    edited.product = values.get('product').trim();
    for (const [index, question] of edited.questions.entries()) {
      const prefix = `question-${index}`;
      question.question = values.get(`${prefix}-text`).trim();
      for (const [position, choice] of question.options.entries()) choice.text = values.get(`${prefix}-option-${position}`).trim();
      question.correctOption = values.get(`${prefix}-correct`);
      question.explanation = values.get(`${prefix}-explanation`).trim();
      question.referenceUrl = values.get(`${prefix}-reference`).trim();
      question.lastVerified = values.get(`${prefix}-verified`) || null;
    }
    return edited;
  }
  function capture() {
    if (draft) drafts.set(currentId(), readDraft());
  }
  function render() {
    const level = el('editor-level').value;
    const key = el('editor-quiz').value;
    const id = `${level}-${key}`;
    draft = structuredClone(drafts.get(id) ?? getOverrides()[id] ?? WORK_TASKS[level].find(item => item.key === key));
    el('editor-title').value = draft.title;
    el('editor-product').value = draft.product;
    el('editor-theme').textContent = QUIZ_THEMES[level];
    el('editor-status').textContent = '';
    el('editor-questions').replaceChildren(...draft.questions.map((question, index) => {
      const prefix = `question-${index}`;
      const group = document.createElement('fieldset'); group.className = 'editor-question';
      const legend = document.createElement('legend'); legend.textContent = `Question ${index + 1} of 3`;
      const prompt = input(`${prefix}-text`, question.question, 'textarea'); prompt.required = true;
      const correct = document.createElement('select'); correct.name = `${prefix}-correct`;
      correct.append(...question.options.map(choice => option(choice.id, choice.text)));
      correct.value = question.correctOption;
      const verified = input(`${prefix}-verified`, question.lastVerified, 'date');
      const unverify = () => { verified.value = ''; };
      prompt.addEventListener('input', unverify); correct.addEventListener('change', unverify);
      group.append(legend, labeled('Question', prompt));
      for (const [position, choice] of question.options.entries()) {
        const answer = input(`${prefix}-option-${position}`, choice.text); answer.required = true;
        answer.addEventListener('input', () => { correct.options[position].textContent = answer.value; unverify(); });
        group.append(labeled(`Option ${position + 1}`, answer));
      }
      const explanation = input(`${prefix}-explanation`, question.explanation, 'textarea');
      const reference = input(`${prefix}-reference`, question.referenceUrl, 'url'); reference.required = true;
      explanation.addEventListener('input', unverify); reference.addEventListener('input', unverify);
      group.append(labeled('Correct answer', correct), labeled('Explanation (optional)', explanation),
        labeled('Official reference URL', reference), labeled('Last verified (blank = unverified)', verified));
      return group;
    }));
  }
  function selectLevel(level) {
    capture();
    el('editor-level').value = level;
    el('editor-quiz').replaceChildren(...WORK_TASKS[level].map(quiz => option(quiz.key,
      getOverrides()[`${level}-${quiz.key}`]?.title ?? quiz.title)));
    el('editor-quiz').value = WORK_TASKS[level][0].key;
    render();
  }
  el('editor-level').replaceChildren(...levels.map(level => option(level.id, `${level.number}. ${level.title}`)));
  el('editor-level').addEventListener('change', () => selectLevel(el('editor-level').value));
  el('editor-quiz').addEventListener('change', () => { capture(); render(); });
  el('quiz-editor-form').addEventListener('submit', event => {
    event.preventDefault();
    const edited = readDraft();
    const error = validateQuiz(edited);
    if (error) { el('editor-status').textContent = error; el('editor-status').focus(); return; }
    const saved = saveOverrides({ ...getOverrides(), [currentId()]: edited });
    draft = edited; drafts.set(currentId(), edited);
    el('editor-quiz').selectedOptions[0].textContent = edited.title;
    el('editor-status').textContent = saved ? 'Saved locally for new runs.' : 'Saved for new runs in this session; browser storage is unavailable.';
    el('editor-status').focus();
  });
  el('editor-reset').addEventListener('click', () => {
    const overrides = { ...getOverrides() }; delete overrides[currentId()]; drafts.delete(currentId());
    const saved = saveOverrides(overrides);
    render();
    el('editor-quiz').selectedOptions[0].textContent = draft.title;
    el('editor-status').textContent = saved ? 'Default quiz restored locally for new runs.' : 'Default quiz restored for new runs in this session.';
    el('editor-status').focus();
  });
  el('editor-export').addEventListener('click', () => {
    const data = Object.fromEntries(Object.entries(WORK_TASKS).map(([level, quizzes]) => [level,
      quizzes.map(quiz => getOverrides()[`${level}-${quiz.key}`] ?? quiz)]));
    const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }));
    const link = document.createElement('a'); link.href = url; link.download = 'cloud-quest-quizzes.json';
    document.body.append(link); link.click(); link.remove(); URL.revokeObjectURL(url);
    el('editor-status').textContent = 'Exported saved quizzes.';
  });
  return { selectLevel };
}