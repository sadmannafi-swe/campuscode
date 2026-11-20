// Python course — a compact secondary course (slide 11: "Python, kept secondary by design").
// It is NOT based on the C playlist; it teaches transferable ideas in four chapters.

export const pyChapters = [
  { slug: "python-basics", sort_order: 1, title_en: "Python Basics", title_bn: "Python বেসিক",
    description_en: "Running code, variables, types and input.", description_bn: "কোড চালানো, Variable, Type আর ইনপুট।" },
  { slug: "conditions-and-loops", sort_order: 2, title_en: "Conditions + Loops", title_bn: "শর্ত + লুপ",
    description_en: "if/elif/else, for and while.", description_bn: "if/elif/else, for আর while।" },
  { slug: "lists-and-strings", sort_order: 3, title_en: "Lists + Strings", title_bn: "List + String",
    description_en: "Working with collections and text.", description_bn: "কালেকশন আর টেক্সট নিয়ে কাজ।" },
  { slug: "functions", sort_order: 4, title_en: "Functions", title_bn: "ফাংশন",
    description_en: "Reusable code, parameters and return values.", description_bn: "পুনঃব্যবহারযোগ্য কোড, Parameter আর Return Value।" },
];

export const pyLessons = [
  {
    number: 1, slug: "hello-python", chapter: "python-basics", topic: "basics", minutes: 10,
    title_en: "Hello, Python", title_bn: "হ্যালো, Python",
    summary_en: "Run your first Python program and see how it differs from C.",
    summary_bn: "প্রথম Python প্রোগ্রাম চালানো এবং C-এর সাথে পার্থক্য দেখা।",
    objectives_en: ["Print text with print()", "Understand that Python is interpreted", "Write comments"],
    objectives_bn: ["print() দিয়ে লেখা প্রিন্ট করা", "Python যে Interpreted ভাষা তা বোঝা", "Comment লেখা"],
    body_en: `Python runs your code line by line through an **interpreter** — no separate compile step, no \`main()\`, no semicolons.

\`\`\`python
print("Hello, CampusCode!")
\`\`\`

- \`print()\` adds a newline automatically. Use \`print(a, b)\` to print several values separated by spaces, or \`end=""\` to stay on the same line.
- Comments start with \`#\`.
- **Indentation is part of the syntax.** Where C uses braces, Python uses consistent indentation (4 spaces).

If you know C already, think of Python as the same ideas with less ceremony.`,
    body_bn: `Python তোমার কোড একটি **Interpreter** দিয়ে লাইন ধরে ধরে চালায় — আলাদা Compile ধাপ নেই, \`main()\` নেই, সেমিকোলনও নেই।

\`\`\`python
print("Hello, CampusCode!")
\`\`\`

- \`print()\` নিজে থেকেই শেষে Newline দেয়। \`print(a, b)\` দিয়ে একাধিক মান স্পেসসহ প্রিন্ট করা যায়, আর একই লাইনে থাকতে চাইলে \`end=""\`।
- Comment শুরু হয় \`#\` দিয়ে।
- **Indentation সিনট্যাক্সেরই অংশ।** C যেখানে Brace ব্যবহার করে, Python সেখানে একই রকম Indentation (৪টি স্পেস) ব্যবহার করে।

C জানা থাকলে Python কে ভাবো একই ধারণা, কিন্তু কম আনুষ্ঠানিকতায়।`,
    mistakes_en: ["Writing Print instead of print", "Mixing tabs and spaces for indentation", "Adding semicolons out of C habit (allowed, but unnecessary)"],
    mistakes_bn: ["print এর বদলে Print লেখা", "Indentation-এ Tab আর স্পেস মিশিয়ে ফেলা", "C-এর অভ্যাসে সেমিকোলন দেওয়া (চলে, কিন্তু অপ্রয়োজনীয়)"],
    practice_en: ["Print your name and university on two lines", "Print 1 2 3 on one line using a single print call"],
    practice_bn: ["তোমার নাম আর বিশ্ববিদ্যালয় দুই লাইনে প্রিন্ট করো", "একটি print দিয়েই 1 2 3 এক লাইনে প্রিন্ট করো"],
    examples: [{
      title_en: "First program", title_bn: "প্রথম প্রোগ্রাম",
      code: `# My first Python program
print("Hello, CampusCode!")
print("Learn.", "Practice.", "Grow.")
print("No newline here", end=" -> ")
print("continued")`,
      explanation_en: "print separates multiple values with a space. end=\" -> \" replaces the usual newline, so the next print continues on the same line.",
      explanation_bn: "print একাধিক মানের মাঝে স্পেস দেয়। end=\" -> \" স্বাভাবিক Newline এর জায়গা নেয়, তাই পরের print একই লাইনে চলতে থাকে।",
    }],
  },
  {
    number: 2, slug: "variables-and-types", chapter: "python-basics", topic: "basics", minutes: 12,
    title_en: "Variables and Types", title_bn: "Variable ও Type",
    summary_en: "Python variables, dynamic typing and f-strings.",
    summary_bn: "Python-এর Variable, Dynamic Typing আর f-string।",
    objectives_en: ["Create variables without declaring types", "Use int, float, str and bool", "Format output with f-strings"],
    objectives_bn: ["Type Declare না করেই Variable তৈরি", "int, float, str ও bool ব্যবহার", "f-string দিয়ে আউটপুট ফরম্যাট করা"],
    body_en: `In Python you create a variable just by assigning to it. The **value** has a type; the variable can later hold something else.

\`\`\`python
semester = 2          # int
cgpa = 3.75           # float
name = "Nafi"         # str
passed = True         # bool
\`\`\`

\`type(x)\` shows the current type.

### Big integers
Python's \`int\` has no fixed size — \`2 ** 100\` just works. There is no overflow like in C.

### Division
\`/\` always gives a float (\`7 / 2\` is \`3.5\`); \`//\` is integer division (\`7 // 2\` is \`3\`); \`%\` is the remainder.

### f-strings
\`f"{name} has CGPA {cgpa:.2f}"\` embeds values directly; \`:.2f\` formats to two decimals, like \`%.2f\` in C.`,
    body_bn: `Python-এ শুধু মান বসালেই Variable তৈরি হয়ে যায়। Type থাকে **মানের**; Variable পরে অন্য ধরনের মানও রাখতে পারে।

\`\`\`python
semester = 2          # int
cgpa = 3.75           # float
name = "Nafi"         # str
passed = True         # bool
\`\`\`

\`type(x)\` বর্তমান Type দেখায়।

### বড় Integer
Python-এর \`int\` এর নির্দিষ্ট সাইজ নেই — \`2 ** 100\` এমনিই কাজ করে। C-এর মতো Overflow হয় না।

### ভাগ
\`/\` সবসময় float দেয় (\`7 / 2\` হলো \`3.5\`); \`//\` হলো Integer Division (\`7 // 2\` হলো \`3\`); \`%\` ভাগশেষ।

### f-string
\`f"{name} has CGPA {cgpa:.2f}"\` সরাসরি মান বসিয়ে দেয়; \`:.2f\` দুই দশমিক পর্যন্ত দেখায়, C-এর \`%.2f\` এর মতো।`,
    mistakes_en: ["Expecting 7 / 2 to be 3 as in C", "Concatenating a str and an int with + (use f-strings or str())", "Writing true instead of True"],
    mistakes_bn: ["C-এর মতো 7 / 2 কে 3 আশা করা", "+ দিয়ে str আর int জোড়া লাগানো (f-string বা str() ব্যবহার করো)", "True এর বদলে true লেখা"],
    practice_en: ["Compute 2 ** 64 and print it", "Store a price and quantity and print the total with two decimals"],
    practice_bn: ["2 ** 64 হিসাব করে প্রিন্ট করো", "দাম আর পরিমাণ রেখে মোট মূল্য দুই দশমিকসহ প্রিন্ট করো"],
    examples: [{
      title_en: "Types and formatting", title_bn: "Type ও ফরম্যাটিং",
      code: `name = "Nafi"
cgpa = 3.756
credits = 18

print(type(name).__name__, type(cgpa).__name__, type(credits).__name__)
print(f"{name} has CGPA {cgpa:.2f} after {credits} credits")
print(7 / 2, 7 // 2, 7 % 2)
print(2 ** 100)`,
      explanation_en: "The f-string rounds 3.756 to 3.76. / gives 3.5, // gives 3, and Python prints the exact 31-digit value of 2 ** 100.",
      explanation_bn: "f-string 3.756 কে 3.76 করে দেখায়। / দেয় 3.5, // দেয় 3, আর Python 2 ** 100 এর ৩১ অঙ্কের সঠিক মান প্রিন্ট করে।",
    }],
  },
  {
    number: 3, slug: "input-in-python", chapter: "python-basics", topic: "basics", minutes: 12,
    title_en: "Reading Input", title_bn: "ইনপুট নেওয়া",
    summary_en: "Read lines with input() and convert them to numbers.",
    summary_bn: "input() দিয়ে লাইন পড়া এবং সংখ্যায় রূপান্তর।",
    objectives_en: ["Read a line with input()", "Convert with int() and float()", "Read several numbers from one line with split()"],
    objectives_bn: ["input() দিয়ে একটি লাইন পড়া", "int() ও float() দিয়ে রূপান্তর", "split() দিয়ে এক লাইন থেকে একাধিক সংখ্যা পড়া"],
    body_en: `\`input()\` reads **one whole line** as a string. Convert it before doing arithmetic:

\`\`\`python
n = int(input())
\`\`\`

### Several values on one line
\`input().split()\` splits on whitespace and returns a list of strings. Combine it with \`map\`:

\`\`\`python
a, b = map(int, input().split())
\`\`\`

### Differences from scanf
scanf skips newlines freely; \`input()\` always reads exactly one line. If the numbers are on separate lines, call \`input()\` once per line.

As in C, put all input in the IDE's **Input** panel before running.`,
    body_bn: `\`input()\` **পুরো একটি লাইন** String হিসেবে পড়ে। হিসাব করার আগে রূপান্তর করে নাও:

\`\`\`python
n = int(input())
\`\`\`

### এক লাইনে একাধিক মান
\`input().split()\` স্পেস ধরে ভাগ করে String-এর একটি List দেয়। এর সাথে \`map\` ব্যবহার করো:

\`\`\`python
a, b = map(int, input().split())
\`\`\`

### scanf এর সাথে পার্থক্য
scanf ইচ্ছেমতো Newline বাদ দিয়ে পড়ে; কিন্তু \`input()\` সবসময় ঠিক একটি লাইন পড়ে। সংখ্যাগুলো আলাদা লাইনে থাকলে প্রতি লাইনের জন্য একবার করে \`input()\` কল করো।

C-এর মতোই, Run করার আগে সব ইনপুট IDE-র **Input** প্যানেলে লিখে দাও।`,
    mistakes_en: ["Forgetting int() and getting '12' + '30' = '1230'", "Calling int(input()) on a line that contains two numbers", "Reading past the end of input (EOFError)"],
    mistakes_bn: ["int() ভুলে গিয়ে '12' + '30' = '1230' পাওয়া", "দুটি সংখ্যা থাকা লাইনে int(input()) কল করা", "ইনপুট শেষ হওয়ার পরও পড়তে যাওয়া (EOFError)"],
    practice_en: ["Solve Sum of Two Numbers in Python", "Read N and then N numbers on the next line; print their average"],
    practice_bn: ["Python দিয়ে Sum of Two Numbers সমাধান করো", "N আর পরের লাইনে N টি সংখ্যা পড়ে গড় প্রিন্ট করো"],
    examples: [{
      title_en: "Reading numbers", title_bn: "সংখ্যা পড়া",
      code: `a, b = map(int, input().split())
n = int(input())
values = list(map(int, input().split()))

print("a + b =", a + b)
print("count:", n, "sum:", sum(values))`,
      stdin: "12 30\n4\n5 10 15 20",
      explanation_en: "The first line has two numbers, the second has N, and the third has N values — so input() is called three times.",
      explanation_bn: "প্রথম লাইনে দুটি সংখ্যা, দ্বিতীয় লাইনে N, আর তৃতীয় লাইনে N টি মান — তাই input() তিনবার কল হয়েছে।",
    }],
  },
  {
    number: 4, slug: "if-elif-else", chapter: "conditions-and-loops", topic: "conditions", minutes: 12,
    title_en: "if, elif and else", title_bn: "if, elif ও else",
    summary_en: "Make decisions with indentation-based blocks.",
    summary_bn: "Indentation-ভিত্তিক ব্লক দিয়ে সিদ্ধান্ত নেওয়া।",
    objectives_en: ["Write if/elif/else chains", "Use and, or, not", "Chain comparisons like 0 <= x <= 100"],
    objectives_bn: ["if/elif/else লেখা", "and, or, not ব্যবহার", "0 <= x <= 100 এর মতো তুলনা জোড়া লাগানো"],
    body_en: `\`\`\`python
if marks >= 80:
    grade = "A+"
elif marks >= 60:
    grade = "A-"
else:
    grade = "F"
\`\`\`

- Each condition ends with a colon \`:\`, and the block below is **indented**.
- \`elif\` is Python's \`else if\`.
- Logical operators are words: \`and\`, \`or\`, \`not\`.
- Python allows **chained comparisons**: \`0 <= x <= 100\` works exactly as it reads (in C it would not).

A one-line conditional expression is also available: \`label = "Even" if n % 2 == 0 else "Odd"\`.`,
    body_bn: `\`\`\`python
if marks >= 80:
    grade = "A+"
elif marks >= 60:
    grade = "A-"
else:
    grade = "F"
\`\`\`

- প্রতিটি শর্তের শেষে কোলন \`:\`, আর নিচের ব্লক **Indent** করা থাকে।
- \`elif\` হলো Python-এর \`else if\`।
- Logical Operator গুলো শব্দে লেখা: \`and\`, \`or\`, \`not\`।
- Python-এ **Chained Comparison** চলে: \`0 <= x <= 100\` ঠিক যেমন পড়া যায় তেমনই কাজ করে (C-তে এটা হয় না)।

এক লাইনের শর্তযুক্ত Expression-ও আছে: \`label = "Even" if n % 2 == 0 else "Odd"\`।`,
    mistakes_en: ["Forgetting the colon after the condition", "Inconsistent indentation inside one block", "Using && and || from C"],
    mistakes_bn: ["শর্তের পরে কোলন ভুলে যাওয়া", "একই ব্লকে অসমান Indentation", "C-এর && আর || ব্যবহার করা"],
    practice_en: ["Solve Even or Odd and Leap Year in Python", "Print Positive, Negative or Zero"],
    practice_bn: ["Python দিয়ে Even or Odd আর Leap Year সমাধান করো", "Positive, Negative নাকি Zero প্রিন্ট করো"],
    examples: [{
      title_en: "Grades and chained comparisons", title_bn: "গ্রেড ও Chained Comparison",
      code: `marks = int(input())

if not 0 <= marks <= 100:
    print("Invalid")
elif marks >= 80:
    print("A+")
elif marks >= 60:
    print("A-")
elif marks >= 33:
    print("Pass")
else:
    print("F")

print("Even" if marks % 2 == 0 else "Odd")`,
      stdin: "84",
      explanation_en: "84 is within 0..100 and >= 80, so A+ is printed. The conditional expression then reports that 84 is even.",
      explanation_bn: "84 সীমার মধ্যে এবং >= 80, তাই A+ প্রিন্ট হয়। এরপর শর্তযুক্ত Expression জানায় 84 জোড়।",
    }],
  },
  {
    number: 5, slug: "for-and-range", chapter: "conditions-and-loops", topic: "loops", minutes: 15,
    title_en: "for Loops and range()", title_bn: "for Loop ও range()",
    summary_en: "Iterate over numbers and collections.",
    summary_bn: "সংখ্যা আর কালেকশনের ওপর লুপ চালানো।",
    objectives_en: ["Use range(start, stop, step)", "Loop directly over lists and strings", "Accumulate totals"],
    objectives_bn: ["range(start, stop, step) ব্যবহার", "List ও String-এর ওপর সরাসরি লুপ", "যোগফল জমা করা"],
    body_en: `Python's \`for\` loops over the **items** of something.

\`\`\`python
for i in range(1, 6):
    print(i)
\`\`\`

\`range(start, stop, step)\` produces numbers from start up to **but not including** stop. \`range(5)\` is 0..4; \`range(10, 0, -2)\` is 10, 8, 6, 4, 2.

### Looping over items
\`for ch in "campus":\` visits each character; \`for x in values:\` visits each list element. Use \`enumerate(values)\` when you also need the index.

\`break\` and \`continue\` work exactly as in C. Built-ins like \`sum()\`, \`max()\` and \`min()\` often replace a whole loop.`,
    body_bn: `Python-এর \`for\` কোনো কিছুর **উপাদানগুলোর** ওপর লুপ চালায়।

\`\`\`python
for i in range(1, 6):
    print(i)
\`\`\`

\`range(start, stop, step)\` start থেকে stop পর্যন্ত সংখ্যা দেয় — **stop বাদে**। \`range(5)\` মানে 0..4; \`range(10, 0, -2)\` মানে 10, 8, 6, 4, 2।

### উপাদানের ওপর লুপ
\`for ch in "campus":\` প্রতিটি Character-এ যায়; \`for x in values:\` List-এর প্রতিটি উপাদানে যায়। Index-ও লাগলে \`enumerate(values)\` ব্যবহার করো।

\`break\` আর \`continue\` C-এর মতোই কাজ করে। \`sum()\`, \`max()\`, \`min()\` এর মতো Built-in Function অনেক সময় পুরো একটি লুপের কাজ করে দেয়।`,
    mistakes_en: ["Expecting range(1, 5) to include 5", "Modifying a list while looping over it", "Writing for (i = 0; i < n; i++) out of C habit"],
    mistakes_bn: ["range(1, 5) এ 5 থাকবে ভাবা", "লুপ চলাকালীন একই List বদলানো", "C-এর অভ্যাসে for (i = 0; i < n; i++) লেখা"],
    practice_en: ["Solve Multiplication Table and Star Pyramid in Python", "Print the sum of all odd numbers below 100"],
    practice_bn: ["Python দিয়ে Multiplication Table আর Star Pyramid সমাধান করো", "100 এর নিচের সব বিজোড় সংখ্যার যোগফল প্রিন্ট করো"],
    examples: [{
      title_en: "range, items and enumerate", title_bn: "range, উপাদান ও enumerate",
      code: `total = 0
for i in range(1, 6):
    total += i
print("1..5 sum:", total)

print(list(range(10, 0, -3)))

for index, subject in enumerate(["C", "Python", "Math"], start=1):
    print(index, subject)`,
      explanation_en: "range(1, 6) gives 1 to 5. range(10, 0, -3) counts down by 3. enumerate pairs each item with a counter starting at 1.",
      explanation_bn: "range(1, 6) দেয় 1 থেকে 5। range(10, 0, -3) ৩ করে কমে। enumerate প্রতিটি উপাদানের সাথে 1 থেকে শুরু হওয়া একটি নম্বর জুড়ে দেয়।",
    }],
  },
  {
    number: 6, slug: "while-loops-python", chapter: "conditions-and-loops", topic: "loops", minutes: 12,
    title_en: "while Loops", title_bn: "while Loop",
    summary_en: "Repeat until a condition changes.",
    summary_bn: "শর্ত না বদলানো পর্যন্ত বারবার চালানো।",
    objectives_en: ["Write while loops", "Process digits of a number", "Avoid infinite loops"],
    objectives_bn: ["while Loop লেখা", "সংখ্যার অঙ্ক নিয়ে কাজ", "Infinite Loop এড়ানো"],
    body_en: `\`while\` repeats while its condition is true — use it when the number of steps isn't known in advance.

\`\`\`python
n = 12045
digits = 0
while n > 0:
    n //= 10
    digits += 1
\`\`\`

Remember \`//=\` (integer division). With \`/=\`, n would become a float and the loop would run hundreds of times.

Python has no do-while; write \`while True:\` with a \`break\` at the point where you want to stop.`,
    body_bn: `\`while\` শর্ত সত্য থাকা পর্যন্ত চলতে থাকে — কত ধাপ লাগবে আগে জানা না থাকলে এটি ব্যবহার করো।

\`\`\`python
n = 12045
digits = 0
while n > 0:
    n //= 10
    digits += 1
\`\`\`

\`//=\` (Integer Division) খেয়াল রাখো। \`/=\` দিলে n float হয়ে যাবে এবং লুপ শত শত বার ঘুরবে।

Python-এ do-while নেই; \`while True:\` লিখে যেখানে থামতে চাও সেখানে \`break\` দাও।`,
    mistakes_en: ["Using /= instead of //= when stripping digits", "Forgetting to change the loop variable", "Writing while True without any break"],
    mistakes_bn: ["অঙ্ক সরানোর সময় //= এর বদলে /= ব্যবহার", "লুপের Variable বদলাতে ভুলে যাওয়া", "কোনো break ছাড়া while True লেখা"],
    practice_en: ["Solve Count Digits and Reverse a Number in Python", "Find the smallest power of 2 greater than N"],
    practice_bn: ["Python দিয়ে Count Digits আর Reverse a Number সমাধান করো", "N এর চেয়ে বড় 2 এর সবচেয়ে ছোট ঘাত বের করো"],
    examples: [{
      title_en: "Digits and while True", title_bn: "অঙ্ক ও while True",
      code: `n = int(input())
original = n
reverse = 0
while n > 0:
    reverse = reverse * 10 + n % 10
    n //= 10
print(original, "reversed is", reverse)

power = 1
while True:
    if power > original:
        break
    power *= 2
print("Smallest power of 2 above", original, "is", power)`,
      stdin: "1200",
      explanation_en: "The first loop builds the reversed number digit by digit (21). The second loop doubles power until it passes 1200, then breaks.",
      explanation_bn: "প্রথম লুপ অঙ্ক ধরে ধরে উল্টো সংখ্যা তৈরি করে (21)। দ্বিতীয় লুপ power দ্বিগুণ করতে থাকে যতক্ষণ না 1200 ছাড়ায়, তারপর break।",
    }],
  },
  {
    number: 7, slug: "lists", chapter: "lists-and-strings", topic: "arrays", minutes: 15,
    title_en: "Lists", title_bn: "List",
    summary_en: "Python's flexible, growable arrays.",
    summary_bn: "Python-এর নমনীয়, বাড়ানো যায় এমন Array।",
    objectives_en: ["Create, index and slice lists", "Add and remove items", "Sort and use built-ins"],
    objectives_bn: ["List তৈরি, Index ও Slice করা", "উপাদান যোগ ও বাদ দেওয়া", "Sort ও Built-in ব্যবহার"],
    body_en: `A **list** is like a C array that can grow and hold any type.

\`\`\`python
marks = [78, 91, 85]
marks.append(66)        # add to the end
marks[0]                # 78
marks[-1]               # 66 — negative index counts from the end
marks[1:3]              # [91, 85] — a slice
\`\`\`

### Useful operations
\`len(a)\`, \`sum(a)\`, \`max(a)\`, \`min(a)\`, \`sorted(a)\` (new list), \`a.sort()\` (in place), \`a.reverse()\`, \`a[::-1]\` (reversed copy), \`x in a\` (membership).

### List comprehensions
\`squares = [x * x for x in range(1, 6)]\` builds a list in one readable line. Add a filter: \`[x for x in a if x % 2 == 0]\`.`,
    body_bn: `**List** হলো C-এর Array-এর মতো, তবে বড় হতে পারে আর যেকোনো Type রাখতে পারে।

\`\`\`python
marks = [78, 91, 85]
marks.append(66)        # শেষে যোগ
marks[0]                # 78
marks[-1]               # 66 — ঋণাত্মক Index শেষ থেকে গোনে
marks[1:3]              # [91, 85] — একটি Slice
\`\`\`

### কাজের Operation
\`len(a)\`, \`sum(a)\`, \`max(a)\`, \`min(a)\`, \`sorted(a)\` (নতুন List), \`a.sort()\` (নিজের জায়গায়), \`a.reverse()\`, \`a[::-1]\` (উল্টো কপি), \`x in a\` (আছে কিনা)।

### List Comprehension
\`squares = [x * x for x in range(1, 6)]\` এক লাইনে পরিষ্কারভাবে List তৈরি করে। ফিল্টারও দেওয়া যায়: \`[x for x in a if x % 2 == 0]\`।`,
    mistakes_en: ["Expecting a.sort() to return the sorted list (it returns None)", "Indexing past the end and getting IndexError", "Copying with b = a and then changing both"],
    mistakes_bn: ["a.sort() সাজানো List Return করবে ভাবা (এটি None দেয়)", "শেষের বাইরে Index করে IndexError পাওয়া", "b = a দিয়ে কপি করে দুটোকেই বদলে ফেলা"],
    practice_en: ["Solve Reverse an Array and Second Largest Distinct Value in Python", "Read N numbers and print only the even ones using a comprehension"],
    practice_bn: ["Python দিয়ে Reverse an Array আর Second Largest Distinct Value সমাধান করো", "N টি সংখ্যা পড়ে Comprehension দিয়ে শুধু জোড়গুলো প্রিন্ট করো"],
    examples: [{
      title_en: "List toolkit", title_bn: "List টুলকিট",
      code: `marks = [78, 91, 85]
marks.append(66)

print("All:", marks)
print("First and last:", marks[0], marks[-1])
print("Middle slice:", marks[1:3])
print("Sorted:", sorted(marks), "max:", max(marks))
print("Reversed:", marks[::-1])
print("Above 80:", [m for m in marks if m > 80])`,
      explanation_en: "append grows the list, negative indices count from the end, slicing stops before index 3, sorted returns a new list, and the comprehension filters values above 80.",
      explanation_bn: "append List বড় করে, ঋণাত্মক Index শেষ থেকে গোনে, Slice Index 3 এর আগে থামে, sorted নতুন List দেয়, আর Comprehension ৮০ এর বেশি মানগুলো বেছে নেয়।",
    }],
  },
  {
    number: 8, slug: "strings-python", chapter: "lists-and-strings", topic: "strings", minutes: 15,
    title_en: "Strings", title_bn: "String",
    summary_en: "Text processing with Python's string methods.",
    summary_bn: "Python-এর String Method দিয়ে টেক্সট প্রসেসিং।",
    objectives_en: ["Index and slice strings", "Use common string methods", "Understand immutability"],
    objectives_bn: ["String Index ও Slice করা", "প্রচলিত String Method ব্যবহার", "Immutability বোঝা"],
    body_en: `Strings index and slice exactly like lists: \`s[0]\`, \`s[-1]\`, \`s[::-1]\` (reversed).

### Common methods
- \`s.upper()\`, \`s.lower()\`
- \`s.strip()\` removes surrounding whitespace
- \`s.split()\` → list of words; \`" ".join(words)\` → back to a string
- \`s.count("a")\`, \`s.find("code")\`, \`s.replace("a", "b")\`
- \`len(s)\`, \`"code" in s\`

### Immutable
Strings cannot be changed in place — \`s[0] = "C"\` is an error. Methods return **new** strings, so write \`s = s.upper()\`.

Compare with C: no \`'\\0'\`, no \`strcmp\` — just \`==\`, and no buffer sizes to worry about.`,
    body_bn: `String-ও List-এর মতোই Index আর Slice করা যায়: \`s[0]\`, \`s[-1]\`, \`s[::-1]\` (উল্টো)।

### প্রচলিত Method
- \`s.upper()\`, \`s.lower()\`
- \`s.strip()\` দুই পাশের ফাঁকা জায়গা বাদ দেয়
- \`s.split()\` → শব্দের List; \`" ".join(words)\` → আবার String
- \`s.count("a")\`, \`s.find("code")\`, \`s.replace("a", "b")\`
- \`len(s)\`, \`"code" in s\`

### Immutable
String নিজের জায়গায় বদলানো যায় না — \`s[0] = "C"\` লিখলে Error। Method গুলো **নতুন** String Return করে, তাই লেখো \`s = s.upper()\`।

C-এর সাথে তুলনা করো: কোনো \`'\\0'\` নেই, \`strcmp\` নেই — শুধু \`==\`, আর Buffer-এর সাইজ নিয়েও ভাবতে হয় না।`,
    mistakes_en: ["Trying to assign to s[i]", "Calling s.upper() without storing the result", "Forgetting strip() and comparing strings with trailing spaces"],
    mistakes_bn: ["s[i] তে মান বসানোর চেষ্টা", "ফলাফল না রেখে শুধু s.upper() কল করা", "strip() ভুলে গিয়ে শেষে স্পেসসহ String তুলনা করা"],
    practice_en: ["Solve Count Vowels, Palindrome Check and Word Count in Python", "Capitalise the first letter of every word"],
    practice_bn: ["Python দিয়ে Count Vowels, Palindrome Check আর Word Count সমাধান করো", "প্রতিটি শব্দের প্রথম অক্ষর বড় হাতে করো"],
    examples: [{
      title_en: "String methods", title_bn: "String Method",
      code: `line = "  learn practice grow  "
words = line.split()

print(words)
print(" | ".join(w.upper() for w in words))
print("Reversed:", "campuscode"[::-1])
print("Vowels in campuscode:", sum("campuscode".count(v) for v in "aeiou"))
print("level is palindrome:", "level" == "level"[::-1])`,
      explanation_en: "split() ignores the extra spaces and returns three words. join puts them back together with a separator. Slicing with [::-1] reverses a string.",
      explanation_bn: "split() অতিরিক্ত স্পেস উপেক্ষা করে তিনটি শব্দ দেয়। join সেগুলো একটি বিভাজক দিয়ে আবার জোড়া লাগায়। [::-1] Slice দিয়ে String উল্টে যায়।",
    }],
  },
  {
    number: 9, slug: "dictionaries", chapter: "lists-and-strings", topic: "arrays", minutes: 15,
    title_en: "Dictionaries", title_bn: "Dictionary",
    summary_en: "Store key–value pairs for fast lookups.",
    summary_bn: "দ্রুত খোঁজার জন্য Key–Value জোড়া রাখা।",
    objectives_en: ["Create and update dictionaries", "Count frequencies", "Loop over keys and values"],
    objectives_bn: ["Dictionary তৈরি ও আপডেট", "Frequency গণনা", "Key ও Value এর ওপর লুপ"],
    body_en: `A **dictionary** maps keys to values:

\`\`\`python
cgpa = {"Araf": 3.45, "Mim": 3.92}
cgpa["Tanvir"] = 3.60
\`\`\`

- \`d[key]\` reads a value (KeyError if missing); \`d.get(key, default)\` is safe.
- \`key in d\` checks membership in constant time — much faster than searching a list.
- \`for name, value in d.items():\` loops over pairs.

### Counting
The classic frequency pattern: \`count[x] = count.get(x, 0) + 1\`. This replaces C's counting array and works for any kind of key, not just small integers.`,
    body_bn: `**Dictionary** Key থেকে Value তে Map করে:

\`\`\`python
cgpa = {"Araf": 3.45, "Mim": 3.92}
cgpa["Tanvir"] = 3.60
\`\`\`

- \`d[key]\` একটি মান পড়ে (না থাকলে KeyError); \`d.get(key, default)\` নিরাপদ।
- \`key in d\` খুব দ্রুত যাচাই করে — List-এ খোঁজার চেয়ে অনেক দ্রুত।
- \`for name, value in d.items():\` জোড়াগুলোর ওপর লুপ চালায়।

### গণনা
Frequency গোনার ক্লাসিক প্যাটার্ন: \`count[x] = count.get(x, 0) + 1\`। এটি C-এর Counting Array এর কাজ করে, এবং শুধু ছোট পূর্ণসংখ্যা নয়, যেকোনো ধরনের Key-এর জন্য চলে।`,
    mistakes_en: ["Reading a missing key with d[key]", "Using a list as a key (keys must be immutable)", "Expecting a particular order without sorting"],
    mistakes_bn: ["d[key] দিয়ে নেই এমন Key পড়া", "List কে Key হিসেবে ব্যবহার (Key Immutable হতে হয়)", "Sort না করেই নির্দিষ্ট ক্রম আশা করা"],
    practice_en: ["Solve Frequency of Each Value in Python", "Count how often each word appears in a sentence"],
    practice_bn: ["Python দিয়ে Frequency of Each Value সমাধান করো", "একটি বাক্যে প্রতিটি শব্দ কতবার এসেছে গোনো"],
    examples: [{
      title_en: "Counting words", title_bn: "শব্দ গণনা",
      code: `text = "code learn code practice code grow learn"
count = {}
for word in text.split():
    count[word] = count.get(word, 0) + 1

for word in sorted(count):
    print(word, count[word])

print("Most frequent:", max(count, key=count.get))`,
      explanation_en: "get(word, 0) returns 0 for new words, so each word's counter starts correctly. sorted(count) prints keys alphabetically; max with key=count.get finds the most frequent word.",
      explanation_bn: "নতুন শব্দের জন্য get(word, 0) দেয় 0, তাই প্রতিটি কাউন্টার ঠিকভাবে শুরু হয়। sorted(count) Key গুলো বর্ণানুক্রমে দেয়; key=count.get সহ max সবচেয়ে বেশিবার আসা শব্দটি খুঁজে দেয়।",
    }],
  },
  {
    number: 10, slug: "defining-functions", chapter: "functions", topic: "functions", minutes: 15,
    title_en: "Defining Functions", title_bn: "Function তৈরি",
    summary_en: "def, parameters, return values and default arguments.",
    summary_bn: "def, Parameter, Return Value আর Default Argument।",
    objectives_en: ["Define functions with def", "Return one or several values", "Use default and keyword arguments"],
    objectives_bn: ["def দিয়ে Function তৈরি", "এক বা একাধিক মান Return করা", "Default ও Keyword Argument ব্যবহার"],
    body_en: `\`\`\`python
def count_vowels(text):
    total = 0
    for ch in text:
        if ch in "aeiou":
            total += 1
    return total
\`\`\`

- No types in the signature; indentation marks the body.
- A function without \`return\` returns \`None\`.
- **Several return values:** \`return lo, hi\` returns a tuple; unpack with \`a, b = f()\`. In C you'd need pointers for this.

### Default and keyword arguments
\`def greet(name, greeting="Hello"):\` — callers may omit \`greeting\`, or pass it by name: \`greet("Mim", greeting="Salam")\`.`,
    body_bn: `\`\`\`python
def count_vowels(text):
    total = 0
    for ch in text:
        if ch in "aeiou":
            total += 1
    return total
\`\`\`

- Signature-এ কোনো Type নেই; Indentation দিয়ে Body বোঝানো হয়।
- \`return\` না থাকলে Function \`None\` Return করে।
- **একাধিক Return Value:** \`return lo, hi\` একটি Tuple দেয়; \`a, b = f()\` দিয়ে আলাদা করো। C-তে এর জন্য Pointer লাগত।

### Default ও Keyword Argument
\`def greet(name, greeting="Hello"):\` — কলার চাইলে \`greeting\` বাদ দিতে পারে, অথবা নাম ধরে পাঠাতে পারে: \`greet("Mim", greeting="Salam")\`।`,
    mistakes_en: ["Printing inside the function instead of returning", "Forgetting to call the function (writing f instead of f())", "Using a mutable default like def f(a=[])"],
    mistakes_bn: ["Return না করে Function-এর ভেতরেই প্রিন্ট করা", "Function কল করতে ভুলে যাওয়া (f() এর বদলে f লেখা)", "def f(a=[]) এর মতো পরিবর্তনযোগ্য Default ব্যবহার"],
    practice_en: ["Solve Prime Range and GCD and LCM in Python", "Write min_max(values) that returns both values"],
    practice_bn: ["Python দিয়ে Prime Range আর GCD and LCM সমাধান করো", "দুটি মানই Return করে এমন min_max(values) লেখো"],
    examples: [{
      title_en: "Return values and defaults", title_bn: "Return Value ও Default",
      code: `def count_vowels(text):
    total = 0
    for ch in text:
        if ch in "aeiou":
            total += 1
    return total

def min_max(values):
    return min(values), max(values)

def greet(name, greeting="Hello"):
    return f"{greeting}, {name}!"

print(count_vowels("campuscode"))
low, high = min_max([7, 2, 9, 4])
print(low, high)
print(greet("Nafi"))
print(greet("Mim", greeting="Salam"))`,
      explanation_en: "count_vowels returns 4. min_max returns a tuple that is unpacked into low and high. greet uses its default greeting unless one is passed by keyword.",
      explanation_bn: "count_vowels দেয় 4। min_max একটি Tuple দেয় যা low আর high এ ভাগ হয়। greet নিজের Default সম্ভাষণ ব্যবহার করে, যদি না Keyword দিয়ে অন্যটি পাঠানো হয়।",
    }],
  },
  {
    number: 11, slug: "scope-and-recursion", chapter: "functions", topic: "functions", minutes: 15,
    title_en: "Scope and Recursion", title_bn: "Scope ও Recursion",
    summary_en: "Where variables live, and functions that call themselves.",
    summary_bn: "Variable কোথায় থাকে, আর যে Function নিজেকেই কল করে।",
    objectives_en: ["Distinguish local and global variables", "Write recursive functions with base cases", "Know Python's recursion limit"],
    objectives_bn: ["Local ও Global Variable আলাদা করা", "Base Case সহ Recursive Function লেখা", "Python-এর Recursion সীমা জানা"],
    body_en: `### Scope
Variables assigned inside a function are **local** — they disappear when it returns and don't affect variables outside with the same name. Prefer passing values in and returning results out over using \`global\`.

### Recursion
Same rules as in C: a **base case** and a step towards it.

\`\`\`python
def factorial(n):
    if n <= 1:
        return 1
    return n * factorial(n - 1)
\`\`\`

Python limits recursion depth (about 1000 calls by default), so for long chains a loop is safer. Recursion shines for naturally recursive problems: GCD, power, tree-like structures.`,
    body_bn: `### Scope
Function-এর ভেতরে মান বসানো Variable হলো **Local** — Function শেষ হলে হারিয়ে যায় এবং বাইরের একই নামের Variable-কে প্রভাবিত করে না। \`global\` ব্যবহারের চেয়ে মান পাঠিয়ে ফলাফল Return করাই ভালো।

### Recursion
C-এর মতোই নিয়ম: একটি **Base Case** এবং তার দিকে এগোনো একটি ধাপ।

\`\`\`python
def factorial(n):
    if n <= 1:
        return 1
    return n * factorial(n - 1)
\`\`\`

Python Recursion-এর গভীরতা সীমিত রাখে (ডিফল্টভাবে প্রায় ১০০০টি কল), তাই লম্বা শৃঙ্খলের জন্য লুপ বেশি নিরাপদ। যেসব সমস্যা স্বাভাবিকভাবেই Recursive — যেমন GCD, Power, গাছের মতো গঠন — সেখানে Recursion দারুণ কাজ করে।`,
    mistakes_en: ["Missing the base case", "Recursing 10^5 levels deep and hitting RecursionError", "Expecting a local assignment to change a global variable"],
    mistakes_bn: ["Base Case না রাখা", "১০^৫ স্তর গভীরে Recursion করে RecursionError পাওয়া", "Local Assignment দিয়ে Global Variable বদলাবে ভাবা"],
    practice_en: ["Solve Power Function and Factorial in Python", "Write a recursive function that sums the digits of n"],
    practice_bn: ["Python দিয়ে Power Function আর Factorial সমাধান করো", "n এর অঙ্কের যোগফল বের করে এমন Recursive Function লেখো"],
    examples: [{
      title_en: "Local scope and recursion", title_bn: "Local Scope ও Recursion",
      code: `count = 10

def change():
    count = 99          # a new local variable
    return count

def power(base, exp):
    if exp == 0:
        return 1
    half = power(base, exp // 2)
    return half * half * (base if exp % 2 else 1)

def digit_sum(n):
    return n if n < 10 else n % 10 + digit_sum(n // 10)

print(change(), count)
print(power(2, 30))
print(digit_sum(2024))`,
      explanation_en: "change() creates its own local count, so the global stays 10. power halves the exponent each call (fast exponentiation). digit_sum peels off one digit per call.",
      explanation_bn: "change() নিজের Local count তৈরি করে, তাই Global টি 10-ই থাকে। power প্রতিবার ঘাত অর্ধেক করে (দ্রুত ঘাত নির্ণয়)। digit_sum প্রতি কলে একটি করে অঙ্ক আলাদা করে।",
    }],
  },
  {
    number: 12, slug: "python-mini-project", chapter: "functions", topic: null, minutes: 30, is_project: true,
    title_en: "Mini Project: Result Sheet", title_bn: "মিনি প্রজেক্ট: রেজাল্ট শিট",
    summary_en: "Combine input, lists, dictionaries and functions in one program.",
    summary_bn: "ইনপুট, List, Dictionary আর Function একটি প্রোগ্রামে মেলানো।",
    objectives_en: ["Structure a program into functions", "Parse multi-line input", "Produce a neatly formatted report"],
    objectives_bn: ["প্রোগ্রামকে Function-এ সাজানো", "একাধিক লাইনের ইনপুট পড়া", "সুন্দরভাবে ফরম্যাট করা রিপোর্ট তৈরি"],
    body_en: `### Goal
Read students and their marks, then print a result sheet with grades, the class average and the topper.

### Plan
1. \`read_students()\` — read N, then N lines of \`name mark\`, return a list of tuples.
2. \`grade(mark)\` — return the letter grade.
3. \`report(students)\` — print a formatted table using f-string widths like \`{name:<10}\` and \`{mark:>3}\`.

Splitting the work into small functions makes each part easy to test on its own in the IDE.

### Extend it
Add several subjects per student with a dictionary, or sort the sheet by marks with \`sorted(students, key=lambda s: s[1], reverse=True)\`.`,
    body_bn: `### লক্ষ্য
শিক্ষার্থী আর তাদের নম্বর পড়ে Grade, ক্লাসের গড় আর সর্বোচ্চ নম্বরপ্রাপ্তসহ একটি রেজাল্ট শিট প্রিন্ট করা।

### পরিকল্পনা
1. \`read_students()\` — N পড়ো, তারপর N লাইনে \`name mark\` পড়ে Tuple-এর List Return করো।
2. \`grade(mark)\` — Letter Grade Return করো।
3. \`report(students)\` — \`{name:<10}\` আর \`{mark:>3}\` এর মতো f-string প্রস্থ দিয়ে সাজানো টেবিল প্রিন্ট করো।

কাজকে ছোট Function-এ ভাগ করলে IDE-তে প্রতিটি অংশ আলাদাভাবে পরীক্ষা করা সহজ হয়।

### আরও বাড়াও
Dictionary দিয়ে প্রতিজন শিক্ষার্থীর একাধিক বিষয় যোগ করো, অথবা \`sorted(students, key=lambda s: s[1], reverse=True)\` দিয়ে নম্বর অনুযায়ী সাজাও।`,
    mistakes_en: ["Doing everything in one long block", "Forgetting to convert marks with int()", "Hard-coding column widths that break with long names"],
    mistakes_bn: ["সবকিছু একটি লম্বা ব্লকে লেখা", "int() দিয়ে নম্বর রূপান্তর করতে ভুলে যাওয়া", "নির্দিষ্ট কলাম-প্রস্থ ধরে নেওয়ায় লম্বা নামে টেবিল ভেঙে যাওয়া"],
    practice_en: ["Sort the result sheet by marks, highest first", "Print how many students received each grade"],
    practice_bn: ["রেজাল্ট শিট নম্বর অনুযায়ী বেশি থেকে কম ক্রমে সাজাও", "প্রতিটি Grade কতজন পেয়েছে প্রিন্ট করো"],
    examples: [{
      title_en: "Result sheet", title_bn: "রেজাল্ট শিট",
      code: `def read_students():
    n = int(input())
    students = []
    for _ in range(n):
        name, mark = input().split()
        students.append((name, int(mark)))
    return students

def grade(mark):
    if mark >= 80: return "A+"
    if mark >= 70: return "A"
    if mark >= 60: return "A-"
    if mark >= 33: return "Pass"
    return "F"

def report(students):
    print(f"{'Name':<10}{'Mark':>5}  Grade")
    for name, mark in students:
        print(f"{name:<10}{mark:>5}  {grade(mark)}")
    average = sum(m for _, m in students) / len(students)
    topper = max(students, key=lambda s: s[1])
    print(f"Average: {average:.2f}  Topper: {topper[0]}")

report(read_students())`,
      stdin: "4\nAraf 78\nNafi 91\nMim 85\nRiya 29",
      explanation_en: "read_students parses the input into tuples, grade maps marks to letters, and report formats aligned columns with f-string widths before printing the average and topper.",
      explanation_bn: "read_students ইনপুট থেকে Tuple তৈরি করে, grade নম্বরকে Grade-এ রূপান্তর করে, আর report f-string প্রস্থ দিয়ে কলাম সাজিয়ে গড় ও সর্বোচ্চ নম্বরপ্রাপ্তের নাম প্রিন্ট করে।",
    }],
  },
];
