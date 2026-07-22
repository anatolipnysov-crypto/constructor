import assert from 'node:assert/strict'

import {
  answerQuizQuestion,
  createQuizState,
} from '../src/features/atmospace/quizEngine.js'
import {
  buildLongQuizLandingHtml,
  buildQuizEngineDefinition,
  isValidRemoteImageUrl,
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
assert.equal(html.includes('document.currentScript'), true)
assert.equal(html.includes("closest('.atmospace-quiz-embed')"), true)
assert.equal(html.includes("quizRoot.querySelector('.quiz-form')"), true)
assert.equal(html.includes("document.querySelector('.quiz-form')"), false)
assert.equal(html.includes('>Далее<'), false)
assert.equal(html.includes('Следующий вопрос'), false)
assert.equal(html.includes('entry code'), false)
assert.equal(html.includes('join code'), false)
assert.equal(html.includes('handoff'), false)
assert.equal(html.includes('debug'), false)

const imagePreset = createAtmospaceMenRestartPreset()
imagePreset.heroImageUrl = 'https://media.example.ru/quiz/cover.webp?version=2'
imagePreset.heroImageAlt = 'Мужчина планирует следующий шаг'
imagePreset.questions[0].imageUrl = 'https://media.example.ru/quiz/question-1.jpg'
imagePreset.questions[0].imageAlt = 'Человек после рабочего дня'

const imageValidation = validateLongQuizProject(imagePreset)
assert.equal(imageValidation.ok, true)
const imageHtml = buildLongQuizLandingHtml(imagePreset)
assert.equal(imageHtml.includes(imagePreset.heroImageUrl), true)
assert.equal(imageHtml.includes(imagePreset.questions[0].imageUrl), true)
assert.equal(imageHtml.includes('Мужчина планирует следующий шаг'), true)
assert.equal(imageHtml.includes('Человек после рабочего дня'), true)
assert.equal(imageHtml.includes('class="quiz-hero__image"'), true)
assert.equal(imageHtml.includes('class="quiz-question__image"'), true)
assert.equal(imageHtml.includes('loading="lazy"'), true)
assert.equal(imageHtml.includes('fetchpriority="high"'), true)

assert.equal(isValidRemoteImageUrl('https://media.example.ru/image.webp'), true)
assert.equal(isValidRemoteImageUrl(''), true)
for (const invalidUrl of [
  'http://media.example.ru/image.webp',
  'blob:https://constructor.example/image',
  'file:///tmp/image.webp',
  'data:image/png;base64,AAAA',
  'not-a-url',
  'https://user:password@media.example.ru/image.webp',
]) {
  assert.equal(isValidRemoteImageUrl(invalidUrl), false)
}

const invalidHero = createAtmospaceMenRestartPreset()
invalidHero.heroImageUrl = 'blob:https://constructor.example/temp'
const invalidHeroValidation = validateLongQuizProject(invalidHero)
assert.equal(invalidHeroValidation.ok, false)
assert.equal(invalidHeroValidation.errors.some((error) => error.includes('обложки')), true)

const invalidQuestionImage = createAtmospaceMenRestartPreset()
invalidQuestionImage.questions[1].imageUrl = 'http://media.example.ru/question.jpg'
const invalidQuestionValidation = validateLongQuizProject(invalidQuestionImage)
assert.equal(invalidQuestionValidation.ok, false)
assert.equal(invalidQuestionValidation.errors.some((error) => error.includes('вопроса 2')), true)

const unsafePreset = createAtmospaceMenRestartPreset()
unsafePreset.title = '<script>window.attacked=true</script>'
unsafePreset.heroImageUrl = 'https://media.example.ru/image.webp?name=" onerror="alert(1)'
unsafePreset.heroImageAlt = '<b>Описание</b>'
const escapedHtml = buildLongQuizLandingHtml(unsafePreset)
assert.equal(escapedHtml.includes('<script>window.attacked=true</script>'), false)
assert.equal(escapedHtml.includes('&lt;script&gt;window.attacked=true&lt;/script&gt;'), true)
assert.equal(escapedHtml.includes(' onerror="alert(1)'), false)
assert.equal(escapedHtml.includes('&lt;b&gt;Описание&lt;/b&gt;'), true)

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
