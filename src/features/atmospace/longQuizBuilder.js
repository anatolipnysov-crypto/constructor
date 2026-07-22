import { normalizeQuizDefinition } from './quizEngine.js'

export const LONG_QUIZ_MIN_QUESTIONS = 3
export const LONG_QUIZ_MAX_QUESTIONS = 7

function text(value, fallback = '') {
  return typeof value === 'string' && value.trim()
    ? value.trim()
    : fallback
}

function identifier(value, fallback) {
  return text(value, fallback)
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 96) || fallback
}

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;')
}

function escapeScriptJson(value) {
  return JSON.stringify(value)
    .replaceAll('<', '\\u003c')
    .replaceAll('>', '\\u003e')
    .replaceAll('&', '\\u0026')
    .replaceAll('\u2028', '\\u2028')
    .replaceAll('\u2029', '\\u2029')
}

export function normalizeLongQuizProject(project) {
  const rawResults = Array.isArray(project?.results) ? project.results : []
  const results = rawResults
    .map((result, index) => ({
      key: identifier(result?.key, `result-${index + 1}`),
      title: text(result?.title, `Результат ${index + 1}`),
      body: text(result?.body, 'Добавьте понятное описание результата.'),
      priority: index,
    }))
    .filter((result, index, array) => array.findIndex((item) => item.key === result.key) === index)

  const availableResultKeys = new Set(results.map((result) => result.key))
  const fallbackResultKey = results[0]?.key ?? 'clarity'
  const rawQuestions = Array.isArray(project?.questions) ? project.questions : []
  const questions = rawQuestions
    .slice(0, LONG_QUIZ_MAX_QUESTIONS)
    .map((question, questionIndex) => {
      const questionId = identifier(question?.id, `question-${questionIndex + 1}`)
      const options = (Array.isArray(question?.options) ? question.options : [])
        .map((option, optionIndex) => {
          const resultKey = availableResultKeys.has(option?.resultKey)
            ? option.resultKey
            : fallbackResultKey
          return {
            id: identifier(option?.id, `${questionId}-option-${optionIndex + 1}`),
            label: text(option?.label, `Вариант ответа ${optionIndex + 1}`),
            resultKey,
            weights: { [resultKey]: 3 },
          }
        })
        .filter((option, optionIndex, array) => array.findIndex((item) => item.id === option.id) === optionIndex)

      return {
        id: questionId,
        title: text(question?.title, `Вопрос ${questionIndex + 1}`),
        description: text(question?.description),
        options,
      }
    })

  return {
    id: identifier(project?.id, 'atmospace-long-quiz'),
    version: text(project?.version, '1'),
    name: text(project?.name, 'Персональный квиз'),
    eyebrow: text(project?.eyebrow, 'Персональная точка старта'),
    title: text(project?.title, 'Что сейчас мешает вам двигаться вперёд?'),
    subtitle: text(project?.subtitle, 'Ответьте на несколько коротких вопросов.'),
    intro: text(project?.intro),
    resultLead: text(project?.resultLead, 'На основе ваших ответов мы определили направление, с которого разумнее начать.'),
    registrationText: text(project?.registrationText, 'Создайте аккаунт, чтобы получить первый персональный шаг.'),
    registrationButtonText: text(project?.registrationButtonText, 'Получить первый персональный шаг'),
    questions,
    results,
  }
}

export function validateLongQuizProject(project) {
  const quiz = normalizeLongQuizProject(project)
  const errors = []

  if (quiz.results.length === 0) {
    errors.push('Добавьте хотя бы один результат.')
  }

  if (quiz.questions.length < LONG_QUIZ_MIN_QUESTIONS) {
    errors.push(`Добавьте минимум ${LONG_QUIZ_MIN_QUESTIONS} вопроса.`)
  }

  if (quiz.questions.length > LONG_QUIZ_MAX_QUESTIONS) {
    errors.push(`Оставьте не больше ${LONG_QUIZ_MAX_QUESTIONS} вопросов.`)
  }

  quiz.questions.forEach((question, index) => {
    if (!question.title) {
      errors.push(`Заполните текст вопроса ${index + 1}.`)
    }
    if (question.options.length < 2) {
      errors.push(`В вопросе ${index + 1} должно быть минимум два ответа.`)
    }
    question.options.forEach((option) => {
      if (!option.label) {
        errors.push(`Заполните все ответы в вопросе ${index + 1}.`)
      }
    })
  })

  if (errors.length === 0) {
    try {
      normalizeQuizDefinition(buildQuizEngineDefinition(quiz))
    } catch {
      errors.push('Проверьте вопросы, ответы и результаты.')
    }
  }

  return {
    ok: errors.length === 0,
    errors,
    project: quiz,
  }
}

export function buildQuizEngineDefinition(project) {
  const quiz = normalizeLongQuizProject(project)
  return {
    id: quiz.id,
    version: quiz.version,
    results: quiz.results.map((result) => ({
      key: result.key,
      priority: result.priority,
    })),
    questions: quiz.questions.map((question) => ({
      id: question.id,
      options: question.options.map((option) => ({
        id: option.id,
        weights: option.weights,
      })),
    })),
  }
}

function renderQuestion(question, index) {
  const options = question.options.map((option) => `
            <label class="quiz-option">
              <input type="radio" name="${escapeHtml(question.id)}" value="${escapeHtml(option.id)}">
              <span class="quiz-option__marker"></span>
              <span>${escapeHtml(option.label)}</span>
            </label>`).join('')

  return `
        <section class="quiz-question" data-question-id="${escapeHtml(question.id)}">
          <div class="quiz-question__number">${index + 1}</div>
          <div class="quiz-question__content">
            <h2>${escapeHtml(question.title)}</h2>
            ${question.description ? `<p>${escapeHtml(question.description)}</p>` : ''}
            <div class="quiz-options">${options}
            </div>
          </div>
        </section>`
}

export function buildLongQuizLandingHtml(project) {
  const validation = validateLongQuizProject(project)
  if (!validation.ok) {
    throw new Error(validation.errors[0] ?? 'Квиз пока не готов.')
  }

  const quiz = validation.project
  const publicConfig = {
    id: quiz.id,
    version: quiz.version,
    questions: quiz.questions.map((question) => ({
      id: question.id,
      options: question.options.map((option) => ({
        id: option.id,
        weights: option.weights,
      })),
    })),
    results: quiz.results.map((result) => ({
      key: result.key,
      title: result.title,
      body: result.body,
      priority: result.priority,
    })),
    resultLead: quiz.resultLead,
    registrationText: quiz.registrationText,
    registrationButtonText: quiz.registrationButtonText,
  }

  const questionsHtml = quiz.questions.map(renderQuestion).join('\n')

  return `<!doctype html>
<html lang="ru">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>${escapeHtml(quiz.name)}</title>
  <style>
    :root { color-scheme: light; --ink:#0f172a; --muted:#64748b; --line:#dbe4f0; --accent:#2563eb; --accent-dark:#1d4ed8; --soft:#eff6ff; --success:#059669; }
    * { box-sizing:border-box; }
    html { scroll-behavior:smooth; }
    body { margin:0; background:#f8fafc; color:var(--ink); font-family:Inter,Manrope,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif; }
    button,input { font:inherit; }
    .quiz-page { width:min(920px,calc(100% - 28px)); margin:0 auto; padding:28px 0 72px; }
    .quiz-hero { padding:42px clamp(22px,5vw,56px); border-radius:32px; color:white; background:radial-gradient(circle at 90% 0%,rgba(250,204,21,.32),transparent 34%),linear-gradient(135deg,#0f172a,#1e3a8a 58%,#0f172a); box-shadow:0 28px 70px rgba(15,23,42,.2); }
    .quiz-eyebrow { display:inline-flex; padding:7px 13px; border-radius:999px; background:#facc15; color:#172033; font-size:12px; font-weight:900; letter-spacing:.06em; text-transform:uppercase; }
    .quiz-hero h1 { margin:18px 0 12px; max-width:760px; font-size:clamp(34px,6vw,64px); line-height:1.02; letter-spacing:-.045em; }
    .quiz-hero__subtitle { max-width:720px; margin:0; color:#dbeafe; font-size:clamp(17px,2.5vw,22px); line-height:1.5; }
    .quiz-intro { margin:22px 0 0; padding:18px 20px; border-radius:18px; background:rgba(255,255,255,.1); color:#e2e8f0; line-height:1.55; }
    .quiz-progress { position:sticky; top:10px; z-index:20; display:flex; align-items:center; gap:12px; margin:18px 0; padding:12px 16px; border:1px solid rgba(219,228,240,.9); border-radius:16px; background:rgba(255,255,255,.92); backdrop-filter:blur(12px); box-shadow:0 10px 30px rgba(15,23,42,.08); }
    .quiz-progress__track { flex:1; height:8px; overflow:hidden; border-radius:999px; background:#e2e8f0; }
    .quiz-progress__bar { width:0; height:100%; border-radius:inherit; background:linear-gradient(90deg,var(--accent),#06b6d4); transition:width .25s ease; }
    .quiz-progress__text { min-width:92px; color:var(--muted); font-size:13px; font-weight:800; text-align:right; }
    .quiz-question { display:grid; grid-template-columns:54px minmax(0,1fr); gap:18px; margin:18px 0; padding:clamp(22px,4vw,38px); border:1px solid var(--line); border-radius:26px; background:white; box-shadow:0 16px 45px rgba(15,23,42,.07); }
    .quiz-question__number { display:grid; place-items:center; width:48px; height:48px; border-radius:16px; background:var(--soft); color:var(--accent); font-size:19px; font-weight:900; }
    .quiz-question h2 { margin:2px 0 8px; font-size:clamp(23px,3vw,32px); line-height:1.15; letter-spacing:-.025em; }
    .quiz-question p { margin:0 0 18px; color:var(--muted); line-height:1.55; }
    .quiz-options { display:grid; gap:10px; }
    .quiz-option { position:relative; display:flex; align-items:flex-start; gap:12px; padding:16px; border:2px solid #e2e8f0; border-radius:16px; cursor:pointer; font-weight:750; line-height:1.4; transition:.18s ease; }
    .quiz-option:hover { border-color:#93c5fd; transform:translateY(-1px); }
    .quiz-option input { position:absolute; opacity:0; pointer-events:none; }
    .quiz-option__marker { flex:0 0 auto; width:22px; height:22px; margin-top:1px; border:2px solid #94a3b8; border-radius:50%; background:white; box-shadow:inset 0 0 0 5px white; }
    .quiz-option:has(input:checked) { border-color:var(--accent); background:var(--soft); color:#1e3a8a; }
    .quiz-option:has(input:checked) .quiz-option__marker { border-color:var(--accent); background:var(--accent); }
    .quiz-result { display:none; margin-top:20px; padding:clamp(28px,5vw,50px); border-radius:30px; background:linear-gradient(145deg,#ecfdf5,#eff6ff); border:2px solid #a7f3d0; box-shadow:0 24px 65px rgba(5,150,105,.13); }
    .quiz-result.is-visible { display:block; animation:result-in .35s ease both; }
    .quiz-result__label { color:var(--success); font-size:13px; font-weight:900; letter-spacing:.08em; text-transform:uppercase; }
    .quiz-result h2 { margin:12px 0; font-size:clamp(28px,4vw,44px); line-height:1.08; letter-spacing:-.035em; }
    .quiz-result p { color:#334155; font-size:17px; line-height:1.65; }
    .quiz-registration { margin-top:24px; padding-top:24px; border-top:1px solid #a7f3d0; }
    .quiz-registration__button { width:100%; padding:18px 24px; border:0; border-radius:16px; color:white; background:linear-gradient(135deg,var(--accent),var(--accent-dark)); font-weight:900; font-size:17px; cursor:pointer; box-shadow:0 14px 30px rgba(37,99,235,.25); }
    .quiz-registration__button:disabled { cursor:wait; opacity:.65; box-shadow:none; }
    .quiz-registration__status { min-height:22px; margin:10px 0 0; color:var(--muted); font-size:13px; text-align:center; }
    @keyframes result-in { from { opacity:0; transform:translateY(14px); } to { opacity:1; transform:none; } }
    @media (max-width:640px) { .quiz-page { width:min(100% - 18px,920px); padding-top:10px; } .quiz-hero { border-radius:22px; } .quiz-question { grid-template-columns:1fr; padding:22px 16px; border-radius:20px; } .quiz-question__number { width:40px; height:40px; border-radius:13px; } .quiz-progress__text { min-width:75px; font-size:12px; } }
  </style>
</head>
<body>
  <main class="quiz-page">
    <header class="quiz-hero">
      <div class="quiz-eyebrow">${escapeHtml(quiz.eyebrow)}</div>
      <h1>${escapeHtml(quiz.title)}</h1>
      <p class="quiz-hero__subtitle">${escapeHtml(quiz.subtitle)}</p>
      ${quiz.intro ? `<div class="quiz-intro">${escapeHtml(quiz.intro)}</div>` : ''}
    </header>

    <div class="quiz-progress" aria-live="polite">
      <div class="quiz-progress__track"><div class="quiz-progress__bar"></div></div>
      <div class="quiz-progress__text">0 из ${quiz.questions.length}</div>
    </div>

    <form class="quiz-form">${questionsHtml}
    </form>

    <section class="quiz-result" aria-live="polite">
      <div class="quiz-result__label">Ваш персональный результат</div>
      <h2 class="quiz-result__title"></h2>
      <p class="quiz-result__lead">${escapeHtml(quiz.resultLead)}</p>
      <p class="quiz-result__body"></p>
      <div class="quiz-registration">
        <p>${escapeHtml(quiz.registrationText)}</p>
        <button class="quiz-registration__button" type="button" disabled>${escapeHtml(quiz.registrationButtonText)}</button>
        <p class="quiz-registration__status">Подготавливаем продолжение…</p>
      </div>
    </section>
  </main>

  <script>
    (() => {
      const config = ${escapeScriptJson(publicConfig)};
      const form = document.querySelector('.quiz-form');
      const result = document.querySelector('.quiz-result');
      const resultTitle = document.querySelector('.quiz-result__title');
      const resultBody = document.querySelector('.quiz-result__body');
      const progressBar = document.querySelector('.quiz-progress__bar');
      const progressText = document.querySelector('.quiz-progress__text');
      const registrationButton = document.querySelector('.quiz-registration__button');
      const registrationStatus = document.querySelector('.quiz-registration__status');
      const answers = {};

      function resolveResult() {
        const scores = Object.fromEntries(config.results.map((item) => [item.key, 0]));
        for (const question of config.questions) {
          const selectedId = answers[question.id];
          const option = question.options.find((item) => item.id === selectedId);
          if (!option) continue;
          for (const [key, weight] of Object.entries(option.weights || {})) {
            scores[key] = (scores[key] || 0) + Number(weight || 0);
          }
        }
        return [...config.results].sort((left, right) => {
          const difference = (scores[right.key] || 0) - (scores[left.key] || 0);
          return difference || left.priority - right.priority;
        })[0];
      }

      function updateRegistrationAction() {
        const registrationUrl = typeof window.__ATMOSPACE_REGISTRATION_URL__ === 'string'
          ? window.__ATMOSPACE_REGISTRATION_URL__.trim()
          : '';
        if (!registrationUrl) return;
        registrationButton.disabled = false;
        registrationStatus.textContent = 'Всё готово.';
        registrationButton.addEventListener('click', () => window.location.assign(registrationUrl), { once: true });
      }

      function update() {
        const answeredCount = Object.keys(answers).length;
        progressBar.style.width = String(Math.round(answeredCount / config.questions.length * 100)) + '%';
        progressText.textContent = answeredCount + ' из ' + config.questions.length;

        if (answeredCount !== config.questions.length) {
          result.classList.remove('is-visible');
          return;
        }

        const outcome = resolveResult();
        resultTitle.textContent = outcome.title;
        resultBody.textContent = outcome.body;
        result.classList.add('is-visible');
      }

      form.addEventListener('change', (event) => {
        const input = event.target;
        if (!(input instanceof HTMLInputElement) || input.type !== 'radio') return;
        answers[input.name] = input.value;
        update();
      });

      updateRegistrationAction();
      window.addEventListener('atmospace:registration-ready', updateRegistrationAction);
    })();
  </script>
</body>
</html>`
}
