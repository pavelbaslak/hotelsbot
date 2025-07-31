
const express = require('express');
const axios = require('axios');
const dotenv = require('dotenv');
const crypto = require('crypto');
dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

// ⬇️ Конфигурация для Botpress
const BOTPRESS_WEBHOOK_URL = process.env.BOTPRESS_WEBHOOK_URL;
const BOTPRESS_SECRET = process.env.BOTPRESS_SECRET; // Используется для подписи (HMAC)

// ⬇️ Конфигурация для WuBook Zak Essentials API
const WUBOOK_API_URL = process.env.WUBOOK_API_URL; // URL для запроса данных бронирования
const WUBOOK_CUSTOMER_URL = process.env.WUBOOK_CUSTOMER_URL; // URL для запроса данных клиента
const WUBOOK_API_KEY = process.env.WUBOOK_API_KEY; // API-ключ WuBook

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use((req, res, next) => {
  console.log(`📡 Входящий запрос: ${req.method} ${req.url}`);
  next();
});

app.post('/vubook-webhook', async (req, res) => {
  console.log("📥 Получен webhook от VUBOOK:");
  console.log("Заголовки:", req.headers);

  const data = req.body;

  try {
    let reservationId;
    if (typeof data.push_data === 'string') {
      const parsed = JSON.parse(data.push_data);
      reservationId = parsed.reservation;
      console.log("📦 Распарсенный push_data:", parsed);
    } else {
      return res.status(400).send("Неверный формат push_data");
    }

    console.log("📡 Запрашиваем данные бронирования у WuBook...");

    const reservationResponse = await axios.post(
      WUBOOK_API_URL,
      new URLSearchParams({ id: reservationId }).toString(),
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'x-api-key': WUBOOK_API_KEY
        }
      }
    );

    const reservationData = reservationResponse.data?.data;
    console.log("🧾 Ответ от WuBook:", reservationResponse.data);

    if (!reservationData) {
      console.warn("⚠️ Не удалось получить данные бронирования от WuBook.");
    }

    const rooms = reservationData.rooms || [];
    const checkin_date = rooms[0]?.dfrom || '';

    let phone = '';
    let guest_name = 'Гость';
    const bookerId = reservationData.booker;

    if (bookerId) {
      try {
        console.log("📞 Запрашиваем данные клиента по ID:", bookerId);
        const customerResponse = await axios.post(
          WUBOOK_CUSTOMER_URL,
          new URLSearchParams({ id: bookerId }).toString(),
          {
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded',
              'x-api-key': WUBOOK_API_KEY
            }
          }
        );
        console.log("👤 Ответ по клиенту:", customerResponse.data);

        const customerData = customerResponse.data?.data;

        phone = customerData?.contacts?.phone || '';
        const name = customerData?.main_info?.name || '';
        const surname = customerData?.main_info?.surname || '';
        guest_name = `${name} ${surname}`.trim() || 'Гость';

        if (!phone) {
          console.warn("⚠️ У клиента не указан номер телефона.");
        }
      } catch (err) {
        console.warn("⚠️ Ошибка при получении данных клиента:", err.message);
      }
    } else {
      console.warn("⚠️ Отсутствует ID клиента, не могу получить номер.");
    }

    const bookingInfo = {
      reservation_id: reservationId,
      guest_name,
      phone,
      checkin_date
    };

    console.log("📤 Отправляем данные в Botpress:", bookingInfo);

    // 🔐 Вычисляем HMAC SHA256 подпись
    const rawBody = JSON.stringify(bookingInfo);
    const signature = crypto
      .createHmac('sha256', BOTPRESS_SECRET)
      .update(rawBody)
      .digest('hex');

    // 📬 Отправляем webhook в Botpress с подписью в заголовке
    await axios.post(BOTPRESS_WEBHOOK_URL, rawBody, {
      headers: {
        'Content-Type': 'application/json',
        'x-signature': signature
      }
    });

    res.status(200).send('OK');
    
  } catch (error) {
    console.error('❌ Ошибка на сервере:', error.message);
    res.status(500).send('Ошибка сервера');
  }
});

app.listen(port, () => {
  console.log(`🚀 Webhook-сервер запущен на http://localhost:${port}`);
});
