const UTM_FIELDS = Object.freeze({
  utm_source: 'source',
  utm_medium: 'medium',
  utm_campaign: 'campaign',
  utm_content: 'content',
  utm_term: 'term',
})

const CLICK_ID_FIELDS = Object.freeze([
  'gclid',
  'yclid',
  'fbclid',
  'msclkid',
  'dclid',
])

const MAX_CONTEXT_VALUE_LENGTH = 512
const MAX_PUBLIC_KEY_LENGTH = 512
const DEFAULT_RUNTIME_VERSION = 'constructor-quiz-registration-v1'

function normalizeText(value, maxLength = MAX_CONTEXT_VALUE_LENGTH) {
  if (typeof value !== 'string') {
    return null
  }

  const normalized = value.trim()
  if (!normalized) {
    return null
  }

  return normalized.slice(0, maxLength)
}

function normalizeRequiredText(value, fieldName, maxLength = MAX_CONTEXT_VALUE_LENGTH) {
  const normalized = normalizeText(value, maxLength)
  if (!normalized) {
    throw new TypeError(`${fieldName} is required`)
  }

  return normalized
}

function readPageUrl(pageUrl) {
  const normalized = normalizeText(pageUrl, 4096)
  if (!normalized) {
    return null
  }

  try {
    return new URL(normalized)
  } catch {
    return null
  }
}

function createFallbackPageInstanceId() {
  const randomPart = Math.random().toString(36).slice(2)
  const timePart = Date.now().toString(36)
  return `page_${timePart}_${randomPart}`.slice(0, 128)
}

export function createPageInstanceId(cryptoLike = globalThis.crypto) {
  if (typeof cryptoLike?.randomUUID === 'function') {
    return cryptoLike.randomUUID()
  }

  return createFallbackPageInstanceId()
}

export function collectAdvertisingContext({
  pageUrl = globalThis.location?.href ?? null,
  referrer = globalThis.document?.referrer ?? null,
  browserLanguage = globalThis.navigator?.language ?? null,
  browserClientTime = new Date().toISOString(),
} = {}) {
  const parsedUrl = readPageUrl(pageUrl)
  const utm = {}
  const advertisingClickIds = {}

  if (parsedUrl) {
    for (const [queryName, resultName] of Object.entries(UTM_FIELDS)) {
      const value = normalizeText(parsedUrl.searchParams.get(queryName))
      if (value) {
        utm[resultName] = value
      }
    }

    for (const fieldName of CLICK_ID_FIELDS) {
      const value = normalizeText(parsedUrl.searchParams.get(fieldName))
      if (value) {
        advertisingClickIds[fieldName] = value
      }
    }
  }

  return Object.freeze({
    pageUrl: parsedUrl?.toString() ?? normalizeText(pageUrl, 4096),
    referrer: normalizeText(referrer, 4096),
    browserLanguage: normalizeText(browserLanguage, 128),
    browserClientTime: normalizeText(browserClientTime, 128),
    utm: Object.freeze(utm),
    advertisingClickIds: Object.freeze(advertisingClickIds),
  })
}

export function buildLandingRuntimeInitPayload({
  publicLandingKey,
  pageInstanceId = createPageInstanceId(),
  landingVariantCode = null,
  landingVariantName = null,
  counterId = null,
  runtimeVersion = DEFAULT_RUNTIME_VERSION,
  context = collectAdvertisingContext(),
} = {}) {
  const normalizedPublicLandingKey = normalizeRequiredText(
    publicLandingKey,
    'publicLandingKey',
    MAX_PUBLIC_KEY_LENGTH,
  )
  const normalizedPageInstanceId = normalizeRequiredText(
    pageInstanceId,
    'pageInstanceId',
    128,
  )

  const payload = {
    public_landing_key: normalizedPublicLandingKey,
    page_instance_id: normalizedPageInstanceId,
    page_url: normalizeText(context?.pageUrl, 4096),
    landing_variant_code: normalizeText(landingVariantCode, 256),
    landing_variant_name: normalizeText(landingVariantName, 512),
    referrer: normalizeText(context?.referrer, 4096),
    runtime_version: normalizeText(runtimeVersion, 128),
    browser_language: normalizeText(context?.browserLanguage, 128),
    browser_client_time: normalizeText(context?.browserClientTime, 128),
    counter_id: normalizeText(counterId, 128),
    utm_source: normalizeText(context?.utm?.source),
    utm_medium: normalizeText(context?.utm?.medium),
    utm_campaign: normalizeText(context?.utm?.campaign),
    utm_content: normalizeText(context?.utm?.content),
    utm_term: normalizeText(context?.utm?.term),
    advertising_click_ids: {},
  }

  for (const fieldName of CLICK_ID_FIELDS) {
    const value = normalizeText(context?.advertisingClickIds?.[fieldName])
    if (value) {
      payload.advertising_click_ids[fieldName] = value
    }
  }

  if (Object.keys(payload.advertising_click_ids).length === 0) {
    payload.advertising_click_ids = null
  }

  return payload
}

export const advertisingContextContract = Object.freeze({
  clickIdFields: CLICK_ID_FIELDS,
  runtimeVersion: DEFAULT_RUNTIME_VERSION,
  utmFields: Object.freeze(Object.keys(UTM_FIELDS)),
})
