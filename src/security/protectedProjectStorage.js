const LEGACY_PROJECT_STORAGE_KEY = 'constructorProjectData'

const PROTECTED_KEY_PATTERN = /(?:token|password|secret|credential|captcha|api[_-]?key|authorization)/i
const EXPLICIT_PROTECTED_KEYS = new Set([
  'metrikaToken',
  'adGoalCredential',
  'serverOnlyAdGoalCredential',
])

function isPlainObject(value) {
  return Boolean(value)
    && typeof value === 'object'
    && !Array.isArray(value)
}

function isProtectedKey(key) {
  return EXPLICIT_PROTECTED_KEYS.has(key)
    || PROTECTED_KEY_PATTERN.test(key)
}

export function sanitizeProjectStorageValue(value) {
  if (Array.isArray(value)) {
    return value.map(sanitizeProjectStorageValue)
  }

  if (!isPlainObject(value)) {
    return value
  }

  return Object.fromEntries(
    Object.entries(value)
      .filter(([key]) => !isProtectedKey(key))
      .map(([key, nestedValue]) => [key, sanitizeProjectStorageValue(nestedValue)]),
  )
}

export function sanitizeSerializedProjectStorage(value) {
  if (typeof value !== 'string') return value

  try {
    return JSON.stringify(sanitizeProjectStorageValue(JSON.parse(value)))
  } catch {
    return value
  }
}

export function scrubLegacyProjectStorage(storage) {
  if (!storage || typeof storage.getItem !== 'function' || typeof storage.setItem !== 'function') {
    return false
  }

  const current = storage.getItem(LEGACY_PROJECT_STORAGE_KEY)
  if (typeof current !== 'string') return false

  const sanitized = sanitizeSerializedProjectStorage(current)
  if (sanitized === current) return false

  storage.setItem(LEGACY_PROJECT_STORAGE_KEY, sanitized)
  return true
}

export function createProtectedStorageSetItem(originalSetItem, localStorageReference) {
  if (typeof originalSetItem !== 'function') {
    throw new TypeError('Storage setItem is required')
  }

  return function protectedSetItem(key, value) {
    const nextValue = this === localStorageReference && key === LEGACY_PROJECT_STORAGE_KEY
      ? sanitizeSerializedProjectStorage(value)
      : value

    return originalSetItem.call(this, key, nextValue)
  }
}

export function installProtectedProjectStorageGuard({
  windowObject = globalThis.window,
} = {}) {
  if (!windowObject?.localStorage || !windowObject?.Storage?.prototype) {
    return false
  }

  const storagePrototype = windowObject.Storage.prototype
  const guardFlag = Symbol.for('atmospace.protectedProjectStorageGuard')
  if (storagePrototype[guardFlag]) {
    scrubLegacyProjectStorage(windowObject.localStorage)
    return false
  }

  const originalSetItem = storagePrototype.setItem
  storagePrototype.setItem = createProtectedStorageSetItem(
    originalSetItem,
    windowObject.localStorage,
  )
  Object.defineProperty(storagePrototype, guardFlag, {
    value: true,
    configurable: false,
    enumerable: false,
    writable: false,
  })

  scrubLegacyProjectStorage(windowObject.localStorage)
  return true
}

export const PROTECTED_PROJECT_STORAGE_KEY = LEGACY_PROJECT_STORAGE_KEY
