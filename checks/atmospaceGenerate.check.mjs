import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

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
assert.equal(payload.data.embedCode, '<!doctype html><html></html>')

let externalUpstreamBody = null
let externalEnsuredGoals = null
const externalHandler = createGenerateHandler({
  ensureGoals: async (input) => {
    externalEnsuredGoals = {
      counterId: input.counterId,
      credential: input.credential,
    }
    return { ok: true }
  },
  fetchImpl: async (_url, options) => {
    externalUpstreamBody = JSON.parse(options.body)
    return new Response(JSON.stringify({
      ok: true,
      data: {
        publicLandingKey: 'modernisto-public-key',
        landingName: 'Modernisto Start',
        status: 'generated',
      },
    }), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    })
  },
})
const externalResponse = await externalHandler({
  request: new Request('https://constructor.example/api/atmospace/generate', {
    method: 'POST',
    headers: {
      origin: 'https://constructor.example',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      landingName: 'Modernisto Start',
      landingCode: 'format-1-code',
      counterId: '111026257',
      serverOnlyAdGoalCredential: 'format-1-write-only-value',
      runtimeProfile: 'modernisto-start-external-v1',
    }),
  }),
  env: {},
})
const externalPayload = await externalResponse.json()
assert.equal(externalResponse.status, 200)
assert.deepEqual(externalEnsuredGoals, {
  counterId: '111026257',
  credential: 'format-1-write-only-value',
})
assert.equal(externalUpstreamBody.server_only_ad_goal_credential, 'format-1-write-only-value')
assert.equal(Object.hasOwn(externalUpstreamBody, 'runtimeProfile'), false)
assert.deepEqual(Object.keys(externalPayload.data).sort(), [
  'counterId',
  'landingName',
  'publicLandingKey',
  'status',
])
assert.equal(externalPayload.data.publicLandingKey, 'modernisto-public-key')
assert.equal(externalPayload.data.counterId, '111026257')
assert.equal(JSON.stringify(externalPayload).includes('format-1-write-only-value'), false)
assert.equal(JSON.stringify(externalPayload).includes('format-1-code'), false)
assert.equal(Object.hasOwn(externalPayload.data, 'embedCode'), false)

const externalCounterMismatchHandler = createGenerateHandler({
  ensureGoals: async () => ({ ok: true }),
  fetchImpl: async () => new Response(JSON.stringify({
    ok: true,
    data: {
      publicLandingKey: 'wrong-counter-public-key',
      counterId: '999999999',
      landingName: 'Modernisto Start',
    },
  }), {
    status: 200,
    headers: { 'content-type': 'application/json' },
  }),
})
const externalCounterMismatchResponse = await externalCounterMismatchHandler({
  request: new Request('https://constructor.example/api/atmospace/generate', {
    method: 'POST',
    headers: {
      origin: 'https://constructor.example',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      landingName: 'Modernisto Start',
      landingCode: 'format-1-code',
      counterId: '111026257',
      serverOnlyAdGoalCredential: 'format-1-write-only-value',
      runtimeProfile: 'modernisto-start-external-v1',
    }),
  }),
  env: {},
})
const externalCounterMismatchPayload = await externalCounterMismatchResponse.json()
assert.equal(externalCounterMismatchResponse.status, 502)
assert.equal(externalCounterMismatchPayload.reason, 'atmospace_external_runtime_contract_failed')
assert.equal(externalCounterMismatchPayload.error, 'atmospace_external_runtime_contract_failed')

let unknownProfileUpstreamCalled = false
const unknownProfileHandler = createGenerateHandler({
  ensureGoals: async () => {
    throw new Error('must not ensure goals for an invalid profile')
  },
  fetchImpl: async () => {
    unknownProfileUpstreamCalled = true
    throw new Error('must not call upstream for an invalid profile')
  },
})
const unknownProfileResponse = await unknownProfileHandler({
  request: new Request('https://constructor.example/api/atmospace/generate', {
    method: 'POST',
    headers: {
      origin: 'https://constructor.example',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      landingName: 'Modernisto Start',
      landingCode: 'format-1-code',
      counterId: '111026257',
      serverOnlyAdGoalCredential: 'format-1-write-only-value',
      runtimeProfile: 'untrusted-profile',
    }),
  }),
  env: {},
})
assert.equal(unknownProfileResponse.status, 400)
assert.equal(unknownProfileUpstreamCalled, false)

let invalidExternalCounterUpstreamCalled = false
const invalidExternalCounterHandler = createGenerateHandler({
  ensureGoals: async () => {
    throw new Error('must not ensure goals for an invalid external counter')
  },
  fetchImpl: async () => {
    invalidExternalCounterUpstreamCalled = true
    throw new Error('must not call upstream for an invalid external counter')
  },
})
const invalidExternalCounterResponse = await invalidExternalCounterHandler({
  request: new Request('https://constructor.example/api/atmospace/generate', {
    method: 'POST',
    headers: {
      origin: 'https://constructor.example',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      landingName: 'Modernisto Start',
      landingCode: 'format-1-code',
      counterId: 'not-a-counter',
      serverOnlyAdGoalCredential: 'format-1-write-only-value',
      runtimeProfile: 'modernisto-start-external-v1',
    }),
  }),
  env: {},
})
assert.equal(invalidExternalCounterResponse.status, 400)
assert.equal(invalidExternalCounterUpstreamCalled, false)

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

const checkRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
for (const relativePath of ['ai-server.js', 'cloudflare-api-worker.js']) {
  const source = fs.readFileSync(path.join(checkRoot, relativePath), 'utf8')
  const externalResultStart = source.indexOf('function publicAtmospaceModernistoStartResult')
  const externalResultEnd = source.indexOf('function safeScriptJson', externalResultStart)
  const externalResultSource = source.slice(externalResultStart, externalResultEnd)
  const inputCleanerStart = source.indexOf('function cleanAtmospaceGenerateInput')
  const inputCleanerEnd = source.indexOf('\nfunction ', inputCleanerStart + 1)
  const inputCleanerSource = source.slice(inputCleanerStart, inputCleanerEnd)
  const handlerStart = source.indexOf('async function handleAtmospaceLandingGenerate')
  const handlerEnd = source.indexOf('\nfunction ', handlerStart)
  const handlerSource = source.slice(handlerStart, handlerEnd)

  assert.notEqual(externalResultStart, -1, `${relativePath}: missing external runtime result filter`)
  assert.equal(
    source.includes("'modernisto-start-external-v1'"),
    true,
    `${relativePath}: missing allowlisted Modernisto runtime profile`,
  )
  assert.equal(
    source.includes('function validateAtmospaceRuntimeProfile'),
    true,
    `${relativePath}: missing server-side runtime profile validation`,
  )
  assert.equal(
    externalResultSource.includes('hasUpstreamCounterId && upstreamCounterId !== counterId'),
    true,
    `${relativePath}: external result must reject an upstream counter mismatch`,
  )
  assert.equal(externalResultSource.includes('embedCode'), false, `${relativePath}: external result must not expose embedCode`)
  assert.equal(externalResultSource.includes('landingCode'), false, `${relativePath}: external result must not expose landingCode`)
  assert.equal(
    handlerSource.indexOf('if (modernistoStartRequested)') < handlerSource.indexOf('ensureAtmospaceRuntimeEmbed('),
    true,
    `${relativePath}: external profile must return before the inline runtime rewrite`,
  )
  assert.equal(
    handlerSource.includes('(!modernistoStartRequested && !upstreamData.embedCode)'),
    true,
    `${relativePath}: only the default profile may require upstream embedCode`,
  )
  assert.equal(
    handlerSource.includes('body: JSON.stringify(payload)'),
    true,
    `${relativePath}: runtimeProfile must remain a constructor-only field`,
  )
  assert.equal(
    inputCleanerSource.includes('runtimeProfile'),
    false,
    `${relativePath}: cleaned upstream payload must exclude runtimeProfile`,
  )
}

console.log('atmospaceGenerate.check.mjs passed')
