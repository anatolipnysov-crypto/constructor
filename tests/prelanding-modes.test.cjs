const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const source = fs.readFileSync(path.join(root, 'src', 'App.jsx'), 'utf8');
const bannerStudio = fs.readFileSync(path.join(root, 'src', 'components', 'AIBannerStudio.jsx'), 'utf8');

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const rendererStart = source.indexOf('function renderPrelandingHtml');
const rendererEnd = source.indexOf('function countMatches', rendererStart);
assert(rendererStart !== -1, 'renderPrelandingHtml must exist.');
assert(rendererEnd !== -1, 'countMatches must follow renderPrelandingHtml.');

const renderer = source.slice(rendererStart, rendererEnd);
const quizRendererStart = source.indexOf('function renderInteractiveQuizPrelanding');
const quizRendererEnd = source.indexOf('function renderPrelandingHtml', quizRendererStart);
assert(quizRendererStart !== -1, 'renderInteractiveQuizPrelanding must exist.');
assert(quizRendererEnd !== -1, 'renderPrelandingHtml must follow the quiz renderers.');
const quizRenderer = source.slice(quizRendererStart, quizRendererEnd);

[
  "id: 'templateStage'",
  "title: 'Формат 1 / Метод + 3 блока'",
  "id: 'heroBlocks'",
  "title: 'Формат 2 / Hero-картинка + блоки'",
  "id: 'natureEditorial'",
  "title: 'Формат 3 / Nature editorial'",
  "id: 'minimalCompare'",
  "title: 'Формат 4 / Тихое сравнение'",
  "id: 'directionQuiz'",
  "title: 'Формат 5 / Квиз-направление'",
  "id: 'personalRouteQuiz'",
  "title: 'Формат 6 / Личный маршрут'",
  "id: 'barrierProfileQuiz'",
  "title: 'Формат 7 / Профиль барьера'",
  'renderCoreMethodInlinePrelanding({',
  'renderHeroSceneBlocksPrelanding({',
  'renderNatureEditorialPrelanding({',
  'renderMinimalComparePrelanding({',
  'renderDirectionQuizPrelanding({',
  'renderPersonalRouteQuizPrelanding({',
  'renderBarrierProfileQuizPrelanding({',
  'renderInteractiveQuizPrelanding({',
  'window.ATMOSPACE_LANDING_CONFIG',
  'sergey-constructor-atmospace-v1',
  'https://api.atmospace.pro',
  '/api/landing-runtime/init',
  '/api/landing-runtime/click',
  'data-atmospace-messenger="telegram"',
  'data-atmospace-messenger="max"',
  'validateAtmospaceTildaHtml(prelandingHtml, prelandingHtmlConfig)',
  'buildAtmospaceLandingConfig({',
  'activeLandingRuntimeArtifact?.publicLandingKey'
].forEach((snippet) => {
  assert(source.includes(snippet), `Source must include ${snippet}`);
});

assert(source.includes('один из семи форматов'), 'Constructor copy must describe all seven available formats.');
assert(source.includes('Доступны семь форматов предлендинга'), 'Mode selector must describe all seven available formats.');
assert(!source.includes('один из четырёх форматов'), 'Stale four-format copy must not remain in the constructor.');

[
  'prelandingVisualSceneSets',
  'Three-image story contract:',
  'A different person beside the same appliance still counts as repetition and is forbidden.',
  'Only the hero may feature the broken object.',
  'Hard exclusion: do not show the hero problem object, washing machine, laundry room, broken appliance',
  'Hard exclusion: no broken object, no washing machine, no laundry room, no appliance, no car breakdown'
].forEach((snippet) => {
  assert(source.includes(snippet), `Three-frame semantic diversity contract must include ${snippet}`);
});

[
  'const generationProgress = new Map(specs.map',
  'const specsToGenerate = specs.filter',
  'const settledResults = await Promise.allSettled(specsToGenerate.map(async (spec) =>',
  "const failedResult = settledResults.find((result) => result.status === 'rejected')",
  'Одновременно генерирую ${states.length} AI-картинки.',
  "return [spec.slot, imageUrl]"
].forEach((snippet) => {
  assert(source.includes(snippet), `Prelanding images must be generated in parallel: ${snippet}`);
});

assert(
  !source.includes('for (let index = 0; index < specs.length; index += 1)'),
  'Prelanding image generation must not wait for three premium images sequentially.'
);

[
  'const PRELANDING_IMAGE_ATTEMPTS = 3;',
  'const resumableAiState = prelandingAiImages?.key === buildKey && !prelandingAiImagesReady',
  'const cachedImages = resumableAiState?.images || {};',
  'готовые кадры сохранены, генерирую только недостающие',
  'конструктор продолжит только с недостающих'
].forEach((snippet) => {
  assert(source.includes(snippet), `Resumable prelanding generation must include ${snippet}`);
});

[
  "from './data/campaignSemantics'",
  'buildCampaignLandingLogic({ title, text: method, mode })',
  "pills: hasOverride('pills')",
  "cards: hasOverride('cards')",
  "proofItems: hasOverride('proofItems')",
  "resolveClientPrelandingLogic(title, enteredText, 'heroBlocks')",
  "resolveClientPrelandingLogic(title, enteredText, 'natureEditorial')",
  "resolveClientPrelandingLogic(title, enteredText, 'minimalCompare')",
  'resolveClientPrelandingLogic(title, enteredText, manualPrelandingMode)'
].forEach((snippet) => {
  assert(source.includes(snippet), `Semantic prelanding flow must include ${snippet}`);
});

[
  'DIRECTION_QUIZ_PRESETS',
  'PERSONAL_ROUTE_QUIZ_PRESETS',
  'BARRIER_PROFILE_QUIZ_PRESETS',
  'DIRECTION_QUIZ_DESIGN_ROUTES',
  'PERSONAL_ROUTE_QUIZ_DESIGN_ROUTES',
  'BARRIER_PROFILE_QUIZ_DESIGN_ROUTES',
  'const isQuizPrelandingMode',
  'OpenAI генерирует одну смысловую hero-картинку',
  'Сгенерировать hero-картинку и HTML'
].forEach((snippet) => {
  assert(source.includes(snippet), `Quiz generation flow must include ${snippet}`);
});

[
  "from '../data/campaignSemantics'",
  'semanticSceneLine: visualRoute.semanticSceneLine',
  'semanticCompositionLine: visualRoute.semanticCompositionLine'
].forEach((snippet) => {
  assert(bannerStudio.includes(snippet), `Banner semantic flow must include ${snippet}`);
});

assert(!bannerStudio.includes('lockTemplateCopy: true'), 'Banner to prelanding handoff must not lock old template copy.');

[
  'const title = enteredHeadline || stripHtml(baseContent.titleHtml',
  'const landingLogic = resolveClientPrelandingLogic(title, enteredText',
  "prelandingMode: 'coreMethod'",
  'cards: landingLogic.cards'
].forEach((snippet) => {
  assert(source.includes(snippet), `Format 1 must be driven by entered headline/text: ${snippet}`);
});

[
  'renderCoreMethodInlinePrelanding({',
  'renderHeroSceneBlocksPrelanding({',
  'renderNatureEditorialPrelanding({',
  'renderMinimalComparePrelanding({',
  'renderDirectionQuizPrelanding({',
  'renderPersonalRouteQuizPrelanding({',
  'renderBarrierProfileQuizPrelanding({'
].forEach((snippet) => {
  assert(renderer.includes(snippet), `Main prelanding renderer must call ${snippet}`);
});

[
  'renderAtmospaceMessengerButton',
  'buildAtmospacePrelandingTrackingScript',
  'id="atmospace-policy-consent"',
  'id="atmospace-policy-error"',
  'textContent=current.eyebrow',
  'options.replaceChildren()'
].forEach((snippet) => {
  assert(quizRenderer.includes(snippet), `Quiz renderer must use the shared safe runtime contract: ${snippet}`);
});

[
  'const isBarrierProfile = mode === \'barrierProfileQuiz\';',
  'const barrierProfileQuestions = [',
  'var barrierProfiles={',
  'data-quiz-result-copy',
  'Профиль барьера',
  'Открой короткий разбор и забери следующий шаг без нового рывка.'
].forEach((snippet) => {
  assert(quizRenderer.includes(snippet), `Barrier-profile quiz must include ${snippet}`);
});

assert(
  !/id="atmospace-policy-consent"[^>]*checked/.test(quizRenderer),
  'Quiz consent must require an explicit user action.'
);

[
  'window.FH_CONFIG',
  'DIRECTION_CONFIG',
  'lichnyy-marshrut.gayvoronskyluka.chatgpt.site',
  '/api/register',
  'data:image',
  'r.bothelp.io',
  'supabase.co/functions/v1',
  'fetch('
].forEach((snippet) => {
  assert(!quizRenderer.includes(snippet), `Quiz renderer must not include forbidden standalone integration: ${snippet}`);
});

[
  /validateGeneratedTildaHtml\(prelandingHtml,\s*prelandingHtmlConfig\)/,
  /Проверка пройдена: Tilda HTML собран на individual-core-v2/,
  /с FH_CONFIG, landing_variant/,
  /до BotHelp и smart-endpoint/,
  /data-fh-messenger="telegram"/,
  /data-fh-messenger="max"/,
  /window\.FH_CONFIG/
].forEach((pattern) => {
  assert(!renderer.includes('window.FH_CONFIG'), 'Active renderer must not emit window.FH_CONFIG.');
  assert(!pattern.test(source.slice(source.indexOf('const prelandingHtmlConfig'))), `Active prelanding flow must not match ${pattern}`);
});

const distAssetsDir = path.join(root, 'dist', 'assets');
const bundle = fs.existsSync(distAssetsDir)
  ? fs.readdirSync(distAssetsDir)
    .filter(file => /^index-.*\.js$/.test(file))
    .sort((a, b) => fs.statSync(path.join(distAssetsDir, b)).mtimeMs - fs.statSync(path.join(distAssetsDir, a)).mtimeMs)[0]
  : null;

assert(bundle, 'Built JS bundle not found. Run npm run build first.');

const built = fs.readFileSync(path.join(distAssetsDir, bundle), 'utf8');
[
  'Формат 1 / Метод + 3 блока',
  'Формат 2 / Hero-картинка + блоки',
  'Формат 3 / Nature editorial',
  'Формат 4 / Тихое сравнение',
  'Формат 5 / Квиз-направление',
  'Формат 6 / Личный маршрут',
  'Формат 7 / Профиль барьера',
  'Готовый HTML для Tilda',
  'window.ATMOSPACE_LANDING_CONFIG',
  'sergey-constructor-atmospace-v1',
  'https://api.atmospace.pro',
  '/api/landing-runtime/init',
  '/api/landing-runtime/click',
  'data-atmospace-messenger',
  'telegram',
  'max',
  'publicLandingKey',
  'counterId',
  'Проверка пройдена: Tilda HTML собран на Atmospace runtime'
].forEach((snippet) => {
  assert(built.includes(snippet), `Built bundle must contain ${snippet}`);
});

[
  /Готовый статический лендинг v1/,
  /Проверка пройдена: Tilda HTML собран на individual-core-v2/,
  /до BotHelp и smart-endpoint/,
  /sotkatracker\.ru\/funnel-proxy\.php\?route=smart-endpoint/
].forEach((pattern) => {
  assert(!pattern.test(built), `Built bundle must not match ${pattern}`);
});

console.log('Atmospace prelanding seven-format test passed');
