const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const worker = fs.readFileSync(path.join(root, 'cloudflare-api-worker.js'), 'utf8');
const localApi = fs.readFileSync(path.join(root, 'ai-server.js'), 'utf8');
const app = fs.readFileSync(path.join(root, 'src', 'App.jsx'), 'utf8');
const inputValidation = fs.readFileSync(path.join(root, 'src', 'utils', 'atmospaceLandingInput.js'), 'utf8');
const atmospaceComponent = app.slice(
  app.indexOf('function AtmospaceLandingConstructor'),
  app.indexOf('function FunnelStepCard')
);

const failures = [];
const CLICK_HELPER_NAMES = ['sendEvent', 'sendRuntimeEvent'];

function expect(condition, message) {
  if (!condition) failures.push(message);
}

function handlerSource(source) {
  const start = source.indexOf('async function handleAtmospaceLandingGenerate');
  if (start === -1) return '';
  const next = source.indexOf('\nasync function ', start + 1);
  return source.slice(start, next === -1 ? source.length : next);
}

function namedFunctionSource(source, signature) {
  const start = source.indexOf(signature);
  if (start === -1) return '';
  const next = source.indexOf('\nfunction ', start + signature.length);
  return source.slice(start, next === -1 ? source.length : next);
}

function literalCalls(source, functionName) {
  const calls = [];
  const pattern = new RegExp(`${functionName}\\(\\s*['\"]([^'\"]+)['\"]`, 'g');
  let match;
  while ((match = pattern.exec(source))) calls.push(match[1]);
  return calls;
}

function hasRegistrationStartedHandoff(source) {
  const directHandoff = /(?:reachGoal|sendMetrikaGoal)\(\s*["']registration_started["'][\s\S]{0,1000}window\.location\.(?:assign\(registrationUrl\)|href\s*=\s*registrationUrl)/;
  const callbackHandoff = /function\s+(\w+)\s*\(\)\s*\{[\s\S]{0,500}window\.location\.(?:assign\(registrationUrl\)|href\s*=\s*registrationUrl)[\s\S]{0,1000}(?:reachGoal|sendMetrikaGoal)\(\s*["']registration_started["']\s*,[\s\S]{0,300}\b\1\s*\)/;
  return directHandoff.test(source) || callbackHandoff.test(source);
}

function hasExactRegistrationPassthrough(source) {
  return /(?:var|let|const)\s+candidate\s*=\s*(?:(?:links\s*&&\s*links\.registration)|(?:links\?\.registration)|(?:links\s*&&\s*typeof\s+links\.registration\s*===\s*["']string["']\s*\?\s*links\.registration\s*:\s*["']{2}))\s*;?[\s\S]{0,400}registrationUrl\s*=\s*candidate\s*;?/.test(source);
}

function assertFinalRuntimeContract(name, runtime) {
  for (const marker of [
    'data-atmospace-quiz-link',
    'data-atmospace-registration-link',
    'links.registration',
    'https://mc.yandex.ru/metrika/tag.js',
    'landing_view',
    'quiz_start_click',
    'question_answered',
    'question_index',
    'event_ref',
    'quiz_completed',
    'registration_started',
  ]) {
    expect(runtime.includes(marker), `${name}: final runtime must include ${marker}`);
  }

  expect(
    hasExactRegistrationPassthrough(runtime),
    `${name}: links.registration must be stored unchanged`,
  );
  expect(
    /window\.location\.assign\(registrationUrl\)/.test(runtime),
    `${name}: registration must navigate with the stored registrationUrl`,
  );
  expect(
    !/buildQuizUrl|pathname\s*=\s*["']\/quiz["']|["']\/quiz(?:[?#"']|$)/.test(runtime),
    `${name}: runtime must not build or route to a separate /quiz page`,
  );
  expect(
    !/registrationUrl\s*(?:\+=|=\s*registrationUrl\s*\+)|registrationUrl\.searchParams|searchParams\.(?:set|append)\([^)]*(?:utm_|yclid)/i.test(runtime),
    `${name}: runtime must not alter links.registration`,
  );

  const clickEvents = [...new Set(CLICK_HELPER_NAMES.flatMap((helperName) => literalCalls(runtime, helperName)))].sort();
  const requiredClickEvents = ['landing_opened', 'question_answered', 'quiz_completed', 'quiz_start_click', 'registration_started'].sort();
  expect(
    JSON.stringify(clickEvents) === JSON.stringify(requiredClickEvents),
    `${name}: /click must receive the full Atmospace quiz funnel event set (found ${clickEvents.join(', ') || 'none'})`,
  );
  expect(
    (runtime.match(/cfg\.baseUrl\+cfg\.clickPath/g) || []).length === 1,
    `${name}: runtime must derive the Atmospace click endpoint exactly once`,
  );
  expect(
    /sendEvent\(\s*["']question_answered["']\s*,\s*\{[\s\S]{0,120}question_index[\s\S]{0,120}event_ref/.test(runtime),
    `${name}: question_answered must carry the safe question_index and event_ref fields`,
  );
  expect(
    !/\bquestionNumber\s*:|\bquestion_id\s*:/.test(runtime),
    `${name}: legacy questionNumber/question_id payload fields are forbidden`,
  );
  const browserMetrikaGoals = literalCalls(runtime, 'reachGoal').sort();
  expect(
    JSON.stringify(browserMetrikaGoals) === JSON.stringify(['landing_view', 'quiz_start_click', 'quiz_completed', 'offer_view', 'registration_started'].sort()),
    `${name}: browser Metrika must receive the live-compatible funnel goal set`,
  );
  expect(runtime.includes('window.mainMetrikaId'), `${name}: runtime must reuse the native Tilda counter identity`);
  expect(runtime.includes('existingCounterId'), `${name}: runtime must detect an already initialized Tilda counter`);
  expect(runtime.includes('script[src*="mc.yandex.ru/metrika/tag"]'), `${name}: runtime must recognize an existing Metrika loader`);
  expect(
    name === 'frontend'
      ? runtime.includes('else markOfferViewed()')
      : runtime.includes('!isQuizRequired()||quizCompleted'),
    `${name}: direct-registration formats must not be blocked by a missing quiz`,
  );
  expect(
    hasRegistrationStartedHandoff(runtime),
    `${name}: registration_started must precede registration navigation`,
  );
  expect(
    /data\.status\s*!==\s*["']ready["']/.test(runtime),
    `${name}: registration must stay blocked until Atmospace reports status=ready`,
  );

  expect(/(?:var|let|const)\s+pageInstanceId\s*=\s*makePageInstanceId\(\);/.test(runtime), `${name}: runtime must create pageInstanceId once`);
  expect((runtime.match(/(?:var|let|const)\s+pageInstanceId\s*=\s*makePageInstanceId\(\);/g) || []).length === 1, `${name}: runtime must contain one pageInstanceId declaration`);
  expect((runtime.match(/=\s*makePageInstanceId\(\)/g) || []).length === 1, `${name}: retry must reuse the same pageInstanceId`);
  expect(/retry/i.test(runtime), `${name}: runtime must expose a retry path`);
  expect(!/sessionStorage|localStorage/i.test(runtime), `${name}: runtime must not persist pageInstanceId or quiz answers in browser storage`);

  const payloadBodies = [
    runtime.match(/function\s+buildBasePayload\s*\([^)]*\)\s*\{[\s\S]*?\n\s*\}/)?.[0] || '',
    ...CLICK_HELPER_NAMES.map((helperName) => (
      runtime.match(new RegExp(`function\\s+${helperName}\\s*\\([^)]*\\)\\s*\\{[\\s\\S]*?\\n\\s*\\}`))?.[0] || ''
    )),
  ];
  for (const payloadBody of payloadBodies) {
    expect(
      !/\banswers?\b|quiz_answers?|selectedOption|optionText|questionText|resultKey|quiz_result/i.test(payloadBody),
      `${name}: init/click payload must not contain quiz answers`,
    );
  }

  expect(
    !/data-atmospace-messenger|messenger_button_clicked|links\.telegram|links\.max|r\.bothelp\.io|bothelp|telegram/i.test(runtime),
    `${name}: runtime must not contain Telegram/MAX/BotHelp`,
  );
  expect(
    !/registration_click|quiz_question_\d+_answered|registration_success|payment_success|notifications_connected/i.test(runtime),
    `${name}: runtime must not contain obsolete or trusted server-only goals`,
  );
}

for (const [name, source] of [['worker', worker], ['local api', localApi]]) {
  const handler = handlerSource(source);
  const runtime = namedFunctionSource(source, 'function buildAtmospaceRuntimeScript');
  const legacyDetectorSource = namedFunctionSource(source, 'function hasLegacyAtmospaceEmbed');
  const runtimeInjector = namedFunctionSource(source, 'function ensureAtmospaceRuntimeEmbed');
  expect(Boolean(legacyDetectorSource), `${name}: missing legacy Atmospace embed detector`);
  if (legacyDetectorSource) {
    const detectsLegacyEmbed = Function(`return (${legacyDetectorSource})`)();
    expect(
      detectsLegacyEmbed('<a data-atmospace-messenger="telegram">Telegram</a>'),
      `${name}: legacy messenger embed must be detected`,
    );
    expect(
      !detectsLegacyEmbed('<a data-atmospace-registration-link>Регистрация</a>'),
      `${name}: current registration CTA must not be treated as legacy`,
    );
  }
  expect(
    runtimeInjector.includes('hasLegacyAtmospaceEmbed') && runtimeInjector.includes('return runtimeScript'),
    `${name}: legacy upstream embed must be replaced by the clean constructor runtime`,
  );
  expect(
    runtimeInjector.includes('stripAtmospaceRuntimeScripts(source)')
      && !runtimeInjector.includes('hasAtmospaceRuntime(source)) return source'),
    `${name}: upstream runtime must always be replaced by the canonical constructor runtime`,
  );
  expect(source.includes("const ATMOSPACE_API_BASE_URL = 'https://api.atmospace.pro'"), `${name}: missing Atmospace API base`);
  expect(source.includes("const ATMOSPACE_GENERATE_PATH = '/api/landing-runtime/generate'"), `${name}: missing Atmospace generate path`);
  expect(source.includes("const ATMOSPACE_INIT_PATH = '/api/landing-runtime/init'"), `${name}: missing Atmospace init path`);
  expect(source.includes("const ATMOSPACE_CLICK_PATH = '/api/landing-runtime/click'"), `${name}: missing Atmospace click path`);
  expect(source.includes("/api/atmospace/generate"), `${name}: missing current constructor proxy route`);
  expect(source.includes("/api/constructor/atmospace/generate"), `${name}: missing legacy constructor proxy alias`);
  expect(handler.includes("headers: { 'content-type': 'application/json' }"), `${name}: generate request must only set content-type`);
  expect(!/Authorization/i.test(handler), `${name}: generate handler must not send Authorization header`);
  expect(handler.includes('cleanAtmospaceGenerateInput'), `${name}: missing input cleanup`);
  expect(handler.includes('publicAtmospaceGenerateResult'), `${name}: missing public result filter`);
  expect(source.includes('ensureAtmospaceRuntimeEmbed'), `${name}: missing runtime injector`);
  expect(source.includes('validateAtmospaceEmbedCode'), `${name}: missing runtime validator`);
  expect(source.includes('public_landing_key:cfg.publicLandingKey'), `${name}: runtime must send public landing key`);
  expect(source.includes('counter_id:cfg.counterId'), `${name}: runtime must send counter id`);
  expect(source.includes('landing_variant_code:cfg.landingCode'), `${name}: runtime must send landing variant code`);
  expect(source.includes('landing_variant_name:cfg.landingName'), `${name}: runtime must send landing variant name`);
  expect(source.includes('browser_language:navigator.language'), `${name}: runtime must send browser language`);
  expect(source.includes('browser_client_time:new Date().toISOString()'), `${name}: runtime must send browser client time`);
  expect(source.includes('advertising_click_ids:clickIds'), `${name}: runtime must send advertising click ids`);
  for (const clickId of ['yclid', 'gclid', 'fbclid', 'msclkid', 'dclid']) {
    expect(source.includes(`"${clickId}"`), `${name}: runtime must capture ${clickId}`);
  }
  for (const utm of ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term']) {
    expect(source.includes(`${utm}:getParam("${utm}")||null`), `${name}: runtime must capture nullable ${utm}`);
  }
  assertFinalRuntimeContract(name, runtime);
  expect(!runtime.includes('https://web.telegram.org/k/#'), `${name}: Telegram Web placeholder must not leak into HTML`);
  expect(runtime.includes('Сейчас переход временно недоступен. Попробуйте ещё раз чуть позже.'), `${name}: missing exact visible runtime failure message`);
  expect(source.includes('page_instance_id_contract_invalid'), `${name}: validator must enforce page_instance_id contract`);
  expect(source.includes('data-atmospace-quiz-link'), `${name}: validator/runtime bundle must contain the ordinary quiz CTA marker`);
  expect(source.includes('quiz_start_click'), `${name}: validator/runtime bundle must contain the quiz start event`);
  expect(source.includes('question_answered'), `${name}: validator/runtime bundle must contain the safe answer goal`);
  expect(source.includes('registration_started'), `${name}: validator/runtime bundle must contain the registration start goal`);
  expect(source.includes('https://mc.yandex.ru/metrika/tag.js'), `${name}: validator/runtime bundle must contain the official Metrika loader`);
  expect(source.includes('links.registration'), `${name}: validator/runtime bundle must require the registration handoff`);
  expect(source.includes('protected_value_leaked'), `${name}: runtime validator must block protected value leakage`);
  expect(source.includes('protected_field_name_leaked'), `${name}: runtime validator must block protected field name leakage`);
  expect(!source.includes('nullable_messenger_contract_missing'), `${name}: obsolete nullable messenger validation must be removed`);
  expect(!source.includes('both_messenger_links_required'), `${name}: obsolete dual messenger validation must be removed`);
  expect(source.includes('landing_name_missing'), `${name}: validator must require landing name in runtime config`);
  expect(source.includes('landing_code_missing'), `${name}: validator must require landing code in runtime config`);
  expect(handler.includes('payload.landingName'), `${name}: handler must bind landing name into the runtime`);
  expect(handler.includes('payload.landingCode'), `${name}: handler must bind landing code into the runtime`);
  expect(source.includes("'[atmospace.generate] request'"), `${name}: missing safe request diagnostics`);
  expect(source.includes("'[atmospace.generate] upstream_rejected'"), `${name}: missing upstream rejection diagnostics`);
  expect(source.includes('requestId'), `${name}: response must expose a diagnostic request id`);
  expect(source.includes('maskAtmospaceLogValue'), `${name}: public codes must be masked in diagnostics`);
  expect(!source.includes('[data-fh-messenger]'), `${name}: runtime must not include old FH selectors`);
  expect(!source.includes('#fh-tg-btn'), `${name}: runtime must not include old Telegram button ids`);
  expect(!source.includes('#fh-max-btn'), `${name}: runtime must not include old MAX button ids`);
  expect(!source.includes('r.bothelp.io'), `${name}: runtime must not include static BotHelp links`);
}

expect(app.includes('function AtmospaceLandingConstructor'), 'frontend: missing Atmospace landing component');
expect(app.includes("from './utils/atmospaceLandingInput'"), 'frontend: missing Atmospace input validator');
expect(app.includes("landingCode: ''"), 'frontend: landing code must start empty');
expect(!app.includes('landingCode: initialProjectRef.partnerCode'), 'frontend: legacy partner_code must never prefill landing code');
expect(app.includes('prelandingRuntimeValidation.value'), 'frontend: generate request must use normalized validated values');
expect(app.includes('label="Название лендинга"'), 'frontend: missing landing name label');
expect(app.includes('label="Код для рекламного лендинга"'), 'frontend: missing advertising landing code label');
expect(app.includes('label="Номер рекламного счётчика"'), 'frontend: missing advertising counter label');
expect(app.includes('label="Защищённый ключ отправки целей"'), 'frontend: missing protected goal key label');
expect(app.includes('type="password"'), 'frontend: protected key field must be password');
expect(app.includes('autoComplete="new-password"'), 'frontend: protected key must avoid browser autofill');
expect(app.includes("serverOnlyAdGoalCredential: ''"), 'frontend: protected key must be cleared after success');
expect(app.includes('saveAtmospaceLandingArtifact'), 'frontend: missing safe local artifact history');
expect(app.includes('runtimeStatus'), 'frontend: missing runtime status display/storage');
const frontendRuntime = namedFunctionSource(app, 'function buildAtmospacePrelandingTrackingScript');
expect(frontendRuntime.includes('Сейчас переход временно недоступен. Попробуйте ещё раз чуть позже.'), 'frontend: missing exact visible runtime failure message');
expect(!frontendRuntime.includes('https://web.telegram.org/k/#'), 'frontend: Telegram Web placeholder must not leak into generated HTML');
expect(frontendRuntime.includes('landing_variant_code: cfg.landingCode'), 'frontend: init must send landing variant code');
expect(frontendRuntime.includes('landing_variant_name: cfg.landingName'), 'frontend: init must send landing variant name');
assertFinalRuntimeContract('frontend', frontendRuntime);
expect(!/localStorage\.[^(]+\([^)]*serverOnlyAdGoalCredential|serverOnlyAdGoalCredential[\s\S]{0,160}localStorage/.test(app), 'frontend: protected key must not be stored in localStorage');
expect(!/label="client_id|label="clientId|label="ID клиента/i.test(atmospaceComponent), 'frontend: Atmospace flow must not ask for client id');
expect(!atmospaceComponent.includes('реферальный хвост'), 'frontend: outdated referral tail wording must not be shown');
expect(!atmospaceComponent.includes('Токен Яндекс.Метрики'), 'frontend: protected field must not be called Yandex token');
expect(inputValidation.includes('legacy_partner_code'), 'validation: legacy GetCourse and partner codes must be rejected');
expect(inputValidation.includes('landing_code_masked'), 'validation: masked landing codes must be rejected');
expect(inputValidation.includes('credential_masked'), 'validation: masked protected keys must be rejected');

if (failures.length) {
  console.error(failures.map((item) => `- ${item}`).join('\n'));
  process.exit(1);
}

console.log('Atmospace constructor checks passed.');
