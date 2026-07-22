const PUBLISHING_MODE = 'cloudflare_access'
const KV_BINDING_NAME = 'ATMOSPACE_QUIZ_PAGES'
const MAX_REQUEST_BYTES = 1_600_000
const MAX_HTML_BYTES = 1_500_000

const PUBLIC_MESSAGES = Object.freeze({
  disabled: 'Публикация пока не включена. Готовую страницу можно скачать файлом.',
  unauthorized: 'У вас нет доступа к публикации страниц.',
  invalid_request: 'Проверьте адрес страницы и попробуйте ещё раз.',
  invalid_page: 'Не удалось проверить готовую страницу. Подготовьте её заново.',
  address_unavailable: 'Этот адрес уже используется. Выберите другой адрес страницы.',
  storage_unavailable: 'Публикация временно недоступна. Попробуйте немного позже.',
})

function json(payload, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      'cache-control': 'no-store',
      'content-type': 'application/json; charset=utf-8',
      'x-content-type-options': 'nosniff',
    },
  })
}

function normalizeText(value, maxLength) {
  if (typeof value !== 'string') return null
  const normalized = value.trim()
  return normalized ? normalized.slice(0, maxLength) : null
}

function normalizeSlug(value) {
  const slug = normalizeText(value, 80)?.toLowerCase() ?? null
  if (!slug || slug.length < 3 || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
    return null
  }
  if (['api', 'auth', 'assets', 'constructor', 'admin', 'q'].includes(slug)) {
    return null
  }
  return slug
}

function isProtectedConstructorRequest(request) {
  const origin = request.headers.get('origin')
  const referrer = request.headers.get('referer')
  if (!origin || !referrer) return false

  try {
    const requestOrigin = new URL(request.url).origin
    const originUrl = new URL(origin)
    const referrerUrl = new URL(referrer)
    return originUrl.origin === requestOrigin
      && referrerUrl.origin === requestOrigin
      && !referrerUrl.pathname.startsWith('/q/')
  } catch {
    return false
  }
}

function readAccessIdentity(request) {
  const email = normalizeText(
    request.headers.get('cf-access-authenticated-user-email'),
    320,
  )?.toLowerCase() ?? null
  const assertion = normalizeText(
    request.headers.get('cf-access-jwt-assertion'),
    16_384,
  )
  return email && assertion ? email : null
}

function isPublishingEnabled(env) {
  return normalizeText(env?.ATMOSPACE_QUIZ_PUBLISHING_MODE, 64)?.toLowerCase()
    === PUBLISHING_MODE
}

function resolveStore(env) {
  const store = env?.[KV_BINDING_NAME]
  return store
    && typeof store.put === 'function'
    && typeof store.get === 'function'
    ? store
    : null
}

async function readJsonBody(request) {
  const contentLength = Number(request.headers.get('content-length') ?? 0)
  if (Number.isFinite(contentLength) && contentLength > MAX_REQUEST_BYTES) {
    return { ok: false, error: 'invalid_request' }
  }

  const raw = await request.text()
  if (new TextEncoder().encode(raw).byteLength > MAX_REQUEST_BYTES) {
    return { ok: false, error: 'invalid_request' }
  }

  try {
    return { ok: true, body: JSON.parse(raw) }
  } catch {
    return { ok: false, error: 'invalid_request' }
  }
}

function validatePublishedQuizHtml(value) {
  if (typeof value !== 'string') return null
  const html = value.trim()
  const size = new TextEncoder().encode(html).byteLength
  if (!html || size > MAX_HTML_BYTES) return null

  const lower = html.toLowerCase()
  const requiredMarkers = [
    '<!doctype html',
    'class="quiz-form"',
    'atmospace-long-quiz-v1',
    '/api/landing-runtime/init',
    'quiz_completed',
    'registration_click',
  ]
  if (requiredMarkers.some((marker) => !lower.includes(marker.toLowerCase()))) {
    return null
  }

  if (/<script[^>]+src=["'](?:data:|javascript:)/i.test(html)) {
    return null
  }

  return { html, size }
}

async function buildHash(value, byteCount = 12) {
  const digest = await crypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode(value),
  )
  return Array.from(new Uint8Array(digest))
    .slice(0, byteCount)
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('')
}

export function createQuizPublishHandler() {
  return async function handleQuizPublish({ request, env = {} }) {
    if (!isProtectedConstructorRequest(request)) {
      return json({ ok: false, message: PUBLIC_MESSAGES.unauthorized }, 403)
    }

    if (!isPublishingEnabled(env)) {
      return json({ ok: false, message: PUBLIC_MESSAGES.disabled }, 503)
    }

    const accessIdentity = readAccessIdentity(request)
    if (!accessIdentity) {
      return json({ ok: false, message: PUBLIC_MESSAGES.unauthorized }, 403)
    }

    const store = resolveStore(env)
    if (!store) {
      return json({ ok: false, message: PUBLIC_MESSAGES.storage_unavailable }, 503)
    }

    const parsed = await readJsonBody(request)
    if (!parsed.ok) {
      return json({ ok: false, message: PUBLIC_MESSAGES.invalid_request }, 400)
    }

    const slug = normalizeSlug(parsed.body?.slug)
    const title = normalizeText(parsed.body?.title, 180)
    const validated = validatePublishedQuizHtml(parsed.body?.html)
    if (!slug || !title) {
      return json({ ok: false, message: PUBLIC_MESSAGES.invalid_request }, 400)
    }
    if (!validated) {
      return json({ ok: false, message: PUBLIC_MESSAGES.invalid_page }, 400)
    }

    try {
      const ownerHash = await buildHash(accessIdentity)
      const existing = await store.get(`quiz:${slug}`, { type: 'json' })
      if (existing?.ownerHash && existing.ownerHash !== ownerHash) {
        return json({ ok: false, message: PUBLIC_MESSAGES.address_unavailable }, 409)
      }

      const version = await buildHash(validated.html)
      const updatedAt = new Date().toISOString()
      const record = {
        html: validated.html,
        title,
        slug,
        version,
        updatedAt,
        ownerHash,
      }

      await store.put(`quiz:${slug}`, JSON.stringify(record), {
        metadata: {
          title,
          version,
          updatedAt,
          size: validated.size,
          ownerHash,
        },
      })

      const publicUrl = new URL(`/q/${slug}`, request.url).toString()
      return json({
        ok: true,
        data: {
          slug,
          publicUrl,
          version,
          updatedAt,
        },
      })
    } catch {
      return json({ ok: false, message: PUBLIC_MESSAGES.storage_unavailable }, 503)
    }
  }
}

export const onRequestPost = createQuizPublishHandler()
