"""SQL practice: a small shop database and query problems checked against SQLite."""
import random

SCHEMA = """
CREATE TABLE customers (id INTEGER PRIMARY KEY, name TEXT NOT NULL, city TEXT NOT NULL, signup_date TEXT NOT NULL);
CREATE TABLE products (id INTEGER PRIMARY KEY, name TEXT NOT NULL, category TEXT NOT NULL, price INTEGER NOT NULL);
CREATE TABLE orders (id INTEGER PRIMARY KEY, customer_id INTEGER NOT NULL REFERENCES customers(id), order_date TEXT NOT NULL, status TEXT NOT NULL);
CREATE TABLE order_items (order_id INTEGER NOT NULL REFERENCES orders(id), product_id INTEGER NOT NULL REFERENCES products(id), qty INTEGER NOT NULL, PRIMARY KEY (order_id, product_id));
"""


def seed_sql():
    r = random.Random(2026)
    cities = ["Алматы", "Астана", "Шымкент", "Караганда", "Актобе"]
    first = ["Айдана", "Алихан", "Дамир", "Жанна", "Ерлан", "Камила", "Нурлан", "Сауле", "Тимур", "Асель", "Арман", "Мадина", "Бекзат", "Дина", "Руслан", "Алия", "Ержан", "Зарина", "Олжас", "Томирис"]
    products = [
        ("Poedagar 615", "watches", 18990), ("Poedagar 930", "watches", 22990), ("Pablo Raez 1001", "watches", 27990),
        ("Pablo Raez Sport", "watches", 31990), ("Ремешок кожаный", "accessories", 4990), ("Ремешок стальной", "accessories", 6990),
        ("Коробка подарочная", "accessories", 1990), ("Рюкзак городской", "bags", 15990), ("Сумка через плечо", "bags", 12990),
        ("Кошелёк", "bags", 7990), ("Очки солнцезащитные", "accessories", 9990), ("Часы детские", "watches", 8990),
    ]
    lines = []
    for i, name in enumerate(first, 1):
        m, d = r.randint(1, 9), r.randint(1, 28)
        lines.append(f"INSERT INTO customers VALUES ({i}, '{name}', '{r.choice(cities)}', '2026-{m:02d}-{d:02d}');")
    for i, (n, c, p) in enumerate(products, 1):
        lines.append(f"INSERT INTO products VALUES ({i}, '{n}', '{c}', {p});")
    oid = 0
    for cid in range(1, 21):
        if cid in (7, 15, 19):          # customers without orders
            continue
        for _ in range(r.randint(1, 5)):
            oid += 1
            m, d = r.randint(1, 9), r.randint(1, 28)
            st = r.choices(["paid", "paid", "paid", "cancelled", "new"], k=1)[0]
            lines.append(f"INSERT INTO orders VALUES ({oid}, {cid}, '2026-{m:02d}-{d:02d}', '{st}');")
            for pid in r.sample(range(1, 13), r.randint(1, 3)):
                if pid == 12:
                    continue
                lines.append(f"INSERT INTO order_items VALUES ({oid}, {pid}, {r.randint(1, 3)});")
    return "\n".join(lines)


# ordered: True when the problem asks for a specific order
SQLP = [
 dict(id="sql-cheap", title="Недорогие часы", diff="easy", topic="SQL: выборка", lc="big-countries", ordered=True,
  text="Выведите названия и цены часов (категория `watches`) дешевле 25 000, от дешёвых к дорогим. Столбцы: `name`, `price`.",
  hint="WHERE с двумя условиями через AND и ORDER BY price.",
  sol="SELECT name, price FROM products WHERE category = 'watches' AND price < 25000 ORDER BY price;"),
 dict(id="sql-cities", title="Города клиентов", diff="easy", topic="SQL: выборка", lc="customers-who-never-order", ordered=True,
  text="Выведите список городов, где есть клиенты, без повторов, в алфавитном порядке. Столбец: `city`.",
  hint="DISTINCT убирает дубликаты.",
  sol="SELECT DISTINCT city FROM customers ORDER BY city;"),
 dict(id="sql-per-city", title="Клиенты по городам", diff="easy", topic="SQL: агрегации", lc="find-customer-referee", ordered=True,
  text="Для каждого города посчитайте число клиентов. Отсортируйте по убыванию числа, при равенстве — по названию города. Столбцы: `city`, `customers`.",
  hint="GROUP BY city и COUNT(*). Сортировка по двум ключам: ORDER BY customers DESC, city.",
  sol="SELECT city, COUNT(*) AS customers FROM customers GROUP BY city ORDER BY customers DESC, city;"),
 dict(id="sql-never-ordered", title="Клиенты без заказов", diff="easy", topic="SQL: соединения", lc="customers-who-never-order", ordered=False,
  text="Найдите имена клиентов, у которых нет ни одного заказа. Столбец: `name`. Порядок не важен.",
  hint="LEFT JOIN orders и условие o.id IS NULL. Или NOT EXISTS.",
  sol="SELECT c.name FROM customers c LEFT JOIN orders o ON o.customer_id = c.id WHERE o.id IS NULL;"),
 dict(id="sql-order-total", title="Сумма каждого заказа", diff="medium", topic="SQL: соединения", lc="customer-placing-the-largest-number-of-orders", ordered=True,
  text="Для каждого оплаченного заказа (`status = 'paid'`) посчитайте сумму: цена × количество по всем позициям. Выведите `order_id` и `total`, по убыванию суммы, при равенстве — по возрастанию `order_id`.",
  hint="Соедините orders, order_items и products. SUM(p.price * oi.qty), GROUP BY o.id.",
  sol="SELECT o.id AS order_id, SUM(p.price * oi.qty) AS total FROM orders o JOIN order_items oi ON oi.order_id = o.id JOIN products p ON p.id = oi.product_id WHERE o.status = 'paid' GROUP BY o.id ORDER BY total DESC, order_id;"),
 dict(id="sql-revenue-cat", title="Выручка по категориям", diff="medium", topic="SQL: агрегации", lc="sales-analysis-i", ordered=True,
  text="Посчитайте выручку по категориям товаров только по оплаченным заказам. Столбцы: `category`, `revenue`, по убыванию выручки.",
  hint="Те же три таблицы, GROUP BY p.category.",
  sol="SELECT p.category, SUM(p.price * oi.qty) AS revenue FROM orders o JOIN order_items oi ON oi.order_id = o.id JOIN products p ON p.id = oi.product_id WHERE o.status = 'paid' GROUP BY p.category ORDER BY revenue DESC;"),
 dict(id="sql-big-buyers", title="Крупные покупатели", diff="medium", topic="SQL: агрегации", lc="customers-who-bought-all-products", ordered=True,
  text="Найдите клиентов, которые потратили на оплаченные заказы больше 100 000. Столбцы: `name`, `spent`, по убыванию суммы.",
  hint="Сгруппируйте по клиенту и отфильтруйте группы через HAVING.",
  sol="SELECT c.name, SUM(p.price * oi.qty) AS spent FROM customers c JOIN orders o ON o.customer_id = c.id JOIN order_items oi ON oi.order_id = o.id JOIN products p ON p.id = oi.product_id WHERE o.status = 'paid' GROUP BY c.id HAVING spent > 100000 ORDER BY spent DESC;"),
 dict(id="sql-never-sold", title="Непроданные товары", diff="easy", topic="SQL: подзапросы", lc="sales-person", ordered=False,
  text="Найдите названия товаров, которые ни разу не попали ни в один заказ (любого статуса). Столбец: `name`. Порядок не важен.",
  hint="NOT EXISTS или NOT IN по order_items.product_id.",
  sol="SELECT name FROM products p WHERE NOT EXISTS (SELECT 1 FROM order_items oi WHERE oi.product_id = p.id);"),
 dict(id="sql-monthly", title="Выручка по месяцам", diff="medium", topic="SQL: агрегации", lc="monthly-transactions-i", ordered=True,
  text="Посчитайте выручку оплаченных заказов по месяцам. Месяц — первые 7 символов даты, например `2026-03`. Столбцы: `month`, `revenue`, по возрастанию месяца.",
  hint="substr(order_date, 1, 7) даёт год и месяц.",
  sol="SELECT substr(o.order_date, 1, 7) AS month, SUM(p.price * oi.qty) AS revenue FROM orders o JOIN order_items oi ON oi.order_id = o.id JOIN products p ON p.id = oi.product_id WHERE o.status = 'paid' GROUP BY month ORDER BY month;"),
 dict(id="sql-above-avg", title="Дороже среднего", diff="easy", topic="SQL: подзапросы", lc="the-latest-login-in-2020", ordered=True,
  text="Выведите товары, которые дороже средней цены всех товаров. Столбцы: `name`, `price`, по убыванию цены.",
  hint="Сравните цену со скалярным подзапросом (SELECT AVG(price) FROM products).",
  sol="SELECT name, price FROM products WHERE price > (SELECT AVG(price) FROM products) ORDER BY price DESC;"),
 dict(id="sql-top-in-cat", title="Самый дорогой в категории", diff="medium", topic="SQL: оконные функции", lc="department-highest-salary", ordered=True,
  text="Для каждой категории выведите самый дорогой товар. Столбцы: `category`, `name`, `price`, по алфавиту категорий. Цены внутри категории разные.",
  hint="ROW_NUMBER() OVER (PARTITION BY category ORDER BY price DESC) в CTE, затем rn = 1.",
  sol="WITH r AS (SELECT category, name, price, ROW_NUMBER() OVER (PARTITION BY category ORDER BY price DESC) AS rn FROM products) SELECT category, name, price FROM r WHERE rn = 1 ORDER BY category;"),
 dict(id="sql-second-price", title="Вторая по величине цена", diff="medium", topic="SQL: подзапросы", lc="second-highest-salary", ordered=True,
  text="Выведите вторую по величине **различную** цену среди всех товаров. Один столбец `second_price`, одна строка.",
  hint="Максимум среди цен, которые меньше максимальной. Или DISTINCT + ORDER BY + LIMIT 1 OFFSET 1.",
  sol="SELECT MAX(price) AS second_price FROM products WHERE price < (SELECT MAX(price) FROM products);"),
 dict(id="sql-first-order", title="Первый заказ клиента", diff="medium", topic="SQL: оконные функции", lc="game-play-analysis-i", ordered=True,
  text="Для каждого клиента с заказами выведите дату его первого заказа (любого статуса). Столбцы: `name`, `first_order`, по возрастанию даты, при равенстве — по имени.",
  hint="MIN(order_date) с GROUP BY клиенту.",
  sol="SELECT c.name, MIN(o.order_date) AS first_order FROM customers c JOIN orders o ON o.customer_id = c.id GROUP BY c.id ORDER BY first_order, c.name;"),
 dict(id="sql-cancel-rate", title="Доля отмен", diff="medium", topic="SQL: агрегации", lc="trips-and-users", ordered=True,
  text="Для каждого города посчитайте долю отменённых заказов в процентах, округлённую до одного знака. Учитывайте только города, где есть заказы. Столбцы: `city`, `cancel_pct`, по убыванию доли, при равенстве — по городу.",
  hint="SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END) * 100.0 / COUNT(*), затем ROUND(…, 1).",
  sol="SELECT c.city, ROUND(SUM(CASE WHEN o.status = 'cancelled' THEN 1 ELSE 0 END) * 100.0 / COUNT(*), 1) AS cancel_pct FROM customers c JOIN orders o ON o.customer_id = c.id GROUP BY c.city ORDER BY cancel_pct DESC, c.city;"),
 dict(id="sql-running", title="Нарастающий итог", diff="hard", topic="SQL: оконные функции", lc="last-person-to-fit-in-the-bus", ordered=True,
  text="Посчитайте выручку оплаченных заказов по месяцам и нарастающий итог с начала года. Столбцы: `month`, `revenue`, `running_total`, по возрастанию месяца.",
  hint="Сначала CTE с выручкой по месяцам, затем SUM(revenue) OVER (ORDER BY month).",
  sol="WITH m AS (SELECT substr(o.order_date, 1, 7) AS month, SUM(p.price * oi.qty) AS revenue FROM orders o JOIN order_items oi ON oi.order_id = o.id JOIN products p ON p.id = oi.product_id WHERE o.status = 'paid' GROUP BY month) SELECT month, revenue, SUM(revenue) OVER (ORDER BY month) AS running_total FROM m ORDER BY month;"),
 dict(id="sql-growth", title="Рост к прошлому месяцу", diff="hard", topic="SQL: оконные функции", lc="rising-temperature", ordered=True,
  text="Найдите месяцы, в которых выручка оплаченных заказов выросла по сравнению с предыдущим месяцем, где были оплаченные заказы. Столбцы: `month`, `revenue`, `prev_revenue`, по возрастанию месяца.",
  hint="LAG(revenue) OVER (ORDER BY month) во вложенном запросе, снаружи — фильтр revenue > prev_revenue.",
  sol="WITH m AS (SELECT substr(o.order_date, 1, 7) AS month, SUM(p.price * oi.qty) AS revenue FROM orders o JOIN order_items oi ON oi.order_id = o.id JOIN products p ON p.id = oi.product_id WHERE o.status = 'paid' GROUP BY month), g AS (SELECT month, revenue, LAG(revenue) OVER (ORDER BY month) AS prev_revenue FROM m) SELECT month, revenue, prev_revenue FROM g WHERE revenue > prev_revenue ORDER BY month;"),
 dict(id="sql-repeat", title="Постоянные клиенты", diff="easy", topic="SQL: агрегации", lc="classes-more-than-5-students", ordered=True,
  text="Найдите клиентов, у которых не меньше трёх заказов любого статуса. Столбцы: `name`, `orders`, по убыванию числа заказов, при равенстве — по имени.",
  hint="GROUP BY клиенту и HAVING COUNT(*) >= 3.",
  sol="SELECT c.name, COUNT(*) AS orders FROM customers c JOIN orders o ON o.customer_id = c.id GROUP BY c.id HAVING COUNT(*) >= 3 ORDER BY orders DESC, c.name;"),
 dict(id="sql-bestseller", title="Хит продаж", diff="medium", topic="SQL: соединения", lc="product-sales-analysis-iii", ordered=True,
  text="Выведите три товара с наибольшим количеством проданных штук по оплаченным заказам. Столбцы: `name`, `sold`, по убыванию, при равенстве — по названию.",
  hint="SUM(qty) по товару, ORDER BY и LIMIT 3.",
  sol="SELECT p.name, SUM(oi.qty) AS sold FROM orders o JOIN order_items oi ON oi.order_id = o.id JOIN products p ON p.id = oi.product_id WHERE o.status = 'paid' GROUP BY p.id ORDER BY sold DESC, p.name LIMIT 3;"),
]
