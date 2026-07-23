import assert from 'node:assert/strict'
import fs from 'node:fs'

import {
  createProtectedStorageSetItem,
  installProtectedProjectStorageGuard,
  PROTECTED_PROJECT_STORAGE_KEY,
  sanitizeProjectStorageValue,
  sanitizeSerializedProjectStorage,
  scrubLegacyProjectStorage,
} from '../src/security/protectedProjectStorage.js'

const protectedProject = {
  projectName: 'Безопасный проект',
  metrikaId: '12345678',
  metrikaToken: 'must-not-persist',
  nested: {
    adGoalCredential: 'must-not-persist',
    password: 'must-not-persist',
    captchaToken: 'must-not-persist',
    safeValue: 'keep-me',
  },
  rows: [
    { title: 'Строка', apiKey: 'must-not-persist' },
    { title: 'Без секрета' },
  ],
}

assert.deepEqual(sanitizeProjectStorageValue(protectedProject), {
  projectName: 'Безопасный проект',
  metrikaId: '12345678',
  nested: {
    safeValue: 'keep-me',
  },
  rows: [
    { title: 'Строка' },
    { title: 'Без секрета' },
  ],
})

const serialized = sanitizeSerializedProjectStorage(JSON.stringify(protectedProject))
assert.equal(serialized.includes('must-not-persist'), false)
assert.equal(serialized.includes('Безопасный проект'), true)
assert.equal(sanitizeSerializedProjectStorage('not-json'), 'not-json')

const values = new Map([
  [PROTECTED_PROJECT_STORAGE_KEY, JSON.stringify(protectedProject)],
])
const storage = {
  getItem(key) {
    return values.has(key) ? values.get(key) : null
  },
  setItem(key, value) {
    values.set(key, String(value))
  },
}

assert.equal(scrubLegacyProjectStorage(storage), true)
assert.equal(values.get(PROTECTED_PROJECT_STORAGE_KEY).includes('must-not-persist'), false)
assert.equal(scrubLegacyProjectStorage(storage), false)

const writes = []
function originalSetItem(key, value) {
  writes.push({ receiver: this, key, value })
}
const protectedSetItem = createProtectedStorageSetItem(originalSetItem, storage)
protectedSetItem.call(
  storage,
  PROTECTED_PROJECT_STORAGE_KEY,
  JSON.stringify(protectedProject),
)
assert.equal(writes[0].value.includes('must-not-persist'), false)
assert.equal(writes[0].value.includes('Безопасный проект'), true)

const sessionStorage = {}
protectedSetItem.call(
  sessionStorage,
  PROTECTED_PROJECT_STORAGE_KEY,
  JSON.stringify(protectedProject),
)
assert.equal(writes[1].value.includes('must-not-persist'), true)

protectedSetItem.call(storage, 'unrelated-key', JSON.stringify(protectedProject))
assert.equal(writes[2].value.includes('must-not-persist'), true)

class FakeStorage {
  constructor(initialEntries = []) {
    this.values = new Map(initialEntries)
  }

  getItem(key) {
    return this.values.has(key) ? this.values.get(key) : null
  }

  setItem(key, value) {
    this.values.set(key, String(value))
  }
}

const browserLocalStorage = new FakeStorage([
  [PROTECTED_PROJECT_STORAGE_KEY, JSON.stringify(protectedProject)],
])
const fakeWindow = {
  Storage: FakeStorage,
  localStorage: browserLocalStorage,
}

assert.equal(installProtectedProjectStorageGuard({ windowObject: fakeWindow }), true)
assert.equal(
  browserLocalStorage.getItem(PROTECTED_PROJECT_STORAGE_KEY).includes('must-not-persist'),
  false,
)
assert.equal(installProtectedProjectStorageGuard({ windowObject: fakeWindow }), false)

browserLocalStorage.setItem(
  PROTECTED_PROJECT_STORAGE_KEY,
  JSON.stringify(protectedProject),
)
assert.equal(
  browserLocalStorage.getItem(PROTECTED_PROJECT_STORAGE_KEY).includes('must-not-persist'),
  false,
)
browserLocalStorage.setItem('ordinary-project-cache', JSON.stringify(protectedProject))
assert.equal(
  browserLocalStorage.getItem('ordinary-project-cache').includes('must-not-persist'),
  true,
)

const routerSource = fs.readFileSync(
  new URL('../src/ConstructorRouter.jsx', import.meta.url),
  'utf8',
)
assert.match(routerSource, /installProtectedProjectStorageGuard\(\)/)
assert.match(routerSource, /security\/protectedProjectStorage\.js/)

console.log('protected project storage self-check passed')
