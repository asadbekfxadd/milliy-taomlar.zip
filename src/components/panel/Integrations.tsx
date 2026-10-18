'use client';
import { api, PageHead, usePanel } from './kit';

type Integ = { telegram: boolean; telegramWebhook: boolean; payme: boolean; click: boolean; site: string };

function Row({ on, title, children }: { on: boolean; title: string; children: React.ReactNode }) {
  return (
    <div className="box">
      <div className="box-head">
        <h2>{title}</h2>
        <span className={`bd ${on ? 'ok' : ''}`}>{on ? 'подключено' : 'не подключено'}</span>
      </div>
      <div className="muted">{children}</div>
    </div>
  );
}

export default function Integrations({ integ }: { integ: Integ }) {
  const { toast } = usePanel();
  const call = async (action: string) => {
    try {
      const r = await api('/api/admin/telegram', 'POST', { action });
      toast(r.ok ? (action === 'webhook' ? 'Кнопки в Telegram подключены' : 'Тестовое сообщение отправлено') : 'Telegram ответил: ' + (r.description || 'ошибка'));
    } catch (e: any) {
      toast(e.message);
    }
  };
  const site = integ.site || 'https://ваш-сайт';
  return (
    <>
      <PageHead title="Интеграции" sub="Ключи задаются в Railway → Variables. Здесь видно, что подключено, и можно проверить." />
      <Row on={integ.telegram} title="Уведомления в Telegram">
        {integ.telegram ? (
          <>
            Новые заказы с сайта приходят в чат с кнопками статуса, гости получают от бота «принят → готовится → готово».
            {!integ.telegramWebhook && ' Чтобы кнопки работали, задайте PUBLIC_URL и TELEGRAM_WEBHOOK_SECRET.'}
            <div className="sx-row" style={{ marginTop: 10 }}>
              <button className="b sm" onClick={() => call('test')}>
                Отправить тест
              </button>
              {integ.telegramWebhook && (
                <button className="b sm" onClick={() => call('webhook')}>
                  Подключить кнопки
                </button>
              )}
            </div>
          </>
        ) : (
          'Создайте бота через @BotFather и задайте TELEGRAM_BOT_TOKEN и TELEGRAM_CHAT_ID.'
        )}
      </Row>
      <Row on={integ.payme} title="Онлайн-оплата Payme">
        {integ.payme ? 'Гости видят «Онлайн через Payme» в корзине.' : 'Задайте PAYME_MERCHANT_ID и PAYME_KEY.'} В кабинете Payme Business укажите адрес <code>{site}/api/pay/payme</code>, поле счёта <code>order_id</code>.
      </Row>
      <Row on={integ.click} title="Онлайн-оплата Click">
        {integ.click ? 'Гости видят «Онлайн через Click» в корзине.' : 'Задайте CLICK_SERVICE_ID, CLICK_MERCHANT_ID и CLICK_SECRET_KEY.'} Prepare и Complete URL: <code>{site}/api/pay/click</code>.
      </Row>
      <Row on title="Вход сотрудников">
        Сотрудники входят на <code>{site}/login</code> под своим именем и PIN. Пароль владельца (ADMIN_PASSWORD) работает всегда. Старый общий STAFF_PIN действует, только пока не добавлен ни один сотрудник.
      </Row>
    </>
  );
}
