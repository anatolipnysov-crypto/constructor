import assert from 'node:assert/strict'
import fs from 'node:fs'

import { createQuizPublishHandler } from '../functions/api/quiz/publish.js'
import { createPublishedQuizHandler } from '../functions/q/[slug].js'
import { publishPreparedQuiz } from '../src/features/atmospace/publishingClient.js'

const validHtml = `<!doctype html>
<html lang="ru">
<body>
<form class="quiz-form"></form>
<script>
const runtime = 'atmospace-long-quiz-v1';
const endpoint = '/api/landing-runtime/init';
const completed = 'quiz_completed';
const click = 'registration_click';
</script>
</body>
</html>`

const records = new Map()
const store = {
  async put(key, value, options) {
    records.set(key, {
      value: JSON.parse(value),
      metadata: options?.metadata ?? null,
    })
  },
  async get(key, options) {
    const record = records.get(key)
    if (!record) return null
    return options?.type === 'json' ? record.value : JSON.stringify(record.value)
  },
}

const publishHandler = createQuizPublishHandler()
const disabledResponse = await publishHandler({
  request: new Request('https://constructor.example/api/quiz/publish', {
    method: 'POST',
    headers: {
      origin: 'https://constructor.example',
      'content-type': 'application/json',
      'cf-access-authenticated-user-email': 'operator@example.com',
      'cf-access-jwt-assertion': 'signed-assertion-placeholder',
    },
    body: JSON.stringify({ slug: 'personal-plan', title: 'План', html: validHtml }),
  }),
  env: { ATMOSPACE_QUIZ_PAGES: store },
})
assert.equal(disabledResponse.status, 503)
assert.equal(records.size, 0)

const unauthorizedResponse = await publishHandler({
  request: new Request('https://constructor.example/api/quiz/publish', {
    method: 'POST',
    headers: {
      origin: 'https://constructor.example',
      'content-type': 'application/json',
    },
    body: JSON.stringify({ slug: 'personal-plan', title: 'План', html: validHtml }),
  }),
  env: {
    ATMOSPACE_QUIZ_PUBLISHING_MODE: 'cloudflare_access',
    ATMOSPACE_QUIZ_PAGES: store,
  },
})
assert.equal(unauthorizedResponse.status, 403)
assert.equal(records.size, 0)

const publishedResponse = await publishHandler({
  request: new Request('https://constructor.example/api/quiz/publish', {
    method: 'POST',
    headers: {
      origin: 'https://constructor.example',
      'content-type': 'application/json',
      'cf-access-authenticated-user-email': 'operator@example.com',
      'cf-access-jwt-assertion': 'signed-assertion-placeholder',
    },
    body: JSON.stringify({
      slug: 'personal-plan',
      title: 'Персональный план',
      html: validHtml,
    }),
  }),
  env: {
    ATMOSPACE_QUIZ_PUBLISHING_MODE: 'cloudflare_access',
    ATMOSPACE_QUIZ_PAGES: store,
  },
})
assert.equal(publishedResponse.status, 200)
const publishedPayload = await publishedResponse.json()
assert.equal(publishedPayload.ok, true)
assert.equal(publishedPayload.data.publicUrl, 'https://constructor.example/q/personal-plan')
assert.match(publishedPayload.data.version, /^[a-f0-9]{24}$/)
assert.equal(JSON.stringify(publishedPayload).includes('operator@example.com'), false)
assert.equal(JSON.stringify(publishedPayload).includes(validHtml), false)
assert.equal(records.has('quiz:personal-plan'), true)

const pageHandler = createPublishedQuizHandler()
const pageResponse = await pageHandler({
  request: new Request('https://constructor.example/q/personal-plan'),
  env: { ATMOSPACE_QUIZ_PAGES: store },
  params: { slug: 'personal-plan' },
})
assert.equal(pageResponse.status, 200)
assert.equal(await pageResponse.text(), validHtml)
assert.match(pageResponse.headers.get('content-security-policy'), /api\.atmospace\.pro/)
assert.equal(pageResponse.headers.get('x-frame-options'), 'DENY')
const etag = pageResponse.headers.get('etag')
assert.ok(etag)

const cachedResponse = await pageHandler({
  request: new Request('https://constructor.example/q/personal-plan', {
    headers: { 'if-none-match': etag },
  }),
  env: { ATMOSPACE_QUIZ_PAGES: store },
  params: { slug: 'personal-plan' },
})
assert.equal(cachedResponse.status, 304)

const missingPage = await pageHandler({
  request: new Request('https://constructor.example/q/missing-page'),
  env: { ATMOSPACE_QUIZ_PAGES: store },
  params: { slug: 'missing-page' },
})
assert.equal(missingPage.status, 404)

let clientRequest = null
const clientResult = await publishPreparedQuiz({
  slug: 'personal-plan',
  title: 'Персональный план',
  html: validHtml,
  locationOrigin: 'https://constructor.example',
  fetchImpl: async (url, options) => {
    clientRequest = { url, options }
    return new Response(JSON.stringify({
      ok: true,
      data: {
        slug: 'personal-plan',
        publicUrl: 'https://constructor.example/q/personal-plan',
        version: '0123456789abcdef01234567',
        updatedAt: '2026-07-22T18:00:00.000Z',
      },
    }), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    })
  },
})
assert.equal(clientResult.publicUrl, 'https://constructor.example/q/personal-plan')
assert.equal(clientRequest.url, '/api/quiz/publish')
assert.equal(clientRequest.options.credentials, 'same-origin')
assert.equal(clientRequest.options.body.includes('operator@example.com'), false)

await assert.rejects(
  () => publishPreparedQuiz({
    slug: 'personal-plan',
    title: 'Персональный план',
    html: validHtml,
    locationOrigin: 'https://constructor.example',
    fetchImpl: async () => new Response(JSON.stringify({
      ok: true,
      data: {
        publicUrl: 'https://evil.example/q/personal-plan',
      },
    }), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    }),
  }),
  /Не удалось проверить адрес/,
)

const publishSource = fs.readFileSync(
  new URL('../functions/api/quiz/publish.js', import.meta.url),
  'utf8',
)
const panelSource = fs.readFileSync(
  new URL('../src/features/atmospace/QuizPublishPanel.jsx', import.meta.url),
  'utf8',
)
assert.match(publishSource, /ATMOSPACE_QUIZ_PUBLISHING_MODE/)
assert.match(publishSource, /cf-access-jwt-assertion/)
assert.match(publishSource, /ATMOSPACE_QUIZ_PAGES/)
assert.equal(publishSource.includes('console.log'), false)
assert.match(panelSource, /Опубликовать/)
assert.match(panelSource, /Скачать файл/)
assert.equal(panelSource.includes('KV'), false)
assert.equal(panelSource.includes('JWT'), false)
assert.equal(panelSource.includes('Cloudflare Access'), false)

console.log('automatic quiz publishing self-check passed')
