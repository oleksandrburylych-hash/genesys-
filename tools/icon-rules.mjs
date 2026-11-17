/**
 * Правила подбора иконок (game-icons.net, CC BY 3.0) для документов компендиумов.
 * Проверяется строка «имя nameEn» в нижнем регистре; первое совпадение выигрывает.
 * PALETTES — цвет плашки по типу документа (в стиле книги правил).
 */
export const PALETTES = {
  weapon: ["#9c2a30", "#5a1216"],
  armor: ["#2c4c7c", "#14243d"],
  gear: ["#56626e", "#2b3238"],
  talent: ["#e0a033", "#9a6512"],
  ability: ["#3f7d4a", "#1f4527"],
  heroic: ["#f2b632", "#b5470f"],
  spell: ["#6a3d9a", "#2e1650"],
  skill: ["#2a8fb0", "#14526a"],
  archetype: ["#2c4c7c", "#9c2a30"],
  career: ["#9c2a30", "#2c4c7c"],
  quality: ["#b07a2a", "#5e3d0e"],
  attachment: ["#7a6a55", "#3b3227"],
  injury: ["#b01e1e", "#4a0808"],
  adversary: ["#3d2424", "#120808"],
  vehicle: ["#4f5d6e", "#1e252e"]
};

const R = (re, icon) => [re, icon];

export const RULES = {
  ability: [
    R(/зрени|видени|vision|eye|глаз|чутьё|sense/, "eye-target"), R(/крепк|закал|tough|nails|выносл|живуч/, "muscle-up"),
    R(/ярост|rage|берсерк|звериная/, "enrage"), R(/клык|укус|fang|bite|когт|claw|природное оружие|natural weapon/, "fangs"),
    R(/летун|полёт|полет|fly|flyer|крыл|wing|парящ/, "feathered-wing"), R(/фигура|silhouette|размер|size|маленьк|рост/, "resize"),
    R(/нежит|undead|мертв|ожив|dead|revenant/, "raise-zombie"), R(/призрач|ghost|бесплот|ethereal/, "floating-ghost"),
    R(/ужас|страх|terrif|fear|пугающ/, "terror"), R(/регенер|regenerat|лечени|исцел|heal/, "regeneration"),
    R(/заклин|магия|spell|магическ|рун/, "spell-book"), R(/провор|ловк|agile|nimble|быстр|swift|лапы/, "acrobatic"),
    R(/гениал|интеллект|разум|mind|мысл|brilliant/, "brain"), R(/личност|харизм|обаян|personality|influence/, "charm"),
    R(/готов ко всему|ready|адаптац/, "swiss-army-knife"), R(/неорганич|inorganic|робот|сетев|network|кибер/, "processor"),
    R(/солнц|sun|свет|light/, "sun"), R(/кровь|кров|blood/, "blood"), R(/судьб|fate|трагич|doom/, "cursed-star"),
    R(/водн|вода|water|aquatic|амфиб/, "water-drop"), R(/яд|poison|токсин/, "poison"), R(/толп|crowd|незамет/, "hood"),
    R(/нерв|боль|pain/, "spine-arrow"), R(/космос|space|звёзд|star/, "galaxy"), R(/игрушк|техник|tech|gadget/, "gears"),
    R(/мутац|mutation/, "dna1"), R(/царапин|scratch/, "bandage-roll"), R(/наготове|alert|бдит/, "sight-disabled"),
    R(/слабост|weakness/, "target-arrows"), R(/рой|swarm/, "bee"), R(/огромн|громад|huge/, "giant")
  ],
  heroic: [
    R(/всезна|knows|эрудит/, "book-pile"), R(/связи|connect|контакт/, "shaking-hands"), R(/прориц|foresight|предвид/, "crystal-ball"),
    R(/живуч|tenacity|endur/, "heart-plus"), R(/влиятел|influen/, "crown"), R(/исцел|heal|чудесн/, "healing"),
    R(/образец|мастерств|paragon/, "laurels-trophy"), R(/шестое|sense|чутьё/, "third-eye"), R(/именное|оружие|weapon/, "winged-sword"),
    R(/несгиб|unbreak|стойк/, "fist"), R(/высвобожд|unleash|сила/, "explosion-rays")
  ],
  attachment: [
    R(/прицел|scope|оптическ/, "crosshair"), R(/подствол|underbarrel/, "sawed-off-shotgun"), R(/сошк|тренога|bipod|tripod|подвес|mount/, "sentry-gun"),
    R(/рукоят|hilt|гард|guard/, "sword-hilt"), R(/лезви|blade|острое|пилообраз|serrated|edge/, "serrated-slash"),
    R(/спуск|trigger|ствол|barrel/, "pistol-gun"), R(/огон|огн|пламен|fire|flame/, "fireball"), R(/иней|лёд|лед|frost|ice/, "ice-bolt"),
    R(/гром|thunder|молни/, "focused-lightning"), R(/руна|rune/, "rune-stone"), R(/шип|spike/, "spiked-armor"),
    R(/позолот|gild|золот/, "gold-bar"), R(/пластин|plating|усилен|reinforc|сервопривод|servo/, "armor-upgrade"),
    R(/металл|metal|сталь|steel|желез|iron/, "anvil"), R(/дварф|dwarf/, "dwarf-face"), R(/эльф|elf/, "woman-elf-face"),
    R(/древн|ancient/, "ancient-ruins"), R(/кость|bone/, "bone-knife"), R(/дуб|орешник|ив[аы]|тис|oak|hazel|willow|yew|дерев/, "wood-stick"),
    R(/порч|инферн|ynfernael|скверн|сумереч|twilight|тень/, "daemon-skull"), R(/герметич|seal/, "gas-mask"),
    R(/облик|пугающ|intimidat/, "terror"), R(/превосход|superior|модификац/, "upgrade"), R(/утяжел|weighted|разрывн/, "explosion-rays")
  ],
  injury: [
    R(/кровотеч|кровь|bleed/, "bleeding-wound"), R(/слеп|blind/, "sight-disabled"), R(/перелом|кость|bone|break/, "broken-bone"),
    R(/смерт|death|конец близок/, "death-skull"), R(/оглуш|чувств|senseless|stun|сотрясен/, "knocked-out-stars"),
    R(/равновес|сбиван|ног|balance|knock/, "falling"), R(/изнурен|усталост|fatigue|exhaust/, "tired-eye"),
    R(/уродств|maim|покалеч/, "arm-bandage"), R(/царапин|scratch|рана|wound|лёгк/, "bandage-roll"),
    R(/шок|shock|ужас|horror/, "terror"), R(/двигат|engine|систем|system|приборы|сенсор/, "cogsplosion"),
    R(/корпус|hull|пробоин|structural|разруш|destroy/, "broken-wall"), R(/управлен|control|руль/, "steering-wheel"),
    R(/пожар|огонь|fire/, "fire")
  ],
  quality: [
    R(/автомат|auto-fire/, "machine-gun"), R(/взрыв|blast/, "explosion-rays"), R(/жжени|burn/, "fireball"),
    R(/оглушающий урон|stun damage/, "fist"), R(/оглушени|stun/, "knocked-out-stars"), R(/нокдаун|knockdown/, "falling"),
    R(/сковыван|ensnare/, "manacles"), R(/неточн|inaccurate/, "flying-target"), R(/точн|accurate/, "crosshair"),
    R(/проникаю|pierce/, "piercing-sword"), R(/бронебой|breach/, "broken-shield"), R(/высококрит|vicious/, "bloody-sword"),
    R(/громоздк|cumbersome/, "weight"), R(/оборонит|defensive/, "shield"), R(/отражаю|deflection/, "shield-reflect"),
    R(/дезориент|disorient/, "knocked-out-stars"), R(/залпов|linked/, "bullets"), R(/наведени|guided/, "target-arrows"),
    R(/медленн|slow|подготовк|prepare/, "hourglass"), R(/боезапас|ammo/, "machine-gun-magazine"), R(/низкопроб|inferior/, "broken-axe"),
    R(/превосход|superior/, "laurels-trophy"), R(/укреплён|reinforced/, "armor-upgrade"), R(/сноровк|unwieldy/, "juggler"),
    R(/повреждени|sunder/, "sword-break"), R(/захват|tractor/, "grab"), R(/трофейн|scavenged/, "swap-bag"), R(/масштаб|scale/, "person")
  ],
  weapon: [
    R(/граната|grenade/, "grenade"), R(/огнем[её]т|flamethrower/, "flamethrower"), R(/ракет|missile|rocket/, "missile-launcher"),
    R(/пушк|cannon|орудие|артиллер|гаубиц|turret|туррел/, "cannon"), R(/пулем[её]т|machine gun|автомат|minigun|chaingun/, "machine-gun"),
    R(/дробовик|shotgun|обрез|громобой|thunderstick/, "sawed-off-shotgun"), R(/мушкет|musket|ружь/, "musket"),
    R(/винтовк|rifle|карабин|снайпер/, "winchester-rifle"), R(/револьвер|revolver/, "revolver"), R(/пистолет|pistol/, "pistol-gun"),
    R(/бласт|blaster|лазер|laser|плазм|plasma|луч|ray|ион|ion|дезинтегр/, "ray-gun"),
    R(/электр|оглушающ|шокер|stun|taser|tesla|тесл/, "lightning-arc"),
    R(/арбалет|crossbow/, "crossbow"), R(/(^|\s)лук|bow|longbow/, "bow-arrow"), R(/праща|sling/, "sling"),
    R(/мь[её]льнир|mjoln|молот|hammer/, "warhammer"), R(/топор|axe|секир/, "battle-axe"),
    R(/булав|mace|кист[её]н|flail|дубин|club|палиц|cudgel/, "spiked-mace"),
    R(/(^|\s)копь|копь[её]|spear|пик|pike|трезуб|trident|алебард|halberd|глеф/, "spears"),
    R(/посох|staff|жезл|wand/, "wizard-staff"), R(/кинжал|нож|dagger|knife|стилет/, "plain-dagger"),
    R(/щит|shield/, "round-shield"), R(/кнут|whip|аркан|lasso/, "whip"),
    R(/кастет|кулак|fist|brass|рукопаш|brawl|удар/, "fist"), R(/когт|claw/, "claw-slashes"), R(/укус|bite|клык|fang|челюст/, "fangs"),
    R(/рог|horn/, "bull-horns"), R(/хвост|tail/, "spiked-tail"), R(/дыхан|breath/, "dragon-breath"), R(/взгляд|gaze/, "eye-target"),
    R(/меч|sword|сабл|saber|рапир|rapier|катан|клинок|blade|ятаган|шпаг/, "broadsword"),
    R(/бомб|bomb|взрывчат|динамит|explosive/, "fire-bomb"), R(/сеть|net|паутин|web/, "spider-web")
  ],
  armor: [
    R(/щит|shield/, "shield"), R(/шлем|helmet|helm/, "visored-helm"), R(/лат(ы|ный)|plate/, "breastplate"),
    R(/кольчуг|chain|mail/, "chain-mail"), R(/чешу|scale/, "scale-mail"), R(/кож|leather/, "leather-armor"),
    R(/бронежилет|жилет|vest|kevlar/, "kevlar-vest"), R(/экзо|power|сервопривод|боевая броня|штурмов|mech/, "mecha-head"),
    R(/куртк|jacket|одежд|clothing|мантия|robe|плащ|cloak|ткан/, "cape-armor"), R(/талисман|амулет|ward|badge/, "gem-pendant")
  ],
  gear: [
    R(/яд(?!ро)|poison|токсин/, "poison-bottle"), R(/кислот|acid/, "bubbling-flask"),
    R(/зелье|эликсир|potion|elixir|тоник|tonic|снадобь|настой/, "magic-potion"),
    R(/дым|smoke/, "smoke-bomb"), R(/аптеч|medic|медицин|бинт|bandage|стимпак|stim|болеутол|painkiller|лекарств|хирург/, "medical-pack"),
    R(/верёвк|веревк|rope|трос/, "rope-coil"), R(/рюкзак|backpack|сумк|мешок|bag|sack|седельн/, "knapsack"),
    R(/свиток|scroll/, "scroll-unfurled"), R(/правил|rules|создани|ремесл|crafting|алхими|alchemy/, "spell-book"),
    R(/книг|book|том(?![а-я])|tome|гримуар/, "book-cover"), R(/фонар|lantern|факел|torch|свеч/, "lantern-flame"),
    R(/отмычк|lockpick|взлом/, "lockpicks"), R(/сетев|страж|врата|firewall|gate|программ|program|лёд|ice/, "firewall"),
    R(/компьютер|computer|планшет|datapad|терминал|коммуникатор|comm/, "laptop"), R(/имплант|кибер|cyber|implant/, "cyborg-face"),
    R(/инструмент музык|музыкальн|instrument|лютн|lute|арф/, "lyre"), R(/инструмент|tool|набор|kit/, "toolbox"),
    R(/руна|rune|осколок|shard|камень странник/, "rune-stone"), R(/кольц|ring/, "diamond-ring"),
    R(/символ|icon|holy|святой|святая|икона/, "holy-symbol"), R(/сфера|orb|кристалл|crystal/, "crystal-ball"),
    R(/посох|staff/, "wizard-staff"), R(/жезл|wand|скипетр|scepter/, "lunar-wand"), R(/венец|диадем|circlet|crown|корон/, "crown"),
    R(/лошад|кон[ья]|скакун|horse|mount|пони|pony|боевой конь/, "horse-head"), R(/попон|barding|седл/, "saddle"),
    R(/палатк|tent|лагер|спальн|bedroll/, "camping-tent"), R(/еда|паёк|паек|ration|food|провиз/, "meal"),
    R(/услуг|service|постоял|ночлег|inn|лечение у|наём|найм/, "wooden-sign"), R(/серебр|silver/, "silver-bullet"),
    R(/патрон|ammo|боеприпас|стрел[ыа]|arrows|болт/, "bullets"), R(/очки|бинокл|binocular|goggles|оптик/, "spyglass"),
    R(/карт[аы]|map/, "treasure-map"), R(/компас|compass/, "compass"), R(/одежд|cloth|костюм|suit|плащ|cloak/, "cloak"),
    R(/деньг|монет|coin|золот/, "coins"), R(/фляг|бутыл|flask|bottle/, "water-flask"), R(/транспорт|vehicle/, "steering-wheel"),
    R(/прибор|сканер|scanner|детектор/, "radar-sweep"), R(/ключ|key/, "key")
  ],
  spell: [
    R(/огн|пламен|fire|flame|испепел|жар/, "fireball"), R(/лёд|лед|ледян|мороз|ice|frost|холод|буран/, "ice-bolt"),
    R(/молни|гром|lightning|thunder|шторм|storm/, "focused-lightning"), R(/яд|poison|кислот|acid/, "poison-cloud"),
    R(/свят|holy|свет|light|солн|sun/, "sun"), R(/тьм|тен|shadow|dark|некро|смерт|death/, "death-skull"),
    R(/^атака|attack/, "magic-swirl"), R(/барьер|barrier|щит|shield|защит|ward/, "magic-shield"),
    R(/лечени|исцел|heal|восстанов/, "healing"), R(/призыв|conjure|summon|элементал/, "magic-portal"),
    R(/проклят|curse|порч|hex/, "cursed-star"), R(/рассеив|dispel/, "magic-palm"), R(/усилени|augment|сила|strength/, "biceps"),
    R(/морок|иллюз|mask|illusion|невидим/, "domino-mask"), R(/предсказ|predict|прорицан|видени|vision/, "crystal-ball"),
    R(/превращ|transform|облик/, "werewolf"), R(/разум|mind|ментал|телепат|psych/, "brain"),
    R(/перемещ|move|телепорт|teleport|левитац/, "teleport"), R(/вспомогат|utility/, "sparkles")
  ],
  talent: [
    R(/магия|заклин|spell|cast|колдов|элементал|чар/, "spell-book"), R(/лечени|медиц|хирург|болеутол|heal|surgeon/, "healing"),
    R(/выстрел|стрельб|снайпер|меткий|орлиный|лучник|арбалет|archery|shot|deadeye|eagle/, "target-arrows"),
    R(/парир|parry|дуэл|duel|клинок|обоерук|wield/, "crossed-swords"), R(/берсерк|berserk|ярост|rage/, "enrage"),
    R(/обор|защит|defens|уклон|dodge|шаг в сторону|side step/, "shield-reflect"), R(/закал|упорств|выносл|крепост|tough|grit|endur|durable/, "muscle-up"),
    R(/речь|обаян|колк|остроум|переговор|обсуд|rhetoric|retort|repartee|talk|tirade/, "talk"),
    R(/командир|лидер|скоординир|commander|coordinated|leader/, "rally-the-troops"), R(/скорост|быстр|выхват|swift|quick|rapid|реакц/, "running-ninja"),
    R(/пилот|вожден|езд|авиатор|бочка|ride|driving|aviator|barrel|разгон|throttle/, "steering-wheel"),
    R(/удач|везен|lucky|счастлив/, "clover"), R(/знани|учён|изобрет|inventor|knack|квалиф|мастер|master/, "book-pile"),
    R(/живот|звер|animal|companion|природ|nature|друид|druid/, "wolf-head"), R(/взлом|sysops|hack|компьют/, "laptop"),
    R(/скрыт|тень|незамет|unremarkable|stealth/, "hood"), R(/воля|heroic will|непоколеб|indomitable|стойк/, "fist")
  ],
  archetype: [
    R(/эльф|elf/, "woman-elf-face"), R(/дварф|dwarf|гном|gnome/, "dwarf-face"), R(/орк|orc/, "orc-head"),
    R(/кошколюд|кот|cat|hyrrinx|леонкс/, "cat"), R(/робот|robot/, "robot-golem"), R(/биороид|андроид|android|bioroid/, "android-mask"),
    R(/клон|clone/, "dna2"), R(/пришел|alien/, "alien-stare"), R(/псионик|psion/, "brain"), R(/полубог|demigod|бог/, "laurel-crown"),
    R(/оборот|werewolf|ликантр/, "werewolf"), R(/дампир|вампир|dhampir|vampire/, "vampire-dracula"), R(/мутант|mutant/, "dna1"),
    R(/ревенант|нежит|revenant|undead/, "raise-zombie"), R(/полукровк|half/, "half-dead"), R(/предтеч|forerunner/, "ancient-ruins"),
    R(/чародей|колдун|sorcer|маг/, "wizard-face"), R(/трикстер|trickster/, "jester-hat"), R(/истребит|slayer|охотник/, "hunting-horn"),
    R(/знаток|lore/, "book-pile"), R(/спящий|sleeper/, "night-sleep"), R(/выживш|survivor/, "campfire"),
    R(/интеллект|intellect/, "brain"), R(/аристократ|aristocrat/, "crown"), R(/трудяг|laborer|работяг/, "muscle-up")
  ],
  career: [
    R(/рыцар|knight/, "black-knight-helm"), R(/воин|солдат|warrior|soldier/, "swordman"), R(/маг|волшебн|wizard|mage|рун/, "wizard-face"),
    R(/жрец|послушник|priest|disciple/, "prayer"), R(/друид|шаман|druid|primalist/, "oak-leaf"), R(/учён|scholar/, "book-pile"),
    R(/пройдох|мошенник|scoundrel/, "cloak-dagger"), R(/лекар|healer|медик/, "health-normal"), R(/хакер|hacker/, "laptop"),
    R(/пилот|pilot/, "jet-fighter"), R(/капитан|captain/, "ship-wheel"), R(/лидер|leader/, "crown"),
    R(/специалист|механик|tradesperson|engineer/, "spanner"), R(/переговор|посланник|socialite|envoy/, "shaking-hands"),
    R(/следопыт|разведчик|scout|explorer|исследоват/, "compass"), R(/безумн|mad scientist/, "erlenmeyer"),
    R(/артист|бард|entertainer/, "lyre")
  ],
  adversary: [
    R(/дракон|dragon|змий|wyrm|саламандр/, "dragon-head"), R(/скелет|skeleton/, "skeleton"), R(/мумия|mummy/, "mummy-head"),
    R(/вампир|vampire/, "vampire-dracula"), R(/оборот|ликантроп|werewolf|lycan/, "werewolf"),
    R(/призрак|дух|фантом|wraith|ghost|specter|спектр|баргест|barghest/, "floating-ghost"),
    R(/мертвец|зомби|нежит|рыцарь смерти|reanimate|undead|death knight|zombie/, "raise-zombie"),
    R(/гоблин|goblin|сплиг|кобольд|kobold/, "goblin-head"), R(/орк|orc|урук/, "orc-head"), R(/огр|великан|тролль|ogre|giant|troll/, "ogre"),
    R(/волк|пёс|пес|гончая|wolf|hound|dog/, "wolf-head"), R(/паук|spider/, "spider-face"), R(/змея|змей|serpent|snake|гадюк|viper/, "snake"),
    R(/демон|daemon|demon|инфернал|ynfernael/, "daemon-skull"), R(/робот|дрон|robot|drone|голем|golem|железн/, "robot-golem"),
    R(/акула|shark/, "shark-jaws"), R(/кракен|kraken/, "kraken-tentacle"), R(/медвед|bear/, "bear-head"),
    R(/бык|минотавр|minotaur|bull/, "minotaur"), R(/горгон|gorgon|медуз/, "medusa-head"), R(/джинн|djinn|genie/, "djinn"),
    R(/сирен|русалк|siren|mermaid/, "mermaid"), R(/элементал|elemental|лава/, "fire-silhouette"),
    R(/некромант|колдун|ведьм|witch|warlock|чародейк|sorcer|wizard|маг/, "wizard-face"), R(/жрец|priest|шаман|shaman/, "prayer"),
    R(/рыцар|knight|барон|baron/, "black-knight-helm"), R(/пират|pirate/, "pirate-captain"),
    R(/пришел|ксено|alien|xeno/, "alien-stare"), R(/телепат|telepath|псион/, "brain"), R(/рой|swarm|нано/, "bee"),
    R(/эльф|elf|фейри|fae|fairy/, "woman-elf-face"), R(/дварф|dwarf|гном/, "dwarf-face"), R(/зверолюд|beastman/, "wolf-head"),
    R(/лев|кошк|lion|cat|леонкс/, "lion"), R(/солдат|пехот|коммандо|штурмов|ополчен|морпех|marine|soldier|infantry|trooper|commando/, "brodie-helmet"),
    R(/разбойник|бандит|bandit|рейдер|raider|наёмн|наемн/, "hood"), R(/чиновник|губернатор|official|governor|мэр|глава гильд|guild/, "crown"),
    R(/лучник|archer|стрелок/, "bow-arrow"), R(/хакер|hacker/, "laptop"), R(/агент|шпион|spy|agent|ассасин|assassin/, "cloak-dagger"),
    R(/учёный|scientist/, "erlenmeyer"), R(/всадник|наездник|rider/, "cloaked-figure-on-horseback"), R(/берсерк|berserker/, "enrage"),
    R(/рыбак|селянин|крестьянин|villager|peasant|freeholder|староста/, "farmer")
  ],
  vehicle: [
    R(/мотоцикл|motorcycle|байк/, "full-motorcycle-helmet"), R(/грузовик|truck/, "truck"), R(/танк|tank/, "battle-tank"),
    R(/вертол|helicopter/, "helicopter"), R(/истребит|самол[её]т|fighter|plane|jet|биплан/, "jet-fighter"),
    R(/звездол|космич|space|starship|челнок|shuttle|крейсер|cruiser/, "spaceship"), R(/дирижабл|airship|аэростат|zeppelin/, "zeppelin"),
    R(/подлодк|submarine/, "mini-submarine"), R(/фрегат|галеон|парусн|frigate|galleon|корабл|ship|линкор|battleship|броненос/, "galleon"),
    R(/лодк|катер|boat|баркас/, "speed-boat"), R(/поезд|локомотив|train/, "steam-locomotive"), R(/колесниц|chariot/, "chariot"),
    R(/карет|повозк|телег|coach|wagon|cart/, "old-wagon"), R(/мех|mech/, "battle-mech"), R(/автомоб|машин|седан|car|джип|багги/, "city-car")
  ]
};

export const DEFAULTS = {
  weapon: "sword-brandish", armor: "chest-armor", gear: "swap-bag", spell: "magic-swirl", talent: "laurels",
  ability: "star-swirl", heroic: "sunbeams", skill: "skills", archetype: "person", career: "person",
  quality: "upgrade", attachment: "gear-hammer", injury: "bleeding-wound", adversary: "evil-minion", vehicle: "steering-wheel"
};

/** Иконки навыков по ключу. */
export const SKILL_ICONS = {
  alchemy: "bubbling-flask", astrocartography: "galaxy", athletics: "run", computers: "laptop", cool: "meditation",
  coordination: "acrobatic", discipline: "inner-self", driving: "steering-wheel", mechanics: "spanner", medicine: "health-normal",
  operating: "control-tower", perception: "eye-target", piloting: "jet-fighter", resilience: "muscle-up", riding: "horse-head",
  skulduggery: "lockpicks", stealth: "hood", streetwise: "shaking-hands", survival: "campfire", vigilance: "sight-disabled",
  arcana: "spell-book", divine: "prayer", primal: "oak-leaf", runes: "rune-stone", verse: "lyre", psychic: "brain",
  brawl: "fist", gunnery: "cannon", melee: "broadsword", meleeLight: "plain-dagger", meleeHeavy: "battle-axe",
  ranged: "bow-arrow", rangedLight: "pistol-gun", rangedHeavy: "winchester-rifle", charm: "charm", coercion: "shouting",
  deception: "domino-mask", leadership: "rally-the-troops", negotiation: "shaking-hands", knowledge: "book-pile",
  knowledgeLore: "book-pile", knowledgeForbidden: "evil-book", knowledgeAdventuring: "treasure-map", knowledgeGeography: "world",
  knowledgeScience: "erlenmeyer", knowledgeSupernatural: "pentacle"
};

/** Подобрать иконку для документа. */
export function pickIcon(doc) {
  const type = doc.type;
  if (type === "skill") return SKILL_ICONS[doc.system?.key] ?? DEFAULTS.skill;
  const text = `${doc.name ?? ""} ${doc.nameEn ?? ""}`.toLowerCase();
  const base = doc.system?.baseAction ? `${doc.system.selected?.join(" ") ?? ""} ${doc.system.baseAction}`.toLowerCase() : "";
  for (const [re, icon] of RULES[type] ?? []) if (re.test(text) || (base && re.test(base))) return icon;
  if (type === "weapon") {
    const skill = doc.system?.skill ?? "";
    if (skill === "gunnery") return "cannon";
    if (/ranged/.test(skill)) return "bullets";
  }
  if (type === "talent") {
    const act = doc.system?.activation;
    if (act === "passive") return "laurels";
    if (act === "maneuver") return "running-ninja";
    if (act === "action") return "sword-brandish";
    return "lightning-helix";
  }
  if (type === "adversary") {
    const t = doc.system?.adversaryType;
    return t === "nemesis" ? "crowned-skull" : t === "rival" ? "swordman" : "evil-minion";
  }
  return DEFAULTS[type] ?? "perspective-dice-six-faces-random";
}
