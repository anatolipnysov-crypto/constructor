const normalize = (value = '') => String(value || '')
  .toLowerCase()
  .replace(/ё/g, 'е')
  .replace(/[«»“”"'`]/g, ' ')
  .replace(/[^a-zа-я0-9]+/gi, ' ')
  .replace(/\s+/g, ' ')
  .trim();

const CAMPAIGN_SEMANTIC_PROFILES = [
  {
    id: 'salary-gap',
    label: 'Почему деньги заканчиваются раньше зарплаты',
    badge: 'Разбор повторяющегося денежного сценария',
    phrases: ['до зарплаты', 'раньше зарплаты', 'зарплата пришла', 'деньги закончились', 'на карте почти пусто', 'жить от зарплаты до зарплаты'],
    keywords: ['зарплат', 'остаток', 'дотянуть', 'заканчива', 'не хватает', 'каждый месяц'],
    defaultTitle: 'Зарплата пришла, а денег снова почти нет?',
    defaultText: 'Разберитесь, почему деньги заканчиваются раньше срока и какой повторяющийся сценарий возвращает месяц к нулю.',
    methodName: 'Найдём повторяющийся сценарий, который незаметно съедает зарплату',
    trustSmall: 'Без обвинений и запретов на всё подряд: сначала видно, где именно месяц начинает разваливаться.',
    painItems: [
      'зарплата приходит, но чувство запаса исчезает уже через несколько дней',
      'обычные расходы кажутся небольшими, однако вместе снова обнуляют остаток',
      'обещание «в этот раз буду аккуратнее» не меняет итог месяца',
      'экономия на отдельных покупках не объясняет, почему сценарий повторяется'
    ],
    cards: [
      { title: 'Незаметные утечки', text: 'Увидите, какие привычные решения съедают остаток, даже когда крупных покупок не было.' },
      { title: 'Месяц по кругу', text: 'Разберёте, почему попытка просто тратить аккуратнее снова приводит к той же точке.' },
      { title: 'Первый запас', text: 'Поймёте, с какого небольшого изменения начать, чтобы деньги задерживались дольше.' }
    ],
    valueTitle: 'Что станет понятно после короткого разбора',
    valueItems: [
      'куда уходит зарплата между обязательными и незаметными расходами',
      'почему одной жёсткой экономии обычно недостаточно для устойчивого остатка',
      'какой первый шаг поможет перестать каждый месяц начинать с нуля'
    ],
    actionTitle: 'Разберитесь, куда уходит зарплата',
    actionSubtitle: 'Ответьте на четыре вопроса, получите результат и откройте защищённую регистрацию.',
    bannerStyleHints: ['editorialGold', 'whiteGoldPremium', 'blueTrust', 'redWhite'],
    bannerSceneThemes: ['cozyHome', 'cityLifestyle', 'office'],
    bannerPersonas: ['woman', 'man', 'mixed'],
    bannerSubjectModes: ['noPerson', 'generatedPerson', 'metaphor', 'generatedPerson', 'noPerson', 'metaphor'],
    bannerNoPersonDirections: [
      'предметная сцена без людей: обычные продукты, закрытый кошелёк, календарь месяца и несколько чеков без читаемых цифр показывают, как запас постепенно исчезает',
      'светлая домашняя среда без человека: почти пустая полка для повседневных запасов, список обязательных дел без читаемого текста и аккуратно сложенные покупки создают ощущение конца месяца',
      'реалистичная метафора без людей: прозрачная ёмкость с уменьшающимся запасом жетонов стоит между датами начала и конца месяца, без банковской символики и выдуманных цифр',
      'вид сверху на спокойный бытовой стол без людей: ключи, проездной, продуктовая сумка и конверты распределены по неделе, а свободного пространства почти не осталось'
    ],
    bannerDirections: [
      'реальная сцена через несколько дней после зарплаты: взрослый человек дома сверяет обычные покупки и остаток, без банковских логотипов и читаемых цифр',
      'вечер после продуктового магазина: пакеты, чек без читаемого текста, спокойное напряжение и вопрос, куда снова ушли деньги',
      'городской день перед зарплатой: человек проверяет телефон у кафе или в транспорте, сдержанная тревога, но без бедности и унижения'
    ],
    bannerCompositions: [
      'светлый документальный постер: живая бытовая сцена занимает одну треть, крупный вопрос и короткий подзаголовок собраны в другой',
      'редакционный white-space макет с одним цветовым акцентом и крупной типографикой, без декоративного шума',
      'full-bleed lifestyle кадр с полупрозрачной светлой подложкой под текст, без стандартной синей половины'
    ],
    prelandingVisualScenes: [
      'adult person 34-48 in a bright real kitchen after payday, ordinary groceries and a closed notebook nearby, thoughtful but composed, authentic daylight, no readable numbers or banking UI',
      'different adult reviewing a month of ordinary household choices at a dining table, receipts without readable text and simple objects, documentary editorial light, no poverty cliche',
      'calmer adult with phone near a bright window or city cafe after understanding the next step, natural relief, premium realistic lifestyle photography'
    ]
  },
  {
    id: 'own-course',
    label: 'Как вернуть себе свой курс',
    badge: 'Разбор пути, который больше не ваш',
    phrases: ['не своим делом', 'насиловать душу', 'душе плохо', 'душа не лежит', 'чужая жизнь', 'свою настоящую жизнь', 'свое дело', 'свой путь', 'там застрял'],
    keywords: ['не своим', 'душ', 'застрял', 'свой курс', 'свой путь', 'своим делом', 'призван', 'реализовать себя'],
    defaultTitle: 'Хватит жить не своим делом?',
    defaultText: 'Разберитесь, почему привычный маршрут держит вас там, где душе плохо, и как вернуть себе направление.',
    methodName: 'Отделим чужой маршрут от направления, которое человек действительно выбирает сам',
    trustSmall: 'Без призыва всё бросить: сначала становится видно, почему нынешний путь ощущается чужим и где можно вернуть себе управление.',
    painItems: [
      'каждое утро начинается с маршрута, который давно не ощущается своим',
      'привычка и обязательства удерживают сильнее, чем интерес к самому делу',
      'мысль о переменах возвращается, но не превращается в понятное направление',
      'человек продолжает чужой сценарий, хотя внутренне уже вырос из него'
    ],
    cards: [
      { title: 'Чужой маршрут', text: 'Увидите, что именно удерживает вас в деле, которое больше не даёт опоры и смысла.' },
      { title: 'Свой ориентир', text: 'Отделите усталость от настоящего желания сменить направление и вернуть себе выбор.' },
      { title: 'Первый поворот', text: 'Поймёте, какой безопасный шаг поможет снова управлять курсом, не разрушая жизнь одним решением.' }
    ],
    valueTitle: 'Что поможет снова выбрать свой курс',
    valueItems: [
      'почему привычный путь ощущается чужим, хотя внешне всё выглядит нормально',
      'как заметить направление, которое действительно откликается вам, а не окружению',
      'с какого реального шага начать возвращать себе управление без резкого прыжка в неизвестность'
    ],
    actionTitle: 'Проверьте, почему привычный путь стал чужим',
    actionSubtitle: 'Откройте короткий разбор и найдите первый шаг, который возвращает вам управление.',
    bannerStyleHints: ['editorialGold', 'premiumCalm', 'outdoorFreedom', 'blueTrust', 'redWhite'],
    bannerSceneThemes: ['seaEscape', 'travel', 'hobby', 'craft', 'cityMomentum'],
    bannerPersonas: ['man', 'woman', 'mixed'],
    bannerSubjectModes: ['metaphor', 'generatedPerson', 'noPerson', 'generatedPerson', 'metaphor', 'noPerson'],
    bannerNoPersonDirections: [
      'реалистичная метафора без людей: штурвал парусной яхты, компас и открытая линия горизонта показывают возвращение к своему курсу; это действие и направление, а не курорт и не роскошь',
      'предметная сцена без людей в настоящей мастерской: рабочие инструменты, материал и незавершённая вещь в естественном свете передают возвращение к своему делу',
      'средовая сцена без людей: ясная развилка двух дорог или городских маршрутов, один путь уходит в повторяющийся тоннель, другой открывается к дневному свету',
      'метафорический кадр без человека: открытая дверь из однообразного рабочего коридора ведёт в светлое пространство с собственным проектом, без надписей и мотивационных клише'
    ],
    bannerDirections: [
      'взрослый человек реально управляет парусной яхтой у штурвала на рассвете как метафора взятого в свои руки курса; это не отпуск, не курорт и не демонстрация роскоши; руки управляют штурвалом, взгляд направлен по маршруту',
      'взрослый человек находится у ясной развилки дороги или городских маршрутов и осознанно выбирает одно направление, оставляя прежнее позади; сцена про решение, а не про туристическую прогулку',
      'взрослый человек работает в светлой мастерской или студии и занят своим настоящим ремеслом; руки вовлечены в осмысленное дело, без постановочной позы и офисного клише',
      'взрослый человек выходит из повторяющегося рабочего пространства в открытый дневной свет; движение решительное, но без сцены увольнения, драматичного побега и разрушения прежней жизни'
    ],
    bannerCompositions: [
      'сильный редакционный постер: действие героя раскрывает метафору курса, а крупный заголовок стоит в чистой зоне и не перекрывает руки, лицо или направление взгляда',
      'кинематографичный lifestyle-кадр с реальным движением и большим воздухом под текст, без случайной дорогой декорации',
      'светлая журнальная композиция: герой управляет действием в одной части кадра, оффер и короткое объяснение собраны в другой'
    ],
    prelandingVisualScenes: [
      'adult person actively steering a sailboat at sunrise as a grounded metaphor for choosing their own course, hands on the helm, focused gaze, not a luxury vacation or resort advertisement',
      'different adult at a clear fork in a real road or urban route, deliberately choosing one direction and leaving the old routine behind, documentary daylight, no travel postcard cliche',
      'different adult engaged in meaningful craft or creative work in a bright authentic studio, hands actively making something, composed confidence, no staged office portrait'
    ]
  },
  {
    id: 'effort-stagnation',
    label: 'Почему больше работы не приносит больше свободных денег',
    badge: 'Разбор усилий, которые не меняют итог',
    phrases: ['работаете все больше', 'работы все больше', 'берете подработки', 'сил на работу', 'доход почти не растет', 'денег не прибавилось', 'свободных денег нет'],
    keywords: ['подработ', 'усталост', 'работа', 'усили', 'доход', 'не растет', 'не прибав'],
    defaultTitle: 'Работаете всё больше, а свободных денег не становится?',
    defaultText: 'Разберитесь, почему дополнительные часы и подработки увеличивают усталость, но почти не меняют итог месяца.',
    methodName: 'Отделим реальные точки роста от бесконечного добавления рабочих часов',
    trustSmall: 'Разбор не предлагает работать ещё больше. Он показывает, почему текущие усилия не превращаются в заметный результат.',
    painItems: [
      'основная работа уже забирает силы, а сверху добавляются вечера и выходные',
      'дополнительный доход растворяется в привычных счетах и семейных расходах',
      'усталости стало больше, но финансовой свободы не прибавилось',
      'очередная подработка лечит месяц, но не меняет сам сценарий'
    ],
    cards: [
      { title: 'Цена подработки', text: 'Увидите, сколько времени и сил забирает дополнительный доход и что реально остаётся после него.' },
      { title: 'Точка застоя', text: 'Разберёте, почему больше часов не обязательно превращаются в больше свободных денег.' },
      { title: 'Другой рычаг', text: 'Поймёте, где искать изменение результата, не добавляя ещё одну смену в календарь.' }
    ],
    valueTitle: 'Что разберём вместо совета «работайте больше»',
    valueItems: [
      'куда исчезает дополнительный доход после подработок и премий',
      'какие решения удерживают итог месяца на прежнем уровне',
      'с чего начать, чтобы усилия наконец начали менять финансовую картину'
    ],
    actionTitle: 'Проверьте, почему усилия не меняют итог',
    actionSubtitle: 'Пройдите мини-тест и найдите точку, с которой стоит начать.',
    bannerStyleHints: ['newspaperShock', 'blueTrust', 'cleanSystem', 'darkOrange'],
    bannerSceneThemes: ['cityLifestyle', 'office', 'cozyHome'],
    bannerPersonas: ['man', 'woman', 'mixed'],
    bannerSubjectModes: ['noPerson', 'generatedPerson', 'metaphor', 'noPerson', 'generatedPerson', 'metaphor'],
    bannerNoPersonDirections: [
      'предметная сцена без людей после длинного дня: закрытый ноутбук, рабочий пропуск, две пары ключей, поздние часы без читаемых цифр и нетронутый ужин показывают цену второй смены',
      'светлая городская среда без человека: повторяющиеся следы одного маршрута между офисом и домом образуют замкнутый круг, без драматичного мрака',
      'реалистичная метафора без людей: беговая дорожка движется, но остаётся на месте, рядом растёт стопка выполненных задач без читаемых надписей',
      'вид сверху без людей: календарь, рабочие перчатки или гарнитура, закрытый ноутбук и пустое место для отдыха показывают, что часов стало больше, а пространства для жизни меньше'
    ],
    bannerDirections: [
      'взрослый человек после длинного рабочего дня выходит из офиса или кафе-коворкинга, движение города и усталость без мрачной драмы',
      'вечерняя домашняя сцена после второй работы: куртка на стуле, закрытый ноутбук, человек смотрит на календарь без читаемых данных',
      'утренний городской маршрут на очередную смену, живой полный рост и ощущение бесконечного круга, не туристическая прогулка'
    ],
    bannerCompositions: [
      'динамичный диагональный постер с движением героя и крупным вопросом в свободной зоне',
      'контрастный editorial layout: слева часы и усилие в живой сцене, справа короткий ударный оффер без букв внутри фото',
      'журнальная композиция с небольшим героем в среде и огромной чистой типографикой, другой шрифт и цветовой акцент'
    ],
    prelandingVisualScenes: [
      'adult 32-48 leaving a bright modern workplace at the end of a long day, city movement, realistic energy and fatigue without gloom, cinematic documentary photography',
      'different adult at home comparing a busy calendar and ordinary household expenses, closed laptop and jacket as details, crisp warm light, no readable text',
      'different person taking a calm next step with a phone in a bright urban space, sense of regained direction, natural expression, no corporate stock pose'
    ]
  },
  {
    id: 'family-choice',
    label: 'Почему на важное для ребёнка снова приходится говорить «потом»',
    badge: 'Спокойный разбор семейного выбора',
    phrases: ['ребенок просит', 'ребенку нужна', 'кружок', 'поездка с классом', 'говорите потом', 'на ребенке', 'какой кружок'],
    keywords: ['ребен', 'кружок', 'школ', 'форма', 'поездк', 'отказывать', 'семь'],
    defaultTitle: 'Ребёнок просит на важное, а вы снова говорите «потом»?',
    defaultText: 'Разберитесь, почему семье приходится выбирать между обычными расходами и тем, что важно ребёнку.',
    methodName: 'Разберём семейный сценарий без чувства вины и давления',
    trustSmall: 'Не оцениваем родителей и не давим на боль. Показываем, почему важные расходы каждый раз становятся выбором.',
    painItems: [
      'кружок, форма или поездка превращаются в сложное решение вместо обычной покупки',
      'приходится выбирать, что оплатить сейчас, а что снова отложить',
      'слово «потом» звучит чаще, чем хочется',
      'любая новая просьба сталкивается с бюджетом, где уже всё распределено'
    ],
    cards: [
      { title: 'Без чувства вины', text: 'Увидите ситуацию как финансовый сценарий, а не как личную несостоятельность родителя.' },
      { title: 'Где исчезает выбор', text: 'Разберёте, почему обычные семейные расходы оставляют так мало пространства для важного.' },
      { title: 'Вернуть запас', text: 'Поймёте, с чего начать, чтобы незапланированное не всегда означало новый отказ.' }
    ],
    valueTitle: 'Что поможет вернуть семье больше выбора',
    valueItems: [
      'почему важные детские расходы каждый раз оказываются «не вовремя»',
      'что в текущем бюджете забирает пространство для решений',
      'какой первый шаг создаёт запас без жёстких запретов для всей семьи'
    ],
    actionTitle: 'Разберите ситуацию без чувства вины',
    actionSubtitle: 'Ответьте на четыре вопроса и посмотрите, с какого шага можно начать.',
    bannerStyleHints: ['editorialGold', 'whiteGoldPremium', 'greenSystem', 'messengerNative'],
    bannerSceneThemes: ['cozyHome', 'cityLifestyle', 'hobby'],
    bannerPersonas: ['woman', 'man', 'mixed'],
    bannerSubjectModes: ['noPerson', 'generatedPerson', 'metaphor', 'generatedPerson', 'noPerson', 'metaphor'],
    bannerNoPersonDirections: [
      'предметная семейная сцена без людей: детский рюкзак, музыкальный футляр или спортивная форма ждут у двери рядом с календарём без читаемых записей',
      'светлая домашняя среда без человека: на столе лежат школьные принадлежности, конверты обычных расходов и приглашение на занятие без читаемого текста, показывая сложный выбор без давления на ребёнка',
      'реалистичная метафора без людей: два аккуратных пути из семейного календаря сходятся к одному свободному месту, которого не хватает для важного решения',
      'предметный кадр без людей у входа в секцию или школу: небольшая спортивная сумка и сменная обувь остаются ждать, дневной свет и уважительная спокойная эмоция'
    ],
    bannerDirections: [
      'родитель в светлой прихожей рядом с детским рюкзаком, спортивной формой или музыкальным футляром, ребёнок не показан крупным планом, эмоция сложного выбора без слёз',
      'спокойная семейная кухня: взрослый смотрит на сообщение о кружке на телефоне без читаемого интерфейса, рядом обычные школьные вещи',
      'родитель ждёт у светлого школьного или спортивного пространства, держит детскую форму или рюкзак, естественная забота без манипулятивной драмы'
    ],
    bannerCompositions: [
      'тёплая editorial фотография и крупный вопрос, один предмет ребёнка становится смысловым якорем',
      'светлый постер с цветной карточкой оффера и реальной семейной сценой, без образа успешного успеха',
      'документальная full-bleed сцена с мягкой подложкой под текст, без одинакового городского мужчины'
    ],
    prelandingVisualScenes: [
      'caring parent 34-46 in a bright home entryway near a child backpack, sports kit or music case, thoughtful but steady, no child face close-up, authentic family documentary photography',
      'different parent at a bright kitchen table with ordinary school items and an unreadable phone notification, warm natural light, respectful and non-exploitative scene',
      'different parent near a bright school, sports or creative activity space, holding a small bag and ready to make a calmer next decision, hopeful natural mood'
    ]
  },
  {
    id: 'budget-shock',
    label: 'Почему одна обычная поломка рушит весь бюджет',
    badge: 'Разбор бюджета без запаса',
    phrases: ['сломалась техника', 'неожиданная трата', 'внезапных расходов', 'бюджет месяца рухнул', 'одна поломка', 'одна покупка', 'отменили покупку'],
    keywords: ['поломк', 'техник', 'ремонт', 'неожидан', 'внезапн', 'бюджет', 'отложить'],
    defaultTitle: 'Одна неожиданная трата снова рушит весь месяц?',
    defaultText: 'Разберитесь, почему бюджет держится только до первой поломки и что не даёт создать рабочий запас.',
    methodName: 'Покажем, почему проблема глубже одной покупки или ремонта',
    trustSmall: 'Техника ломается у всех. Вопрос в том, почему обычное событие каждый раз отменяет все остальные планы.',
    painItems: [
      'поломка телефона, машины или техники сразу забирает деньги с других целей',
      'приходится заново решать, что оплатить, а что перенести',
      'запас не успевает появиться, потому что месяц и без того собран впритык',
      'страшна не сама покупка, а отсутствие пространства для любой неожиданности'
    ],
    cards: [
      { title: 'Бюджет впритык', text: 'Увидите, почему план работает только в месяце, где ничего непредвиденного не происходит.' },
      { title: 'Цена одной поломки', text: 'Разберёте, какие цели и обязательные расходы она сталкивает между собой.' },
      { title: 'Рабочий запас', text: 'Поймёте, с какого шага начать создавать пространство для обычных неожиданностей.' }
    ],
    valueTitle: 'Что нужно увидеть до следующей внезапной траты',
    valueItems: [
      'почему бюджет не выдерживает даже одного незапланированного расхода',
      'что мешает создать запас, даже когда вы стараетесь откладывать',
      'какой первый шаг уменьшает зависимость месяца от одной поломки'
    ],
    actionTitle: 'Проверьте, почему бюджет не держит удар',
    actionSubtitle: 'Пройдите короткий мини-тест и найдите первую точку для запаса.',
    bannerStyleHints: ['redWhite', 'newspaperShock', 'darkOrange', 'blueTrust'],
    bannerSceneThemes: ['cozyHome', 'office', 'cityLifestyle'],
    bannerPersonas: ['man', 'woman', 'mixed'],
    bannerSubjectModes: ['noPerson', 'generatedPerson', 'metaphor', 'noPerson', 'generatedPerson', 'metaphor'],
    bannerNoPersonDirections: [
      'предметная сцена без людей: один конкретный сломанный телефон, бытовой прибор или автомобильная деталь находится рядом с закрытым кошельком и отложенным планом, без брендов и читаемых цен',
      'светлая бытовая среда без человека: открытый чемодан или детская сумка для поездки отодвинуты в сторону из-за коробки с нужной деталью, без повторения одной и той же поломки',
      'реалистичная метафора без людей: ровная цепочка планов прерывается одним тяжёлым предметом, который вытесняет остальные цели за край композиции',
      'чистая сервисная сцена без людей: на стойке лежат ключи, одна повреждённая вещь и бланк без читаемых данных, а в отражении видно перенесённый обычный план'
    ],
    bannerDirections: [
      'реальная светлая домашняя сцена рядом со сломанной стиральной машиной, холодильником или телефоном, взрослый оценивает ситуацию без театрального отчаяния',
      'человек получает оценку ремонта в мастерской или сервисной зоне, экран и документы без читаемых данных, обычная неожиданность, а не катастрофа',
      'домашний стол с инструментом, коробкой детали и отменённым планом в виде отложенного чемодана или покупки, человек в момент выбора'
    ],
    bannerCompositions: [
      'предметный рекламный постер: конкретная поломка становится главным объектом, человек вторичен, крупный текст в чистой зоне',
      'контрастная журнальная композиция с диагональю предметов и коротким CTA, без одинакового портрета справа',
      'светлая бытовая full-bleed сцена с компактной цветной текстовой карточкой, не стандартный split-screen'
    ],
    prelandingVisualScenes: [
      'adult 34-50 in a bright real home facing one specific ordinary breakdown, assessing the event calmly, crisp documentary light, no readable brand or screen',
      'different adult in a different location seeing how the unexpected expense changes an ordinary plan, no broken object, no repair scene, practical realistic editorial photography',
      'different person in a bright cafe, park or workspace choosing a calm next step with a phone or notebook, no broken object, no tools, no service environment'
    ],
    prelandingVisualSceneSets: [
      [
        'adult 34-50 in a bright real utility room beside one leaking washing machine, assessing the ordinary breakdown calmly, crisp documentary light, no readable brand or screen',
        'different adult at a bright kitchen table with a packed travel bag and an open calendar nearby, realizing an ordinary plan must be postponed, no appliance, no repair tools, no service scene, no readable text',
        'different adult in a bright city cafe with a phone and notebook, composed and ready to choose a practical next step, no appliance, no laundry room, no repair tools'
      ],
      [
        'adult 34-50 at a clean phone service counter holding one visibly cracked smartphone, calm realistic reaction, bright city daylight, no readable screen or brand',
        'different parent in a bright home entryway beside a child activity bag and ordinary household plans, weighing what must be postponed, no damaged phone, no service counter, no repair scene',
        'different adult walking through a bright modern public space with a phone put away and a small notebook in hand, natural relief and direction, no broken object, no tools, no service environment'
      ],
      [
        'adult 34-50 beside a stopped everyday car with the hood open in a clean daylight parking area, calmly assessing one ordinary breakdown, no crash, no readable brand',
        'different adult at a bright dining table with a family calendar and a packed weekend bag, reconsidering an ordinary plan, no car, no garage, no repair tools, no readable text',
        'different adult on a bright terrace or in a quiet workspace choosing a first step with a phone and notebook, confident natural expression, no car, no appliance, no repair scene'
      ]
    ]
  },
  {
    id: 'income-ceiling',
    label: 'Почему доход упёрся в потолок',
    badge: 'Разбор точки финансового застоя',
    phrases: ['финансовый потолок', 'доход не растет', 'зарабатываете', 'хотите больше', 'следующий уровень'],
    keywords: ['доход', 'потолок', 'рост', 'уровень', 'зарабатыва'],
    defaultTitle: 'Доход есть, но финансовый потолок уже чувствуется?',
    defaultText: 'Разберитесь, что удерживает результат на прежнем уровне и где искать следующий рычаг роста.',
    methodName: 'Отделим реальную точку роста от очередного рывка вслепую',
    trustSmall: 'Без обещаний лёгких денег: только знакомая ситуация, понятные причины и первый шаг.',
    painItems: [
      'текущий доход закрывает базовые задачи, но дальше почти не двигается',
      'усилий становится больше, а свободного пространства не прибавляется',
      'смена тактики даёт короткий эффект и возвращает к прежней цифре',
      'не хочется ломать профессию или жизнь ради нового эксперимента'
    ],
    cards: [
      { title: 'Точка потолка', text: 'Увидите, какое решение удерживает результат на прежнем уровне.' },
      { title: 'Рычаг вместо рывка', text: 'Разберёте, где изменение важнее ещё одного усилия.' },
      { title: 'Первый тест', text: 'Поймёте, что можно проверить без резкой смены профессии и больших обещаний.' }
    ],
    valueTitle: 'Что станет яснее перед следующим шагом',
    valueItems: [
      'почему текущий способ перестал давать заметный рост',
      'какой рычаг стоит проверить до нового большого решения',
      'как перейти от общего желания «больше» к конкретному первому действию'
    ],
    actionTitle: 'Найдите точку следующего роста',
    actionSubtitle: 'Получите результат мини-теста и откройте защищённую регистрацию.',
    bannerStyleHints: ['whiteGoldPremium', 'blueTrust', 'cleanSystem', 'outdoorFreedom'],
    bannerSceneThemes: ['cityLifestyle', 'office', 'nature'],
    bannerPersonas: ['woman', 'man', 'mixed'],
    bannerSubjectModes: ['metaphor', 'noPerson', 'generatedPerson', 'metaphor', 'generatedPerson', 'noPerson'],
    bannerNoPersonDirections: [
      'реалистичная метафора без людей: лестница поднимается к прозрачному потолку, а рядом открывается другой маршрут вверх, без букв, цифр и символов богатства',
      'предметная рабочая сцена без человека: привычные инструменты и завершённые задачи собраны в повторяющийся ряд, а один новый рычаг меняет направление композиции',
      'светлая среда без людей: закрытый рабочий коридор заканчивается обзорной точкой с несколькими реальными маршрутами дальше, без роскоши и мотивационных плакатов',
      'графичная метафора без человека: линия результата долго идёт по ровному плато и затем меняет траекторию после одного понятного рычага, выполнено физическими объектами без графиков и читаемых данных'
    ],
    bannerDirections: [
      'взрослый профессионал в живом рабочем пространстве смотрит на следующий маршрут, не позирует как успешный бизнесмен',
      'человек выходит из привычного офиса или коворкинга в яркий городской свет, момент решения и движения',
      'светлая обзорная точка или городская терраса как метафора нового уровня, герой в среде, без роскоши'
    ],
    bannerCompositions: [
      'премиальный светлый editorial постер с крупной типографикой и живой сценой',
      'динамичная full-bleed композиция с диагональным движением и компактным оффером',
      'графичный журнальный макет с одним сильным цветом, без повторения синей половины'
    ],
    prelandingVisualScenes: [
      'adult professional 34-48 in a bright real workspace considering a next route, candid editorial photography, no luxury and no corporate stock pose',
      'different person mapping one practical next move with tactile objects and no readable screens, crisp daylight and visible room depth',
      'different adult stepping into a bright urban or natural open space with a phone, calm momentum and realistic confidence'
    ]
  }
];

const FALLBACK_PROFILE = {
  id: 'problem-route',
  label: 'Почему ситуация повторяется',
  badge: 'Короткий разбор по вашей ситуации',
  defaultTitle: 'Почему привычный сценарий снова приводит к тому же результату?',
  defaultText: 'Разберитесь, что удерживает ситуацию на месте и с какого понятного шага можно начать изменения.',
  methodName: 'Сначала причина повторения, затем один понятный шаг',
  trustSmall: 'Без лишней теории: показываем знакомую ситуацию, её скрытый механизм и следующий шаг.',
  painItems: [
    'ситуация повторяется, хотя человек уже пытался действовать иначе',
    'отдельные усилия дают короткий эффект, но не меняют общий сценарий',
    'советов много, а ясной причины происходящего всё ещё нет',
    'нужен один понятный шаг вместо очередного большого обещания'
  ],
  cards: [
    { title: 'Увидеть причину', text: 'Разбор помогает отделить главный механизм от случайных деталей.' },
    { title: 'Разорвать повтор', text: 'Показываем, что именно возвращает ситуацию к прежнему результату.' },
    { title: 'Начать с одного', text: 'Следующий шаг остаётся конкретным и не требует менять всё сразу.' }
  ],
  valueTitle: 'Что станет понятнее после разбора',
  valueItems: [
    'почему ситуация повторяется, несмотря на прошлые попытки',
    'какая причина влияет на результат сильнее остальных',
    'с какого небольшого действия логично начать сейчас'
  ],
  actionTitle: 'Откройте короткий разбор',
  actionSubtitle: 'Ответьте на четыре вопроса и перейдите к первому понятному шагу.',
  bannerStyleHints: ['editorialGold', 'blueTrust', 'greenSystem', 'whiteGoldPremium'],
  bannerSceneThemes: ['cityLifestyle', 'cozyHome', 'office', 'nature'],
  bannerPersonas: ['woman', 'man', 'mixed'],
  bannerSubjectModes: ['noPerson', 'generatedPerson', 'metaphor', 'generatedPerson', 'noPerson', 'metaphor'],
  bannerNoPersonDirections: [
    'предметная сцена без людей, собранная только из фактов исходного заголовка и текста: один главный объект, его последствие и чистое пространство под оффер без добавленной биографии',
    'реальная среда без человека, которая показывает заявленную ситуацию через место, следы действия и конкретные предметы, без выдуманных денег, семьи, профессии или продукта',
    'понятная визуальная метафора без людей, основанная только на исходной проблеме и результате: один конфликт и один путь дальше, без случайных символов успеха',
    'редакционный предметный натюрморт без людей: только детали, прямо упомянутые в исходном брифе, естественный свет и выраженная причинно-следственная связь'
  ],
  bannerDirections: [
    'реальная взрослая жизнь в яркой современной среде, герой сталкивается с повторяющейся ситуацией без театральной драмы',
    'предметная сцена причины и выбора, живой человек присутствует естественно, без читаемого интерфейса',
    'момент спокойного решения и следующего шага в городе, дома или светлом рабочем пространстве'
  ],
  bannerCompositions: [
    'светлый редакционный постер с живой фотографией и крупным вопросом',
    'full-bleed lifestyle сцена с компактной контрастной карточкой текста',
    'графичный журнальный макет с одной сильной цветовой системой'
  ],
  prelandingVisualScenes: [
    'real adult 34-48 in a bright modern everyday environment facing a familiar repeating problem, candid premium documentary photography',
    'different adult examining one practical cause with simple tactile objects, no readable screens, clear daylight and depth',
    'different person ready to take one calm next step with a phone, bright realistic setting and natural expression'
  ]
};

function buildGroundedFallbackProfile(title = '', text = '') {
  const safeTitle = String(title || '').trim() || FALLBACK_PROFILE.defaultTitle;
  const safeText = String(text || '').trim() || FALLBACK_PROFILE.defaultText;
  const brief = `${safeTitle}. ${safeText}`.replace(/\s+/g, ' ').trim();
  const visualGuard = 'Do not add family, children, income, debt, appliances, profession, product, numbers or other story facts unless they are explicitly present in the brief.';

  return {
    ...FALLBACK_PROFILE,
    id: 'grounded-input',
    label: 'Разбор по исходному заголовку и тексту',
    badge: 'Разбор заявленной ситуации',
    defaultTitle: safeTitle,
    defaultText: safeText,
    methodName: 'Разберём исходную ситуацию без домыслов и лишних обещаний',
    trustSmall: safeText,
    painItems: [
      safeTitle,
      safeText,
      'Какая деталь из описанной ситуации сильнее всего влияет на результат?',
      'Какой первый шаг можно проверить без полной перестройки привычного подхода?'
    ],
    cards: [
      { title: 'Исходная точка', text: safeText },
      { title: 'Главный вопрос', text: 'Отделить факты из описания от предположений и увидеть, что действительно требует проверки.' },
      { title: 'Первый тест', text: 'Выбрать одно понятное действие и проверить его на практике без больших обещаний.' }
    ],
    valueTitle: 'Что станет яснее после разбора',
    valueItems: [
      `как точнее посмотреть на ситуацию: «${safeTitle}»`,
      'какие детали из исходного описания важны для решения',
      'какой небольшой следующий шаг можно проверить первым'
    ],
    actionTitle: 'Откройте разбор своей ситуации',
    actionSubtitle: 'Пройдите четыре вопроса и откройте результат по указанному заголовку и тексту.',
    bannerSubjectModes: ['noPerson', 'generatedPerson', 'metaphor', 'generatedPerson', 'noPerson', 'metaphor'],
    bannerNoPersonDirections: [
      `premium realistic object-led editorial scene with no people, based only on this exact brief: "${brief}". Show one concrete cause and its visible consequence. ${visualGuard}`,
      `a different authentic environment with no people that communicates only this exact brief through place, objects and traces of action: "${brief}". ${visualGuard}`,
      `a grounded visual metaphor with no people, derived only from the conflict and desired direction in this exact brief: "${brief}". Avoid generic success symbols. ${visualGuard}`,
      `a clean editorial still life with no people and only objects explicitly supported by this exact brief: "${brief}". ${visualGuard}`
    ],
    bannerDirections: [
      `premium realistic editorial scene based only on this exact brief: "${brief}". ${visualGuard}`,
      `a different authentic everyday scene that communicates this exact brief without inventing a backstory: "${brief}". ${visualGuard}`,
      `a clear next-step scene grounded only in this exact brief: "${brief}". ${visualGuard}`
    ],
    prelandingVisualScenes: [
      `premium realistic hero photograph based only on this exact brief: "${brief}". ${visualGuard}`,
      `different setting and composition illustrating only a concrete detail from this exact brief: "${brief}". ${visualGuard}`,
      `different person or object in a calm next-step scene grounded only in this exact brief: "${brief}". ${visualGuard}`
    ]
  };
}

const MODE_TONE = {
  templateStage: {
    badgePrefix: '',
    valuePrefix: ''
  },
  heroBlocks: {
    badgePrefix: 'Главный вопрос: ',
    valuePrefix: 'Три ответа: '
  },
  natureEditorial: {
    badgePrefix: 'История из реальной жизни: ',
    valuePrefix: 'Что стоит увидеть: '
  },
  minimalCompare: {
    badgePrefix: 'Сценарий до и после: ',
    valuePrefix: 'Что меняет понимание: '
  }
};

function scoreProfile(profile, source) {
  const phraseScore = (profile.phrases || []).reduce((sum, phrase) => (
    source.includes(normalize(phrase)) ? sum + 8 : sum
  ), 0);
  const keywordScore = (profile.keywords || []).reduce((sum, keyword) => (
    source.includes(normalize(keyword)) ? sum + 2 : sum
  ), 0);
  return phraseScore + keywordScore;
}

export function resolveCampaignSemanticProfile(title = '', text = '') {
  const source = normalize(`${title} ${text}`);
  if (!source) return FALLBACK_PROFILE;
  const ranked = CAMPAIGN_SEMANTIC_PROFILES
    .map((profile) => ({ profile, score: scoreProfile(profile, source) }))
    .sort((left, right) => right.score - left.score);
  return ranked[0]?.score > 0 ? ranked[0].profile : buildGroundedFallbackProfile(title, text);
}

export function buildCampaignLandingLogic({ title = '', text = '', mode = 'templateStage' } = {}) {
  const profile = resolveCampaignSemanticProfile(title, text);
  const safeTitle = String(title || '').trim() || profile.defaultTitle;
  const safeText = String(text || '').trim() || profile.defaultText;
  const tone = MODE_TONE[mode] || MODE_TONE.templateStage;
  return {
    ...profile,
    semanticId: profile.id,
    title: safeTitle,
    lead: safeText,
    trustTitle: safeText,
    badge: `${tone.badgePrefix}${profile.badge}`,
    valueTitle: `${tone.valuePrefix}${profile.valueTitle}`,
    cards: profile.cards.map((item) => ({ ...item })),
    painItems: [...profile.painItems],
    valueItems: [...profile.valueItems],
    proofItems: [],
    botTransition: 'После четырёх ответов откроется результат и защищённая регистрация Atmospace.',
    ctaLead: profile.actionSubtitle
  };
}

export function pickCampaignVisualDirection(profile, seed = '', index = 0) {
  const safeProfile = profile || FALLBACK_PROFILE;
  const directions = safeProfile.bannerDirections || FALLBACK_PROFILE.bannerDirections;
  const personlessDirections = safeProfile.bannerNoPersonDirections?.length
    ? safeProfile.bannerNoPersonDirections
    : FALLBACK_PROFILE.bannerNoPersonDirections;
  const compositions = safeProfile.bannerCompositions || FALLBACK_PROFILE.bannerCompositions;
  const themes = safeProfile.bannerSceneThemes || FALLBACK_PROFILE.bannerSceneThemes;
  const personas = safeProfile.bannerPersonas || FALLBACK_PROFILE.bannerPersonas;
  const subjectModes = safeProfile.bannerSubjectModes?.length
    ? safeProfile.bannerSubjectModes
    : FALLBACK_PROFILE.bannerSubjectModes;
  const styles = safeProfile.bannerStyleHints || FALLBACK_PROFILE.bannerStyleHints;
  const source = normalize(`${seed}|${safeProfile.id}`);
  let hash = 2166136261;
  for (let i = 0; i < source.length; i += 1) {
    hash ^= source.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  const offset = Math.abs((hash >>> 0) + Number(index || 0));
  const visualMode = subjectModes[offset % subjectModes.length] || 'generatedPerson';
  const isPersonless = visualMode === 'noPerson' || visualMode === 'metaphor';
  const sceneDirections = isPersonless ? personlessDirections : directions;
  return {
    semanticId: safeProfile.id,
    visualMode,
    sceneTheme: themes[offset % themes.length],
    persona: isPersonless ? 'mixed' : personas[offset % personas.length],
    styleHint: styles[(offset + 2) % styles.length],
    sceneLine: sceneDirections[offset % sceneDirections.length],
    compositionLine: compositions[(offset + 1) % compositions.length],
    prelandingScenes: [...(safeProfile.prelandingVisualScenes || FALLBACK_PROFILE.prelandingVisualScenes)]
  };
}

export { CAMPAIGN_SEMANTIC_PROFILES };
