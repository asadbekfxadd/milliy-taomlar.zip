import { getMenu } from '@/lib/data';
import { publicMenu } from '@/lib/promo';
import Hero from '@/components/Hero';
import LiveGastronomy from '@/components/LiveGastronomy';
import { Combos, Featured, FreshChapter, GrillChapter, Moods, OrderBand } from '@/components/Home';

/* Hero spread: the dominant plate is the first featured dish with a photo; around it photos first,
   then drawn plates from other categories so the spread shows the breadth of the menu. */
const AROUND = ['b-lagman', 'o-kazan', 's-fillet', 'm-brizol-cheese', 'l-greek', 'm-tabaka-kg', 'm-jiz-kg', 'b-shurpa'];

export default async function Home() {
  const menu = publicMenu(await getMenu());
  const visible = menu.dishes.filter((d) => d.available && menu.cats.some((c) => c.id === d.cat));
  const main = visible.find((d) => d.featured && d.photo && d.cat === 'grill') ?? visible.find((d) => d.photo) ?? visible[0];
  const rest = visible.filter((d) => d !== main);
  const pick = [...AROUND.map((id) => rest.find((d) => d.id === id)).filter(Boolean), ...rest.filter((d) => d.featured)] as typeof visible;
  const seen = new Set<string>();
  const around = pick.filter((d) => (seen.has(d.id) ? false : (seen.add(d.id), true))).slice(0, 5);
  // keep photos in the big slots
  around.sort((a, b) => Number(!!b.photo) - Number(!!a.photo));

  return (
    <>
      <Hero dishes={main ? [main, ...around] : around} />
      <Moods />
      <GrillChapter />
      <LiveGastronomy />
      <Featured />
      <FreshChapter />
      <Combos />
      <OrderBand />
    </>
  );
}
