const GENERATION_ENDPOINT = '/api/atmospace/generate'
const DEFAULT_TIMEOUT_MS = 15_000

function normalizeRequiredText(value, fieldName, maxLength) {
  if (typeof value !== 'string' || !value.trim()) {
    throw new TypeError(`${fieldName} is required`)
  }

  return value.trim().slice(0, maxLength)
}

export class AtmospaceGenerationError extends Error {
  constructor(message, {
    cause,
    retryable = false,
    status = null,
  } = {}) {
    super(message, { cause })
    this.name = 'AtmospaceGenerationError'
    this.publicMessage = message
    this.retryable = retryable
    this.status = status
  }
}

export async function generateAtmospaceLanding({
  landingName,
  landingCode,
  counterId,
  adGoalCredential,
  fetchImpl = globalThis.fetch,
  timeoutMs = DEFAULT_TIMEOUT_MS,
  signal = null,
} = {}) {
  if (typeof fetchImpl !== 'function') {
    throw new AtmospaceGenerationError(
      'Создание страницы временно недоступно. Попробуйте ещё раз.',
    )
  }

  let payload
  try {
    payload = {
      landingName: normalizeRequiredText(landingName, 'landingName', 512),
      landingCode: normalizeRequiredText(landingCode, 'landingCode', 512),
      counterId: normalizeRequiredText(counterId, 'counterId', 128),
      adGoalCredential: normalizeRequiredText(
        adGoalCredential,
        'adGoalCredential',
        4096,
      ),
    }
  } catch (error) {
    throw new AtmospaceGenerationError(
      'Проверьте заполненные данные и попробуйте ещё раз.',
      { cause: error },
    )
  }

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), Math.max(1, timeoutMs))
  const abortFromParent = () => controller.abort()
  signal?.addEventListener?.('abort', abortFromParent, { once: true })

  try {
    const response = await fetchImpl(GENERATION_ENDPOINT, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    })
    const responsePayload = await response.json().catch(() => null)

    if (!response.ok || responsePayload?.ok !== true) {
      throw new AtmospaceGenerationError(
        responsePayload?.message
          ?? 'Создание страницы временно недоступно. Попробуйте ещё раз.',
        {
          retryable: response.status >= 500 || response.status === 429,
          status: response.status,
        },
      )
    }

    return Object.freeze({
      publicLandingKey: responsePayload.data.publicLandingKey,
      embedCode: responsePayload.data.embedCode,
      landingName: responsePayload.data.landingName,
    })
  } catch (error) {
    if (error instanceof AtmospaceGenerationError) {
      throw error
    }

    throw new AtmospaceGenerationError(
      controller.signal.aborted
        ? 'Создание страницы заняло слишком много времени. Попробуйте ещё раз.'
        : 'Не удалось создать страницу. Проверьте интернет и повторите.',
      {
        cause: error,
        retryable: true,
      },
    )
  } finally {
    clearTimeout(timeout)
    signal?.removeEventListener?.('abort', abortFromParent)
  }
}

export const atmospaceGenerationClientContract = Object.freeze({
  endpoint: GENERATION_ENDPOINT,
})
