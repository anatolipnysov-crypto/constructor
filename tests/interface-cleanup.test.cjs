const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const appPath = path.join(__dirname, '..', 'src', 'App.jsx');
const source = fs.readFileSync(appPath, 'utf8');
const mainPath = path.join(__dirname, '..', 'src', 'main.jsx');
const mainSource = fs.readFileSync(mainPath, 'utf8');

const directParams = 'utm_source=yandex&utm_medium=cpc&utm_campaign={campaign_id}&utm_content={ad_id}&utm_term={keyword}&yd_campaign_id={campaign_id}&yd_ad_id={ad_id}&yd_group_id={gbid}&yd_creative_id={creative_id}&yd_source={source}&yd_source_type={source_type}&yd_device={device_type}&yd_region_id={region_id}&yclid={yclid}';

const tabs = [...source.matchAll(/<Tab active=\{tab === '([^']+)'\}[^\r\n]*>([^<]+)<\/Tab>/g)]
  .map((match) => ({ id: match[1], label: match[2].trim() }));

assert.deepEqual(tabs, [
  { id: 'creative', label: 'Креативы' },
  { id: 'pre', label: 'Предлендинг' },
  { id: 'how', label: 'Инструкция' },
]);

assert.ok(source.includes(directParams), 'The exact Yandex Direct URL parameter string must remain available.');
assert.ok(source.includes('label="Скопировать URL-параметры"'), 'The Direct parameters must have a copy button.');

for (const staleText of [
  "tab === 'bonus'",
  'BONUS_PROMPTS',
  'ROADMAP_STEPS',
  'Короткий алгоритм',
  'Скопировать UTM/YD',
  'Как пользоваться библиотекой',
]) {
  assert.equal(source.includes(staleText), false, `Obsolete UI text remains: ${staleText}`);
}

assert.ok(mainSource.includes('installProtectedProjectStorageGuard()'), 'Protected project storage guard must run before React mounts.');
assert.ok(mainSource.includes('ConstructorRecoveryBoundary'), 'A stale browser project must not leave the constructor blank.');
assert.ok(mainSource.includes("key.startsWith('constructorProjectData:')"), 'Per-account stale project caches must be recoverable.');
for (const protectedKey of [
  'constructorAuthorizedClient',
  'constructorRegisteredAccounts',
  'constructorUsage:',
]) {
  assert.equal(mainSource.includes(`'${protectedKey}'`), false, `Recovery must not clear protected access state: ${protectedKey}`);
}

console.log('Constructor UI cleanup checks passed.');
