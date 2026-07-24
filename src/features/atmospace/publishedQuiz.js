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

  const normalizedApiBaseUrl = normalizeApiBaseUrl(apiBaseUrl)
  const runtimeConfig = {
    apiBaseUrl: normalizedApiBaseUrl,
    clickEndpoint: `${normalizedApiBaseUrl}/api/landing-runtime/click`,
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
    const pendingAtmospaceEvents = [];
    let atmospaceReady = false;
    let quizStartedSent = false;
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

    function readPageInstanceId() {
      const storageKey = 'atmospace-quiz-page-' + config.publicLandingKey.slice(0, 24);
      try {
        const current = window.sessionStorage.getItem(storageKey);
        if (current) return current;
        const created = randomReference();
        window.sessionStorage.setItem(storageKey, created);
        return created;
      } catch {
        return randomReference();
      }
    }

    const pageInstanceId = readPageInstanceId();

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
    const pendingMetrikaGoals = [];
    let metrikaFlushScheduled = false;

    function ensureMetrikaRuntime() {
      if (!metrikaCounterId || typeof window.ym === 'function') return;

      const ym = function () {
        (ym.a = ym.a || []).push(arguments);
      };
      ym.l = Date.now();
      window.ym = ym;

      const hasTag = Array.from(document.scripts || []).some((script) =>
        typeof script.src === 'string' && script.src.includes('mc.yandex.ru/metrika/tag.js')
      );

      if (!hasTag) {
        const tag = document.createElement('script');
        tag.async = true;
        tag.src = 'https://mc.yandex.ru/metrika/tag.js';
        tag.dataset.atmospaceMetrika = 'true';
        (document.head || document.documentElement).appendChild(tag);
      }

      window.ym(metrikaCounterId, 'init', {
        clickmap: true,
        trackLinks: true,
        accurateTrackBounce: true,
        webvisor: false,
      });
    }

    function finishPendingMetrikaGoals() {
      while (pendingMetrikaGoals.length > 0) {
        const item = pendingMetrikaGoals.shift();
        item.done();
      }
    }

    function flushPendingMetrikaGoals() {
      if (!metrikaCounterId || typeof window.ym !== 'function') {
        return false;
      }

      while (pendingMetrikaGoals.length > 0) {
        const item = pendingMetrikaGoals.shift();
        try {
          window.ym(metrikaCounterId, 'reachGoal', item.goalName, {}, item.done);
        } catch {
          item.done();
        }
      }
      return true;
    }

    function scheduleMetrikaFlush() {
      if (metrikaFlushScheduled || pendingMetrikaGoals.length === 0) return;
      metrikaFlushScheduled = true;
      let attempts = 0;

      const tick = () => {
        if (flushPendingMetrikaGoals()) {
          metrikaFlushScheduled = false;
          return;
        }

        attempts += 1;
        if (attempts >= 40) {
          finishPendingMetrikaGoals();
          metrikaFlushScheduled = false;
          return;
        }

        window.setTimeout(tick, 250);
      };

      if (document.readyState === 'complete') {
        tick();
      } else {
        window.addEventListener('load', tick, { once: true });
      }
    }

    function reachGoal(goalName, callback) {
      let callbackCalled = false;
      const done = () => {
        if (callbackCalled) return;
        callbackCalled = true;
        if (typeof callback === 'function') callback();
      };

      if (!metrikaCounterId) {
        done();
        return;
      }

      pendingMetrikaGoals.push({ goalName, done });
      scheduleMetrikaFlush();
    }

    function postAtmospaceEvent(eventType, details = {}) {
      const payload = {
        public_landing_key: config.publicLandingKey,
        page_instance_id: pageInstanceId,
        counter_id: String(config.counterId),
        event_type: eventType,
        page_url: window.location.href,
        referrer: document.referrer || null,
        runtime_version: 'atmospace-long-quiz-v1',
        client_time: new Date().toISOString(),
        ...details,
      };

      fetch(config.clickEndpoint, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(payload),
        mode: 'cors',
        credentials: 'omit',
        keepalive: true,
      }).catch(() => {});
    }

    function sendAtmospaceEvent(eventType, details = {}) {
      if (!atmospaceReady) {
        pendingAtmospaceEvents.push({ eventType, details });
        return;
      }
      postAtmospaceEvent(eventType, details);
    }

    function flushPendingAtmospaceEvents() {
      while (pendingAtmospaceEvents.length > 0) {
        const item = pendingAtmospaceEvents.shift();
        postAtmospaceEvent(item.eventType, item.details);
      }
    }

    ensureMetrikaRuntime();
    reachGoal('landing_view');

    function updateQuizGoals(input) {
      const questionSection = input.closest('.quiz-question');
      const questions = Array.from(form?.querySelectorAll('.quiz-question') || []);
      const questionIndex = questions.indexOf(questionSection);

      if (!quizStartedSent) {
        quizStartedSent = true;
        reachGoal('quiz_start_click');
        sendAtmospaceEvent('quiz_start_click');
      }

      if (questionIndex >= 0 && !answeredGoalIndexes.has(questionIndex)) {
        answeredGoalIndexes.add(questionIndex);
        const questionRef = questionSection?.getAttribute('data-question-id') || 'question-' + String(questionIndex + 1);
        reachGoal('quiz_question_' + String(questionIndex + 1) + '_answered');
        sendAtmospaceEvent('question_answered', {
          event_ref: questionRef,
          question_index: questionIndex + 1,
        });
      }

      const answeredCount = form
        ? new Set(Array.from(form.querySelectorAll('input[type="radio"]:checked')).map((item) => item.name)).size
        : 0;
      if (!quizCompletedSent && answeredCount === config.questionCount) {
        quizCompletedSent = true;
        reachGoal('quiz_completed');
        sendAtmospaceEvent('quiz_completed');
      }
    }

    form?.addEventListener('change', (event) => {
      const input = event.target;
      if (!(input instanceof HTMLInputElement) || input.type !== 'radio') return;
      updateQuizGoals(input);
    });

    function setRegistrationError(message) {
      if (registrationStatus) registrationStatus.textContent = message;
      if (registrationButton) registrationButton.disabled = true;
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

    function enableRegistration(registrationUrl) {
      if (!isTrustedRegistrationUrl(registrationUrl)) {
        setRegistrationError('Сейчас не удалось открыть регистрацию. Попробуйте ещё раз чуть позже.');
        return;
      }

      runtimeRoot.dispatchEvent(new CustomEvent('atmospace:registration-ready', {
        detail: { registrationUrl },
      }));

      if (registrationStatus) registrationStatus.textContent = 'Всё готово.';
      if (!registrationButton) return;
      registrationButton.disabled = false;

      registrationButton.addEventListener('click', (event) => {
        if (registrationNavigationStarted) return;
        registrationNavigationStarted = true;
        event.preventDefault();
        event.stopImmediatePropagation();

        let navigated = false;
        const navigate = () => {
          if (navigated) return;
          navigated = true;
          window.location.assign(registrationUrl);
        };

        sendAtmospaceEvent('registration_started');
        window.setTimeout(navigate, 800);
        reachGoal('registration_click', navigate);
      }, true);
    }

    async function initializeLanding() {
      const advertising = readAdvertisingContext();
      const payload = {
        public_landing_key: config.publicLandingKey,
        page_instance_id: pageInstanceId,
        page_url: window.location.href,
        landing_variant_code: config.landingVariantCode,
        landing_variant_name: config.landingVariantName,
        referrer: document.referrer || null,
        runtime_version: 'atmospace-long-quiz-v1',
        browser_language: navigator.language || null,
        browser_client_time: new Date().toISOString(),
        counter_id: String(config.counterId),
        ...advertising,
      };

      try {
        const response = await fetch(config.apiBaseUrl + '/api/landing-runtime/init', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify(payload),
          mode: 'cors',
          credentials: 'omit',
        });
        const data = await response.json().catch(() => null);
        const registrationUrl = data?.data?.links?.registration;
        if (!response.ok || data?.ok !== true || !registrationUrl) {
          throw new Error('registration_not_ready');
        }
        atmospaceReady = true;
        flushPendingAtmospaceEvents();
        enableRegistration(registrationUrl);
      } catch {
        setRegistrationError('Сейчас не удалось открыть регистрацию. Попробуйте ещё раз чуть позже.');
      }
    }

    initializeLanding();
  })();
  </script>`
}

export function buildPublishedLongQuizHtml(project, publishConfig, options = {}) {
  const baseHtml = buildLongQuizLandingHtml(project)
  const runtimeScript = buildQuizRuntimeScript(project, publishConfig, options)
  return baseHtml.replace('</body>', `${runtimeScript}\n</body>`)
}
