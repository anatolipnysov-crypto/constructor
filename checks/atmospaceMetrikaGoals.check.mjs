import assert from 'node:assert/strict'

import {
  ATMOSPACE_METRIKA_GOALS,
  buildMetrikaActionGoalBody,
  ensureAtmospaceMetrikaGoals,
} from '../functions/api/atmospace/metrikaGoals.js'

const expectedBrowserTargets = [
  'landing_view',
  'quiz_start_click',
  'question_answered',
  'quiz_completed',
  'registration_started',
]
const configuredTargets = ATMOSPACE_METRIKA_GOALS.map((goal) => goal.target)
assert.equal(ATMOSPACE_METRIKA_GOALS.length, expectedBrowserTargets.length)
assert.equal(new Set(configuredTargets).size, expectedBrowserTargets.length)
assert.deepEqual([...configuredTargets].sort(), [...expectedBrowserTargets].sort())
for (const forbiddenTarget of [
  'registration_click',
  'registration_success',
  'notifications_connected',
  'payment_success',
]) {
  assert.equal(configuredTargets.includes(forbiddenTarget), false)
}
assert.equal(configuredTargets.some((target) => /^quiz_question_\d+_answered$/.test(target)), false)

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
              { type: 'exact', url: 'question_answered' },
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
assert.equal(result.totalRequired, 5)
assert.equal(result.existingCount, 2)
assert.equal(result.createdCount, 3)
assert.equal(requests.filter((item) => item.options.method === 'GET').length, 1)
assert.equal(requests.filter((item) => item.options.method === 'POST').length, 3)
assert.equal(requests.every((item) => item.url.endsWith('/counter/12345678/goals')), true)
assert.equal(requests.every((item) => item.options.headers.authorization === `OAuth ${credential}`), true)

const createdTargets = new Set(
  requests
    .filter((item) => item.options.method === 'POST')
    .map((item) => JSON.parse(item.options.body).goal.conditions[0].url),
)
assert.equal(createdTargets.has('landing_view'), false)
assert.equal(createdTargets.has('question_answered'), false)
assert.deepEqual(
  [...createdTargets].sort(),
  ['quiz_completed', 'quiz_start_click', 'registration_started'].sort(),
)
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
