import { WORK_TASKS } from './quiz-catalog.js';

export function validateQuiz(quiz) {
  const hasText = value => typeof value === 'string' && value.trim().length > 0;
  if (!quiz || !Object.hasOwn(WORK_TASKS, quiz.level)
    || !WORK_TASKS[quiz.level].some(item => item.key === quiz.key)) return 'Choose an existing level and quiz.';
  if (!hasText(quiz.title) || !hasText(quiz.product)) return 'Quiz title and product are required.';
  if (!Array.isArray(quiz.questions) || quiz.questions.length !== 3) return 'Each quiz must have exactly three questions.';
  const ids = new Set();
  for (const question of quiz.questions) {
    if (!question || !hasText(question.id) || ids.has(question.id) || !hasText(question.question)) return 'Questions need text and unique IDs.';
    ids.add(question.id);
    if (!Array.isArray(question.options) || question.options.length !== 3
      || question.options.some(option => !option || !hasText(option.id) || !hasText(option.text))
      || new Set(question.options.map(option => option.id)).size !== 3) return 'Each question needs three distinct answer options.';
    if (!question.options.some(option => option.id === question.correctOption)) return 'Choose a correct answer for each question.';
    if (question.explanation != null && typeof question.explanation !== 'string') return 'Explanations must be text.';
    try {
      const url = new URL(question.referenceUrl);
      if (url.protocol !== 'https:' || url.username || url.password
        || !['learn.microsoft.com', 'support.microsoft.com', 'www.microsoft.com', 'docs.github.com'].includes(url.hostname)) {
        return 'Use an HTTPS official Microsoft or GitHub reference URL.';
      }
    } catch { return 'Each question needs an official reference URL.'; }
    if (question.lastVerified != null && (!/^\d{4}-\d{2}-\d{2}$/.test(question.lastVerified)
      || !Number.isFinite(Date.parse(question.lastVerified))
      || new Date(question.lastVerified).toISOString().slice(0, 10) !== question.lastVerified)) return 'Use a valid verification date or leave it blank.';
  }
  return null;
}

export function validQuizOverrides(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  return Object.fromEntries(Object.entries(value).filter(([id, quiz]) => !validateQuiz(quiz)
    && id === `${quiz.level}-${quiz.key}`).map(([id, quiz]) => [id, structuredClone(quiz)]));
}

export function workView(station, job = {}) {
  const task = station.workflow;
  const questionIndex = job.questionIndex ?? 0;
  const total = task.questions.length;
  const response = job.responses?.[questionIndex] ?? null;
  const phase = questionIndex === total ? 'complete' : response ? 'feedback' : 'question';
  const score = (job.responses ?? []).filter(answer => answer.correct).length;
  const current = task.questions[questionIndex] ?? null;
  const options = current ? (job.optionOrder?.[questionIndex] ?? current.options.map(option => option.id))
    .map(id => current.options.find(option => option.id === id)) : [];
  return { phase, task, current, questionIndex, total, score, response, options, attempt: job.attempt ?? 0 };
}

export function prepareQuiz(station, job, random = Math.random) {
  if (job.optionOrder) return;
  job.optionOrder = station.workflow.questions.map(question => {
    const order = question.options.map(option => option.id);
    for (let index = order.length - 1; index > 0; index -= 1) {
      const target = Math.floor(random() * (index + 1));
      [order[index], order[target]] = [order[target], order[index]];
    }
    return order;
  });
}

export function submitWork(station, job, submission) {
  const view = workView(station, job);
  if (submission?.attempt !== view.attempt) return { accepted: false, message: 'This quiz attempt has changed.' };
  if (submission.action === 'retry' && view.phase === 'complete') {
    job.questionIndex = 0; job.responses = []; job.feedback = ''; job.status = 'answering';
    job.attempt = view.attempt + 1; delete job.optionOrder; delete job.artifact;
    prepareQuiz(station, job);
    return { accepted: true, message: 'New attempt. Question 1 of 3.' };
  }
  if (view.phase === 'complete') return { accepted: false, message: `${view.task.title} is already complete.` };
  if (!submission || submission.questionIndex !== view.questionIndex) {
    return { accepted: false, message: `Current question: ${view.questionIndex + 1} of ${view.total}.` };
  }
  if (submission.action === 'check' && view.phase === 'question') {
    if (!view.current.options.some(option => option.id === submission.answer)) {
      return { accepted: false, message: 'Choose an answer first.' };
    }
    prepareQuiz(station, job);
    const correct = submission.answer === view.current.correctOption;
    job.responses ??= [];
    job.responses.push({ answer: submission.answer, correct });
    job.status = 'feedback';
    const answer = view.current.options.find(option => option.id === view.current.correctOption).text;
    job.feedback = `${correct ? 'Correct.' : 'Not quite.'} Correct answer: ${answer}${view.current.explanation ? `\n${view.current.explanation}` : ''}`;
    return { accepted: true, correct, message: job.feedback };
  }
  if (submission.action === 'next' && view.phase === 'feedback') {
    job.questionIndex = view.questionIndex + 1;
    job.feedback = '';
    job.status = 'answering';
    if (job.questionIndex === view.total) {
      job.completed = true;
      job.artifact = { title: `${view.task.title} badge`, score: view.score, total: view.total };
      return { accepted: true, complete: true, message: `${view.task.title}: ${view.score} / ${view.total} correct.` };
    }
    return { accepted: true, message: `Question ${job.questionIndex + 1} of ${view.total}.` };
  }
  return { accepted: false, message: view.phase === 'feedback' ? 'Answer already checked. Select Next.' : 'Check an answer before continuing.' };
}