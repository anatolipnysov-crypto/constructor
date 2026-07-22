import assert from 'node:assert/strict'
import fs from 'node:fs'

import {
  buildStandaloneQuizHtml,
  buildTildaEmbedFromStandaloneHtml,
  buildTildaQuizEmbedCode,
} from '../src/features/atmospace/embedCode.js'
import { createAtmospaceMenRestartPreset } from '../src/features/atmospace/quizPresets.js'

const project = createAtmospaceMenRestartPreset()
const preparedConfig = {
  publicLandingKey: 'safe-public-landing-key',
  counterId: '12345678',
  landingName: 'Мужчины 30–60',
  landingCode: 'partner-code-for-generation-only',
  adGoalCredential: 'must-not-be-exported',
}

const embedCode = buildTildaQuizEmbedCode(project, preparedConfig)
assert.match(embedCode, /вставьте код целиком в блок T123/)
assert.match(embedCode, /class="atmospace-quiz-embed"/)
assert.match(embedCode, /<style>/)
assert.match(embedCode, /<script>/)
assert.match(embedCode, /safe-public-landing-key/)
assert.match(embedCode, /12345678/)
assert.match(embedCode, /\/api\/landing-runtime\/init/)
assert.match(embedCode, /landing_view/)
assert.match(embedCode, /quiz_completed/)
assert.match(embedCode, /registration_click/)
assert.equal(embedCode.includes('<!doctype html>'), false)
assert.equal(embedCode.includes('<html'), false)
assert.equal(embedCode.includes('<head'), false)
assert.equal(embedCode.includes('<body'), false)
assert.equal(embedCode.includes('partner-code-for-generation-only'), false)
assert.equal(embedCode.includes('must-not-be-exported'), false)
assert.equal(embedCode.includes('/api/quiz/publish'), false)
assert.equal(embedCode.includes('/q/'), false)
assert.equal(embedCode.includes('Cloudflare'), false)

const standaloneHtml = buildStandaloneQuizHtml(project, preparedConfig)
assert.equal(standaloneHtml.startsWith('<!doctype html>'), true)
assert.match(standaloneHtml, /safe-public-landing-key/)
assert.equal(standaloneHtml.includes('must-not-be-exported'), false)

const mediaUrl = 'https://media.sergey.example/quiz/hero.webp'
const sampleStandaloneHtml = `<!doctype html>
<html lang="ru">
<head>
<style>
:root { --accent:#2563eb; }
* { box-sizing:border-box; }
html { scroll-behavior:smooth; }
body { margin:0; background:#fff; }
button,input { font:inherit; }
.quiz-page { width:100%; }
</style>
</head>
<body>
<main class="quiz-page"><img src="${mediaUrl}" alt=""></main>
<script>window.quizReady = true;</script>
</body>
</html>`
const portableSample = buildTildaEmbedFromStandaloneHtml(sampleStandaloneHtml, {
  embedId: 'media-check',
})
assert.match(portableSample, new RegExp(mediaUrl.replaceAll('.', '\\.')))
assert.equal(portableSample.includes(':root {'), false)
assert.equal(portableSample.includes('\nbody {'), false)
assert.match(portableSample, /\.atmospace-quiz-embed/)

assert.throws(
  () => buildTildaEmbedFromStandaloneHtml(
    sampleStandaloneHtml.replace(mediaUrl, 'blob:https://constructor.example/temp-image'),
  ),
  /прямой HTTPS-ссылкой/,
)

const panelSource = fs.readFileSync(
  new URL('../src/features/atmospace/QuizPublishPanel.jsx', import.meta.url),
  'utf8',
)
assert.match(panelSource, /Получить код квиза/)
assert.match(panelSource, /Скопировать код/)
assert.match(panelSource, /блок T123/)
assert.match(panelSource, /Картинки остаются по исходным HTTPS-ссылкам/)
assert.equal(panelSource.includes('Опубликовать'), false)
assert.equal(panelSource.includes('Адрес страницы'), false)
assert.equal(panelSource.includes('Cloudflare'), false)
assert.equal(panelSource.includes('/q/'), false)
assert.equal(panelSource.includes('publishPreparedQuiz'), false)

for (const removedPath of [
  '../functions/api/quiz/publish.js',
  '../functions/q/[slug].js',
  '../src/features/atmospace/publishingClient.js',
]) {
  assert.equal(fs.existsSync(new URL(removedPath, import.meta.url)), false)
}

console.log('portable quiz embed self-check passed')
