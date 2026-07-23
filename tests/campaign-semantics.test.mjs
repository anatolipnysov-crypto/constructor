import assert from 'node:assert/strict';
import {
  buildCampaignLandingLogic,
  pickCampaignVisualDirection,
  resolveCampaignSemanticProfile
} from '../src/data/campaignSemantics.js';

const cases = [
  {
    id: 'salary-gap',
    title: 'Зарплата пришла — а денег снова почти нет?',
    text: 'Так каждый месяц? Разберитесь, почему зарплата заканчивается раньше срока.',
    required: ['зарплат', 'остаток', 'месяц']
  },
  {
    id: 'own-course',
    title: 'Хватит насиловать душу не своим делом!',
    text: 'Каждое утро идёшь туда, где душе плохо. Узнай, почему ты там застрял.',
    required: ['курс', 'путь', 'направ']
  },
  {
    id: 'effort-stagnation',
    title: 'Работаете всё больше, а доход почти не растёт?',
    text: 'Работы больше, а жизнь не меняется. Разберитесь, почему доход стоит на месте.',
    required: ['усили', 'работ', 'доход']
  },
  {
    id: 'family-choice',
    title: 'Ребёнок просит на кружок, а вы снова говорите «потом»?',
    text: 'Тяжело снова отказывать ребёнку. Узнайте, почему на важное постоянно не хватает.',
    required: ['ребен', 'семь', 'выбор']
  },
  {
    id: 'budget-shock',
    title: 'Сломалась техника — и весь бюджет месяца снова рухнул?',
    text: 'Одна поломка — и денег до зарплаты нет. Разберитесь, почему бюджет не держится.',
    required: ['полом', 'бюджет', 'запас']
  },
  {
    id: 'income-ceiling',
    title: 'Доход есть, но финансовый потолок уже чувствуется?',
    text: 'Разберитесь, что удерживает результат на прежнем уровне и где искать следующий рычаг роста.',
    required: ['доход', 'потолок', 'рост']
  }
];

const modes = ['templateStage', 'heroBlocks', 'natureEditorial', 'minimalCompare'];
const forbiddenGeneric = [
  'без своего продукта',
  'без долгого запуска',
  'без продаж в лоб',
  'какой следующий шаг откроется в выбранном мессенджере'
];

function assertVisualRotation(profile, seed) {
  assert.ok(Array.isArray(profile.bannerSubjectModes), `${profile.id} must define bannerSubjectModes`);
  assert.ok(Array.isArray(profile.bannerNoPersonDirections), `${profile.id} must define bannerNoPersonDirections`);
  assert.ok(profile.bannerNoPersonDirections.length >= 3, `${profile.id} needs several object/environment directions`);

  const directions = new Set();
  const visualModes = new Set();
  const personlessModes = new Set();

  for (let index = 0; index < 12; index += 1) {
    const visual = pickCampaignVisualDirection(profile, seed, index);
    assert.ok(visual.sceneLine?.trim(), `${profile.id} returned an empty sceneLine at index ${index}`);
    directions.add(`${visual.visualMode}|${visual.sceneTheme}|${visual.sceneLine}|${visual.compositionLine}|${visual.styleHint}`);
    visualModes.add(visual.visualMode);

    if (visual.visualMode === 'noPerson' || visual.visualMode === 'metaphor') {
      personlessModes.add(visual.visualMode);
      assert.equal(visual.persona, 'mixed', `${profile.id} ${visual.visualMode} must not force a person`);
      assert.ok(
        profile.bannerNoPersonDirections.includes(visual.sceneLine),
        `${profile.id} ${visual.visualMode} must use an object/environment direction`
      );
    } else {
      assert.equal(visual.visualMode, 'generatedPerson', `${profile.id} returned an unsupported visualMode`);
      assert.ok(profile.bannerDirections.includes(visual.sceneLine), `${profile.id} generatedPerson must use a person direction`);
    }
  }

  ['generatedPerson', 'noPerson', 'metaphor'].forEach((mode) => {
    assert.ok(visualModes.has(mode), `${profile.id} must rotate through ${mode}`);
  });
  assert.ok(personlessModes.size >= 1, `${profile.id} must produce at least one personless mode`);
  assert.ok(directions.size >= 6, `Visual rotation is too repetitive for ${profile.id}`);
}

for (const item of cases) {
  const profile = resolveCampaignSemanticProfile(item.title, item.text);
  assert.equal(profile.id, item.id, `Wrong semantic profile for: ${item.title}`);

  const modeBadges = new Set();
  for (const mode of modes) {
    const logic = buildCampaignLandingLogic({ title: item.title, text: item.text, mode });
    const content = JSON.stringify(logic).toLowerCase().replace(/ё/g, 'е');

    assert.equal(logic.title, item.title, `${mode} must preserve entered title`);
    assert.equal(logic.lead, item.text, `${mode} must preserve entered text`);
    assert.equal(logic.cards.length, 3, `${mode} must produce exactly three offer cards`);
    assert.equal(logic.valueItems.length, 3, `${mode} must produce exactly three value points`);
    assert(item.required.some(token => content.includes(token)), `${mode} lost the semantic angle ${item.id}`);
    forbiddenGeneric.forEach((phrase) => {
      assert(!content.includes(phrase), `${mode} reintroduced generic copy "${phrase}" for ${item.id}`);
    });
    modeBadges.add(logic.badge);
  }
  assert.equal(modeBadges.size, modes.length, `Four formats must use four distinct editorial framings for ${item.id}`);

  assertVisualRotation(profile, `${item.title}|test`);
}

const ownCourseProfile = resolveCampaignSemanticProfile(
  'Хватит насиловать душу не своим делом!',
  'Каждое утро идёшь туда, где душе плохо. Узнай, почему ты там застрял.'
);
assert.equal(ownCourseProfile.id, 'own-course');
assert.ok(ownCourseProfile.bannerDirections.some((item) => /штурвал/i.test(item)), 'Own-course semantics must support an active helm metaphor.');
assert.ok(ownCourseProfile.bannerDirections.some((item) => /не отпуск|не курорт/i.test(item)), 'The helm metaphor must be distinguished from a resort scene.');

const budgetShockProfile = resolveCampaignSemanticProfile(
  'Сломалась техника — и весь бюджет месяца снова рухнул?',
  'Одна поломка — и денег до зарплаты нет.'
);
assert.equal(budgetShockProfile.id, 'budget-shock');
assert.ok(Array.isArray(budgetShockProfile.prelandingVisualSceneSets), 'Budget shock must define complete three-frame scene sets.');
assert.ok(budgetShockProfile.prelandingVisualSceneSets.length >= 3, 'Budget shock must rotate at least three complete visual stories.');
budgetShockProfile.prelandingVisualSceneSets.forEach((set, index) => {
  assert.equal(set.length, 3, `Visual story ${index + 1} must contain hero, consequence and CTA scenes.`);
  assert.equal(new Set(set).size, 3, `Visual story ${index + 1} must contain three distinct scene prompts.`);
  const consequenceAndCta = `${set[1]} ${set[2]}`.toLowerCase();
  const explicitExclusion = index === 0 ? 'no appliance' : index === 1 ? 'no damaged phone' : 'no car';
  assert.ok(consequenceAndCta.includes(explicitExclusion), `Visual story ${index + 1} must explicitly exclude the hero problem object from later frames.`);
});

const customTitle = 'Почему привычный маршрут больше не приводит к цели?';
const customText = 'Покажем, какие детали стоит проверить до следующего решения.';
const groundedProfile = resolveCampaignSemanticProfile(customTitle, customText);
const groundedLogic = buildCampaignLandingLogic({
  title: customTitle,
  text: customText,
  mode: 'heroBlocks'
});
const groundedContent = JSON.stringify(groundedLogic).toLowerCase().replace(/ё/g, 'е');

assert.equal(groundedProfile.id, 'grounded-input', 'Unknown briefs must use the grounded input profile.');
assertVisualRotation(groundedProfile, `${customTitle}|grounded-test`);
assert.equal(groundedLogic.title, customTitle, 'Grounded fallback must preserve the exact custom title.');
assert.equal(groundedLogic.lead, customText, 'Grounded fallback must preserve the exact custom text.');
[
  'ситуация повторяется, хотя человек уже пытался действовать иначе',
  'скрытый механизм',
  'реальная взрослая жизнь'
].forEach((phrase) => {
  assert(!groundedContent.includes(phrase), `Grounded fallback must not reuse invented generic copy: ${phrase}`);
});
assert(groundedContent.includes(customTitle.toLowerCase()), 'Grounded fallback must keep the custom headline throughout the semantic package.');
assert(groundedContent.includes(customText.toLowerCase()), 'Grounded fallback must keep the custom support text throughout the semantic package.');

const fallbackProfile = resolveCampaignSemanticProfile('', '');
assert.equal(fallbackProfile.id, 'problem-route', 'Empty input must keep the generic fallback profile.');
assertVisualRotation(fallbackProfile, 'fallback-test');

console.log('Campaign semantic and visual diversity test passed');
