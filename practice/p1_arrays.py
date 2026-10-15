from common import P, prob
import random

# ---------- массивы и хэш-таблицы ----------
prob(id="pair-sum", title="Пара с нужной суммой", diff="easy", topic="Массивы и хэш-таблицы", lc="two-sum",
 fn="pair_sum", params=["nums", "target"],
 text="Дан массив целых чисел `nums` и число `target`. Найдите два **разных** индекса `i < j`, такие что `nums[i] + nums[j] == target`, и верните `[i, j]`. Гарантируется, что подходящая пара ровно одна.",
 limits="2 ≤ длина ≤ 10⁴, значения от −10⁹ до 10⁹",
 hint="Для каждого числа x нужно быстро узнать, встречалось ли раньше число target − x. Храните увиденные числа и их индексы в словаре.",
 complexity="O(n) по времени и O(n) по памяти с хэш-таблицей. Перебор всех пар — O(n²).",
 examples=[([[2, 7, 11, 15], 9], "nums[0] + nums[1] = 2 + 7 = 9"), ([[3, 2, 4], 6], None)],
 edge=[[[3, 3], 6], [[-1, -2, -3, -4, -5], -8], [[0, 4, 3, 0], 0]],
 gen=lambda r: (lambda n: (lambda nums, i, j: [nums, nums[i] + nums[j]])(*_unique_pair(r, n)))(r.randint(2, 40)),
 py='''def pair_sum(nums, target):
    seen = {}
    for i, x in enumerate(nums):
        if target - x in seen:
            return [seen[target - x], i]
        seen[x] = i
''',
 js='''function pairSum(nums, target) {
  const seen = new Map();
  for (let i = 0; i < nums.length; i++) {
    if (seen.has(target - nums[i])) return [seen.get(target - nums[i]), i];
    seen.set(nums[i], i);
  }
}''')


def _unique_pair(r, n):
    # numbers spaced so that only one pair sums to target
    while True:
        nums = r.sample(range(-500, 500), n)
        i, j = sorted(r.sample(range(n), 2))
        t = nums[i] + nums[j]
        cnt = sum(1 for a in range(n) for b in range(a + 1, n) if nums[a] + nums[b] == t)
        if cnt == 1:
            return nums, i, j


prob(id="has-duplicate", title="Есть ли повтор", diff="easy", topic="Массивы и хэш-таблицы", lc="contains-duplicate",
 fn="has_duplicate", params=["nums"],
 text="Верните `true`, если хотя бы одно число встречается в массиве `nums` больше одного раза, иначе `false`.",
 limits="1 ≤ длина ≤ 10⁵",
 hint="Множество хранит уникальные значения. Если очередное число уже в множестве — повтор найден.",
 complexity="O(n) с множеством, O(n log n) с сортировкой.",
 examples=[([[1, 2, 3, 1]], None), ([[1, 2, 3, 4]], None)],
 edge=[[[7]], [[0, 0]], [[-1, 1, -1]]],
 gen=lambda r: [r.sample(range(1000), r.randint(1, 30))] if r.random() < .5 else [[r.randint(0, 20) for _ in range(r.randint(2, 30))]],
 py='''def has_duplicate(nums):
    return len(set(nums)) != len(nums)
''',
 js='''function hasDuplicate(nums) {
  return new Set(nums).size !== nums.length;
}''')

prob(id="anagram", title="Анаграммы", diff="easy", topic="Массивы и хэш-таблицы", lc="valid-anagram",
 fn="is_anagram", params=["s", "t"],
 text="Строка `t` — анаграмма строки `s`, если состоит из тех же букв в том же количестве, но, возможно, в другом порядке. Верните `true`, если `t` — анаграмма `s`.",
 limits="Строки из строчных латинских букв, длина до 5·10⁴",
 hint="Посчитайте, сколько раз встречается каждая буква в обеих строках, и сравните счётчики.",
 complexity="O(n) по времени, O(1) по памяти (26 букв).",
 examples=[(["listen", "silent"], None), (["rat", "car"], None)],
 edge=[["a", "a"], ["ab", "a"], ["aacc", "ccac"]],
 gen=lambda r: (lambda s: [s, "".join(r.sample(s, len(s))) if r.random() < .6 else "".join(r.choice("abc") for _ in s)])("".join(r.choice("abcd") for _ in range(r.randint(1, 12)))),
 py='''def is_anagram(s, t):
    from collections import Counter
    return Counter(s) == Counter(t)
''',
 js='''function isAnagram(s, t) {
  if (s.length !== t.length) return false;
  const c = {};
  for (const ch of s) c[ch] = (c[ch] || 0) + 1;
  for (const ch of t) { if (!c[ch]) return false; c[ch]--; }
  return true;
}''')

prob(id="group-anagrams", title="Группы анаграмм", diff="medium", topic="Массивы и хэш-таблицы", lc="group-anagrams",
 fn="group_anagrams", params=["words"], compare="groups",
 text="Сгруппируйте слова из массива `words` так, чтобы в каждой группе были анаграммы друг друга. Верните список групп. Порядок групп и слов внутри группы не важен.",
 limits="До 10⁴ слов, каждое до 100 строчных букв",
 hint="У всех анаграмм одинаковый «ключ» — например, отсортированные буквы слова. Используйте словарь ключ → список слов.",
 complexity="O(n · k log k), где k — длина слова. С подсчётом букв вместо сортировки — O(n · k).",
 examples=[([["eat", "tea", "tan", "ate", "nat", "bat"]], None), ([["a"]], None)],
 edge=[[[""]], [["ab", "ba", "ab"]]],
 gen=lambda r: [["".join(r.sample(w, len(w))) for w in r.choices(["code", "deco", "map", "pam", "go", "og", "rust", "x"], k=r.randint(1, 12))]],
 py='''def group_anagrams(words):
    groups = {}
    for w in words:
        groups.setdefault("".join(sorted(w)), []).append(w)
    return list(groups.values())
''',
 js='''function groupAnagrams(words) {
  const g = new Map();
  for (const w of words) {
    const k = [...w].sort().join("");
    if (!g.has(k)) g.set(k, []);
    g.get(k).push(w);
  }
  return [...g.values()];
}''')

prob(id="top-k", title="Самые частые числа", diff="medium", topic="Массивы и хэш-таблицы", lc="top-k-frequent-elements",
 fn="top_k_frequent", params=["nums", "k"], compare="unordered",
 text="Верните `k` чисел, которые встречаются в `nums` чаще всего. Порядок в ответе не важен. Гарантируется, что ответ однозначный.",
 limits="1 ≤ длина ≤ 10⁵, 1 ≤ k ≤ число различных значений",
 hint="Сначала посчитайте частоты. Затем можно отсортировать по частоте или разложить числа по «корзинам» с индексом = частота.",
 complexity="O(n log n) с сортировкой, O(n) с корзинами.",
 examples=[([[1, 1, 1, 2, 2, 3], 2], None), ([[4], 1], None)],
 edge=[[[5, 5, 6], 1], [[-1, -1, 2, 2, 2, 3], 2]],
 gen=lambda r: _topk(r),
 py='''def top_k_frequent(nums, k):
    from collections import Counter
    return [x for x, _ in Counter(nums).most_common(k)]
''',
 js='''function topKFrequent(nums, k) {
  const c = new Map();
  for (const x of nums) c.set(x, (c.get(x) || 0) + 1);
  return [...c.entries()].sort((a, b) => b[1] - a[1]).slice(0, k).map(e => e[0]);
}''')


def _topk(r):
    vals = r.sample(range(-20, 50), r.randint(2, 7))
    freqs = r.sample(range(1, 12), len(vals))
    nums = [v for v, f in zip(vals, freqs) for _ in range(f)]
    r.shuffle(nums)
    return [nums, r.randint(1, len(vals))]


prob(id="product-except-self", title="Произведение без себя", diff="medium", topic="Массивы и хэш-таблицы", lc="product-of-array-except-self",
 fn="product_except_self", params=["nums"],
 text="Верните массив `answer`, где `answer[i]` равно произведению всех элементов `nums`, кроме `nums[i]`. Деление использовать нельзя.",
 limits="2 ≤ длина ≤ 10⁵, произведение помещается в 32-битное число",
 hint="answer[i] = (произведение всех слева от i) × (произведение всех справа от i). Посчитайте префиксы одним проходом слева, суффиксы — справа.",
 complexity="O(n) по времени, O(1) дополнительной памяти, если считать суффиксы прямо в ответе.",
 examples=[([[1, 2, 3, 4]], None), ([[-1, 1, 0, -3, 3]], None)],
 edge=[[[0, 0]], [[2, 3]]],
 gen=lambda r: [[r.randint(-4, 4) for _ in range(r.randint(2, 10))]],
 py='''def product_except_self(nums):
    n = len(nums)
    res = [1] * n
    left = 1
    for i in range(n):
        res[i] = left
        left *= nums[i]
    right = 1
    for i in range(n - 1, -1, -1):
        res[i] *= right
        right *= nums[i]
    return res
''',
 js='''function productExceptSelf(nums) {
  const n = nums.length, res = new Array(n).fill(1);
  let left = 1;
  for (let i = 0; i < n; i++) { res[i] = left; left *= nums[i]; }
  let right = 1;
  for (let i = n - 1; i >= 0; i--) { res[i] *= right; right *= nums[i]; }
  return res.map(x => x === 0 ? 0 : x);
}''')

prob(id="longest-run", title="Самая длинная цепочка чисел", diff="medium", topic="Массивы и хэш-таблицы", lc="longest-consecutive-sequence",
 fn="longest_consecutive", params=["nums"],
 text="Дан неотсортированный массив `nums`. Найдите длину самой длинной последовательности подряд идущих целых чисел (например, 4, 5, 6, 7), элементы которой есть в массиве. Порядок в массиве не важен.",
 limits="0 ≤ длина ≤ 10⁵",
 hint="Положите числа в множество. Начинайте отсчёт только с тех x, для которых x − 1 нет в множестве — это начала цепочек.",
 complexity="O(n): каждое число просматривается не больше двух раз.",
 examples=[([[100, 4, 200, 1, 3, 2]], "Цепочка 1, 2, 3, 4"), ([[0, 3, 7, 2, 5, 8, 4, 6, 0, 1]], None)],
 edge=[[[]], [[5]], [[1, 2, 0, 1]]],
 gen=lambda r: [[r.randint(-15, 15) for _ in range(r.randint(0, 25))]],
 py='''def longest_consecutive(nums):
    s = set(nums)
    best = 0
    for x in s:
        if x - 1 not in s:
            y = x
            while y + 1 in s:
                y += 1
            best = max(best, y - x + 1)
    return best
''',
 js='''function longestConsecutive(nums) {
  const s = new Set(nums);
  let best = 0;
  for (const x of s) {
    if (!s.has(x - 1)) {
      let y = x;
      while (s.has(y + 1)) y++;
      best = Math.max(best, y - x + 1);
    }
  }
  return best;
}''')

prob(id="majority", title="Большинство", diff="easy", topic="Массивы и хэш-таблицы", lc="majority-element",
 fn="majority", params=["nums"],
 text="В массиве `nums` есть число, которое встречается **больше половины** раз. Найдите его.",
 limits="1 ≤ длина ≤ 5·10⁴",
 hint="Алгоритм голосования Бойера — Мура: держите кандидата и счётчик. Совпало — счётчик +1, не совпало — −1, при нуле меняйте кандидата.",
 complexity="O(n) по времени и O(1) по памяти.",
 examples=[([[3, 2, 3]], None), ([[2, 2, 1, 1, 1, 2, 2]], None)],
 edge=[[[9]], [[1, 1, 2]]],
 gen=lambda r: _majority(r),
 py='''def majority(nums):
    cand, count = None, 0
    for x in nums:
        if count == 0:
            cand = x
        count += 1 if x == cand else -1
    return cand
''',
 js='''function majority(nums) {
  let cand = null, count = 0;
  for (const x of nums) {
    if (count === 0) cand = x;
    count += x === cand ? 1 : -1;
  }
  return cand;
}''')


def _majority(r):
    n = r.randint(1, 25)
    m = r.randint(-9, 9)
    k = n // 2 + 1
    nums = [m] * k + [r.choice([x for x in range(-9, 10) if x != m]) for _ in range(n - k)]
    r.shuffle(nums)
    return [nums]


prob(id="zeros-to-end", title="Нули в конец", diff="easy", topic="Два указателя", lc="move-zeroes",
 fn="move_zeroes", params=["nums"],
 text="Переставьте все нули массива `nums` в конец, сохранив порядок остальных элементов. Верните получившийся массив.",
 limits="1 ≤ длина ≤ 10⁴",
 hint="Указатель write показывает, куда положить следующий ненулевой элемент. После прохода заполните остаток нулями.",
 complexity="O(n) по времени, O(1) по памяти, если менять массив на месте.",
 examples=[([[0, 1, 0, 3, 12]], None), ([[0]], None)],
 edge=[[[1, 2, 3]], [[0, 0, 1]]],
 gen=lambda r: [[r.choice([0, 0, r.randint(-9, 9)]) for _ in range(r.randint(1, 15))]],
 py='''def move_zeroes(nums):
    w = 0
    for x in nums:
        if x != 0:
            nums[w] = x
            w += 1
    for i in range(w, len(nums)):
        nums[i] = 0
    return nums
''',
 js='''function moveZeroes(nums) {
  let w = 0;
  for (const x of nums) if (x !== 0) nums[w++] = x;
  for (let i = w; i < nums.length; i++) nums[i] = 0;
  return nums;
}''')

prob(id="stock-profit", title="Лучший момент для сделки", diff="easy", topic="Массивы и хэш-таблицы", lc="best-time-to-buy-and-sell-stock",
 fn="max_profit", params=["prices"],
 text="`prices[i]` — цена акции в день `i`. Можно один раз купить и позже один раз продать. Верните максимальную прибыль или `0`, если заработать нельзя.",
 limits="1 ≤ длина ≤ 10⁵",
 hint="Идите по дням и помните минимальную цену до текущего дня. Прибыль сегодня = цена − минимум.",
 complexity="O(n) по времени, O(1) по памяти.",
 examples=[([[7, 1, 5, 3, 6, 4]], "Купить по 1, продать по 6"), ([[7, 6, 4, 3, 1]], "Цены только падают")],
 edge=[[[5]], [[2, 4, 1]]],
 gen=lambda r: [[r.randint(0, 50) for _ in range(r.randint(1, 20))]],
 py='''def max_profit(prices):
    low, best = float("inf"), 0
    for p in prices:
        low = min(low, p)
        best = max(best, p - low)
    return best
''',
 js='''function maxProfit(prices) {
  let low = Infinity, best = 0;
  for (const p of prices) { low = Math.min(low, p); best = Math.max(best, p - low); }
  return best;
}''')

prob(id="rotate-image", title="Поворот матрицы", diff="medium", topic="Матрицы", lc="rotate-image",
 fn="rotate", params=["matrix"],
 text="Поверните квадратную матрицу `matrix` на 90° по часовой стрелке и верните её.",
 limits="1 ≤ n ≤ 20",
 hint="Поворот = транспонирование (строки становятся столбцами) + разворот каждой строки.",
 complexity="O(n²) по времени, O(1) дополнительной памяти при повороте на месте.",
 examples=[([[[1, 2, 3], [4, 5, 6], [7, 8, 9]]], None)],
 edge=[[[[1]]], [[[1, 2], [3, 4]]]],
 gen=lambda r: (lambda n: [[[r.randint(0, 9) for _ in range(n)] for _ in range(n)]])(r.randint(1, 5)),
 py='''def rotate(matrix):
    n = len(matrix)
    for i in range(n):
        for j in range(i + 1, n):
            matrix[i][j], matrix[j][i] = matrix[j][i], matrix[i][j]
    for row in matrix:
        row.reverse()
    return matrix
''',
 js='''function rotate(matrix) {
  const n = matrix.length;
  for (let i = 0; i < n; i++)
    for (let j = i + 1; j < n; j++)
      [matrix[i][j], matrix[j][i]] = [matrix[j][i], matrix[i][j]];
  for (const row of matrix) row.reverse();
  return matrix;
}''')

prob(id="spiral", title="Обход спиралью", diff="medium", topic="Матрицы", lc="spiral-matrix",
 fn="spiral_order", params=["matrix"],
 text="Верните все элементы матрицы `matrix` в порядке обхода по спирали: по верхней строке вправо, затем вниз, влево, вверх и так далее к центру.",
 limits="1 ≤ строк, столбцов ≤ 10",
 hint="Держите четыре границы: top, bottom, left, right. После каждого прохода сдвигайте соответствующую границу внутрь.",
 complexity="O(m · n).",
 examples=[([[[1, 2, 3], [4, 5, 6], [7, 8, 9]]], None), ([[[1, 2, 3, 4], [5, 6, 7, 8], [9, 10, 11, 12]]], None)],
 edge=[[[[1]]], [[[1], [2], [3]]], [[[1, 2, 3]]]],
 gen=lambda r: (lambda m, n: [[[r.randint(0, 20) for _ in range(n)] for _ in range(m)]])(r.randint(1, 5), r.randint(1, 5)),
 py='''def spiral_order(matrix):
    res = []
    top, bottom, left, right = 0, len(matrix) - 1, 0, len(matrix[0]) - 1
    while top <= bottom and left <= right:
        for j in range(left, right + 1):
            res.append(matrix[top][j])
        top += 1
        for i in range(top, bottom + 1):
            res.append(matrix[i][right])
        right -= 1
        if top <= bottom:
            for j in range(right, left - 1, -1):
                res.append(matrix[bottom][j])
            bottom -= 1
        if left <= right:
            for i in range(bottom, top - 1, -1):
                res.append(matrix[i][left])
            left += 1
    return res
''',
 js='''function spiralOrder(matrix) {
  const res = [];
  let top = 0, bottom = matrix.length - 1, left = 0, right = matrix[0].length - 1;
  while (top <= bottom && left <= right) {
    for (let j = left; j <= right; j++) res.push(matrix[top][j]);
    top++;
    for (let i = top; i <= bottom; i++) res.push(matrix[i][right]);
    right--;
    if (top <= bottom) { for (let j = right; j >= left; j--) res.push(matrix[bottom][j]); bottom--; }
    if (left <= right) { for (let i = bottom; i >= top; i--) res.push(matrix[i][left]); left++; }
  }
  return res;
}''')

prob(id="zero-matrix", title="Обнуление строк и столбцов", diff="medium", topic="Матрицы", lc="set-matrix-zeroes",
 fn="set_zeroes", params=["matrix"],
 text="Если элемент матрицы равен `0`, обнулите всю его строку и весь столбец. Верните изменённую матрицу. Обнуляются только строки и столбцы исходных нулей.",
 limits="1 ≤ строк, столбцов ≤ 200",
 hint="Сначала запомните, какие строки и столбцы содержат ноль, и только потом обнуляйте — иначе новые нули «заразят» лишнее.",
 complexity="O(m · n) по времени, O(m + n) по памяти (можно O(1), используя первую строку и столбец как метки).",
 examples=[([[[1, 1, 1], [1, 0, 1], [1, 1, 1]]], None), ([[[0, 1, 2, 0], [3, 4, 5, 2], [1, 3, 1, 5]]], None)],
 edge=[[[[0]]], [[[1, 2], [3, 4]]]],
 gen=lambda r: (lambda m, n: [[[r.choice([0, 1, 2, 3, 4, 5, 6]) for _ in range(n)] for _ in range(m)]])(r.randint(1, 5), r.randint(1, 5)),
 py='''def set_zeroes(matrix):
    rows = {i for i, row in enumerate(matrix) for x in row if x == 0}
    cols = {j for row in matrix for j, x in enumerate(row) if x == 0}
    for i, row in enumerate(matrix):
        for j in range(len(row)):
            if i in rows or j in cols:
                row[j] = 0
    return matrix
''',
 js='''function setZeroes(matrix) {
  const rows = new Set(), cols = new Set();
  matrix.forEach((row, i) => row.forEach((x, j) => { if (x === 0) { rows.add(i); cols.add(j); } }));
  matrix.forEach((row, i) => row.forEach((_, j) => { if (rows.has(i) || cols.has(j)) row[j] = 0; }));
  return matrix;
}''')
