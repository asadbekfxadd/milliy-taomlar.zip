import 'server-only';

/* Online payment providers. Each one switches on only when its keys are set in the environment,
   so the site never shows a payment button that cannot work.
   Payme:  PAYME_MERCHANT_ID, PAYME_KEY  (PAYME_CHECKOUT_URL=https://test.paycom.uz for the sandbox)
   Click:  CLICK_SERVICE_ID, CLICK_MERCHANT_ID, CLICK_SECRET_KEY */

export const providers = () => ({
  payme: Boolean(process.env.PAYME_MERCHANT_ID && process.env.PAYME_KEY),
  click: Boolean(process.env.CLICK_SERVICE_ID && process.env.CLICK_MERCHANT_ID && process.env.CLICK_SECRET_KEY),
});

const site = () => (process.env.PUBLIC_URL || 'http://localhost:3000').replace(/\/$/, '');

export function returnUrl(o: { id: string; token: string }) {
  return `${site()}/order/${o.id}?t=${o.token}`;
}

/** Where to send the guest to pay. Amount in sum; Payme expects tiyin. */
export function checkoutUrl(provider: string, o: { id: string; token: string; total: number }) {
  if (provider === 'payme' && providers().payme) {
    const base = (process.env.PAYME_CHECKOUT_URL || 'https://checkout.paycom.uz').replace(/\/$/, '');
    const params = `m=${process.env.PAYME_MERCHANT_ID};ac.order_id=${o.id};a=${o.total * 100};l=ru;c=${returnUrl(o)}`;
    return `${base}/${Buffer.from(params).toString('base64')}`;
  }
  if (provider === 'click' && providers().click) {
    const u = new URL('https://my.click.uz/services/pay');
    u.searchParams.set('service_id', process.env.CLICK_SERVICE_ID!);
    u.searchParams.set('merchant_id', process.env.CLICK_MERCHANT_ID!);
    u.searchParams.set('amount', o.total.toFixed(2));
    u.searchParams.set('transaction_param', o.id);
    u.searchParams.set('return_url', returnUrl(o));
    return u.toString();
  }
  return null;
}

export const isOnline = (pay: string) => pay === 'payme' || pay === 'click';
