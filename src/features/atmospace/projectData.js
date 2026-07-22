const SAFE_TEXT_FIELDS = Object.freeze({
  landingName: 512,
  landingCode: 512,
  counterId: 128,
  publicLandingKey: 1024,
  landingVariantCode: 256,
  landingVariantName: 512,
})

const PROTECTED_FIELD_NAMES = Object.freeze([
  'adGoalCredential',
  'serverOnlyAdGoalCredential',
  'server_only_ad_goal_credential',
  'metrikaToken',
  'captchaSecret',
  'captchaToken',
  'apiToken',
  'accessToken',
  'password',
])

function normalizeOptionalText(value, maxLength) {
  if (typeof value !== 'string') {
    return null
  }

  const normalized = value.trim()
  if (!normalized) {
    return null
  }

  return normalized.slice(0, maxLength)
}

export function sanitizeAtmospaceProjectData(value = {}) {
  const result = {}

  for (const [fieldName, maxLength] of Object.entries(SAFE_TEXT_FIELDS)) {
    const normalized = normalizeOptionalText(value?.[fieldName], maxLength)
    if (normalized) {
      result[fieldName] = normalized
    }
  }

  return Object.freeze(result)
}

export function serializeAtmospaceProjectData(value = {}) {
  return JSON.stringify(sanitizeAtmospaceProjectData(value))
}

export function deserializeAtmospaceProjectData(serializedValue) {
  if (typeof serializedValue !== 'string' || !serializedValue.trim()) {
    return Object.freeze({})
  }

  try {
    return sanitizeAtmospaceProjectData(JSON.parse(serializedValue))
  } catch {
    return Object.freeze({})
  }
}

export function buildAtmospaceGenerationInput(projectData, adGoalCredential) {
  const safeProjectData = sanitizeAtmospaceProjectData(projectData)
  const normalizedCredential = normalizeOptionalText(adGoalCredential, 4096)

  if (
    !safeProjectData.landingName
    || !safeProjectData.landingCode
    || !safeProjectData.counterId
    || !normalizedCredential
  ) {
    throw new TypeError('generation fields are incomplete')
  }

  return Object.freeze({
    landingName: safeProjectData.landingName,
    landingCode: safeProjectData.landingCode,
    counterId: safeProjectData.counterId,
    adGoalCredential: normalizedCredential,
  })
}

export const atmospaceProjectDataContract = Object.freeze({
  protectedFieldNames: PROTECTED_FIELD_NAMES,
  safeFieldNames: Object.freeze(Object.keys(SAFE_TEXT_FIELDS)),
})
