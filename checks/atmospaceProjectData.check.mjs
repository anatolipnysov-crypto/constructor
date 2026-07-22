import assert from 'node:assert/strict'

import {
  buildAtmospaceGenerationInput,
  deserializeAtmospaceProjectData,
  serializeAtmospaceProjectData,
} from '../src/features/atmospace/projectData.js'

const serialized = serializeAtmospaceProjectData({
  landingName: 'Quiz A',
  landingCode: '011',
  counterId: '12345',
  publicLandingKey: 'public-key',
  metrikaToken: 'must-not-be-saved',
  captchaSecret: 'must-not-be-saved',
  password: 'must-not-be-saved',
})

assert.equal(serialized.includes('must-not-be-saved'), false)
assert.deepEqual(deserializeAtmospaceProjectData(serialized), {
  landingName: 'Quiz A',
  landingCode: '011',
  counterId: '12345',
  publicLandingKey: 'public-key',
})

const generationInput = buildAtmospaceGenerationInput(
  JSON.parse(serialized),
  'write-only-value',
)

assert.equal(generationInput.adGoalCredential, 'write-only-value')
assert.equal(serialized.includes(generationInput.adGoalCredential), false)
console.log('atmospaceProjectData.check.mjs passed')
