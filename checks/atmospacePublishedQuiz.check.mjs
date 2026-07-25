import assert from 'node:assert/strict'

import { createAtmospaceMenRestartPreset } from '../src/features/atmospace/quizPresets.js'
import {
  buildPublishedLongQuizHtml,
  buildQuizRuntimeScript,
  deserializeQuizPublishConfig,
  sanitizeQuizPublishConfig,
  serializeQuizPublishConfig,
} from '../src/features/atmospace/publishedQuiz.js'

const project = createAtmospaceMenRestartPreset()
const safeConfig = {
  publicLandingKey: 'safe-public-landing-key',
  counterId: '12345678',
  landingName: 'Мужчины 30–60',
  landingCode: 'partner-code-for-generation-only',
  adGoalCredential: 'must-not-be-stored',
  metrikaToken: 'must-not-be-stored',
  password: 'must-not-be-stored',
}

const sanitized = sanitizeQuizPublishConfig(safeConfig)
assert.deepEqual(sanitized, {
  publicLandingKey: 'safe-public-landing-key',
  counterId: '12345678',
  landingName: 'Мужчины 30–60',
  landingCode: 'partner-code-for-generation-only',
})

const serialized = serializeQuizPublishConfig(safeConfig)
assert.equal(serialized.includes('must-not-be-stored'), false)
assert.deepEqual(deserializeQuizPublishConfig(serialized), sanitized)

const runtimeScript = buildQuizRuntimeScript(project, sanitized)
assert.equal(runtimeScript.includes('safe-public-landing-key'), true)
assert.equal(runtimeScript.includes('12345678'), true)
assert.equal(runtimeScript.includes('partner-code-for-generation-only'), false)
assert.equal(runtimeScript.includes('/api/landing-runtime/init'), true)
assert.equal(runtimeScript.includes('/api/landing-runtime/click'), true)
assert.equal(runtimeScript.includes("reachGoal('landing_view')"), true)
assert.equal(runtimeScript.includes("reachGoal('quiz_start_click')"), true)
assert.equal(runtimeScript.includes("'quiz_question_'"), true)
assert.equal(runtimeScript.includes("reachGoal('quiz_completed')"), true)
assert.equal(runtimeScript.includes("reachGoal('registration_click'"), true)
assert.equal(runtimeScript.includes("sendAtmospaceEvent('quiz_start_click')"), true)
assert.equal(runtimeScript.includes("sendAtmospaceEvent('question_answered'"), true)
assert.equal(runtimeScript.includes("sendAtmospaceEvent('quiz_completed')"), true)
assert.equal(runtimeScript.includes("sendAtmospaceEvent('registration_started')"), true)
assert.equal(runtimeScript.includes('event_ref: questionRef'), true)
assert.equal(runtimeScript.includes('question_index: questionIndex + 1'), true)
assert.equal(runtimeScript.includes('pendingAtmospaceEvents'), true)
assert.equal(runtimeScript.includes('flushPendingAtmospaceEvents'), true)
assert.equal(runtimeScript.includes('input.value'), false)
assert.equal(runtimeScript.includes('navigator.sendBeacon'), false)
assert.equal(runtimeScript.includes('sergey-constructor-atmospace-v1'), false)
assert.equal(runtimeScript.includes('sendLandingOpenedOnce'), false)
assert.equal(runtimeScript.includes("if (eventType !== 'landing_opened'"), false)
assert.equal(runtimeScript.includes("'yclid'"), true)
assert.equal(runtimeScript.includes("'utm_source'"), true)
assert.equal(runtimeScript.includes('window.__ATMOSPACE_REGISTRATION_URL__'), false)
assert.equal(runtimeScript.includes("runtimeRoot.dispatchEvent(new CustomEvent('atmospace:registration-ready'"), true)
assert.equal(runtimeScript.includes('detail: { registrationUrl }'), true)
assert.equal(runtimeScript.includes("url.hostname.endsWith('.atmospace.pro')"), true)

assert.equal(runtimeScript.includes('document.currentScript'), true)
assert.equal(runtimeScript.includes("closest('.atmospace-quiz-embed')"), true)
assert.equal(runtimeScript.includes("runtimeRoot.querySelector('.quiz-form')"), true)
assert.equal(runtimeScript.includes("document.querySelector('.quiz-form')"), false)

assert.equal(runtimeScript.includes('mc.yandex.ru/metrika/tag.js'), true)
assert.equal(runtimeScript.includes("window.ym(metrikaCounterId, 'init'"), true)
assert.equal(runtimeScript.includes('data-atmospace-metrika'), false)
assert.equal(runtimeScript.includes('tag.dataset.atmospaceMetrika'), true)
assert.equal(runtimeScript.includes('pendingMetrikaGoals'), true)
assert.equal(runtimeScript.includes("typeof window.ym !== 'function'"), true)
assert.equal(runtimeScript.includes("window.addEventListener('load', tick"), true)
assert.equal(runtimeScript.includes('attempts >= 40'), true)

assert.equal(runtimeScript.includes('entry code'), false)
assert.equal(runtimeScript.includes('join code'), false)
assert.equal(runtimeScript.includes('invite code'), false)

const publishedHtml = buildPublishedLongQuizHtml(project, sanitized)
assert.equal(publishedHtml.startsWith('<!doctype html>'), true)
assert.equal(publishedHtml.includes('safe-public-landing-key'), true)
assert.equal(publishedHtml.includes('partner-code-for-generation-only'), false)
assert.equal(publishedHtml.includes('must-not-be-stored'), false)
assert.equal(publishedHtml.includes('landing_view'), true)
assert.equal(publishedHtml.includes('quiz_start_click'), true)
assert.equal(publishedHtml.includes('question_answered'), true)
assert.equal(publishedHtml.includes('quiz_completed'), true)
assert.equal(publishedHtml.includes('registration_started'), true)
assert.equal(publishedHtml.includes('registration_click'), true)
assert.equal(publishedHtml.includes('mc.yandex.ru/metrika/tag.js'), true)
assert.equal(publishedHtml.includes('navigator.sendBeacon'), false)
assert.equal(publishedHtml.includes('sergey-constructor-atmospace-v1'), false)
assert.equal(publishedHtml.includes('sendLandingOpenedOnce'), false)
assert.equal(publishedHtml.includes('Сейчас не удалось открыть регистрацию. Попробуйте ещё раз чуть позже.'), true)

assert.throws(
  () => buildQuizRuntimeScript(project, { counterId: '12345678' }),
  /ещё не подготовлена/,
)

assert.throws(
  () => buildQuizRuntimeScript(project, sanitized, { apiBaseUrl: 'http://api.atmospace.pro' }),
  /HTTPS/,
)

console.log('atmospacePublishedQuiz self-check passed')
