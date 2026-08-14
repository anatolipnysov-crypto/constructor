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

function validateAtmospaceBotFirstTildaHtml(html = '', config = {}, options = {}) {
  const source = String(html || '');
  const errors = [];
  const warnings = [];
  const modernistoStartRequired = options.modernistoStartRequired === true;
  const canonicalRuntimeUrl = 'https://app.atmospace.pro/acquisition/landing-runtime-v1.js';
  const occurrences = (value) => value ? source.split(value).length - 1 : 0;

  if (!source.trim()) errors.push('HTML ещё не собран.');
  if (/<!doctype|<html[\s>]|<head[\s>]|<body[\s>]/i.test(source)) {
    errors.push('HTML для Tilda не должен быть полноценным документом с html/head/body.');
  }

  [
    /serverOnlyAdGoalCredential|metrikaToken|yandex_oauth_token/i,
    /r\.bothelp\.io/i,
    /https:\/\/(?:t\.me|max\.ru)\//i
  ].forEach(function (forbiddenPattern) {
    if (forbiddenPattern.test(source)) {
      errors.push('В HTML найден запрещённый защищённый или прямой внешний переход.');
    }
  });

  [
    'channel_subscription_verified',
    'offer_link_clicked',
    'registration_success',
    'payment_success'
  ].forEach(function (trustedGoal) {
    if (source.includes(trustedGoal)) {
      errors.push('Дальние бизнес-цели не должны отправляться браузером лендинга.');
    }
  });

  if (occurrences(canonicalRuntimeUrl) !== 1) {
    errors.push('В HTML должен быть ровно один официальный runtime Atmospace.');
  }
  if (occurrences('telegram_button_click') !== 1 || occurrences('max_button_click') !== 1) {
    errors.push('Технические цели Telegram и MAX должны присутствовать в HTML ровно по одному разу.');
  }
  if (config.publicLandingKey && !source.includes(String(config.publicLandingKey))) {
    errors.push('В HTML не найден текущий код рекламного лендинга.');
  }
  if (config.counterId && !source.includes(String(config.counterId))) {
    errors.push('В HTML не найден текущий номер счётчика.');
  }

  const primaryTelegramCount = (source.match(/data-atmospace-messenger=[\"']telegram[\"']/g) || []).length;
  const primaryMaxCount = (source.match(/data-atmospace-messenger=[\"']max[\"']/g) || []).length;
  const proxyTelegramCount = (source.match(/data-atmospace-messenger-proxy=[\"']telegram[\"']/g) || []).length;
  const proxyMaxCount = (source.match(/data-atmospace-messenger-proxy=[\"']max[\"']/g) || []).length;

  if (primaryTelegramCount !== 1 || primaryMaxCount !== 1) {
    errors.push('В HTML должна быть ровно одна основная кнопка Telegram и одна основная кнопка MAX.');
  }

  if (modernistoStartRequired) {
    if (proxyTelegramCount !== 0 || proxyMaxCount !== 0) {
      errors.push('В формате 1 не должно быть дублирующих proxy-кнопок мессенджеров.');
    }
    if (occurrences('Смотреть в Telegram') !== 1 || occurrences('Смотреть в MAX') !== 1) {
      errors.push('В формате 1 должны быть две продуктовые кнопки продолжения: Telegram и MAX.');
    }

    const messengerCtaPattern = /<div class=[\"']atmospace-messenger-actions[\"'][^>]*>\s*<a[^>]*data-atmospace-messenger=[\"']telegram[\"'][\s\S]*?<\/a>\s*<a[^>]*data-atmospace-messenger=[\"']max[\"'][\s\S]*?<\/a>\s*<\/div>/i;
    if (!messengerCtaPattern.test(source)) {
      errors.push('В формате 1 не найдена утверждённая пара кнопок Telegram/MAX.');
    } else {
      const approvedQuizCta = '<a class=\"a30l-cta\" data-a30l-action=\"quiz\" href=\"' + MODERNISTO_FORMAT_ONE_QUIZ_URL + '\"><span data-copy>Пройти мини-тест</span> <i aria-hidden=\"true\">→</i></a>';
      const normalizedLegacySource = source
        .replace(messengerCtaPattern, approvedQuizCta)
        .replace(canonicalRuntimeUrl, MODERNISTO_FORMAT_ONE_ATTRIBUTION_URL);
      const baselineValidation = validateModernistoStartTildaHtml(normalizedLegacySource, config);
      if (!baselineValidation.ok) {
        errors.push(...baselineValidation.errors);
      }
      if (Array.isArray(baselineValidation.warnings)) warnings.push(...baselineValidation.warnings);
    }
  } else {
    if (proxyTelegramCount !== 1 || proxyMaxCount !== 1) {
      errors.push('В формате 6 должны быть ровно две синхронизированные пары кнопок Telegram/MAX.');
    }
    if (occurrences('Смотреть в Telegram') !== 2 || occurrences('Смотреть в MAX') !== 2) {
      errors.push('В формате 6 обе CTA-зоны должны содержать кнопки Telegram и MAX.');
    }
    if (/data-atmospace-registration-link|data-atmospace-quiz-link/i.test(source)) {
      errors.push('В формате 6 не должно быть старых кнопок регистрации или мини-теста.');
    }
    if (/requestRegistration|window\.location\.assign\(registrationUrl\)/i.test(source)) {
      errors.push('В формате 6 найден старый встроенный runtime регистрации.');
    }
    if (!source.includes('data-runtime-version=\"sergey-constructor-bot-v1\"')) {
      errors.push('В формате 6 не найден текущий bot-first runtime profile.');
    }
  }

  return {
    ok: errors.length === 0,
    errors: Array.from(new Set(errors)),
    warnings: Array.from(new Set(warnings))
  };
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

function replaceActiveValidation(source) {
  return replaceExactlyOnce(
    source,
    '() => validateAtmospaceTildaHtml(prelandingHtml, prelandingHtmlConfig, {',
    '() => validateAtmospaceBotFirstTildaHtml(prelandingHtml, prelandingHtmlConfig, {',
    'Active prelanding validator',
  )
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
  source = replaceActiveValidation(source)
  return source
}
