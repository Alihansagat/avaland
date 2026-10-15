from common import prob

# ---------- динамическое программирование ----------
prob(id="stairs", title="Лестница", diff="easy", topic="Динамическое программирование", lc="climbing-stairs",
 fn="climb_stairs", params=["n"],
 text="До вершины лестницы `n` ступенек. За один шаг можно подняться на 1 или 2 ступеньки. Сколькими способами можно добраться до вершины?",
 limits="1 ≤ n ≤ 45",
 hint="На ступеньку n попадают с n − 1 или с n − 2, поэтому ways(n) = ways(n − 1) + ways(n − 2). Это числа Фибоначчи.",
 complexity="O(n) по времени, O(1) по памяти.",
 examples=[([2], "1+1 или 2"), ([3], "1+1+1, 1+2, 2+1")],
 edge=[[1], [45]],
 gen=lambda r: [r.randint(1, 45)],
 py='''def climb_stairs(n):
    a, b = 1, 1
    for _ in range(n):
        a, b = b, a + b
    return a
''',
 js='''function climbStairs(n) {
  let a = 1, b = 1;
  for (let i = 0; i < n; i++) [a, b] = [b, a + b];
  return a;
}''')

prob(id="robber", title="Ограбление улицы", diff="medium", topic="Динамическое программирование", lc="house-robber",
 fn="rob", params=["houses"],
 text="`houses[i]` — сумма денег в доме `i` на улице. Нельзя брать деньги из двух соседних домов. Какую максимальную сумму можно собрать?",
 limits="1 ≤ длина ≤ 100, 0 ≤ houses[i] ≤ 400",
 hint="Для каждого дома: либо пропускаем его (лучший результат до предыдущего), либо берём (его деньги + лучший результат до позапрошлого).",
 complexity="O(n) по времени, O(1) по памяти.",
 examples=[([[1, 2, 3, 1]], "1 + 3 = 4"), ([[2, 7, 9, 3, 1]], "2 + 9 + 1 = 12")],
 edge=[[[5]], [[2, 1, 1, 2]]],
 gen=lambda r: [[r.randint(0, 30) for _ in range(r.randint(1, 15))]],
 py='''def rob(houses):
    prev, cur = 0, 0
    for h in houses:
        prev, cur = cur, max(cur, prev + h)
    return cur
''',
 js='''function rob(houses) {
  let prev = 0, cur = 0;
  for (const h of houses) [prev, cur] = [cur, Math.max(cur, prev + h)];
  return cur;
}''')

prob(id="coins", title="Минимум монет", diff="medium", topic="Динамическое программирование", lc="coin-change",
 fn="coin_change", params=["coins", "amount"],
 text="Есть монеты номиналов `coins` в неограниченном количестве. Какое минимальное число монет нужно, чтобы набрать сумму `amount`? Если набрать нельзя — верните `-1`.",
 limits="1 ≤ число номиналов ≤ 12, 0 ≤ amount ≤ 10⁴",
 hint="dp[s] — минимум монет для суммы s. dp[s] = min(dp[s − c] + 1) по всем монетам c ≤ s. Жадный выбор крупных монет не всегда работает.",
 complexity="O(amount × число номиналов).",
 examples=[([[1, 2, 5], 11], "5 + 5 + 1"), ([[2], 3], None)],
 edge=[[[1], 0], [[186, 419, 83, 408], 6249]],
 gen=lambda r: [r.sample(range(1, 15), r.randint(1, 4)), r.randint(0, 60)],
 py='''def coin_change(coins, amount):
    INF = float("inf")
    dp = [0] + [INF] * amount
    for s in range(1, amount + 1):
        for c in coins:
            if c <= s and dp[s - c] + 1 < dp[s]:
                dp[s] = dp[s - c] + 1
    return dp[amount] if dp[amount] != INF else -1
''',
 js='''function coinChange(coins, amount) {
  const dp = [0, ...new Array(amount).fill(Infinity)];
  for (let s = 1; s <= amount; s++)
    for (const c of coins) if (c <= s) dp[s] = Math.min(dp[s], dp[s - c] + 1);
  return dp[amount] === Infinity ? -1 : dp[amount];
}''')

prob(id="lis", title="Возрастающая подпоследовательность", diff="medium", topic="Динамическое программирование", lc="longest-increasing-subsequence",
 fn="length_of_lis", params=["nums"],
 text="Найдите длину самой длинной строго возрастающей подпоследовательности массива `nums` (элементы не обязаны идти подряд).",
 limits="1 ≤ длина ≤ 2500",
 hint="O(n²): dp[i] — длина лучшей последовательности, заканчивающейся на i. Быстрее: храните «хвосты» и ищите место бинарным поиском.",
 complexity="O(n log n) с хвостами и бинарным поиском.",
 examples=[([[10, 9, 2, 5, 3, 7, 101, 18]], "Например 2, 3, 7, 101"), ([[7, 7, 7, 7]], None)],
 edge=[[[1]], [[0, 1, 0, 3, 2, 3]]],
 gen=lambda r: [[r.randint(-10, 20) for _ in range(r.randint(1, 18))]],
 py='''def length_of_lis(nums):
    from bisect import bisect_left
    tails = []
    for x in nums:
        i = bisect_left(tails, x)
        if i == len(tails):
            tails.append(x)
        else:
            tails[i] = x
    return len(tails)
''',
 js='''function lengthOfLis(nums) {
  const dp = nums.map(() => 1);
  for (let i = 0; i < nums.length; i++)
    for (let j = 0; j < i; j++) if (nums[j] < nums[i]) dp[i] = Math.max(dp[i], dp[j] + 1);
  return Math.max(...dp);
}''')

prob(id="grid-paths", title="Пути в сетке", diff="medium", topic="Динамическое программирование", lc="unique-paths",
 fn="unique_paths", params=["m", "n"],
 text="Робот стоит в левом верхнем углу сетки `m × n` и может ходить только вправо или вниз. Сколько существует разных путей до правого нижнего угла?",
 limits="1 ≤ m, n ≤ 100, ответ ≤ 2·10⁹",
 hint="В клетку можно прийти только сверху или слева: paths[i][j] = paths[i − 1][j] + paths[i][j − 1].",
 complexity="O(m · n) по времени, O(n) по памяти.",
 examples=[([3, 7], None), ([3, 2], None)],
 edge=[[1, 1], [1, 10]],
 gen=lambda r: [r.randint(1, 12), r.randint(1, 12)],
 py='''def unique_paths(m, n):
    row = [1] * n
    for _ in range(m - 1):
        for j in range(1, n):
            row[j] += row[j - 1]
    return row[-1]
''',
 js='''function uniquePaths(m, n) {
  const row = new Array(n).fill(1);
  for (let i = 1; i < m; i++) for (let j = 1; j < n; j++) row[j] += row[j - 1];
  return row[n - 1];
}''')

prob(id="word-break", title="Разбиение на слова", diff="medium", topic="Динамическое программирование", lc="word-break",
 fn="word_break", params=["s", "words"],
 text="Можно ли разбить строку `s` на последовательность слов из словаря `words`? Слова можно использовать сколько угодно раз.",
 limits="1 ≤ длина s ≤ 300, до 1000 слов",
 hint="ok[i] — можно ли разбить первые i символов. ok[i] = true, если есть слово w, которым s заканчивается на позиции i, и ok[i − len(w)].",
 complexity="O(n²) или O(n · число слов · длина слова).",
 examples=[(["leetcode", ["leet", "code"]], None), (["catsandog", ["cats", "dog", "sand", "and", "cat"]], None)],
 edge=[["a", ["b"]], ["aaaa", ["a", "aa"]]],
 gen=lambda r: (lambda ws: ["".join(r.choice(ws) for _ in range(r.randint(1, 4))) + (r.choice(["", "x"])), ws])(r.sample(["ab", "a", "ba", "bab", "b", "aab"], r.randint(1, 3))),
 py='''def word_break(s, words):
    wset = set(words)
    ok = [True] + [False] * len(s)
    for i in range(1, len(s) + 1):
        for j in range(i):
            if ok[j] and s[j:i] in wset:
                ok[i] = True
                break
    return ok[-1]
''',
 js='''function wordBreak(s, words) {
  const ok = [true, ...new Array(s.length).fill(false)];
  for (let i = 1; i <= s.length; i++)
    for (const w of words) if (i >= w.length && ok[i - w.length] && s.slice(i - w.length, i) === w) { ok[i] = true; break; }
  return ok[s.length];
}''')

prob(id="max-subarray", title="Отрезок с наибольшей суммой", diff="medium", topic="Динамическое программирование", lc="maximum-subarray",
 fn="max_sub_array", params=["nums"],
 text="Найдите непрерывный непустой отрезок массива с наибольшей суммой и верните эту сумму.",
 limits="1 ≤ длина ≤ 10⁵",
 hint="Алгоритм Кадане: текущая сумма = max(x, текущая + x). Если накопленное стало хуже, чем начать заново, — начинайте заново.",
 complexity="O(n).",
 examples=[([[-2, 1, -3, 4, -1, 2, 1, -5, 4]], "Отрезок 4, −1, 2, 1"), ([[5, 4, -1, 7, 8]], None)],
 edge=[[[-3]], [[-2, -1]]],
 gen=lambda r: [[r.randint(-10, 10) for _ in range(r.randint(1, 20))]],
 py='''def max_sub_array(nums):
    best = cur = nums[0]
    for x in nums[1:]:
        cur = max(x, cur + x)
        best = max(best, cur)
    return best
''',
 js='''function maxSubArray(nums) {
  let best = nums[0], cur = nums[0];
  for (const x of nums.slice(1)) { cur = Math.max(x, cur + x); best = Math.max(best, cur); }
  return best;
}''')

prob(id="edit-distance", title="Расстояние редактирования", diff="medium", topic="Динамическое программирование", lc="edit-distance",
 fn="min_distance", params=["a", "b"],
 text="За одну операцию можно вставить, удалить или заменить символ. Найдите минимальное число операций, чтобы превратить строку `a` в строку `b` (расстояние Левенштейна).",
 limits="0 ≤ длины ≤ 500",
 hint="dp[i][j] — ответ для первых i символов a и первых j символов b. Если символы равны — dp[i−1][j−1], иначе 1 + минимум из трёх соседних клеток.",
 complexity="O(m · n).",
 examples=[(["horse", "ros"], None), (["intention", "execution"], None)],
 edge=[["", ""], ["", "abc"], ["abc", "abc"]],
 gen=lambda r: ["".join(r.choice("abc") for _ in range(r.randint(0, 8))), "".join(r.choice("abc") for _ in range(r.randint(0, 8)))],
 py='''def min_distance(a, b):
    prev = list(range(len(b) + 1))
    for i in range(1, len(a) + 1):
        cur = [i] + [0] * len(b)
        for j in range(1, len(b) + 1):
            if a[i - 1] == b[j - 1]:
                cur[j] = prev[j - 1]
            else:
                cur[j] = 1 + min(prev[j], cur[j - 1], prev[j - 1])
        prev = cur
    return prev[-1]
''',
 js='''function minDistance(a, b) {
  const dp = Array.from({ length: a.length + 1 }, (_, i) => Array.from({ length: b.length + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0)));
  for (let i = 1; i <= a.length; i++)
    for (let j = 1; j <= b.length; j++)
      dp[i][j] = a[i - 1] === b[j - 1] ? dp[i - 1][j - 1] : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
  return dp[a.length][b.length];
}''')

prob(id="lcs", title="Общая подпоследовательность", diff="medium", topic="Динамическое программирование", lc="longest-common-subsequence",
 fn="longest_common_subsequence", params=["a", "b"],
 text="Найдите длину самой длинной общей подпоследовательности строк `a` и `b` (символы не обязаны идти подряд, но порядок сохраняется).",
 limits="1 ≤ длины ≤ 1000",
 hint="dp[i][j]: если a[i−1] == b[j−1], то dp[i−1][j−1] + 1, иначе max(dp[i−1][j], dp[i][j−1]).",
 complexity="O(m · n).",
 examples=[(["abcde", "ace"], "«ace»"), (["abc", "def"], None)],
 edge=[["a", "a"], ["abc", "cba"]],
 gen=lambda r: ["".join(r.choice("abcd") for _ in range(r.randint(1, 10))), "".join(r.choice("abcd") for _ in range(r.randint(1, 10)))],
 py='''def longest_common_subsequence(a, b):
    prev = [0] * (len(b) + 1)
    for ch in a:
        cur = [0]
        for j, cb in enumerate(b):
            cur.append(prev[j] + 1 if ch == cb else max(prev[j + 1], cur[j]))
        prev = cur
    return prev[-1]
''',
 js='''function longestCommonSubsequence(a, b) {
  let prev = new Array(b.length + 1).fill(0);
  for (const ch of a) {
    const cur = [0];
    for (let j = 0; j < b.length; j++) cur.push(ch === b[j] ? prev[j] + 1 : Math.max(prev[j + 1], cur[j]));
    prev = cur;
  }
  return prev[b.length];
}''')

prob(id="decode-ways", title="Способы расшифровки", diff="medium", topic="Динамическое программирование", lc="decode-ways",
 fn="num_decodings", params=["s"],
 text="Буквы закодированы числами: A → 1, B → 2, …, Z → 26. Дана строка из цифр `s`. Сколькими способами её можно расшифровать? Код не может начинаться с нуля: «06» — неверно.",
 limits="1 ≤ длина ≤ 100",
 hint="ways(i) складывается из ways(i−1), если последняя цифра не 0, и ways(i−2), если две последние цифры дают число от 10 до 26.",
 complexity="O(n).",
 examples=[(["12"], "AB или L"), (["226"], "BZ, VF, BBF"), (["06"], None)],
 edge=[["0"], ["10"], ["2101"]],
 gen=lambda r: ["".join(r.choice("1212260") for _ in range(r.randint(1, 10)))],
 py='''def num_decodings(s):
    prev2, prev1 = 1, 1 if s[0] != "0" else 0
    for i in range(1, len(s)):
        cur = 0
        if s[i] != "0":
            cur += prev1
        if 10 <= int(s[i - 1:i + 1]) <= 26:
            cur += prev2
        prev2, prev1 = prev1, cur
    return prev1
''',
 js='''function numDecodings(s) {
  let prev2 = 1, prev1 = s[0] !== "0" ? 1 : 0;
  for (let i = 1; i < s.length; i++) {
    let cur = 0;
    if (s[i] !== "0") cur += prev1;
    const two = Number(s.slice(i - 1, i + 1));
    if (two >= 10 && two <= 26) cur += prev2;
    [prev2, prev1] = [prev1, cur];
  }
  return prev1;
}''')

prob(id="jump", title="Прыжки по массиву", diff="medium", topic="Жадные алгоритмы", lc="jump-game",
 fn="can_jump", params=["nums"],
 text="Вы стоите на индексе 0. Число `nums[i]` — максимальная длина прыжка с позиции `i`. Можно ли добраться до последнего индекса?",
 limits="1 ≤ длина ≤ 10⁴",
 hint="Держите самую дальнюю достижимую позицию. Если текущий индекс дальше неё — вы застряли.",
 complexity="O(n).",
 examples=[([[2, 3, 1, 1, 4]], None), ([[3, 2, 1, 0, 4]], "Любой путь упирается в 0 на индексе 3")],
 edge=[[[0]], [[0, 1]], [[1, 0, 1]]],
 gen=lambda r: [[r.randint(0, 3) for _ in range(r.randint(1, 15))]],
 py='''def can_jump(nums):
    far = 0
    for i, x in enumerate(nums):
        if i > far:
            return False
        far = max(far, i + x)
    return True
''',
 js='''function canJump(nums) {
  let far = 0;
  for (let i = 0; i < nums.length; i++) {
    if (i > far) return false;
    far = Math.max(far, i + nums[i]);
  }
  return true;
}''')

# ---------- интервалы ----------
prob(id="merge-intervals", title="Слияние интервалов", diff="medium", topic="Интервалы", lc="merge-intervals",
 fn="merge", params=["intervals"],
 text="Даны интервалы `[start, end]`. Объедините все пересекающиеся (в том числе касающиеся концами) и верните результат, отсортированный по началу.",
 limits="1 ≤ число интервалов ≤ 10⁴",
 hint="Отсортируйте по началу. Идите по порядку: если интервал начинается не позже конца последнего в ответе — расширьте его, иначе добавьте новый.",
 complexity="O(n log n) из-за сортировки.",
 examples=[([[[1, 3], [2, 6], [8, 10], [15, 18]]], None), ([[[1, 4], [4, 5]]], "Касаются в точке 4")],
 edge=[[[[1, 1]]], [[[5, 6], [1, 2]]], [[[1, 10], [2, 3]]]],
 gen=lambda r: [[(lambda a: [a, a + r.randint(0, 5)])(r.randint(0, 20)) for _ in range(r.randint(1, 8))]],
 py='''def merge(intervals):
    res = []
    for s, e in sorted(intervals):
        if res and s <= res[-1][1]:
            res[-1][1] = max(res[-1][1], e)
        else:
            res.append([s, e])
    return res
''',
 js='''function merge(intervals) {
  const res = [];
  for (const [s, e] of [...intervals].sort((a, b) => a[0] - b[0] || a[1] - b[1])) {
    if (res.length && s <= res[res.length - 1][1]) res[res.length - 1][1] = Math.max(res[res.length - 1][1], e);
    else res.push([s, e]);
  }
  return res;
}''')

prob(id="insert-interval", title="Вставка интервала", diff="medium", topic="Интервалы", lc="insert-interval",
 fn="insert", params=["intervals", "new_interval"],
 text="Список `intervals` отсортирован по началу, интервалы не пересекаются. Вставьте `new_interval` и при необходимости слейте пересечения. Верните отсортированный список без пересечений.",
 limits="0 ≤ число интервалов ≤ 10⁴",
 hint="Три фазы: интервалы, которые целиком левее нового; пересекающиеся — сливаются с ним; всё, что правее.",
 complexity="O(n).",
 examples=[([[[1, 3], [6, 9]], [2, 5]], None), ([[[1, 2], [3, 5], [6, 7], [8, 10], [12, 16]], [4, 8]], None)],
 edge=[[[], [5, 7]], [[[1, 5]], [6, 8]], [[[3, 4]], [1, 2]]],
 gen=lambda r: _gen_insert(r),
 py='''def insert(intervals, new_interval):
    res, i, n = [], 0, len(intervals)
    s, e = new_interval
    while i < n and intervals[i][1] < s:
        res.append(intervals[i]); i += 1
    while i < n and intervals[i][0] <= e:
        s, e = min(s, intervals[i][0]), max(e, intervals[i][1]); i += 1
    res.append([s, e])
    return res + intervals[i:]
''',
 js='''function insert(intervals, newInterval) {
  const res = [];
  let i = 0, [s, e] = newInterval;
  while (i < intervals.length && intervals[i][1] < s) res.push(intervals[i++]);
  while (i < intervals.length && intervals[i][0] <= e) { s = Math.min(s, intervals[i][0]); e = Math.max(e, intervals[i][1]); i++; }
  res.push([s, e]);
  return res.concat(intervals.slice(i));
}''')


def _gen_insert(r):
    pts = sorted(r.sample(range(0, 40), 2 * r.randint(0, 5)))
    iv = [[pts[i], pts[i + 1]] for i in range(0, len(pts), 2)]
    a = r.randint(0, 40)
    return [iv, [a, a + r.randint(0, 10)]]


prob(id="erase-overlap", title="Лишние интервалы", diff="medium", topic="Интервалы", lc="non-overlapping-intervals",
 fn="erase_overlap_intervals", params=["intervals"],
 text="Какое минимальное число интервалов нужно удалить, чтобы оставшиеся не пересекались? Интервалы, касающиеся концами (`[1,2]` и `[2,3]`), не пересекаются.",
 limits="1 ≤ число интервалов ≤ 10⁵",
 hint="Жадно: отсортируйте по концу и оставляйте интервал, если он начинается не раньше конца последнего оставленного.",
 complexity="O(n log n).",
 examples=[([[[1, 2], [2, 3], [3, 4], [1, 3]]], "Удалить [1, 3]"), ([[[1, 2], [1, 2], [1, 2]]], None)],
 edge=[[[[1, 2]]], [[[1, 100], [11, 22], [1, 11], [2, 12]]]],
 gen=lambda r: [[(lambda a: [a, a + r.randint(1, 6)])(r.randint(0, 20)) for _ in range(r.randint(1, 9))]],
 py='''def erase_overlap_intervals(intervals):
    end, kept = float("-inf"), 0
    for s, e in sorted(intervals, key=lambda x: x[1]):
        if s >= end:
            kept += 1
            end = e
    return len(intervals) - kept
''',
 js='''function eraseOverlapIntervals(intervals) {
  let end = -Infinity, kept = 0;
  for (const [s, e] of [...intervals].sort((a, b) => a[1] - b[1])) if (s >= end) { kept++; end = e; }
  return intervals.length - kept;
}''')

# ---------- графы и сетки ----------
prob(id="islands", title="Количество островов", diff="medium", topic="Графы", lc="number-of-islands",
 fn="num_islands", params=["grid"],
 text="Карта `grid` состоит из `1` (суша) и `0` (вода). Остров — группа клеток суши, соединённых по горизонтали или вертикали. Посчитайте острова.",
 limits="1 ≤ строк, столбцов ≤ 300",
 hint="Пройдите по всем клеткам. Встретили непосещённую сушу — это новый остров: обойдите его целиком (DFS или BFS) и пометьте.",
 complexity="O(m · n).",
 examples=[([[[1, 1, 0, 0, 0], [1, 1, 0, 0, 0], [0, 0, 1, 0, 0], [0, 0, 0, 1, 1]]], None)],
 edge=[[[[0]]], [[[1]]], [[[1, 0, 1], [0, 1, 0], [1, 0, 1]]]],
 gen=lambda r: (lambda m, n: [[[1 if r.random() < .45 else 0 for _ in range(n)] for _ in range(m)]])(r.randint(1, 7), r.randint(1, 7)),
 py='''def num_islands(grid):
    m, n = len(grid), len(grid[0])
    seen = set()
    count = 0
    for i in range(m):
        for j in range(n):
            if grid[i][j] == 1 and (i, j) not in seen:
                count += 1
                stack = [(i, j)]
                seen.add((i, j))
                while stack:
                    x, y = stack.pop()
                    for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                        a, b = x + dx, y + dy
                        if 0 <= a < m and 0 <= b < n and grid[a][b] == 1 and (a, b) not in seen:
                            seen.add((a, b))
                            stack.append((a, b))
    return count
''',
 js='''function numIslands(grid) {
  const m = grid.length, n = grid[0].length, seen = grid.map(r => r.map(() => false));
  let count = 0;
  const dfs = (i, j) => {
    if (i < 0 || j < 0 || i >= m || j >= n || seen[i][j] || grid[i][j] !== 1) return;
    seen[i][j] = true;
    dfs(i + 1, j); dfs(i - 1, j); dfs(i, j + 1); dfs(i, j - 1);
  };
  for (let i = 0; i < m; i++) for (let j = 0; j < n; j++) if (grid[i][j] === 1 && !seen[i][j]) { count++; dfs(i, j); }
  return count;
}''')

prob(id="flood-fill", title="Заливка", diff="easy", topic="Графы", lc="flood-fill",
 fn="flood_fill", params=["image", "sr", "sc", "color"],
 text="Картинка `image` — матрица цветов. Начиная с клетки `(sr, sc)`, перекрасьте в `color` эту клетку и все связанные с ней по сторонам клетки исходного цвета. Верните картинку.",
 limits="1 ≤ размеры ≤ 50",
 hint="Запомните исходный цвет. Если он равен новому — ничего делать не нужно. Иначе обойдите связную область DFS или BFS.",
 complexity="O(m · n).",
 examples=[([[[1, 1, 1], [1, 1, 0], [1, 0, 1]], 1, 1, 2], None)],
 edge=[[[[0, 0, 0], [0, 0, 0]], 0, 0, 0], [[[5]], 0, 0, 7]],
 gen=lambda r: (lambda m, n: [[[r.randint(0, 2) for _ in range(n)] for _ in range(m)], r.randint(0, m - 1), r.randint(0, n - 1), r.randint(0, 3)])(r.randint(1, 6), r.randint(1, 6)),
 py='''def flood_fill(image, sr, sc, color):
    old = image[sr][sc]
    if old == color:
        return image
    stack = [(sr, sc)]
    while stack:
        i, j = stack.pop()
        if 0 <= i < len(image) and 0 <= j < len(image[0]) and image[i][j] == old:
            image[i][j] = color
            stack += [(i + 1, j), (i - 1, j), (i, j + 1), (i, j - 1)]
    return image
''',
 js='''function floodFill(image, sr, sc, color) {
  const old = image[sr][sc];
  if (old === color) return image;
  const stack = [[sr, sc]];
  while (stack.length) {
    const [i, j] = stack.pop();
    if (i >= 0 && j >= 0 && i < image.length && j < image[0].length && image[i][j] === old) {
      image[i][j] = color;
      stack.push([i + 1, j], [i - 1, j], [i, j + 1], [i, j - 1]);
    }
  }
  return image;
}''')

prob(id="courses", title="Порядок курсов", diff="medium", topic="Графы", lc="course-schedule",
 fn="can_finish", params=["n", "prereq"],
 text="Есть `n` курсов с номерами от 0 до n − 1. Пара `[a, b]` в `prereq` означает: чтобы пройти курс `a`, сначала нужно пройти `b`. Можно ли пройти все курсы?",
 limits="1 ≤ n ≤ 2000, до 5000 пар",
 hint="Это вопрос о цикле в ориентированном графе. Топологическая сортировка (алгоритм Кана): если удалось «снять» все вершины с нулевой входящей степенью — цикла нет.",
 complexity="O(V + E).",
 examples=[([2, [[1, 0]]], None), ([2, [[1, 0], [0, 1]]], "Курсы требуют друг друга — цикл")],
 edge=[[1, []], [3, [[1, 0], [2, 1], [0, 2]]]],
 gen=lambda r: (lambda n: [n, [list(p) for p in {(r.randrange(n), r.randrange(n)) for _ in range(r.randint(0, n + 2))} if p[0] != p[1]]])(r.randint(1, 7)),
 py='''def can_finish(n, prereq):
    from collections import deque
    indeg = [0] * n
    adj = [[] for _ in range(n)]
    for a, b in prereq:
        adj[b].append(a)
        indeg[a] += 1
    q = deque(i for i in range(n) if indeg[i] == 0)
    done = 0
    while q:
        v = q.popleft()
        done += 1
        for w in adj[v]:
            indeg[w] -= 1
            if indeg[w] == 0:
                q.append(w)
    return done == n
''',
 js='''function canFinish(n, prereq) {
  const indeg = new Array(n).fill(0), adj = Array.from({ length: n }, () => []);
  for (const [a, b] of prereq) { adj[b].push(a); indeg[a]++; }
  const q = [];
  indeg.forEach((d, i) => { if (d === 0) q.push(i); });
  let done = 0;
  while (q.length) {
    const v = q.shift(); done++;
    for (const w of adj[v]) if (--indeg[w] === 0) q.push(w);
  }
  return done === n;
}''')

prob(id="oranges", title="Гнилые апельсины", diff="medium", topic="Графы", lc="rotting-oranges",
 fn="oranges_rotting", params=["grid"],
 text="В ящике `grid`: 0 — пусто, 1 — свежий апельсин, 2 — гнилой. Каждую минуту свежие апельсины рядом (по сторонам) с гнилыми портятся. Через сколько минут свежих не останется? Если это невозможно — верните `-1`.",
 limits="1 ≤ размеры ≤ 10",
 hint="Многоисточниковый BFS: положите в очередь все гнилые апельсины сразу и распространяйте гниль по уровням-минутам.",
 complexity="O(m · n).",
 examples=[([[[2, 1, 1], [1, 1, 0], [0, 1, 1]]], None), ([[[2, 1, 1], [0, 1, 1], [1, 0, 1]]], "Апельсин в левом нижнем углу изолирован")],
 edge=[[[[0, 2]]], [[[1]]], [[[0]]]],
 gen=lambda r: (lambda m, n: [[[r.choice([0, 1, 1, 1, 2]) for _ in range(n)] for _ in range(m)]])(r.randint(1, 5), r.randint(1, 5)),
 py='''def oranges_rotting(grid):
    from collections import deque
    m, n = len(grid), len(grid[0])
    q = deque((i, j) for i in range(m) for j in range(n) if grid[i][j] == 2)
    fresh = sum(row.count(1) for row in grid)
    minutes = 0
    while q and fresh:
        for _ in range(len(q)):
            i, j = q.popleft()
            for a, b in ((i + 1, j), (i - 1, j), (i, j + 1), (i, j - 1)):
                if 0 <= a < m and 0 <= b < n and grid[a][b] == 1:
                    grid[a][b] = 2
                    fresh -= 1
                    q.append((a, b))
        minutes += 1
    return minutes if fresh == 0 else -1
''',
 js='''function orangesRotting(grid) {
  const m = grid.length, n = grid[0].length;
  let q = [], fresh = 0, minutes = 0;
  grid.forEach((row, i) => row.forEach((v, j) => { if (v === 2) q.push([i, j]); if (v === 1) fresh++; }));
  while (q.length && fresh) {
    const next = [];
    for (const [i, j] of q)
      for (const [a, b] of [[i + 1, j], [i - 1, j], [i, j + 1], [i, j - 1]])
        if (a >= 0 && b >= 0 && a < m && b < n && grid[a][b] === 1) { grid[a][b] = 2; fresh--; next.push([a, b]); }
    q = next; minutes++;
  }
  return fresh === 0 ? minutes : -1;
}''')

prob(id="network-delay", title="Сигнал по сети", diff="medium", topic="Графы", lc="network-delay-time",
 fn="network_delay_time", params=["times", "n", "k"],
 text="Сеть из `n` узлов с номерами от 1 до n. `times[i] = [u, v, w]` — сигнал идёт от `u` к `v` за `w` миллисекунд. Сигнал отправили из узла `k`. За какое время он дойдёт до всех узлов? Если до какого-то не дойдёт — верните `-1`.",
 limits="1 ≤ n ≤ 100, веса от 0 до 100",
 hint="Нужны кратчайшие пути от k до всех — алгоритм Дейкстры с очередью с приоритетом. Ответ — максимум из расстояний.",
 complexity="O(E log V).",
 examples=[([[[2, 1, 1], [2, 3, 1], [3, 4, 1]], 4, 2], None), ([[[1, 2, 1]], 2, 2], "Из узла 2 до узла 1 пути нет")],
 edge=[[[], 1, 1], [[[1, 2, 5], [1, 2, 1]], 2, 1]],
 gen=lambda r: (lambda n: [[[r.randint(1, n), r.randint(1, n), r.randint(0, 9)] for _ in range(r.randint(0, n * 3))], n, r.randint(1, n)])(r.randint(1, 6)),
 py='''def network_delay_time(times, n, k):
    import heapq
    adj = {}
    for u, v, w in times:
        adj.setdefault(u, []).append((v, w))
    dist = {}
    heap = [(0, k)]
    while heap:
        d, u = heapq.heappop(heap)
        if u in dist:
            continue
        dist[u] = d
        for v, w in adj.get(u, []):
            if v not in dist:
                heapq.heappush(heap, (d + w, v))
    return max(dist.values()) if len(dist) == n else -1
''',
 js='''function networkDelayTime(times, n, k) {
  const dist = new Array(n + 1).fill(Infinity);
  dist[k] = 0;
  for (let i = 0; i < n; i++)
    for (const [u, v, w] of times) if (dist[u] + w < dist[v]) dist[v] = dist[u] + w;
  const worst = Math.max(...dist.slice(1));
  return worst === Infinity ? -1 : worst;
}''')

prob(id="word-search", title="Слово в сетке", diff="medium", topic="Перебор с возвратом", lc="word-search",
 fn="exist", params=["board", "word"],
 text="Сетка `board` из букв. Можно ли составить слово `word`, переходя между соседними по сторонам клетками? Одну клетку нельзя использовать дважды.",
 limits="1 ≤ размеры ≤ 6, 1 ≤ длина слова ≤ 15",
 hint="Из каждой клетки, совпадающей с первой буквой, запускайте поиск с возвратом: помечайте клетку, рекурсивно ищите следующую букву, снимайте пометку.",
 complexity="O(m · n · 4^L) в худшем случае.",
 examples=[([[["A", "B", "C", "E"], ["S", "F", "C", "S"], ["A", "D", "E", "E"]], "ABCCED"], None), ([[["A", "B", "C", "E"], ["S", "F", "C", "S"], ["A", "D", "E", "E"]], "ABCB"], "Клетку B нельзя использовать дважды")],
 edge=[[[["a"]], "a"], [[["a", "a"]], "aaa"]],
 gen=lambda r: (lambda m, n: [[[r.choice("ab") for _ in range(n)] for _ in range(m)], "".join(r.choice("ab") for _ in range(r.randint(1, 5)))])(r.randint(1, 4), r.randint(1, 4)),
 py='''def exist(board, word):
    m, n = len(board), len(board[0])
    def go(i, j, k):
        if k == len(word):
            return True
        if not (0 <= i < m and 0 <= j < n) or board[i][j] != word[k]:
            return False
        ch, board[i][j] = board[i][j], "#"
        found = go(i + 1, j, k + 1) or go(i - 1, j, k + 1) or go(i, j + 1, k + 1) or go(i, j - 1, k + 1)
        board[i][j] = ch
        return found
    return any(go(i, j, 0) for i in range(m) for j in range(n))
''',
 js='''function exist(board, word) {
  const m = board.length, n = board[0].length;
  const go = (i, j, k) => {
    if (k === word.length) return true;
    if (i < 0 || j < 0 || i >= m || j >= n || board[i][j] !== word[k]) return false;
    const ch = board[i][j]; board[i][j] = "#";
    const found = go(i + 1, j, k + 1) || go(i - 1, j, k + 1) || go(i, j + 1, k + 1) || go(i, j - 1, k + 1);
    board[i][j] = ch;
    return found;
  };
  for (let i = 0; i < m; i++) for (let j = 0; j < n; j++) if (go(i, j, 0)) return true;
  return false;
}''')

# ---------- перебор с возвратом ----------
prob(id="subsets", title="Все подмножества", diff="medium", topic="Перебор с возвратом", lc="subsets",
 fn="subsets", params=["nums"], compare="groups",
 text="Верните все подмножества массива `nums` из различных чисел, включая пустое. Порядок подмножеств и чисел внутри не важен.",
 limits="1 ≤ длина ≤ 10",
 hint="Для каждого числа два выбора: брать или не брать. Либо итеративно: к каждому уже готовому подмножеству добавьте новое число.",
 complexity="O(n · 2ⁿ).",
 examples=[([[1, 2, 3]], None), ([[0]], None)],
 edge=[[[5, -1]]],
 gen=lambda r: [r.sample(range(-9, 10), r.randint(1, 5))],
 py='''def subsets(nums):
    res = [[]]
    for x in nums:
        res += [s + [x] for s in res]
    return res
''',
 js='''function subsets(nums) {
  let res = [[]];
  for (const x of nums) res = res.concat(res.map(s => [...s, x]));
  return res;
}''')

prob(id="permutations", title="Все перестановки", diff="medium", topic="Перебор с возвратом", lc="permutations",
 fn="permute", params=["nums"], compare="unordered",
 text="Верните все перестановки массива `nums` из различных чисел. Порядок перестановок не важен.",
 limits="1 ≤ длина ≤ 6",
 hint="Рекурсивно выбирайте очередное ещё не использованное число и откатывайте выбор после возврата.",
 complexity="O(n · n!).",
 examples=[([[1, 2, 3]], None), ([[0, 1]], None)],
 edge=[[[1]]],
 gen=lambda r: [r.sample(range(-9, 10), r.randint(1, 4))],
 py='''def permute(nums):
    res = []
    def go(path, rest):
        if not rest:
            res.append(path)
            return
        for i in range(len(rest)):
            go(path + [rest[i]], rest[:i] + rest[i + 1:])
    go([], nums)
    return res
''',
 js='''function permute(nums) {
  const res = [];
  const go = (path, rest) => {
    if (!rest.length) { res.push(path); return; }
    rest.forEach((x, i) => go([...path, x], [...rest.slice(0, i), ...rest.slice(i + 1)]));
  };
  go([], nums);
  return res;
}''')

prob(id="combination-sum", title="Комбинации с суммой", diff="medium", topic="Перебор с возвратом", lc="combination-sum",
 fn="combination_sum", params=["candidates", "target"], compare="groups",
 text="Найдите все уникальные комбинации чисел из `candidates` (все различны и положительны), сумма которых равна `target`. Каждое число можно брать сколько угодно раз. Порядок комбинаций и чисел внутри не важен.",
 limits="1 ≤ длина ≤ 30, 1 ≤ target ≤ 40",
 hint="Перебор с возвратом, где следующее число берётся с индекса не меньше текущего — так не будет одинаковых комбинаций в разном порядке.",
 complexity="Экспоненциальная, но ограничена target.",
 examples=[([[2, 3, 6, 7], 7], None), ([[2, 3, 5], 8], None)],
 edge=[[[2], 1], [[1], 2]],
 gen=lambda r: [r.sample(range(2, 12), r.randint(1, 4)), r.randint(1, 18)],
 py='''def combination_sum(candidates, target):
    res = []
    def go(start, path, left):
        if left == 0:
            res.append(path)
            return
        for i in range(start, len(candidates)):
            if candidates[i] <= left:
                go(i, path + [candidates[i]], left - candidates[i])
    go(0, [], target)
    return res
''',
 js='''function combinationSum(candidates, target) {
  const res = [];
  const go = (start, path, left) => {
    if (left === 0) { res.push(path); return; }
    for (let i = start; i < candidates.length; i++) if (candidates[i] <= left) go(i, [...path, candidates[i]], left - candidates[i]);
  };
  go(0, [], target);
  return res;
}''')

prob(id="queens", title="Расстановки ферзей", diff="hard", topic="Перебор с возвратом", lc="n-queens-ii",
 fn="total_n_queens", params=["n"],
 text="Сколькими способами можно расставить `n` ферзей на доске `n × n`, чтобы никакие два не били друг друга?",
 limits="1 ≤ n ≤ 9",
 hint="Ставьте ферзей по одному в каждую строку. Храните занятые столбцы и две диагонали (r − c и r + c) в множествах.",
 complexity="O(n!) в худшем случае, на практике гораздо меньше.",
 examples=[([4], None), ([1], None)],
 edge=[[2], [3], [8]],
 gen=lambda r: [r.randint(1, 8)],
 py='''def total_n_queens(n):
    cols, d1, d2 = set(), set(), set()
    def go(r):
        if r == n:
            return 1
        total = 0
        for c in range(n):
            if c in cols or r - c in d1 or r + c in d2:
                continue
            cols.add(c); d1.add(r - c); d2.add(r + c)
            total += go(r + 1)
            cols.remove(c); d1.remove(r - c); d2.remove(r + c)
        return total
    return go(0)
''',
 js='''function totalNQueens(n) {
  const cols = new Set(), d1 = new Set(), d2 = new Set();
  const go = r => {
    if (r === n) return 1;
    let total = 0;
    for (let c = 0; c < n; c++) {
      if (cols.has(c) || d1.has(r - c) || d2.has(r + c)) continue;
      cols.add(c); d1.add(r - c); d2.add(r + c);
      total += go(r + 1);
      cols.delete(c); d1.delete(r - c); d2.delete(r + c);
    }
    return total;
  };
  return go(0);
}''')

prob(id="valid-parens-len", title="Самые длинные правильные скобки", diff="hard", topic="Стек", lc="longest-valid-parentheses",
 fn="longest_valid_parentheses", params=["s"],
 text="Строка `s` состоит из `(` и `)`. Найдите длину самой длинной подстроки, которая является правильной скобочной последовательностью.",
 limits="0 ≤ длина ≤ 3·10⁴",
 hint="Стек индексов с «дном» −1. Открывающую кладите, на закрывающую снимайте: если стек опустел — положите текущий индекс как новое дно, иначе длина = i − вершина.",
 complexity="O(n).",
 examples=[(["(()"], "«()»"), ([")()())"], "«()()»")],
 edge=[[""], ["()(()"], ["(()())"]],
 gen=lambda r: ["".join(r.choice("()") for _ in range(r.randint(0, 16)))],
 py='''def longest_valid_parentheses(s):
    stack, best = [-1], 0
    for i, ch in enumerate(s):
        if ch == "(":
            stack.append(i)
        else:
            stack.pop()
            if not stack:
                stack.append(i)
            else:
                best = max(best, i - stack[-1])
    return best
''',
 js='''function longestValidParentheses(s) {
  const stack = [-1];
  let best = 0;
  for (let i = 0; i < s.length; i++) {
    if (s[i] === "(") stack.push(i);
    else {
      stack.pop();
      if (!stack.length) stack.push(i); else best = Math.max(best, i - stack[stack.length - 1]);
    }
  }
  return best;
}''')
