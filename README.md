# AVALAND

Карта-игра для изучения программирования: 15 стран-языков, 120 уроков, 664 задания, 88 задач с проверкой на тестах, компилятор на 14 языках, связь с LeetCode, финальные экзамены, сертификаты, повторение раз в 14 дней, аккаунты с облачным сохранением и уведомления.

- Играть: https://alihansagat.github.io/avaland/play/ (на iPhone: Safari → «Поделиться» → «На экран „Домой“»)
- Компилятор: Python (Pyodide), JavaScript, TypeScript (sucrase) и SQL (SQLite) работают на устройстве; C++, C#, Java, Go, Rust, Swift, Dart, Ruby — через Compiler Explorer (godbolt.org), Kotlin — через Kotlin Playground, PHP — через Wandbox. Редактор — CodeMirror 6.
- Аккаунты и облако: Supabase (почта и пароль, GitHub; Google и Apple — позже). Схема базы: `backend/schema.sql`.
- Пуш-уведомления на сайте: Web Push (VAPID), рассылка раз в час из GitHub Actions (`.github/workflows/push.yml`, `backend/push/send.mjs`).

## Структура

```
avaland/
├── content/            уроки и экзамены в текстовом формате, по файлу на язык
├── src/                код приложения: app.js, practice-ui.js, playground.js (компилятор), cloud.js (аккаунт, облако, пуш), sw.js, py-worker.js, style.css
│   └── vendor/         собранные библиотеки: редактор CodeMirror, клиент Supabase, TypeScript → JS
├── vendor-src/         исходники для src/vendor (npm i && npx esbuild …, см. ниже)
├── backend/            schema.sql для Supabase и рассыльщик пуш-уведомлений
├── tools/              проверки: verify_outputs.py (ответы «Что выведет код?» на настоящих компиляторах), verify_wrap.py (примеры уроков), ui_test.py
├── practice/           задачи практики с эталонными решениями на Python и JavaScript
├── fonts/              шрифты, вшитые в приложение (работает офлайн)
├── build_content.py    проверяет уроки и собирает src/content.js
├── build.py            собирает app/www (для iOS) и dist/avaland.html (веб-версия)
├── app/                проект Capacitor
│   ├── ios/            готовый Xcode-проект (Swift Package Manager, CocoaPods не нужен)
│   ├── assets/         исходники иконки и заставки
│   └── capacitor.config.json
├── docs/               сайт на GitHub Pages: лендинг, политика, поддержка и веб-версия в docs/play
├── store/
│   ├── LISTING.md      тексты и ответы для App Store Connect
│   ├── screenshots/    скриншоты iPhone 6,9" и iPad 13"

└── LAUNCH.md           план на неделю и продвижение
```

## Что нужно на Mac

- Xcode 16 или новее (из App Store)
- Node.js 20+ (`node -v`)
- python3 (есть в macOS вместе с Xcode Command Line Tools)
- Аккаунт Apple Developer Program ($99 в год): https://developer.apple.com/programs/enroll/

## Первый запуск на iPhone

```bash
cd ~/development/projects/avaland/app
npm install
npm run ios          # соберёт www, скопирует в iOS-проект и откроет Xcode
```

В Xcode:

1. Слева выберите проект **App** → цель **App** → вкладка **Signing & Capabilities**.
2. **Team** — выберите свой аккаунт разработчика. Включите **Automatically manage signing**.
3. Если Xcode пишет, что Bundle Identifier занят, замените `kz.avaland.app` на свой (например `kz.alikhan.avaland`) и то же самое впишите в `app/capacitor.config.json`.
4. Подключите iPhone кабелем, выберите его вверху и нажмите ▶. При первом запуске на телефоне: Настройки → Основные → VPN и управление устройством → доверять разработчику.

Проверьте на телефоне: знакомство, урок, испытание, уведомление (поставьте время напоминания на ближайший час), «Поделиться картой», сертификат.

## Публикация в App Store

1. В Xcode вверху выберите **Any iOS Device (arm64)**.
2. **Product → Archive**. Когда откроется Organizer — **Distribute App → App Store Connect → Upload**.
3. На https://appstoreconnect.apple.com → **Apps → +** → New App: платформа iOS, имя, язык Русский, Bundle ID, SKU (значения в `store/LISTING.md`).
4. Через 10–30 минут сборка появится во вкладке **TestFlight**. Установите её через приложение TestFlight и проверьте ещё раз.
5. Во вкладке приложения заполните тексты, скриншоты (`store/screenshots`), App Privacy («данные не собираются»), возрастной рейтинг, ссылки на политику и поддержку.
6. Выберите сборку → **Add for Review → Submit**. Обычно проверка занимает 1–2 дня.

## Сайт для политики конфиденциальности

Apple требует ссылку на политику конфиденциальности и поддержку.

Сайт лежит в папке `docs`: лендинг, политика конфиденциальности, поддержка и веб-версия игры (`docs/play`).

1. В репозитории на GitHub откройте **Settings → Pages**.
2. Source: **Deploy from a branch**, Branch: **main**, папка **/docs** → Save.
3. Через минуту сайт будет по адресу `https://<логин>.github.io/avaland/`, игра — `https://<логин>.github.io/avaland/play/`.

После `python3 build.py` обновите веб-версию: `python3 build.py` обновляет её сам.

## Как менять уроки

Уроки лежат в `content/*.txt` в простом формате:

~~~
@lesson Название урока
Абзац теории. `код в тексте` выделяется.
```code
пример кода
```
! Совет для блока «Запомните»
? mc Вопрос с вариантами
- неверный вариант
+ верный вариант
= объяснение
? out Что выведет код?
```code
print(1 + 1)
```
> 2
= объяснение
? fill Впишите пропущенное
> ответ
= объяснение
~~~

После правок:

```bash
cd ~/development/projects/avaland
python3 build.py        # проверит уроки и соберёт всё заново
cd app && npx cap sync ios
```

Скрипт остановится и покажет ошибку, если в уроке нет кода, нет объяснения или меньше 4 вопросов.

## Пещеры-библиотеки и пути профессий

После финального экзамена страны открываются пещеры — библиотеки и фреймворки по дорожной карте профессии (16 путей, 50 пещер). Пещеры лежат в `content/caves/*.txt`, в том же формате, что и уроки, с другим заголовком:

~~~
@lang id=pd name=pandas land=Пещера pandas color=#150458 cave=py track=ml step=2
@about Что изучается в пещере.
@why Почему пещера стоит на этом шаге дорожной карты.
~~~

`cave` — язык-родитель (по нему подсветка и компилятор), `track` и `step` — путь и номер шага. Пути описаны в `content/tracks.json`: родитель, название, роль («Junior ML Engineer»), порядок пещер, проект и вакансии. Пещера открывается после экзамена предыдущей, а после последней выдаётся сертификат пути. В пещере минимум 4 урока по 4 вопроса и экзамен из 8 вопросов. Примеры, которые нельзя запустить отдельно (фреймворки), перечислены в `content/norun.list`.

В веб-версии Python-примеры с NumPy, pandas, Matplotlib и scikit-learn запускаются в Pyodide: библиотеки загружаются с CDN Pyodide при первом запуске, графики Matplotlib показываются картинками. PyTorch в браузере не работает — эти уроки помечены как «запустите у себя».

## Монеты, Лавка и платные пути

- Монеты начисляются за учёбу (`addCoins` в `src/shop.js`, правила — `COIN_RULES`). Их тратят в Лавке: заморозка серии, подсказка 50/50, свиток ответа, пересдача без ожидания, двойные монеты, купоны −25% и −50% на пути профессий. За деньги монеты не продаются.
- Все 15 языков бесплатны. В каждом пути профессий первая пещера бесплатна, остальные — после покупки пути (цены — `price` в `content/tracks.json` и таблица `shop_items` в Supabase; они должны совпадать, списывает сервер).
- Оплата — Kaspi Pay через сервис ApiPay.kz (у Kaspi нет публичного API). Сервер: `backend/shop.sql` (таблицы) и `backend/functions/kaspi/index.ts` (Edge Function: счёт на номер Kaspi, вебхук с проверкой подписи, выдача доступа). Тесты функции: `cd backend/functions/kaspi/test && deno run --allow-env --allow-read --import-map=import_map.json test.ts`.

### Подключение оплаты (один раз)
1. ИП (eGov) и Kaspi Pay для бизнеса в приложении Kaspi.kz.
2. Аккаунт на apipay.kz → подключить кассира Kaspi → взять API-ключ и секрет вебхука.
3. Supabase → SQL Editor → выполнить `backend/shop.sql`.
4. Supabase → Edge Functions → новая функция `kaspi` с кодом из `backend/functions/kaspi/index.ts`, проверку JWT выключить (или `supabase functions deploy kaspi --no-verify-jwt`).
5. Supabase → Edge Functions → Secrets: `APIPAY_API_KEY`, `APIPAY_WEBHOOK_SECRET` (вписывает владелец сам).
6. В кабинете ApiPay адрес вебхука: `https://wetwpoypjrenlibezsxy.supabase.co/functions/v1/kaspi`.
7. Проверка в песочнице ApiPay: временно секрет `APIPAY_ALLOW_SANDBOX=1`, после проверки удалить.

Выручка по дням: `select * from revenue_daily;` в SQL Editor.

## Как добавить задачу практики

Задачи лежат в `practice/p*.py`. Каждая — вызов `prob(...)` с условием, эталонным решением на Python (`py`) и на JavaScript (`js`) и генератором случайных входных данных (`gen`). Скрипт `practice/build_practice.py`:

1. прогоняет эталон на Python на примерах и на 14 случайных входах и записывает ожидаемые ответы;
2. запускает эталон на JavaScript на тех же тестах и останавливает сборку, если ответы расходятся.

Так каждая задача проверена двумя независимыми решениями. Условия написаны своими словами; с LeetCode берётся только ссылка на похожую задачу (`lc` — её адрес). Тексты задач LeetCode копировать нельзя: они защищены авторским правом.

## Связь с LeetCode

На вкладке «Практика» пользователь вводит никнейм, приложение через нативный HTTP-запрос (CapacitorHttp) обращается к публичному GraphQL-интерфейсу leetcode.com и получает число решённых задач и 20 последних принятых решений. Совпавшие по адресу задачи засчитываются в AVALAND. Это неофициальный интерфейс: LeetCode может его изменить, тогда синхронизация покажет ошибку, а остальное приложение продолжит работать. В браузерной версии синхронизация не работает — браузер блокирует такие запросы.

## После выхода в App Store

- Впишите id приложения в `APP_STORE_ID` в начале `src/app.js` — в профиле появится кнопка «Оценить приложение».
- Замените ссылку `href="#"` на кнопке «Играть в браузере» в `docs/index.html` добавьте рядом ссылку на страницу в App Store.
- Для новой версии увеличьте **Version** (1.0.1) или **Build** (2) в Xcode → General, затем снова Archive.

## Веб-версия

`dist/avaland.html` — та же игра одним файлом, с «машиной времени» в профиле для проверки повторений и осады. Её удобно показывать друзьям до релиза.


## Проверки перед выпуском

```bash
python3 tools/verify_outputs.py      # каждое задание «Что выведет код?» запускается настоящим компилятором
python3 tools/verify_wrap.py         # примеры из уроков собираются и запускаются; --write обновляет content/norun.list
python3 build.py && python3 tools/ui_test.py   # интерфейс в headless Chromium
```

Нужны python3, node, g++, javac, go, rustc, php, ruby, bun, dotnet 8 и kotlinc. Dart и Swift проверяются на godbolt.org.

## Библиотеки в src/vendor

```bash
cd vendor-src && npm i
npx esbuild editor.js   --bundle --minify --format=iife --target=es2019 --outfile=../src/vendor/editor.js
npx esbuild supabase.js --bundle --minify --format=iife --target=es2019 --outfile=../src/vendor/supabase.js
npx esbuild ts.js       --bundle --minify --format=iife --target=es2019 --outfile=../src/vendor/ts.js
```

## Аккаунты и уведомления

- Проект Supabase: `wetwpoypjrenlibezsxy` (Франкфурт). Публичный ключ anon — в `src/cloud.js`, он безопасен благодаря политикам доступа (RLS) из `backend/schema.sql`.
- Вход через GitHub: OAuth-приложение «AVALAND» в настройках GitHub, Client ID и Client Secret вписаны в Supabase → Authentication → Sign In / Providers → GitHub.
- Вход через Google: создайте OAuth Client ID в Google Cloud Console (тип Web, redirect `https://wetwpoypjrenlibezsxy.supabase.co/auth/v1/callback`), впишите в Supabase → Providers → Google и поставьте `google: true` в `AUTH_PROVIDERS` в `src/cloud.js`.
- Вход через Apple: нужен Apple Developer Program; после этого Services ID и ключ Sign in with Apple вписываются в Supabase так же.
- Пуш: секреты репозитория `PUSH_SECRET`, `VAPID_PRIVATE_KEY` и переменные `SUPABASE_ANON_KEY`, `VAPID_PUBLIC_KEY` (Settings → Secrets and variables → Actions). Рассылка запускается каждый час и пишет не больше одного напоминания в день каждому подписчику в выбранный им час.
- Подтверждение почты в Supabase выключено: встроенная почта Supabase отправляет письма только участникам проекта. Чтобы включить подтверждение и сброс пароля, подключите свой SMTP (например, Resend) в Authentication → Emails.
