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

function expect(condition, message) {
  if (!condition) failures.push(message);
}

function handlerSource(source) {
  const start = source.indexOf('async function handleAtmospaceLandingGenerate');
  if (start === -1) return '';
  const next = source.indexOf('\nasync function ', start + 1);
  return source.slice(start, next === -1 ? start + 5000 : next);
}

function namedFunctionSource(source, signature) {
  const start = source.indexOf(signature);
  if (start === -1) return '';
  const next = source.indexOf('\nfunction ', start + signature.length);
  return source.slice(start, next === -1 ? source.length : next);
}

for (const [name, source] of [['worker', worker], ['local api', localApi]]) {
  const handler = handlerSource(source);
  const runtime = namedFunctionSource(source, 'function buildAtmospaceRuntimeScript');
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
  expect(runtime.includes('sendEvent("landing_opened",null)'), `${name}: runtime must track landing_opened with null messenger`);
  expect(runtime.includes('sendEvent("messenger_button_clicked",messenger)'), `${name}: runtime must track messenger clicks`);
  expect(/messenger\s*:\s*messenger\s*\|\|\s*null/.test(runtime), `${name}: click payload must keep messenger nullable`);
  expect(/!links\.telegram\s*\|\|\s*!links\.max/.test(runtime), `${name}: runtime must require both messenger links`);
  expect(!runtime.includes('readyLinks[messenger]||readyLinks.telegram'), `${name}: runtime must not substitute Telegram for another messenger`);
  expect(!runtime.includes('readyLinks[messenger]||readyLinks.max'), `${name}: runtime must not substitute MAX for another messenger`);
  expect(runtime.includes('atmospace-policy-consent'), `${name}: runtime must enforce policy consent`);
  expect(runtime.includes('var pageInstanceId = makePageInstanceId();'), `${name}: runtime must create page_instance_id once per load`);
  expect((runtime.match(/var pageInstanceId\s*=\s*makePageInstanceId\(\);/g) || []).length === 1, `${name}: runtime must contain one page_instance_id declaration`);
  expect(!runtime.includes('sessionStorage'), `${name}: page_instance_id must not persist in sessionStorage`);
  expect(!runtime.includes('https://web.telegram.org/k/#'), `${name}: Telegram Web placeholder must not leak into HTML`);
  expect(runtime.includes('Сейчас переход временно недоступен. Попробуйте ещё раз чуть позже.'), `${name}: missing exact visible runtime failure message`);
  expect(source.includes('page_instance_id_contract_invalid'), `${name}: validator must enforce page_instance_id contract`);
  expect(source.includes('telegram_web_link_forbidden'), `${name}: validator must reject Telegram Web placeholder`);
  expect(source.includes('protected_value_leaked'), `${name}: runtime validator must block protected value leakage`);
  expect(source.includes('protected_field_name_leaked'), `${name}: runtime validator must block protected field name leakage`);
  expect(source.includes('nullable_messenger_contract_missing'), `${name}: validator must enforce nullable messenger semantics`);
  expect(source.includes('both_messenger_links_required'), `${name}: validator must require both messenger links`);
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
expect(app.includes('id="atmospace-policy-consent"'), 'frontend: generated HTML must use the standard policy checkbox id');
expect(frontendRuntime.includes('Сейчас переход временно недоступен. Попробуйте ещё раз чуть позже.'), 'frontend: missing exact visible runtime failure message');
expect(!frontendRuntime.includes('https://web.telegram.org/k/#'), 'frontend: Telegram Web placeholder must not leak into generated HTML');
expect(frontendRuntime.includes('landing_variant_code: cfg.landingCode'), 'frontend: init must send landing variant code');
expect(frontendRuntime.includes('landing_variant_name: cfg.landingName'), 'frontend: init must send landing variant name');
expect(frontendRuntime.includes("sendEvent('landing_opened', null)"), 'frontend: runtime must track landing_opened with null messenger');
expect(frontendRuntime.includes("sendEvent('messenger_button_clicked', messenger)"), 'frontend: runtime must track messenger clicks');
expect(frontendRuntime.includes('!links.telegram || !links.max'), 'frontend: runtime must require both messenger links');
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
