# Inlogik Dashboard

Веб-интерфейс для управления автоматизацией запросов ставок логистики.
Next.js 14 + Supabase + TailwindCSS.

## Что показывает

- **Активные запросы** — все запросы за последние сутки, прогресс по каждому (отправлено / ответили / ставок собрано), статус
- **Карточка запроса** — детальная инфа: маршрут, груз, ставки бок-о-бок для сравнения, лог рассылки по каждому подрядчику
- **Подрядчики** — лидерборд: response rate, кто чаще отвечает, кто молчит, у кого ставки выбраны как лучшие
- **Метрики системы** — pipeline-воронка, ошибки за сутки, audit log событий

## Запуск локально

```bash
# 1. Установить зависимости
npm install

# 2. Скопировать env-файл
cp .env.local.example .env.local

# 3. Заполнить .env.local — два ключа из Supabase:
#    NEXT_PUBLIC_SUPABASE_URL
#    SUPABASE_SERVICE_ROLE_KEY
#    https://supabase.com/dashboard/project/xpptjyqrotriybdsbswd/settings/api

# 4. Запустить дев-сервер
npm run dev

# Открыть http://localhost:3000
```

## Деплой на Vercel

```bash
# 1. Залить на GitHub
git init
git add .
git commit -m "init"
git remote add origin <your-repo-url>
git push -u origin main

# 2. Импортировать в Vercel
#    vercel.com → New Project → выбрать репозиторий
#    В Settings → Environment Variables добавить:
#      NEXT_PUBLIC_SUPABASE_URL
#      SUPABASE_SERVICE_ROLE_KEY
#      DASHBOARD_USER (опционально — для Basic Auth)
#      DASHBOARD_PASS (опционально)
```

Дальше Vercel сам всё пересоберёт при каждом git push.

## Защита паролем

Дашборд защищён HTTP Basic Auth через `middleware.ts`:
- Если в env заданы `DASHBOARD_USER` и `DASHBOARD_PASS` — браузер запросит логин/пароль
- Если переменные пустые — доступ свободный

Для team-доступа можно вместо этого использовать **Vercel Password Protection** (доступно в платных планах) или **Vercel Teams** с авторизацией через email.

## Структура

```
app/
├── layout.tsx             — общий лейаут с сайдбаром
├── page.tsx               — / список активных запросов
├── requests/[code]/       — /requests/004415-1 детальная страница
├── contractors/page.tsx   — /contractors лидерборд
└── system/page.tsx        — /system метрики и логи

components/
├── Logo.tsx               — SVG лого Inlogik
├── Sidebar.tsx            — навигация
├── StatCard.tsx           — карточка метрики
└── RequestCard.tsx        — карточка запроса

lib/
├── supabase.ts            — клиент БД (server-side, service role)
├── queries.ts             — все запросы к БД
└── utils.ts               — форматтеры, бейджи статусов

middleware.ts              — Basic Auth (опционально)
```

## SQL-функции в Supabase

Дашборд использует 4 RPC-функции (уже созданы в БД):
- `dashboard_active_requests()` — список запросов с агрегатами
- `dashboard_contractor_stats()` — статистика подрядчиков
- `dashboard_system_metrics()` — счётчики по системе
- `dashboard_funnel()` — pipeline за 7 дней

Если меняешь схему БД — обновляй эти функции (миграция `dashboard_rpc_functions` в Supabase).

## Цветовая схема

- **Inlogik teal** `#14B5A6` — основной акцент с логотипа
- **Зелёный** `#16A34A` — положительные статусы (отвечают, выбрано)
- **Янтарный** `#F59E0B` — предупреждения (молчат, мало ответов)
- **Красный** `#DC2626` — ошибки

Все цвета в `tailwind.config.ts` под `colors.inlogik.*`.

## Что добавить позже

- [ ] Авторизация через Supabase Auth (вместо Basic Auth)
- [ ] Действия из UI: выбрать ставку как лучшую, заблокировать подрядчика
- [ ] Realtime-обновления через Supabase channels
- [ ] Фильтры на странице запросов (по статусу/транспорту/логисту)
- [ ] Графики динамики ответов по дням (recharts)
- [ ] Поиск по запросам и подрядчикам
- [ ] Экспорт в CSV/Excel

## Контакты

Inlogik LLC · mail@inlogik.ru
