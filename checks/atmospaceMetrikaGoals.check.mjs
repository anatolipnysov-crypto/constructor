import assert from 'node:assert/strict'

import {
  ATMOSPACE_METRIKA_GOALS,
  buildMetrikaActionGoalBody,
  ensureAtmospaceMetrikaGoals,
} from '../functions/api/atmospace/metrikaGoals.js'

assert.equal(ATMOSPACE_METRIKA_GOALS.length, 15)
assert.equal(new Set(ATMOSPACE_METRIKA_GOALS.map((goal) => goal.target)).size, 15)
assert.equal(ATMOSPACE_METRIKA_GOALS.some((goal) => goal.target === 'landing_view'), true)
assert.equal(ATMOSPACE_METRIKA_GOALS.some((goal) => goal.target === 'quiz_start_click'), true)
assert.equal(ATMOSPACE_METRIKA_GOALS.some((goal) => goal.target === 'quiz_question_7_answered'), true)
assert.equal(ATMOSPACE_METRIKA_GOALS.some((goal) => goal.target === 'offer_view'), true)
assert.equal(ATMOSPACE_METRIKA_GOALS.some((goal) => goal.target === 'registration_started'), true)
assert.equal(ATMOSPACE_METRIKA_GOALS.some((goal) => goal.target === 'registration_click'), false)
assert.equal(ATMOSPACE_METRIKA_GOALS.some((goal) => goal.target === 'registration_success'), true)
assert.equal(ATMOSPACE_METRIKA_GOALS.some((goal) => goal.target === 'notifications_connected'), true)
assert.equal(ATMOSPACE_METRIKA_GOALS.some((goal) => goal.target === 'payment_success'), true)

assert.deepEqual(buildMetrikaActionGoalBody({
  target: 'quiz_completed',
  name: 'Квиз — завершён',
}), {
  goal: {
    name: 'Квиз — завершён',
    type: 'action',
    conditions: [
      {
        type: 'exact',
        url: 'quiz_completed',
      },
    ],
  },
})

const requests = []
const credential = 'server-side-oauth-value'
const result = await ensureAtmospaceMetrikaGoals({
  counterId: '12345678',
  credential,
  fetchImpl: async (url, options) => {
    requests.push({ url, options })

    if (options.method === 'GET') {
      return new Response(JSON.stringify({
        goals: [
          {
            id: 1,
            type: 'action',
            conditions: [
              { type: 'exact', url: 'landing_view' },
            ],
          },
          {
            id: 2,
            type: 'action',
            conditions: [
              { type: 'exact', url: 'registration_success' },
            ],
          },
        ],
      }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      })
    }

    return new Response(JSON.stringify({
      goal: { id: requests.length },
    }), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    })
  },
})

assert.equal(result.ok, true)
assert.equal(result.totalRequired, 15)
assert.equal(result.existingCount, 2)
assert.equal(result.createdCount, 13)
assert.equal(requests.filter((item) => item.options.method === 'GET').length, 1)
assert.equal(requests.filter((item) => item.options.method === 'POST').length, 13)
assert.equal(requests.every((item) => item.url.endsWith('/counter/12345678/goals')), true)
assert.equal(requests.every((item) => item.options.headers.authorization === `OAuth ${credential}`), true)

const createdTargets = new Set(
  requests
    .filter((item) => item.options.method === 'POST')
    .map((item) => JSON.parse(item.options.body).goal.conditions[0].url),
)
assert.equal(createdTargets.has('landing_view'), false)
assert.equal(createdTargets.has('registration_success'), false)
assert.equal(createdTargets.has('quiz_start_click'), true)
assert.equal(createdTargets.has('offer_view'), true)
assert.equal(createdTargets.has('registration_started'), true)
assert.equal(createdTargets.has('notifications_connected'), true)
assert.equal(createdTargets.has('payment_success'), true)
assert.equal(JSON.stringify(result).includes(credential), false)

let postCount = 0
const noDuplicates = await ensureAtmospaceMetrikaGoals({
  counterId: '12345678',
  credential,
  fetchImpl: async (_url, options) => {
    if (options.method === 'POST') {
      postCount += 1
    }

    return new Response(JSON.stringify({
      goals: ATMOSPACE_METRIKA_GOALS.map((goal, index) => ({
        id: index + 1,
        type: 'action',
        conditions: [
          { type: 'exact', url: goal.target },
        ],
      })),
    }), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    })
  },
})
assert.equal(noDuplicates.createdCount, 0)
assert.equal(postCount, 0)

await assert.rejects(
  () => ensureAtmospaceMetrikaGoals({
    counterId: 'not-a-number',
    credential,
    fetchImpl: async () => new Response('{}'),
  }),
  /metrika_goal_configuration_invalid/,
)

await assert.rejects(
  () => ensureAtmospaceMetrikaGoals({
    counterId: '12345678',
    credential,
    fetchImpl: async () => new Response('{}', { status: 401 }),
  }),
  /metrika_goal_list_failed/,
)

console.log('atmospaceMetrikaGoals self-check passed')
