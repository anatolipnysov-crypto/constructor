import assert from 'node:assert/strict';

import {
  getAtmospaceGenerateErrorMessage,
  normalizeAtmospaceLandingInput,
  validateAtmospaceLandingInput
} from '../src/utils/atmospaceLandingInput.js';

const validInput = {
  landingName: '  Тестовый лендинг  ',
  landingCode: '  pa06134d730e  ',
  counterId: ' 109647361 ',
  serverOnlyAdGoalCredential: '  protected-test-value  '
};

assert.deepEqual(normalizeAtmospaceLandingInput(validInput), {
  landingName: 'Тестовый лендинг',
  landingCode: 'pa06134d730e',
  counterId: '109647361',
  serverOnlyAdGoalCredential: 'protected-test-value'
});
assert.equal(validateAtmospaceLandingInput(validInput).errors.length, 0);

for (const landingCode of [
  'https://atmospace.pro/cabinet',
  'gcpc=02953',
  'partner_code=anton_101',
  'pa06134...730e',
  'pa06 134d730e'
]) {
  const result = validateAtmospaceLandingInput({ ...validInput, landingCode });
  assert.ok(result.errors.some((error) => error.field === 'landingCode'), `must reject ${landingCode}`);
}

assert.ok(
  validateAtmospaceLandingInput({ ...validInput, counterId: '109-647' }).errors
    .some((error) => error.code === 'counter_id_invalid')
);
assert.ok(
  validateAtmospaceLandingInput({ ...validInput, serverOnlyAdGoalCredential: 'AQAAAA...' }).errors
    .some((error) => error.code === 'credential_masked')
);

assert.match(getAtmospaceGenerateErrorMessage('landing_code_invalid', 404), /не нашёл этот код/i);
assert.match(getAtmospaceGenerateErrorMessage('landing_code_expired', 410), /срок действия/i);
assert.match(getAtmospaceGenerateErrorMessage('landing_code_disabled', 403), /отключён/i);
assert.match(getAtmospaceGenerateErrorMessage('credential_invalid', 401), /ключ не принят/i);
assert.match(getAtmospaceGenerateErrorMessage('credential_storage_not_configured', 500), /серверная ошибка/i);

console.log('Atmospace landing input checks passed.');
