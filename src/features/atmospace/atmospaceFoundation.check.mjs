import assert from 'node:assert/strict'

import {
  buildLandingRuntimeInitPayload,
  collectAdvertisingContext,
  createQuizRegistrationController,
  createQuizState,
  initializeAtmospaceLanding,
  answerQuizQuestion,
} from './index.js'

const context = collectAdvertisingContext({
  pageUrl: 'https://example.test/quiz?utm_source=yandex&utm_campaign=launch&yclid=test-click',
  referrer: 'https://yandex.ru/',
  browserLanguage: 'ru-RU',
  browserClientTime: '2026-07-22T06:00:00.000Z',
})

const payload = buildLandingRuntimeInitPayload({
  publicLandingKey: 'public-test-key',
  pageInstanceId: 'page-test',
  landingVariantCode: 'quiz-a',
  context,
})

assert.equal(payload.utm_source, 'yandex')
assert.equal(payload.utm_campaign, 'launch')
assert.equal(payload.advertising_click_ids.yclid, 'test-click')
assert.equal(payload.page_instance_id, 'page-test')

let capturedRequest = null
const runtime = await initializeAtmospaceLanding({
  publicLandingKey: 'public-test-key',
  pageInstanceId: 'page-test',
  context,
  fetchImpl: async (url, options) => {
    capturedRequest = {
      url,
      options,
      body: JSON.parse(options.body),
    }

    return {
      ok: true,
      status: 200,
      async json() {
        return {
          ok: true,
          data: {
            counterId: '12345',
            visitRef: 'must-not-leak',
            attributionRef: 'must-not-leak',
            handoffRef: 'must-not-leak',
            links: {
              registration: 'https://app.atmospace.pro/auth?mode=register#atmospace_handoff=opaque',
            },
          },
        }
      },
    }
  },
})

assert.equal(
  capturedRequest.url,
  'https://api.atmospace.pro/api/landing-runtime/init',
)
assert.equal(capturedRequest.options.method, 'POST')
assert.equal(capturedRequest.body.advertising_click_ids.yclid, 'test-click')
assert.deepEqual(runtime, {
  status: 'ready',
  registrationUrl: 'https://app.atmospace.pro/auth?mode=register#atmospace_handoff=opaque',
  counterId: '12345',
})
assert.equal('handoffRef' in runtime, false)
assert.equal('visitRef' in runtime, false)

const quizDefinition = {
  id: 'point-b',
  version: '1',
  results: [
    { key: 'no-system', priority: 0 },
    { key: 'overload', priority: 1 },
  ],
  questions: [
    {
      id: 'q1',
      options: [
        { id: 'a', weights: { 'no-system': 2 } },
        { id: 'b', weights: { overload: 2 } },
      ],
    },
    {
      id: 'q2',
      options: [
        { id: 'a', weights: { 'no-system': 1 } },
        { id: 'b', weights: { overload: 1 } },
      ],
    },
  ],
}

let quizState = createQuizState(quizDefinition)
quizState = answerQuizQuestion(quizDefinition, quizState, {
  questionId: 'q1',
  optionId: 'a',
})
quizState = answerQuizQuestion(quizDefinition, quizState, {
  questionId: 'q2',
  optionId: 'a',
})

assert.equal(quizState.completed, true)
assert.equal(quizState.resultKey, 'no-system')

const controller = createQuizRegistrationController({
  quizDefinition,
  runtimeOptions: {},
  runtimeInitializer: async () => runtime,
})

await controller.initialize()
controller.answer({ questionId: 'q1', optionId: 'b' })
controller.answer({ questionId: 'q2', optionId: 'b' })

assert.equal(controller.getSnapshot().canContinueToRegistration, true)
assert.equal(controller.getSnapshot().quiz.outcome.resultKey, 'overload')
assert.equal(controller.getRegistrationUrl(), runtime.registrationUrl)

console.log('atmospaceFoundation.check.mjs passed')
