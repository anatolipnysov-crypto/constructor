import {
  buildLandingRuntimeInitPayload,
  collectAdvertisingContext,
} from './advertisingContext.js'

const DEFAULT_API_BASE_URL = 'https://api.atmospace.pro'
const LANDING_RUNTIME_INIT_PATH = '/api/landing-runtime/init'
const DEFAULT_TIMEOUT_MS = 10_000

const PUBLIC_MESSAGES = Object.freeze({
  configuration: 'Регистрация для этой страницы пока не настроена.',
  invalid_response: 'Регистрация временно недоступна. Попробуйте ещё раз.',
  network: 'Не удалось подготовить регистрацию. Проверьте интернет и повторите.',
  timeout: 'Подготовка регистрации заняла слишком много времени. Попробуйте ещё раз.',
  unavailable: 'Регистрация временно недоступна. Попробуйте ещё раз.',
})

function normalizeApiBaseUrl(value) {
  const rawValue = typeof value === 'string' && value.trim()
    ? value.trim()
    : DEFAULT_API_BASE_URL
  const url = new URL(rawValue)

  const isLocalHttp = url.protocol === 'http:'
    && (url.hostname === 'localhost' || url.hostname === '127.0.0.1')

  if (url.protocol !== 'https:' && !isLocalHttp) {
    throw new TypeError('Atmospace API base URL must use HTTPS')
  }

  url.pathname = url.pathname.replace(/\/+$/, '')
  url.search = ''
  url.hash = ''

  return url.toString().replace(/\/$/, '')
}

function isTrustedRegistrationUrl(value) {
  if (typeof value !== 'string' || !value.trim()) {
    return false
  }

  try {
    const url = new URL(value)
    const isAtmospaceHost = url.hostname === 'atmospace.pro'
      || url.hostname.endsWith('.atmospace.pro')

    return url.protocol === 'https:' && isAtmospaceHost
  } catch {
    return false
  }
}

async function readResponsePayload(response) {
  try {
    return await response.json()
  } catch {
    return null
  }
}

export class AtmospaceRuntimeError extends Error {
  constructor(code, {
    cause,
    retryable = false,
    status = null,
  } = {}) {
    super(PUBLIC_MESSAGES[code] ?? PUBLIC_MESSAGES.unavailable, { cause })
    this.name = 'AtmospaceRuntimeError'
    this.code = code
    this.publicMessage = this.message
    this.retryable = retryable
    this.status = status
  }
}

export async function initializeAtmospaceLanding({
  apiBaseUrl = DEFAULT_API_BASE_URL,
  publicLandingKey,
  pageInstanceId,
  landingVariantCode = null,
  landingVariantName = null,
  counterId = null,
  runtimeVersion,
  context = collectAdvertisingContext(),
  fetchImpl = globalThis.fetch,
  timeoutMs = DEFAULT_TIMEOUT_MS,
  signal = null,
} = {}) {
  if (typeof fetchImpl !== 'function') {
    throw new AtmospaceRuntimeError('configuration')
  }

  let payload
  let endpoint

  try {
    payload = buildLandingRuntimeInitPayload({
      publicLandingKey,
      pageInstanceId,
      landingVariantCode,
      landingVariantName,
      counterId,
      runtimeVersion,
      context,
    })
    endpoint = `${normalizeApiBaseUrl(apiBaseUrl)}${LANDING_RUNTIME_INIT_PATH}`
  } catch (error) {
    throw new AtmospaceRuntimeError('configuration', { cause: error })
  }

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), Math.max(1, timeoutMs))

  const abortFromParent = () => controller.abort()
  signal?.addEventListener?.('abort', abortFromParent, { once: true })

  try {
    const response = await fetchImpl(endpoint, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    })
    const responsePayload = await readResponsePayload(response)

    if (!response.ok || responsePayload?.ok !== true) {
      throw new AtmospaceRuntimeError('unavailable', {
        retryable: response.status >= 500 || response.status === 429,
        status: response.status,
      })
    }

    const registrationUrl = responsePayload?.data?.links?.registration
    if (!isTrustedRegistrationUrl(registrationUrl)) {
      throw new AtmospaceRuntimeError('invalid_response', {
        status: response.status,
      })
    }

    return Object.freeze({
      status: 'ready',
      registrationUrl,
      counterId: responsePayload?.data?.counterId ?? null,
    })
  } catch (error) {
    if (error instanceof AtmospaceRuntimeError) {
      throw error
    }

    if (controller.signal.aborted) {
      throw new AtmospaceRuntimeError('timeout', {
        cause: error,
        retryable: true,
      })
    }

    throw new AtmospaceRuntimeError('network', {
      cause: error,
      retryable: true,
    })
  } finally {
    clearTimeout(timeout)
    signal?.removeEventListener?.('abort', abortFromParent)
  }
}

export const atmospaceRuntimeClientContract = Object.freeze({
  apiBaseUrl: DEFAULT_API_BASE_URL,
  initPath: LANDING_RUNTIME_INIT_PATH,
})
