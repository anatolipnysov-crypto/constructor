import assert from 'node:assert/strict'

import {
  createGenerateHandler,
  createHealthHandler,
} from '../functions/api/atmospace/generate.js'

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
      totalRequired: 14,
      existingCount: 5,
      createdCount: 9,
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
    throw new Error('metrika_goal_list_failed')
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
assert.equal(goalFailurePayload.stage, 'metrika')
assert.equal(goalFailurePayload.reason, 'metrika_access_rejected')
assert.equal(goalFailurePayload.message.includes('цели Метрики'), true)
assert.equal(upstreamCalledAfterGoalFailure, false)
assert.equal(JSON.stringify(goalFailurePayload).includes('write-only-value'), false)

const upstreamFailureHandler = createGenerateHandler({
  ensureGoals: async () => ({ ok: true }),
  fetchImpl: async () => new Response(JSON.stringify({
    ok: false,
    error: 'landing_code_invalid',
  }), {
    status: 404,
    headers: { 'content-type': 'application/json' },
  }),
})
const upstreamFailureResponse = await upstreamFailureHandler({
  request: new Request('https://constructor.example/api/atmospace/generate', {
    method: 'POST',
    headers: {
      origin: 'https://constructor.example',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      landingName: 'Quiz A',
      landingCode: 'invalid',
      counterId: '123',
      adGoalCredential: 'write-only-value',
    }),
  }),
  env: {},
})
const upstreamFailurePayload = await upstreamFailureResponse.json()
assert.equal(upstreamFailureResponse.status, 400)
assert.equal(upstreamFailurePayload.stage, 'atmospace')
assert.equal(upstreamFailurePayload.reason, 'landing_code_rejected')
assert.equal(JSON.stringify(upstreamFailurePayload).includes('landing_code_invalid'), false)
assert.equal(JSON.stringify(upstreamFailurePayload).includes('write-only-value'), false)

const healthHandler = createHealthHandler({
  fetchImpl: async (url, options) => {
    assert.equal(url, 'https://api.atmospace.pro/health')
    assert.equal(options.method, 'GET')
    return new Response(JSON.stringify({ ok: true, status: 'healthy' }), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    })
  },
})
const healthResponse = await healthHandler({ env: {} })
const healthPayload = await healthResponse.json()
assert.equal(healthResponse.status, 200)
assert.equal(healthPayload.ok, true)
assert.equal(healthPayload.data.atmospace, 'ready')
assert.equal(healthPayload.data.contract, 'landing-runtime-generate-v1')

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
const deniedPayload = await denied.json()
assert.equal(denied.status, 403)
assert.equal(deniedPayload.stage, 'constructor')
assert.equal(deniedPayload.reason, 'origin_not_allowed')

console.log('atmospaceGenerate.check.mjs passed')
