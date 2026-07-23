import assert from 'node:assert/strict'

import { createAtmospaceMenRestartPreset } from '../src/features/atmospace/quizPresets.js'
import {
  buildPublishedLongQuizHtml,
  buildQuizRuntimeScript,
  deserializeQuizPublishConfig,
  sanitizeQuizPublishConfig,
  serializeQuizPublishConfig,
} from '../src/features/atmospace/publishedQuiz.js'

function literalClickEvents(source) {
  const events = []
  const pattern = /(?:sendEvent|sendRuntimeEvent|sendAtmospaceEvent|sendClickEvent|postClickEvent)\(\s*['"]([^'"]+)['"]/g
  let match
  while ((match = pattern.exec(source))) events.push(match[1])
  return [...new Set(events)].sort()
}

function hasExactRegistrationPassthrough(source) {
  return /(?:const|let|var)\s+candidate\s*=\s*(?:(?:links\s*&&\s*links\.registration)|(?:links\?\.registration)|(?:links\s*&&\s*typeof\s+links\.registration\s*===\s*['"]string['"]\s*\?\s*links\.registration\s*:\s*['"]{2}))\s*;?[\s\S]{0,120}registrationUrl\s*=\s*candidate\s*;?/.test(source)
}

function assertNoQuizAnswerLeak(source, label) {
  const forbidden = [
    /JSON\.stringify\([^)]*\banswers?\b/i,
    /(?:payload|body|searchParams|URLSearchParams)[\s\S]{0,160}\b(?:quiz_?answers?|selectedOption|optionText|questionText|resultKey|quiz_result)\b/i,
    /(?:localStorage|sessionStorage)[\s\S]{0,120}\banswers?\b/i,
    /(?:href|location|hash|search)[\s\S]{0,120}\b(?:quiz_?answers?|selectedOption|optionText|questionText|resultKey|quiz_result)\b/i,
    /data-(?:answer|quiz-answer|quiz-result)=/i,
  ]
  for (const pattern of forbidden) {
    assert.doesNotMatch(source, pattern, `${label} must not leak quiz answers through ${pattern}`)
  }
}

function hasRegistrationStartedHandoff(source) {
  const directHandoff = /(?:reachGoal|sendMetrikaGoal)\(\s*['"]registration_started['"][\s\S]{0,1000}window\.location\.(?:assign\(registrationUrl\)|href\s*=\s*registrationUrl)/
  const callbackHandoff = /function\s+(\w+)\s*\(\)\s*\{[\s\S]{0,500}window\.location\.(?:assign\(registrationUrl\)|href\s*=\s*registrationUrl)[\s\S]{0,1000}(?:reachGoal|sendMetrikaGoal)\(\s*['"]registration_started['"]\s*,[\s\S]{0,300}\b\1\s*\)/
  return directHandoff.test(source) || callbackHandoff.test(source)
}

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
for (const marker of [
  'safe-public-landing-key',
  '12345678',
  '/api/landing-runtime/init',
  '/api/landing-runtime/click',
  'links.registration',
  'https://mc.yandex.ru/metrika/tag.js',
  'landing_view',
  'quiz_start_click',
  'question_answered',
  'questionNumber',
  'quiz_completed',
  'registration_started',
  'data-atmospace-runtime-retry',
]) {
  assert.equal(runtimeScript.includes(marker), true, `Published runtime must include ${marker}`)
}

assert.equal(runtimeScript.includes('partner-code-for-generation-only'), false)
assert.match(runtimeScript, /(?:let|var)\s+registrationUrl\s*=\s*(?:null|['"]{2})/)
assert.equal(
  hasExactRegistrationPassthrough(runtimeScript)
    || /registrationUrl\s*=\s*(?:links\?\.registration|links\.registration)\s*;?/.test(runtimeScript),
  true,
  'The page must store response.data.links.registration without rebuilding it.',
)
assert.match(runtimeScript, /window\.location\.(?:assign\(registrationUrl\)|href\s*=\s*registrationUrl)/)
assert.doesNotMatch(runtimeScript, /buildQuizUrl|pathname\s*=\s*['"]\/quiz['"]|['"]\/quiz(?:[?#'"]|$)/)
assert.doesNotMatch(runtimeScript, /new URL\([^)]*registrationUrl|registrationUrl\.searchParams/i)
assert.doesNotMatch(
  runtimeScript,
  /registrationUrl\s*(?:\+=|=\s*registrationUrl\s*\+)|searchParams\.(?:set|append)\([^)]*(?:utm_|yclid)/i,
)

assert.match(
  runtimeScript,
  /(?:reachGoal|sendMetrikaGoal)\(\s*['"]question_answered['"]\s*,\s*\{[\s\S]{0,180}questionNumber/,
)
assert.equal(hasRegistrationStartedHandoff(runtimeScript), true)
assert.deepEqual(literalClickEvents(runtimeScript), ['landing_opened', 'quiz_start_click'])

assert.equal(
  (runtimeScript.match(/(?:const|let|var)\s+pageInstanceId\s*=\s*(?:makePageInstanceId|randomReference)\(\)/g) ?? []).length,
  1,
  'Exactly one pageInstanceId must be created per page load.',
)
assert.equal(
  (runtimeScript.match(/=\s*(?:makePageInstanceId|randomReference)\(\)/g) ?? []).length,
  1,
  'Retry must reuse the pageInstanceId created for the current page load.',
)
assert.match(runtimeScript, /page_instance_id\s*:\s*pageInstanceId/)
assert.doesNotMatch(runtimeScript, /readPageInstanceId|sessionStorage|localStorage/i)

assert.equal(runtimeScript.includes('document.currentScript'), true)
assert.equal(runtimeScript.includes("closest('.atmospace-quiz-embed')"), true)
assert.equal(runtimeScript.includes("runtimeRoot.querySelector('.quiz-form')"), true)
assert.equal(runtimeScript.includes("document.querySelector('.quiz-form')"), false)
assert.match(runtimeScript, /window\.ym\([^)]*['"]init['"]/)
assertNoQuizAnswerLeak(runtimeScript, 'Published runtime')

for (const pattern of [
  /data-atmospace-messenger/i,
  /messenger_button_clicked/i,
  /links\.(?:telegram|max)/i,
  /r\.bothelp\.io/i,
  /bothelp/i,
  /telegram/i,
  /registration_click/i,
  /quiz_question_\d+_answered/i,
  /registration_success/i,
  /notifications_connected/i,
  /payment_success/i,
]) {
  assert.doesNotMatch(runtimeScript, pattern, `Published runtime must not match ${pattern}`)
}

const publishedHtml = buildPublishedLongQuizHtml(project, sanitized)
assert.equal(publishedHtml.startsWith('<!doctype html>'), true)
assert.equal(publishedHtml.includes('safe-public-landing-key'), true)
assert.equal(publishedHtml.includes('partner-code-for-generation-only'), false)
assert.equal(publishedHtml.includes('must-not-be-stored'), false)
assert.equal(publishedHtml.includes('https://mc.yandex.ru/metrika/tag.js'), true)
for (const goal of [
  'landing_view',
  'quiz_start_click',
  'question_answered',
  'quiz_completed',
  'registration_started',
]) {
  assert.equal(publishedHtml.includes(goal), true, `Published HTML must include ${goal}`)
}
assert.equal(publishedHtml.includes('Не удалось подготовить продолжение. Попробуйте ещё раз.'), true)
assertNoQuizAnswerLeak(publishedHtml, 'Published HTML')
for (const pattern of [
  /data-atmospace-messenger/i,
  /messenger_button_clicked/i,
  /r\.bothelp\.io/i,
  /bothelp/i,
  /telegram/i,
  /registration_click/i,
  /quiz_question_\d+_answered/i,
  /registration_success/i,
  /notifications_connected/i,
  /payment_success/i,
  /sessionStorage|localStorage/i,
]) {
  assert.doesNotMatch(publishedHtml, pattern, `Published HTML must not match ${pattern}`)
}

assert.throws(
  () => buildQuizRuntimeScript(project, { counterId: '12345678' }),
  /ещё не подготовлена/,
)

assert.throws(
  () => buildQuizRuntimeScript(project, sanitized, { apiBaseUrl: 'http://api.atmospace.pro' }),
  /HTTPS/,
)

console.log('atmospacePublishedQuiz final contract self-check passed')
