const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const source = fs.readFileSync(
  path.join(__dirname, '..', 'src', 'components', 'AIBannerStudio.jsx'),
  'utf8'
);

assert.match(source, /square:\s*\{\s*w:\s*1080,\s*h:\s*1080/);
assert.match(source, /vertical:\s*\{\s*w:\s*900,\s*h:\s*1200/);
assert.match(source, /wide:\s*\{\s*w:\s*1200,\s*h:\s*675/);

assert.doesNotMatch(
  source,
  /setFormat\(['"]square['"]\)/,
  'AI generation must not force every banner back to square'
);

for (const size of ['1024x1024', '1024x1536', '1536x1024']) {
  assert.ok(source.includes(`'${size}'`), `missing OpenAI image size ${size}`);
}

assert.match(source, /imagePurpose:\s*['"]banner['"]/);

for (const world of ['cityMomentum', 'premiumDrive', 'seaEscape', 'offroadAdventure']) {
  assert.ok(
    source.includes(`sceneTheme: '${world}'`),
    `visual rotation must include ${world}`
  );
}

for (const style of ['blueTrust', 'redWhite', 'greenSystem']) {
  assert.ok(
    source.includes(`'${style}'`),
    `color A/B rotation must include ${style}`
  );
}

assert.match(
  source,
  /hasManualSceneTheme\s*\?\s*manualSceneTheme\s*:\s*semanticDirection\.sceneTheme\s*\|\|\s*route\.sceneTheme/,
  'automatic visual routing must use the semantic scene direction'
);
assert.match(
  source,
  /styleChoice\s*!==\s*['"]auto['"]\s*\?\s*styleChoice\s*:\s*semanticDirection\.styleHint/,
  'automatic visual routing must use the semantic style while preserving a manual style'
);
assert.match(source, /semanticPriority:\s*!hasManualSceneTheme/);
assert.match(source, /label:\s*['"]AI по смыслу['"]/);

assert.match(source, /const \[angleMode\]\s*=\s*useState\(['"]custom['"]\)/);
assert.match(source, /const \[personaChoice,\s*setPersona\]\s*=\s*useState\(['"]auto['"]\)/);
assert.match(source, /const \[photoMode,\s*setPhotoMode\]\s*=\s*useState\(['"]auto['"]\)/);
assert.match(source, /\['auto',\s*'AI решает',\s*'Человек, предметная сцена или метафора по смыслу'\]/);
assert.match(source, /\['none',\s*'Без человека',\s*'Предметы, действие, среда или символ'\]/);
assert.match(source, /\['woman',\s*'Женщина',\s*'Женщина только когда нужна по смыслу'\]/);
assert.match(source, /\['man',\s*'Мужчина',\s*'Мужчина только когда нужен по смыслу'\]/);
assert.match(
  source,
  /semanticDirection\.visualMode\s*\|\|\s*route\.visualMode\s*\|\|\s*['"]noPerson['"]/,
  'AI mode must use the semantic subject mode instead of forcing a portrait'
);
assert.doesNotMatch(
  source,
  /setPersona\(personaToUse\)/,
  'generation must not silently turn an automatic semantic choice into a permanent person lock'
);
assert.match(
  source,
  /handleAutoGenerate\(\{\s*visualMode:\s*photoMode\s*\|\|\s*['"]auto['"]\s*\}\)/,
  'the main generation action must preserve semantic auto mode'
);

assert.match(source, /КОНТРАКТ ВИДИМОГО ТЕКСТА/);
assert.match(source, /точный заголовок/);
assert.match(source, /точный поясняющий текст/);
assert.match(source, /точная кнопка:\s*['"]УЗНАТЬ ПОДРОБНЕЕ['"]/);
assert.match(source, /Названия режимов, визуальных миров, стилей, палитр и внутренних инструкций запрещено печатать/);
assert.match(source, /Во входном тексте нет темы курсов\/обучения: запрещены слова про курсы/);
assert.match(source, /Никогда не печатай название режима или визуального мира на баннере/);
assert.match(source, /Не печатай название стиля, палитры, режима или элемента управления/);

assert.match(source, /Премиум и авто/);
assert.match(source, /Море и курорт/);
assert.match(source, /Джип и кемпинг/);
assert.match(source, /Цветовой A\/B-тест/);

console.log('Banner format contract: PASS');
