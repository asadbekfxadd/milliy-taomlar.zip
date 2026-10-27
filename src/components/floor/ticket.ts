import { fmt, prettyPhone } from '@/lib/format';
import { PAY_RU } from './types';

/* Thermal-printer tickets (80 mm or 58 mm roll). Plain HTML so any USB/LAN receipt printer
   installed in Windows prints them through the browser. */

const esc = (s: unknown) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);
const time = (t: number) => new Date(t).toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });

export function ticketHtml(job: { kind: string; station: string; body: any }, paper: string) {
  const w = paper === '58' ? 48 : 72;
  const b = job.body || {};
  const css = `
    @page { size: ${paper === '58' ? 58 : 80}mm auto; margin: 0 }
    * { box-sizing: border-box }
    body { margin: 0; padding: 3mm 3mm 8mm; width: ${w + 6}mm; font: 13px/1.3 Arial, "Helvetica Neue", sans-serif; color: #000 }
    .c { text-align: center } .r { text-align: right } .b { font-weight: 700 }
    .xl { font-size: 26px; font-weight: 800; line-height: 1.1 } .l { font-size: 17px; font-weight: 700 } .s { font-size: 11px }
    hr { border: 0; border-top: 1px dashed #000; margin: 6px 0 }
    table { width: 100%; border-collapse: collapse } td { vertical-align: top; padding: 2px 0 }
    .note { background: #000; color: #fff; padding: 2px 4px; font-weight: 700; display: inline-block; margin-top: 2px }
    .q { width: 34px; font-size: 18px; font-weight: 800 }
    .inv { background: #000; color: #fff; font-size: 20px; font-weight: 800; padding: 3px 0; margin-bottom: 4px; letter-spacing: 2px }
  `;
  let body = '';

  if (job.kind === 'test') {
    body = `<div class="c xl">ТЕСТ</div><div class="c l">${esc(b.title)}</div><hr><div class="c">Принтер подключён.<br>${time(b.at)}</div>`;
  } else if (job.kind === 'runner') {
    body = `
      ${b.cancel ? '<div class="c inv">ОТМЕНА</div>' : b.course ? `<div class="c inv">ПОДАЧА: ${esc(String(b.course).toUpperCase())}</div>` : b.add ? '<div class="c inv">ДОЗАКАЗ</div>' : ''}
      <div class="c l">${esc(b.title)}</div>
      <div class="c xl">${esc(b.place)}</div>
      <div class="c">№ ${esc(b.no)} · ${time(b.at)}${b.waiter ? ' · ' + esc(b.waiter) : ''}${b.guests ? ' · гостей ' + esc(b.guests) : ''}</div>
      ${b.when && b.when !== 'asap' ? `<div class="c b">КО ВРЕМЕНИ ${esc(b.when)}</div>` : ''}
      <hr>
      <table>${(b.lines || [])
        .map(
          (l: any) => `<tr><td class="q">${esc(l.qty)}×</td><td><div class="l">${esc(l.name)}</div>${l.mods ? `<div>${esc(l.mods)}</div>` : ''}${l.note ? `<div class="note">${esc(l.note)}</div>` : ''}</td></tr>`,
        )
        .join('')}</table>
      ${b.cancel && b.reason ? `<div class="note">${esc(b.reason)}</div>` : ''}
      ${b.held ? `<div class="c b">ждут подачи: ${esc(b.held)} поз.</div>` : ''}
      <hr><div class="c s">${b.cancel ? 'не готовить' : 'бегунок'} · ${esc(b.title)}</div>`;
  } else if (job.kind === 'shift') {
    body = `
      <div class="c xl">${esc(b.brand)}</div>
      <div class="c l">${esc(b.title)}</div>
      <div class="c s">${esc(b.period)}</div>
      <hr>
      <table>${(b.rows || [])
        .map((r: any) => (r[0] === '-' ? '<tr><td colspan="2"><hr></td></tr>' : `<tr><td${r[2] ? ' class="b"' : ''}>${esc(r[0])}</td><td class="r${r[2] ? ' b' : ''}">${esc(r[1])}</td></tr>`))
        .join('')}</table>
      <hr><div class="c s">${esc(b.by || '')}</div>`;
  } else {
    const title = job.kind === 'precheck' ? 'ПРЕЧЕК' : job.kind === 'online' ? 'ЗАКАЗ С САЙТА' : 'ЧЕК';
    const cu = b.customer;
    body = `
      <div class="c xl">${esc(b.brand)}</div>
      ${b.address ? `<div class="c s">${esc(b.address)}</div>` : ''}
      ${b.phone ? `<div class="c s">${esc(b.phone)}</div>` : ''}
      <hr>
      <div class="c l">${title}</div>
      <div class="c">${esc(b.place)} · № ${esc(b.no)}</div>
      <div class="c s">${time(b.at)}${b.waiter ? ' · ' + esc(b.waiter) : ''}</div>
      ${
        cu
          ? `<hr><div class="b">${esc(cu.name)}</div><div>${esc(prettyPhone(cu.phone))}</div>${cu.address ? `<div>${esc(cu.zone)}: ${esc(cu.address)}</div>` : ''}<div>${cu.when && cu.when !== 'asap' ? 'Ко времени ' + esc(cu.when) : 'Как можно скорее'}</div>${cu.note ? `<div class="note">${esc(cu.note)}</div>` : ''}`
          : ''
      }
      <hr>
      <table>${(b.lines || [])
        .map((l: any) => `<tr><td>${esc(l.name)}${l.mods ? `<div class="s">${esc(l.mods)}</div>` : ''}<div class="s">${esc(l.qty)} × ${fmt(l.unit)}</div></td><td class="r b">${fmt(l.sum)}</td></tr>`)
        .join('')}</table>
      <hr>
      <table>
        <tr><td>Блюда</td><td class="r">${fmt(b.subtotal)}</td></tr>
        ${b.service ? `<tr><td>Обслуживание ${esc(b.servicePct)}%</td><td class="r">${fmt(b.service)}</td></tr>` : ''}
        ${b.fee ? `<tr><td>Доставка</td><td class="r">${fmt(b.fee)}</td></tr>` : ''}
        ${b.discount ? `<tr><td>Скидка ${esc(b.promo || '')}</td><td class="r">−${fmt(b.discount)}</td></tr>` : ''}
        <tr><td class="l">ИТОГО</td><td class="r l">${fmt(b.total)} сум</td></tr>
        ${b.tips ? `<tr><td>Чаевые</td><td class="r">${fmt(b.tips)}</td></tr>` : ''}
        ${job.kind !== 'precheck' && b.pay ? `<tr><td>Оплата</td><td class="r">${esc(PAY_RU[b.pay] || b.pay)}</td></tr>` : ''}
      </table>
      <hr>
      <div class="c s">${job.kind === 'receipt' ? 'Спасибо! Ждём вас снова.<br>' : ''}Нефискальный документ</div>`;
  }
  return `<!doctype html><html><head><meta charset="utf-8"><style>${css}</style></head><body>${body}</body></html>`;
}
