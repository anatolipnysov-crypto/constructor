const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const source = fs.readFileSync(path.join(root, 'src', 'App.jsx'), 'utf8');
const bannerStudio = fs.readFileSync(path.join(root, 'src', 'components', 'AIBannerStudio.jsx'), 'utf8');

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

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
    'heroBlocks',
    'natureEditorial',
    'minimalCompare',
    'directionQuiz',
    'barrierProfileQuiz'
  ]),
  'The selector must expose exactly the six approved landing formats.'
);

[
  "title: 'Формат 1 / Мини-тест + разбор'",
  "title: 'Формат 2 / Hero-картинка + блоки'",
  "title: 'Формат 3 / Nature editorial'",
  "title: 'Формат 4 / Тихое сравнение'",
  "title: 'Формат 5 / Маршрут действия'",
  "title: 'Формат 6 / Профиль барьера'"
].forEach((snippet) => {
  assert(modeSelector.includes(snippet), `Mode selector must include ${snippet}`);
});

assert(!modeSelector.includes("id: 'personalRouteQuiz'"), 'Saved legacy modes must not appear as a seventh format.');
assert(source.includes('один из шести форматов'), 'Constructor copy must describe all six formats.');
assert(source.includes('Доступны шесть форматов предлендинга'), 'Mode selector must describe all six formats.');
assert(!source.includes('один из четырёх форматов'), 'Stale four-format copy must not remain.');

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
  'renderCoreMethodCompactOffer',
  'buildAtmospacePrelandingTrackingScript'
].forEach((snippet) => {
  assert(formatOneRenderer.includes(snippet), `Format 1 must include ${snippet}`);
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

const ordinaryRenderers = sliceBetween(
  source,
  'function renderHeroSceneBlocksPrelanding',
  'function renderCoreMethodMiniQuiz'
);
[
  'function renderHeroSceneBlocksPrelanding',
  'function renderNatureEditorialPrelanding',
  'function renderMinimalComparePrelanding',
  'renderAtmospaceRegistrationButton'
].forEach((snippet) => {
  assert(ordinaryRenderers.includes(snippet), `Formats 2-4 must include ${snippet}`);
});
assert(!ordinaryRenderers.includes('renderAtmospaceSharedInlineQuiz({'), 'Formats 2-4 must not embed the shared quiz.');
assert(!ordinaryRenderers.includes('data-atmospace-embedded-quiz="true"'), 'Formats 2-4 must not emit visible quiz markup.');

const insightRenderer = sliceBetween(
  source,
  'function renderStaticInsightPrelanding',
  'function renderDirectionQuizPrelanding'
);
[
  'data-atmospace-registration-section',
  "renderAtmospaceRegistrationButton('fh-si-cta')",
  'buildAtmospacePrelandingTrackingScript'
].forEach((snippet) => {
  assert(insightRenderer.includes(snippet), `Formats 5-6 must include ${snippet}`);
});
assert(!insightRenderer.includes('data-atmospace-inline-quiz'), 'Formats 5-6 must not emit inline quiz markup.');
assert(!insightRenderer.includes('data-atmospace-embedded-quiz'), 'Formats 5-6 must not emit embedded quiz markup.');

const dispatch = sliceBetween(source, 'function renderPrelandingHtml', 'function countMatches');
[
  'renderCoreMethodInlinePrelanding({',
  'renderHeroSceneBlocksPrelanding({',
  'renderNatureEditorialPrelanding({',
  'renderMinimalComparePrelanding({',
  'renderDirectionQuizPrelanding({',
  'renderBarrierProfileQuizPrelanding({'
].forEach((snippet) => {
  assert(dispatch.includes(snippet), `Main renderer must dispatch to ${snippet}`);
});

const validationCall = [
  'validateAtmospaceTildaHtml(prelandingHtml, prelandingHtmlConfig, {',
  "      quizRequired: manualPrelandingMode === 'templateStage'",
  '    })'
].join('\n');
assert(source.includes(validationCall), 'HTML validation must require quiz markers only for Format 1.');
assert(
  source.includes("В формате без мини-теста найдена видимая квиз-разметка. Используйте прямую регистрацию Atmospace."),
  'The validator must block visible quiz markup in Formats 2-6.'
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
  "resolveClientPrelandingLogic(title, enteredText, 'heroBlocks')",
  "resolveClientPrelandingLogic(title, enteredText, 'natureEditorial')",
  "resolveClientPrelandingLogic(title, enteredText, 'minimalCompare')",
  'resolveClientPrelandingLogic(title, enteredText, manualPrelandingMode)'
].forEach((snippet) => {
  assert(source.includes(snippet), `Semantic landing flow must include ${snippet}`);
});

[
  "from '../data/campaignSemantics'",
  'semanticSceneLine: visualRoute.semanticSceneLine',
  'semanticCompositionLine: visualRoute.semanticCompositionLine'
].forEach((snippet) => {
  assert(bannerStudio.includes(snippet), `Banner semantic flow must include ${snippet}`);
});
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
  'Формат 2 / Hero-картинка + блоки',
  'Формат 3 / Nature editorial',
  'Формат 4 / Тихое сравнение',
  'Формат 5 / Маршрут действия',
  'Формат 6 / Профиль барьера',
  'Готовый HTML для Tilda',
  'window.ATMOSPACE_LANDING_CONFIG',
  'https://api.atmospace.pro',
  '/api/landing-runtime/init',
  '/api/landing-runtime/click',
  'data-atmospace-registration-link',
  'data-atmospace-question-count="4"',
  'Проверка пройдена: Tilda HTML собран на Atmospace runtime'
].forEach((snippet) => {
  assert(built.includes(snippet), `Built bundle must contain ${snippet}`);
});

[
  /Формат 5 \/ Квиз-направление/,
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

console.log('Atmospace prelanding six-format contract passed');
