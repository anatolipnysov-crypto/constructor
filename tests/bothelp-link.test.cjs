const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const appSource = fs.readFileSync(path.join(root, 'src', 'App.jsx'), 'utf8');

const functionStart = appSource.indexOf('function buildAtmospacePrelandingTrackingScript()');
assert.notEqual(functionStart, -1, 'Atmospace inline runtime function must exist.');

const returnMarker = 'return `<script>\n';
const runtimeStart = appSource.indexOf(returnMarker, functionStart);
assert.notEqual(runtimeStart, -1, 'Atmospace runtime template must start with return script.');
const inlineRuntimeStart = runtimeStart + returnMarker.length;
const inlineRuntimeEnd = appSource.indexOf('\n</script>`;', inlineRuntimeStart);
assert.notEqual(inlineRuntimeEnd, -1, 'Atmospace runtime template must have a closing script marker.');

const inlineRuntimeSource = appSource.slice(inlineRuntimeStart, inlineRuntimeEnd);

[
  'window.ATMOSPACE_LANDING_CONFIG',
  'ATMOSPACE_GENERATED_RUNTIME_VERSION',
  'ATMOSPACE_INIT_ENDPOINT',
  'ATMOSPACE_CLICK_ENDPOINT',
  'data-atmospace-messenger',
  'landing_opened',
  'messenger_button_clicked',
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
  'target',
  '_blank',
  'aria-disabled',
  'var pageInstanceId = makePageInstanceId();',
  'Сейчас переход временно недоступен. Попробуйте ещё раз чуть позже.',
  'Local preview'
].forEach((snippet) => {
  assert.ok(inlineRuntimeSource.includes(snippet), `Atmospace runtime must include ${snippet}`);
});

assert.equal(
  (inlineRuntimeSource.match(/var pageInstanceId\s*=\s*makePageInstanceId\(\);/g) || []).length,
  1,
  'Atmospace runtime must create exactly one page_instance_id per page load.'
);

[
  /r\.bothelp\.io/i,
  /window\.FH_CONFIG/i,
  /window\.FUNNEL_CONFIG/i,
  /client_id/i,
  /order_url_990|orderUrl990/i,
  /purchase_url_990|purchaseUrl990/i,
  /smart-endpoint/i,
  /supabase\.co\/functions\/v1/i,
  /landing-attribution/i,
  /data-fh-messenger/i,
  /telegramDomain|telegramStart|maxDomain|maxStart/i,
  /landing_code/i,
  /metrikaToken|yandex_oauth_token|serverOnlyAdGoalCredential/i,
  /sessionStorage/i,
  /https:\/\/web\.telegram\.org\/k\/#/i
].forEach((pattern) => {
  assert.ok(!pattern.test(inlineRuntimeSource), `Atmospace runtime must not match ${pattern}`);
});

[
  'validateAtmospaceTildaHtml',
  'return `<a href="#" data-atmospace-messenger="${safeMessenger}" data-atmospace-state="loading" aria-disabled="true"',
  'id="atmospace-policy-consent"',
  'window.ATMOSPACE_LANDING_CONFIG',
  'data-atmospace-messenger="telegram"',
  'data-atmospace-messenger="max"',
  'publicLandingKey',
  'counterId'
].forEach((snippet) => {
  assert.ok(appSource.includes(snippet), `Constructor source must include ${snippet}`);
});

console.log('Atmospace runtime link test passed');
