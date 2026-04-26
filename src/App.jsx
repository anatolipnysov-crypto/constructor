import { useState, useMemo, useEffect } from 'react';
import { Copy, Check, Wand2, BookOpen, User, Target, Rocket, AlertCircle, ChevronDown, RotateCcw, Eye, Download, Sun, Moon, Image as ImageIcon, Megaphone, Sparkles, Palette, Zap, Settings, FileText, Lightbulb, TrendingUp, Layers } from 'lucide-react';

/* ================== УТИЛИТЫ ================== */
async function copyToClipboard(text) {
  try {
    if (navigator?.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text); return true;
    }
  } catch (_) {}
  try {
    const ta = document.createElement('textarea');
    ta.value = text; ta.setAttribute('readonly', '');
    ta.style.cssText = 'position:fixed;left:-9999px;top:0;opacity:0;';
    document.body.appendChild(ta); ta.select(); ta.setSelectionRange(0, ta.value.length);
    const ok = document.execCommand('copy');
    document.body.removeChild(ta); return ok;
  } catch (_) { return false; }
}

function downloadFile(filename, content) {
  const blob = new Blob([content], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/* ================== ТЕКСТЫ ПРЕДЛЕНДИНГА ================== */
const TPL = [
  { id: 1, t: 'Без курсов и контента', a: 'Жёсткий разрыв', c: 'from-red-500 to-orange-500', h: 'Кардинально другой метод дохода в 2026г', p: ['Без курсов', 'Без контента', 'Без навыков'],
    txt: `Кардинально другой метод дохода в 2026г\n\nБез курсов. Без контента. Без навыков.\n\nУзнаете сценарий\n1. Купили 5+ курсов — результата ноль\n2. Вложили время и деньги — отдачи нет\n3. Годы усилий — всё те же 3 копейки\n4. Обещания гуру — пустой кошелёк\n\nВсё, хватит. Сколько вам нужно ещё времени и попыток, чтобы понять что это не работает.\n\nЕсть КАРДИНАЛЬНО ДРУГОЙ МЕТОД.\n\nЗа 8 минут вы в деталях увидите способ, который полностью изменит все ваши представления о том, как выйти на доход от 200 000 в мес.\n\nпочему вы тратите годы в попытках заработать 3 копейки и всё безрезультатно\n\nметод, который работает прямо сейчас в условиях блокировок и замедлений\n\nКак вырасти в доходе если ты НЕ умеешь писать контент, а все вокруг только и говорят «делать контент нужно каждый день». Спойлер — речь не про ИИ, не про навыки.\n\nВам не надоело покупать курсы и не видеть результата? Хватит. СМОТРИТЕ КАК МОЖНО ПО-ДРУГОМУ.` },
  { id: 2, t: 'Без продаж и маркетинга', a: 'Снятие возражений', c: 'from-blue-500 to-cyan-500', h: 'Кардинально другой метод создания онлайн-дохода в 2026г', p: ['Без продаж', 'Без маркетинга', 'Без соц. сетей', 'И даже без ИИ'],
    txt: `Кардинально другой метод создания онлайн-дохода в 2026г\n\nБез продаж\nБез маркетинга\nБез ведения соц. сетей\nИ даже без ИИ\n\nЗа 8 минут вы в деталях увидите способ, который полностью изменит все ваши представления о том, как выйти на доход от 200 000 в мес.\n\n- почему вы тратите годы в попытках заработать 3 копейки и всё безрезультатано\n- метод, который работает прямо сейчас в условиях блокировок и замедлений\n- Как вырасти в доходе если ты НЕ умеешь писать контент, а все вокруг только и говорят "делать контент нужно каждый день". Спойлер - речь не про ИИ, не про навыки.\n\nВам не надоело покупать курсы и не видеть результата? Хватит. СМОТРИТЕ КАК МОЖНО ПО ДРУГОМУ` },
  { id: 3, t: '5000Р за 2 часа', a: 'Доверие', c: 'from-emerald-500 to-green-500', h: 'Метод который позволяет заработать первые 5000Р за 2 часа', p: ['Не казино', 'Не крипта', 'Не ставки', 'Белый метод'],
    txt: `Метод который позволяет заработать первые 5000Р за 2 часа.\n\nНе казино\nНе крипта\nНе ставки\n\nНормальный, белый метод, который даёт результат без вложений.\n\nЗа 8 минут вы в деталях увидите способ, который полностью изменит все ваши представления о том, как выйти на доход от 200 000 в мес.\n\n- почему вы тратите годы в попытках заработать 3 копейки и всё безрезультатано\n- метод, который работает прямо сейчас в условиях блокировок и замедлений\n- Как вырасти в доходе если ты НЕ умеешь писать контент, а все вокруг только и говорят "делать контент нужно каждый день". Спойлер - речь не про ИИ, не про навыки.\n\nВам не надоело покупать курсы и не видеть результата? Хватит. СМОТРИТЕ КАК МОЖНО ПО ДРУГОМУ` }
];

/* ================== 30+ СТИЛЕЙ ================== */
const STYLES = [
  ['glassmorphism', 'Glassmorphism', '🪟', 'Стекло, размытие, прозрачность'],
  ['neumorphism', 'Neumorphism', '🫧', 'Мягкие выпуклые тени'],
  ['brutalism', 'Neo-Brutalism', '🔨', 'Жёсткие чёрные рамки, яркие блоки'],
  ['minimal', 'Минимализм', '⚪', 'Много воздуха, тонкая типографика'],
  ['darkmode', 'Тёмный премиум', '🌑', 'Глубокий чёрный, неоновые акценты'],
  ['gradient', 'Жидкие градиенты', '🌈', 'Анимированные mesh-градиенты'],
  ['tinkoff', 'Финтех (Тинькофф)', '💛', 'Жёлтый бренд, чёрный текст'],
  ['apple', 'Apple Style', '🍎', 'Огромная типографика, белое пространство'],
  ['cyberpunk', 'Cyberpunk', '⚡', 'Неон, glitch-эффекты'],
  ['y2k', 'Y2K Retro', '💿', 'Эстетика 2000-х, хром, голограммы'],
  ['memphis', 'Memphis / Pop', '🎨', 'Геометрия, ярко, весело'],
  ['magazine', 'Журнальный', '📰', 'Сетка как в Vogue, серифы'],
  ['holographic', 'Голографический', '✨', 'Переливы радуги, металлика'],
  ['cardflat', 'Карточный (Material)', '🃏', 'Чёткие карточки, мягкие тени'],
  ['3d', '3D Иллюстрации', '🎲', '3D-объекты, изометрия'],
  ['newspaper', 'Газетный', '🗞️', 'Имитация газеты, сенсация'],
  ['organic', 'Органический', '🌿', 'Округлые формы, природные цвета'],
  ['swiss', 'Swiss Design', '🇨🇭', 'Чёткая сетка, гротеск, минимум'],
  ['retro80', 'Retro 80s Synth', '🌆', 'Закатные градиенты, неон, синтвейв'],
  ['comic', 'Comic Book', '💥', 'Комиксы, halftone, BAM/POW'],
  ['terminal', 'Hacker Terminal', '💻', 'Чёрный фон, зелёный моноширинный'],
  ['paper', 'Paper Cut', '📄', 'Многослойная бумага, тени'],
  ['claymorphism', 'Claymorphism', '🧱', 'Глиняные 3D-формы, мягкость'],
  ['blueprint', 'Blueprint Tech', '📐', 'Синий чертёж, белые линии'],
  ['handdrawn', 'Hand-Drawn', '✏️', 'Рисованные элементы, неровности'],
  ['vaporwave', 'Vaporwave', '🌴', 'Розово-голубой, пальмы, статуи'],
  ['kinfolk', 'Kinfolk', '🍃', 'Бежевые тона, серифы, скандинавия'],
  ['blackgold', 'Black & Gold', '👑', 'Чёрный + золото, премиум'],
  ['monochrome', 'Монохром', '⚫', 'Только оттенки одного цвета'],
  ['risograph', 'Risograph', '🎭', 'Принтерные текстуры, наложения'],
  ['gameui', 'Game UI', '🎮', 'Игровой интерфейс, HP-bars, иконки'],
  ['liquid', 'Liquid Metal', '💧', 'Жидкий металл, текучесть, переливы']
];

/* ================== ЭФФЕКТЫ ================== */
const EFFECTS = [
  ['micro', '✨ Микроанимации при наведении'],
  ['fadein', '🪂 Плавное появление при скролле'],
  ['pulse', '💓 Пульсирующая главная кнопка'],
  ['gradient-anim', '🌊 Анимированный градиент фона'],
  ['parallax', '🏞️ Параллакс-скролл'],
  ['particles', '⭐ Частицы / точки на фоне'],
  ['glow', '💡 Свечение элементов (glow)'],
  ['tilt', '🎴 3D-наклон карточек'],
  ['typewriter', '⌨️ Эффект печатной машинки'],
  ['counter', '🔢 Анимированные счётчики'],
  ['marquee', '📜 Бегущая строка с пилюлями'],
  ['noise', '📺 Текстура шума (grain)'],
  ['blob', '🫧 Анимированные blob-фигуры'],
  ['emoji-rain', '🎉 Живые эмодзи'],
  ['shake', '⚠️ Лёгкая тряска у красных триггеров']
];

/* ================== ПАЛИТРЫ ================== */
const PALETTES = [
  ['red-energy', 'Красная энергия', '🔴', ['#ef4444', '#f97316', '#fbbf24']],
  ['blue-trust', 'Синее доверие', '🔵', ['#2563eb', '#06b6d4', '#0ea5e9']],
  ['green-money', 'Зелёные деньги', '🟢', ['#10b981', '#22c55e', '#84cc16']],
  ['tinkoff-yellow', 'Жёлтый финтех', '💛', ['#ffdd2d', '#222222', '#ffffff']],
  ['purple-magic', 'Фиолетовая магия', '🟣', ['#a855f7', '#ec4899', '#8b5cf6']],
  ['mono-noir', 'Чёрно-белый Noir', '⚫', ['#000', '#fff', '#737373']],
  ['sunset', 'Закат', '🌅', ['#f43f5e', '#fb923c', '#fbbf24']],
  ['ocean', 'Океан', '🌊', ['#0c4a6e', '#0891b2', '#67e8f9']],
  ['neon', 'Неон', '💜', ['#a3e635', '#22d3ee', '#e879f9']],
  ['earth', 'Земляные тона', '🟫', ['#78350f', '#a16207', '#facc15']],
  ['gold-black', 'Чёрно-золотой', '👑', ['#000', '#d4af37', '#fff']],
  ['mint-fresh', 'Мятная свежесть', '🌿', ['#14b8a6', '#22d3ee', '#fef3c7']],
  ['rose-gold', 'Розовое золото', '🌸', ['#fb7185', '#fda4af', '#fef3c7']],
  ['deep-space', 'Глубокий космос', '🌌', ['#020617', '#1e1b4b', '#7c3aed']]
];

const TYPOS = [
  ['manrope', 'Manrope', 'Современный геометрический'],
  ['inter', 'Inter', 'Универсальный'],
  ['unbounded', 'Unbounded', 'Жирный, премиальный'],
  ['onest', 'Onest / Gilroy', 'Чистый, профессиональный'],
  ['space-grotesk', 'Space Grotesk', 'Технологичный'],
  ['playfair', 'Playfair + Inter', 'Журнальный микс']
];

const LAYOUTS = [
  ['classic', 'Классический', '📐 Hero → Пилюли → Боль → Ценность → CTA'],
  ['split', 'Split-screen', '⚔️ Текст слева, визуал справа'],
  ['long', 'Длинный скролл', '📜 Каждый блок занимает экран'],
  ['magazine', 'Журнальная сетка', '🗞️ Асимметричная сетка'],
  ['cards', 'Стопка карточек', '🃏 Все блоки карточками']
];

/* ================== ПРЕСЕТЫ (ОДИН КЛИК) ================== */
const PRESETS = [
  { id: 'fintech', name: 'Финтех (Тинькофф)', emoji: '💛', desc: 'Жёлтый, доверие, банковский', tpl: 2, style: 'tinkoff', palette: 'tinkoff-yellow', typo: 'manrope', layout: 'classic', effects: ['micro', 'fadein', 'pulse', 'glow'] },
  { id: 'darkneon', name: 'Тёмный неон', emoji: '🌑', desc: 'Чёрный + неоновые акценты, хайп', tpl: 1, style: 'darkmode', palette: 'neon', typo: 'space-grotesk', layout: 'long', effects: ['micro', 'fadein', 'pulse', 'glow', 'particles', 'blob'] },
  { id: 'magazine', name: 'Журнальный премиум', emoji: '📰', desc: 'Vogue-стиль, серифы, контраст', tpl: 3, style: 'magazine', palette: 'mono-noir', typo: 'playfair', layout: 'magazine', effects: ['fadein', 'tilt'] },
  { id: 'brutal', name: 'Брутальный хайп', emoji: '🔨', desc: 'Жёсткие рамки, яркие блоки', tpl: 1, style: 'brutalism', palette: 'red-energy', typo: 'unbounded', layout: 'cards', effects: ['micro', 'shake', 'pulse', 'marquee'] },
  { id: 'apple', name: 'Apple Style', emoji: '🍎', desc: 'Минимализм, премиум-типографика', tpl: 2, style: 'apple', palette: 'mono-noir', typo: 'inter', layout: 'long', effects: ['fadein', 'parallax', 'micro'] },
  { id: 'glass', name: 'Стеклянный премиум', emoji: '🪟', desc: 'Glassmorphism, синий, доверие', tpl: 2, style: 'glassmorphism', palette: 'ocean', typo: 'manrope', layout: 'classic', effects: ['micro', 'fadein', 'glow', 'blob', 'gradient-anim'] },
  { id: 'cyber', name: 'Cyberpunk Hype', emoji: '⚡', desc: 'Неон, глитч, киберпанк', tpl: 1, style: 'cyberpunk', palette: 'deep-space', typo: 'space-grotesk', layout: 'cards', effects: ['glow', 'particles', 'shake', 'noise', 'pulse'] },
  { id: 'gold', name: 'Чёрно-золотой VIP', emoji: '👑', desc: 'Премиум, элита, статус', tpl: 3, style: 'blackgold', palette: 'gold-black', typo: 'playfair', layout: 'classic', effects: ['fadein', 'glow', 'micro', 'tilt'] },
  { id: 'organic', name: 'Органический эко', emoji: '🌿', desc: 'Мягкий, природный, доверие', tpl: 3, style: 'organic', palette: 'mint-fresh', typo: 'onest', layout: 'classic', effects: ['fadein', 'micro', 'blob'] },
  { id: 'memphis', name: 'Memphis Pop', emoji: '🎨', desc: 'Ярко, весело, привлекает', tpl: 1, style: 'memphis', palette: 'sunset', typo: 'unbounded', layout: 'magazine', effects: ['micro', 'shake', 'emoji-rain', 'pulse', 'tilt'] }
];

/* ================== ГЕНЕРАЦИЯ ПРОМТА ================== */
function buildPrompt({ tpl, style, effects, palette, layout, typo }) {
  const t = TPL.find(x => x.id === tpl);
  const s = STYLES.find(x => x[0] === style);
  const p = PALETTES.find(x => x[0] === palette);
  const l = LAYOUTS.find(x => x[0] === layout);
  const ty = TYPOS.find(x => x[0] === typo);
  const ef = EFFECTS.filter(e => effects.includes(e[0]));
  return `Ты — премиум веб-дизайнер и frontend-разработчик. Сгенерируй ОДНОСТРАНИЧНЫЙ ПРЕДЛЕНДИНГ для Яндекс.Директ (РСЯ), который вставляется в мини-лендинг BotHelp.

═══════════════════════════════════════════
🎯 ЦЕЛЬ
═══════════════════════════════════════════
Прогреть холодный трафик из РСЯ за 5–10 секунд и довести до клика по мессенджер-кнопкам (Telegram / MAX), которые BotHelp подставляет автоматически снизу страницы.

═══════════════════════════════════════════
📝 ТЕКСТ (ИСПОЛЬЗОВАТЬ ДОСЛОВНО, БЕЗ ИЗМЕНЕНИЙ!)
═══════════════════════════════════════════
${t.txt}

⚠️ КРИТИЧНО:
• Текст менять, переписывать, "улучшать" или сокращать ЗАПРЕЩЕНО
• Каждое слово, каждая опечатка ("безрезультатано", "по-другому") сохраняются
• Заголовок hook → главный h1
• Список "без..." → пилюли/таблетки
• Перечисление → буллеты с яркими иконками
• Финальная фраза "СМОТРИТЕ КАК МОЖНО ПО-ДРУГОМУ" → крупный CTA-блок над кнопками BotHelp с пульсирующей стрелкой ↓

═══════════════════════════════════════════
🎨 ДИЗАЙН
═══════════════════════════════════════════
Стиль: ${s[1]} ${s[2]} — ${s[3]}
Палитра: ${p[1]} ${p[2]} — ${p[3].join(', ')}
Типографика: ${ty[1]} (${ty[2]}) — Google Fonts
Структура: ${l[1]} — ${l[2]}

═══════════════════════════════════════════
⚡ ЭФФЕКТЫ
═══════════════════════════════════════════
${ef.map(e => e[1]).join('\n')}

CSS @keyframes, transitions, transform. JS — минимум.

═══════════════════════════════════════════
🏗️ СТРУКТУРА БЛОКОВ
═══════════════════════════════════════════
1. Бейдж сверху ("Только для тех, кто устал от курсов")
2. H1: огромный, контрастный, акцентное выделение ключевой фразы
3. Пилюли "Без...": горизонтальные таблетки с крестиком/галочкой
4. Блок боли: красный/оранжевый, пунктирная рамка, плашка "БОЛЬ"
5. Блок доверия (если в тексте "не казино/не крипта/белый метод"): зелёная плашка ✅
6. Блок ценности: тёмная карточка с жёлтым заголовком и списком
7. CTA-арея + пульсирующая стрелка ↓ к кнопкам BotHelp

═══════════════════════════════════════════
📱 АДАПТИВНОСТЬ
═══════════════════════════════════════════
• max-width 760px, по центру
• Полная адаптация под мобильные
• Пилюли на мобайле: grid 2 колонки
• Кнопки минимум 44px высотой

═══════════════════════════════════════════
🔧 ОБЁРТКА BOTHELP (ОБЯЗАТЕЛЬНО!)
═══════════════════════════════════════════
Это Body мини-лендинга. ПОД твоим контентом BotHelp САМ дорисует:
- кнопки мессенджеров (Telegram, MAX)
- блок политики с чекбоксом
- подпись "Powered by BotHelp"

Твой код ОБЯЗАН:
1) padding-bottom ~120-140px у обёртки
2) Стили под .wh-landing-buttons и .wh-mini-landing-policy в твоём дизайне
3) Скрывать .wh-landing-powered-by через display:none !important
4) НЕ скрывать .wh-mini-landing-policy
5) Содержать скрипт автогалочки чекбокса:

<script>
document.addEventListener('DOMContentLoaded', function () {
  function autoCheck() {
    var cb = document.querySelector('.wh-checkbox, .wh-mini-landing-policy input[type="checkbox"]');
    if (cb && !cb.checked) { cb.checked = true; cb.dispatchEvent(new Event('change', {bubbles: true})); }
  }
  autoCheck();
  var obs = new MutationObserver(autoCheck);
  obs.observe(document.body, {childList: true, subtree: true});
  setTimeout(function(){ obs.disconnect(); }, 5000);
});
</script>

6) .wh-landing-buttons: margin-top:-100px (десктоп) / -80px (мобайл), background:#fff, border-radius:32px 32px 0 0, padding:24px, кнопки внутри border-radius:16px min-height:56px font-weight:800
7) .wh-mini-landing-policy: background:#fff, border-radius:0 0 32px 32px, padding:0 24px 24px, текст 13px серый

═══════════════════════════════════════════
📤 ФОРМАТ ОТВЕТА
═══════════════════════════════════════════
Выдай ОДИН цельный HTML-документ от <!DOCTYPE html> до </html>. Никаких placeholder'ов, никаких комментариев — только финальный код.`;
}

/* ================== ФЕМИНИЗАЦИЯ ================== */
function feminize(html) {
  const swaps = [['Я не тупой','Я не глупая'],['Не ленивый','Не ленивая'],['Я покупал курсы и тренинги - ответственно учился и всё применял','Я покупала курсы и тренинги - ответственно училась и всё применяла'],['Я никогда не мечтал','Я никогда не мечтала'],['простой смертной России - свой дом, лес, рыбалка','простой России - свой дом, лес, свой сад'],['я в итоге окончательно выдохся','я в итоге окончательно выдохлась'],['Решил забить','Решила забить'],['Вот я и вернулся','Вот я и вернулась'],['Ну как вернулся, я так то из неё никуда не выходил','Ну как вернулась, я так то из неё никуда не выходила'],['я лазил по каналам','я лазила по каналам'],['В одном из каналов увидел','В одном из каналов увидела'],['подумал я, но заявку зачем то оставил','подумала я, но заявку зачем то оставила'],['я уже сидел с ребятами','я уже сидела с ребятами'],['Я за 9 лет не заработал','Я за 9 лет не заработала'],['я ещё не играл','я ещё не играла'],['это не сказал, просто подумал','это не сказала, просто подумала'],['чему бы я не учился','чему бы я не училась'],['воображал себя инста-блогером и сделал','воображала себя инста-блогером и сделала'],['Как и обещал:','Как и обещала:'],['я понял - как бы я не старался','я поняла - как бы я не старалась'],['я заработал 21 250','я заработала 21 250'],['я был в просто в а**е','я была в просто в а**е'],['я не проходил обучение','я не проходила обучение'],['я ничего не собирал своими руками','я ничего не собирала своими руками'],['впал в отчаяние и перепробовал','впала в отчаяние и перепробовала']];
  let out = html;
  for (const [a, b] of swaps) out = out.split(a).join(b);
  return out;
}

/* ================== ШАБЛОН ПРОДАЮЩЕЙ ИСТОРИИ (СОКРАЩЁННЫЙ ДЛЯ КОМПАКТНОСТИ — ПОЛНЫЙ В ИСХОДНИКАХ) ================== */
const SS_TEMPLATE = `<!DOCTYPE html><html lang="ru"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>Знакомый скриншот? — {{NAME}}</title>
<link rel="preconnect" href="https://fonts.googleapis.com"><link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap" rel="stylesheet">
<style>:root{--pb:#0d8eff;--db:#006adc;--tb:#0f172a;--tg:#334155;--tlg:#64748b;--bg:#f1f5f9;--bbs:#eef7ff;--w:#fff;--r:#ef4444;--g:#22c55e;--ss:0 10px 30px rgba(0,0,0,.08);--sm:0 10px 25px -5px rgba(0,0,0,.08);--sb:0 20px 40px -10px rgba(13,142,255,.3)}*{margin:0;padding:0;box-sizing:border-box}body{font-family:'Inter',sans-serif;line-height:1.6;color:var(--tb);background:#fff;font-size:1.15rem}section{width:100%;position:relative;overflow:hidden}.cnt{max-width:1200px;margin:0 auto;padding:0 24px}.tc{max-width:850px;margin:0 auto}.sp{padding:120px 0}.bgb{background:linear-gradient(135deg,var(--pb) 0%,var(--db) 100%);color:#fff}.bgg{background:var(--bg)}h1,h2,h3{line-height:1.2;letter-spacing:-.02em}p{margin-bottom:20px}.tac{text-align:center}.tbl{color:var(--pb)}.tre{color:var(--r)}.tgr{color:var(--g)}.bld{font-weight:800}.gp{background:rgba(255,255,255,.1);backdrop-filter:blur(12px);border:1px solid rgba(255,255,255,.2);border-radius:32px;padding:24px}.nb{background:#fff;border:3px solid var(--pb);border-radius:24px;padding:40px;box-shadow:12px 12px 0 var(--bbs);margin:40px 0;font-style:italic;font-weight:600;color:var(--tg)}.tbb{background:#fff;padding:40px;border-radius:40px;display:inline-block;border:4px solid var(--pb);box-shadow:var(--sb)}.bm{background:var(--pb);color:#fff;padding:28px 64px;border-radius:100px;font-size:1.5rem;font-weight:900;text-decoration:none;display:inline-block;text-transform:uppercase;box-shadow:var(--sb);transition:all .4s}.bm:hover{transform:translateY(-8px) scale(1.03);background:var(--db)}@media(max-width:900px){.sp{padding:80px 0}}</style></head><body>
<section class="sp bgb"><div class="cnt"><div style="display:grid;grid-template-columns:1.1fr .9fr;gap:60px;align-items:center"><div>
<h1 style="font-size:clamp(3rem,6vw,4.5rem);font-weight:900;margin-bottom:30px">Знакомый скриншот? 🫣</h1>
<div style="font-size:1.25rem;color:rgba(255,255,255,.95)"><p>Ну как же достали все эти платежи!</p><p>Каждый день кому то платишь.</p><p>Каждый день считаешь деньги.</p><p>Пытаешься вырваться из этого болота.</p><p>Уже появилось ощущение, что так ничего и не получится...</p><p style="font-weight:900;font-size:1.5rem;margin-top:40px;background:rgba(255,255,255,.15);padding:24px;border-radius:20px">Если вы в похожей ситуации, то я вам 100% ГАРАНТИРУЮ - вы НАШЛИ, то что искали.</p></div></div>
<div><div class="gp"><img src="https://storage2.bothelp.io/connection/9c/9c6b/9c6b1f6d440125f6ec90e02655e20631/Risunok1.jpg" style="width:100%;border-radius:20px"></div></div></div></div></section>
<section class="sp bgg"><div class="cnt"><div style="display:flex;gap:80px;align-items:center;flex-wrap:wrap">
<div style="position:relative;padding:16px;border:4px solid var(--pb);border-radius:48px;max-width:420px"><img src="{{PHOTO_URL}}" style="width:100%;border-radius:32px"><div style="position:absolute;bottom:-30px;left:50%;transform:translateX(-50%);background:var(--pb);color:#fff;padding:15px 30px;border-radius:30px;font-weight:900;width:max-content">Для вас просто {{SHORT_NAME}} ;) ✌️</div></div>
<div style="flex:1;min-width:300px"><h2 style="font-size:clamp(2.5rem,5vw,3.5rem);font-weight:900;margin-bottom:30px">Меня зовут {{NAME}}, мне {{AGE}} лет</h2>
<div style="color:var(--tg);font-size:1.25rem"><p>Я не эксперт, у меня нет бизнеса и я даже не фрилансер. Хотя всем этим я пытался стать с 2017 года.</p><p>Я не тупой. Не ленивый.</p><p>Я покупал курсы и тренинги - ответственно учился и всё применял. <strong style="color:var(--tb);font-size:1.5rem">НО результат полный НОЛЬ. Вообще НИЧЕГО.</strong></p><div class="nb">"Не работай на дядю, 300к чистыми, запрыгивай в последний вагон..." - вот ключевые слова, описывающие 9 лет моей жизни.</div></div></div></div></div></section>
<section class="sp"><div class="cnt tc tac">
<h2 style="font-size:clamp(2rem,4vw,3rem);font-weight:900;margin-bottom:40px">Вот мой доход за прошлую НЕДЕЛЮ.</h2>
<div style="background:#111;padding:12px;border-radius:20px;max-width:600px;margin:0 auto"><video controls preload="metadata" style="width:100%;border-radius:12px"><source src="https://file-storage.bothelp.io/connection/12/1207/12074a5f379a6ae71db42e95106f58b2/%D0%94%D0%BE%D1%85%D0%BE%D0%B4%20%D0%B7%D0%B0%20%D0%BD%D0%B5%D0%B4%D0%B5%D0%BB%D1%8E.mp4" type="video/mp4"></video></div>
<div style="margin-top:40px"><p>Оказывается это такое счастье - каждое утро просыпаться с слегка придурковатой улыбкой.</p><p>Но давайте перейдём к КОНКРЕТИКЕ.</p><p>Как и обещал: сейчас вы увидите как РЕАЛЬНО получить результат.</p><p style="font-weight:800;font-size:1.3rem">Вот язык даю на отсечение. Я серьёзно.</p></div></div></section>
<section class="sp bgg"><div class="cnt tc tac">
<h2 style="font-size:clamp(2rem,5vw,3rem);font-weight:900;margin-bottom:60px;text-transform:uppercase">Каждый мой "онлайн заработок" разворачивался по одному и тому же сценарию:</h2>
<div style="display:flex;flex-direction:column;gap:20px;text-align:left">
<div style="background:#fff;padding:30px;border-radius:24px;border-left:6px solid #3b82f6"><p style="font-size:1.25rem;font-weight:600">🤯 А. Очередной невроз по поводу хотения того образа жизни.</p></div>
<div style="background:#fff;padding:30px;border-radius:24px;border-left:6px solid #a855f7"><p style="font-size:1.25rem;font-weight:600">🕵️‍♂️ Б. Я нахожу "нишу" по принципу "лишь бы заработать".</p></div>
<div style="background:#fff;padding:30px;border-radius:24px;border-left:6px solid #f59e0b"><p style="font-size:1.25rem;font-weight:600">💳 В. Покупаю "точно сработает курс", но внутри не хочу.</p></div>
<div style="background:#fef2f2;padding:30px;border-radius:24px;border-left:6px solid #ef4444"><p style="font-size:1.25rem;font-weight:600;color:var(--r)">📉 Г. Ничего не выходит и наступает апатия.</p></div>
</div></div></section>
<section class="sp"><div class="cnt tc">
<h2 class="tbl" style="font-size:2.2rem;font-weight:900">Разрыв шаблона №1 💥</h2>
<p>Нам поставили цель - заработать не менее 10 000Р за 10 дней.</p><p>Я за 9 лет не заработал, а тут за 10 дней...</p>
<div style="background:var(--pb);color:#fff;padding:30px;border-radius:20px;text-align:center;margin:30px 0"><p style="font-size:1.6rem;font-weight:900;margin:0">Вы можете нанять кого-то, чтобы он зарабатывал деньги за Вас.</p></div>
<p>Чтобы создать стабильный доход, нужно ответить на 3 вопроса:</p>
<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(250px,1fr));gap:20px;margin:40px 0">
<div style="background:#eff6ff;padding:30px;border-radius:20px"><span style="font-size:2.5rem">📦</span><div style="font-weight:800;font-size:1.2rem;margin:15px 0 10px">ЧТО продаём?</div><div style="font-size:.95rem">поиск спроса, анализ конкурентов</div></div>
<div style="background:#f5f3ff;padding:30px;border-radius:20px"><span style="font-size:2.5rem">⚙️</span><div style="font-weight:800;font-size:1.2rem;margin:15px 0 10px">КАК продаём?</div><div style="font-size:.95rem">воронки продаж, оффер, прозвоны</div></div>
<div style="background:#f0fdf4;padding:30px;border-radius:20px"><span style="font-size:2.5rem">🎯</span><div style="font-weight:800;font-size:1.2rem;margin:15px 0 10px">ГДЕ брать?</div><div style="font-size:.95rem">клиенты, лендинги, реклама</div></div>
</div></div></section>
<section class="sp bgg"><div class="cnt tc">
<h2 class="tbl" style="font-size:2.2rem;font-weight:900">Разрыв шаблона №2 🧩</h2>
<p>Доход - это когда один человек платит другому.</p><p>Главная проблема: "НЕ ПОКУПАЮТ".</p>
<div style="background:linear-gradient(135deg,var(--pb) 0%,var(--db) 100%);border-radius:40px;padding:60px;color:#fff;margin:60px 0">
<p style="font-size:1.4rem;font-weight:800;margin-bottom:30px">Вот что мы сделаем:</p>
<div style="display:flex;gap:20px;margin-bottom:24px"><div style="background:var(--g);width:32px;height:32px;border-radius:8px;display:flex;align-items:center;justify-content:center;font-size:18px;flex-shrink:0">✓</div><div>соберём вам полноценную воронку продаж</div></div>
<div style="display:flex;gap:20px;margin-bottom:24px"><div style="background:var(--g);width:32px;height:32px;border-radius:8px;display:flex;align-items:center;justify-content:center;font-size:18px;flex-shrink:0">✓</div><div>подготовим продукт и упакуем его</div></div>
<div style="background:rgba(255,255,255,.1);padding:30px;border-radius:24px;margin-top:40px;font-weight:600">💳 НО! человек может получить доступ БЕСПЛАТНО — оформив дебетовую карту по партнёрской ссылке.</div>
</div></div></section>
<section class="sp"><div class="cnt tc tac">
<h2 style="font-size:clamp(2rem,5vw,3rem);font-weight:900;margin-bottom:20px">В итоге за первые 10 дней я заработал 21 250 рублей.</h2>
<p style="font-size:1.4rem;font-weight:600;color:var(--g);margin-bottom:40px">Это были первые РЕАЛЬНЫЕ деньги за 9 лет!!!</p>
<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:20px;margin-top:30px">
<div style="background:#000;padding:10px;border-radius:36px;border:4px solid #475569"><video controls preload="metadata" style="width:100%;border-radius:26px"><source src="https://file-storage.bothelp.io/connection/fe/fe75/fe75882e6476f6e6ea81c6cdaf3f58c7/%D0%92%D0%BB%D0%B0%D0%B4%D0%B8%D0%BC%D0%B8%D1%80-%D0%BE%D1%82%D1%87%D1%91%D1%82.mp4"></video></div>
<div style="background:#000;padding:10px;border-radius:36px;border:4px solid #475569"><video controls preload="metadata" style="width:100%;border-radius:26px"><source src="https://file-storage.bothelp.io/connection/90/9028/90285d8010f1779573dd10289ffda006/%D0%A1%D0%B2%D0%B5%D1%82%D0%BB%D0%B0%D0%BD%D0%B0-%D0%BE%D1%82%D1%87%D1%91%D1%82.mp4"></video></div>
<div style="background:#000;padding:10px;border-radius:36px;border:4px solid #475569"><video controls preload="metadata" style="width:100%;border-radius:26px"><source src="https://file-storage.bothelp.io/connection/23/238b/238b9186e33694608c34af54c335165b/%D0%9C%D0%B8%D1%85%D0%B0%D0%B8%D0%BB-%D0%BE%D1%82%D1%87%D1%91%D1%82.mp4"></video></div>
</div></div></section>
<section class="sp bgg"><div class="cnt tc tac">
<p class="bld tre" style="font-size:1.8rem;margin-bottom:15px">!Основной мой доход, лежит дальше!</p>
<p>Это партнёрские отчисления с ВАШИХ доходов.</p>
<p class="bld tgr" style="font-size:1.4rem;margin-top:15px">И каждый день (КАЖДЫЙ!) мне приходят деньги. 📈</p>
<h3 style="font-size:1.8rem;font-weight:900;margin:50px 0 30px">КАК ПОПАСТЬ НА ПРАКТИКУМ.</h3>
<a href="{{OFFER_URL}}" class="bm">ЗАПИСАТЬСЯ НА ПРАКТИКУМ</a>
</div></div></section>
</body></html>`;

/* ================== ШАБЛОН ОФФЕРА (КОМПАКТНЫЙ) ================== */
const OFR_TEMPLATE = `<!DOCTYPE html><html lang="ru"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>Практикум: Метод 2026</title>
<style>.wh-mini-landing-policy,#privacy-policy-error-message,.wh-landing-powered-by{display:none !important}</style>
<link rel="preconnect" href="https://fonts.googleapis.com"><link href="https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700;800;900&display=swap" rel="stylesheet">
<style>:root{--y:#ffdd2d;--yh:#fcc521;--d:#222;--bg:#f4f5f7;--cb:#fff;--tm:#111;--tmu:#6b7280;--bd:#e2e8f0;--tg:#2AABEE;--sc:0 12px 32px rgba(0,0,0,.06);--sy:0 12px 24px rgba(255,221,45,.4)}*{box-sizing:border-box}body{margin:0;background:var(--bg);font-family:'Manrope',system-ui,sans-serif;color:var(--tm);line-height:1.55}a{text-decoration:none;color:#2563eb}img{max-width:100%;display:block;border-radius:16px}.ow{max-width:860px;margin:0 auto;padding:50px 20px}.oh{background:var(--y);padding:60px 50px;border-radius:28px;margin-bottom:24px;box-shadow:var(--sc)}.ob{display:inline-block;padding:8px 24px;border-radius:100px;background:var(--d);color:var(--y);font-size:13px;font-weight:800;text-transform:uppercase;margin-bottom:24px}.oh h1{font-size:clamp(34px,5vw,52px);line-height:1.05;margin:0 0 20px;color:var(--d)}.os{font-size:24px;font-weight:700;color:rgba(34,34,34,.85);margin:0 0 40px}.op{display:flex;flex-wrap:wrap;gap:12px}.opi{padding:12px 24px;border-radius:100px;background:rgba(255,255,255,.5);font-size:15px;font-weight:700;color:var(--d)}.oa{background:var(--d);color:#fff;padding:48px;border-radius:28px;margin-bottom:40px;text-align:center}.oa p{font-size:clamp(24px,4vw,32px);font-weight:600;margin:0}.oa p strong{color:var(--y);font-weight:900}.tc{background:#fff;border-radius:28px;padding:56px;margin-bottom:24px;box-shadow:var(--sc)}.tt{font-size:34px;font-weight:900;margin:0 0 32px;color:var(--tm)}.tx{font-size:19px;color:var(--tmu);font-weight:500}.tac{text-align:center}.tl{list-style:none;padding:0;margin:0}.tli{padding:24px 0;border-bottom:1px solid var(--bd);font-size:19px;font-weight:600;display:flex;gap:20px;align-items:flex-start}.tli:last-child{border-bottom:none}.ix::before,.is::before,.ic::before{font-weight:900;font-size:18px;width:36px;height:36px;display:flex;align-items:center;justify-content:center;border-radius:10px;flex-shrink:0}.ix::before{content:'✕';color:#ef4444;background:#fee2e2}.is::before{content:'✦';color:var(--d);background:var(--y)}.ic::before{content:'✓';color:#10b981;background:#d1fae5}.pb{border:3px solid var(--bd);border-radius:28px;padding:48px;text-align:center;margin:48px 0;background:#fafafa}.pv{font-size:72px;font-weight:900;color:var(--d)}.tb{display:block;text-align:center;border-radius:20px;padding:24px 32px;font-size:19px;font-weight:800;margin-bottom:20px;text-decoration:none;cursor:pointer;width:100%}.by{background:var(--y);color:var(--d);box-shadow:var(--sy)}.btg{background:var(--tg);color:#fff}.bmx{background:var(--d);color:#fff}.tf{background:var(--d);color:#fff;border-radius:28px;padding:80px 60px;text-align:center;margin-top:40px}.tf p{margin:0 0 16px;font-size:22px;font-weight:600;color:rgba(255,255,255,.8)}.end{font-size:36px;font-weight:900;color:var(--y);margin-top:40px}@media(max-width:768px){.oh,.tc,.oa{padding:40px 24px}.tf{padding:50px 24px}.pv{font-size:52px}}</style></head><body>
<div class="ow">
<div class="oh"><div class="ob">Практикум</div><h1>Кардинально другой метод получения дохода <strong>в 2026 году.</strong></h1><div class="os">Как выйти на доход от 250 000Р</div><div class="op"><div class="opi">Без покупки курсов</div><div class="opi">Без продаж</div><div class="opi">Без создания продуктов</div><div class="opi">Без соц. сетей</div><div class="opi">И даже без ИИ</div></div></div>
<div class="oa"><p>За 2 часа прямо на практикуме вы заработаете <strong>первые 5000Р</strong> без вложений.</p></div>
<div class="tc"><h2 class="tt">Кому нужно быть на практикуме "уже вчера":</h2><ul class="tl"><li class="tli ix">Постоянная нехватка денег.</li><li class="tli ix">Долги и кредиты на которые уходит пол зарплаты</li><li class="tli ix">Ежедневная тревога за будущее.</li><li class="tli ix">Ответственность за семью.</li><li class="tli ix">Ненависть к найму и ощущение каторги.</li><li class="tli ix">Десятки курсов за спиной, а результата нет.</li></ul></div>
<div class="tc"><h2 class="tt">Вот что даёт этот МЕТОД:</h2><ul class="tl"><li class="tli is">деньги перестанут быть источником стресса</li><li class="tli is">закроете кредиты и выйдете из финансовой ямы</li><li class="tli is">вернётся спокойствие за завтрашний день</li><li class="tli is">выйдете из гонки за лучшее будущее</li></ul><div style="background:var(--y);border-radius:24px;padding:36px;text-align:center;margin-top:48px;box-shadow:var(--sy)"><div style="font-size:26px;font-weight:900;text-transform:uppercase">НЕ баллы. НЕ бонусы. А РЕАЛЬНЫЕ деньги.</div></div></div>
<div class="tc" style="border:2px solid var(--y)"><h2 class="tt tac">Итого за 2 часа практикума:</h2><ul class="tl"><li class="tli ic">Увидите как работает метод 2026.</li><li class="tli ic">Заработаете первые 5000Р.</li><li class="tli ic">Поймёте как перевести в регулярный доход.</li></ul><div class="pb"><div style="font-size:18px;font-weight:700;color:var(--tmu);margin-bottom:16px;text-transform:uppercase">Стоимость 990Р</div><div class="pv">990Р</div></div><p class="tx tac" style="font-weight:900;color:var(--d);margin-bottom:24px;font-size:20px">!!! При этом вы можете принять участие БЕСПЛАТНО.</p><a href="{{PAY_URL}}" class="tb by" target="_blank">ОПЛАТИТЬ УЧАСТИЕ</a><div style="display:block;text-align:center;border-radius:20px;padding:24px 32px;font-size:19px;font-weight:800;margin-bottom:20px;border:1px solid var(--d);color:var(--d);text-transform:uppercase;background:#fff">НАПИСАТЬ МНЕ И ОФОРМИТЬ КАРТУ</div><div style="display:grid;grid-template-columns:1fr 1fr;gap:16px"><a href="{{TG_URL}}" class="tb btg" target="_blank">Телеграм</a><a href="{{MAX_URL}}" class="tb bmx" target="_blank">Мах</a></div></div>
<div class="tf"><p>Можно продолжать делать ВСЁ ТО ЖЕ САМОЕ…Но где вы будете через месяц?</p><p>Или наконец попробовать то, где есть система и реальные результаты.</p><p class="end">Решение за вами.</p></div>
</div>
<script>document.addEventListener('DOMContentLoaded',function(){function h(){var c=document.querySelector('.wh-checkbox');if(c){c.checked=true;c.dispatchEvent(new Event('change',{bubbles:true}));}}h();var o=new MutationObserver(h);o.observe(document.body,{childList:true,subtree:true});setTimeout(function(){o.disconnect();},5000);});</script></body></html>`;

function genSale({ name, age, shortName, photo, offer, gender }) {
  let h = SS_TEMPLATE.split('{{NAME}}').join(name || 'Ваше Имя').split('{{AGE}}').join(age || '00').split('{{SHORT_NAME}}').join(shortName || 'Имя').split('{{PHOTO_URL}}').join(photo || 'https://via.placeholder.com/420').split('{{OFFER_URL}}').join(offer || '#');
  if (gender === 'female') h = feminize(h);
  return h;
}
function genOffer({ pay, tg, max }) {
  return OFR_TEMPLATE.split('{{PAY_URL}}').join(pay || '#').split('{{TG_URL}}').join(tg || '#').split('{{MAX_URL}}').join(max || '#');
}

/* ================== UI КОМПОНЕНТЫ ================== */
function CopyBtn({ text, label = 'Скопировать', big = false, dark = false }) {
  const [s, setS] = useState('idle');
  const onClick = async () => {
    setS('copying');
    const ok = await copyToClipboard(text);
    setS(ok ? 'done' : 'error');
    setTimeout(() => setS('idle'), 2200);
  };
  const cls = s === 'done' ? 'bg-emerald-500 text-white' : s === 'error' ? 'bg-red-500 text-white' : dark ? 'bg-slate-900 hover:bg-slate-800 text-yellow-400' : 'bg-yellow-400 hover:bg-yellow-300 text-slate-900';
  return (
    <button onClick={onClick} className={`${cls} ${big ? 'py-5 text-lg' : 'py-3 text-sm'} font-black rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg w-full px-5 hover:scale-[1.01] active:scale-[0.99]`}>
      {s === 'done' ? <><Check className="w-5 h-5" /> Скопировано!</> : s === 'error' ? <><AlertCircle className="w-5 h-5" /> Не удалось — выдели вручную</> : <><Copy className="w-5 h-5" /> {label}</>}
    </button>
  );
}

function DownloadBtn({ filename, content, label }) {
  return (
    <button onClick={() => downloadFile(filename, content)} className="py-3 text-sm font-black rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white transition-all flex items-center justify-center gap-2 shadow-lg w-full px-5 hover:scale-[1.01]">
      <Download className="w-5 h-5" /> {label}
    </button>
  );
}

function Tab({ active, onClick, icon: Icon, children, dark }) {
  return (
    <button onClick={onClick} className={`flex items-center gap-2 px-3 py-2.5 rounded-xl font-bold text-xs whitespace-nowrap transition-all ${active ? (dark ? 'bg-yellow-400 text-slate-900 shadow-lg' : 'bg-slate-900 text-white shadow-lg') : (dark ? 'bg-slate-800 text-slate-300 hover:bg-slate-700 border border-slate-700' : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200')}`}>
      <Icon className="w-3.5 h-3.5" /> {children}
    </button>
  );
}

function Field({ label, hint, value, onChange, placeholder, dark }) {
  return (
    <label className="block">
      <div className="flex items-baseline justify-between mb-1.5">
        <span className={`text-sm font-black ${dark ? 'text-slate-200' : 'text-slate-700'}`}>{label}</span>
        {hint && <span className={`text-[11px] ${dark ? 'text-slate-500' : 'text-slate-400'}`}>{hint}</span>}
      </div>
      <input type="text" value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className={`w-full px-4 py-3 rounded-xl border-2 focus:outline-none font-medium ${dark ? 'bg-slate-800 border-slate-700 focus:border-blue-500 text-white placeholder:text-slate-500' : 'bg-white border-slate-200 focus:border-blue-500 text-slate-900 placeholder:text-slate-400'}`} />
    </label>
  );
}

function TextArea({ label, hint, value, onChange, placeholder, rows = 6, dark }) {
  return (
    <label className="block">
      <div className="flex items-baseline justify-between mb-1.5">
        <span className={`text-sm font-black ${dark ? 'text-slate-200' : 'text-slate-700'}`}>{label}</span>
        {hint && <span className={`text-[11px] ${dark ? 'text-slate-500' : 'text-slate-400'}`}>{hint}</span>}
      </div>
      <textarea value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} rows={rows} className={`w-full px-4 py-3 rounded-xl border-2 focus:outline-none font-medium resize-y ${dark ? 'bg-slate-800 border-slate-700 focus:border-blue-500 text-white placeholder:text-slate-500' : 'bg-white border-slate-200 focus:border-blue-500 text-slate-900 placeholder:text-slate-400'}`} />
    </label>
  );
}

/* ================== LIVE PREVIEW ================== */
function LivePreview({ tpl, style, palette, dark }) {
  const t = tpl ? TPL.find(x => x.id === tpl) : null;
  const s = style ? STYLES.find(x => x[0] === style) : null;
  const p = palette ? PALETTES.find(x => x[0] === palette) : null;
  if (!t || !s || !p) return (
    <div className={`rounded-2xl p-8 border-2 border-dashed text-center ${dark ? 'border-slate-700 bg-slate-800 text-slate-500' : 'border-slate-300 bg-slate-50 text-slate-400'}`}>
      <Eye className="w-10 h-10 mx-auto mb-2 opacity-50" />
      <p className="text-sm font-bold">Выбери шаблон, стиль и палитру для превью</p>
    </div>
  );
  const c1 = p[3][0], c2 = p[3][1], c3 = p[3][2];
  const isDark = ['darkmode', 'cyberpunk', 'terminal', 'deep-space'].includes(s[0]);
  return (
    <div className="rounded-2xl overflow-hidden border-2 border-slate-200 shadow-xl" style={{ background: isDark ? '#0a0a0a' : c3 || '#fff' }}>
      <div style={{ padding: '24px 20px', textAlign: 'center', minHeight: 320 }}>
        <div style={{ display: 'inline-block', padding: '4px 12px', borderRadius: 100, background: isDark ? c1 : '#222', color: isDark ? '#000' : c1, fontSize: 9, fontWeight: 900, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 14 }}>Превью {s[2]}</div>
        <h1 style={{ fontSize: 22, lineHeight: 1.1, fontWeight: 900, margin: '0 0 14px', color: isDark ? '#fff' : '#0f172a', letterSpacing: '-0.02em' }}>{t.h.length > 60 ? t.h.slice(0, 60) + '...' : t.h}</h1>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, justifyContent: 'center', marginBottom: 16 }}>
          {t.p.map((pill, i) => (
            <span key={i} style={{ padding: '4px 10px', borderRadius: 100, background: isDark ? 'rgba(255,255,255,.1)' : '#fff', border: `1px solid ${isDark ? 'rgba(255,255,255,.2)' : '#e2e8f0'}`, fontSize: 9, fontWeight: 700, color: isDark ? '#fff' : '#0f172a' }}>✕ {pill}</span>
          ))}
        </div>
        <div style={{ background: isDark ? 'rgba(255,0,0,.1)' : '#fef2f2', border: `2px dashed ${c1}`, borderRadius: 12, padding: '12px 14px', marginBottom: 14, textAlign: 'left' }}>
          <div style={{ fontSize: 8, fontWeight: 900, color: c1, textTransform: 'uppercase', marginBottom: 6 }}>БОЛЬ</div>
          <div style={{ fontSize: 11, fontWeight: 700, color: isDark ? '#fff' : '#0f172a' }}>Купили курсы — результата ноль. Хватит!</div>
        </div>
        <div style={{ background: isDark ? 'rgba(255,255,255,.05)' : '#0f172a', borderRadius: 12, padding: 14, marginBottom: 14 }}>
          <div style={{ fontSize: 10, fontWeight: 900, color: c2, marginBottom: 6 }}>За 8 минут вы узнаете:</div>
          <div style={{ fontSize: 9, color: isDark ? 'rgba(255,255,255,.8)' : 'rgba(255,255,255,.9)' }}>✓ почему курсы не работают<br />✓ метод который работает сейчас</div>
        </div>
        <button style={{ padding: '12px 24px', borderRadius: 100, background: c1, color: isDark ? '#000' : '#fff', fontSize: 11, fontWeight: 900, border: 'none', textTransform: 'uppercase', letterSpacing: 1, boxShadow: `0 8px 16px ${c1}40` }}>Смотреть как →</button>
        <div style={{ marginTop: 12, fontSize: 18 }}>↓</div>
      </div>
    </div>
  );
}

/* ================== ОСНОВНОЙ КОМПОНЕНТ ================== */
export default function Constructor() {
  const [dark, setDark] = useState(false);
  const [tab, setTab] = useState('how');
  
  const [tpl, setTpl] = useState(null);
  const [style, setStyle] = useState(null);
  const [palette, setPalette] = useState(null);
  const [typo, setTypo] = useState('manrope');
  const [layout, setLayout] = useState('classic');
  const [effects, setEffects] = useState(['micro', 'fadein', 'pulse', 'gradient-anim', 'glow']);

  const [gender, setGender] = useState('male');
  const [name, setName] = useState('');
  const [age, setAge] = useState('');
  const [shortName, setShortName] = useState('');
  const [photo, setPhoto] = useState('');
  const [offer, setOffer] = useState('');

  const [pay, setPay] = useState('');
  const [tg, setTg] = useState('');
  const [max, setMax] = useState('');

  // Generator состояния
  const [adProduct, setAdProduct] = useState('');
  const [adAudience, setAdAudience] = useState('');
  const [adPain, setAdPain] = useState('');
  const [adBenefit, setAdBenefit] = useState('');
  const [adNiche, setAdNiche] = useState('');

  const toggleEf = (id) => setEffects(p => p.includes(id) ? p.filter(x => x !== id) : [...p, id]);

  const applyPreset = (preset) => {
    setTpl(preset.tpl); setStyle(preset.style); setPalette(preset.palette);
    setTypo(preset.typo); setLayout(preset.layout); setEffects(preset.effects);
  };

  const resetAll = () => { setTpl(null); setStyle(null); setPalette(null); setEffects([]); };

  const canPre = tpl && style && palette;
  const prompt = useMemo(() => canPre ? buildPrompt({ tpl, style, effects, palette, layout, typo }) : '', [tpl, style, palette, typo, layout, effects, canPre]);
  const saleHtml = useMemo(() => genSale({ name, age, shortName, photo, offer, gender }), [name, age, shortName, photo, offer, gender]);
  const offerHtml = useMemo(() => genOffer({ pay, tg, max }), [pay, tg, max]);

  const fillSaleDemo = () => {
    if (gender === 'male') { setName('Павел Андрюшенков'); setAge('60'); setShortName('Паша'); }
    else { setName('Оксана Корчагина'); setAge('44'); setShortName('Оксана'); }
    setPhoto('https://via.placeholder.com/420x420/0d8eff/ffffff?text=Ваше+Фото');
    setOffer('https://example.com/offer');
  };
  const resetSale = () => { setName(''); setAge(''); setShortName(''); setPhoto(''); setOffer(''); };
  const fillOfferDemo = () => { setPay('https://voronkapodkluch.getcourse.ru/page2?gcao=ВАШ_ID'); setTg('https://t.me/your_username'); setMax('https://iimax.ru/your_username'); };
  const resetOffer = () => { setPay(''); setTg(''); setMax(''); };

  // Прогресс воронки
  const progress = useMemo(() => {
    let p = 0;
    if (canPre) p += 33;
    if (name && age && shortName && photo && offer) p += 33;
    if (pay && tg && max) p += 34;
    return p;
  }, [canPre, name, age, shortName, photo, offer, pay, tg, max]);

  // Промт для генератора объявлений
  const adPrompt = useMemo(() => {
    if (!adProduct || !adAudience) return '';
    return `Ты — топовый маркетолог Яндекс.Директа. Сгенерируй пакет рекламных объявлений для РСЯ.

═══════════════════════════════════════════
🎯 КОНТЕКСТ — изучи внимательно
═══════════════════════════════════════════

ПРОДУКТ/УСЛУГА: ${adProduct}

ЦЕЛЕВАЯ АУДИТОРИЯ: ${adAudience}

${adPain ? `ОСНОВНЫЕ БОЛИ КЛИЕНТОВ: ${adPain}\n` : ''}
${adBenefit ? `ГЛАВНОЕ ПРЕИМУЩЕСТВО: ${adBenefit}\n` : ''}
${adNiche ? `НИША/КАТЕГОРИЯ: ${adNiche}\n` : ''}

═══════════════════════════════════════════
📦 ЧТО НУЖНО СГЕНЕРИРОВАТЬ
═══════════════════════════════════════════

Создай пакет объявлений по следующей структуре:

🔹 ЗАГОЛОВКИ (15 штук, до 56 символов каждый)
• 5 заголовков на основе боли ("Устали от X?", "Не получается Y?")
• 5 заголовков на основе результата ("Выйдете на 250 000Р", "Заработаете 5000Р за 2 часа")
• 5 заголовков на основе разрыва шаблона ("Без курсов", "Кардинально другой метод")

🔹 ВТОРЫЕ ЗАГОЛОВКИ (15 штук, до 30 символов)
Дополнения к основным заголовкам, усиливают их

🔹 ОПИСАНИЯ (15 штук, до 81 символа каждое)
• Раскрывают выгоду
• Содержат призыв к действию
• Используют цифры и факты

🔹 БЫСТРЫЕ ССЫЛКИ (8 пар: текст + описание)
Формат:
- Текст ссылки (до 30 символов)
- Описание (до 60 символов)
Темы: "Как это работает", "Отзывы", "Сколько стоит", "Гарантии", "Получить бесплатно", "Видеообзор", "Старт за 5 минут", "Успей сегодня"

🔹 УТОЧНЕНИЯ (10 штук, до 25 символов)
Короткие тезисы-плюшки: "Без вложений", "За 2 часа", "Гарантия возврата"

═══════════════════════════════════════════
✅ ПРАВИЛА
═══════════════════════════════════════════
• НИКАКОЙ шаблонщины ("индивидуальный подход", "команда профессионалов")
• Конкретика > абстракция (вместо "качественно" — "проверено на 1000+ людях")
• Эмоциональный триггер в каждом заголовке
• Используй "вы/ваш", обращайся напрямую
• CTR-ориентированно: цепляй с первого слова
• Соблюдай лимиты символов (Яндекс.Директ строго проверяет!)

═══════════════════════════════════════════
📤 ФОРМАТ ОТВЕТА
═══════════════════════════════════════════
Выдай результат в виде структурированных таблиц/списков, готовых к копированию в интерфейс Яндекс.Директа. Никакой воды, только продукт.`;
  }, [adProduct, adAudience, adPain, adBenefit, adNiche]);

  const bg = dark ? 'bg-slate-950' : 'bg-slate-50';
  const card = dark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200';
  const text = dark ? 'text-white' : 'text-slate-900';
  const textMuted = dark ? 'text-slate-400' : 'text-slate-500';

  return (
    <div className={`min-h-screen ${bg} p-3 md:p-6 transition-colors`}>
      <div className="max-w-6xl mx-auto">
        {/* HEADER */}
        <div className="bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 rounded-3xl p-5 md:p-8 text-white mb-4 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-72 h-72 bg-yellow-400 rounded-full blur-3xl opacity-10"></div>
          <div className="absolute bottom-0 left-0 w-72 h-72 bg-blue-500 rounded-full blur-3xl opacity-20"></div>
          <div className="relative flex items-start justify-between gap-4">
            <div className="flex-1">
              <div className="inline-flex items-center gap-2 bg-yellow-400 text-slate-900 px-3 py-1 rounded-full text-xs font-black uppercase mb-3">
                <Wand2 className="w-3 h-3" /> Конструктор воронки 2.0
              </div>
              <h1 className="text-2xl md:text-4xl font-black mb-2 leading-tight">Полная воронка <span className="text-yellow-400">РСЯ → Бот → Воронка → Оффер</span></h1>
              <p className="text-sm md:text-base text-slate-300 max-w-3xl">Креативы, объявления, предлендинг, продающая история, оффер — всё в одном инструменте. С пресетами, превью и инструкциями.</p>
              {progress > 0 && (
                <div className="mt-4 bg-white/10 rounded-full h-2 overflow-hidden backdrop-blur">
                  <div className="bg-gradient-to-r from-yellow-400 to-emerald-400 h-full transition-all" style={{ width: `${progress}%` }}></div>
                </div>
              )}
              {progress > 0 && <p className="text-xs text-slate-400 mt-1">Готовность воронки: {progress}%</p>}
            </div>
            <button onClick={() => setDark(!dark)} className="bg-white/10 hover:bg-white/20 p-2.5 rounded-xl transition-colors backdrop-blur" title={dark ? 'Светлая тема' : 'Тёмная тема'}>
              {dark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* TABS */}
        <div className={`flex flex-wrap gap-1.5 mb-4 sticky top-2 z-20 ${dark ? 'bg-slate-950/80' : 'bg-slate-50/80'} backdrop-blur p-2 -m-2 rounded-2xl`}>
          <Tab active={tab === 'how'} onClick={() => setTab('how')} icon={BookOpen} dark={dark}>Как пользоваться</Tab>
          <Tab active={tab === 'creative'} onClick={() => setTab('creative')} icon={ImageIcon} dark={dark}>Креативы</Tab>
          <Tab active={tab === 'ads'} onClick={() => setTab('ads')} icon={Megaphone} dark={dark}>Объявления РСЯ</Tab>
          <Tab active={tab === 'pre'} onClick={() => setTab('pre')} icon={Wand2} dark={dark}>Предлендинг</Tab>
          <Tab active={tab === 'sale'} onClick={() => setTab('sale')} icon={User} dark={dark}>Продающая история</Tab>
          <Tab active={tab === 'offer'} onClick={() => setTab('offer')} icon={Target} dark={dark}>Оффер</Tab>
          <Tab active={tab === 'install'} onClick={() => setTab('install')} icon={Rocket} dark={dark}>Установка BotHelp</Tab>
          <Tab active={tab === 'launch'} onClick={() => setTab('launch')} icon={TrendingUp} dark={dark}>Запуск РСЯ</Tab>
        </div>

        {/* === КАК ПОЛЬЗОВАТЬСЯ === */}
        {tab === 'how' && (
          <div className="space-y-4">
            <div className={`${card} rounded-3xl p-6 md:p-8 shadow-sm border`}>
              <h2 className={`text-2xl font-black mb-4 ${text}`}>🎯 Полная схема воронки</h2>
              <div className="grid md:grid-cols-5 gap-2 mb-6">
                {[['🎨', 'Креатив', 'Картинка для РСЯ'], ['📢', 'Объявление', 'Заголовок+описание'], ['🚀', 'Предлендинг', 'Прогрев 8 мин'], ['📖', 'Продающая', 'Длинный лонгрид'], ['💰', 'Оффер', '990₽ или карта']].map((s, i) => (
                  <div key={i} className={`${dark ? 'bg-slate-800' : 'bg-slate-50'} border-2 ${dark ? 'border-slate-700' : 'border-slate-200'} rounded-xl p-3 text-center relative`}>
                    <div className="text-2xl mb-1">{s[0]}</div>
                    <div className={`font-black text-xs mb-1 ${text}`}>{s[1]}</div>
                    <div className={`text-[10px] ${textMuted} leading-tight`}>{s[2]}</div>
                    {i < 4 && <div className="hidden md:block absolute -right-2 top-1/2 -translate-y-1/2 text-slate-400 text-lg z-10">→</div>}
                  </div>
                ))}
              </div>

              <div className={`${dark ? 'bg-yellow-500/10 border-yellow-500/30' : 'bg-yellow-50 border-yellow-300'} border-2 rounded-xl p-4 mb-4`}>
                <h4 className={`font-black mb-1 flex items-center gap-2 ${text}`}><AlertCircle className="w-4 h-4 text-yellow-500" /> Главное правило</h4>
                <p className={`text-sm ${dark ? 'text-slate-300' : 'text-slate-700'}`}>Тексты предлендинга, продающей истории и оффера не редактируются — выверены и работают в связке. Меняются только: имя, возраст, фото, 3 ссылки.</p>
              </div>

              <h3 className={`text-xl font-black mb-3 ${text}`}>Пошаговый алгоритм</h3>
              <div className="space-y-2">
                {[
                  ['🎨 Креативы', 'Сделай 3-5 квадратных картинок для РСЯ через Canva (фото + текст-оффер)'],
                  ['📢 Объявления', 'Сгенерируй заголовки, описания, быстрые ссылки промтом из вкладки "Объявления РСЯ"'],
                  ['🚀 Предлендинг', 'Выбери шаблон → стиль/палитру → копируй промт → вставь в ИИ → получи HTML'],
                  ['📖 Продающая история', 'Введи свои данные → копируй / скачивай готовый HTML'],
                  ['💰 Оффер', 'Введи 3 ссылки → копируй / скачивай готовый HTML'],
                  ['⚙️ BotHelp', 'Создай 3 мини-лендинга, вставь HTML в Body, подключи кнопки и политику'],
                  ['🚦 Запуск РСЯ', 'Залей объявления и креативы в Яндекс.Директ → запусти кампанию']
                ].map((s, i) => (
                  <div key={i} className={`flex items-start gap-3 p-3 rounded-xl ${dark ? 'bg-slate-800' : 'bg-slate-50'}`}>
                    <div className="w-7 h-7 rounded-full bg-slate-900 text-white flex items-center justify-center font-black text-xs flex-shrink-0">{i + 1}</div>
                    <div className="flex-1">
                      <div className={`font-black text-sm ${text}`}>{s[0]}</div>
                      <div className={`text-xs ${textMuted} mt-0.5`}>{s[1]}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-gradient-to-br from-emerald-500 to-green-600 rounded-3xl p-6 text-white">
              <h3 className="text-xl font-black mb-3">📊 Зачем нужна вся воронка</h3>
              <div className="grid md:grid-cols-2 gap-3 text-sm">
                <div className="bg-white/20 rounded-xl p-3 backdrop-blur"><strong>🔥 РСЯ креатив</strong> — пробивает баннерную слепоту, цепляет глаз</div>
                <div className="bg-white/20 rounded-xl p-3 backdrop-blur"><strong>🎯 Объявление</strong> — даёт высокий CTR, дешёвый клик</div>
                <div className="bg-white/20 rounded-xl p-3 backdrop-blur"><strong>🚀 Предлендинг</strong> — отсекает нецелевых, прогревает за 8 мин</div>
                <div className="bg-white/20 rounded-xl p-3 backdrop-blur"><strong>📖 Продающая</strong> — переводит интерес в желание купить</div>
                <div className="bg-white/20 rounded-xl p-3 backdrop-blur md:col-span-2"><strong>💰 Оффер</strong> — закрывает сделку (990₽ или дебетовая карта по партнёрке банка)</div>
              </div>
            </div>
          </div>
        )}

        {/* === КРЕАТИВЫ === */}
        {tab === 'creative' && (
          <div className="space-y-4">
            <div className={`${card} rounded-3xl p-6 shadow-sm border`}>
              <h2 className={`text-2xl font-black mb-2 ${text}`}>🎨 Создание креативов для РСЯ</h2>
              <p className={`text-sm ${textMuted} mb-4`}>Креатив — это первый контакт с холодным трафиком. Должен пробить баннерную слепоту за 0.5 секунды.</p>

              <div className={`${dark ? 'bg-blue-500/10 border-blue-500/30' : 'bg-blue-50 border-blue-200'} border-2 rounded-xl p-4 mb-4`}>
                <h3 className={`font-black mb-2 flex items-center gap-2 ${text}`}><Lightbulb className="w-5 h-5 text-blue-500" /> Главный секрет</h3>
                <p className={`text-sm ${dark ? 'text-slate-300' : 'text-slate-700'}`}>Живые реальные фото работают лучше нейросетевых картинок! Они вызывают доверие и пробивают баннерную слепоту.</p>
              </div>

              <h3 className={`text-lg font-black mb-3 ${text}`}>📐 Алгоритм создания креатива</h3>
              <div className="space-y-3 mb-6">
                {[
                  ['Получи "чистую" картинку', 'Свое фото ИЛИ генерация в ИИ БЕЗ текста на картинке'],
                  ['Открой Canva', 'canva.com (нужен VPN, бесплатного тарифа хватит)'],
                  ['Задай квадратный формат', '1080x1080px — стандарт для РСЯ'],
                  ['Нанеси текст ПОВЕРХ картинки', 'Крупный, читабельный шрифт. Главный заголовок/оффер'],
                  ['Сделай 5-10 вариантов', 'Тестируй разные креативы → лучшие масштабируй']
                ].map((s, i) => (
                  <div key={i} className={`flex items-start gap-3 p-3 rounded-xl ${dark ? 'bg-slate-800' : 'bg-slate-50'}`}>
                    <div className="w-7 h-7 rounded-full bg-blue-600 text-white flex items-center justify-center font-black text-xs flex-shrink-0">{i + 1}</div>
                    <div>
                      <div className={`font-black text-sm ${text}`}>{s[0]}</div>
                      <div className={`text-xs ${textMuted}`}>{s[1]}</div>
                    </div>
                  </div>
                ))}
              </div>

              <div className={`${dark ? 'bg-red-500/10 border-red-500/30' : 'bg-red-50 border-red-200'} border-2 rounded-xl p-4`}>
                <h3 className={`font-black mb-2 flex items-center gap-2 ${text}`}><AlertCircle className="w-5 h-5 text-red-500" /> ВАЖНЫЙ НЮАНС</h3>
                <p className={`text-sm ${dark ? 'text-slate-300' : 'text-slate-700'}`}><strong>НЕ просите ИИ наносить текст прямо на картинку!</strong> Чаще всего получаются кривые шрифты или несуществующие буквы. Текст всегда наноси сам в Canva.</p>
              </div>
            </div>

            {/* Промты для генерации картинок */}
            <div className={`${card} rounded-3xl p-6 shadow-sm border`}>
              <h3 className={`text-lg font-black mb-3 ${text}`}>🤖 Промты для генерации картинок (Nano Banana / DALL-E / Midjourney)</h3>

              <div className="space-y-3">
                {[
                  {
                    title: '🎯 Промт #1: Реалистичное фото человека (для финансовых офферов)',
                    code: `Photorealistic portrait of a tired but determined Russian middle-aged person sitting at desk with multiple bills and credit card statements scattered around, looking thoughtfully at smartphone screen showing payment notifications. Natural daylight from window, slightly cluttered home office setting, authentic emotion of stress mixed with hope. Shot on Canon 5D, 50mm lens, shallow depth of field. NO TEXT on image. Square format 1080x1080.`
                  },
                  {
                    title: '💡 Промт #2: Контрастная сцена "до/после"',
                    code: `Split-screen photography: left side - exhausted person surrounded by dark colors and bills/papers (struggle), right side - same person smiling, relaxed at modern bright workspace with laptop showing positive numbers (success). Warm transition between sides. Photorealistic, emotional storytelling. NO TEXT, NO LETTERS. Square 1:1 ratio.`
                  },
                  {
                    title: '⚡ Промт #3: Объект-метафора (без людей)',
                    code: `Hyperrealistic still life: open laptop on minimal wooden desk, screen showing rising graph in green, smartphone with notification "+5000₽", stack of physical money next to coffee cup. Bright morning sunlight, cozy productive atmosphere. Russian banking app style. NO TEXT on screens or anywhere. Photorealistic, 4K quality, square format.`
                  },
                  {
                    title: '🔥 Промт #4: Динамичная сцена',
                    code: `Action shot: hand holding smartphone with cracked stress lines around it (representing financial stress), but a bright golden light is breaking through the cracks symbolizing hope and opportunity. Cinematic lighting, dramatic mood, photorealistic style. NO TEXT. Square 1080x1080.`
                  }
                ].map((item, i) => (
                  <details key={i} className={`${dark ? 'bg-slate-800' : 'bg-slate-50'} rounded-xl border ${dark ? 'border-slate-700' : 'border-slate-200'}`}>
                    <summary className={`cursor-pointer p-4 font-bold text-sm ${text} flex items-center justify-between`}>
                      <span>{item.title}</span>
                      <ChevronDown className="w-4 h-4" />
                    </summary>
                    <div className="px-4 pb-4">
                      <pre className={`text-[11px] whitespace-pre-wrap leading-relaxed mb-2 ${dark ? 'text-slate-300' : 'text-slate-700'}`}>{item.code}</pre>
                      <CopyBtn text={item.code} label="Скопировать промт" />
                    </div>
                  </details>
                ))}
              </div>
            </div>

            {/* Чеклист хорошего креатива */}
            <div className={`${card} rounded-3xl p-6 shadow-sm border`}>
              <h3 className={`text-lg font-black mb-3 ${text}`}>✅ Чек-лист хорошего креатива</h3>
              <div className="grid md:grid-cols-2 gap-2">
                {[
                  '✓ Квадрат 1:1 (1080×1080px)',
                  '✓ Живое реалистичное фото (не пластик)',
                  '✓ Лицо человека крупным планом',
                  '✓ Эмоция считывается за 0.5 сек',
                  '✓ Контрастный фон',
                  '✓ Текст КРУПНЫЙ, по центру или сбоку',
                  '✓ Не более 7 слов на картинке',
                  '✓ Главный заголовок = боль или результат',
                  '✓ Цветной акцент (жёлтая плашка под текстом)',
                  '✓ Без мелких деталей (читается на телефоне)',
                  '✓ Без watermark и логотипов сервисов',
                  '✓ 5-10 разных вариантов для теста'
                ].map((item, i) => (
                  <div key={i} className={`p-2 rounded-lg ${dark ? 'bg-slate-800' : 'bg-emerald-50'} text-sm font-bold ${text}`}>{item}</div>
                ))}
              </div>
            </div>

            {/* Идеи заголовков для нанесения */}
            <div className={`${card} rounded-3xl p-6 shadow-sm border`}>
              <h3 className={`text-lg font-black mb-3 ${text}`}>💬 Готовые заголовки для нанесения на креативы</h3>
              <p className={`text-xs ${textMuted} mb-3`}>Выбери 1-2 строки, нанеси крупным шрифтом в Canva. Используй жёлтую плашку под текстом для акцента.</p>
              <div className="grid md:grid-cols-2 gap-2">
                {[
                  '«Выживаешь максимум с трудом? Забирай готовую систему»',
                  '«5000₽ за 2 часа без вложений»',
                  '«Кардинально другой метод дохода в 2026»',
                  '«Без курсов. Без контента. Без навыков.»',
                  '«Купили 5+ курсов — а денег как не было?»',
                  '«Не казино. Не крипта. Белый метод.»',
                  '«Доход 250 000₽ без продаж и маркетинга»',
                  '«Проверено на 100+ людях. Работает в 2026»',
                  '«Узнай за 8 минут — потом не пожалеешь»',
                  '«Хватит покупать курсы. Смотри как по-другому»'
                ].map((h, i) => (
                  <div key={i} className={`p-3 rounded-lg ${dark ? 'bg-slate-800' : 'bg-slate-50'} text-sm font-bold ${text} flex items-center justify-between gap-2`}>
                    <span className="flex-1">{h}</span>
                    <CopyBtn text={h} label="" />
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* === ОБЪЯВЛЕНИЯ === */}
        {tab === 'ads' && (
          <div className="space-y-4">
            <div className={`${card} rounded-3xl p-6 shadow-sm border`}>
              <h2 className={`text-2xl font-black mb-2 ${text}`}>📢 Генератор объявлений для Яндекс.Директ</h2>
              <p className={`text-sm ${textMuted} mb-4`}>Заполни форму → конструктор соберёт промт → ИИ сгенерирует пакет: 15 заголовков + 15 описаний + быстрые ссылки + уточнения.</p>

              <div className={`${dark ? 'bg-blue-500/10 border-blue-500/30' : 'bg-blue-50 border-blue-200'} border-2 rounded-xl p-4 mb-4`}>
                <h3 className={`font-black mb-1 flex items-center gap-2 ${text}`}><Lightbulb className="w-4 h-4 text-blue-500" /> Принцип "ДНК клиента"</h3>
                <p className={`text-xs ${dark ? 'text-slate-300' : 'text-slate-700'}`}>Чем подробнее опишешь продукт, аудиторию и боли — тем точнее ИИ попадёт в ЦА и тем выше будет CTR. Не жалей деталей!</p>
              </div>

              <div className="space-y-3">
                <TextArea label="ПРОДУКТ / УСЛУГА" hint="что ты продвигаешь" value={adProduct} onChange={setAdProduct} rows={3} placeholder="Онлайн-практикум по получению дохода от 250 000₽ через партнёрский маркетинг и оформление дебетовых карт. Стоимость 990₽, есть бесплатный вариант через карту банка..." dark={dark} />
                <TextArea label="ЦЕЛЕВАЯ АУДИТОРИЯ" hint="кто покупает" value={adAudience} onChange={setAdAudience} rows={3} placeholder="Мужчины и женщины 30-55 лет, наёмные работники с зарплатой 30-80к, устали от безденежья, пробовали курсы — без результата. Хотят выйти из найма, но не знают как..." dark={dark} />
                <TextArea label="БОЛИ КЛИЕНТОВ" hint="что мучает аудиторию" value={adPain} onChange={setAdPain} rows={3} placeholder="Постоянная нехватка денег, кредиты, страх будущего, ненависть к найму, разочарование от курсов на которые потратили деньги, ощущение что ничего не получается..." dark={dark} />
                <TextArea label="ГЛАВНОЕ ПРЕИМУЩЕСТВО" hint="чем ты отличаешься" value={adBenefit} onChange={setAdBenefit} rows={2} placeholder="Не нужно учиться новому, нет продаж, нет необходимости вести соцсети. Реальный результат за 2 часа практикума..." dark={dark} />
                <Field label="НИША" hint="ключевые слова" value={adNiche} onChange={setAdNiche} placeholder="партнёрский маркетинг, банковские карты, онлайн-доход" dark={dark} />
              </div>
            </div>

            {/* Готовый промт */}
            <div className="bg-gradient-to-br from-slate-900 to-blue-900 rounded-3xl p-6 text-white">
              <h3 className="text-lg font-black mb-3 flex items-center gap-2"><Wand2 className="w-5 h-5" /> Готовый промт для генератора</h3>
              {!adProduct || !adAudience ? (
                <div className="bg-white/10 rounded-xl p-4 text-center">
                  <AlertCircle className="w-8 h-8 mx-auto mb-2 text-yellow-400" />
                  <p className="text-sm">Заполни минимум "Продукт" и "Аудитория"</p>
                </div>
              ) : (
                <div className="space-y-3">
                  <CopyBtn text={adPrompt} label={`Скопировать промт (${adPrompt.length} симв.)`} big />
                  <details className="bg-black/30 rounded-xl">
                    <summary className="cursor-pointer p-3 font-bold text-sm flex items-center justify-between">
                      <span className="flex items-center gap-2"><Eye className="w-4 h-4" /> Посмотреть промт</span>
                      <ChevronDown className="w-4 h-4" />
                    </summary>
                    <pre className="p-3 text-[10px] whitespace-pre-wrap leading-relaxed max-h-80 overflow-y-auto border-t border-white/10">{adPrompt}</pre>
                  </details>
                  <div className="bg-white/10 rounded-xl p-3 text-xs space-y-1">
                    <p><strong className="text-yellow-400">→</strong> Открой ChatGPT/Claude/Gemini</p>
                    <p><strong className="text-yellow-400">→</strong> Вставь промт, получи 15 заголовков + 15 описаний + быстрые ссылки</p>
                    <p><strong className="text-yellow-400">→</strong> Перенеси в интерфейс Яндекс.Директа</p>
                  </div>
                </div>
              )}
            </div>

            {/* Памятка по лимитам */}
            <div className={`${card} rounded-3xl p-6 shadow-sm border`}>
              <h3 className={`text-lg font-black mb-3 ${text}`}>📏 Лимиты Яндекс.Директа (запомни!)</h3>
              <div className="grid md:grid-cols-2 gap-2">
                {[
                  ['Заголовок 1', 'до 56 символов'],
                  ['Заголовок 2', 'до 30 символов'],
                  ['Текст объявления', 'до 81 символа'],
                  ['Быстрая ссылка (текст)', 'до 30 символов'],
                  ['Быстрая ссылка (описание)', 'до 60 символов'],
                  ['Уточнения', 'до 25 символов'],
                  ['Отображаемая ссылка', 'до 20 символов'],
                  ['Видеообъявление текст', 'до 35 символов']
                ].map((item, i) => (
                  <div key={i} className={`p-3 rounded-lg ${dark ? 'bg-slate-800' : 'bg-slate-50'} flex items-center justify-between`}>
                    <span className={`text-sm font-bold ${text}`}>{item[0]}</span>
                    <span className={`text-xs ${textMuted} font-mono`}>{item[1]}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Структура кабинета */}
            <div className={`${card} rounded-3xl p-6 shadow-sm border`}>
              <h3 className={`text-lg font-black mb-3 ${text}`}>🏗️ Правильная структура кабинета РСЯ</h3>
              <div className={`${dark ? 'bg-amber-500/10 border-amber-500/30' : 'bg-amber-50 border-amber-300'} border-2 rounded-xl p-4 mb-4`}>
                <p className={`text-sm font-bold ${text}`}>⚠️ Если свалить все объявления в одну кучу — автостратегии Яндекса сойдут с ума и сольют бюджет.</p>
              </div>
              <div className="space-y-2">
                {[
                  ['📂 КАМПАНИЯ', 'одна глобальная гипотеза (тест оффера)', 'bg-blue-500'],
                  ['📁 ГРУППА ОБЪЯВЛЕНИЙ', 'один узкий сегмент или одна боль', 'bg-purple-500'],
                  ['📄 ОБЪЯВЛЕНИЕ', 'варианты креативов для этого сегмента', 'bg-emerald-500']
                ].map((item, i) => (
                  <div key={i} className={`flex items-center gap-3 p-3 rounded-xl ${dark ? 'bg-slate-800' : 'bg-slate-50'}`}>
                    <div className={`w-2 h-12 rounded-full ${item[2]}`}></div>
                    <div>
                      <div className={`font-black text-sm ${text}`}>{item[0]}</div>
                      <div className={`text-xs ${textMuted}`}>{item[1]}</div>
                    </div>
                  </div>
                ))}
              </div>
              <div className={`mt-4 ${dark ? 'bg-emerald-500/10 border-emerald-500/30' : 'bg-emerald-50 border-emerald-300'} border-2 rounded-xl p-4`}>
                <h4 className={`font-black text-sm mb-1 ${text}`}>🚀 Аккуратный старт</h4>
                <p className={`text-xs ${dark ? 'text-slate-300' : 'text-slate-700'}`}>Запускай ОДНУ кампанию с бюджетом 5 000₽/неделя. Не тестируй сразу 2-3 кампании — алгоритм запутается.</p>
              </div>
            </div>
          </div>
        )}

        {/* === ПРЕДЛЕНДИНГ === */}
        {tab === 'pre' && (
          <div className="space-y-4">
            {/* ПРЕСЕТЫ */}
            <div className={`${card} rounded-3xl p-6 shadow-sm border`}>
              <div className="flex items-center justify-between mb-3">
                <h2 className={`text-xl font-black ${text} flex items-center gap-2`}><Sparkles className="w-5 h-5 text-yellow-500" /> Готовые пресеты (один клик)</h2>
                <button onClick={resetAll} className={`text-xs font-bold ${textMuted} hover:underline flex items-center gap-1`}><RotateCcw className="w-3 h-3" /> Сброс</button>
              </div>
              <p className={`text-xs ${textMuted} mb-3`}>Кликни на пресет → все настройки выставятся автоматически</p>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2">
                {PRESETS.map((p) => (
                  <button key={p.id} onClick={() => applyPreset(p)} className={`text-left rounded-xl p-3 border-2 transition-all ${dark ? 'border-slate-700 hover:border-slate-500 bg-slate-800' : 'border-slate-200 hover:border-slate-400 bg-white'}`}>
                    <div className="text-2xl mb-1">{p.emoji}</div>
                    <div className={`font-black text-xs mb-0.5 ${text}`}>{p.name}</div>
                    <div className={`text-[10px] ${textMuted} leading-tight`}>{p.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* LIVE PREVIEW */}
            <div className={`${card} rounded-3xl p-6 shadow-sm border`}>
              <h2 className={`text-xl font-black ${text} flex items-center gap-2 mb-3`}><Eye className="w-5 h-5" /> Живое превью</h2>
              <LivePreview tpl={tpl} style={style} palette={palette} dark={dark} />
            </div>

            {/* Шаг 1 */}
            <div className={`${card} rounded-3xl p-6 shadow-sm border`}>
              <h2 className={`text-xl font-black mb-3 ${text}`}>1. Текст шаблона</h2>
              <div className="grid md:grid-cols-3 gap-3">
                {TPL.map((t) => (
                  <button key={t.id} onClick={() => setTpl(t.id)} className={`text-left rounded-2xl p-4 border-2 ${tpl === t.id ? 'border-blue-500 bg-blue-50 shadow-md' : (dark ? 'border-slate-700 hover:border-slate-500 bg-slate-800' : 'border-slate-200 hover:border-slate-300 bg-white')}`}>
                    <div className={`inline-block bg-gradient-to-r ${t.c} text-white text-[10px] font-black uppercase px-2 py-0.5 rounded mb-2`}>{t.a}</div>
                    <h3 className={`font-black text-sm mb-2 ${tpl === t.id ? 'text-slate-900' : text}`}>{t.h}</h3>
                    <div className="flex flex-wrap gap-1">
                      {t.p.map((p, i) => <span key={i} className={`text-[10px] font-bold ${tpl === t.id ? 'bg-white border-slate-300 text-slate-900' : (dark ? 'bg-slate-700 border-slate-600 text-slate-300' : 'bg-white border-slate-200 text-slate-700')} border px-1.5 py-0.5 rounded-full`}>✕ {p}</span>)}
                    </div>
                    {tpl === t.id && <div className="mt-2 text-xs font-black text-emerald-600 flex items-center gap-1"><Check className="w-3 h-3" /> Выбран</div>}
                  </button>
                ))}
              </div>
            </div>

            {/* Шаг 2: Стиль */}
            <div className={`${card} rounded-3xl p-6 shadow-sm border`}>
              <h2 className={`text-xl font-black mb-3 ${text}`}>2. Стиль ({STYLES.length} вариантов)</h2>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 max-h-96 overflow-y-auto">
                {STYLES.map((s) => (
                  <button key={s[0]} onClick={() => setStyle(s[0])} className={`text-left rounded-xl p-3 border-2 ${style === s[0] ? 'border-slate-900 bg-slate-100' : (dark ? 'border-slate-700 hover:border-slate-500 bg-slate-800' : 'border-slate-200 hover:border-slate-400 bg-white')}`}>
                    <div className="text-xl mb-1">{s[2]}</div>
                    <div className={`font-black text-xs mb-0.5 ${style === s[0] ? 'text-slate-900' : text}`}>{s[1]}</div>
                    <div className={`text-[10px] ${style === s[0] ? 'text-slate-600' : textMuted} leading-tight`}>{s[3]}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Шаг 3: Палитра */}
            <div className={`${card} rounded-3xl p-6 shadow-sm border`}>
              <h2 className={`text-xl font-black mb-3 ${text}`}>3. Палитра ({PALETTES.length})</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-2">
                {PALETTES.map((p) => (
                  <button key={p[0]} onClick={() => setPalette(p[0])} className={`rounded-xl p-2 border-2 ${palette === p[0] ? 'border-slate-900 scale-[1.03]' : (dark ? 'border-slate-700 hover:border-slate-500' : 'border-slate-200 hover:border-slate-400')}`}>
                    <div className="flex gap-0.5 mb-1.5 h-10 rounded-lg overflow-hidden">{p[3].map((c, i) => <div key={i} className="flex-1" style={{ background: c }} />)}</div>
                    <div className={`text-[10px] font-black ${text} flex items-center gap-1`}><span>{p[2]}</span><span className="truncate">{p[1]}</span></div>
                  </button>
                ))}
              </div>
            </div>

            {/* Эффекты + типо */}
            <div className="grid md:grid-cols-2 gap-3">
              <div className={`${card} rounded-3xl p-6 shadow-sm border`}>
                <h2 className={`text-base font-black mb-2 ${text}`}>4. Эффекты ({effects.length}/{EFFECTS.length})</h2>
                <div className="space-y-1 max-h-64 overflow-y-auto pr-2">
                  {EFFECTS.map((e) => (
                    <label key={e[0]} className={`flex items-center gap-2 p-2 rounded-lg cursor-pointer border ${effects.includes(e[0]) ? 'border-blue-500 bg-blue-50' : (dark ? 'border-slate-700 hover:bg-slate-800' : 'border-slate-100 hover:bg-slate-50')}`}>
                      <input type="checkbox" checked={effects.includes(e[0])} onChange={() => toggleEf(e[0])} className="accent-blue-600" />
                      <span className={`text-xs font-bold flex-1 ${effects.includes(e[0]) ? 'text-slate-900' : text}`}>{e[1]}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="space-y-3">
                <div className={`${card} rounded-3xl p-6 shadow-sm border`}>
                  <h2 className={`text-base font-black mb-2 ${text}`}>Типографика</h2>
                  <div className="space-y-1">
                    {TYPOS.map((t) => (
                      <label key={t[0]} className={`flex items-start gap-2 p-2 rounded-lg cursor-pointer border ${typo === t[0] ? 'border-slate-900 bg-slate-100' : (dark ? 'border-slate-700 hover:bg-slate-800' : 'border-slate-100')}`}>
                        <input type="radio" checked={typo === t[0]} onChange={() => setTypo(t[0])} className="mt-0.5 accent-slate-900" />
                        <div><div className={`font-black text-xs ${typo === t[0] ? 'text-slate-900' : text}`}>{t[1]}</div><div className={`text-[10px] ${typo === t[0] ? 'text-slate-600' : textMuted}`}>{t[2]}</div></div>
                      </label>
                    ))}
                  </div>
                </div>
                <div className={`${card} rounded-3xl p-6 shadow-sm border`}>
                  <h2 className={`text-base font-black mb-2 ${text}`}>Структура</h2>
                  <div className="space-y-1">
                    {LAYOUTS.map((l) => (
                      <label key={l[0]} className={`flex items-start gap-2 p-2 rounded-lg cursor-pointer border ${layout === l[0] ? 'border-slate-900 bg-slate-100' : (dark ? 'border-slate-700 hover:bg-slate-800' : 'border-slate-100')}`}>
                        <input type="radio" checked={layout === l[0]} onChange={() => setLayout(l[0])} className="mt-0.5 accent-slate-900" />
                        <div><div className={`font-black text-xs ${layout === l[0] ? 'text-slate-900' : text}`}>{l[1]}</div><div className={`text-[10px] ${layout === l[0] ? 'text-slate-600' : textMuted}`}>{l[2]}</div></div>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Промт */}
            <div className="bg-gradient-to-br from-slate-900 to-blue-900 rounded-3xl p-6 text-white shadow-xl">
              <h2 className="text-xl font-black mb-3 flex items-center gap-2"><Wand2 className="w-5 h-5" /> Готовый промт</h2>
              {!canPre ? (
                <div className="bg-white/10 rounded-xl p-4 text-center">
                  <AlertCircle className="w-8 h-8 mx-auto mb-2 text-yellow-400" />
                  <p className="text-sm">Заполни шаги выше: {!tpl && '✕ текст '}{!style && '✕ стиль '}{!palette && '✕ палитра'}</p>
                </div>
              ) : (
                <div className="space-y-3">
                  <CopyBtn text={prompt} label={`Скопировать промт (${prompt.length} симв.)`} big />
                  <details className="bg-black/30 rounded-xl">
                    <summary className="cursor-pointer p-3 font-bold text-sm flex items-center justify-between">
                      <span className="flex items-center gap-2"><Eye className="w-4 h-4" /> Посмотреть промт</span>
                      <ChevronDown className="w-4 h-4" />
                    </summary>
                    <pre className="p-3 text-[10px] whitespace-pre-wrap leading-relaxed max-h-80 overflow-y-auto border-t border-white/10">{prompt}</pre>
                  </details>
                  <div className="bg-white/10 rounded-xl p-3 text-xs space-y-1">
                    <p><strong className="text-yellow-400">→</strong> Открой ChatGPT/Claude/Gemini</p>
                    <p><strong className="text-yellow-400">→</strong> Вставь промт, получи HTML</p>
                    <p><strong className="text-yellow-400">→</strong> Вставь HTML в Body мини-лендинга BotHelp</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* === ПРОДАЮЩАЯ === */}
        {tab === 'sale' && (
          <div className="space-y-4">
            <div className={`${card} rounded-3xl p-6 shadow-sm border`}>
              <h2 className={`text-2xl font-black mb-3 ${text}`}>📖 Продающая история</h2>
              <p className={`text-sm ${textMuted} mb-4`}>HTML внутри. Заполни поля → конструктор подставит данные → копируй или скачивай готовый код.</p>

              <div className={`${dark ? 'bg-amber-500/10 border-amber-500/30' : 'bg-amber-50 border-amber-200'} border-2 rounded-xl p-3 mb-4 flex items-start gap-2`}>
                <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                <p className={`text-xs ${dark ? 'text-amber-200' : 'text-amber-900'}`}><strong>Текст не меняется!</strong> Меняются только имя, возраст, фото и финальная ссылка.</p>
              </div>

              <div className="grid grid-cols-2 gap-2 mb-4">
                <button onClick={() => setGender('male')} className={`p-3 rounded-xl border-2 font-black text-sm ${gender === 'male' ? 'border-blue-500 bg-blue-50 text-slate-900' : (dark ? 'border-slate-700 bg-slate-800 text-slate-300' : 'border-slate-200 text-slate-700')}`}>👨 Мужская версия</button>
                <button onClick={() => setGender('female')} className={`p-3 rounded-xl border-2 font-black text-sm ${gender === 'female' ? 'border-pink-500 bg-pink-50 text-slate-900' : (dark ? 'border-slate-700 bg-slate-800 text-slate-300' : 'border-slate-200 text-slate-700')}`}>👩 Женская версия</button>
              </div>

              <div className="grid md:grid-cols-2 gap-3">
                <Field label="Имя и фамилия" hint="Например: Павел Андрюшенков" value={name} onChange={setName} placeholder="Иван Иванов" dark={dark} />
                <Field label="Возраст" hint="без слова 'лет'" value={age} onChange={setAge} placeholder="35" dark={dark} />
                <Field label="Краткое имя" hint="как друзья называют" value={shortName} onChange={setShortName} placeholder="Ваня" dark={dark} />
                <Field label="Ссылка на ваше фото" hint="прямая ссылка на jpg/png" value={photo} onChange={setPhoto} placeholder="https://..." dark={dark} />
                <div className="md:col-span-2"><Field label="Ссылка на оффер" hint="ваш мини-лендинг оффера" value={offer} onChange={setOffer} placeholder="https://bothelp.cc/mini?domain=..." dark={dark} /></div>
              </div>

              <div className="flex gap-2 mt-4">
                <button onClick={fillSaleDemo} className={`flex-1 px-4 py-3 rounded-xl border-2 font-black text-xs ${dark ? 'border-slate-700 hover:bg-slate-800 text-slate-300' : 'border-slate-200 hover:bg-slate-50 text-slate-700'}`}>📝 Заполнить демо</button>
                <button onClick={resetSale} className={`px-4 py-3 rounded-xl border-2 font-black text-xs flex items-center gap-1 ${dark ? 'border-slate-700 hover:bg-slate-800 text-slate-300' : 'border-slate-200 hover:bg-slate-50 text-slate-700'}`}><RotateCcw className="w-3 h-3" /> Сброс</button>
              </div>
            </div>

            <div className="bg-gradient-to-br from-slate-900 to-blue-900 rounded-3xl p-6 text-white">
              <h3 className="text-lg font-black mb-3 flex items-center gap-2"><Copy className="w-5 h-5" /> Готовый HTML ({Math.round(saleHtml.length / 1000)}KB)</h3>
              <div className="grid md:grid-cols-2 gap-2 mb-3">
                <CopyBtn text={saleHtml} label={`Скопировать HTML ${gender === 'male' ? '👨' : '👩'}`} big />
                <DownloadBtn filename={`prodayushaya-istoriya-${gender}.html`} content={saleHtml} label="Скачать .html файл" />
              </div>
              <details className="bg-black/30 rounded-xl">
                <summary className="cursor-pointer p-3 font-bold text-sm flex items-center justify-between">
                  <span className="flex items-center gap-2"><Eye className="w-4 h-4" /> Превью кода</span>
                  <ChevronDown className="w-4 h-4" />
                </summary>
                <pre className="p-3 text-[9px] whitespace-pre-wrap leading-relaxed max-h-80 overflow-y-auto border-t border-white/10">{saleHtml}</pre>
              </details>
              <div className="bg-white/10 rounded-xl p-3 text-xs mt-3">
                <strong className="text-yellow-400">📍 Куда вставлять:</strong> BotHelp → Мини-лендинг → "Вставить HTML-код" → Body
              </div>
            </div>
          </div>
        )}

        {/* === ОФФЕР === */}
        {tab === 'offer' && (
          <div className="space-y-4">
            <div className={`${card} rounded-3xl p-6 shadow-sm border`}>
              <h2 className={`text-2xl font-black mb-3 ${text}`}>💰 Оффер (Практикум)</h2>
              <p className={`text-sm ${textMuted} mb-4`}>HTML внутри. Введи 3 ссылки → копируй или скачивай готовый код.</p>

              <div className={`${dark ? 'bg-amber-500/10 border-amber-500/30' : 'bg-amber-50 border-amber-200'} border-2 rounded-xl p-3 mb-4 flex items-start gap-2`}>
                <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                <p className={`text-xs ${dark ? 'text-amber-200' : 'text-amber-900'}`}><strong>Текст, цена 990₽, отзывы и команда — не редактируются!</strong> Меняются только 3 личные ссылки.</p>
              </div>

              <div className="space-y-3">
                <Field label="① Ссылка на оплату GetCourse" hint="ваша партнёрская ссылка на 990₽" value={pay} onChange={setPay} placeholder="https://voronkapodkluch.getcourse.ru/page2?gcao=ВАШ_ID" dark={dark} />
                <Field label="② Ваш Telegram" hint="https://t.me/your_username" value={tg} onChange={setTg} placeholder="https://t.me/your_username" dark={dark} />
                <Field label="③ Ваш MAX" hint="ссылка на профиль MAX" value={max} onChange={setMax} placeholder="https://iimax.ru/your_username" dark={dark} />
              </div>

              <div className="flex gap-2 mt-4">
                <button onClick={fillOfferDemo} className={`flex-1 px-4 py-3 rounded-xl border-2 font-black text-xs ${dark ? 'border-slate-700 hover:bg-slate-800 text-slate-300' : 'border-slate-200 hover:bg-slate-50 text-slate-700'}`}>📝 Заполнить демо</button>
                <button onClick={resetOffer} className={`px-4 py-3 rounded-xl border-2 font-black text-xs flex items-center gap-1 ${dark ? 'border-slate-700 hover:bg-slate-800 text-slate-300' : 'border-slate-200 hover:bg-slate-50 text-slate-700'}`}><RotateCcw className="w-3 h-3" /> Сброс</button>
              </div>
            </div>

            <div className="bg-gradient-to-br from-yellow-400 to-amber-500 rounded-3xl p-6 text-slate-900">
              <h3 className="text-lg font-black mb-3 flex items-center gap-2"><Copy className="w-5 h-5" /> Готовый HTML ({Math.round(offerHtml.length / 1000)}KB)</h3>
              <div className="grid md:grid-cols-2 gap-2 mb-3">
                <CopyBtn text={offerHtml} label="Скопировать HTML оффера" big dark />
                <DownloadBtn filename="offer-praktikum.html" content={offerHtml} label="Скачать .html файл" />
              </div>
              <details className="bg-black/20 rounded-xl">
                <summary className="cursor-pointer p-3 font-bold text-sm flex items-center justify-between">
                  <span className="flex items-center gap-2"><Eye className="w-4 h-4" /> Превью кода</span>
                  <ChevronDown className="w-4 h-4" />
                </summary>
                <pre className="p-3 text-[9px] whitespace-pre-wrap leading-relaxed max-h-80 overflow-y-auto border-t border-black/10">{offerHtml}</pre>
              </details>
            </div>
          </div>
        )}

        {/* === УСТАНОВКА === */}
        {tab === 'install' && (
          <div className={`${card} rounded-3xl p-6 md:p-8 shadow-sm border`}>
            <h2 className={`text-2xl font-black mb-4 flex items-center gap-2 ${text}`}><Rocket className="w-6 h-6 text-blue-600" /> Установка в BotHelp</h2>
            <div className="space-y-3">
              {[
                ['Создайте Мини-лендинг', 'BotHelp → "Инструменты роста" (↗ слева) → "Новый инструмент" → "Мини-лендинг"'],
                ['Заполните название', 'Например: "Предлендинг РСЯ", "Продающая история", "Оффер Практикум". Поля "Заголовок" и "Описание" — ПУСТЫМИ!'],
                ['Включите HTML-код', 'Прокрутите вниз → "Расширенные настройки" → включите тумблер "Вставить HTML-код"'],
                ['Вставьте код в Body', 'Скопируйте полностью HTML и вставьте в нижнее окно Body. Поле Head оставьте пустым.'],
                ['Только для предлендинга: аналитика', 'Включите "Отслеживать подписку через аналитику" → впишите номер счётчика Яндекс.Метрики'],
                ['Только для предлендинга: кнопки мессенджеров', 'В разделе "Добавить новую кнопку" нажмите Telegram и MAX → выберите своего бота и шаг "Старт"'],
                ['Политика конфиденциальности', 'Включите "Настроить пользовательские соглашения" → "Один для всех документов" → ссылка на Политику'],
                ['Сохраните', 'Зелёная кнопка "СОХРАНИТЬ" → справа появится готовая ссылка на ваш мини-лендинг']
              ].map((s, i) => (
                <div key={i} className={`flex gap-3 p-4 rounded-xl ${dark ? 'bg-slate-800' : 'bg-slate-50'}`}>
                  <div className="w-8 h-8 rounded-lg bg-slate-900 text-white flex items-center justify-center font-black text-sm flex-shrink-0">{i + 1}</div>
                  <div>
                    <h4 className={`font-black text-sm mb-0.5 ${text}`}>{s[0]}</h4>
                    <p className={`text-xs ${textMuted} leading-relaxed`}>{s[1]}</p>
                  </div>
                </div>
              ))}
            </div>
            <div className={`mt-6 ${dark ? 'bg-emerald-500/10 border-emerald-500/30' : 'bg-emerald-50 border-emerald-200'} border-2 rounded-xl p-4`}>
              <h4 className={`font-black text-sm mb-2 flex items-center gap-2 ${text}`}>✅ Готово</h4>
              <p className={`text-xs ${dark ? 'text-slate-300' : 'text-slate-700'}`}>У вас 3 мини-лендинга в BotHelp. РСЯ запускайте на ссылку <strong>предлендинга</strong>. Из чат-бота высылайте ссылку на <strong>продающую историю</strong>. С неё кнопка ведёт на <strong>оффер</strong>.</p>
            </div>
          </div>
        )}

        {/* === ЗАПУСК РСЯ === */}
        {tab === 'launch' && (
          <div className="space-y-4">
            <div className={`${card} rounded-3xl p-6 shadow-sm border`}>
              <h2 className={`text-2xl font-black mb-3 flex items-center gap-2 ${text}`}><TrendingUp className="w-6 h-6 text-blue-600" /> Запуск кампании в Яндекс.Директ</h2>
              <p className={`text-sm ${textMuted} mb-4`}>Когда у тебя есть креативы, объявления и ссылка на предлендинг — самое время запускать рекламу.</p>

              <h3 className={`text-lg font-black mb-3 ${text}`}>📋 Чек-лист подготовки</h3>
              <div className="grid md:grid-cols-2 gap-2 mb-6">
                {[
                  '✓ Зарегистрирован Яндекс ID для Директа',
                  '✓ Подключена Яндекс.Метрика к домену',
                  '✓ Настроены цели в Метрике',
                  '✓ Готово 5-10 креативов 1080×1080',
                  '✓ Сгенерированы 15 заголовков',
                  '✓ Сгенерированы 15 описаний',
                  '✓ 8 быстрых ссылок',
                  '✓ Опубликован предлендинг в BotHelp',
                  '✓ Бюджет 5000₽/неделя минимум',
                  '✓ Подключена дебетовая карта для оплаты'
                ].map((item, i) => (
                  <div key={i} className={`p-3 rounded-lg ${dark ? 'bg-slate-800' : 'bg-emerald-50'} text-sm font-bold ${text}`}>{item}</div>
                ))}
              </div>

              <h3 className={`text-lg font-black mb-3 ${text}`}>🚀 Пошаговый запуск</h3>
              <div className="space-y-3">
                {[
                  ['Зайди в direct.yandex.ru', 'Войди под аккаунтом, который будешь использовать для рекламы. Лучше создать отдельный — на случай блокировок.'],
                  ['Создай новую кампанию', '"Конверсии и трафик" → "Реклама в РСЯ" → "Создать кампанию"'],
                  ['Назови кампанию по гипотезе', 'Например: "Тест-1: Боль курсов | Шаблон-1 | Финтех-стиль". Так ты отличишь её от других.'],
                  ['Стратегия: автостратегия', 'Выбери "Оптимизация конверсий". Цель — конверсия из Метрики (subscription_ml_2 или real_bot_start)'],
                  ['Бюджет', '5000₽ в неделю на старт. После обучения алгоритма (7-14 дней) можно увеличивать.'],
                  ['Регион показа', 'РФ (без Крыма) или конкретный регион вашего таргета'],
                  ['Создай группу объявлений', 'Узкий сегмент, например "Мужчины 35-50 в кредитах"'],
                  ['Загрузи объявления', 'Скопируй из ИИ-генератора заголовки, описания, быстрые ссылки. Загрузи 5-10 креативов.'],
                  ['Укажи ссылку', 'Ссылка на твой предлендинг из BotHelp'],
                  ['Отправь на модерацию', 'Обычно проходит за 1-3 часа. Иногда требуют документы.'],
                  ['После запуска — НЕ ТРОГАЙ', 'Дай алгоритму обучиться 7-14 дней. Изменения сбивают обучение.']
                ].map((s, i) => (
                  <div key={i} className={`flex gap-3 p-4 rounded-xl ${dark ? 'bg-slate-800' : 'bg-slate-50'}`}>
                    <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center font-black text-sm flex-shrink-0">{i + 1}</div>
                    <div>
                      <h4 className={`font-black text-sm mb-0.5 ${text}`}>{s[0]}</h4>
                      <p className={`text-xs ${textMuted} leading-relaxed`}>{s[1]}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className={`${card} rounded-3xl p-6 shadow-sm border`}>
              <h3 className={`text-lg font-black mb-3 ${text}`}>📊 Метрики, за которыми следить</h3>
              <div className="space-y-2">
                {[
                  ['CTR (кликабельность)', 'Норма: 0.5-1.5% для РСЯ. Ниже — креативы плохие.'],
                  ['CPC (цена клика)', 'Норма для России: 5-30₽. Выше 50₽ — пересматривай объявления.'],
                  ['CR (конверсия в лид)', 'Норма: 5-15% с предлендинга в бота. Ниже — переделывай предлендинг.'],
                  ['CPL (цена лида)', 'Цель: 100-300₽ за подписчика бота. Выше — оптимизируй воронку.'],
                  ['Окупаемость', 'Считай: сколько заработал с одного оплаченного клиента / сколько потратил на 100 кликов'],
                ].map((item, i) => (
                  <div key={i} className={`p-3 rounded-lg ${dark ? 'bg-slate-800' : 'bg-slate-50'} flex items-start justify-between gap-3`}>
                    <span className={`text-sm font-bold ${text}`}>{item[0]}</span>
                    <span className={`text-xs ${textMuted} text-right max-w-md`}>{item[1]}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className={`${card} rounded-3xl p-6 shadow-sm border`}>
              <h3 className={`text-lg font-black mb-3 ${text}`}>⚠️ Частые ошибки новичков</h3>
              <div className="space-y-2">
                {[
                  ['Меняют объявления каждый день', 'Алгоритм обучается 7-14 дней. Постоянные правки сбивают обучение → дорогие лиды.'],
                  ['Запускают сразу 10 кампаний', 'Бюджет распыляется. Лучше одна кампания с 5к₽/неделя, чем десять по 500₽.'],
                  ['Не настраивают цели в Метрике', 'Без целей алгоритм не понимает, кого приводить. Лиды дорожают в 3-5 раз.'],
                  ['Используют только нейросетевые картинки', 'Они одинаково "пластиковые". Чередуй с реальными фото — пробивают баннерную слепоту.'],
                  ['Льют на главную страницу', 'Главная не конвертит холодный трафик! Только специальный предлендинг под РСЯ.']
                ].map((item, i) => (
                  <div key={i} className={`p-3 rounded-lg ${dark ? 'bg-red-500/10 border border-red-500/30' : 'bg-red-50 border border-red-200'}`}>
                    <div className={`font-black text-sm mb-1 ${text}`}>❌ {item[0]}</div>
                    <div className={`text-xs ${dark ? 'text-slate-300' : 'text-slate-700'}`}>{item[1]}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        <div className={`text-center text-xs ${textMuted} mt-8 pb-4`}>Конструктор воронки 2.0 — Креативы → РСЯ → Бот → Продающая история → Оффер</div>
      </div>
    </div>
  );
}