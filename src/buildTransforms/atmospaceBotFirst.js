const REGISTRATION_HELPER = `function renderAtmospaceRegistrationButton(className, label = 'Перейти к форме заявки') {
  return \`<a href=\"#\" data-atmospace-registration-link data-atmospace-state=\"loading\" aria-disabled=\"true\" class=\"\${esc(className)}\" style=\"grid-column:1 / -1\"><span>\${esc(label)}</span></a>\`;
}`

const BOT_HELPERS = String.raw`

function renderAtmospaceMessengerButtons(className, primary = true) {
  const attributeName = primary ? 'data-atmospace-messenger' : 'data-atmospace-messenger-proxy';
  const goalHandler = (goalName) => primary
    ? \` onclick=\"if(typeof window.ym==='function'&&window.mainMetrikaId){window.ym(Number(window.mainMetrikaId),'reachGoal','\${goalName}')}\"\`
    : '';
  const buttonStyle = 'flex:1 1 220px;width:auto;min-width:min(220px,100%)';
  return \`<div class=\"atmospace-messenger-actions\" style=\"display:flex;flex-wrap:wrap;gap:10px;grid-column:1 / -1\">
    <a href=\"#\" \${attributeName}=\"telegram\" aria-disabled=\"true\" class=\"\${esc(className)}\" style=\"\${buttonStyle}\"\${goalHandler('telegram_button_click')}><span>Смотреть в Telegram</span></a>
    <a href=\"#\" \${attributeName}=\"max\" aria-disabled=\"true\" class=\"\${esc(className)}\" style=\"\${buttonStyle}\"\${goalHandler('max_button_click')}><span>Смотреть в MAX</span></a>
  </div>\`;
}

function botifyModernistoFormatOneTemplate(html) {
  const source = String(html || '');
  const quizCta = /<a class=\"a30l-cta\" data-a30l-action=\"quiz\" href=\"[^\"]*\"><span data-copy>Пройти мини-тест<\/span>\s*<i aria-hidden=\"true\">→<\/i><\/a>/;
  if (!quizCta.test(source)) {
    throw new Error('Format 1 bot-first transform could not find the approved quiz CTA.');
  }
  return source.replace(quizCta, renderAtmospaceMessengerButtons('a30l-cta', true));
}

function buildAtmospaceBotRuntimeScript(input = {}) {
  const config = buildAtmospaceLandingConfig(input);
  return \`<script
  src=\"https://app.atmospace.pro/acquisition/landing-runtime-v1.js\"
  data-public-landing-key=\"\${esc(config.publicLandingKey)}\"
  data-counter-id=\"\${esc(config.counterId)}\"
  data-api-base-url=\"\${esc(MODERNISTO_FORMAT_ONE_API_BASE_URL)}\"
  data-landing-variant-name=\"\${esc(config.landingName || 'Рекламный лендинг')}\"
  data-runtime-version=\"sergey-constructor-bot-v1\"
></script>
<script>
(function () {
  'use strict';
  function syncProxy(proxy) {
    var messenger = proxy.getAttribute('data-atmospace-messenger-proxy');
    var primary = document.querySelector('[data-atmospace-messenger=\"' + messenger + '\"]');
    if (!primary) return;
    function sync() {
      var href = primary.getAttribute('href') || '#';
      proxy.setAttribute('href', href);
      if (primary.getAttribute('aria-disabled') === 'true') proxy.setAttribute('aria-disabled', 'true');
      else proxy.removeAttribute('aria-disabled');
    }
    sync();
    new MutationObserver(sync).observe(primary, { attributes: true, attributeFilter: ['href', 'aria-disabled'] });
    proxy.addEventListener('click', function (event) {
      event.preventDefault();
      if (primary.getAttribute('aria-disabled') === 'true') return;
      primary.click();
    });
  }
  Array.prototype.slice.call(document.querySelectorAll('[data-atmospace-messenger-proxy]')).forEach(syncProxy);
})();
</script>\`;
}
`
  .replaceAll('\\`', '`')
  .replaceAll('\\${', '${')

function replaceExactlyOnce(source, needle, replacement, label) {
  const first = source.indexOf(needle)
  const last = source.lastIndexOf(needle)
  if (first < 0 || first !== last) {
    throw new Error(`${label} must match exactly once`)
  }
  return source.slice(0, first) + replacement + source.slice(first + needle.length)
}

function replaceStaticInsight(source) {
  const startMarker = 'function renderStaticInsightPrelanding({'
  const endMarker = '\nfunction renderBarrierProfileQuizPrelanding'
  const start = source.indexOf(startMarker)
  const end = source.indexOf(endMarker, start)
  if (start < 0 || end < 0) {
    throw new Error('Format 6 renderer markers are missing')
  }

  let block = source.slice(start, end)
  const oldButton = "${renderAtmospaceRegistrationButton('fh-si-cta')}"
  const occurrences = block.split(oldButton).length - 1
  if (occurrences !== 2) {
    throw new Error(`Format 6 must contain exactly two registration CTA slots, found ${occurrences}`)
  }
  block = block.replace(oldButton, "${renderAtmospaceMessengerButtons('fh-si-cta', true)}")
  block = block.replace(oldButton, "${renderAtmospaceMessengerButtons('fh-si-cta', false)}")
  block = replaceExactlyOnce(
    block,
    '${buildAtmospacePrelandingTrackingScript()}',
    '${buildAtmospaceBotRuntimeScript({ projectData, ...(landingMeta || {}) })}',
    'Format 6 runtime',
  )

  return source.slice(0, start) + block + source.slice(end)
}

function replaceFormatOne(source) {
  const startMarker = 'function renderModernistoStartPrelanding({'
  const endMarker = '\nfunction '
  const start = source.indexOf(startMarker)
  const end = source.indexOf(endMarker, start + startMarker.length)
  if (start < 0 || end < 0) {
    throw new Error('Format 1 renderer markers are missing')
  }

  let block = source.slice(start, end)
  const oldReturn = 'return `${template}${titleSizingCss}${privacyLinkCss}${MODERNISTO_FORMAT_ONE_VISUAL_CSS}\n<script'
  const newReturn = 'const botFirstTemplate = botifyModernistoFormatOneTemplate(`${template}${titleSizingCss}${privacyLinkCss}${MODERNISTO_FORMAT_ONE_VISUAL_CSS}`);\n\n  return `${botFirstTemplate}\n<script'
  block = replaceExactlyOnce(block, oldReturn, newReturn, 'Format 1 rendered template')
  block = replaceExactlyOnce(
    block,
    'src="${esc(MODERNISTO_FORMAT_ONE_ATTRIBUTION_URL)}"',
    'src="https://app.atmospace.pro/acquisition/landing-runtime-v1.js"',
    'Format 1 runtime source',
  )

  return source.slice(0, start) + block + source.slice(end)
}

export function transformConstructorAppSource(input) {
  let source = String(input || '')
  source = replaceExactlyOnce(
    source,
    REGISTRATION_HELPER,
    `${REGISTRATION_HELPER}${BOT_HELPERS}`,
    'Atmospace registration helper',
  )
  source = replaceFormatOne(source)
  source = replaceStaticInsight(source)
  return source
}
