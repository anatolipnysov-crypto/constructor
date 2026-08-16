function replaceExpectedCount(source, needle, replacement, expectedCount, label) {
  const count = source.split(needle).length - 1
  if (count !== expectedCount) {
    throw new Error(`${label} must match ${expectedCount} time(s), found ${count}`)
  }
  return source.replaceAll(needle, replacement)
}

export const ATMOSPACE_MESSENGER_HOVER_COLOR = '#22c55e'

const MESSENGER_HOVER_STYLE = `.atmospace-messenger-cta:hover,.atmospace-messenger-cta:focus-visible{background:${ATMOSPACE_MESSENGER_HOVER_COLOR}!important;border-color:${ATMOSPACE_MESSENGER_HOVER_COLOR}!important;color:#fff!important;box-shadow:0 10px 26px rgba(34,197,94,.22)!important}`

export function transformMessengerCtaUxSource(input) {
  let source = String(input || '')

  source = replaceExpectedCount(
    source,
    '  const template = MODERNISTO_FORMAT_ONE_TEMPLATE\n',
    "  const template = MODERNISTO_FORMAT_ONE_TEMPLATE.replace('выгорешь', 'выгоришь')\n",
    1,
    'Format 1 grammar correction',
  )

  source = replaceExpectedCount(
    source,
    '<a href=\\"#\\" ${attributeName}=\\"',
    '<a href=\\"#\\" target=\\"_blank\\" rel=\\"noopener noreferrer\\" ${attributeName}=\\"',
    2,
    'Messenger target attributes',
  )

  source = replaceExpectedCount(
    source,
    'class=\\"${esc(className)}\\" style=\\"${buttonStyle}\\"',
    'class=\\"${esc(className)} atmospace-messenger-cta\\" style=\\"${buttonStyle}\\"',
    2,
    'Messenger CTA class',
  )

  source = replaceExpectedCount(
    source,
    "  return source.replace(quizCta, renderAtmospaceMessengerButtons('a30l-cta', true));",
    `  const messengerHtml = source.replace(quizCta, renderAtmospaceMessengerButtons('a30l-cta', true));\n  return messengerHtml + '<style id="atmospace-messenger-cta-ux">${MESSENGER_HOVER_STYLE}</style>';`,
    1,
    'Format 1 messenger hover style',
  )

  source = replaceExpectedCount(
    source,
    'return `<script\n  src=\\"https://app.atmospace.pro/acquisition/landing-runtime-v1.js\\"',
    `return \`<style id="atmospace-messenger-cta-ux">\n${MESSENGER_HOVER_STYLE}\n</style>\n<script\n  src=\\"https://app.atmospace.pro/acquisition/landing-runtime-v1.js\\"`,
    1,
    'Format 6 messenger hover style',
  )

  return source
}
