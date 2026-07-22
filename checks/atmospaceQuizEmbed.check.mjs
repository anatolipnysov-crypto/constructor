import assert from 'node:assert/strict'
import fs from 'node:fs'

import {
  buildTildaEmbedFromStandaloneHtml,
} from '../src/features/atmospace/embedCode.js'

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
<main class="quiz-page">
  <img src="${mediaUrl}" alt="">
  <button type="button">Продолжить</button>
</main>
<script>window.quizReady = true;</script>
</body>
</html>`

const embedCode = buildTildaEmbedFromStandaloneHtml(sampleStandaloneHtml, {
  embedId: 'media-check',
})
assert.match(embedCode, /вставьте код целиком в блок T123/)
assert.match(embedCode, /class="atmospace-quiz-embed"/)
assert.match(embedCode, /data-atmospace-quiz="media-check"/)
assert.match(embedCode, /<style>/)
assert.match(embedCode, /<script>/)
assert.equal(embedCode.includes(mediaUrl), true)
assert.equal(embedCode.includes('<!doctype html>'), false)
assert.equal(embedCode.includes('<html'), false)
assert.equal(embedCode.includes('<head'), false)
assert.equal(embedCode.includes('<body'), false)
assert.equal(embedCode.includes(':root {'), false)
assert.equal(embedCode.includes('\nbody {'), false)
assert.match(embedCode, /\.atmospace-quiz-embed/)

for (const transientUrl of [
  'blob:https://constructor.example/temp-image',
  'file:///tmp/local-image.jpg',
]) {
  assert.throws(
    () => buildTildaEmbedFromStandaloneHtml(
      sampleStandaloneHtml.replace(mediaUrl, transientUrl),
    ),
    /прямой HTTPS-ссылкой/,
  )
}

const panelSource = fs.readFileSync(
  new URL('../src/features/atmospace/QuizPublishPanel.jsx', import.meta.url),
  'utf8',
)
const embedSource = fs.readFileSync(
  new URL('../src/features/atmospace/embedCode.js', import.meta.url),
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
assert.equal(embedSource.includes('fetch('), false)
assert.equal(embedSource.includes('/api/quiz/publish'), false)
assert.equal(embedSource.includes('/q/'), false)

for (const removedPath of [
  '../functions/api/quiz/publish.js',
  '../functions/q/[slug].js',
  '../src/features/atmospace/publishingClient.js',
]) {
  assert.equal(fs.existsSync(new URL(removedPath, import.meta.url)), false)
}

console.log('portable quiz embed self-check passed')
