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
  'validateAtmospaceBotFirstTildaHtml',
  'https://app.atmospace.pro/acquisition/landing-runtime-v1.js',
]) {
  assert.equal(transformedApp.includes(required), true, `Transformed App must include ${required}.`)
}

const sliceFunction = (source, startMarker, endMarker = '\nfunction ') => {
  const start = source.indexOf(startMarker)
  assert.notEqual(start, -1, `Missing ${startMarker}`)
  const end = source.indexOf(endMarker, start + startMarker.length)
  assert.notEqual(end, -1, `Missing end marker for ${startMarker}`)
  return source.slice(start, end)
}

const rawFormatOne = sliceFunction(rawApp, 'function renderModernistoStartPrelanding({')
const formatOne = sliceFunction(transformedApp, 'function renderModernistoStartPrelanding({')
assert.equal(formatOne.includes('botifyModernistoFormatOneTemplate'), true)
assert.equal(formatOne.includes('https://app.atmospace.pro/acquisition/landing-runtime-v1.js'), true)
assert.equal(formatOne.includes('src="${esc(MODERNISTO_FORMAT_ONE_ATTRIBUTION_URL)}"'), false)

const normalizedFormatOne = formatOne
  .replace(
    'const botFirstTemplate = botifyModernistoFormatOneTemplate(`${template}${titleSizingCss}${privacyLinkCss}${MODERNISTO_FORMAT_ONE_VISUAL_CSS}`);\n\n  return `${botFirstTemplate}\n<script',
    'return `${template}${titleSizingCss}${privacyLinkCss}${MODERNISTO_FORMAT_ONE_VISUAL_CSS}\n<script',
  )
  .replace(
    'src="https://app.atmospace.pro/acquisition/landing-runtime-v1.js"',
    'src="${esc(MODERNISTO_FORMAT_ONE_ATTRIBUTION_URL)}"',
  )
assert.equal(normalizedFormatOne, rawFormatOne, 'Format 1 source may differ only at approved CTA/runtime transform points.')

const rawFormatSix = sliceFunction(rawApp, 'function renderStaticInsightPrelanding({', '\nfunction renderBarrierProfileQuizPrelanding')
const formatSix = sliceFunction(transformedApp, 'function renderStaticInsightPrelanding({', '\nfunction renderBarrierProfileQuizPrelanding')
assert.equal(formatSix.includes("renderAtmospaceMessengerButtons('fh-si-cta', true)"), true)
assert.equal(formatSix.includes("renderAtmospaceMessengerButtons('fh-si-cta', false)"), true)
assert.equal(formatSix.includes('buildAtmospaceBotRuntimeScript({ projectData, ...(landingMeta || {}) })'), true)
assert.equal(formatSix.includes("renderAtmospaceRegistrationButton('fh-si-cta')"), false)
assert.equal(formatSix.includes('${buildAtmospacePrelandingTrackingScript()}'), false)

const normalizedFormatSix = formatSix
  .replace("${renderAtmospaceMessengerButtons('fh-si-cta', true)}", "${renderAtmospaceRegistrationButton('fh-si-cta')}")
  .replace("${renderAtmospaceMessengerButtons('fh-si-cta', false)}", "${renderAtmospaceRegistrationButton('fh-si-cta')}")
  .replace(
    '${buildAtmospaceBotRuntimeScript({ projectData, ...(landingMeta || {}) })}',
    '${buildAtmospacePrelandingTrackingScript()}',
  )
assert.equal(normalizedFormatSix, rawFormatSix, 'Format 6 source may differ only at approved CTA/runtime transform points.')

assert.equal(
  transformedApp.includes('() => validateAtmospaceBotFirstTildaHtml(prelandingHtml, prelandingHtmlConfig, {'),
  true,
  'Active generated HTML must use the bot-first validator.',
)
assert.equal(
  transformedApp.includes('() => validateAtmospaceTildaHtml(prelandingHtml, prelandingHtmlConfig, {'),
  false,
  'Legacy validator must not validate active bot-first output.',
)

const helperStart = transformedApp.indexOf('function renderAtmospaceMessengerButtons(')
const helperEnd = transformedApp.indexOf('function buildAtmospaceHeadConfig', helperStart)
const helpers = transformedApp.slice(helperStart, helperEnd)
assert.equal((helpers.match(/data-atmospace-messenger=\\"/g) || []).length >= 1, true)
assert.equal(helpers.includes("sendRuntimeEvent('channel_subscription_verified'"), false)
assert.equal(helpers.includes("reachGoal','channel_subscription_verified'"), false)
assert.equal(helpers.includes("reachGoal','offer_link_clicked'"), false)
assert.equal(helpers.includes("reachGoal','registration_success'"), false)
assert.equal(helpers.includes("reachGoal','payment_success'"), false)

const validatorStart = transformedApp.indexOf('function validateAtmospaceBotFirstTildaHtml(')
const validatorEnd = transformedApp.indexOf('\nfunction buildAtmospaceHeadConfig', validatorStart)
assert.notEqual(validatorStart, -1)
assert.notEqual(validatorEnd, -1)
const validator = transformedApp.slice(validatorStart, validatorEnd)
for (const forbiddenBrowserGoal of [
  'channel_subscription_verified',
  'offer_link_clicked',
  'registration_success',
  'payment_success',
]) {
  assert.equal(validator.includes(forbiddenBrowserGoal), true, `Validator must reject browser goal ${forbiddenBrowserGoal}.`)
}
assert.equal(validator.includes('landing-runtime-v1.js'), true)
assert.equal(validator.includes('validateModernistoStartTildaHtml(normalizedLegacySource, config)'), true)
assert.equal(validator.includes('r\\.bothelp\\.io'), true)

assert.equal(rawApp.includes("renderAtmospaceRegistrationButton('fh-si-cta')"), true, 'Raw visual source remains untouched; Vite applies the guarded active-output transform.')

console.log('atmospace bot-first constructor transform check passed')
