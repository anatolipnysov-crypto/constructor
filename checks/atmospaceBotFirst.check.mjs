import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { transformConstructorAppSource } from '../src/buildTransforms/atmospaceBotFirst.js'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const rawApp = fs.readFileSync(path.join(root, 'src', 'App.jsx'), 'utf8')
const transformedApp = transformConstructorAppSource(rawApp)

assert.notEqual(transformedApp, rawApp)
assert.equal(transformConstructorAppSource(rawApp), transformedApp, 'Bot-first transform must be deterministic.')

for (const required of [
  'Смотреть в Telegram',
  'Смотреть в MAX',
  'data-atmospace-messenger',
  'data-atmospace-messenger-proxy',
  'telegram_button_click',
  'max_button_click',
  'sergey-constructor-bot-v1',
  'botifyModernistoFormatOneTemplate',
  'buildAtmospaceBotRuntimeScript',
  'https://app.atmospace.pro/acquisition/landing-runtime-v1.js',
]) {
  assert.equal(transformedApp.includes(required), true, `Transformed App must include ${required}.`)
}

const formatOneStart = transformedApp.indexOf('function renderModernistoStartPrelanding({')
const formatOneEnd = transformedApp.indexOf('\nfunction ', formatOneStart + 1)
assert.notEqual(formatOneStart, -1)
assert.notEqual(formatOneEnd, -1)
const formatOne = transformedApp.slice(formatOneStart, formatOneEnd)
assert.equal(formatOne.includes('botifyModernistoFormatOneTemplate'), true)
assert.equal(formatOne.includes('https://app.atmospace.pro/acquisition/landing-runtime-v1.js'), true)
assert.equal(formatOne.includes('src="${esc(MODERNISTO_FORMAT_ONE_ATTRIBUTION_URL)}"'), false)

const formatSixStart = transformedApp.indexOf('function renderStaticInsightPrelanding({')
const formatSixEnd = transformedApp.indexOf('\nfunction renderBarrierProfileQuizPrelanding', formatSixStart)
assert.notEqual(formatSixStart, -1)
assert.notEqual(formatSixEnd, -1)
const formatSix = transformedApp.slice(formatSixStart, formatSixEnd)
assert.equal(formatSix.includes("renderAtmospaceMessengerButtons('fh-si-cta', true)"), true)
assert.equal(formatSix.includes("renderAtmospaceMessengerButtons('fh-si-cta', false)"), true)
assert.equal(formatSix.includes('buildAtmospaceBotRuntimeScript({ projectData, ...(landingMeta || {}) })'), true)
assert.equal(formatSix.includes("renderAtmospaceRegistrationButton('fh-si-cta')"), false)
assert.equal(formatSix.includes('${buildAtmospacePrelandingTrackingScript()}'), false)

const helperStart = transformedApp.indexOf('function renderAtmospaceMessengerButtons(')
const helperEnd = transformedApp.indexOf('function buildAtmospaceHeadConfig', helperStart)
const helpers = transformedApp.slice(helperStart, helperEnd)
assert.equal((helpers.match(/data-atmospace-messenger=\\"/g) || []).length >= 1, true)
assert.equal(helpers.includes("sendRuntimeEvent('channel_subscription_verified'"), false)
assert.equal(helpers.includes("reachGoal','channel_subscription_verified'"), false)
assert.equal(helpers.includes("reachGoal','offer_link_clicked'"), false)
assert.equal(helpers.includes("reachGoal','registration_success'"), false)
assert.equal(helpers.includes("reachGoal','payment_success'"), false)

assert.equal(rawApp.includes("renderAtmospaceRegistrationButton('fh-si-cta')"), true, 'Raw visual source remains untouched; Vite applies the guarded active-output transform.')

console.log('atmospace bot-first constructor transform check passed')
