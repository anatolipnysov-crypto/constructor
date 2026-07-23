import { buildLongQuizLandingHtml } from './longQuizBuilder.js'

export const QUIZ_PUBLISH_STORAGE_KEY = 'atmospaceQuizPublishV1'

const DEFAULT_API_BASE_URL = 'https://api.atmospace.pro'
const SAFE_FIELDS = Object.freeze({
  publicLandingKey: 1024,
  counterId: 128,
  landingName: 512,
  landingCode: 512,
})

function normalizeText(value, maxLength) {
  if (typeof value !== 'string') {
    return null
  }

  const normalized = value.trim()
  return normalized ? normalized.slice(0, maxLength) : null
}

export function sanitizeQuizPublishConfig(value = {}) {
  const result = {}
  for (const [field, maxLength] of Object.entries(SAFE_FIELDS)) {
    const normalized = normalizeText(value?.[field], maxLength)
    if (normalized) {
      result[field] = normalized
    }
  }
  return Object.freeze(result)
}

export function serializeQuizPublishConfig(value = {}) {
  return JSON.stringify(sanitizeQuizPublishConfig(value))
}

export function deserializeQuizPublishConfig(value) {
  if (typeof value !== 'string' || !value.trim()) {
    return Object.freeze({})
  }

  try {
    return sanitizeQuizPublishConfig(JSON.parse(value))
  } catch {
    return Object.freeze({})
  }
}

function escapeScriptJson(value) {
  return JSON.stringify(value)
    .replaceAll('<', '\\u003c')
    .replaceAll('>', '\\u003e')
    .replaceAll('&', '\\u0026')
    .replaceAll('\u2028', '\\u2028')
    .replaceAll('\u2029', '\\u2029')
}

function normalizeApiBaseUrl(value) {
  const url = new URL(normalizeText(value, 2048) ?? DEFAULT_API_BASE_URL)
  if (url.protocol !== 'https:') {
    throw new TypeError('Atmospace API must use HTTPS')
  }
  url.pathname = url.pathname.replace(/\/+$/, '')
  url.search = ''
  url.hash = ''
  return url.toString().replace(/\/$/, '')
}

export function buildQuizRuntimeScript(project, publishConfig, {
  apiBaseUrl = DEFAULT_API_BASE_URL,
} = {}) {
  const safeConfig = sanitizeQuizPublishConfig(publishConfig)
  if (!safeConfig.publicLandingKey || !safeConfig.counterId) {
    throw new TypeError('Страница ещё не подготовлена для публикации.')
  }

  const runtimeConfig = {
    apiBaseUrl: normalizeApiBaseUrl(apiBaseUrl),
    publicLandingKey: safeConfig.publicLandingKey,
    counterId: safeConfig.counterId,
    landingVariantCode: normalizeText(project?.id, 256) ?? 'atmospace-long-quiz',
    landingVariantName: normalizeText(project?.name, 512) ?? 'Персональный квиз',
    questionCount: Array.isArray(project?.questions) ? project.questions.length : 0,
  }

  return `<script>
  (() => {
    'use strict';

    const config = ${escapeScriptJson(runtimeConfig)};
    const runtimeScript = document.currentScript;
    const runtimeRoot = runtimeScript?.closest('.atmospace-quiz-embed') || document;
    const form = runtimeRoot.querySelector('.quiz-form');
    const registrationButton = runtimeRoot.querySelector('.quiz-registration__button');
    const registrationStatus = runtimeRoot.querySelector('.quiz-registration__status');
    const answeredGoalIndexes = new Set();
    const pageInstanceId = randomReference();
    const runtimeErrorMessage = 'Не удалось подготовить продолжение. Попробуйте ещё раз.';
    const initEndpoint = config.apiBaseUrl + '/api/landing-runtime/init';
    const clickEndpoint = config.apiBaseUrl + '/api/landing-runtime/click';
    let registrationUrl = '';
    let initInFlight = false;
    let initCompleted = false;
    let landingOpenedSent = false;
    let quizStartSent = false;
    let quizCompletedSent = false;
    let registrationNavigationStarted = false;

    function randomReference() {
      if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
      if (globalThis.crypto?.getRandomValues) {
        const bytes = new Uint8Array(16);
        globalThis.crypto.getRandomValues(bytes);
        return Array.from(bytes, (value) => value.toString(16).padStart(2, '0')).join('');
      }
      return String(Date.now()) + '-' + Math.random().toString(16).slice(2);
    }

    function readAdvertisingContext() {
      const params = new URLSearchParams(window.location.search);
      const read = (name) => {
        const value = params.get(name);
        return typeof value === 'string' && value.trim() ? value.trim().slice(0, 1024) : null;
      };
      const clickIds = {};
      for (const key of ['yclid', 'gclid', 'fbclid', 'msclkid', 'dclid']) {
        const value = read(key);
        if (value) clickIds[key] = value;
      }
      return {
        utm_source: read('utm_source'),
        utm_medium: read('utm_medium'),
        utm_campaign: read('utm_campaign'),
        utm_content: read('utm_content'),
        utm_term: read('utm_term'),
        advertising_click_ids: clickIds,
      };
    }

    const metrikaCounterId = (() => {
      const value = Number.parseInt(String(config.counterId), 10);
      return Number.isInteger(value) && value > 0 ? value : null;
    })();

    function loadMetrika() {
      return new Promise((resolve) => {
        if (!metrikaCounterId) return resolve();
        if (typeof window.ym === 'function') return resolve();
        window.ym = window.ym || function () {
          (window.ym.a = window.ym.a || []).push(arguments);
        };
        window.ym.l = 1 * new Date();
        const script = document.createElement('script');
        script.async = true;
        script.src = 'https://mc.yandex.ru/metrika/tag.js';
        script.onload = resolve;
        script.onerror = resolve;
        document.head.appendChild(script);
      });
    }

    function initMetrika() {
      return loadMetrika().then(() => {
        if (!metrikaCounterId || typeof window.ym !== 'function') return;
        window.__atmospaceMetrikaInited = window.__atmospaceMetrikaInited || {};
        if (window.__atmospaceMetrikaInited[metrikaCounterId]) return;
        window.__atmospaceMetrikaInited[metrikaCounterId] = true;
        window.ym(metrikaCounterId, 'init', {
          clickmap: true,
          trackLinks: true,
          accurateTrackBounce: true,
          webvisor: true,
        });
      });
    }

    function reachGoal(goalName, params) {
      initMetrika().then(() => {
        if (!metrikaCounterId || typeof window.ym !== 'function') return;
        try {
          window.ym(metrikaCounterId, 'reachGoal', goalName, params || {});
        } catch {
          // Browser analytics must never block the quiz or registration.
        }
      });
    }

    function buildBasePayload() {
      const advertising = readAdvertisingContext();
      return {
        public_landing_key: config.publicLandingKey,
        page_instance_id: pageInstanceId,
        page_url: window.location.href,
        landing_variant_code: config.landingVariantCode,
        landing_variant_name: config.landingVariantName,
        referrer: document.referrer || null,
        runtime_version: 'atmospace-long-quiz-v2',
        browser_language: navigator.language || null,
        browser_client_time: new Date().toISOString(),
        counter_id: String(config.counterId),
        ...advertising,
      };
    }

    function sendEvent(eventName) {
      return fetch(clickEndpoint, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ ...buildBasePayload(), event_name: eventName }),
        mode: 'cors',
        credentials: 'omit',
        keepalive: true,
      }).catch(() => undefined);
    }

    function setRetryVisible(visible) {
      let retry = runtimeRoot.querySelector('[data-atmospace-runtime-retry]');
      if (!retry && registrationStatus) {
        retry = document.createElement('button');
        retry.type = 'button';
        retry.setAttribute('data-atmospace-runtime-retry', '');
        retry.textContent = 'Попробовать ещё раз';
        registrationStatus.insertAdjacentElement('afterend', retry);
        retry.addEventListener('click', () => initializeLanding());
      }
      if (retry) retry.hidden = !visible;
    }

    function setRegistrationError() {
      registrationUrl = '';
      if (registrationStatus) registrationStatus.textContent = runtimeErrorMessage;
      if (registrationButton) registrationButton.disabled = true;
      setRetryVisible(true);
    }

    function isTrustedRegistrationUrl(value) {
      try {
        const url = new URL(value);
        return url.protocol === 'https:'
          && (url.hostname === 'atmospace.pro' || url.hostname.endsWith('.atmospace.pro'));
      } catch {
        return false;
      }
    }

    function applyRegistrationLink(links) {
      const candidate = links && links.registration;
      if (typeof candidate !== 'string' || !isTrustedRegistrationUrl(candidate)) return false;
      registrationUrl = candidate;
      if (registrationStatus) registrationStatus.textContent = 'Всё готово.';
      if (registrationButton) registrationButton.disabled = false;
      setRetryVisible(false);
      runtimeRoot.dispatchEvent(new CustomEvent('atmospace:registration-ready', {
        detail: { registrationUrl },
      }));
      return true;
    }

    function markQuizStarted() {
      if (quizStartSent) return;
      quizStartSent = true;
      sendEvent('quiz_start_click');
      reachGoal('quiz_start_click');
    }

    function updateQuizGoals(input) {
      const questionSection = input.closest('.quiz-question');
      const questions = Array.from(form?.querySelectorAll('.quiz-question') || []);
      const questionIndex = questions.indexOf(questionSection);
      if (questionIndex >= 0 && !answeredGoalIndexes.has(questionIndex)) {
        answeredGoalIndexes.add(questionIndex);
        reachGoal('question_answered', { questionNumber: questionIndex + 1 });
      }

      const answeredCount = form
        ? new Set(Array.from(form.querySelectorAll('input[type="radio"]:checked')).map((item) => item.name)).size
        : 0;
      if (!quizCompletedSent && answeredCount === config.questionCount) {
        quizCompletedSent = true;
        reachGoal('quiz_completed');
      }
    }

    form?.addEventListener('change', (event) => {
      const input = event.target;
      if (!(input instanceof HTMLInputElement) || input.type !== 'radio') return;
      markQuizStarted();
      updateQuizGoals(input);
    });

    async function initializeLanding() {
      if (initInFlight || initCompleted) return;
      initInFlight = true;
      setRetryVisible(false);
      if (registrationStatus) registrationStatus.textContent = 'Подготавливаем продолжение…';
      if (!landingOpenedSent) {
        landingOpenedSent = true;
        sendEvent('landing_opened');
      }

      try {
        const response = await fetch(initEndpoint, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify(buildBasePayload()),
          mode: 'cors',
          credentials: 'omit',
        });
        const data = await response.json().catch(() => null);
        const links = data?.data?.links;
        if (!response.ok || data?.ok !== true || !applyRegistrationLink(links)) throw new Error('not_ready');
        initCompleted = true;
      } catch {
        setRegistrationError();
      } finally {
        initInFlight = false;
      }
    }

    registrationButton?.setAttribute('data-atmospace-registration-link', '');
    registrationButton?.addEventListener('click', (event) => {
      event.preventDefault();
      if (!registrationUrl || registrationNavigationStarted) return;
      registrationNavigationStarted = true;
      reachGoal('registration_started');
      window.setTimeout(() => window.location.assign(registrationUrl), 180);
    }, true);

    initMetrika();
    reachGoal('landing_view');
    initializeLanding();
  })();
  </script>`
}

export function buildPublishedLongQuizHtml(project, publishConfig, options = {}) {
  const baseHtml = buildLongQuizLandingHtml(project)
  const runtimeScript = buildQuizRuntimeScript(project, publishConfig, options)
  return baseHtml.replace('</body>', `${runtimeScript}\n</body>`)
}
