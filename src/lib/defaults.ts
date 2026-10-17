import type { Cat, Combo, Dish, Settings } from './types';

/* Default content. The site shows it until the owner saves menu/settings in /admin.
   Prices, zones and fees are EXAMPLES — replace them before launch.
   Photos: free images from Unsplash (Unsplash License, commercial use allowed) — plov, lagman and
   kazan-kabob by otabek xatipov (Tashkent), lamb shashlik by Alona D, chicken skewers by Mihir Sabnis.
   Dishes without an exact photo get a drawn illustration until the restaurant uploads its own shot. */

const U = (id: string) => `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=1600&q=80`;
export const PHOTO_CREDITS = [
  ['otabek xatipov', 'https://unsplash.com/@arrogant_7007'],
  ['Alona D', 'https://unsplash.com/@alonady'],
  ['Mihir Sabnis', 'https://unsplash.com/@wkndbassist'],
] as const;

/** Bumped when the default menu changes shape; an untouched older saved menu is upgraded once. */
export const MENU_VERSION = 3;

/* The real MANGO menu (from the restaurant's printed menu, October 2026).
   price 0 = the price was not readable on the menu: the site shows "price to be confirmed" and the dish
   cannot be ordered online until the owner enters the price in /admin. */
export const DEFAULT_CATS: Cat[] = [
  { id: 'grill', name: 'Shashlik', ru: 'Шашлык', theme: 'ember' },
  { id: 'ikkinchi', name: 'Ikkinchi taomlar', ru: 'Вторые блюда', theme: 'pom' },
  { id: 'birinchi', name: 'Birinchi taomlar', ru: 'Первые блюда', theme: 'copper' },
  { id: 'salat', name: 'Yogʻli salatlar', ru: 'Салаты на масле', theme: 'herb' },
  { id: 'mayonez', name: 'Mayonezli salatlar', ru: 'Салаты на майонезе', theme: 'cream' },
  { id: 'gazak', name: 'Gazaklar', ru: 'Закуски', theme: 'sand' },
  { id: 'buyurtma', name: 'Buyurtma asosida', ru: 'Блюда на заказ', theme: 'saffron' },
  { id: 'ichimlik', name: 'Ichimliklar', ru: 'Напитки', theme: 'teal' },
  { id: 'desert', name: 'Desertlar', ru: 'Десерты', theme: 'rose' },
];

export const D = (o: Partial<Dish> & { id: string }): Dish =>
  Object.assign(
    { cat: '', name: '', ru: '', desc: '', descUz: '', weight: '', price: 0, art: 'plov', ingr: [], ingrUz: [], allergens: [], tags: [], moods: [], sizes: [], extras: [], photo: '', available: true, featured: false, skewer: false },
    o,
  ) as Dish;

type X = Partial<Dish>;
const M = (id: string, cat: string, name: string, ru: string, art: string, price: number, descUz: string, desc: string, x: X = {}) =>
  D({ id, cat, name, ru, art, price, descUz, desc, ...x });
const SKEWER = { skewer: true, weight: '1 шампур' };
const L15 = (p = 0) => [{ label: '1 л', uz: '1 l', w: '1 л', p }, { label: '1,5 л', uz: '1,5 l', w: '1,5 л', p }];

export const DEFAULT_DISHES: Dish[] = [
  /* ---------- Shashlik ---------- */
  M('s-lula', 'grill', 'Lula kabob', 'Шашлык молотый (люля)', 'shashlik-lula', 0, 'Qiyma goʻshtdan keng sixda pishirilgan lula kabob.', 'Рубленое мясо на широком шампуре, жаренное на углях.', { ...SKEWER, moods: ['hearty', 'quick', 'friends'] }),
  M('s-lamb', 'grill', 'Qoʻy goʻshti kabob', 'Шашлык кусковой из баранины', 'shashlik', 0, 'Boʻlak-boʻlak qoʻy goʻshti, koʻmirda pishirilgan.', 'Баранина кусочками, жаренная на углях.', { ...SKEWER, photo: U('1747253255646-3bffa4565a7a'), tags: ['hit'], featured: true, moods: ['hearty', 'friends'] }),
  M('s-beef', 'grill', 'Mol goʻshti kabob', 'Шашлык кусковой из говядины', 'shashlik-beef', 0, 'Boʻlak-boʻlak mol goʻshti, koʻmirda pishirilgan.', 'Говядина кусочками, жаренная на углях.', { ...SKEWER, moods: ['hearty', 'friends'] }),
  M('s-fillet', 'grill', 'File kabob dumba bilan', 'Шашлык филе с курдюком', 'shashlik-fillet', 0, 'Dumba boʻlakchalari bilan file kabob.', 'Филе на шампуре с кусочками курдюка.', { ...SKEWER, photo: U('1705359573325-f2006d5e459f'), moods: ['hearty'] }),
  M('s-liver', 'grill', 'Jigar kabob', 'Шашлык из печени', 'shashlik-liver', 0, 'Koʻmirda pishirilgan jigar kabob.', 'Печень на углях.', { ...SKEWER, moods: ['hearty'] }),
  M('s-wings', 'grill', 'Qanotchalar', 'Крылышки', 'wings', 0, 'Mangalda pishirilgan tovuq qanotchalari, sous bilan.', 'Куриные крылышки с мангала, с соусом.', { moods: ['friends', 'quick'] }),

  /* ---------- Ikkinchi taomlar (brizol is the house favourite) ---------- */
  M('m-brizol-cheese', 'ikkinchi', 'Pishloqli brizol', 'Бризоль сырная', 'brizol', 38000, 'Tuxum blinchigiga oʻralgan yumshoq goʻsht, pishloq bilan.', 'Нежная отбивная в яичном блинчике, с сыром.', { tags: ['hit'], featured: true, moods: ['hearty', 'quick'] }),
  M('m-brizol-veg', 'ikkinchi', 'Sabzavotli brizol', 'Бризоль овощная', 'brizol-mix', 38000, 'Tuxum blinchigidagi goʻsht, sabzavotlar bilan.', 'Отбивная в яичном блинчике с овощами.', { featured: true, moods: ['hearty', 'quick'] }),
  M('m-veal-veg', 'ikkinchi', 'Sabzavotli buzoq goʻshti', 'Телятина с овощами', 'veal-veg', 0, 'Buzoq goʻshti, qovurilgan sabzavotlar bilan.', 'Телятина, обжаренная с овощами.', { moods: ['hearty'] }),
  M('m-veal-mush', 'ikkinchi', 'Qoʻziqorinli buzoq goʻshti', 'Телятина с грибами', 'veal-mushroom', 0, 'Buzoq goʻshti qoʻziqorinli sousda, garnir bilan.', 'Телятина в грибном соусе, с гарниром.', { moods: ['hearty'] }),
  M('m-chinese', 'ikkinchi', 'Xitoycha goʻsht', 'Мясо по-китайски', 'meat-chinese', 0, 'Shirin-achchiq sousdagi goʻsht va sabzavotlar.', 'Мясо с овощами в кисло-сладком соусе.', { moods: ['hearty'] }),
  M('m-tabaka-kg', 'ikkinchi', 'Tabaka', 'Цыплёнок табака', 'tabaka-kg', 0, 'Butun tovuq, tilla rang qobiqqacha qovurilgan.', 'Целый цыплёнок, обжаренный до золотистой корочки.', { weight: '1 кг', featured: true, moods: ['family', 'friends'] }),
  M('m-tabaka-300', 'ikkinchi', 'Tabaka (300 g)', 'Табака 300 г', 'tabaka-300', 0, 'Bir kishilik tabaka.', 'Табака на одного.', { weight: '300 г', moods: ['hearty', 'quick'] }),
  M('m-chicken-veg', 'ikkinchi', 'Sabzavotli tovuq', 'Курица с овощами', 'chicken-veg', 0, 'Tovuq goʻshti sabzavotlar bilan, garnir bilan.', 'Курица с овощами и гарниром.', { moods: ['light'] }),
  M('m-beefsteak', 'ikkinchi', 'Bifshteks', 'Бифштекс', 'beefsteak', 0, 'Goʻsht kotlet, qovurilgan tuxum va kartoshka fri bilan.', 'Бифштекс с яичницей и картофелем фри.', { moods: ['hearty'] }),
  M('m-stroganoff', 'ikkinchi', 'Befstroganov', 'Бефстроганов', 'stroganoff', 0, 'Qaymoqli sousdagi ingichka goʻsht boʻlakchalari.', 'Тонкие кусочки мяса в сливочном соусе.', { moods: ['hearty'] }),
  M('m-jiz', 'ikkinchi', 'Jiz (qoʻy goʻshti)', 'Жиз из баранины', 'jiz', 0, 'Qovurilgan qoʻy goʻshti, piyoz bilan.', 'Жареная баранина с луком.', { weight: '1 порция', moods: ['hearty'] }),
  M('m-jiz-kg', 'ikkinchi', 'Jiz (qoʻy goʻshti) 1 kg', 'Жиз из баранины 1 кг', 'jiz-kg', 0, 'Katta davra uchun qovurilgan qoʻy goʻshti.', 'Жареная баранина на большую компанию.', { weight: '1 кг', featured: true, moods: ['family', 'friends'] }),
  M('m-liver-tr', 'ikkinchi', 'Turkcha jigar', 'Печень по-турецки', 'liver-turkish', 0, 'Qovurilgan jigar, kartoshka bilan.', 'Жареная печень с картофелем.', { moods: ['hearty'] }),
  M('m-lagman-say', 'ikkinchi', 'Lagʻmon say', 'Лагман сай', 'lagmon-say', 0, 'Ugra ustiga goʻsht va sabzavotli quyuq vaju.', 'Лапша с густой подливой из мяса и овощей.', { moods: ['hearty', 'quick'] }),
  M('m-lagman-qov', 'ikkinchi', 'Qovurma lagʻmon', 'Ковурма лагман', 'lagmon-qovurma', 0, 'Goʻsht va sabzavot bilan qovurilgan ugra.', 'Жареная лапша с мясом и овощами.', { featured: true, moods: ['hearty', 'quick'] }),
  M('m-dolma', 'ikkinchi', 'Doʻlma', 'Долма', 'dolma', 0, 'Uzum bargiga oʻralgan goʻshtli doʻlma, qatiq bilan.', 'Долма в виноградных листьях, с катыком.', { moods: ['family'] }),
  M('m-norin', 'ikkinchi', 'Norin', 'Норин', 'norin', 0, 'Ingichka toʻgʻralgan xamir va qaynatilgan goʻsht.', 'Тонко нарезанное тесто с отварным мясом.', { moods: ['family'] }),

  /* ---------- Birinchi taomlar ---------- */
  M('b-chicken', 'birinchi', 'Tovuqli lapsha', 'Куриная лапша', 'soup-chicken-noodle', 0, 'Tovuq shoʻrvasida uy lapshasi.', 'Домашняя лапша на курином бульоне.', { moods: ['light', 'quick'] }),
  M('b-meatball', 'birinchi', 'Frikadelkali lapsha', 'Фрикадельки с лапшой', 'soup-meatball', 0, 'Frikadelka va lapshali shoʻrva.', 'Суп с фрикадельками и лапшой.', { moods: ['light'] }),
  M('b-pelmeni', 'birinchi', 'Pelmen', 'Пельмени', 'soup-pelmeni', 0, 'Shoʻrvadagi pelmenlar.', 'Пельмени в бульоне.', { moods: ['hearty'] }),
  M('b-shurpa', 'birinchi', 'Qoʻy goʻshtli shoʻrva', 'Шурпа с бараниной', 'shurva', 0, 'Qoʻy goʻshti va sabzavotli tiniq shoʻrva.', 'Прозрачный бульон на баранине с овощами.', { moods: ['hearty', 'light'] }),
  M('b-solyanka', 'birinchi', 'Solyanka', 'Солянка', 'solyanka', 0, 'Goʻsht, zaytun va limonli quyuq shoʻrva.', 'Густой суп с мясом, маслинами и лимоном.', { moods: ['hearty'] }),
  M('b-lagman', 'birinchi', 'Lagʻmon', 'Лагман', 'lagmon', 0, 'Choʻzma ugra, goʻsht va sabzavotli shoʻrva.', 'Тянутая лапша в бульоне с мясом и овощами.', { photo: U('1671048116404-454fefede763'), featured: true, moods: ['hearty', 'quick'] }),
  M('b-mastava', 'birinchi', 'Mastava', 'Мастава', 'mastava', 0, 'Guruch va goʻshtli shoʻrva, qatiq bilan.', 'Рисовый суп с мясом и катыком.', { moods: ['light'] }),
  M('b-kuksi', 'birinchi', 'Kuksi', 'Кук-си', 'kuksi', 0, 'Sovuq shoʻrvadagi ingichka ugra, sabzavot va tuxum bilan.', 'Тонкая лапша в холодном бульоне с овощами и яйцом.', { moods: ['light'] }),
  M('b-okroshka', 'birinchi', 'Okroshka', 'Окрошка', 'okroshka', 0, 'Sovuq shoʻrva: bodring, tuxum, rediska va koʻkat.', 'Холодный суп: огурец, яйцо, редис и зелень.', { moods: ['light'] }),

  /* ---------- Yogʻli salatlar ---------- */
  M('l-georgian', 'salat', 'Gruzincha salat', 'Грузинский', 'salad-georgian', 43000, 'Yogʻli salat.', 'Салат на масле.', { moods: ['light'] }),
  M('l-flamingo', 'salat', 'Flamingo', 'Фламинго', 'salad-flamingo', 45000, 'Yogʻli salat.', 'Салат на масле.', { moods: ['light'] }),
  M('l-greek', 'salat', 'Grekcha salat', 'Греческий', 'salad-greek', 43000, 'Pomidor, bodring, bulgʻor qalampiri, pishloq va zaytun.', 'Помидоры, огурцы, перец, сыр и маслины.', { tags: ['veg'], moods: ['light'] }),
  M('l-cleopatra', 'salat', 'Kleopatra', 'Клеопатра', 'salad-cleopatra', 45000, 'Yogʻli salat.', 'Салат на масле.', { moods: ['light'] }),
  M('l-smak', 'salat', 'Smak', 'Смак', 'salad-smak', 40000, 'Yogʻli salat.', 'Салат на масле.', { moods: ['light'] }),
  M('l-mushroom', 'salat', 'Qoʻziqorinli salat', 'Грибной', 'salad-mushroom', 40000, 'Qoʻziqorinli yogʻli salat.', 'Салат с грибами на масле.', { moods: ['light'] }),
  M('l-pickled', 'salat', 'Tuzlangan assorti', 'Солёное ассорти', 'salad-pickled', 20000, 'Tuzlangan bodring, pomidor va karam.', 'Солёные огурцы, помидоры и капуста.', { tags: ['veg'], moods: ['friends'] }),
  M('l-suzma', 'salat', 'Suzma', 'Сюзьма', 'sauce-white', 15000, 'Koʻkatli suzma.', 'Сюзьма с зеленью.', { tags: ['veg'], moods: ['light'] }),
  M('l-chef', 'salat', 'Shef salati', 'Салат «Шеф»', 'salad-chef', 50000, 'Oshpazdan salat.', 'Салат от шефа.', { moods: ['friends'] }),
  M('l-japanese', 'salat', 'Yaponcha salat', 'Японский', 'salad-japanese', 45000, 'Yogʻli salat.', 'Салат на масле.', { moods: ['light'] }),
  M('l-fresh', 'salat', 'Yangi sabzavot assorti', 'Свежее ассорти', 'salad-fresh', 25000, 'Yangi pomidor, bodring va koʻkatlar.', 'Свежие помидоры, огурцы и зелень.', { tags: ['veg'], moods: ['light', 'friends'] }),
  M('l-house', 'salat', 'Firma salati', 'Фирменный', 'salad-house', 0, 'Restoranning firma salati.', 'Фирменный салат ресторана.', { moods: ['friends'] }),

  /* ---------- Mayonezli salatlar ---------- */
  M('y-man', 'mayonez', 'Mujskoy kapriz', 'Мужской каприз', 'salad-man', 45000, 'Mayonezli salat.', 'Салат на майонезе.', { moods: ['hearty'] }),
  M('y-caesar', 'mayonez', 'Sezar', 'Цезарь', 'salad-caesar', 45000, 'Salat bargi, tovuq, suxariklar va pishloq.', 'Листья салата, курица, сухарики и сыр.', { moods: ['light'] }),
  M('y-lady', 'mayonez', 'Damskiy kapriz', 'Дамский каприз', 'salad-lady', 40000, 'Mayonezli salat.', 'Салат на майонезе.', { moods: ['light'] }),
  M('y-caesar-plus', 'mayonez', 'Sezar plyus', 'Цезарь плюс', 'salad-caesar-plus', 0, 'Kattaroq Sezar salati.', 'Цезарь в расширенном варианте.', { moods: ['hearty'] }),
  M('y-village', 'mayonez', 'Derevenskiy', 'Деревенский', 'salad-village', 50000, 'Mayonezli salat, qarsildoq kartoshka bilan.', 'Салат на майонезе с хрустящим картофелем.', { moods: ['hearty'] }),
  M('y-olivier', 'mayonez', 'Olive', 'Оливье', 'olivier', 0, 'Klassik Olive salati.', 'Классический оливье.', { moods: ['family'] }),
  M('y-shuba', 'mayonez', 'Shuba ostida seledka', 'Селёдка под шубой', 'shuba', 0, 'Lavlagi, kartoshka, sabzi va seledka qatlamlari.', 'Слои свёклы, картофеля, моркови и сельди.', { moods: ['family'] }),
  M('y-bavarian', 'mayonez', 'Bavarskiy', 'Баварский', 'salad-bavarian', 48000, 'Mayonezli salat.', 'Салат на майонезе.', { moods: ['hearty'] }),

  /* ---------- Gazaklar ---------- */
  M('z-dungan', 'gazak', 'Dungancha salat', 'Дунганский', 'salad-dungan', 0, 'Sabzavotli achchiqroq dungan gazagi.', 'Острая дунганская закуска с овощами.', { tags: ['spicy'], moods: ['friends'] }),
  M('z-eggs', 'gazak', 'Toʻldirilgan tuxum', 'Яйца фаршированные', 'eggs-stuffed', 0, 'Toʻldirilgan tuxum gazagi.', 'Фаршированные яйца.', { moods: ['friends'] }),
  M('z-pepper', 'gazak', 'Goʻshtli qalampir', 'Перец с мясом', 'pepper-stuffed', 0, 'Goʻsht bilan toʻldirilgan qalampir.', 'Перец, фаршированный мясом.', { moods: ['hearty'] }),
  M('z-rafaello', 'gazak', 'Rafaello gazagi', 'Рафаэлло (закуска)', 'rafaello-snack', 0, 'Pishloqli gazak sharchalari.', 'Закусочные шарики «Рафаэлло».', { moods: ['friends'] }),
  M('z-herring', 'gazak', 'Seledka', 'Селёдка', 'herring', 0, 'Piyozli seledka.', 'Сельдь с луком.', { moods: ['friends'] }),
  M('z-russian', 'gazak', 'Ruscha gazak', 'Закуска «По-русски»', 'russian-snack', 0, 'Ruscha gazak.', 'Закуска по-русски.', { moods: ['friends'] }),
  M('z-meat', 'gazak', 'Goʻshtli assorti', 'Мясное ассорти', 'meat-platter', 0, 'Goʻsht mahsulotlaridan assorti.', 'Ассорти мясных нарезок.', { moods: ['friends', 'family'] }),

  /* ---------- Buyurtma asosida ---------- */
  M('o-kazan', 'buyurtma', 'Qozon kabob', 'Казан-кабаб', 'kazan', 0, 'Oldindan buyurtma qilinadi. Qozonda qovurilgan goʻsht va kartoshka.', 'Готовим по предварительному заказу. Мясо с картофелем, обжаренные в казане.', { photo: U('1671048116414-67585c932b8f'), featured: true, moods: ['family'] }),
  M('o-liver', 'buyurtma', 'Piyozli jigar', 'Печень сочная с луком', 'liver-onion', 0, 'Oldindan buyurtma qilinadi. Piyoz bilan qovurilgan shirali jigar.', 'Готовим по предварительному заказу. Сочная печень, жаренная с луком.', { moods: ['hearty'] }),
  M('o-moxora', 'buyurtma', 'Moxora', 'Мохора', 'moxora', 0, 'Oldindan buyurtma qilinadi. Noʻxat va goʻshtli shoʻrva.', 'Готовим по предварительному заказу. Суп с нутом и мясом.', { moods: ['family'] }),

  /* ---------- Ichimliklar ---------- */
  M('i-cola', 'ichimlik', 'Coca-Cola', 'Coca-Cola', 'glass-cola', 0, 'Sovutilgan.', 'Охлаждённая.', { sizes: L15(), moods: ['friends', 'quick'] }),
  M('i-pepsi', 'ichimlik', 'Pepsi', 'Pepsi', 'glass-pepsi', 0, 'Sovutilgan.', 'Охлаждённая.', { sizes: L15(), moods: ['friends'] }),
  M('i-fanta', 'ichimlik', 'Fanta', 'Fanta', 'glass-fanta', 0, 'Sovutilgan.', 'Охлаждённая.', { sizes: L15(), moods: ['friends'] }),
  M('i-juice', 'ichimlik', 'Sharbat', 'Сок', 'glass-juice', 0, 'Paketdagi sharbat.', 'Сок в пакете.', { moods: ['family'] }),
  M('i-tea', 'ichimlik', 'Choy', 'Чай', 'tea', 0, 'Bir choynak choy.', 'Чайник чая.', { moods: ['family', 'friends'] }),
  M('i-coffee', 'ichimlik', 'Qahva', 'Кофе', 'coffee', 0, 'Issiq qahva.', 'Горячий кофе.', { moods: ['quick'] }),
  M('i-tea-lemon', 'ichimlik', 'Limonli choy', 'Чай с лимоном', 'tea-lemon', 0, 'Limonli choy.', 'Чай с лимоном.', { moods: ['light'] }),
  M('i-mineral', 'ichimlik', 'Mineral suv', 'Минеральная вода', 'glass-mineral', 0, 'Mineral suv.', 'Минеральная вода.', { moods: ['light'] }),
  M('i-icetea', 'ichimlik', 'Ice tea', 'Ice tea', 'glass-icetea', 0, 'Sovuq choy.', 'Холодный чай.', { moods: ['light'] }),

  /* ---------- Desertlar ---------- */
  M('e-rafaello', 'desert', 'Rafaello', 'Рафаэлло', 'rafaello-dessert', 0, 'Kokos qirindili desert.', 'Десерт в кокосовой стружке.', { moods: ['family'] }),
  M('e-snickers', 'desert', 'Snikers', 'Сникерс', 'snickers', 0, 'Shokoladli tort boʻlagi.', 'Шоколадный торт.', { moods: ['family'] }),
  M('e-roll', 'desert', 'Shoko-rulet', 'Чоко-рулет', 'choco-roll', 0, 'Shokoladli rulet.', 'Шоколадный рулет.', { moods: ['family'] }),
  M('e-cheesecake', 'desert', 'Chizkeyk', 'Чизкейк', 'cheesecake', 0, 'Chizkeyk boʻlagi.', 'Чизкейк.', { moods: ['light'] }),
  M('e-tartlet', 'desert', 'Tartaletka', 'Тарталетка', 'tartlet', 0, 'Qaymoqli tartaletka.', 'Тарталетка с кремом.', { moods: ['light'] }),
  M('e-eclair', 'desert', 'Ekler', 'Эклер', 'eclair', 0, 'Kremli ekler.', 'Эклер с кремом.', { moods: ['quick'] }),
  M('e-oreo', 'desert', 'Oreo', 'Орео', 'oreo', 0, 'Oreo tort boʻlagi.', 'Торт «Орео».', { moods: ['family'] }),
  M('e-mousse', 'desert', 'Mussli tort', 'Муссовый торт', 'mousse', 0, 'Mussli tort boʻlagi.', 'Муссовый торт.', { moods: ['light'] }),
  M('e-napoleon', 'desert', 'Napoleon', 'Наполеон', 'napoleon', 0, 'Klassik Napoleon tort.', 'Классический «Наполеон».', { moods: ['family'] }),
  M('e-medovik', 'desert', 'Medovik', 'Медовик', 'medovik', 0, 'Asalli tort.', 'Медовый торт.', { moods: ['family'] }),
  M('e-cherry', 'desert', 'Olchali pirog', 'Вишнёвый пирог', 'cherry-pie', 0, 'Olchali pirog.', 'Пирог с вишней.', { moods: ['family'] }),
  M('e-birdmilk', 'desert', 'Qush suti', 'Птичье молоко', 'bird-milk', 0, 'Qush suti torti.', 'Торт «Птичье молоко».', { moods: ['family'] }),
  M('e-curd', 'desert', 'Tvorogli pirog', 'Творожный пирог', 'curd-pie', 0, 'Tvorogli pirog.', 'Творожный пирог.', { moods: ['light'] }),
  M('e-whoopie', 'desert', 'Vupi pay', 'Вупи пай', 'whoopie', 0, 'Kremli shokoladli pechenye.', 'Шоколадное печенье с кремом.', { moods: ['quick'] }),
  M('e-baklava', 'desert', 'Istanbul paxlavasi', 'Стамбульская пахлава', 'baklava', 0, 'Pistali paxlava.', 'Пахлава с фисташкой.', { moods: ['family'] }),
  M('e-baklava-roll', 'desert', 'Istanbul paxlavasi (rulet)', 'Стамбульская пахлава (рулет)', 'baklava-roll', 0, 'Rulet shaklidagi paxlava.', 'Пахлава-рулет.', { moods: ['family'] }),
];

/* "Popular combinations": the price is the sum of the current item prices; a combo is shown only when every item has a price. */
export const DEFAULT_COMBOS: Combo[] = [
  { id: 'c1', name: 'Mangal toʻplami', ru: 'Сет у мангала', descUz: 'Uch xil kabob, yangi salat va choy — ikki kishiga.', desc: 'Три вида шашлыка, свежий салат и чай — на двоих.',
    items: [{ id: 's-lamb', si: 0, qty: 2 }, { id: 's-beef', si: 0, qty: 2 }, { id: 's-lula', si: 0, qty: 2 }, { id: 'l-fresh', si: 0, qty: 1 }, { id: 'i-tea', si: 0, qty: 1 }] },
  { id: 'c2', name: 'Brizol tushligi', ru: 'Обед с бризолью', descUz: 'Pishloqli brizol, grekcha salat va limonli choy.', desc: 'Бризоль сырная, греческий салат и чай с лимоном.',
    items: [{ id: 'm-brizol-cheese', si: 0, qty: 1 }, { id: 'l-greek', si: 0, qty: 1 }, { id: 'i-tea-lemon', si: 0, qty: 1 }] },
  { id: 'c3', name: 'Oilaviy dasturxon', ru: 'Семейный стол', descUz: 'Tabaka, jiz, ikki salat va ichimlik — 4–5 kishiga.', desc: 'Табака, жиз, два салата и напиток — на 4–5 человек.',
    items: [{ id: 'm-tabaka-kg', si: 0, qty: 1 }, { id: 'm-jiz-kg', si: 0, qty: 1 }, { id: 'y-caesar', si: 0, qty: 1 }, { id: 'l-fresh', si: 0, qty: 1 }, { id: 'i-cola', si: 1, qty: 1 }] },
  { id: 'c4', name: 'Tez tushlik', ru: 'Быстрый обед', descUz: 'Lagʻmon, salat va choy.', desc: 'Лагман, салат и чай.',
    items: [{ id: 'b-lagman', si: 0, qty: 1 }, { id: 'l-fresh', si: 0, qty: 1 }, { id: 'i-tea', si: 0, qty: 1 }] },
];

export const DEFAULT_SETTINGS: Settings = {
  name: 'MANGO',
  tagline: 'Традиции, которые объединяют поколения',
  taglineUz: 'Avlodlarni birlashtiruvchi anʼanalar',
  phone: '+998 97 249 41 11',
  phone2: '+998 99 349 41 11',
  address: '',
  addressUz: '',
  city: 'Янгиюль, Ташкентская область',
  cityUz: 'Yangiyoʻl, Toshkent viloyati',
  hours: '9:00–23:00, пятница — выходной',
  hoursUz: '9:00–23:00, juma — dam olish kuni',
  openFrom: '09:00',
  openTo: '23:00',
  closedDays: [5],
  ordersPaused: false,
  mapUrl: 'https://www.google.com/maps/search/?api=1&query=41.1037812,69.043786&query_place_id=ChIJJcqMm157rjgRvF-UpyjkNyc',
  instagram: '',
  telegram: '',
  pickup: true,
  delivery: true,
  prepTime: '30–45 минут',
  minOrder: 60000,
  zones: [
    { name: 'Янгиюль, центр', uz: 'Yangiyoʻl, markaz', fee: 10000, min: 60000 },
    { name: 'Янгиюль, окраины', uz: 'Yangiyoʻl, chekka hududlar', fee: 15000, min: 80000 },
  ],
  pay: { cash: true, card: true },
  story: ['', '', '', '', '', ''],
  storyPhotos: ['', '', '', '', '', ''],
  promos: [],
  tables: 15,
  servicePct: 10,
  autoAcceptOnline: true,
  prepMinutes: 25,
  deliveryMinutes: 20,
  printGuestChecks: false,
  paper: '80',
  catStations: { grill: 'mangal', ikkinchi: 'kitchen', birinchi: 'kitchen', salat: 'kitchen', mayonez: 'kitchen', gazak: 'kitchen', buyurtma: 'kitchen', ichimlik: 'bar', desert: 'bar' },
};

/* Badges are shown only when the dish really carries the tag. */
export const TAGS: Record<string, { uz: string; ru: string; badge?: boolean }> = {
  chef: { uz: 'TOP TANLOV', ru: 'Выбор шефа', badge: true },
  hit: { uz: 'HIT', ru: 'Хит', badge: true },
  new: { uz: 'YANGI', ru: 'Новинка', badge: true },
  trad: { uz: 'Anʼanaviy', ru: 'Традиционный рецепт' },
  spicy: { uz: 'Achchiq', ru: 'Острое' },
  veg: { uz: 'Goʻshtsiz', ru: 'Без мяса' },
};

export const MOODS: { id: string; uz: string; ru: string; subUz: string; subRu: string; art: string }[] = [
  { id: 'hearty', uz: 'Goʻshtli va toʻyimli', ru: 'Мясное и сытное', subUz: 'Kabob, brizol, jiz', subRu: 'Шашлык, бризоль, жиз', art: 'shashlik' },
  { id: 'light', uz: 'Yengil va yangi', ru: 'Лёгкое и свежее', subUz: 'Salatlar, shoʻrvalar, choy', subRu: 'Салаты, супы, чай', art: 'salad-fresh' },
  { id: 'family', uz: 'Oila uchun', ru: 'Для всей семьи', subUz: 'Tabaka, jiz 1 kg, desertlar', subRu: 'Табака, жиз 1 кг, десерты', art: 'tabaka-kg' },
  { id: 'friends', uz: 'Doʻstlar bilan', ru: 'С друзьями', subUz: 'Shashlik, gazaklar, ichimliklar', subRu: 'Шашлык, закуски, напитки', art: 'mangal' },
  { id: 'quick', uz: 'Tez va mazali', ru: 'Быстро и вкусно', subUz: 'Lagʻmon, brizol, lula', subRu: 'Лагман, бризоль, люля', art: 'lagmon-qovurma' },
];

export const STATUS: [string, string][] = [['new', 'Отправлен'], ['accepted', 'Принят'], ['cooking', 'Готовится'], ['ready', 'Готов / в пути'], ['done', 'Завершён']];

export const STORY = [
  { art: 'dastarkhan', t: 'Дастархан', tUz: 'Dasturxon',
    p: 'За узбекским столом не бывает лишних гостей. Лепёшку ломают руками и делят на всех, а лучший кусок кладут тому, кто пришёл издалека.',
    pUz: 'Oʻzbek dasturxonida ortiqcha mehmon boʻlmaydi. Nonni qoʻl bilan sindirib, hammaga ulashadilar, eng yaxshi boʻlakni esa uzoqdan kelganga qoʻyadilar.' },
  { art: 'mangal', t: 'Мангал', tUz: 'Mangal',
    p: 'Шашлык не терпит спешки. Угли должны прогореть до ровного жара, а мясо — схватиться корочкой и отдать сок, прежде чем попасть на стол.',
    pUz: 'Kabob shoshilishni yoqtirmaydi. Koʻmir bir tekis choʻgʻ boʻlguncha yonishi, goʻsht esa dasturxonga chiqquncha qobiq olib, sharbatini berishi kerak.' },
  { art: 'manti', t: 'Руки мастера', tUz: 'Usta qoʻllari',
    p: 'Тесто для мантов раскатывают так тонко, что сквозь него виден узор скатерти. Каждую защипку делают вручную.',
    pUz: 'Manti xamirini shunchalik yupqa yoyadilarki, undan dasturxon naqshi koʻrinadi. Har bir chimdim qoʻlda qilinadi.' },
  { art: 'tea', t: 'Гостеприимство', tUz: 'Mehmondoʻstlik',
    p: 'Чай трижды возвращают в чайник, чтобы он заварился. Гостю наливают пиалу до половины: так его хотят угощать снова и снова.',
    pUz: 'Choy damlanishi uchun uch marta choynakka qaytariladi. Mehmonga piyolaning yarmigacha quyiladi — uni qayta-qayta siylash uchun.' },
  { art: 'spices', t: 'Специи и хлеб', tUz: 'Ziravor va non',
    p: 'Зира, барбарис, красный перец, кунжут и чернушка. Утром по запаху весь квартал знает, что в тандыре пекутся лепёшки.',
    pUz: 'Zira, zirk, qizil qalampir, kunjut va sedana. Ertalab hidi butun mahallaga tandirda non yopilayotganini bildiradi.' },
  { art: 'chakchak', t: 'Новое прочтение', tUz: 'Yangicha talqin',
    p: 'Те же продукты, те же техники и то же уважение к рецепту. Меняется только подача: тарелка, на которую хочется смотреть.',
    pUz: 'Oʻsha mahsulotlar, oʻsha usullar va retseptga oʻsha hurmat. Faqat taqdimot oʻzgaradi: qarab toʻymaydigan likopcha.' },
];

export const LIVE_STEPS: { t: string; p: string; tUz: string; pUz: string }[] = [
  { t: 'Угли разгораются', p: 'Мангал разжигают заранее: жар должен стать ровным, без открытого огня.', tUz: 'Koʻmir qizimoqda', pUz: 'Mangal oldindan yoqiladi: olov emas, bir tekis choʻgʻ kerak.' },
  { t: 'Шампуры на мангал', p: 'Маринованное мясо чередуют с кусочками курдюка и выкладывают над углями.', tUz: 'Sixlar mangalda', pUz: 'Marinadlangan goʻsht dumba boʻlaklari bilan almashtirib, choʻgʻ ustiga qoʻyiladi.' },
  { t: 'Корочка', p: 'Шампуры переворачивают, пока мясо не схватится румяной корочкой и не пустит сок.', tUz: 'Qizargan qobiq', pUz: 'Goʻsht qizil qobiq olib, sharbat chiqarguncha sixlar aylantiriladi.' },
  { t: 'Дымок', p: 'Капли жира падают на угли и дают тот самый аромат.', tUz: 'Tutun', pUz: 'Yogʻ tomchilari choʻgʻga tushib, oʻsha mashhur hidni beradi.' },
  { t: 'К столу', p: 'Подаём сразу с мангала: с маринованным луком, зеленью и горячей лепёшкой.', tUz: 'Dasturxonga', pUz: 'Toʻgʻri mangaldan: tuzlangan piyoz, koʻkat va issiq non bilan.' },
];

/* ids of earlier stock example menus; a saved menu with only these ids was never really edited */
export const LEGACY_IDS = new Set(['d1', 'd2', 'd3', 'd4', 'd5', 'd6', 'd7', 'd8', 'd9', 'd10', 'd11', 'd12', 'd13', 'd14', 'd15', 'd16', 'd17', 'd18', 'd19', 'd20', 'd21', 'd22', 'd23', 'd24', 'd25', 'd26', 'g2', 'g3', 'g4', 'g5', 'g6', 'g7', 'b1', 'b2', 'b3', 'p1', 's2', 'x3', 'l3', 'z2', 'z3', 'z4', 'z5', 'r1', 'r2', 'r3', 'i2', 'i5', 'i6', 'e3']);
