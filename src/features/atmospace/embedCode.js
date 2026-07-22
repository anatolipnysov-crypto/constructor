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

function findMatchingBrace(css, openingIndex) {
  let depth = 0
  let quote = null
  let escaped = false

  for (let index = openingIndex; index < css.length; index += 1) {
    const character = css[index]

    if (escaped) {
      escaped = false
      continue
    }

    if (character === '\\') {
      escaped = true
      continue
    }

    if (quote) {
      if (character === quote) quote = null
      continue
    }

    if (character === '"' || character === "'") {
      quote = character
      continue
    }

    if (character === '{') depth += 1
    if (character === '}') {
      depth -= 1
      if (depth === 0) return index
    }
  }

  return -1
}

function splitSelectorList(value) {
  const selectors = []
  let start = 0
  let depth = 0
  let quote = null
  let escaped = false

  for (let index = 0; index < value.length; index += 1) {
    const character = value[index]

    if (escaped) {
      escaped = false
      continue
    }

    if (character === '\\') {
      escaped = true
      continue
    }

    if (quote) {
      if (character === quote) quote = null
      continue
    }

    if (character === '"' || character === "'") {
      quote = character
      continue
    }

    if (character === '(' || character === '[') depth += 1
    if (character === ')' || character === ']') depth = Math.max(0, depth - 1)

    if (character === ',' && depth === 0) {
      selectors.push(value.slice(start, index))
      start = index + 1
    }
  }

  selectors.push(value.slice(start))
  return selectors
}

function scopeSelector(selector) {
  const normalized = selector.trim()
  if (!normalized) return null

  if (normalized === ':root' || normalized === 'html' || normalized === 'body') {
    return EMBED_ROOT_SELECTOR
  }

  if (normalized === '*') {
    return `${EMBED_ROOT_SELECTOR}, ${EMBED_ROOT_SELECTOR} *`
  }

  const withoutDocumentRoot = normalized
    .replace(/^:root\b/, EMBED_ROOT_SELECTOR)
    .replace(/^html\b/, EMBED_ROOT_SELECTOR)
    .replace(/^body\b/, EMBED_ROOT_SELECTOR)

  if (withoutDocumentRoot.startsWith(EMBED_ROOT_SELECTOR)) {
    return withoutDocumentRoot
  }

  return `${EMBED_ROOT_SELECTOR} ${withoutDocumentRoot}`
}

function scopeSelectorHeader(header) {
  return splitSelectorList(header)
    .map(scopeSelector)
    .filter(Boolean)
    .join(', ')
}

function scopeCssRules(css) {
  let result = ''
  let cursor = 0

  while (cursor < css.length) {
    const openingIndex = css.indexOf('{', cursor)
    if (openingIndex === -1) {
      result += css.slice(cursor)
      break
    }

    const closingIndex = findMatchingBrace(css, openingIndex)
    if (closingIndex === -1) {
      throw new TypeError('Не удалось безопасно подготовить стили квиза.')
    }

    const header = css.slice(cursor, openingIndex)
    const body = css.slice(openingIndex + 1, closingIndex)
    const trimmedHeader = header.trim()

    if (/^@(media|supports|container|layer)\b/i.test(trimmedHeader)) {
      result += `${header}{${scopeCssRules(body)}}`
    } else if (/^@(-webkit-)?keyframes\b/i.test(trimmedHeader) || /^@font-face\b/i.test(trimmedHeader)) {
      result += `${header}{${body}}`
    } else if (trimmedHeader.startsWith('@')) {
      result += `${header}{${body}}`
    } else {
      const leadingWhitespace = header.match(/^\s*/)?.[0] ?? ''
      result += `${leadingWhitespace}${scopeSelectorHeader(trimmedHeader)} {${body}}`
    }

    cursor = closingIndex + 1
  }

  return result.trim()
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
${scopeCssRules(styles)}
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
