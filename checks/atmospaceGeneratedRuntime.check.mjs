import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const generators = [
  ['browser generator', fs.readFileSync(path.join(root, 'src', 'App.jsx'), 'utf8'), 'buildAtmospacePrelandingTrackingScript'],
  ['worker generator', fs.readFileSync(path.join(root, 'cloudflare-api-worker.js'), 'utf8'), 'buildAtmospaceRuntimeScript'],
  ['local API generator', fs.readFileSync(path.join(root, 'ai-server.js'), 'utf8'), 'buildAtmospaceRuntimeScript'],
]

const requiredEvents = [
  'landing_opened',
  'quiz_start_click',
  'question_answered',
  'quiz_completed',
  'registration_started',
]

function extractGeneratedRuntime(source, functionName) {
  const functionStart = source.indexOf(`function ${functionName}`)
  assert.notEqual(functionStart, -1, `${functionName} must exist.`)

  const templateStart = source.indexOf('return `<script', functionStart)
  assert.notEqual(templateStart, -1, `${functionName} must return a script template.`)

  const templateEnd = source.indexOf('</script>`;', templateStart)
  assert.notEqual(templateEnd, -1, `${functionName} script template must be closed.`)

  return source.slice(templateStart, templateEnd + '</script>'.length)
}

for (const [name, source, functionName] of generators) {
  const runtime = extractGeneratedRuntime(source, functionName)

  assert.match(runtime, /question_index\s*:\s*questionIndex/,
    `${name} must send the one-based question_index.`)
  assert.match(runtime, /event_ref\s*:\s*['"]question-['"]\s*\+\s*String\(questionIndex\)/,
    `${name} must send a safe question event_ref.`)
  assert.match(runtime, /Number\.isInteger\(questionIndex\)[\s\S]{0,160}questionIndex\s*>=\s*1[\s\S]{0,160}questionIndex\s*<=\s*100/,
    `${name} must validate the Atmospace question_index range.`)
  assert.match(runtime, /\^\[a-z0-9\._:-\]\{1,80\}\$/,
    `${name} must validate the Atmospace event_ref format.`)
  assert.doesNotMatch(runtime, /sendEvent\(\s*['"]question_answered['"]\s*,\s*\{[^}]*\bquestionNumber\s*:/,
    `${name} must not send the legacy questionNumber field.`)
  assert.doesNotMatch(runtime, /sendEvent\(\s*['"]question_answered['"]\s*,\s*\{[^}]*\bquestion_id\s*:/,
    `${name} must not send the legacy question_id field.`)
  assert.doesNotMatch(runtime, /\b(answer|answer_text|answer_value|answer_label|option_text)\s*:/i,
    `${name} must not send answer details.`)
  assert.match(runtime, /pendingClickEvents/,
    `${name} must keep pre-init events queued.`)
  assert.match(runtime, /flushPendingClickEvents/,
    `${name} must flush queued events only after init.`)
  assert.match(runtime, /advertising_click_ids/,
    `${name} must preserve advertising click identifiers.`)
  for (const key of ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term']) {
    assert.match(runtime, new RegExp(`\\b${key}\\b`), `${name} must preserve ${key}.`)
  }
  for (const key of ['yclid', 'gclid', 'fbclid', 'msclkid', 'dclid']) {
    assert.match(runtime, new RegExp(`['"]${key}['"]`), `${name} must preserve ${key}.`)
  }
  for (const eventName of requiredEvents) {
    assert.match(runtime, new RegExp(`['"]${eventName}['"]`), `${name} must include ${eventName}.`)
  }
  assert.match(runtime, /\/api\/landing-runtime\/init|cfg\.initPath/,
    `${name} must initialize through the Atmospace init endpoint.`)
  assert.match(runtime, /\/api\/landing-runtime\/click|cfg\.clickPath/,
    `${name} must send events through the Atmospace click endpoint.`)
  assert.doesNotMatch(runtime, /navigator\.sendBeacon/,
    `${name} must not use sendBeacon for event delivery.`)
  assert.doesNotMatch(runtime, /sergey-constructor-atmospace-v1/,
    `${name} must not contain the retired runtime signature.`)
  assert.match(runtime, /applyRegistrationLink\(links\)[\s\S]{0,260}sendLandingOpenedOnce\(\);[\s\S]{0,120}flushPendingClickEvents\(\);/,
    `${name} must wait for a valid init response before opening and flushing events.`)
}

console.log('atmospace generated runtime contract check passed')
