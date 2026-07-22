import { buildPublishedLongQuizHtml } from './publishedQuiz.js'

const EMBED_ROOT_CLASS = 'atmospace-quiz-embed'
const EMBED_ROOT_SELECTOR = `.${EMBED_ROOT_CLASS}`

function normalizeText(value, maxLength) {
  if (typeof value !== 'string') return null
  const normalized = value.trim()
  return normalized ? normalized.slice(0, maxLength) : null
}

function normalizeEmbedId(value) {
  return (normalizeText(value, 96) ?? 'atmospace-long-quiz')
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'atmospace-long-quiz'
}

function extractTagContents(html, tagName) {
  const match = String(html ?? '').match(
    new RegExp(`<${tagName}[^>]*>([\\s\\S]*?)<\\/${tagName}>`, 'i'),
  )
  return match?.[1]?.trim() ?? null
}

function assertPortableAssets(html) {
  const transientAsset = [...String(html ?? '').matchAll(
    /\b(?:src|href)=["']([^"']+)["']/gi,
  )].find((match) => /^(?:blob:|file:)/i.test(match[1]))

  if (transientAsset) {
    throw new TypeError(
      'Замените временную картинку прямой HTTPS-ссылкой и подготовьте код заново.',
    )
  }
}

function scopeStandaloneStyles(css) {
  return String(css ?? '')
    .replace(
      /:root\s*\{([^}]*)\}/g,
      `${EMBED_ROOT_SELECTOR} {$1}`,
    )
    .replace(
      /(^|})\s*\*\s*\{([^}]*)\}/g,
      `$1\n${EMBED_ROOT_SELECTOR}, ${EMBED_ROOT_SELECTOR} * {$2}`,
    )
    .replace(/(^|})\s*html\s*\{[^}]*\}/g, '$1')
    .replace(
      /(^|})\s*body\s*\{([^}]*)\}/g,
      `$1\n${EMBED_ROOT_SELECTOR} {$2}`,
    )
    .replace(
      /(^|})\s*button,input\s*\{([^}]*)\}/g,
      `$1\n${EMBED_ROOT_SELECTOR} button, ${EMBED_ROOT_SELECTOR} input {$2}`,
    )
    .trim()
}

export function buildTildaEmbedFromStandaloneHtml(standaloneHtml, {
  embedId = 'atmospace-long-quiz',
} = {}) {
  assertPortableAssets(standaloneHtml)

  const styles = extractTagContents(standaloneHtml, 'style')
  const body = extractTagContents(standaloneHtml, 'body')
  if (!styles || !body) {
    throw new TypeError('Не удалось собрать переносимый код квиза.')
  }

  return `<!-- Атмосфера: вставьте код целиком в блок T123 «HTML-код» -->
<div class="${EMBED_ROOT_CLASS}" data-atmospace-quiz="${normalizeEmbedId(embedId)}">
<style>
${scopeStandaloneStyles(styles)}
</style>
${body}
</div>`
}

export function buildTildaQuizEmbedCode(project, preparedConfig, options = {}) {
  const standaloneHtml = buildPublishedLongQuizHtml(
    project,
    preparedConfig,
    options,
  )

  return buildTildaEmbedFromStandaloneHtml(standaloneHtml, {
    embedId: project?.id,
  })
}

export function buildStandaloneQuizHtml(project, preparedConfig, options = {}) {
  return buildPublishedLongQuizHtml(project, preparedConfig, options)
}
