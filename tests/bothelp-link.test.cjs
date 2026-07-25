const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const appSource = fs.readFileSync(path.join(root, 'src', 'App.jsx'), 'utf8');
const CLICK_HELPER_NAMES = ['sendEvent', 'sendRuntimeEvent'];

function extractFunctionBody(source, signature) {
  const functionStart = source.indexOf(signature);
  assert.notEqual(functionStart, -1, `${signature} must exist.`);

  const returnMarker = 'return `<script>';
  const runtimeStart = source.indexOf(returnMarker, functionStart);
  assert.notEqual(runtimeStart, -1, 'Atmospace runtime template must start with return script.');
  const inlineRuntimeStart = runtimeStart + returnMarker.length;
  const inlineRuntimeEnd = source.indexOf('</script>`;', inlineRuntimeStart);
  assert.notEqual(inlineRuntimeEnd, -1, 'Atmospace runtime template must have a closing script marker.');
  return source.slice(inlineRuntimeStart, inlineRuntimeEnd);
}

function literalCalls(source, functionName) {
  const calls = [];
  const pattern = new RegExp(`${functionName}\\(\\s*['\"]([^'\"]+)['\"]`, 'g');
  let match;
  while ((match = pattern.exec(source))) calls.push(match[1]);
  return calls;
}

function functionSlice(source, signature) {
  const start = source.indexOf(signature);
  assert.notEqual(start, -1, `${signature} must exist.`);
  const next = source.indexOf('\n  function ', start + signature.length);
  return source.slice(start, next === -1 ? source.length : next);
}

function hasRegistrationStartedHandoff(source) {
  const directHandoff = /(?:reachGoal|sendMetrikaGoal)\(\s*['"]registration_started['"][\s\S]{0,1000}window\.location\.(?:assign\(registrationUrl\)|href\s*=\s*registrationUrl)/;
  const callbackHandoff = /function\s+(\w+)\s*\(\)\s*\{[\s\S]{0,500}window\.location\.(?:assign\(registrationUrl\)|href\s*=\s*registrationUrl)[\s\S]{0,1000}(?:reachGoal|sendMetrikaGoal)\(\s*['"]registration_started['"]\s*,[\s\S]{0,300}\b\1\s*\)/;
  return directHandoff.test(source) || callbackHandoff.test(source);
}

function hasExactRegistrationPassthrough(source) {
  return /(?:var|let|const)\s+candidate\s*=\s*(?:(?:links\s*&&\s*links\.registration)|(?:links\?\.registration)|(?:links\s*&&\s*typeof\s+links\.registration\s*===\s*['"]string['"]\s*\?\s*links\.registration\s*:\s*['"]{2}))\s*;?[\s\S]{0,400}registrationUrl\s*=\s*candidate\s*;?/.test(source);
}

const runtime = extractFunctionBody(appSource, 'function buildAtmospacePrelandingTrackingScript()');

[
  'window.ATMOSPACE_LANDING_CONFIG',
  'ATMOSPACE_GENERATED_RUNTIME_VERSION',
  'ATMOSPACE_PUBLIC_API_BASE_URL',
  '/api/landing-runtime/init',
  '/api/landing-runtime/click',
  'data-atmospace-quiz-link',
  'data-atmospace-registration-link',
  'links.registration',
  'public_landing_key',
  'counter_id',
  'landing_variant_code',
  'landing_variant_name',
  'page_instance_id',
  'page_url',
  'referrer',
  'browser_language',
  'browser_client_time',
  'advertising_click_ids',
  'yclid',
  'gclid',
  'fbclid',
  'msclkid',
  'dclid',
  'utm_source',
  'utm_medium',
  'utm_campaign',
  'utm_content',
  'utm_term',
  'https://mc.yandex.ru/metrika/tag.js',
  'landing_view',
  'quiz_start_click',
  'question_answered',
  'question_index',
  'event_ref',
  'quiz_completed',
  'registration_started'
].forEach((snippet) => {
  assert.ok(runtime.includes(snippet), `Final Atmospace runtime must include ${snippet}`);
});

assert.ok(
  hasExactRegistrationPassthrough(runtime),
  'The registration URL must be copied from links.registration without rebuilding it.'
);
assert.match(
  runtime,
  /window\.location\.assign\(registrationUrl\)/,
  'Registration must navigate with the unchanged stored registrationUrl.'
);
assert.doesNotMatch(runtime, /buildQuizUrl|pathname\s*=\s*['"]\/quiz['"]|['"]\/quiz(?:[?#'"]|$)/);
assert.doesNotMatch(
  runtime,
  /registrationUrl\s*(?:\+=|=\s*registrationUrl\s*\+)|registrationUrl\.searchParams|(?:searchParams\.(?:set|append))\([^)]*(?:utm_|yclid)/i,
  'The constructor must not append attribution or quiz data to links.registration.'
);

assert.match(
  runtime,
  /(?:reachGoal|sendMetrikaGoal)\(\s*['"]question_answered['"]\s*,\s*\{[\s\S]{0,180}question_index/,
  'question_answered must contain the safe question_index parameter.'
);
assert.match(
  runtime,
  /sendEvent\(\s*['"]question_answered['"]\s*,\s*\{[\s\S]{0,120}question_index[\s\S]{0,120}event_ref/,
  'question_answered must contain only safe question_index and event_ref fields.'
);
assert.doesNotMatch(
  runtime,
  /\bquestionNumber\s*:|\bquestion_id\s*:/,
  'Legacy questionNumber/question_id fields must not return to the runtime.'
);
assert.ok(
  hasRegistrationStartedHandoff(runtime),
  'registration_started must be emitted immediately before registration navigation.'
);

const clickEvents = CLICK_HELPER_NAMES.flatMap((helperName) => literalCalls(runtime, helperName));
assert.deepEqual(
  [...new Set(clickEvents)].sort(),
  ['landing_opened', 'question_answered', 'quiz_completed', 'quiz_start_click', 'registration_started'].sort(),
  '/click must receive the full Atmospace quiz funnel event set.'
);

assert.equal(
  (runtime.match(/(?:var|let|const)\s+pageInstanceId\s*=\s*makePageInstanceId\(\);/g) || []).length,
  1,
  'Exactly one pageInstanceId must be created per page load.'
);
assert.equal(
  (runtime.match(/=\s*makePageInstanceId\(\)/g) || []).length,
  1,
  'Retry must not create a second pageInstanceId.'
);
assert.match(runtime, /retry/i, 'A visible retry path must exist after a temporary init failure.');
assert.doesNotMatch(runtime, /sessionStorage|localStorage/i, 'Runtime state and quiz answers must not use browser storage.');

const basePayload = functionSlice(runtime, 'function buildBasePayload');
const clickPayloads = CLICK_HELPER_NAMES
  .filter((helperName) => runtime.includes(`function ${helperName}`))
  .map((helperName) => [`click payload (${helperName})`, functionSlice(runtime, `function ${helperName}`)]);
assert.ok(clickPayloads.length > 0, 'A sendEvent or sendRuntimeEvent click helper must exist.');
for (const [name, payloadSource] of [['init payload', basePayload], ...clickPayloads]) {
  assert.doesNotMatch(
    payloadSource,
    /\banswers?\b|quiz_answers?|selectedOption|optionText|questionText|resultKey|quiz_result/i,
    `${name} must not contain quiz answers or result details.`
  );
}

[
  /buildQuizUrl/i,
  /r\.bothelp\.io/i,
  /bothelp/i,
  /telegram/i,
  /data-fh-messenger/i,
  /data-atmospace-messenger/i,
  /messenger_button_clicked/i,
  /links\.telegram|links\.max/i,
  /telegramDomain|telegramStart|maxDomain|maxStart/i,
  /registration_click/i,
  /quiz_question_\d+_answered/i,
  /registration_success/i,
  /payment_success/i,
  /notifications_connected/i,
  /window\.FH_CONFIG/i,
  /window\.FUNNEL_CONFIG/i,
  /smart-endpoint/i,
  /supabase\.co\/functions\/v1/i,
  /https:\/\/web\.telegram\.org\/k\/#/i
].forEach((pattern) => {
  assert.doesNotMatch(runtime, pattern, `Final Atmospace runtime must not match ${pattern}`);
});

[
  'validateAtmospaceTildaHtml',
  'data-atmospace-quiz-link',
  'data-atmospace-registration-link',
  'window.ATMOSPACE_LANDING_CONFIG',
  'publicLandingKey',
  'counterId'
].forEach((snippet) => {
  assert.ok(appSource.includes(snippet), `Constructor source must include ${snippet}`);
});

console.log('Final Atmospace quiz-registration runtime contract passed');
