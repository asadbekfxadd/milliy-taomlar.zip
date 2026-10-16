import type { Cat, Dish, Settings } from './types';

/* Default content. The site shows it until the owner saves menu/settings in /admin.
   Prices, zones and fees are EXAMPLES — replace them before launch.
   Photos: free images from Unsplash (Unsplash License, commercial use allowed) — plov, lagman and
   meat dish by otabek xatipov (Tashkent), shashlik by Alona D. Replace with the restaurant's own shots. */
export const DEFAULT_CATS: Cat[]=[
 {id:'osh',name:'Ош ва палов',ru:'Плов'},
 {id:'milliy',name:'Миллий таомлар',ru:'Национальные блюда'},
 {id:'xamir',name:'Самса ва хамирли таомлар',ru:'Самса и изделия из теста'},
 {id:'grill',name:'Шашлик ва гриль',ru:'Шашлык и гриль'},
 {id:'shurva',name:'Шўрва ва суюқ таомлар',ru:'Супы'},
 {id:'salat',name:'Салатлар ва газаклар',ru:'Салаты и закуски'},
 {id:'ichimlik',name:'Ичимликлар',ru:'Напитки'},
 {id:'desert',name:'Десертлар',ru:'Десерты'}];
export const D=(o: Partial<Dish> & {id:string}): Dish=>Object.assign({cat:'',name:'',ru:'',desc:'',weight:'',price:0,art:'plov',ingr:[],allergens:[],tags:[],sizes:[],extras:[],photo:'',available:true,featured:false},o) as Dish;
export const DEFAULT_DISHES: Dish[]=[
 D({id:'d1',photo:'https://images.unsplash.com/photo-1671048116810-6f885b2b35a5?auto=format&fit=crop&w=1600&q=80',cat:'osh',name:"To'y oshi",ru:'Свадебный плов',desc:'Рассыпчатая девзира, томлёная баранина, жёлтая морковь, нут и изюм. Сверху перепелиное яйцо, как на свадебном дастархане.',ingr:['рис девзира','баранина','морковь жёлтая и красная','нут','изюм','лук','чеснок','зира','барбарис','хлопковое масло'],allergens:['яйцо'],weight:'350 г',price:45000,tags:['chef','trad'],art:'plov',featured:true,
   sizes:[{label:'Порция',w:'350 г',p:45000},{label:'Большая порция',w:'500 г',p:62000},{label:'Казан на 10 гостей',w:'около 4 кг',p:420000}],
   extras:[{label:'Ачик-чучук',p:15000},{label:'Казы, нарезка',p:22000},{label:'Перепелиные яйца ×2',p:5000}]}),
 D({id:'d2',photo:'https://images.unsplash.com/photo-1671048117293-6b2d4000d146?auto=format&fit=crop&w=1600&q=80',cat:'osh',name:'Choyxona oshi',ru:'Чайханский плов',desc:'Плов в духе ташкентской чайханы: ази из конины, целая головка чеснока, много зиры.',ingr:['рис девзира','конина','морковь','чеснок','зира','хлопковое масло'],weight:'350 г',price:48000,tags:['hit'],art:'plov',
   sizes:[{label:'Порция',w:'350 г',p:48000},{label:'Большая порция',w:'500 г',p:66000}],extras:[{label:'Казы, нарезка',p:22000},{label:'Ачик-чучук',p:15000}]}),
 D({id:'d3',photo:'https://images.unsplash.com/photo-1671048116858-e8ef69175b2d?auto=format&fit=crop&w=1600&q=80',cat:'osh',name:'Samarqand oshi',ru:'Самаркандский плов',desc:'Слоями и без перемешивания: рис отдельно, морковь отдельно, мясо крупными кусками сверху.',ingr:['рис','баранина','жёлтая морковь','курдюк','зира'],weight:'350 г',price:50000,tags:['trad'],art:'plov'}),
 D({id:'d4',photo:'https://images.unsplash.com/photo-1671048116414-67585c932b8f?auto=format&fit=crop&w=1600&q=80',cat:'milliy',name:'Qozon kabob',ru:'Казан-кабоб',desc:'Рёбра ягнёнка и молодой картофель, обжаренные в курдюке до хрустящей корочки. Сверху лук и зелень.',ingr:['рёбра ягнёнка','картофель','курдюк','лук','зира','зелень'],weight:'450 г',price:65000,tags:['hit'],art:'kazan',featured:true}),
 D({id:'d5',photo:'https://images.unsplash.com/photo-1671048116404-454fefede763?auto=format&fit=crop&w=1600&q=80',cat:'milliy',name:"Lag'mon",ru:'Лагман',desc:'Лапша ручной тяги и густая подлива из говядины, перца, редьки и чеснока на ярком бульоне.',ingr:['лапша ручной тяги','говядина','перец болгарский','редька','чеснок','томат'],allergens:['глютен'],weight:'450 мл',price:35000,tags:['trad'],art:'lagmon',featured:true,
   sizes:[{label:'Суйру (с бульоном)',w:'450 мл',p:35000},{label:'Куруқ (жареный)',w:'400 г',p:38000}],extras:[{label:'Острый соус',p:3000},{label:'Двойная лапша',p:8000}]}),
 D({id:'d6',cat:'milliy',name:'Dimlama',ru:'Димлама',desc:'Говядина, айва, капуста и баклажан, томлённые в собственном соку под крышкой.',ingr:['говядина','айва','капуста','баклажан','картофель','лук'],weight:'400 г',price:42000,tags:['trad'],art:'shurva'}),
 D({id:'d7',cat:'xamir',name:'Tandir somsa',ru:'Самса из тандыра',desc:'Слоёное тесто, рубленая вручную баранина и кусочек курдюка. Корочка, которая хрустит громче разговора за столом.',ingr:['слоёное тесто','баранина','курдюк','лук','зира','кунжут'],allergens:['глютен','кунжут'],weight:'около 220 г',price:10000,tags:['hit','trad'],art:'somsa',featured:true,
   sizes:[{label:'1 шт',w:'около 220 г',p:10000},{label:'4 шт',w:'около 880 г',p:38000}],extras:[{label:'Соус из катыка',p:4000}]}),
 D({id:'d8',cat:'xamir',name:'Manti',ru:'Манты',desc:'Тонкое тесто на пару, баранина с курдюком и луком. Подаются с каймаком и молотым красным перцем.',ingr:['тесто','баранина','курдюк','лук','чёрный перец'],allergens:['глютен'],weight:'5 шт',price:42000,tags:['trad'],art:'manti',
   sizes:[{label:'5 шт',w:'около 450 г',p:42000},{label:'10 шт',w:'около 900 г',p:80000}],extras:[{label:'Каймак',p:6000},{label:'Катык с зеленью',p:4000}]}),
 D({id:'d9',cat:'xamir',name:'Patir non',ru:'Патир',desc:'Лепёшка на молоке и сливочном масле, с чернушкой и кунжутом.',ingr:['мука','молоко','сливочное масло','чернушка','кунжут'],allergens:['глютен','молоко','кунжут'],weight:'1 шт',price:8000,art:'non'}),
 D({id:'d10',cat:'xamir',name:'Obi non',ru:'Тандырная лепёшка',desc:'Классическая лепёшка прямо со стенки тандыра.',ingr:['мука','вода','дрожжи','кунжут'],allergens:['глютен','кунжут'],weight:'1 шт',price:5000,art:'non'}),
 D({id:'d11',photo:'https://images.unsplash.com/photo-1747253255646-3bffa4565a7a?auto=format&fit=crop&w=1600&q=80',cat:'grill',name:"Qo'y kabob",ru:'Шашлык из баранины',desc:'Корейка в маринаде из лука и зиры, жаренная на углях. Подаётся с маринованным луком и сумахом.',ingr:['баранья корейка','лук','зира','сумах'],weight:'1 шампур',price:24000,tags:['chef'],art:'shashlik',featured:true,
   sizes:[{label:'1 шампур',w:'около 180 г',p:24000},{label:'5 шампуров',w:'около 900 г',p:115000}],extras:[{label:'Лепёшка',p:5000},{label:'Ачик-чучук',p:15000}]}),
 D({id:'d12',cat:'grill',name:'Jigar kabob',ru:'Печень в курдюке',desc:'Ягнячья печень, обёрнутая курдюком, на углях.',ingr:['печень ягнёнка','курдюк','соль','перец'],weight:'1 шампур',price:16000,art:'shashlik'}),
 D({id:'d13',cat:'grill',name:'Lula kabob',ru:'Люля-кебаб',desc:'Рубленая вручную баранина с курдюком и чёрным перцем.',ingr:['баранина','курдюк','лук','перец'],weight:'1 шампур',price:20000,art:'shashlik'}),
 D({id:'d14',cat:'grill',name:'Tovuq kabob',ru:'Шашлык из курицы',desc:'Куриное бедро в катыке с чесноком.',ingr:['куриное бедро','катык','чеснок'],allergens:['молоко'],weight:'1 шампур',price:16000,art:'shashlik'}),
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
  name:'MILLIY TAOMLAR',tagline:'Традиции, которые объединяют поколения',
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
  {art:'kazanlive',t:'Казан',p:'Плов не терпит спешки. Масло прокаливают до дымка, зирвак томят, пока лук и морковь не отдадут весь вкус, а рис доходит под крышкой.'},
  {art:'manti',t:'Руки мастера',p:'Тесто для мантов раскатывают так тонко, что сквозь него виден узор скатерти. Каждую защипку делают вручную.'},
  {art:'tea',t:'Гостеприимство',p:'Чай трижды возвращают в чайник, чтобы он заварился. Гостю наливают пиалу до половины: так его хотят угощать снова и снова.'},
  {art:'spices',t:'Специи и хлеб',p:'Зира, барбарис, красный перец, кунжут и чернушка. Утром по запаху весь квартал знает, что в тандыре пекутся лепёшки.'},
  {art:'chakchak',t:'Новое прочтение',p:'Те же продукты, те же техники и то же уважение к рецепту. Меняется только подача: тарелка, на которую хочется смотреть.'}
];
export const LIVE_STEPS: [string,string][]=[
  ['Казан раскаляется','Хлопковое масло прокаливают в чугунном казане до лёгкого дымка.'],
  ['Мясо и лук','Баранина обжаривается до корочки, лук становится янтарным.'],
  ['Морковь и зира','Жёлтую и красную морковь режут соломкой вручную. Зирвак томится с зирой и барбарисом.'],
  ['Рис','Девзиру выкладывают ровным слоем поверх зирвака и закрывают крышкой.'],
  ['Ош готов','Плов перекладывают на лаган, мясо режут сверху и подают горячим.']];

