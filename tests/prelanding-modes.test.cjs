const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const source = fs.readFileSync(path.join(root, 'src', 'App.jsx'), 'utf8');
const bannerStudio = fs.readFileSync(path.join(root, 'src', 'components', 'AIBannerStudio.jsx'), 'utf8');

function sliceBetween(text, startSnippet, endSnippet) {
  const start = text.indexOf(startSnippet);
  const end = text.indexOf(endSnippet, start + startSnippet.length);
  assert(start !== -1, `Source must include ${startSnippet}`);
  assert(end !== -1, `Source must include ${endSnippet} after ${startSnippet}`);
  return text.slice(start, end);
}

const modeSelector = sliceBetween(source, 'const MANUAL_PRELANDING_MODES = [', '];');
const modeIds = [...modeSelector.matchAll(/\bid:\s*'([^']+)'/g)].map((match) => match[1]);
assert(
  JSON.stringify(modeIds) === JSON.stringify([
    'templateStage',
    'barrierProfileQuiz'
  ]),
  'The selector must expose exactly Formats 1 and 6.'
);

[
  "title: 'Формат 1 / Мини-тест + разбор'",
  "title: 'Формат 6 / Смысловой профиль барьера'"
].forEach((snippet) => {
  assert(modeSelector.includes(snippet), `Mode selector must include ${snippet}`);
});

assert(!modeSelector.includes("id: 'personalRouteQuiz'"), 'Removed legacy modes must not appear in the selector.');
assert(source.includes('один из двух форматов'), 'Constructor copy must describe the two-format surface.');
assert(source.includes('Доступны два формата предлендинга: 1 и 6.'), 'Mode selector must describe Formats 1 and 6.');
[
  'один из шести форматов',
  'Доступны шесть форматов предлендинга',
  'один из четырёх форматов'
].forEach((snippet) => {
  assert(!source.includes(snippet), `Stale format copy must not remain: ${snippet}`);
});

const fixedQuiz = sliceBetween(source, 'const ATMOSPACE_MINI_QUIZ = Object.freeze([', ']);');
assert((fixedQuiz.match(/title:/g) || []).length === 4, 'Format 1 must contain exactly four fixed questions.');
[
  'Сколько лет ты уже говоришь себе',
  'Если завтра тебя не станет',
  'Представь прошло 5 лет',
  'Каким мужчиной ты себя видишь прямо сейчас'
].forEach((question) => {
  assert(fixedQuiz.includes(question), `Fixed quiz must contain: ${question}`);
});

const formatOneRenderer = sliceBetween(
  source,
  'function renderCoreMethodInlinePrelanding',
  'function staticLandingSlug'
);
[
  'renderCoreMethodMiniQuiz()',
  'renderAtmospaceQuizButton',
  "renderAtmospaceQuizButton('atm-v1-primary', 'Пройти тест')",
  'data-atmospace-first-fold',
  'data-atmospace-first-fold-cta',
  '--atm-hero-bg:#07111f',
  'background:var(--atm-hero-bg)',
  'color:#fff',
  'renderCoreMethodCompactOffer',
  'buildAtmospacePrelandingTrackingScript'
].forEach((snippet) => {
  assert(formatOneRenderer.includes(snippet), `Format 1 must include ${snippet}`);
});
assert(!formatOneRenderer.includes('.atm-v1-hero{position:relative;min-height:min(900px,100svh)'), 'Format 1 must not regress to the pale split hero.');

const imageSpecBuilder = sliceBetween(
  source,
  'function buildPrelandingImageSpecs',
  'function prelandingThemeForStyle'
);
[
  'High-contrast premium masculine editorial photography',
  'never as a generic man in a blue shirt sitting beside a laptop',
  'Never use pale pastel haze or a washed-out white page look',
  "persona: isCoreMethod ? 'man'",
  'Masculine visual language comes from decisive composition',
  'A person is optional and must never be the automatic default',
  'face and torso centered around 68-74 percent of frame width',
  "persona: 'mixed'",
  "visualMode: 'metaphor'"
].forEach((snippet) => {
  assert(imageSpecBuilder.includes(snippet), `Format 1 image contract must include ${snippet}`);
});

[
  '.atm-v1-hero-visual{position:absolute;z-index:0;inset:0 0 0 30%',
  'object-position:66% 50%',
  'object-position:68% 12%'
].forEach((snippet) => {
  assert(formatOneRenderer.includes(snippet), `Format 1 hero framing must include ${snippet}`);
});

const formatOneQuizRenderer = sliceBetween(
  source,
  'function renderCoreMethodMiniQuiz',
  'function renderAtmospaceSharedInlineQuiz'
);
assert(
  formatOneQuizRenderer.includes('data-atmospace-question-count="4"'),
  'Format 1 quiz renderer must declare exactly four questions.'
);
[
  'data-atmospace-option="${optionIndex}"',
  'data-atmospace-result-title',
  'data-atmospace-result-copy',
  'Ответы остаются только в этой вкладке и никуда не отправляются.'
].forEach((snippet) => {
  assert(formatOneQuizRenderer.includes(snippet), `Format 1 local result must include ${snippet}`);
});

const trackingRuntime = sliceBetween(
  source,
  'function buildAtmospacePrelandingTrackingScript',
  'function stripHtml'
);
[
  'var localAnswerChoices = [];',
  'localAnswerChoices[index] =',
  'function renderPersonalResult()',
  "resultTitle.textContent = profile.title",
  "resultCopy.textContent = profile.copy"
].forEach((snippet) => {
  assert(trackingRuntime.includes(snippet), `Format 1 runtime must build its result locally: ${snippet}`);
});
assert(!trackingRuntime.includes('localStorage'), 'Format 1 answers must not be persisted in localStorage.');
assert(!trackingRuntime.includes('sessionStorage'), 'Format 1 answers must not be persisted in sessionStorage.');
assert.doesNotMatch(
  trackingRuntime,
  /payload\.(?:answer|answer_index|option|option_index)|(?:answer|answer_index|option|option_index)\s*:/i,
  'Format 1 answer content and selected option index must not enter Atmospace payloads.'
);

const insightRenderer = sliceBetween(
  source,
  'function renderStaticInsightPrelanding',
  'function renderBarrierProfileQuizPrelanding'
);
[
  'data-atmospace-registration-section',
  'data-atmospace-first-fold',
  'data-atmospace-first-fold-cta',
  "renderAtmospaceRegistrationButton('fh-si-cta')",
  'https://modernisto.ru/politics',
  'https://modernisto.ru/approval',
  'buildAtmospacePrelandingTrackingScript'
].forEach((snippet) => {
  assert(insightRenderer.includes(snippet), `Format 6 must include ${snippet}`);
});
assert(!insightRenderer.includes('data-atmospace-inline-quiz'), 'Format 6 must not emit inline quiz markup.');
assert(!insightRenderer.includes('data-atmospace-embedded-quiz'), 'Format 6 must not emit embedded quiz markup.');
assert(insightRenderer.includes('grid-template-rows:auto minmax(190px,30svh)'), 'Format 6 mobile copy and CTA must render before media.');
assert(insightRenderer.includes('.fh-si-media{order:0'), 'Format 6 mobile media must stay after the first-fold CTA.');
assert(!insightRenderer.includes('.fh-si-media{order:-1'), 'Format 6 must not place mobile media before its CTA.');
assert(formatOneRenderer.includes('atm-v1-mobile-cta'), 'Format 1 must expose a mobile CTA immediately after the headline.');
assert(formatOneRenderer.includes('4 вопроса · около минуты · без телефона'), 'Format 1 mobile CTA must explain the short flow.');

const dispatch = sliceBetween(source, 'function renderPrelandingHtml', 'function countMatches');
[
  'renderCoreMethodInlinePrelanding({',
  'renderBarrierProfileQuizPrelanding({'
].forEach((snippet) => {
  assert(dispatch.includes(snippet), `Main renderer must dispatch to ${snippet}`);
});
[
  'renderHeroSceneBlocksPrelanding({',
  'renderNatureEditorialPrelanding({',
  'renderMinimalComparePrelanding({',
  'renderDirectionQuizPrelanding({',
  'renderPersonalRouteQuizPrelanding({'
].forEach((snippet) => {
  assert(!dispatch.includes(snippet), `Main renderer must not dispatch to removed mode: ${snippet}`);
});
assert(
  dispatch.includes("const isCoreMethod = overrides?.prelandingMode === 'templateStage';"),
  'Normalized Format 1 must remain reachable as the core mini-quiz renderer.'
);

const generatedPrelandingFlow = sliceBetween(
  source,
  'const prelandingHtml = useMemo',
  'const prelandingHtmlConfig = useMemo'
);
assert.equal(
  (generatedPrelandingFlow.match(/return renderPrelandingHtml\(\{/g) || []).length,
  2,
  'Generated HTML must have exactly two explicit format routes.'
);
assert(generatedPrelandingFlow.includes("prelandingMode: 'coreMethod'"), 'Format 1 must call the core mini-quiz renderer.');
assert(generatedPrelandingFlow.includes("prelandingMode: 'barrierProfileQuiz'"), 'Format 6 must call the barrier renderer.');
assert(!generatedPrelandingFlow.includes('if (prelandingSync?.fromBanner)'), 'Banner handoff must not bypass the selected format.');
assert(!generatedPrelandingFlow.includes('overrides: prelandingSync'), 'Generated HTML must not fall through to a legacy renderer override.');

assert(
  source.includes("В формате без мини-теста найдена видимая квиз-разметка. Используйте прямую регистрацию Atmospace."),
  'The validator must block visible quiz markup in Format 6.'
);
assert.match(
  source,
  /quizRequired:\s*normalizedManualPrelandingMode\s*===\s*['"]templateStage['"]/,
  'Final HTML validation must require the full quiz contract for Format 1.'
);
assert.doesNotMatch(
  source,
  /const htmlDeclaresEmbeddedQuiz\s*=/,
  'Validation must not infer the expected format from already-generated HTML.'
);
assert(
  !source.includes('Не удалось подготовить продолжение. Проверьте подключение и попробуйте ещё раз.'),
  'HTML validation must verify runtime structure instead of requiring an obsolete UI error sentence.'
);

[
  'window.ATMOSPACE_LANDING_CONFIG',
  'sergey-constructor-quiz-v1',
  'https://api.atmospace.pro',
  '/api/landing-runtime/init',
  '/api/landing-runtime/click',
  'data-atmospace-registration-link',
  'links.registration',
  'landing_view',
  'registration_started',
  'public_landing_key',
  'counter_id',
  'advertising_click_ids',
  'yclid',
  'utm_source'
].forEach((snippet) => {
  assert(source.includes(snippet), `Atmospace runtime contract must include ${snippet}`);
});

[
  'window.FH_CONFIG',
  'data-atmospace-messenger',
  'messenger_button_clicked',
  'r.bothelp.io',
  'supabase.co/functions/v1',
  'registration_click',
  'registration_success',
  'payment_success'
].forEach((snippet) => {
  assert(!dispatch.includes(snippet), `Active dispatcher must not contain the legacy contract: ${snippet}`);
});

[
  'const generationProgress = new Map(specs.map',
  'const specsToGenerate = specs.filter',
  'const settledResults = await Promise.allSettled(specsToGenerate.map(async (spec) =>',
  "const failedResult = settledResults.find((result) => result.status === 'rejected')",
  'Одновременно генерирую ${states.length} AI-картинки.',
  'const PRELANDING_IMAGE_ATTEMPTS = 3;',
  'const resumableAiState = prelandingAiImages?.key === buildKey && !prelandingAiImagesReady',
  'готовые кадры сохранены, генерирую только недостающие',
  'конструктор продолжит только с недостающих'
].forEach((snippet) => {
  assert(source.includes(snippet), `Resumable image generation must include ${snippet}`);
});
assert(!source.includes('for (let index = 0; index < specs.length; index += 1)'), 'Premium images must not be generated sequentially.');

[
  "from './data/campaignSemantics'",
  'buildCampaignLandingLogic({ title, text: method, mode })',
  'normalizeManualPrelandingMode(manualPrelandingMode)',
  'const normalizedManualPrelandingMode = normalizeManualPrelandingMode(manualPrelandingMode)',
].forEach((snippet) => {
  assert(source.includes(snippet), `Semantic landing flow must include ${snippet}`);
});
assert(
  source.includes("const isCoreMethod = normalizedMode === 'templateStage';"),
  'Format 1 image generation must use the normalized mode and its masculine high-contrast prompt.'
);
assert(
  source.includes('Один код нельзя использовать как две независимые вариации.'),
  'Constructor must warn operators to separate Atmospace codes for Format 1/6 A/B attribution.'
);

[
  "from '../data/campaignSemantics'",
  'semanticSceneLine: visualRoute.semanticSceneLine',
  'semanticCompositionLine: visualRoute.semanticCompositionLine'
].forEach((snippet) => {
  assert(bannerStudio.includes(snippet), `Banner semantic flow must include ${snippet}`);
});
assert(bannerStudio.includes("mode: 'templateStage'"), 'Banner handoff must use Format 1 semantics.');
assert(!bannerStudio.includes("mode: 'heroBlocks'"), 'Banner handoff must not reactivate the removed heroBlocks mode.');
assert(!bannerStudio.includes('lockTemplateCopy: true'), 'Banner handoff must not lock stale template copy.');

const distAssetsDir = path.join(root, 'dist', 'assets');
const bundle = fs.existsSync(distAssetsDir)
  ? fs.readdirSync(distAssetsDir)
    .filter((file) => /^index-.*\.js$/.test(file))
    .sort((a, b) => fs.statSync(path.join(distAssetsDir, b)).mtimeMs - fs.statSync(path.join(distAssetsDir, a)).mtimeMs)[0]
  : null;

assert(bundle, 'Built JS bundle not found. Run npm run build first.');
const built = fs.readFileSync(path.join(distAssetsDir, bundle), 'utf8');
[
  'Формат 1 / Мини-тест + разбор',
  'Формат 6 / Смысловой профиль барьера',
  'Готовый HTML для Tilda',
  'window.ATMOSPACE_LANDING_CONFIG',
  'https://api.atmospace.pro',
  '/api/landing-runtime/init',
  '/api/landing-runtime/click',
  'data-atmospace-registration-link',
  'data-atmospace-question-count="4"',
  'Проверка пройдена. HTML готов к копированию.'
].forEach((snippet) => {
  assert(built.includes(snippet), `Built bundle must contain ${snippet}`);
});

[
  /Формат [2-5]\s*(?:\/|:)/,
  /один из шести форматов/,
  /Доступны шесть форматов предлендинга/,
  /data-atmospace-messenger/,
  /messenger_button_clicked/,
  /r\.bothelp\.io/,
  /supabase\.co\/functions\/v1/,
  /registration_click/,
  /registration_success/,
  /payment_success/
].forEach((pattern) => {
  assert(!pattern.test(built), `Built bundle must not match ${pattern}`);
});

console.log('Atmospace prelanding two-format contract passed');
