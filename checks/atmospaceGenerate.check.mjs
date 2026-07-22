import assert from 'node:assert/strict'

import { createGenerateHandler } from '../functions/api/atmospace/generate.js'

let upstreamBody = null
let ensuredGoals = null
const handler = createGenerateHandler({
  ensureGoals: async (input) => {
    ensuredGoals = {
      counterId: input.counterId,
      credential: input.credential,
    }
    return {
      ok: true,
      totalRequired: 13,
      existingCount: 5,
      createdCount: 8,
    }
  },
  fetchImpl: async (url, options) => {
    upstreamBody = JSON.parse(options.body)
    assert.equal(url, 'https://api.atmospace.pro/api/landing-runtime/generate')

    return new Response(JSON.stringify({
      ok: true,
      data: {
        publicLandingKey: 'public-key',
        embedCode: '<!doctype html><html></html>',
        landingName: 'Quiz A',
      },
    }), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    })
  },
})

const response = await handler({
  request: new Request('https://constructor.example/api/atmospace/generate', {
    method: 'POST',
    headers: {
      origin: 'https://constructor.example',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      landingName: 'Quiz A',
      landingCode: '011',
      counterId: '123',
      adGoalCredential: 'write-only-value',
    }),
  }),
  env: {},
})
const payload = await response.json()

assert.equal(response.status, 200)
assert.equal(payload.ok, true)
assert.deepEqual(ensuredGoals, {
  counterId: '123',
  credential: 'write-only-value',
})
assert.equal(upstreamBody.server_only_ad_goal_credential, 'write-only-value')
assert.equal(JSON.stringify(payload).includes('write-only-value'), false)

let upstreamCalledAfterGoalFailure = false
const goalFailureHandler = createGenerateHandler({
  ensureGoals: async () => {
    throw new Error('provider rejected request')
  },
  fetchImpl: async () => {
    upstreamCalledAfterGoalFailure = true
    throw new Error('must not be called')
  },
})
const goalFailureResponse = await goalFailureHandler({
  request: new Request('https://constructor.example/api/atmospace/generate', {
    method: 'POST',
    headers: {
      origin: 'https://constructor.example',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      landingName: 'Quiz A',
      landingCode: '011',
      counterId: '123',
      adGoalCredential: 'write-only-value',
    }),
  }),
  env: {},
})
const goalFailurePayload = await goalFailureResponse.json()
assert.equal(goalFailureResponse.status, 400)
assert.equal(goalFailurePayload.message.includes('цели Метрики'), true)
assert.equal(upstreamCalledAfterGoalFailure, false)
assert.equal(JSON.stringify(goalFailurePayload).includes('write-only-value'), false)

const denied = await handler({
  request: new Request('https://constructor.example/api/atmospace/generate', {
    method: 'POST',
    headers: {
      origin: 'https://evil.example',
      'content-type': 'application/json',
    },
    body: '{}',
  }),
  env: {},
})

assert.equal(denied.status, 403)
console.log('atmospaceGenerate.check.mjs passed')
