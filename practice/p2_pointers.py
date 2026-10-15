from common import prob
import random, string

# ---------- два указателя ----------
prob(id="palindrome", title="Палиндром", diff="easy", topic="Два указателя", lc="valid-palindrome",
 fn="is_palindrome", params=["s"],
 text="Строка — палиндром, если после удаления всего, кроме букв и цифр, и перевода в нижний регистр она читается одинаково слева направо и справа налево. Верните `true` или `false`.",
 limits="Длина до 2·10⁵, символы ASCII",
 hint="Два указателя с концов. Пропускайте символы, которые не буквы и не цифры, сравнивайте в нижнем регистре.",
 complexity="O(n) по времени, O(1) по памяти.",
 examples=[(["A man, a plan, a canal: Panama"], None), (["race a car"], None)],
 edge=[[" "], ["0P"], ["ab_a"]],
 gen=lambda r: (lambda h: [h + r.choice(["", "x", "Z"]) + h[::-1].upper() if r.random() < .5 else "".join(r.choice("abAB ,.1") for _ in range(r.randint(1, 12)))])("".join(r.choice("ab c,1") for _ in range(r.randint(0, 6)))),
 py='''def is_palindrome(s):
    i, j = 0, len(s) - 1
    while i < j:
        if not s[i].isalnum():
            i += 1
        elif not s[j].isalnum():
            j -= 1
        elif s[i].lower() != s[j].lower():
            return False
        else:
            i += 1
            j -= 1
    return True
''',
 js='''function isPalindrome(s) {
  const ok = c => /[a-z0-9]/i.test(c);
  let i = 0, j = s.length - 1;
  while (i < j) {
    if (!ok(s[i])) i++;
    else if (!ok(s[j])) j--;
    else if (s[i].toLowerCase() !== s[j].toLowerCase()) return false;
    else { i++; j--; }
  }
  return true;
}''')

prob(id="sorted-pair", title="Пара в отсортированном массиве", diff="medium", topic="Два указателя", lc="two-sum-ii-input-array-is-sorted",
 fn="sorted_pair", params=["numbers", "target"],
 text="Массив `numbers` отсортирован по возрастанию. Найдите два числа с суммой `target` и верните их позиции **с единицы** `[i, j]`, где `i < j`. Ответ ровно один. Используйте O(1) дополнительной памяти.",
 limits="2 ≤ длина ≤ 3·10⁴",
 hint="Указатели на начало и конец. Сумма меньше цели — двигайте левый вправо, больше — правый влево.",
 complexity="O(n) по времени, O(1) по памяти.",
 examples=[([[2, 7, 11, 15], 9], "2 + 7 = 9, позиции 1 и 2"), ([[-1, 0], -1], None)],
 edge=[[[1, 2], 3], [[1, 3, 4, 6, 9], 10]],
 gen=lambda r: _sorted_pair(r),
 py='''def sorted_pair(numbers, target):
    i, j = 0, len(numbers) - 1
    while i < j:
        s = numbers[i] + numbers[j]
        if s == target:
            return [i + 1, j + 1]
        if s < target:
            i += 1
        else:
            j -= 1
''',
 js='''function sortedPair(numbers, target) {
  let i = 0, j = numbers.length - 1;
  while (i < j) {
    const s = numbers[i] + numbers[j];
    if (s === target) return [i + 1, j + 1];
    if (s < target) i++; else j--;
  }
}''')


def _sorted_pair(r):
    while True:
        nums = sorted(r.sample(range(-100, 100), r.randint(2, 25)))
        i, j = sorted(r.sample(range(len(nums)), 2))
        t = nums[i] + nums[j]
        if sum(1 for a in range(len(nums)) for b in range(a + 1, len(nums)) if nums[a] + nums[b] == t) == 1:
            return [nums, t]


prob(id="three-sum", title="Тройки с нулевой суммой", diff="medium", topic="Два указателя", lc="3sum",
 fn="three_sum", params=["nums"], compare="groups",
 text="Найдите все **уникальные** тройки чисел из `nums` (с разными индексами), сумма которых равна нулю. Порядок троек и чисел внутри тройки не важен.",
 limits="3 ≤ длина ≤ 3000",
 hint="Отсортируйте массив. Зафиксируйте первое число и ищите два других двумя указателями. Пропускайте одинаковые значения, чтобы не было повторов.",
 complexity="O(n²) по времени.",
 examples=[([[-1, 0, 1, 2, -1, -4]], None), ([[0, 1, 1]], None)],
 edge=[[[0, 0, 0, 0]], [[-2, 0, 1, 1, 2]]],
 gen=lambda r: [[r.randint(-6, 6) for _ in range(r.randint(3, 14))]],
 py='''def three_sum(nums):
    nums.sort()
    res = []
    for i in range(len(nums) - 2):
        if i > 0 and nums[i] == nums[i - 1]:
            continue
        l, r = i + 1, len(nums) - 1
        while l < r:
            s = nums[i] + nums[l] + nums[r]
            if s < 0:
                l += 1
            elif s > 0:
                r -= 1
            else:
                res.append([nums[i], nums[l], nums[r]])
                while l < r and nums[l] == nums[l + 1]:
                    l += 1
                l += 1
                r -= 1
    return res
''',
 js='''function threeSum(nums) {
  nums.sort((a, b) => a - b);
  const res = [];
  for (let i = 0; i < nums.length - 2; i++) {
    if (i > 0 && nums[i] === nums[i - 1]) continue;
    let l = i + 1, r = nums.length - 1;
    while (l < r) {
      const s = nums[i] + nums[l] + nums[r];
      if (s < 0) l++;
      else if (s > 0) r--;
      else {
        res.push([nums[i], nums[l], nums[r]]);
        while (l < r && nums[l] === nums[l + 1]) l++;
        l++; r--;
      }
    }
  }
  return res;
}''')

prob(id="water-container", title="Самый вместительный бак", diff="medium", topic="Два указателя", lc="container-with-most-water",
 fn="max_area", params=["height"],
 text="`height[i]` — высота вертикальной стенки в точке `i`. Выберите две стенки так, чтобы вместе с осью X они образовали бак с наибольшим объёмом воды: `(j − i) × min(height[i], height[j])`. Верните этот объём.",
 limits="2 ≤ длина ≤ 10⁵",
 hint="Начните с самых крайних стенок. Сдвигать имеет смысл только более низкую — более высокая уже не ограничивает воду.",
 complexity="O(n) по времени.",
 examples=[([[1, 8, 6, 2, 5, 4, 8, 3, 7]], "Стенки 8 и 7 на расстоянии 7: 7 × 7 = 49"), ([[1, 1]], None)],
 edge=[[[4, 3, 2, 1, 4]], [[1, 2, 1]]],
 gen=lambda r: [[r.randint(0, 30) for _ in range(r.randint(2, 20))]],
 py='''def max_area(height):
    i, j, best = 0, len(height) - 1, 0
    while i < j:
        best = max(best, (j - i) * min(height[i], height[j]))
        if height[i] < height[j]:
            i += 1
        else:
            j -= 1
    return best
''',
 js='''function maxArea(height) {
  let i = 0, j = height.length - 1, best = 0;
  while (i < j) {
    best = Math.max(best, (j - i) * Math.min(height[i], height[j]));
    if (height[i] < height[j]) i++; else j--;
  }
  return best;
}''')

prob(id="rain-water", title="Дождевая вода", diff="hard", topic="Два указателя", lc="trapping-rain-water",
 fn="trap", params=["height"],
 text="Массив `height` описывает рельеф из столбиков шириной 1. Сколько единиц воды задержится между столбиками после дождя?",
 limits="1 ≤ длина ≤ 2·10⁴, 0 ≤ height[i] ≤ 10⁵",
 hint="Над столбиком i стоит min(максимум слева, максимум справа) − height[i] воды. Два указателя позволяют посчитать это без дополнительных массивов.",
 complexity="O(n) по времени, O(1) по памяти.",
 examples=[([[0, 1, 0, 2, 1, 0, 1, 3, 2, 1, 2, 1]], None), ([[4, 2, 0, 3, 2, 5]], None)],
 edge=[[[5]], [[3, 0, 3]], [[1, 2, 3]]],
 gen=lambda r: [[r.randint(0, 8) for _ in range(r.randint(1, 25))]],
 py='''def trap(height):
    i, j = 0, len(height) - 1
    lmax = rmax = water = 0
    while i < j:
        if height[i] < height[j]:
            lmax = max(lmax, height[i])
            water += lmax - height[i]
            i += 1
        else:
            rmax = max(rmax, height[j])
            water += rmax - height[j]
            j -= 1
    return water
''',
 js='''function trap(height) {
  let i = 0, j = height.length - 1, lmax = 0, rmax = 0, water = 0;
  while (i < j) {
    if (height[i] < height[j]) { lmax = Math.max(lmax, height[i]); water += lmax - height[i]; i++; }
    else { rmax = Math.max(rmax, height[j]); water += rmax - height[j]; j--; }
  }
  return water;
}''')

prob(id="subsequence", title="Подпоследовательность", diff="easy", topic="Два указателя", lc="is-subsequence",
 fn="is_subsequence", params=["s", "t"],
 text="Верните `true`, если строку `s` можно получить из `t`, удалив некоторые символы и не меняя порядок остальных.",
 limits="Длина s до 100, t до 10⁴",
 hint="Идите по t одним указателем, а по s — вторым, который двигается только при совпадении символов.",
 complexity="O(len(t)).",
 examples=[(["abc", "ahbgdc"], None), (["axc", "ahbgdc"], None)],
 edge=[["", "abc"], ["abc", ""], ["aaa", "aa"]],
 gen=lambda r: (lambda t: [("".join(c for c in t if r.random() < .4) if r.random() < .6 else "".join(r.choice("abc") for _ in range(r.randint(0, 4)))), t])("".join(r.choice("abcd") for _ in range(r.randint(0, 12)))),
 py='''def is_subsequence(s, t):
    i = 0
    for ch in t:
        if i < len(s) and s[i] == ch:
            i += 1
    return i == len(s)
''',
 js='''function isSubsequence(s, t) {
  let i = 0;
  for (const ch of t) if (i < s.length && s[i] === ch) i++;
  return i === s.length;
}''')

# ---------- скользящее окно ----------
prob(id="unique-substring", title="Подстрока без повторов", diff="medium", topic="Скользящее окно", lc="longest-substring-without-repeating-characters",
 fn="length_of_longest_substring", params=["s"],
 text="Найдите длину самой длинной подстроки строки `s`, в которой все символы разные.",
 limits="0 ≤ длина ≤ 5·10⁴",
 hint="Окно [left, right]. Запоминайте последнюю позицию каждого символа; при повторе сдвигайте left за предыдущее вхождение.",
 complexity="O(n) по времени.",
 examples=[(["abcabcbb"], "Ответ «abc», длина 3"), (["bbbbb"], None), (["pwwkew"], None)],
 edge=[[""], [" "], ["abba"], ["dvdf"]],
 gen=lambda r: ["".join(r.choice("abcde") for _ in range(r.randint(0, 20)))],
 py='''def length_of_longest_substring(s):
    last, left, best = {}, 0, 0
    for right, ch in enumerate(s):
        if ch in last and last[ch] >= left:
            left = last[ch] + 1
        last[ch] = right
        best = max(best, right - left + 1)
    return best
''',
 js='''function lengthOfLongestSubstring(s) {
  const last = new Map();
  let left = 0, best = 0;
  for (let right = 0; right < s.length; right++) {
    const ch = s[right];
    if (last.has(ch) && last.get(ch) >= left) left = last.get(ch) + 1;
    last.set(ch, right);
    best = Math.max(best, right - left + 1);
  }
  return best;
}''')

prob(id="char-replacement", title="Замена символов", diff="medium", topic="Скользящее окно", lc="longest-repeating-character-replacement",
 fn="character_replacement", params=["s", "k"],
 text="В строке из заглавных латинских букв можно заменить не более `k` символов на любые другие. Найдите длину самой длинной подстроки из одинаковых букв, которую можно получить.",
 limits="1 ≤ длина ≤ 10⁵, 0 ≤ k ≤ длина",
 hint="Окно подходит, если (длина окна − частота самой частой буквы в нём) ≤ k. Иначе сдвигайте левую границу.",
 complexity="O(n · 26) или O(n).",
 examples=[(["ABAB", 2], None), (["AABABBA", 1], None)],
 edge=[["A", 0], ["ABCD", 0], ["AAAA", 2]],
 gen=lambda r: (lambda s: [s, r.randint(0, len(s))])("".join(r.choice("ABC") for _ in range(r.randint(1, 18)))),
 py='''def character_replacement(s, k):
    count, left, top, best = {}, 0, 0, 0
    for right, ch in enumerate(s):
        count[ch] = count.get(ch, 0) + 1
        top = max(top, count[ch])
        while right - left + 1 - top > k:
            count[s[left]] -= 1
            left += 1
        best = max(best, right - left + 1)
    return best
''',
 js='''function characterReplacement(s, k) {
  const count = {};
  let left = 0, top = 0, best = 0;
  for (let right = 0; right < s.length; right++) {
    count[s[right]] = (count[s[right]] || 0) + 1;
    top = Math.max(top, count[s[right]]);
    while (right - left + 1 - top > k) { count[s[left]]--; left++; }
    best = Math.max(best, right - left + 1);
  }
  return best;
}''')

prob(id="min-window", title="Минимальное окно", diff="hard", topic="Скользящее окно", lc="minimum-window-substring",
 fn="min_window", params=["s", "t"],
 text="Найдите самую короткую подстроку `s`, которая содержит все символы `t` с учётом повторов. Если таких несколько одинаковой длины, верните самую левую. Если нет ни одной — верните пустую строку.",
 limits="Длины до 10⁵",
 hint="Расширяйте окно вправо, пока оно не покроет t, затем сжимайте слева, пока покрытие сохраняется. Ведите счётчик недостающих символов.",
 complexity="O(len(s) + len(t)).",
 examples=[(["ADOBECODEBANC", "ABC"], "Ответ «BANC»"), (["a", "aa"], "Нужно две буквы a, а есть одна")],
 edge=[["a", "a"], ["ab", "b"], ["aa", "aa"]],
 gen=lambda r: ["".join(r.choice("abc") for _ in range(r.randint(1, 16))), "".join(r.choice("abc") for _ in range(r.randint(1, 3)))],
 py='''def min_window(s, t):
    from collections import Counter
    need = Counter(t)
    missing = len(t)
    left = start = 0
    end = None
    for right, ch in enumerate(s, 1):
        if need[ch] > 0:
            missing -= 1
        need[ch] -= 1
        if missing == 0:
            while need[s[left]] < 0:
                need[s[left]] += 1
                left += 1
            if end is None or right - left < end - start:
                start, end = left, right
            need[s[left]] += 1
            missing += 1
            left += 1
    return "" if end is None else s[start:end]
''',
 js='''function minWindow(s, t) {
  const need = {};
  for (const c of t) need[c] = (need[c] || 0) + 1;
  let missing = t.length, left = 0, start = 0, end = -1;
  for (let right = 1; right <= s.length; right++) {
    const ch = s[right - 1];
    if ((need[ch] || 0) > 0) missing--;
    need[ch] = (need[ch] || 0) - 1;
    if (missing === 0) {
      while (need[s[left]] < 0) { need[s[left]]++; left++; }
      if (end === -1 || right - left < end - start) { start = left; end = right; }
      need[s[left]]++; missing++; left++;
    }
  }
  return end === -1 ? "" : s.slice(start, end);
}''')

prob(id="max-window-sum", title="Лучшее окно из k элементов", diff="easy", topic="Скользящее окно", lc="maximum-average-subarray-i",
 fn="max_window_sum", params=["nums", "k"],
 text="Найдите максимальную сумму `k` подряд идущих элементов массива `nums`.",
 limits="1 ≤ k ≤ длина ≤ 10⁵",
 hint="Посчитайте сумму первого окна, а затем при сдвиге прибавляйте новый элемент и вычитайте ушедший.",
 complexity="O(n).",
 examples=[([[1, 12, -5, -6, 50, 3], 4], "12 − 5 − 6 + 50 = 51"), ([[5], 1], None)],
 edge=[[[-1, -2, -3], 2], [[3, 3, 3], 3]],
 gen=lambda r: (lambda a: [a, r.randint(1, len(a))])([r.randint(-20, 20) for _ in range(r.randint(1, 20))]),
 py='''def max_window_sum(nums, k):
    cur = sum(nums[:k])
    best = cur
    for i in range(k, len(nums)):
        cur += nums[i] - nums[i - k]
        best = max(best, cur)
    return best
''',
 js='''function maxWindowSum(nums, k) {
  let cur = 0;
  for (let i = 0; i < k; i++) cur += nums[i];
  let best = cur;
  for (let i = k; i < nums.length; i++) { cur += nums[i] - nums[i - k]; best = Math.max(best, cur); }
  return best;
}''')

# ---------- стек ----------
prob(id="brackets", title="Правильные скобки", diff="easy", topic="Стек", lc="valid-parentheses",
 fn="is_valid", params=["s"],
 text="Строка `s` состоит из символов `()[]{}`. Верните `true`, если каждая открывающая скобка закрыта скобкой того же типа и в правильном порядке.",
 limits="1 ≤ длина ≤ 10⁴",
 hint="Кладите открывающие скобки в стек. Закрывающая должна совпадать с вершиной стека. В конце стек должен быть пуст.",
 complexity="O(n).",
 examples=[(["()[]{}"], None), (["(]"], None), (["([])"], None)],
 edge=[["("], [")("], ["{[]}"], ["(("]],
 gen=lambda r: ["".join(r.choice("()[]{}") for _ in range(r.randint(1, 10)))] if r.random() < .5 else [_gen_valid(r, r.randint(1, 5))],
 py='''def is_valid(s):
    pairs = {")": "(", "]": "[", "}": "{"}
    stack = []
    for ch in s:
        if ch in pairs:
            if not stack or stack.pop() != pairs[ch]:
                return False
        else:
            stack.append(ch)
    return not stack
''',
 js='''function isValid(s) {
  const pairs = { ")": "(", "]": "[", "}": "{" }, stack = [];
  for (const ch of s) {
    if (ch in pairs) { if (stack.pop() !== pairs[ch]) return false; }
    else stack.push(ch);
  }
  return stack.length === 0;
}''')


def _gen_valid(r, n):
    if n == 0:
        return ""
    o, c = r.choice([("(", ")"), ("[", "]"), ("{", "}")])
    k = r.randint(0, n - 1)
    return o + _gen_valid(r, k) + c + _gen_valid(r, n - 1 - k)


prob(id="rpn", title="Обратная польская запись", diff="medium", topic="Стек", lc="evaluate-reverse-polish-notation",
 fn="eval_rpn", params=["tokens"],
 text="Вычислите выражение в обратной польской записи: операнды идут перед операцией, например `[\"2\", \"1\", \"+\", \"3\", \"*\"]` = (2 + 1) × 3. Операции: `+ - * /`. Деление целочисленное с отбрасыванием дробной части в сторону нуля.",
 limits="Выражение корректно, деления на ноль нет",
 hint="Числа кладите в стек. Встретили операцию — снимите два числа (сначала правый операнд), посчитайте и положите результат обратно.",
 complexity="O(n).",
 examples=[([["2", "1", "+", "3", "*"]], None), ([["4", "13", "5", "/", "+"]], "13 / 5 = 2, затем 4 + 2")],
 edge=[[["7"]], [["7", "-2", "/"]], [["3", "4", "-"]]],
 gen=lambda r: [_gen_rpn(r, r.randint(1, 4))],
 py='''def eval_rpn(tokens):
    st = []
    for t in tokens:
        if t in "+-*/" and len(t) == 1:
            b, a = st.pop(), st.pop()
            if t == "+":
                st.append(a + b)
            elif t == "-":
                st.append(a - b)
            elif t == "*":
                st.append(a * b)
            else:
                st.append(int(a / b))
        else:
            st.append(int(t))
    return st[0]
''',
 js='''function evalRpn(tokens) {
  const st = [];
  for (const t of tokens) {
    if (["+", "-", "*", "/"].includes(t)) {
      const b = st.pop(), a = st.pop();
      st.push(t === "+" ? a + b : t === "-" ? a - b : t === "*" ? a * b : Math.trunc(a / b));
    } else st.push(Number(t));
  }
  return st[0];
}''')


def _gen_rpn(r, ops):
    toks = [str(r.randint(1, 20))]
    for _ in range(ops):
        toks += [str(r.randint(1, 9) * r.choice([1, -1])), r.choice("+-*/")]
    return toks


prob(id="warmer-days", title="Ждать тепла", diff="medium", topic="Стек", lc="daily-temperatures",
 fn="daily_temperatures", params=["temps"],
 text="`temps[i]` — температура в день `i`. Для каждого дня верните, сколько дней ждать до более тёплого дня. Если теплее не станет — `0`.",
 limits="1 ≤ длина ≤ 10⁵",
 hint="Монотонный стек индексов с убывающими температурами. Новый тёплый день «снимает» со стека все дни холоднее себя и записывает им ответ.",
 complexity="O(n): каждый индекс попадает в стек и выходит из него один раз.",
 examples=[([[73, 74, 75, 71, 69, 72, 76, 73]], None), ([[30, 60, 90]], None)],
 edge=[[[50]], [[90, 80, 70]], [[70, 70, 71]]],
 gen=lambda r: [[r.randint(30, 45) for _ in range(r.randint(1, 18))]],
 py='''def daily_temperatures(temps):
    res = [0] * len(temps)
    stack = []
    for i, t in enumerate(temps):
        while stack and temps[stack[-1]] < t:
            j = stack.pop()
            res[j] = i - j
        stack.append(i)
    return res
''',
 js='''function dailyTemperatures(temps) {
  const res = new Array(temps.length).fill(0), stack = [];
  temps.forEach((t, i) => {
    while (stack.length && temps[stack[stack.length - 1]] < t) { const j = stack.pop(); res[j] = i - j; }
    stack.push(i);
  });
  return res;
}''')

prob(id="histogram", title="Наибольший прямоугольник", diff="hard", topic="Стек", lc="largest-rectangle-in-histogram",
 fn="largest_rectangle", params=["heights"],
 text="Гистограмма задана высотами столбцов `heights`, ширина каждого — 1. Найдите площадь наибольшего прямоугольника, который целиком помещается в гистограмму.",
 limits="1 ≤ длина ≤ 10⁵",
 hint="Монотонный стек возрастающих высот. Когда приходит столбец ниже вершины, вершина больше не может расширяться вправо — посчитайте её прямоугольник.",
 complexity="O(n).",
 examples=[([[2, 1, 5, 6, 2, 3]], "Столбцы 5 и 6 дают 5 × 2 = 10"), ([[2, 4]], None)],
 edge=[[[0]], [[3, 3, 3]], [[1, 2, 3, 4, 5]]],
 gen=lambda r: [[r.randint(0, 9) for _ in range(r.randint(1, 18))]],
 py='''def largest_rectangle(heights):
    stack, best = [], 0
    for i, h in enumerate(heights + [0]):
        start = i
        while stack and stack[-1][1] > h:
            idx, hh = stack.pop()
            best = max(best, hh * (i - idx))
            start = idx
        stack.append((start, h))
    return best
''',
 js='''function largestRectangle(heights) {
  const stack = [];
  let best = 0;
  [...heights, 0].forEach((h, i) => {
    let start = i;
    while (stack.length && stack[stack.length - 1][1] > h) {
      const [idx, hh] = stack.pop();
      best = Math.max(best, hh * (i - idx));
      start = idx;
    }
    stack.push([start, h]);
  });
  return best;
}''')

prob(id="gen-brackets", title="Все скобочные последовательности", diff="medium", topic="Перебор с возвратом", lc="generate-parentheses",
 fn="generate_parentheses", params=["n"], compare="unordered",
 text="Сгенерируйте все правильные скобочные последовательности из `n` пар круглых скобок. Порядок в ответе не важен.",
 limits="1 ≤ n ≤ 8",
 hint="Строите строку по символу: открывающую можно добавить, пока их меньше n, закрывающую — пока закрытых меньше открытых.",
 complexity="Число ответов — n-е число Каталана, примерно 4ⁿ / n^1.5.",
 examples=[([3], None), ([1], None)],
 edge=[[2], [4]],
 gen=lambda r: [r.randint(1, 5)],
 py='''def generate_parentheses(n):
    res = []
    def go(s, o, c):
        if len(s) == 2 * n:
            res.append(s)
            return
        if o < n:
            go(s + "(", o + 1, c)
        if c < o:
            go(s + ")", o, c + 1)
    go("", 0, 0)
    return res
''',
 js='''function generateParentheses(n) {
  const res = [];
  const go = (s, o, c) => {
    if (s.length === 2 * n) { res.push(s); return; }
    if (o < n) go(s + "(", o + 1, c);
    if (c < o) go(s + ")", o, c + 1);
  };
  go("", 0, 0);
  return res;
}''')
