import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { transformConstructorAppSource } from '../src/buildTransforms/atmospaceBotFirst.js'
import {
  ATMOSPACE_MESSENGER_HOVER_COLOR,
  transformMessengerCtaUxSource,
} from '../src/buildTransforms/atmospaceMessengerCtaUx.js'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const rawApp = fs.readFileSync(path.join(root, 'src', 'App.jsx'), 'utf8')
const botFirstApp = transformConstructorAppSource(rawApp)
const transformedApp = transformMessengerCtaUxSource(botFirstApp)

assert.equal(transformMessengerCtaUxSource(botFirstApp), transformedApp, 'Messenger CTA UX transform must be deterministic.')
assert.equal(ATMOSPACE_MESSENGER_HOVER_COLOR, '#22c55e')

const helperStart = transformedApp.indexOf('function renderAtmospaceMessengerButtons(')
const helperEnd = transformedApp.indexOf('function botifyModernistoFormatOneTemplate', helperStart)
assert.notEqual(helperStart, -1)
assert.notEqual(helperEnd, -1)
const helper = transformedApp.slice(helperStart, helperEnd)

assert.equal(helper.split('target=\\"_blank\\"').length - 1, 2)
assert.equal(helper.split('rel=\\"noopener noreferrer\\"').length - 1, 2)
assert.equal((helper.match(/atmospace-messenger-cta/g) || []).length, 2)
assert.equal(helper.includes('${attributeName}=\\"telegram\\"'), true)
assert.equal(helper.includes('${attributeName}=\\"max\\"'), true)

const formatOneStart = transformedApp.indexOf('function botifyModernistoFormatOneTemplate(')
const formatOneEnd = transformedApp.indexOf('function buildAtmospaceBotRuntimeScript', formatOneStart)
assert.notEqual(formatOneStart, -1)
assert.notEqual(formatOneEnd, -1)
const formatOne = transformedApp.slice(formatOneStart, formatOneEnd)

assert.equal((formatOne.match(/id="atmospace-messenger-cta-ux"/g) || []).length, 1)
assert.equal(formatOne.includes('.atmospace-messenger-cta:hover'), true)
assert.equal(formatOne.includes(`background:${ATMOSPACE_MESSENGER_HOVER_COLOR}!important`), true)
assert.equal(formatOne.includes(`border-color:${ATMOSPACE_MESSENGER_HOVER_COLOR}!important`), true)
assert.equal(formatOne.includes('color:#fff!important'), true)

const runtimeStart = transformedApp.indexOf('function buildAtmospaceBotRuntimeScript(')
const runtimeEnd = transformedApp.indexOf('function validateAtmospaceBotFirstTildaHtml', runtimeStart)
assert.notEqual(runtimeStart, -1)
assert.notEqual(runtimeEnd, -1)
const runtime = transformedApp.slice(runtimeStart, runtimeEnd)

assert.equal((runtime.match(/id="atmospace-messenger-cta-ux"/g) || []).length, 1)
assert.equal(runtime.includes('.atmospace-messenger-cta:hover'), true)
assert.equal(runtime.includes('.atmospace-messenger-cta:focus-visible'), true)
assert.equal(runtime.includes(`background:${ATMOSPACE_MESSENGER_HOVER_COLOR}!important`), true)
assert.equal(runtime.includes(`border-color:${ATMOSPACE_MESSENGER_HOVER_COLOR}!important`), true)
assert.equal(runtime.includes('color:#fff!important'), true)

assert.equal(rawApp.includes('atmospace-messenger-cta-ux'), false, 'Raw visual source must remain untouched.')

console.log('atmospace messenger CTA UX check passed')
