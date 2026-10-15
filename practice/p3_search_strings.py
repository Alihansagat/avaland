from common import prob

# ---------- бинарный поиск ----------
prob(id="bin-search", title="Бинарный поиск", diff="easy", topic="Бинарный поиск", lc="binary-search",
 fn="search", params=["nums", "target"],
 text="Массив `nums` отсортирован по возрастанию, все значения разные. Верните индекс `target` или `-1`, если его нет. Решение должно работать за O(log n).",
 limits="1 ≤ длина ≤ 10⁴",
 hint="Сравнивайте target с серединой отрезка и отбрасывайте половину, где его точно нет.",
 complexity="O(log n).",
 examples=[([[-1, 0, 3, 5, 9, 12], 9], None), ([[-1, 0, 3, 5, 9, 12], 2], None)],
 edge=[[[5], 5], [[5], -5], [[1, 3], 3]],
 gen=lambda r: (lambda a: [a, r.choice(a) if r.random() < .6 else r.randint(-60, 60)])(sorted(r.sample(range(-50, 50), r.randint(1, 20)))),
 py='''def search(nums, target):
    lo, hi = 0, len(nums) - 1
    while lo <= hi:
        mid = (lo + hi) // 2
        if nums[mid] == target:
            return mid
        if nums[mid] < target:
            lo = mid + 1
        else:
            hi = mid - 1
    return -1
''',
 js='''function search(nums, target) {
  let lo = 0, hi = nums.length - 1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if (nums[mid] === target) return mid;
    if (nums[mid] < target) lo = mid + 1; else hi = mid - 1;
  }
  return -1;
}''')

prob(id="insert-pos", title="Место для вставки", diff="easy", topic="Бинарный поиск", lc="search-insert-position",
 fn="search_insert", params=["nums", "target"],
 text="В отсортированном массиве без повторов найдите индекс `target`, а если его нет — индекс, куда его нужно вставить, чтобы порядок сохранился.",
 limits="1 ≤ длина ≤ 10⁴",
 hint="Классический бинарный поиск, но при выходе из цикла ответ — левая граница lo.",
 complexity="O(log n).",
 examples=[([[1, 3, 5, 6], 5], None), ([[1, 3, 5, 6], 2], None), ([[1, 3, 5, 6], 7], None)],
 edge=[[[1], 0], [[1], 2]],
 gen=lambda r: [sorted(r.sample(range(0, 40), r.randint(1, 15))), r.randint(-2, 42)],
 py='''def search_insert(nums, target):
    lo, hi = 0, len(nums)
    while lo < hi:
        mid = (lo + hi) // 2
        if nums[mid] < target:
            lo = mid + 1
        else:
            hi = mid
    return lo
''',
 js='''function searchInsert(nums, target) {
  let lo = 0, hi = nums.length;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (nums[mid] < target) lo = mid + 1; else hi = mid;
  }
  return lo;
}''')

prob(id="rotated-min", title="Минимум в сдвинутом массиве", diff="medium", topic="Бинарный поиск", lc="find-minimum-in-rotated-sorted-array",
 fn="find_min", params=["nums"],
 text="Отсортированный массив без повторов циклически сдвинули: например, `[0,1,2,4,5,6,7]` стал `[4,5,6,7,0,1,2]`. Найдите минимальный элемент за O(log n).",
 limits="1 ≤ длина ≤ 5000",
 hint="Сравните середину с последним элементом: если середина больше, минимум справа, иначе — в левой части, включая середину.",
 complexity="O(log n).",
 examples=[([[3, 4, 5, 1, 2]], None), ([[11, 13, 15, 17]], None)],
 edge=[[[1]], [[2, 1]]],
 gen=lambda r: (lambda a, k: [a[k:] + a[:k]])(sorted(r.sample(range(-50, 50), n := r.randint(1, 15))), r.randint(0, n - 1)),
 py='''def find_min(nums):
    lo, hi = 0, len(nums) - 1
    while lo < hi:
        mid = (lo + hi) // 2
        if nums[mid] > nums[hi]:
            lo = mid + 1
        else:
            hi = mid
    return nums[lo]
''',
 js='''function findMin(nums) {
  let lo = 0, hi = nums.length - 1;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (nums[mid] > nums[hi]) lo = mid + 1; else hi = mid;
  }
  return nums[lo];
}''')

prob(id="rotated-search", title="Поиск в сдвинутом массиве", diff="medium", topic="Бинарный поиск", lc="search-in-rotated-sorted-array",
 fn="search_rotated", params=["nums", "target"],
 text="Массив из предыдущей задачи — отсортированный и циклически сдвинутый, значения разные. Найдите индекс `target` за O(log n) или верните `-1`.",
 limits="1 ≤ длина ≤ 5000",
 hint="На каждом шаге хотя бы одна половина отсортирована. Проверьте, лежит ли target в её диапазоне, и выберите нужную половину.",
 complexity="O(log n).",
 examples=[([[4, 5, 6, 7, 0, 1, 2], 0], None), ([[4, 5, 6, 7, 0, 1, 2], 3], None)],
 edge=[[[1], 0], [[3, 1], 1], [[5, 1, 3], 5]],
 gen=lambda r: (lambda a, k: (lambda b: [b, r.choice(b) if r.random() < .7 else r.randint(-60, 60)])(a[k:] + a[:k]))(sorted(r.sample(range(-50, 50), n := r.randint(1, 15))), r.randint(0, n - 1)),
 py='''def search_rotated(nums, target):
    lo, hi = 0, len(nums) - 1
    while lo <= hi:
        mid = (lo + hi) // 2
        if nums[mid] == target:
            return mid
        if nums[lo] <= nums[mid]:
            if nums[lo] <= target < nums[mid]:
                hi = mid - 1
            else:
                lo = mid + 1
        else:
            if nums[mid] < target <= nums[hi]:
                lo = mid + 1
            else:
                hi = mid - 1
    return -1
''',
 js='''function searchRotated(nums, target) {
  let lo = 0, hi = nums.length - 1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if (nums[mid] === target) return mid;
    if (nums[lo] <= nums[mid]) {
      if (nums[lo] <= target && target < nums[mid]) hi = mid - 1; else lo = mid + 1;
    } else {
      if (nums[mid] < target && target <= nums[hi]) lo = mid + 1; else hi = mid - 1;
    }
  }
  return -1;
}''')

prob(id="eating-speed", title="Скорость поедания", diff="medium", topic="Бинарный поиск", lc="koko-eating-bananas",
 fn="min_eating_speed", params=["piles", "h"],
 text="Есть кучки бананов `piles`. За час можно съесть до `k` бананов из одной кучки; если в кучке меньше — час всё равно уходит на неё целиком. Найдите минимальное целое `k`, чтобы съесть всё не дольше чем за `h` часов.",
 limits="длина ≤ h ≤ 10⁹, 1 ≤ piles[i] ≤ 10⁹",
 hint="Время монотонно убывает с ростом k. Ищите k бинарным поиском на отрезке [1, max(piles)].",
 complexity="O(n log max(piles)).",
 examples=[([[3, 6, 7, 11], 8], None), ([[30, 11, 23, 4, 20], 5], None)],
 edge=[[[1], 1], [[1000000000], 2]],
 gen=lambda r: (lambda p: [p, r.randint(len(p), len(p) * 4)])([r.randint(1, 40) for _ in range(r.randint(1, 8))]),
 py='''def min_eating_speed(piles, h):
    lo, hi = 1, max(piles)
    while lo < hi:
        k = (lo + hi) // 2
        if sum((p + k - 1) // k for p in piles) <= h:
            hi = k
        else:
            lo = k + 1
    return lo
''',
 js='''function minEatingSpeed(piles, h) {
  let lo = 1, hi = Math.max(...piles);
  while (lo < hi) {
    const k = Math.floor((lo + hi) / 2);
    const hours = piles.reduce((s, p) => s + Math.ceil(p / k), 0);
    if (hours <= h) hi = k; else lo = k + 1;
  }
  return lo;
}''')

prob(id="int-sqrt", title="Целый квадратный корень", diff="easy", topic="Бинарный поиск", lc="sqrtx",
 fn="my_sqrt", params=["x"],
 text="Верните целую часть квадратного корня из неотрицательного числа `x`. Встроенные функции корня и возведения в степень использовать нельзя.",
 limits="0 ≤ x ≤ 2³¹ − 1",
 hint="Ищите бинарным поиском наибольшее m, для которого m × m ≤ x.",
 complexity="O(log x).",
 examples=[([4], None), ([8], "Корень из 8 ≈ 2,83, целая часть 2")],
 edge=[[0], [1], [2147483647]],
 gen=lambda r: [r.randint(0, 10**6)],
 py='''def my_sqrt(x):
    lo, hi = 0, x
    while lo < hi:
        m = (lo + hi + 1) // 2
        if m * m <= x:
            lo = m
        else:
            hi = m - 1
    return lo
''',
 js='''function mySqrt(x) {
  let lo = 0, hi = x;
  while (lo < hi) {
    const m = Math.floor((lo + hi + 1) / 2);
    if (m * m <= x) lo = m; else hi = m - 1;
  }
  return lo;
}''')

prob(id="kth-largest", title="k-й по величине", diff="medium", topic="Куча", lc="kth-largest-element-in-an-array",
 fn="find_kth_largest", params=["nums", "k"],
 text="Найдите `k`-й по величине элемент массива (именно k-й в отсортированном по убыванию порядке, а не k-й различный).",
 limits="1 ≤ k ≤ длина ≤ 10⁵",
 hint="Держите мин-кучу из k элементов: её вершина и будет ответом. Можно и через сортировку, но это O(n log n).",
 complexity="O(n log k) с кучей, O(n) в среднем с quickselect.",
 examples=[([[3, 2, 1, 5, 6, 4], 2], None), ([[3, 2, 3, 1, 2, 4, 5, 5, 6], 4], None)],
 edge=[[[1], 1], [[2, 2, 2], 2]],
 gen=lambda r: (lambda a: [a, r.randint(1, len(a))])([r.randint(-20, 20) for _ in range(r.randint(1, 20))]),
 py='''def find_kth_largest(nums, k):
    import heapq
    heap = []
    for x in nums:
        heapq.heappush(heap, x)
        if len(heap) > k:
            heapq.heappop(heap)
    return heap[0]
''',
 js='''function findKthLargest(nums, k) {
  return [...nums].sort((a, b) => b - a)[k - 1];
}''')

prob(id="median-two", title="Медиана двух массивов", diff="hard", topic="Бинарный поиск", lc="median-of-two-sorted-arrays",
 fn="find_median", params=["a", "b"], compare="float",
 text="Даны два отсортированных массива `a` и `b`. Верните медиану их объединения. Цель — O(log(m + n)), но засчитывается любое верное решение.",
 limits="0 ≤ m, n ≤ 1000, m + n ≥ 1",
 hint="Медиана делит объединение на две равные половины. Бинарным поиском подберите, сколько элементов взять из меньшего массива в левую половину.",
 complexity="O(log min(m, n)) с бинарным поиском разреза, O(m + n) со слиянием.",
 examples=[([[1, 3], [2]], "Объединение [1, 2, 3], медиана 2"), ([[1, 2], [3, 4]], "(2 + 3) / 2 = 2.5")],
 edge=[[[], [1]], [[2], []], [[1, 1], [1, 1]]],
 gen=lambda r: (lambda: (lambda a, b: [a, b] if a or b else [[1], []])(sorted(r.randint(-30, 30) for _ in range(r.randint(0, 8))), sorted(r.randint(-30, 30) for _ in range(r.randint(0, 8)))))(),
 py='''def find_median(a, b):
    merged = sorted(a + b)
    n = len(merged)
    if n % 2:
        return float(merged[n // 2])
    return (merged[n // 2 - 1] + merged[n // 2]) / 2
''',
 js='''function findMedian(a, b) {
  const m = [...a, ...b].sort((x, y) => x - y), n = m.length;
  return n % 2 ? m[(n - 1) / 2] : (m[n / 2 - 1] + m[n / 2]) / 2;
}''')

# ---------- строки ----------
prob(id="common-prefix", title="Общее начало", diff="easy", topic="Строки", lc="longest-common-prefix",
 fn="longest_common_prefix", params=["words"],
 text="Найдите самый длинный общий префикс всех строк массива `words`. Если его нет — верните пустую строку.",
 limits="1 ≤ число строк ≤ 200, длина строки ≤ 200",
 hint="Возьмите первое слово и укорачивайте его, пока все остальные слова не начинаются с него.",
 complexity="O(S), где S — суммарная длина строк.",
 examples=[([["flower", "flow", "flight"]], None), ([["dog", "racecar", "car"]], None)],
 edge=[[["alone"]], [["", "b"]], [["ab", "ab"]]],
 gen=lambda r: (lambda p: [[p + "".join(r.choice("xyz") for _ in range(r.randint(0, 3))) for _ in range(r.randint(1, 5))]])("".join(r.choice("ab") for _ in range(r.randint(0, 4)))),
 py='''def longest_common_prefix(words):
    prefix = words[0]
    for w in words[1:]:
        while not w.startswith(prefix):
            prefix = prefix[:-1]
    return prefix
''',
 js='''function longestCommonPrefix(words) {
  let prefix = words[0];
  for (const w of words.slice(1)) while (!w.startsWith(prefix)) prefix = prefix.slice(0, -1);
  return prefix;
}''')

prob(id="reverse-words", title="Слова задом наперёд", diff="medium", topic="Строки", lc="reverse-words-in-a-string",
 fn="reverse_words", params=["s"],
 text="Разверните порядок слов в строке `s`. Слова разделены одним или несколькими пробелами, в начале и конце строки тоже могут быть пробелы. В ответе слова разделены ровно одним пробелом, без пробелов по краям.",
 limits="1 ≤ длина ≤ 10⁴, есть хотя бы одно слово",
 hint="Разбейте строку по пробелам, отбросьте пустые части, разверните и склейте через один пробел.",
 complexity="O(n).",
 examples=[(["the sky is blue"], None), (["  hello world  "], None)],
 edge=[["a"], ["a good   example"]],
 gen=lambda r: ["".join(r.choice(["code", "go", "py", "  ", " "]) + " " for _ in range(r.randint(1, 6)))],
 py='''def reverse_words(s):
    return " ".join(reversed(s.split()))
''',
 js='''function reverseWords(s) {
  return s.trim().split(/\\s+/).reverse().join(" ");
}''')

prob(id="roman", title="Римские цифры", diff="easy", topic="Строки", lc="roman-to-integer",
 fn="roman_to_int", params=["s"],
 text="Переведите римское число в целое. Символы: I=1, V=5, X=10, L=50, C=100, D=500, M=1000. Если меньший символ стоит перед большим, он вычитается: IV = 4, XC = 90.",
 limits="Число от 1 до 3999, запись корректна",
 hint="Идите слева направо: если значение текущего символа меньше следующего — вычитайте его, иначе прибавляйте.",
 complexity="O(n).",
 examples=[(["III"], None), (["LVIII"], None), (["MCMXCIV"], "M = 1000, CM = 900, XC = 90, IV = 4")],
 edge=[["IV"], ["MMMCMXCIX"]],
 gen=lambda r: [_to_roman(r.randint(1, 3999))],
 py='''def roman_to_int(s):
    v = {"I": 1, "V": 5, "X": 10, "L": 50, "C": 100, "D": 500, "M": 1000}
    total = 0
    for i, ch in enumerate(s):
        if i + 1 < len(s) and v[ch] < v[s[i + 1]]:
            total -= v[ch]
        else:
            total += v[ch]
    return total
''',
 js='''function romanToInt(s) {
  const v = { I: 1, V: 5, X: 10, L: 50, C: 100, D: 500, M: 1000 };
  let total = 0;
  for (let i = 0; i < s.length; i++) total += i + 1 < s.length && v[s[i]] < v[s[i + 1]] ? -v[s[i]] : v[s[i]];
  return total;
}''')


def _to_roman(n):
    vals = [(1000, "M"), (900, "CM"), (500, "D"), (400, "CD"), (100, "C"), (90, "XC"), (50, "L"), (40, "XL"), (10, "X"), (9, "IX"), (5, "V"), (4, "IV"), (1, "I")]
    out = ""
    for v, s in vals:
        while n >= v:
            out += s
            n -= v
    return out


prob(id="palindrome-len", title="Самый длинный палиндром", diff="medium", topic="Строки", lc="longest-palindromic-substring",
 fn="longest_palindrome_length", params=["s"],
 text="Найдите длину самой длинной подстроки-палиндрома в строке `s`.",
 limits="1 ≤ длина ≤ 1000",
 hint="Каждый палиндром симметричен относительно центра. Переберите 2n − 1 центров (символы и промежутки) и расширяйтесь в обе стороны.",
 complexity="O(n²) по времени, O(1) по памяти.",
 examples=[(["babad"], "«bab» или «aba»"), (["cbbd"], "«bb»")],
 edge=[["a"], ["aaaa"], ["abcd"]],
 gen=lambda r: ["".join(r.choice("ab") for _ in range(r.randint(1, 16)))],
 py='''def longest_palindrome_length(s):
    best = 0
    for c in range(2 * len(s) - 1):
        l, r = c // 2, c // 2 + c % 2
        while l >= 0 and r < len(s) and s[l] == s[r]:
            l -= 1
            r += 1
        best = max(best, r - l - 1)
    return best
''',
 js='''function longestPalindromeLength(s) {
  let best = 0;
  for (let c = 0; c < 2 * s.length - 1; c++) {
    let l = c >> 1, r = (c >> 1) + (c % 2);
    while (l >= 0 && r < s.length && s[l] === s[r]) { l--; r++; }
    best = Math.max(best, r - l - 1);
  }
  return best;
}''')

prob(id="fizzbuzz", title="FizzBuzz", diff="easy", topic="Математика", lc="fizz-buzz",
 fn="fizz_buzz", params=["n"],
 text="Верните список строк для чисел от 1 до `n`: «FizzBuzz», если число делится на 3 и на 5; «Fizz» — только на 3; «Buzz» — только на 5; иначе само число строкой.",
 limits="1 ≤ n ≤ 10⁴",
 hint="Проверяйте делимость на 15 первой.",
 complexity="O(n).",
 examples=[([5], None), ([15], None)],
 edge=[[1]],
 gen=lambda r: [r.randint(1, 35)],
 py='''def fizz_buzz(n):
    res = []
    for i in range(1, n + 1):
        if i % 15 == 0:
            res.append("FizzBuzz")
        elif i % 3 == 0:
            res.append("Fizz")
        elif i % 5 == 0:
            res.append("Buzz")
        else:
            res.append(str(i))
    return res
''',
 js='''function fizzBuzz(n) {
  const res = [];
  for (let i = 1; i <= n; i++) res.push(i % 15 === 0 ? "FizzBuzz" : i % 3 === 0 ? "Fizz" : i % 5 === 0 ? "Buzz" : String(i));
  return res;
}''')

prob(id="single", title="Число без пары", diff="easy", topic="Битовые операции", lc="single-number",
 fn="single_number", params=["nums"],
 text="В массиве каждое число встречается дважды, кроме одного. Найдите его за O(n) по времени и O(1) по памяти.",
 limits="1 ≤ длина ≤ 3·10⁴",
 hint="XOR одинаковых чисел даёт 0, а x XOR 0 = x. Объедините все числа через XOR.",
 complexity="O(n) по времени, O(1) по памяти.",
 examples=[([[2, 2, 1]], None), ([[4, 1, 2, 1, 2]], None)],
 edge=[[[7]], [[-1, 5, -1]]],
 gen=lambda r: (lambda vals: (lambda a: (r.shuffle(a), [a])[1])(vals[1:] * 2 + [vals[0]]))(r.sample(range(-50, 50), r.randint(1, 8))),
 py='''def single_number(nums):
    x = 0
    for n in nums:
        x ^= n
    return x
''',
 js='''function singleNumber(nums) {
  return nums.reduce((x, n) => x ^ n, 0);
}''')

prob(id="count-bits", title="Подсчёт единиц", diff="easy", topic="Битовые операции", lc="counting-bits",
 fn="count_bits", params=["n"],
 text="Для каждого числа `i` от 0 до `n` посчитайте количество единиц в его двоичной записи. Верните массив длины `n + 1`.",
 limits="0 ≤ n ≤ 10⁵",
 hint="bits[i] = bits[i >> 1] + (i & 1): число без последнего бита уже посчитано.",
 complexity="O(n).",
 examples=[([2], None), ([5], None)],
 edge=[[0], [1]],
 gen=lambda r: [r.randint(0, 40)],
 py='''def count_bits(n):
    bits = [0] * (n + 1)
    for i in range(1, n + 1):
        bits[i] = bits[i >> 1] + (i & 1)
    return bits
''',
 js='''function countBits(n) {
  const bits = new Array(n + 1).fill(0);
  for (let i = 1; i <= n; i++) bits[i] = bits[i >> 1] + (i & 1);
  return bits;
}''')

prob(id="happy", title="Счастливое число", diff="easy", topic="Математика", lc="happy-number",
 fn="is_happy", params=["n"],
 text="Заменяйте число суммой квадратов его цифр. Если процесс приходит к 1 — число счастливое, если зацикливается без 1 — нет. Верните `true` или `false`.",
 limits="1 ≤ n ≤ 2³¹ − 1",
 hint="Запоминайте увиденные числа в множестве: повтор означает цикл. Или используйте «черепаху и зайца».",
 complexity="O(log n) на шаг, шагов немного.",
 examples=[([19], "1² + 9² = 82 → 68 → 100 → 1"), ([2], None)],
 edge=[[1], [7]],
 gen=lambda r: [r.randint(1, 1000)],
 py='''def is_happy(n):
    seen = set()
    while n != 1 and n not in seen:
        seen.add(n)
        n = sum(int(d) ** 2 for d in str(n))
    return n == 1
''',
 js='''function isHappy(n) {
  const seen = new Set();
  while (n !== 1 && !seen.has(n)) {
    seen.add(n);
    n = String(n).split("").reduce((s, d) => s + d * d, 0);
  }
  return n === 1;
}''')

prob(id="pascal", title="Треугольник Паскаля", diff="easy", topic="Математика", lc="pascals-triangle",
 fn="generate", params=["rows"],
 text="Верните первые `rows` строк треугольника Паскаля. Каждое число равно сумме двух чисел над ним, края — единицы.",
 limits="1 ≤ rows ≤ 30",
 hint="Каждая новая строка: [1] + суммы соседних элементов предыдущей строки + [1].",
 complexity="O(rows²).",
 examples=[([5], None), ([1], None)],
 edge=[[2]],
 gen=lambda r: [r.randint(1, 12)],
 py='''def generate(rows):
    res = [[1]]
    for _ in range(rows - 1):
        prev = res[-1]
        res.append([1] + [prev[i] + prev[i + 1] for i in range(len(prev) - 1)] + [1])
    return res
''',
 js='''function generate(rows) {
  const res = [[1]];
  for (let k = 1; k < rows; k++) {
    const prev = res[k - 1], row = [1];
    for (let i = 0; i < prev.length - 1; i++) row.push(prev[i] + prev[i + 1]);
    row.push(1);
    res.push(row);
  }
  return res;
}''')
