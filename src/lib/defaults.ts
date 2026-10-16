import type { Cat, Dish, Settings } from './types';

/* Default content. The site shows it until the owner saves menu/settings in /admin.
   Prices, zones and fees are EXAMPLES — replace them before launch.
   Photos: free images from Unsplash (Unsplash License, commercial use allowed) — plov, lagman and
   meat dish by otabek xatipov (Tashkent), shashlik by Alona D. Replace with the restaurant's own shots. */
export const DEFAULT_CATS: Cat[]=[
 {id:'grill',name:'Шашлик ва гриль',ru:'Шашлык и мангал'},
 {id:'brizol',name:'Бризоль',ru:'Бризоль'},
 {id:'milliy',name:'Миллий таомлар',ru:'Национальные блюда'},
 {id:'xamir',name:'Самса ва хамирли таомлар',ru:'Самса и изделия из теста'},
 {id:'shurva',name:'Шўрва ва суюқ таомлар',ru:'Супы'},
 {id:'salat',name:'Салатлар ва газаклар',ru:'Салаты и закуски'},
 {id:'ichimlik',name:'Ичимликлар',ru:'Напитки'},
 {id:'desert',name:'Десертлар',ru:'Десерты'}];
export const D=(o: Partial<Dish> & {id:string}): Dish=>Object.assign({cat:'',name:'',ru:'',desc:'',weight:'',price:0,art:'plov',ingr:[],allergens:[],tags:[],sizes:[],extras:[],photo:'',available:true,featured:false},o) as Dish;
export const DEFAULT_DISHES: Dish[]=[
 D({id:'d11',photo:'https://images.unsplash.com/photo-1747253255646-3bffa4565a7a?auto=format&fit=crop&w=1600&q=80',cat:'grill',name:"Qo'y kabob",ru:'Шашлык из баранины',desc:'Сочная баранина на углях, маринад из лука и зиры. Подаётся с маринованным луком и зеленью.',ingr:['баранина','курдюк','лук','зира','чёрный перец'],weight:'1 шампур',price:24000,tags:['hit','chef'],art:'shashlik',featured:true,
   sizes:[{label:'1 шампур',w:'около 180 г',p:24000},{label:'5 шампуров',w:'около 900 г',p:115000}],extras:[{label:'Лепёшка',p:5000},{label:'Ачик-чучук',p:15000},{label:'Маринованный лук',p:3000}]}),
 D({id:'g2',cat:'grill',name:"Mol go'shti kabob",ru:'Шашлык из говядины',desc:'Говяжья вырезка кусочками, обжаренная на углях до румяной корочки.',ingr:['говядина','лук','специи'],weight:'1 шампур',price:22000,art:'shashlik'}),
 D({id:'g3',cat:'grill',name:'Lula kabob',ru:'Люля-кебаб',desc:'Рубленое мясо с луком и курдюком на широком шампуре.',ingr:['баранина','говядина','курдюк','лук','перец'],weight:'1 шампур',price:20000,art:'shashlik'}),
 D({id:'g4',cat:'grill',name:'Jigar kabob',ru:'Печень в курдюке',desc:'Печень, обёрнутая курдюком, на углях.',ingr:['печень','курдюк','соль','перец'],weight:'1 шампур',price:16000,art:'shashlik'}),
 D({id:'g5',cat:'grill',name:'Tovuq kabob',ru:'Шашлык из курицы',desc:'Куриное бедро в маринаде из катыка и чеснока.',ingr:['куриное бедро','катык','чеснок'],allergens:['молоко'],weight:'1 шампур',price:16000,art:'shashlik'}),
 D({id:'g6',cat:'grill',name:'Assorti',ru:'Ассорти на компанию',desc:'Баранина, говядина, люля и курица, 10 шампуров. С луком, зеленью и лепёшками.',ingr:['баранина','говядина','люля','курица','лук','лепёшки'],weight:'10 шампуров',price:200000,tags:['hit'],art:'shashlik',featured:true}),
 D({id:'b1',cat:'brizol',name:'Tovuq brizol',ru:'Бризоль из курицы',desc:'Нежная куриная отбивная в тонком яичном блинчике, с сыром и грибами. С картофелем фри и свежими овощами.',ingr:['куриное филе','яйцо','сыр','шампиньоны','картофель'],allergens:['яйцо','молоко','глютен'],weight:'350 г',price:38000,tags:['hit'],art:'brizol',featured:true,
   extras:[{label:'Двойной сыр',p:6000},{label:'Рис вместо картофеля',p:0}]}),
 D({id:'b2',cat:'brizol',name:"Mol go'shti brizol",ru:'Бризоль из говядины',desc:'Рубленая говядина в яичном блинчике, внутри сыр и помидоры.',ingr:['говядина','яйцо','сыр','помидор','лук'],allergens:['яйцо','молоко'],weight:'350 г',price:42000,art:'brizol',
   extras:[{label:'Двойной сыр',p:6000}]}),
 D({id:'b3',cat:'brizol',name:'Brizol assorti',ru:'Бризоль ассорти',desc:'Курица и говядина в яичном блинчике, грибной соус, картофель по-деревенски.',ingr:['курица','говядина','яйцо','грибы','картофель'],allergens:['яйцо','молоко'],weight:'400 г',price:45000,art:'brizol'}),
 D({id:'d4',photo:'https://images.unsplash.com/photo-1671048116414-67585c932b8f?auto=format&fit=crop&w=1600&q=80',cat:'milliy',name:'Qozon kabob',ru:'Казан-кабоб',desc:'Рёбра ягнёнка и молодой картофель, обжаренные в курдюке до хрустящей корочки. Сверху лук и зелень.',ingr:['рёбра ягнёнка','картофель','курдюк','лук','зира','зелень'],weight:'450 г',price:65000,tags:['hit'],art:'kazan',featured:true}),
 D({id:'d5',photo:'https://images.unsplash.com/photo-1671048116404-454fefede763?auto=format&fit=crop&w=1600&q=80',cat:'milliy',name:"Lag'mon",ru:'Лагман',desc:'Лапша ручной тяги и густая подлива из говядины, перца, редьки и чеснока на ярком бульоне.',ingr:['лапша ручной тяги','говядина','перец болгарский','редька','чеснок','томат'],allergens:['глютен'],weight:'450 мл',price:35000,tags:['trad'],art:'lagmon',featured:true,
   sizes:[{label:'Суйру (с бульоном)',w:'450 мл',p:35000},{label:'Куруқ (жареный)',w:'400 г',p:38000}],extras:[{label:'Острый соус',p:3000},{label:'Двойная лапша',p:8000}]}),
 D({id:'d6',cat:'milliy',name:'Dimlama',ru:'Димлама',desc:'Говядина, айва, капуста и баклажан, томлённые в собственном соку под крышкой.',ingr:['говядина','айва','капуста','баклажан','картофель','лук'],weight:'400 г',price:42000,tags:['trad'],art:'shurva'}),
 D({id:'d7',cat:'xamir',name:'Tandir somsa',ru:'Самса из тандыра',desc:'Слоёное тесто, рубленая вручную баранина и кусочек курдюка. Корочка, которая хрустит громче разговора за столом.',ingr:['слоёное тесто','баранина','курдюк','лук','зира','кунжут'],allergens:['глютен','кунжут'],weight:'около 220 г',price:10000,tags:['hit','trad'],art:'somsa',
   sizes:[{label:'1 шт',w:'около 220 г',p:10000},{label:'4 шт',w:'около 880 г',p:38000}],extras:[{label:'Соус из катыка',p:4000}]}),
 D({id:'d8',cat:'xamir',name:'Manti',ru:'Манты',desc:'Тонкое тесто на пару, баранина с курдюком и луком. Подаются с каймаком и молотым красным перцем.',ingr:['тесто','баранина','курдюк','лук','чёрный перец'],allergens:['глютен'],weight:'5 шт',price:42000,tags:['trad'],art:'manti',
   sizes:[{label:'5 шт',w:'около 450 г',p:42000},{label:'10 шт',w:'около 900 г',p:80000}],extras:[{label:'Каймак',p:6000},{label:'Катык с зеленью',p:4000}]}),
 D({id:'d9',cat:'xamir',name:'Patir non',ru:'Патир',desc:'Лепёшка на молоке и сливочном масле, с чернушкой и кунжутом.',ingr:['мука','молоко','сливочное масло','чернушка','кунжут'],allergens:['глютен','молоко','кунжут'],weight:'1 шт',price:8000,art:'non'}),
 D({id:'d10',cat:'xamir',name:'Obi non',ru:'Тандырная лепёшка',desc:'Классическая лепёшка прямо со стенки тандыра.',ingr:['мука','вода','дрожжи','кунжут'],allergens:['глютен','кунжут'],weight:'1 шт',price:5000,art:'non'}),
 D({id:'d15',cat:'shurva',name:"Sho'rva",ru:'Шурпа',desc:'Прозрачный бульон на баранине, нут и крупно нарезанные овощи.',ingr:['баранина','нут','картофель','морковь','болгарский перец','зелень'],weight:'450 мл',price:38000,tags:['trad'],art:'shurva'}),
 D({id:'d16',cat:'shurva',name:'Mastava',ru:'Мастава',desc:'Рисовый суп на баранине с катыком и кинзой.',ingr:['рис','баранина','томат','катык','кинза'],allergens:['молоко'],weight:'400 мл',price:28000,art:'shurva'}),
 D({id:'d17',cat:'shurva',name:'Chuchvara',ru:'Чучвара',desc:'Маленькие пельмени в бульоне, с катыком и зеленью.',ingr:['тесто','говядина','лук','катык'],allergens:['глютен','молоко'],weight:'350 г',price:30000,art:'shurva'}),
 D({id:'d18',cat:'salat',name:'Achchiq-chuchuk',ru:'Ачик-чучук',desc:'Мясистые помидоры, сладкий лук, острый перец и райхон.',ingr:['помидоры','лук','острый перец','райхон'],weight:'250 г',price:15000,tags:['veg','spicy'],art:'salad'}),
 D({id:'d19',cat:'salat',name:'Toshkent salati',ru:'Салат «Ташкент»',desc:'Зелёная редька, отварная говядина, яйцо и хрустящий лук.',ingr:['зелёная редька','говядина','яйцо','лук','майонез'],allergens:['яйцо'],weight:'250 г',price:28000,art:'salad'}),
 D({id:'d20',cat:'salat',name:'Suzma',ru:'Сюзьма с зеленью',desc:'Густой кисломолочный сыр с укропом и чесноком.',ingr:['сюзьма','укроп','чеснок'],allergens:['молоко'],weight:'150 г',price:12000,tags:['veg'],art:'glass-ayron'}),
 D({id:'d21',cat:'ichimlik',name:"Ko'k choy",ru:'Зелёный чай',desc:'Чайник зелёного чая, который разливают по пиалам и трижды возвращают в чайник.',ingr:['зелёный чай'],weight:'0,8 л',price:8000,tags:['trad'],art:'tea',extras:[{label:'Лимон',p:3000},{label:'Набот',p:4000}]}),
 D({id:'d22',cat:'ichimlik',name:'Mango lassi',ru:'Манго-ласси',desc:'Спелое манго, катык и мёд.',ingr:['манго','катык','мёд'],allergens:['молоко'],weight:'400 мл',price:25000,tags:['veg'],art:'glass-mango'}),
 D({id:'d23',cat:'ichimlik',name:'Kompot',ru:'Домашний компот',desc:'Урюк, вишня и айва.',ingr:['урюк','вишня','айва'],weight:'1 л',price:18000,tags:['veg'],art:'glass-kompot'}),
 D({id:'d24',cat:'ichimlik',name:'Ayron',ru:'Айран',desc:'Катык, ледяная вода, соль и мята.',ingr:['катык','вода','мята'],allergens:['молоко'],weight:'400 мл',price:10000,tags:['veg'],art:'glass-ayron'}),
 D({id:'d25',cat:'desert',name:'Chak-chak',ru:'Чак-чак',desc:'Хрустящее тесто в горячем мёду с орехами.',ingr:['тесто','мёд','яйцо','орехи'],allergens:['глютен','яйцо','орехи'],weight:'200 г',price:22000,art:'chakchak'}),
 D({id:'d26',cat:'desert',name:'Navvot va holva',ru:'Набот и халва',desc:'К чаю: кристаллы набота, кунжутная халва и миндаль.',ingr:['набот','халва','миндаль'],allergens:['кунжут','орехи'],weight:'150 г',price:18000,art:'tea'})
];
export const DEFAULT_SETTINGS: Settings={
  name:'MANGO',tagline:'Традиции, которые объединяют поколения',
  phone:'+998 97 249 41 11',address:'',city:'Янгиюль, Ташкентская область',hours:'9:00–23:00, пятница — выходной',mapUrl:'https://www.google.com/maps/search/?api=1&query=41.1037812,69.043786&query_place_id=ChIJJcqMm157rjgRvF-UpyjkNyc',instagram:'',telegram:'',
  pickup:true,delivery:true,prepTime:'30–45 минут',minOrder:60000,
  zones:[{name:'Янгиюль, центр',fee:10000,min:60000},{name:'Янгиюль, окраины',fee:15000,min:80000}],
  pay:{cash:true,card:true},
  story:['','','','','',''],storyPhotos:['','','','','','']
};
export const TAGS: Record<string,string>={hit:'Хит',chef:'Выбор шефа',trad:'Традиционный рецепт',spicy:'Острое',veg:'Без мяса'};
export const STATUS: [string,string][]=[['new','Отправлен'],['accepted','Принят'],['cooking','Готовится'],['ready','Готов / в пути'],['done','Завершён']];
export const STORY=[
  {art:'dastarkhan',t:'Дастархан',p:'За узбекским столом не бывает лишних гостей. Лепёшку ломают руками и делят на всех, а лучший кусок кладут тому, кто пришёл издалека.'},
  {art:'mangal',t:'Мангал',p:'Шашлык не терпит спешки. Угли должны прогореть до ровного жара, а мясо — схватиться корочкой и отдать сок, прежде чем попасть на стол.'},
  {art:'manti',t:'Руки мастера',p:'Тесто для мантов раскатывают так тонко, что сквозь него виден узор скатерти. Каждую защипку делают вручную.'},
  {art:'tea',t:'Гостеприимство',p:'Чай трижды возвращают в чайник, чтобы он заварился. Гостю наливают пиалу до половины: так его хотят угощать снова и снова.'},
  {art:'spices',t:'Специи и хлеб',p:'Зира, барбарис, красный перец, кунжут и чернушка. Утром по запаху весь квартал знает, что в тандыре пекутся лепёшки.'},
  {art:'chakchak',t:'Новое прочтение',p:'Те же продукты, те же техники и то же уважение к рецепту. Меняется только подача: тарелка, на которую хочется смотреть.'}
];
export const LIVE_STEPS: [string,string][]=[
  ['Угли разгораются','Мангал разжигают заранее: жар должен стать ровным, без открытого огня.'],
  ['Шампуры на мангал','Маринованное мясо чередуют с кусочками курдюка и выкладывают над углями.'],
  ['Корочка','Шампуры переворачивают, пока мясо не схватится румяной корочкой и не пустит сок.'],
  ['Дымок','Капли жира падают на угли и дают тот самый аромат.'],
  ['К столу','Подаём сразу с мангала: с маринованным луком, зеленью и горячей лепёшкой.']];

