import assert from 'node:assert/strict'

import {
  answerQuizQuestion,
  createQuizState,
} from '../src/features/atmospace/quizEngine.js'
import {
  buildLongQuizLandingHtml,
  buildQuizEngineDefinition,
  LONG_QUIZ_MAX_QUESTIONS,
  LONG_QUIZ_MIN_QUESTIONS,
  validateLongQuizProject,
} from '../src/features/atmospace/longQuizBuilder.js'
import {
  ATMOSPACE_QUESTION_LIBRARY,
  createAtmospaceMenRestartPreset,
} from '../src/features/atmospace/quizPresets.js'

const preset = createAtmospaceMenRestartPreset()
assert.equal(preset.questions.length, 5)
assert.equal(ATMOSPACE_QUESTION_LIBRARY.length, LONG_QUIZ_MAX_QUESTIONS)
assert.equal(LONG_QUIZ_MIN_QUESTIONS, 3)
assert.equal(LONG_QUIZ_MAX_QUESTIONS, 7)
assert.equal(preset.results.length, 5)

const validation = validateLongQuizProject(preset)
assert.equal(validation.ok, true)
assert.equal(validation.errors.length, 0)

const html = buildLongQuizLandingHtml(preset)
assert.equal(html.startsWith('<!doctype html>'), true)
assert.equal((html.match(/class="quiz-question"/g) ?? []).length, 5)
assert.equal(html.includes('Получить первый персональный шаг'), true)
assert.equal(html.includes('Ваш персональный результат'), true)
assert.equal(html.includes('Подготавливаем продолжение…'), true)
assert.equal(html.includes('atmospace:registration-ready'), true)
assert.equal(html.includes('__ATMOSPACE_REGISTRATION_URL__'), true)
assert.equal(html.includes('>Далее<'), false)
assert.equal(html.includes('Следующий вопрос'), false)
assert.equal(html.includes('entry code'), false)
assert.equal(html.includes('join code'), false)
assert.equal(html.includes('handoff'), false)
assert.equal(html.includes('debug'), false)

const unsafePreset = createAtmospaceMenRestartPreset()
unsafePreset.title = '<script>window.attacked=true</script>'
const escapedHtml = buildLongQuizLandingHtml(unsafePreset)
assert.equal(escapedHtml.includes('<script>window.attacked=true</script>'), false)
assert.equal(escapedHtml.includes('&lt;script&gt;window.attacked=true&lt;/script&gt;'), true)

const tooShort = createAtmospaceMenRestartPreset()
tooShort.questions = tooShort.questions.slice(0, 2)
const tooShortValidation = validateLongQuizProject(tooShort)
assert.equal(tooShortValidation.ok, false)
assert.equal(tooShortValidation.errors.some((error) => error.includes('минимум')), true)

const definition = buildQuizEngineDefinition(preset)
let state = createQuizState(definition)
for (const question of definition.questions) {
  state = answerQuizQuestion(definition, state, {
    questionId: question.id,
    optionId: question.options[0].id,
  })
}
assert.equal(state.completed, true)
assert.equal(typeof state.resultKey, 'string')
assert.equal(preset.results.some((result) => result.key === state.resultKey), true)

console.log('atmospaceLongQuiz self-check passed')
