const PUBLISH_ENDPOINT = '/api/quiz/publish'
const DEFAULT_TIMEOUT_MS = 20_000

function normalizeRequiredText(value, fieldName, maxLength) {
  if (typeof value !== 'string' || !value.trim()) {
    throw new TypeError(`${fieldName} is required`)
  }
  return value.trim().slice(0, maxLength)
}

function validatePublicUrl(value, currentOrigin) {
  try {
    const url = new URL(value, currentOrigin)
    return url.protocol === 'https:'
      && url.origin === currentOrigin
      && url.pathname.startsWith('/q/')
      ? url.toString()
      : null
  } catch {
    return null
  }
}

export class QuizPublishingError extends Error {
  constructor(message, {
    cause,
    status = null,
    retryable = false,
  } = {}) {
    super(message, { cause })
    this.name = 'QuizPublishingError'
    this.publicMessage = message
    this.status = status
    this.retryable = retryable
  }
}

export async function publishPreparedQuiz({
  slug,
  title,
  html,
  fetchImpl = globalThis.fetch,
  locationOrigin = globalThis.location?.origin ?? 'https://constructor.invalid',
  timeoutMs = DEFAULT_TIMEOUT_MS,
} = {}) {
  if (typeof fetchImpl !== 'function') {
    throw new QuizPublishingError(
      'Публикация временно недоступна. Скачайте готовую страницу файлом.',
    )
  }

  let payload
  try {
    payload = {
      slug: normalizeRequiredText(slug, 'slug', 80),
      title: normalizeRequiredText(title, 'title', 180),
      html: normalizeRequiredText(html, 'html', 1_500_000),
    }
  } catch (error) {
    throw new QuizPublishingError(
      'Проверьте адрес страницы и попробуйте ещё раз.',
      { cause: error },
    )
  }

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), Math.max(1, timeoutMs))

  try {
    const response = await fetchImpl(PUBLISH_ENDPOINT, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
      },
      body: JSON.stringify(payload),
      credentials: 'same-origin',
      signal: controller.signal,
    })
    const responsePayload = await response.json().catch(() => null)

    if (!response.ok || responsePayload?.ok !== true) {
      throw new QuizPublishingError(
        responsePayload?.message
          ?? 'Публикация временно недоступна. Скачайте готовую страницу файлом.',
        {
          status: response.status,
          retryable: response.status >= 500 || response.status === 429,
        },
      )
    }

    const publicUrl = validatePublicUrl(
      responsePayload?.data?.publicUrl,
      locationOrigin,
    )
    if (!publicUrl) {
      throw new QuizPublishingError(
        'Не удалось проверить адрес опубликованной страницы.',
      )
    }

    return Object.freeze({
      slug: responsePayload.data.slug,
      publicUrl,
      version: responsePayload.data.version,
      updatedAt: responsePayload.data.updatedAt,
    })
  } catch (error) {
    if (error instanceof QuizPublishingError) {
      throw error
    }

    throw new QuizPublishingError(
      controller.signal.aborted
        ? 'Публикация заняла слишком много времени. Попробуйте ещё раз.'
        : 'Не удалось опубликовать страницу. Проверьте интернет и повторите.',
      {
        cause: error,
        retryable: true,
      },
    )
  } finally {
    clearTimeout(timeout)
  }
}

export const quizPublishingClientContract = Object.freeze({
  endpoint: PUBLISH_ENDPOINT,
})
