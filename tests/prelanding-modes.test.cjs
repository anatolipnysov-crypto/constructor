const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const appSource = fs.readFileSync(path.join(root, 'src', 'App.jsx'), 'utf8');
const formatOneDataSource = fs.readFileSync(path.join(root, 'src', 'data', 'modernistoFormatOne.js'), 'utf8');
const formatOneTemplateSource = fs.readFileSync(path.join(root, 'src', 'data', 'modernistoFormatOneTemplate.js'), 'utf8');
const formatOneVisualSource = fs.readFileSync(path.join(root, 'src', 'data', 'modernistoFormatOneVisuals.js'), 'utf8');

function sliceBetween(text, startSnippet, endSnippet) {
  const start = text.indexOf(startSnippet);
  const end = text.indexOf(endSnippet, start + startSnippet.length);
  assert.notEqual(start, -1, `Source must include ${startSnippet}`);
  assert.notEqual(end, -1, `Source must include ${endSnippet} after ${startSnippet}`);
  return text.slice(start, end);
}

function sliceFunction(text, functionName) {
  const marker = `function ${functionName}`;
  const start = text.indexOf(marker);
  assert.notEqual(start, -1, `Source must include ${marker}`);
  const nextFunction = text.indexOf('\nfunction ', start + marker.length);
  return text.slice(start, nextFunction === -1 ? text.length : nextFunction);
}

function count(text, pattern) {
  return (String(text).match(pattern) || []).length;
}

function readSingleQuotedExport(source, exportName) {
  const match = source.match(new RegExp(`export const ${exportName} = '([^']*)';`));
  assert(match, `Data module must export ${exportName}`);
  return match[1];
}

function readJsonStringExport(source, exportName) {
  const prefix = `export const ${exportName} = `;
  assert(source.startsWith(prefix), `Template module must begin with ${prefix}`);
  const literal = source.slice(prefix.length).trim().replace(/;$/, '');
  return JSON.parse(literal);
}

function readTemplateLiteralExport(source, exportName) {
  const prefix = `export const ${exportName} = \``;
  const start = source.indexOf(prefix);
  assert.notEqual(start, -1, `Data module must export ${exportName}`);
  const contentStart = start + prefix.length;
  const end = source.indexOf('`;', contentStart);
  assert.notEqual(end, -1, `Template literal export ${exportName} must be closed`);
  return source.slice(contentStart, end);
}

function avifFileToDataUri(fileName) {
  const buffer = fs.readFileSync(path.join(root, 'src', 'assets', 'modernisto', fileName));
  assert(buffer.length > 20_000, `${fileName} must not be a placeholder`);
  return `data:image/avif;base64,${buffer.toString('base64')}`;
}

function hashTextForRegression(value = '') {
  return Array.from(String(value)).reduce((hash, char) => {
    hash ^= char.charCodeAt(0);
    return Math.imul(hash, 16777619);
  }, 2166136261) >>> 0;
}

function pickHashedForRegression(value, options) {
  if (!options?.length) return undefined;
  return options[Math.abs(hashTextForRegression(value)) % options.length] || options[0];
}

// Public constructor surface: legacy formats must stay removed.
const modeSelector = sliceBetween(appSource, 'const MANUAL_PRELANDING_MODES = [', '];');
const modeIds = [...modeSelector.matchAll(/\bid:\s*'([^']+)'/g)].map((match) => match[1]);
assert.deepEqual(modeIds, ['templateStage', 'barrierProfileQuiz'], 'The selector must expose exactly Formats 1 and 6.');
assert(modeSelector.includes("title: 'Формат 1 / Точный modernisto.ru/start'"));
assert(modeSelector.includes("title: 'Формат 6 / Смысловой профиль барьера'"));
assert(!modeSelector.includes("id: 'personalRouteQuiz'"), 'Removed modes must not return to the selector.');
[
  /Формат [2-5]\s*(?:\/|:)/,
  /один из шести форматов/,
  /Доступны шесть форматов предлендинга/
].forEach((pattern) => assert(!pattern.test(appSource), `Stale constructor surface must not match ${pattern}`));

// Format 1 assets are fixed to the approved live /start implementation.
const quizUrl = readSingleQuotedExport(formatOneDataSource, 'MODERNISTO_FORMAT_ONE_QUIZ_URL');
const apiBaseUrl = readSingleQuotedExport(formatOneDataSource, 'MODERNISTO_FORMAT_ONE_API_BASE_URL');
const attributionUrl = readSingleQuotedExport(formatOneDataSource, 'MODERNISTO_FORMAT_ONE_ATTRIBUTION_URL');
const heroDataUri = readSingleQuotedExport(formatOneDataSource, 'MODERNISTO_FORMAT_ONE_HERO_DATA_URI');
const formatOneTemplate = readJsonStringExport(formatOneTemplateSource, 'MODERNISTO_FORMAT_ONE_TEMPLATE');
const brightHeroDataUri = avifFileToDataUri('andrey-bright-v2.avif');
const warmHeroDataUri = avifFileToDataUri('andrey-warm-v3.avif');
const formatOneVisualVariants = [
  { id: 'midnight-blue', label: 'Контрастный синий', heroDataUri },
  { id: 'daylight-blue', label: 'Светлый интерьер', heroDataUri: brightHeroDataUri },
  { id: 'warm-studio', label: 'Тёплая студия', heroDataUri: warmHeroDataUri }
];
const formatOneGoalIconHtml = readSingleQuotedExport(formatOneVisualSource, 'MODERNISTO_FORMAT_ONE_GOAL_ICON_HTML');
const formatOneVisualCss = readTemplateLiteralExport(formatOneVisualSource, 'MODERNISTO_FORMAT_ONE_VISUAL_CSS');

assert.equal(quizUrl, 'https://app.atmospace.pro/quiz/index.html');
assert.equal(apiBaseUrl, 'https://api.atmospace.pro');
assert.equal(attributionUrl, 'https://app.atmospace.pro/acquisition/modernisto-runtime.js');
assert(!formatOneDataSource.includes('modernisto-attribution.js'), 'Generated format 1 HTML must not return to the deprecated runtime alias.');
assert.match(heroDataUri, /^data:image\/avif;base64,[A-Za-z0-9+/=]+$/, 'The approved Andrey portrait must be one embedded AVIF.');
assert(heroDataUri.length > 20_000, 'The approved portrait must not be replaced with a placeholder.');
assert.deepEqual(
  [...formatOneVisualSource.matchAll(/\bid:\s*'([^']+)'/g)].map((match) => match[1]),
  formatOneVisualVariants.map((variant) => variant.id),
  'Format 1 visual module must expose exactly the three approved variants.'
);
assert.equal(count(formatOneVisualSource, /\.avif\?inline/g), 2, 'The two additional AVIF portraits must be bundled inline.');
assert.equal(new Set(formatOneVisualVariants.map((variant) => variant.heroDataUri)).size, 3, 'Every approved visual variant must use a distinct portrait.');
formatOneVisualVariants.forEach((variant) => {
  assert.match(variant.heroDataUri, /^data:image\/avif;base64,[A-Za-z0-9+/=]+$/, `${variant.id} must use an embedded AVIF.`);
});
assert(formatOneGoalIconHtml.includes('<svg'), 'The approved goal icon must be SVG.');
assert(formatOneGoalIconHtml.includes('<path d="M7 17 17 7M9 7h8v8"'), 'The approved SVG goal arrow path must stay fixed.');
assert(formatOneVisualCss.includes('id="a30l-approved-visual-variants"'), 'Approved visual CSS must remain scoped and identifiable.');
formatOneVisualVariants.forEach(({ id }) => {
  assert(formatOneVisualSource.includes(`id: '${id}'`), `Visual module must include ${id}.`);
  assert(formatOneVisualCss.includes(`data-a30l-variant="${id}"`) || id === 'midnight-blue', `Visual CSS must support ${id}.`);
});

[
  'id="atmosfera-30-landing"',
  'data-atmospace-format="1"',
  'id="a30l-title"',
  'АТМОСФЕРА',
  'Ты уже не первый год пытаешься перейти на новый уровень:',
  'увеличить доход',
  'найти своё дело',
  'изменить привычки',
  'и жить так, как хочешь именно ты.',
  'Но что бы ты ни делал - результата <strong>НЕТ.</strong>',
  'Новая попытка как удар по вере в себя.',
  'Сколько ты ещё так сможешь, пока окончательно не выгорешь?',
  'Почему у других получается, а у тебя нет?',
  'Готов увидеть <strong>НАСТОЯЩУЮ</strong> причину твоих проблем?',
  'data-a30l-action="quiz"',
  `href="${quizUrl}"`,
  'Пройти мини-тест',
  'alt="Андрей Золотарёв"',
  'Андрей Золотарёв | А Т М О С Ф Е Р А',
  '--a30l-acid:#229ed9',
  '@media (width<=860px)',
  '@media (width<=560px)'
].forEach((snippet) => {
  assert(formatOneTemplate.includes(snippet), `Fixed Format 1 template must preserve ${snippet}`);
});
[
  '__ATMOSPACE_TITLE_CLASS__',
  '__ATMOSPACE_HEADLINE_HTML__',
  '__ATMOSPACE_HERO_DATA_URI__'
].forEach((placeholder) => {
  assert.equal(count(formatOneTemplate, new RegExp(placeholder, 'g')), 1, `Template must contain ${placeholder} exactly once.`);
});
[
  'data-atmospace-inline-quiz',
  'data-atmospace-embedded-quiz',
  'data-atmospace-registration-link',
  'data-atmospace-registration-section',
  'data-atmospace-format1-stage',
  'window.ATMOSPACE_LANDING_CONFIG',
  'Форма регистрации',
  '__ATMOSPACE_DESCRIPTION__'
].forEach((snippet) => {
  assert(!formatOneTemplate.includes(snippet), `Fixed Format 1 template must not include ${snippet}`);
});
assert.equal(count(formatOneTemplate, /↗/g), 4, 'The fixed template must expose four replacement points for SVG goal icons.');

// The active renderer changes only the headline and attaches exactly one official attribution runtime.
const headlineRenderer = sliceFunction(appSource, 'renderModernistoHeadline');
const formatOneRenderer = sliceFunction(appSource, 'renderModernistoStartPrelanding');
assert(headlineRenderer.includes('stripHtml('), 'Headline must be reduced to safe text before insertion.');
assert(headlineRenderer.includes('esc('), 'Headline must be HTML escaped.');
assert(formatOneRenderer.includes("titleText.length > 95 ? 'a30l-title-long' : titleText.length > 70 ? 'a30l-title-medium' : ''"), 'Long advertising headlines must select the scoped responsive classes.');
[
  "const titleSizingCss = titleClass ?",
  'id="a30l-dynamic-title-sizing"',
  '#atmosfera-30-landing .a30l-intro h1.a30l-title-medium',
  '#atmosfera-30-landing .a30l-intro h1.a30l-title-long',
  '@media (max-width:560px)',
  "</style>` : ''",
  '${template}${titleSizingCss}'
].forEach((snippet) => assert(formatOneRenderer.includes(snippet), `Responsive dynamic headline sizing must include ${snippet}`));
assert.match(formatOneRenderer, /\.replace\('__ATMOSPACE_TITLE_CLASS__',\s*\(\)\s*=>\s*titleClass\)/, 'Title-class replacement must use a callback.');
assert.match(formatOneRenderer, /\.replace\('__ATMOSPACE_HEADLINE_HTML__',\s*\(\)\s*=>\s*renderModernistoHeadline\(titleText\)\)/, 'Headline replacement must use a callback so $ replacement tokens stay literal.');
assert.match(formatOneRenderer, /\.replace\('__ATMOSPACE_HERO_DATA_URI__',\s*\(\)\s*=>\s*visualVariant\.heroDataUri\)/, 'Hero replacement must use the deterministically selected approved variant.');
assert.match(formatOneRenderer, /\.replaceAll\('<i aria-hidden="true">↗<\/i>',\s*\(\)\s*=>\s*MODERNISTO_FORMAT_ONE_GOAL_ICON_HTML\)/, 'Every goal arrow must be replaced with the approved SVG icon.');
assert.deepEqual(
  [...new Set([...formatOneRenderer.matchAll(/content\?\.([A-Za-z0-9_]+)/g)].map((match) => match[1]))].sort(),
  ['title', 'titleHtml'],
  'Format 1 renderer may read only the advertising headline.'
);
[
  'MODERNISTO_FORMAT_ONE_TEMPLATE',
  ".replace('__ATMOSPACE_TITLE_CLASS__'",
  ".replace('__ATMOSPACE_HEADLINE_HTML__'",
  ".replace('__ATMOSPACE_HERO_DATA_URI__'",
  'pickHashed(',
  'MODERNISTO_FORMAT_ONE_VISUAL_VARIANTS',
  'MODERNISTO_FORMAT_ONE_GOAL_ICON_HTML',
  'MODERNISTO_FORMAT_ONE_VISUAL_CSS',
  'data-a30l-variant=',
  'MODERNISTO_FORMAT_ONE_ATTRIBUTION_URL',
  'MODERNISTO_FORMAT_ONE_QUIZ_URL',
  'MODERNISTO_FORMAT_ONE_API_BASE_URL',
  'data-public-landing-key=',
  'data-counter-id=',
  'data-quiz-url=',
  'data-api-base-url='
].forEach((snippet) => assert(formatOneRenderer.includes(snippet), `Format 1 renderer must include ${snippet}`));

const attributionTag = sliceBetween(formatOneRenderer, '<script', '</script>');
assert.equal(count(formatOneRenderer, /<script\b/g), 1, 'Format 1 must attach exactly one script.');
assert.deepEqual(
  [...attributionTag.matchAll(/\b(data-[a-z0-9-]+)=/g)].map((match) => match[1]),
  ['data-public-landing-key', 'data-counter-id', 'data-quiz-url', 'data-api-base-url'],
  'The official attribution tag must contain exactly the four live runtime attributes.'
);
[
  'buildAtmospaceHeadConfig',
  'window.ATMOSPACE_LANDING_CONFIG',
  'data-landing-name',
  'data-landing-code',
  'description',
  'creativeMethod',
  'sceneImage',
  'valueImage',
  'ctaImage',
  'renderCoreMethodMiniQuiz',
  'renderCoreMethodFixedOffer',
  'buildAtmospacePrelandingTrackingScript',
  'data-atmospace-registration-link'
].forEach((snippet) => assert(!formatOneRenderer.includes(snippet), `Format 1 renderer must not include ${snippet}`));

const renderFormatOneForRegression = new Function(
  'stripHtml',
  'esc',
  'buildAtmospaceLandingConfig',
  'MODERNISTO_FORMAT_ONE_TEMPLATE',
  'pickHashed',
  'MODERNISTO_FORMAT_ONE_VISUAL_VARIANTS',
  'MODERNISTO_FORMAT_ONE_GOAL_ICON_HTML',
  'MODERNISTO_FORMAT_ONE_VISUAL_CSS',
  'MODERNISTO_FORMAT_ONE_ATTRIBUTION_URL',
  'MODERNISTO_FORMAT_ONE_QUIZ_URL',
  'MODERNISTO_FORMAT_ONE_API_BASE_URL',
  `${headlineRenderer}\n${formatOneRenderer}\nreturn renderModernistoStartPrelanding;`
)(
  (value) => String(value || '').replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim(),
  (value) => String(value ?? '').replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;'),
  ({ projectData, ...landingMeta } = {}) => ({
    publicLandingKey: String(landingMeta.publicLandingKey || ''),
    counterId: String(landingMeta.counterId || projectData?.metrikaId || '')
  }),
  formatOneTemplate,
  pickHashedForRegression,
  formatOneVisualVariants,
  formatOneGoalIconHtml,
  formatOneVisualCss,
  attributionUrl,
  quizUrl,
  apiBaseUrl
);
const replacementTokenHeadline = "Цена $& $' $$ `${campaign}` <b>сейчас</b>";
const replacementTokenHtml = renderFormatOneForRegression({
  content: { title: replacementTokenHeadline },
  projectData: {},
  landingMeta: { publicLandingKey: 'public-test-key', counterId: '12345678' }
});
assert(replacementTokenHtml.includes("Цена $&amp; $' $$ `${campaign}` сейчас"), 'Headline replacement must preserve JavaScript replacement tokens literally after HTML escaping.');
assert(!replacementTokenHtml.includes('<b>сейчас</b>'), 'Headline HTML must be stripped before insertion.');
assert(!replacementTokenHtml.includes('a30l-dynamic-title-sizing'), 'A short headline must leave the approved template without supplemental sizing CSS.');
assert.equal(count(replacementTokenHtml, new RegExp(attributionUrl.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')), 1, 'Generated Format 1 HTML must contain one official attribution runtime.');
assert.equal(count(replacementTokenHtml, /href="https:\/\/atmospace\.pro\/privacy"/g), 1, 'Generated Format 1 HTML must contain one public privacy link.');
assert(replacementTokenHtml.includes('target="_blank" rel="noopener noreferrer">Политика конфиденциальности</a>'), 'The privacy link must open safely in a new tab.');
assert.equal(count(replacementTokenHtml, /<section\b[^>]*id=["']atmosfera-30-landing["']/g), 1, 'Generated Format 1 HTML must open the approved section exactly once.');
assert.equal(count(replacementTokenHtml, /<\/section\s*>/g), 1, 'Generated Format 1 HTML must close its section exactly once.');
assert(
  replacementTokenHtml.indexOf('<script') < replacementTokenHtml.indexOf('</section>'),
  'The official attribution runtime must remain inside the single approved Format 1 section.'
);
assert.match(replacementTokenHtml.trim(), /<\/script>\s*<\/section>$/, 'Generated Format 1 HTML must end with the balanced live-reference tag order.');
assert.equal(count(replacementTokenHtml, /<i class="a30l-goal-icon"/g), 4, 'Generated Format 1 HTML must contain four approved SVG goal icons.');
assert.equal(count(replacementTokenHtml, /<svg\b/g), 4, 'Generated Format 1 HTML must contain four goal SVGs.');
assert.equal(count(replacementTokenHtml, /<\/svg\s*>/g), 4, 'Generated Format 1 HTML must close all four goal SVGs.');
assert.equal(count(replacementTokenHtml, /<path d="M7 17 17 7M9 7h8v8"/g), 4, 'Generated Format 1 HTML must contain four approved SVG paths.');
assert(!replacementTokenHtml.includes('↗'), 'Generated Format 1 HTML must not retain text-arrow placeholders.');
const replacementRootSectionOpenTag = replacementTokenHtml.match(/<section\b[^>]*\bid=["']atmosfera-30-landing["'][^>]*>/i)?.[0] || '';
assert(replacementRootSectionOpenTag, 'Generated Format 1 HTML must contain its root section opening tag.');
assert.equal(count(replacementRootSectionOpenTag, /\bdata-a30l-variant\s*=/gi), 1, 'Generated Format 1 root must contain exactly one visual variant attribute.');
const replacementScriptOpenTags = replacementTokenHtml.match(/<script\b[^>]*>/gi) || [];
assert.equal(replacementScriptOpenTags.length, 1, 'Generated Format 1 HTML must contain exactly one script opening tag.');
assert.equal(count(replacementTokenHtml, /<\/script\s*>/gi), 1, 'Generated Format 1 HTML must contain exactly one script closing tag.');
assert.equal(
  replacementScriptOpenTags[0].match(/\bsrc=["']([^"']+)["']/i)?.[1],
  attributionUrl,
  'Generated Format 1 runtime src must be the exact approved URL.'
);
assert.deepEqual(
  [...replacementScriptOpenTags[0].matchAll(/\b(data-[a-z0-9-]+)\s*=/gi)].map((match) => match[1].toLowerCase()),
  ['data-public-landing-key', 'data-counter-id', 'data-quiz-url', 'data-api-base-url'],
  'Generated Format 1 runtime must contain exactly the four approved data attributes in order.'
);
const replacementVariantId = replacementRootSectionOpenTag.match(/\bdata-a30l-variant=["']([^"']+)["']/i)?.[1];
const replacementApprovedVariant = formatOneVisualVariants.find((variant) => variant.id === replacementVariantId);
assert(replacementApprovedVariant, 'Generated Format 1 root must select an approved visual variant.');
const replacementImageTags = replacementTokenHtml.match(/<img\b[^>]*>/gi) || [];
assert.equal(replacementImageTags.length, 1, 'Generated Format 1 HTML must contain exactly one image tag.');
assert.match(replacementImageTags[0], /\balt=["']Андрей Золотарёв["']/i, 'The single Format 1 image must be Andrey.');
assert.equal(
  replacementImageTags[0].match(/\bsrc=["']([^"']+)["']/i)?.[1],
  replacementApprovedVariant.heroDataUri,
  'The Andrey image src must match the selected approved visual variant.'
);

const deterministicKey = 'deterministic-public-landing-key';
const renderForKey = (publicLandingKey) => renderFormatOneForRegression({
  content: { title: 'Проверочный заголовок' },
  projectData: { metrikaId: '12345678' },
  landingMeta: { publicLandingKey, counterId: '12345678' }
});
const deterministicHtmlA = renderForKey(deterministicKey);
const deterministicHtmlB = renderForKey(deterministicKey);
assert.equal(deterministicHtmlA, deterministicHtmlB, 'The same public landing key must always select the same visual variant.');

const coveredVariantIds = new Set();
for (let index = 0; index < 256; index += 1) {
  const html = renderForKey(`coverage-public-key-${index}`);
  const variantId = html.match(/data-a30l-variant="([^"]+)"/)?.[1];
  const approvedVariant = formatOneVisualVariants.find((variant) => variant.id === variantId);
  assert(approvedVariant, `Generated Format 1 HTML must select an approved variant, received ${variantId}.`);
  const embeddedImages = html.match(/data:image\/[a-z0-9.+-]+;base64,[a-z0-9+/=]+/gi) || [];
  assert.equal(embeddedImages.length, 1, `Variant ${variantId} must embed exactly one approved image.`);
  assert.equal(embeddedImages[0], approvedVariant.heroDataUri, `Variant ${variantId} must embed its matching approved portrait.`);
  assert.equal(count(html, /<i class="a30l-goal-icon"/g), 4, `Variant ${variantId} must keep four SVG goal icons.`);
  assert(!html.includes('↗'), `Variant ${variantId} must not retain text-arrow placeholders.`);
  coveredVariantIds.add(variantId);
}
assert.deepEqual(
  [...coveredVariantIds].sort(),
  formatOneVisualVariants.map((variant) => variant.id).sort(),
  'Deterministic key coverage must reach all three approved visual variants.'
);

// Format 1 must leave the common dispatcher before templates, palettes and image selection are evaluated.
const dispatch = sliceBetween(appSource, 'function renderPrelandingHtml', 'function countMatches');
const fixedDispatchIndex = dispatch.indexOf('return renderModernistoStartPrelanding({');
assert.notEqual(fixedDispatchIndex, -1, 'Main renderer must dispatch Format 1 to renderModernistoStartPrelanding.');
assert(dispatch.indexOf('const isCoreMethod') < fixedDispatchIndex, 'Format 1 dispatch must be guarded by the normalized mode.');
[
  'const paletteKey',
  'prelandingThemeForStyle(',
  'pickDistinctPrelandingImage(',
  'resolveClientPrelandingLogic('
].forEach((lateWork) => {
  assert(fixedDispatchIndex < dispatch.indexOf(lateWork), `Format 1 must return before ${lateWork}`);
});
const fixedDispatch = sliceBetween(dispatch, 'if (isCoreMethod) {', '\n  const paletteKey');
assert.deepEqual(
  [...fixedDispatch.matchAll(/^\s{6}([a-zA-Z]+),?$/gm)].map((match) => match[1]),
  ['content', 'projectData', 'landingMeta'],
  'Fixed renderer dispatch must receive content and technical metadata only.'
);
assert(!dispatch.includes('renderCoreMethodInlinePrelanding({'), 'Legacy inline Format 1 must be unreachable from the active dispatcher.');
assert(dispatch.includes('renderBarrierProfileQuizPrelanding({'), 'Format 6 must remain reachable.');

// Generation readiness: Format 1 validates server data only and never enters the image pipeline.
assert(appSource.includes("const isFixedFormatOne = normalizedManualPrelandingMode === 'templateStage';"));
const generationReadiness = sliceBetween(appSource, 'const isSingleImagePrelandingMode', 'useEffect(() => {');
[
  'const prelandingAiImagesReady = isFixedFormatOne',
  'fixedTemplateReady',
  'const prelandingTemplateReady = isFixedFormatOne',
  "(!isFixedFormatOne || String(creativeHeadline || '').trim())",
  '(isFixedFormatOne || (style && palette))'
].forEach((snippet) => assert(generationReadiness.includes(snippet), `Format readiness must include ${snippet}`));

const generationHandler = sliceBetween(appSource, 'const handleGeneratePrelandingAiImages = async () => {', '\n  const resetAll =');
const fixedGenerationBranch = sliceBetween(generationHandler, 'if (isFixedFormatOne) {', '\n    const resumableAiState');
[
  'ATMOSPACE_GENERATE_ENDPOINT',
  'runtimeProfile: ATMOSPACE_MODERNISTO_START_RUNTIME_PROFILE',
  'normalizeAtmospaceGenerateResult',
  'saveAtmospaceLandingArtifact',
  'fixedTemplateReady: true',
  'consumePrelandingQuota()',
  'return;'
].forEach((snippet) => assert(fixedGenerationBranch.includes(snippet), `Format 1 technical generation must include ${snippet}`));
[
  'buildPrelandingImageSpecs',
  'ATMOSPACE_IMAGE_ENDPOINT',
  'sceneImage:',
  'valueImage:',
  'ctaImage:'
].forEach((snippet) => assert(!fixedGenerationBranch.includes(snippet), `Format 1 must bypass ${snippet}`));
assert(generationHandler.indexOf('if (isFixedFormatOne) {') < generationHandler.indexOf('buildPrelandingImageSpecs({'), 'Format 1 must return before AI image specs are built.');

// The generated Format 1 route passes only the entered headline and technical metadata.
const generatedPrelandingFlow = sliceBetween(appSource, 'const prelandingHtml = useMemo', 'const prelandingHtmlConfig = useMemo');
assert.equal(count(generatedPrelandingFlow, /return renderPrelandingHtml\(\{/g), 2, 'Generated HTML must keep exactly the two explicit format routes.');
const generatedFormatOneRoute = sliceBetween(generatedPrelandingFlow, 'if (isFixedFormatOne) {', '\n    if (!(prelandingTemplateReady');
[
  "prelandingMode: 'templateStage'",
  'title: enteredHeadline',
  'projectData: prelandingRuntimeProjectData',
  'landingMeta: effectivePrelandingVariantMeta'
].forEach((snippet) => assert(generatedFormatOneRoute.includes(snippet), `Format 1 route must include ${snippet}`));
[
  'enteredText',
  'creativeMethod',
  'description:',
  'templateId:',
  'style:',
  'palette:',
  'photo,',
  'sceneImage',
  'valueImage',
  'ctaImage',
  'themeStyle',
  'designRoute'
].forEach((snippet) => assert(!generatedFormatOneRoute.includes(snippet), `Format 1 route must not include ${snippet}`));

// Validator has a dedicated exact-/start branch. Format 6 keeps the original inline runtime validator.
const modernistoValidator = sliceFunction(appSource, 'validateModernistoStartTildaHtml');
const sharedValidator = sliceFunction(appSource, 'validateAtmospaceTildaHtml');
[
  'id="atmosfera-30-landing"',
  'data-atmospace-format="1"',
  'data-a30l-action="quiz"',
  'MODERNISTO_FORMAT_ONE_QUIZ_URL',
  'MODERNISTO_FORMAT_ONE_ATTRIBUTION_URL',
  'MODERNISTO_FORMAT_ONE_API_BASE_URL',
  'MODERNISTO_FORMAT_ONE_VISUAL_VARIANTS',
  'data-a30l-variant=',
  'const rootSectionOpenTag',
  'countMatches(rootSectionOpenTag, /\\bdata-a30l-variant\\s*=/gi) !== 1',
  'const scriptOpenTags',
  'scriptOpenTags.length !== 1',
  'countMatches(source, /<\\/script\\s*>/gi) !== 1',
  'runtimeScriptSrc !== MODERNISTO_FORMAT_ONE_ATTRIBUTION_URL',
  'JSON.stringify(runtimeDataAttributeNames) !== JSON.stringify(requiredRuntimeDataAttributeNames)',
  "'data-public-landing-key'",
  "'data-counter-id'",
  "'data-quiz-url'",
  "'data-api-base-url'",
  'approvedVisualVariant',
  'approvedVisualVariant.heroDataUri',
  'class=["\']a30l-goal-icon',
  '<path d="M7 17 17 7M9 7h8v8"',
  'countMatches(source, /<svg\\b/gi) !== 4',
  'countMatches(source, /<\\/svg\\s*>/gi) !== 4',
  'const imageTags',
  'imageTags.length !== 1',
  'andreyImageTags.length !== 1',
  'andreyImageSrc !== approvedVisualVariant.heroDataUri',
  'const expectedVisualVariant = pickHashed(',
  'approvedVisualVariant.id !== expectedVisualVariant.id',
  'увеличить доход',
  'найти своё дело',
  'изменить привычки',
  'и жить так, как хочешь именно ты.',
  'Сколько ты ещё так сможешь, пока окончательно не выгорешь?',
  'data-public-landing-key=',
  'data-counter-id=',
  "['publicLandingKey', 'код рекламного лендинга']",
  "['counterId', 'номер рекламного счётчика']",
  'embeddedImages.length !== 1',
  'window\\.ATMOSPACE_LANDING_CONFIG',
  'partner_code',
  '\\bgcao\\b',
  '\\bgcpc\\b',
  'landingCode',
  'landing_variant_code',
  'data-landing-code'
].forEach((snippet) => assert(modernistoValidator.includes(snippet), `Modernisto validator must include ${snippet}`));
assert(!modernistoValidator.includes('MODERNISTO_FORMAT_ONE_HERO_DATA_URI'), 'Validator must accept only the selected member of the approved visual variants set.');

const validateFormatOneForRegression = new Function(
  'countMatches',
  'esc',
  'MODERNISTO_FORMAT_ONE_QUIZ_URL',
  'MODERNISTO_FORMAT_ONE_ATTRIBUTION_URL',
  'MODERNISTO_FORMAT_ONE_API_BASE_URL',
  'pickHashed',
  'MODERNISTO_FORMAT_ONE_VISUAL_VARIANTS',
  'ATMOSPACE_GENERATED_RUNTIME_VERSION',
  'ATMOSPACE_PUBLIC_API_BASE_URL',
  'ATMOSPACE_INIT_ENDPOINT',
  'ATMOSPACE_CLICK_ENDPOINT',
  `${modernistoValidator}\nreturn validateModernistoStartTildaHtml;`
)(
  count,
  (value) => String(value ?? '').replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;'),
  quizUrl,
  attributionUrl,
  apiBaseUrl,
  pickHashedForRegression,
  formatOneVisualVariants,
  'test-runtime-version',
  apiBaseUrl,
  `${apiBaseUrl}/api/landing-runtime/init`,
  `${apiBaseUrl}/api/landing-runtime/click`
);
const validatorConfig = { publicLandingKey: 'public-test-key', counterId: '12345678' };
const validFormatOneResult = validateFormatOneForRegression(replacementTokenHtml, validatorConfig);
assert.deepEqual(validFormatOneResult, { ok: true, errors: [], warnings: [] }, 'The real Format 1 validator must accept renderer output.');

function assertFormatOneMutationRejected(label, mutate, expectedErrorSnippet) {
  const mutatedHtml = mutate(replacementTokenHtml);
  assert.notEqual(mutatedHtml, replacementTokenHtml, `${label} mutation must alter generated HTML.`);
  const result = validateFormatOneForRegression(mutatedHtml, validatorConfig);
  assert.equal(result.ok, false, `${label} mutation must fail closed.`);
  assert(
    result.errors.some((error) => error.includes(expectedErrorSnippet)),
    `${label} mutation must report ${expectedErrorSnippet}; received: ${result.errors.join(' | ')}`
  );
}

assertFormatOneMutationRejected(
  'extra script',
  (html) => html.replace('</section>', '<script src="https://example.invalid/extra.js"></script></section>'),
  'ровно один официальный runtime'
);
assertFormatOneMutationRejected(
  'missing script closing tag',
  (html) => html.replace('</script>', ''),
  'ровно один официальный runtime'
);
assertFormatOneMutationRejected(
  'extra runtime data attribute',
  (html) => html.replace('data-api-base-url="https://api.atmospace.pro"', 'data-api-base-url="https://api.atmospace.pro" data-extra="blocked"'),
  'четырьмя утверждёнными data-атрибутами'
);
assertFormatOneMutationRejected(
  'wrong runtime src',
  (html) => html.replace(`src="${attributionUrl}"`, 'src="https://example.invalid/runtime.js"'),
  'ровно один официальный runtime'
);
assertFormatOneMutationRejected(
  'duplicate visual variant attribute',
  (html) => html.replace(/(data-a30l-variant="[^"]+")/, '$1 data-a30l-variant="midnight-blue"'),
  'ровно один идентификатор визуального варианта'
);
const mismatchedApprovedVariant = formatOneVisualVariants.find((variant) => variant.id !== replacementVariantId);
assertFormatOneMutationRejected(
  'approved but mismatched visual variant',
  (html) => html
    .replace(`data-a30l-variant="${replacementVariantId}"`, `data-a30l-variant="${mismatchedApprovedVariant.id}"`)
    .replace(replacementApprovedVariant.heroDataUri, mismatchedApprovedVariant.heroDataUri),
  'не соответствует публичному коду кампании'
);
assertFormatOneMutationRejected(
  'changed fixed goal copy',
  (html) => html.replace('увеличить доход', 'изменённый пункт'),
  'не совпадает с утверждённым шаблоном'
);
assertFormatOneMutationRejected(
  'wrong Andrey image src',
  (html) => html.replace(`src="${replacementApprovedVariant.heroDataUri}"`, `src="${formatOneVisualVariants.find((variant) => variant.id !== replacementVariantId).heroDataUri}"`),
  'ровно один портрет Андрея'
);
assertFormatOneMutationRejected(
  'extra image',
  (html) => html.replace('</figure>', '<img alt="Андрей Золотарёв" src="data:image/avif;base64,AAAA"></figure>'),
  'ровно один портрет Андрея'
);
assertFormatOneMutationRejected(
  'altered SVG path',
  (html) => html.replace('M7 17 17 7M9 7h8v8', 'M7 17 16 8M9 7h8v8'),
  'ровно четыре утверждённые SVG-стрелки'
);
assertFormatOneMutationRejected(
  'unbalanced SVG',
  (html) => html.replace('</svg>', ''),
  'ровно четыре утверждённые SVG-стрелки'
);
assert(sharedValidator.includes('if (options.modernistoStartRequired === true)'));
assert(sharedValidator.includes('return validateModernistoStartTildaHtml(source, config);'));
assert(sharedValidator.indexOf('return validateModernistoStartTildaHtml(source, config);') < sharedValidator.indexOf("const quizRequired = options.quizRequired === true;"), 'Format 1 must bypass the inline-runtime validator.');

const validationCall = sliceBetween(appSource, 'const prelandingHtmlValidation = useMemo', 'const prelandingValidationErrors');
assert(validationCall.includes('modernistoStartRequired: isFixedFormatOne'), 'Final validation must select the dedicated Format 1 contract.');
assert(!validationCall.includes('quizRequired:'), 'Format 1 must no longer be validated as an embedded quiz.');

// Format 6 remains a one-image landing with direct protected registration.
const imageSpecBuilder = sliceFunction(appSource, 'buildPrelandingImageSpecs');
const barrierImageBranch = sliceBetween(imageSpecBuilder, 'if (isBarrierProfile) {', '\n  const semanticHeroScene');
assert.equal(count(barrierImageBranch, /slot:\s*'hero'/g), 1, 'Format 6 must generate one hero image.');
assert(!/slot:\s*'(?:value|cta)'/.test(barrierImageBranch), 'Format 6 must not generate value or CTA images.');

const formatSixRenderer = sliceFunction(appSource, 'renderStaticInsightPrelanding');
[
  'data-atmospace-registration-section',
  "renderAtmospaceRegistrationButton('fh-si-cta')",
  'buildAtmospacePrelandingTrackingScript',
  'https://modernisto.ru/politics',
  'https://modernisto.ru/approval'
].forEach((snippet) => assert(formatSixRenderer.includes(snippet), `Format 6 must include ${snippet}`));
assert(!formatSixRenderer.includes('data-atmospace-inline-quiz'), 'Format 6 must not emit an inline quiz.');
const registrationButtonRenderer = sliceFunction(appSource, 'renderAtmospaceRegistrationButton');
assert(registrationButtonRenderer.includes('data-atmospace-registration-link'), 'Format 6 registration CTA must remain bound to the protected runtime.');
const generatedFormatSixRoute = generatedPrelandingFlow.slice(generatedPrelandingFlow.indexOf('const insightPreset ='));
[
  "prelandingMode: 'barrierProfileQuiz'",
  'sceneImage: currentPrelandingAiImages.sceneImage',
  "valueImage: ''",
  "ctaImage: ''"
].forEach((snippet) => assert(generatedFormatSixRoute.includes(snippet), `Format 6 route must include ${snippet}`));

// Build output must expose the new fixed contract, not the removed Format 1 inline funnel.
const distAssetsDir = path.join(root, 'dist', 'assets');
const bundle = fs.existsSync(distAssetsDir)
  ? fs.readdirSync(distAssetsDir)
    .filter((file) => /^index-.*\.js$/.test(file))
    .sort((a, b) => fs.statSync(path.join(distAssetsDir, b)).mtimeMs - fs.statSync(path.join(distAssetsDir, a)).mtimeMs)[0]
  : null;
assert(bundle, 'Built JS bundle not found. Run npm run build first.');
const built = fs.readFileSync(path.join(distAssetsDir, bundle), 'utf8');
[
  'Формат 1 / Точный modernisto.ru/start',
  'Формат 6 / Смысловой профиль барьера',
  'Готовый HTML для Tilda',
  'atmosfera-30-landing',
  'data-atmospace-format="1"',
  'data-a30l-action="quiz"',
  'Ты уже не первый год пытаешься перейти на новый уровень:',
  'Андрей Золотарёв',
  'data:image/avif;base64,',
  'midnight-blue',
  'daylight-blue',
  'warm-studio',
  'a30l-approved-visual-variants',
  'a30l-goal-icon',
  'M7 17 17 7M9 7h8v8',
  attributionUrl,
  quizUrl,
  'window.ATMOSPACE_LANDING_CONFIG',
  'data-atmospace-registration-link'
].forEach((snippet) => assert(built.includes(snippet), `Built bundle must contain ${snippet}`));
[
  /Формат [2-5]\s*(?:\/|:)/,
  /один из шести форматов/,
  /Доступны шесть форматов предлендинга/
].forEach((pattern) => assert(!pattern.test(built), `Built bundle must not match ${pattern}`));

console.log('Atmospace prelanding Formats 1/6 contract passed');
