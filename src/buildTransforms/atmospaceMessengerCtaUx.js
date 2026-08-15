function replaceExpectedCount(source, needle, replacement, expectedCount, label) {
  const count = source.split(needle).length - 1
  if (count !== expectedCount) {
    throw new Error(`${label} must match ${expectedCount} time(s), found ${count}`)
  }
  return source.replaceAll(needle, replacement)
}

export const ATMOSPACE_MESSENGER_HOVER_COLOR = '#22c55e'

export function transformMessengerCtaUxSource(input) {
  let source = String(input || '')

  source = replaceExpectedCount(
    source,
    '<a href="#" ${attributeName}="',
    '<a href="#" target="_blank" rel="noopener noreferrer" ${attributeName}="',
    2,
    'Messenger target attributes',
  )

  source = replaceExpectedCount(
    source,
    'class="${esc(className)}" style="${buttonStyle}"',
    'class="${esc(className)} atmospace-messenger-cta" style="${buttonStyle}"',
    2,
    'Messenger CTA class',
  )

  source = replaceExpectedCount(
    source,
    'return `<script\n  src="https://app.atmospace.pro/acquisition/landing-runtime-v1.js"',
    `return \`<style id="atmospace-messenger-cta-ux">\n.atmospace-messenger-cta:hover,.atmospace-messenger-cta:focus-visible{background:${ATMOSPACE_MESSENGER_HOVER_COLOR}!important;border-color:${ATMOSPACE_MESSENGER_HOVER_COLOR}!important;color:#fff!important;box-shadow:0 10px 26px rgba(34,197,94,.22)!important}\n</style>\n<script\n  src="https://app.atmospace.pro/acquisition/landing-runtime-v1.js"`,
    1,
    'Messenger CTA hover style',
  )

  return source
}
