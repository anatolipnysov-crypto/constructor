const KV_BINDING_NAME = 'ATMOSPACE_QUIZ_PAGES'

function normalizeSlug(value) {
  const slug = typeof value === 'string' ? value.trim().toLowerCase() : ''
  return slug.length >= 3
    && slug.length <= 80
    && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)
    ? slug
    : null
}

function pageHeaders(version) {
  return {
    'cache-control': 'public, max-age=60, s-maxage=300, stale-while-revalidate=600',
    'content-security-policy': [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' https://mc.yandex.ru",
      "connect-src 'self' https://api.atmospace.pro https://mc.yandex.ru https://*.mc.yandex.ru",
      "img-src 'self' data: https://mc.yandex.ru https://*.mc.yandex.ru",
      "style-src 'self' 'unsafe-inline'",
      "font-src 'self' data:",
      "frame-ancestors 'none'",
      "base-uri 'none'",
      "form-action 'self' https://atmospace.pro https://*.atmospace.pro",
    ].join('; '),
    'content-type': 'text/html; charset=utf-8',
    'etag': `"${version}"`,
    'permissions-policy': 'camera=(), microphone=(), geolocation=(), payment=()',
    'referrer-policy': 'strict-origin-when-cross-origin',
    'x-content-type-options': 'nosniff',
    'x-frame-options': 'DENY',
  }
}

function notFound() {
  return new Response(
    '<!doctype html><html lang="ru"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Страница не найдена</title><body style="font-family:system-ui;padding:40px;max-width:680px;margin:auto"><h1>Страница не найдена</h1><p>Проверьте адрес или откройте актуальную ссылку.</p></body></html>',
    {
      status: 404,
      headers: {
        'cache-control': 'no-store',
        'content-type': 'text/html; charset=utf-8',
        'x-content-type-options': 'nosniff',
      },
    },
  )
}

export function createPublishedQuizHandler() {
  return async function handlePublishedQuiz({ request, env = {}, params = {} }) {
    const slug = normalizeSlug(params.slug)
    const store = env?.[KV_BINDING_NAME]
    if (!slug || !store || typeof store.get !== 'function') {
      return notFound()
    }

    try {
      const record = await store.get(`quiz:${slug}`, { type: 'json' })
      if (!record?.html || !record?.version) {
        return notFound()
      }

      const etag = `"${record.version}"`
      if (request.headers.get('if-none-match') === etag) {
        return new Response(null, {
          status: 304,
          headers: pageHeaders(record.version),
        })
      }

      return new Response(record.html, {
        status: 200,
        headers: pageHeaders(record.version),
      })
    } catch {
      return notFound()
    }
  }
}

export const onRequestGet = createPublishedQuizHandler()
