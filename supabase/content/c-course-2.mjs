// C Programming course — lessons 17–32.

export const cLessons2 = [
  {
    number: 17, slug: "array-introduction", chapter: "arrays", topic: "arrays", minutes: 15,
    title_en: "Array Introduction", title_bn: "Array পরিচিতি",
    summary_en: "Store many values of the same type under one name.",
    summary_bn: "একই Type-এর অনেক মান একটি নামে রাখা।",
    objectives_en: ["Declare and initialise arrays", "Access elements with zero-based indices", "Read and print arrays with loops"],
    objectives_bn: ["Array Declare ও Initialize করা", "শূন্য থেকে শুরু হওয়া Index দিয়ে উপাদান পড়া", "লুপ দিয়ে Array ইনপুট ও প্রিন্ট করা"],
    body_en: `Imagine storing the marks of 50 students in 50 separate variables — painful. An **array** holds many values of the same type in consecutive memory.

\`\`\`c
int marks[5] = {78, 91, 85, 66, 70};
\`\`\`

### Indexing
Elements are numbered from **0**. \`marks[0]\` is 78 and \`marks[4]\` is 70. There is **no** \`marks[5]\` — accessing it reads memory that doesn't belong to the array, which can give garbage or crash the program. C does not check this for you.

### Arrays and loops
Arrays and for loops belong together: \`for (int i = 0; i < n; i++)\` visits every element exactly once. Read with \`scanf("%d", &a[i])\` and print with \`printf("%d ", a[i])\`.

The size in the declaration must be large enough for the biggest input the problem allows.`,
    body_bn: `৫০ জন শিক্ষার্থীর নম্বর ৫০টি আলাদা Variable-এ রাখার কথা ভাবো — খুবই ঝামেলার। **Array** একই Type-এর অনেকগুলো মান পাশাপাশি মেমোরিতে রাখে।

\`\`\`c
int marks[5] = {78, 91, 85, 66, 70};
\`\`\`

### Index
উপাদানগুলোর নম্বর শুরু হয় **0** থেকে। \`marks[0]\` হলো 78 আর \`marks[4]\` হলো 70। \`marks[5]\` বলে **কিছু নেই** — এটি পড়লে Array-এর বাইরের মেমোরি পড়া হয়, যাতে Garbage আসতে পারে বা প্রোগ্রাম Crash করতে পারে। C নিজে থেকে এটা যাচাই করে না।

### Array আর লুপ
Array আর for লুপ একসাথেই চলে: \`for (int i = 0; i < n; i++)\` প্রতিটি উপাদানে ঠিক একবার যায়। ইনপুট নিতে \`scanf("%d", &a[i])\` আর প্রিন্ট করতে \`printf("%d ", a[i])\`।

Declaration-এ দেওয়া সাইজ সমস্যায় অনুমোদিত সবচেয়ে বড় ইনপুটের জন্য যথেষ্ট হতে হবে।`,
    mistakes_en: ["Looping with i <= n and reading past the end", "Forgetting & in scanf(\"%d\", &a[i])", "Declaring an array too small for the input limits"],
    mistakes_bn: ["i <= n দিয়ে লুপ চালিয়ে শেষের বাইরে পড়া", "scanf(\"%d\", &a[i]) এ & ভুলে যাওয়া", "ইনপুটের সীমার তুলনায় ছোট Array Declare করা"],
    practice_en: ["Read N numbers and print them in reverse order", "Read N marks and print how many are above the average"],
    practice_bn: ["N টি সংখ্যা ইনপুট নিয়ে উল্টো ক্রমে প্রিন্ট করো", "N টি নম্বর ইনপুট নিয়ে গড়ের চেয়ে বেশি কয়টি তা প্রিন্ট করো"],
    examples: [{
      title_en: "Read, sum and average", title_bn: "ইনপুট, যোগফল ও গড়",
      code: `#include <stdio.h>

int main(void) {
    int n, a[100];
    scanf("%d", &n);
    int sum = 0;
    for (int i = 0; i < n; i++) {
        scanf("%d", &a[i]);
        sum += a[i];
    }
    printf("First: %d, Last: %d\\n", a[0], a[n - 1]);
    printf("Average: %.2f\\n", (double)sum / n);
    return 0;
}`,
      stdin: "5\n78 91 85 66 70",
      explanation_en: "The loop stores each value in a[i] and adds it to sum. The first element is a[0] and the last is a[n-1].",
      explanation_bn: "লুপ প্রতিটি মান a[i] তে রাখে এবং sum-এ যোগ করে। প্রথম উপাদান a[0], শেষটি a[n-1]।",
    }],
  },
  {
    number: 18, slug: "array-operations", chapter: "arrays", topic: "arrays", minutes: 20,
    title_en: "Array Operations", title_bn: "Array-এর বিভিন্ন কাজ",
    summary_en: "Search, find the maximum, reverse and count in arrays.",
    summary_bn: "Array-তে খোঁজা, সর্বোচ্চ মান বের করা, উল্টানো আর গণনা করা।",
    objectives_en: ["Find maximum and minimum", "Search for a value (linear search)", "Reverse an array in place"],
    objectives_bn: ["সর্বোচ্চ ও সর্বনিম্ন মান বের করা", "Linear Search দিয়ে মান খোঁজা", "Array-কে নিজের জায়গাতেই উল্টানো"],
    body_en: `Most array problems combine a few basic operations.

### Maximum
Start with \`max = a[0]\` (not 0 — all values might be negative), then compare with every other element.

### Linear search
Walk from index 0 to n−1; when \`a[i] == key\`, remember \`i\` and \`break\`. If the loop finishes without finding it, report "not found".

### Reverse in place
Swap \`a[i]\` with \`a[n-1-i]\` for \`i\` from 0 up to \`n/2 - 1\`. Going all the way to \`n\` would swap everything back!

### Counting
Use a counter that starts at 0 and increases when a condition holds — e.g. how many elements are even.`,
    body_bn: `বেশিরভাগ Array সমস্যা কয়েকটি মৌলিক কাজের সমন্বয়।

### সর্বোচ্চ মান
\`max = a[0]\` দিয়ে শুরু করো (0 দিয়ে নয় — সব মান ঋণাত্মক হতে পারে), তারপর বাকি প্রতিটি উপাদানের সাথে তুলনা করো।

### Linear Search
Index 0 থেকে n−1 পর্যন্ত যাও; যখন \`a[i] == key\`, তখন \`i\` মনে রাখো এবং \`break\` দাও। লুপ শেষ হয়েও না পেলে "not found" জানাও।

### নিজের জায়গায় উল্টানো
\`i\` কে 0 থেকে \`n/2 - 1\` পর্যন্ত নিয়ে \`a[i]\` আর \`a[n-1-i]\` swap করো। \`n\` পর্যন্ত গেলে সব আবার আগের জায়গায় ফিরে যাবে!

### গণনা
0 থেকে শুরু হওয়া একটি কাউন্টার রাখো, শর্ত মিললে বাড়াও — যেমন কয়টি উপাদান জোড়।`,
    mistakes_en: ["Initialising max with 0", "Reversing with a loop up to n, which undoes the swaps", "Printing 'not found' inside the search loop for every mismatch"],
    mistakes_bn: ["max কে 0 দিয়ে শুরু করা", "n পর্যন্ত লুপ চালিয়ে উল্টানো, ফলে swap বাতিল হয়ে যাওয়া", "খোঁজার লুপের ভেতরে প্রতিটি অমিলে 'not found' প্রিন্ট করা"],
    practice_en: ["Solve Reverse an Array in Place and Maximum and Minimum", "Find the index of the first negative number, or -1"],
    practice_bn: ["Reverse an Array in Place আর Maximum and Minimum সমাধান করো", "প্রথম ঋণাত্মক সংখ্যার Index বের করো, না থাকলে -1"],
    examples: [{
      title_en: "Max, search and reverse", title_bn: "সর্বোচ্চ, খোঁজা ও উল্টানো",
      code: `#include <stdio.h>

int main(void) {
    int a[] = {4, -2, 9, 7, 1};
    int n = 5, key = 7, pos = -1;

    int max = a[0];
    for (int i = 1; i < n; i++)
        if (a[i] > max) max = a[i];

    for (int i = 0; i < n; i++)
        if (a[i] == key) { pos = i; break; }

    for (int i = 0; i < n / 2; i++) {
        int t = a[i]; a[i] = a[n - 1 - i]; a[n - 1 - i] = t;
    }

    printf("Max: %d\\n", max);
    printf("%d found at index %d\\n", key, pos);
    printf("Reversed:");
    for (int i = 0; i < n; i++) printf(" %d", a[i]);
    printf("\\n");
    return 0;
}`,
      explanation_en: "Three separate loops: one finds the maximum (9), one finds 7 at index 3, and one swaps pairs from both ends to reverse the array.",
      explanation_bn: "তিনটি আলাদা লুপ: একটি সর্বোচ্চ মান (9) বের করে, একটি 7 কে Index 3 এ খুঁজে পায়, আরেকটি দুই প্রান্ত থেকে জোড়া swap করে Array উল্টে দেয়।",
    }],
  },
  {
    number: 19, slug: "two-dimensional-array", chapter: "arrays", topic: "arrays", minutes: 20,
    title_en: "Two-Dimensional Array", title_bn: "দ্বিমাত্রিক Array",
    summary_en: "Represent tables and matrices with rows and columns.",
    summary_bn: "সারি ও কলাম দিয়ে টেবিল ও ম্যাট্রিক্স প্রকাশ করা।",
    objectives_en: ["Declare a 2D array", "Traverse it with nested loops", "Compute row and column totals"],
    objectives_bn: ["2D Array Declare করা", "Nested Loop দিয়ে প্রতিটি ঘরে যাওয়া", "সারি ও কলামের যোগফল বের করা"],
    body_en: `A **two-dimensional array** is a table: \`int m[3][4];\` has 3 rows and 4 columns. \`m[i][j]\` is the element in row \`i\`, column \`j\` (both from 0).

\`\`\`c
int m[2][3] = {
    {1, 2, 3},
    {4, 5, 6}
};
\`\`\`

### Traversal
Use nested loops — the outer one for rows, the inner one for columns. Printing a newline after each row reproduces the table layout.

### Memory layout
C stores 2D arrays **row by row**. Visiting elements in row order (outer loop over rows) is the natural and fastest way.

Typical problems: matrix addition, transpose (\`t[j][i] = m[i][j]\`), row/column sums, and searching a grid.`,
    body_bn: `**দ্বিমাত্রিক Array** হলো একটি টেবিল: \`int m[3][4];\` এ ৩টি সারি আর ৪টি কলাম। \`m[i][j]\` হলো \`i\` নম্বর সারি আর \`j\` নম্বর কলামের উপাদান (দুটোই 0 থেকে শুরু)।

\`\`\`c
int m[2][3] = {
    {1, 2, 3},
    {4, 5, 6}
};
\`\`\`

### প্রতিটি ঘরে যাওয়া
Nested Loop ব্যবহার করো — বাইরেরটি সারির জন্য, ভেতরেরটি কলামের জন্য। প্রতিটি সারির শেষে Newline দিলে টেবিলের মতো দেখায়।

### মেমোরিতে বিন্যাস
C দ্বিমাত্রিক Array রাখে **সারি ধরে ধরে**। তাই সারির ক্রমে (বাইরের লুপ সারির ওপর) উপাদানগুলোতে যাওয়াই স্বাভাবিক এবং সবচেয়ে দ্রুত।

সাধারণ সমস্যা: ম্যাট্রিক্স যোগ, Transpose (\`t[j][i] = m[i][j]\`), সারি/কলামের যোগফল, আর গ্রিডে খোঁজা।`,
    mistakes_en: ["Mixing up m[i][j] and m[j][i]", "Writing m[i, j] — C needs m[i][j]", "Declaring a huge 2D array inside main and overflowing the stack"],
    mistakes_bn: ["m[i][j] আর m[j][i] গুলিয়ে ফেলা", "m[i, j] লেখা — C-তে লিখতে হয় m[i][j]", "main এর ভেতরে বিশাল 2D Array Declare করে Stack Overflow ঘটানো"],
    practice_en: ["Read a 3×3 matrix and print its transpose", "Add two R×C matrices"],
    practice_bn: ["একটি 3×3 ম্যাট্রিক্স ইনপুট নিয়ে তার Transpose প্রিন্ট করো", "দুটি R×C ম্যাট্রিক্স যোগ করো"],
    examples: [{
      title_en: "Matrix and its transpose", title_bn: "ম্যাট্রিক্স ও তার Transpose",
      code: `#include <stdio.h>

int main(void) {
    int m[2][3] = {{1, 2, 3}, {4, 5, 6}};

    printf("Matrix:\\n");
    for (int i = 0; i < 2; i++) {
        for (int j = 0; j < 3; j++) printf("%d ", m[i][j]);
        printf("\\n");
    }

    printf("Transpose:\\n");
    for (int j = 0; j < 3; j++) {
        for (int i = 0; i < 2; i++) printf("%d ", m[i][j]);
        printf("\\n");
    }
    return 0;
}`,
      explanation_en: "The transpose swaps the roles of rows and columns, so the outer loop now runs over columns j and the inner loop over rows i.",
      explanation_bn: "Transpose-এ সারি আর কলামের ভূমিকা বদলে যায়, তাই এখন বাইরের লুপ চলে কলাম j এর ওপর আর ভেতরেরটি সারি i এর ওপর।",
    }],
  },
  {
    number: 20, slug: "function-introduction", chapter: "functions", topic: "functions", minutes: 20,
    title_en: "Function Introduction", title_bn: "Function পরিচিতি",
    summary_en: "Write your own functions with parameters and return values.",
    summary_bn: "Parameter ও Return Value সহ নিজের Function লেখা।",
    objectives_en: ["Define and call a function", "Pass parameters and return a value", "Use function prototypes"],
    objectives_bn: ["Function তৈরি ও কল করা", "Parameter পাঠানো ও মান Return করা", "Function Prototype ব্যবহার করা"],
    body_en: `A **function** is a named block of code that does one job. You already use \`printf\` and \`scanf\`; now you'll write your own.

\`\`\`c
int square(int x) {
    return x * x;
}
\`\`\`

- \`int\` before the name is the **return type**; use \`void\` if nothing is returned.
- \`int x\` is a **parameter** — a local variable that receives the argument's value.
- \`return\` sends a value back and ends the function.

### Pass by value
C copies arguments into parameters. Changing \`x\` inside \`square\` does **not** change the caller's variable.

### Prototypes
If you define a function below \`main\`, declare its prototype above: \`int square(int x);\`. The compiler then knows its signature before it is used.

Functions make programs shorter, easier to test and easier to read.`,
    body_bn: `**Function** হলো একটি নাম দেওয়া কোডের ব্লক যা একটি নির্দিষ্ট কাজ করে। \`printf\` আর \`scanf\` তুমি আগেই ব্যবহার করছ; এবার নিজে লিখবে।

\`\`\`c
int square(int x) {
    return x * x;
}
\`\`\`

- নামের আগের \`int\` হলো **Return Type**; কিছু Return না করলে \`void\` লেখো।
- \`int x\` হলো **Parameter** — একটি Local Variable যা Argument-এর মান গ্রহণ করে।
- \`return\` একটি মান ফেরত পাঠায় এবং Function শেষ করে।

### Pass by Value
C Argument-এর মান Parameter-এ কপি করে। \`square\` এর ভেতরে \`x\` বদলালে কলারের Variable **বদলায় না**।

### Prototype
\`main\` এর নিচে Function লিখলে ওপরে তার Prototype দাও: \`int square(int x);\`। তাহলে ব্যবহারের আগেই Compiler তার গঠন জেনে যায়।

Function প্রোগ্রামকে ছোট, পরীক্ষা করতে সহজ আর পড়তে সহজ করে।`,
    mistakes_en: ["Forgetting to return a value from a non-void function", "Calling a function before declaring it", "Expecting a function to modify the caller's variable without pointers"],
    mistakes_bn: ["void নয় এমন Function থেকে মান Return করতে ভুলে যাওয়া", "Declare করার আগেই Function কল করা", "Pointer ছাড়াই Function দিয়ে কলারের Variable বদলানোর আশা করা"],
    practice_en: ["Write int maxOf(int a, int b) and use it to find the largest of three numbers", "Write a void function that prints a line of N dashes"],
    practice_bn: ["int maxOf(int a, int b) লিখে তিনটি সংখ্যার মধ্যে বড়টি বের করো", "N টি ড্যাশের একটি লাইন প্রিন্ট করে এমন একটি void Function লেখো"],
    examples: [{
      title_en: "Prototype, definition and call", title_bn: "Prototype, Definition ও Call",
      code: `#include <stdio.h>

int square(int x);
void printLine(int n);

int main(void) {
    int a = 7;
    printLine(12);
    printf("%d squared is %d\\n", a, square(a));
    printf("a is still %d\\n", a);
    printLine(12);
    return 0;
}

int square(int x) {
    x = x * x;      /* changes only the local copy */
    return x;
}

void printLine(int n) {
    for (int i = 0; i < n; i++) printf("-");
    printf("\\n");
}`,
      explanation_en: "square changes its own copy x, so a stays 7 in main. printLine is void: it does its job and returns nothing.",
      explanation_bn: "square নিজের কপি x বদলায়, তাই main-এ a থাকে 7-ই। printLine void — কাজ করে কিন্তু কিছু Return করে না।",
    }],
  },
  {
    number: 21, slug: "function-exercises", chapter: "functions", topic: "functions", minutes: 25,
    title_en: "Function Exercises", title_bn: "Function অনুশীলন",
    summary_en: "Practise decomposing problems into functions, including recursion.",
    summary_bn: "সমস্যাকে Function-এ ভাগ করার অনুশীলন, Recursion সহ।",
    objectives_en: ["Design functions that do one thing", "Pass arrays to functions", "Write a simple recursive function"],
    objectives_bn: ["একটি কাজ করে এমন Function ডিজাইন করা", "Function-এ Array পাঠানো", "একটি সহজ Recursive Function লেখা"],
    body_en: `Good functions are **small** and **named after what they return or do**: \`isPrime\`, \`gcd\`, \`sumArray\`.

### Arrays as parameters
\`int sumArray(int a[], int n)\` — the size isn't passed automatically, so always send \`n\` too. Unlike plain variables, changes to array elements inside the function **are** visible to the caller (you'll see why in the pointers lesson).

### Recursion
A function may call itself. Every recursive function needs:
1. a **base case** that returns without recursing, and
2. a **recursive case** that moves towards the base case.

\`gcd(a, b) = gcd(b, a % b)\` with base case \`gcd(a, 0) = a\` is a classic example. Without a base case, recursion never stops and the program crashes (stack overflow).`,
    body_bn: `ভালো Function হয় **ছোট** এবং **যা Return করে বা যা করে সেই নামে**: \`isPrime\`, \`gcd\`, \`sumArray\`।

### Parameter হিসেবে Array
\`int sumArray(int a[], int n)\` — সাইজ নিজে থেকে যায় না, তাই সবসময় \`n\` পাঠাও। সাধারণ Variable-এর মতো নয়, Function-এর ভেতরে Array-এর উপাদান বদলালে তা কলারও **দেখতে পায়** (কেন — তা Pointer লেসনে জানবে)।

### Recursion
একটি Function নিজেকেই কল করতে পারে। প্রতিটি Recursive Function-এর দরকার:
1. একটি **Base Case** যা আর Recursion না করে Return করে, এবং
2. একটি **Recursive Case** যা Base Case-এর দিকে এগোয়।

\`gcd(a, b) = gcd(b, a % b)\`, আর Base Case \`gcd(a, 0) = a\` — এটি একটি ক্লাসিক উদাহরণ। Base Case না থাকলে Recursion কখনো থামে না এবং প্রোগ্রাম Crash করে (Stack Overflow)।`,
    mistakes_en: ["Missing the base case in recursion", "Using sizeof(a) inside a function to get the array length", "Writing one huge function instead of several small ones"],
    mistakes_bn: ["Recursion-এ Base Case না রাখা", "Function-এর ভেতরে sizeof(a) দিয়ে Array-এর দৈর্ঘ্য বের করার চেষ্টা", "কয়েকটি ছোট Function এর বদলে একটি বিশাল Function লেখা"],
    practice_en: ["Solve Prime Range, GCD and LCM and Power Function", "Write a recursive function that returns the sum of digits of n"],
    practice_bn: ["Prime Range, GCD and LCM ও Power Function সমাধান করো", "n এর অঙ্কগুলোর যোগফল Return করে এমন একটি Recursive Function লেখো"],
    examples: [{
      title_en: "Arrays and recursion", title_bn: "Array ও Recursion",
      code: `#include <stdio.h>

int sumArray(int a[], int n) {
    int s = 0;
    for (int i = 0; i < n; i++) s += a[i];
    return s;
}

int gcd(int a, int b) {
    if (b == 0) return a;        /* base case */
    return gcd(b, a % b);        /* recursive case */
}

long long factorial(int n) {
    return n <= 1 ? 1 : n * factorial(n - 1);
}

int main(void) {
    int marks[] = {10, 20, 30, 40};
    printf("Sum: %d\\n", sumArray(marks, 4));
    printf("gcd(84, 36) = %d\\n", gcd(84, 36));
    printf("10! = %lld\\n", factorial(10));
    return 0;
}`,
      explanation_en: "sumArray receives the array and its length. gcd and factorial are recursive: each call works on a smaller problem until the base case returns directly.",
      explanation_bn: "sumArray Array আর তার দৈর্ঘ্য গ্রহণ করে। gcd আর factorial Recursive: প্রতিটি কল ছোট সমস্যা নিয়ে কাজ করে যতক্ষণ না Base Case সরাসরি Return করে।",
    }],
  },
  {
    number: 22, slug: "string-in-c", chapter: "strings", topic: "strings", minutes: 18,
    title_en: "String in C", title_bn: "C-তে String",
    summary_en: "Strings are character arrays that end with '\\0'.",
    summary_bn: "String হলো '\\0' দিয়ে শেষ হওয়া Character Array।",
    objectives_en: ["Understand the null terminator", "Read words with scanf and lines with fgets", "Loop through a string character by character"],
    objectives_bn: ["Null Terminator বোঝা", "scanf দিয়ে শব্দ আর fgets দিয়ে লাইন পড়া", "Character ধরে ধরে String-এ লুপ চালানো"],
    body_en: `C has no separate string type. A **string** is a \`char\` array that ends with the special **null character** \`'\\0'\`.

\`\`\`c
char name[20] = "Nafi";   /* 'N','a','f','i','\\0' */
\`\`\`

The array needs room for the text **plus one** for \`'\\0'\`.

### Reading strings
- \`scanf("%19s", name)\` reads one word (stops at a space). No \`&\` is needed — the array name already is an address. The width 19 prevents overflow.
- \`fgets(line, sizeof line, stdin)\` reads a whole line including spaces (and keeps the newline).

### Walking a string
Loop until you reach \`'\\0'\`:
\`\`\`c
for (int i = 0; s[i] != '\\0'; i++) { ... }
\`\`\``,
    body_bn: `C-তে আলাদা কোনো String Type নেই। **String** হলো একটি \`char\` Array যা বিশেষ **Null Character** \`'\\0'\` দিয়ে শেষ হয়।

\`\`\`c
char name[20] = "Nafi";   /* 'N','a','f','i','\\0' */
\`\`\`

Array-তে লেখার জায়গা **আর সাথে আরও একটি** ঘর লাগে \`'\\0'\` এর জন্য।

### String পড়া
- \`scanf("%19s", name)\` একটি শব্দ পড়ে (স্পেস পেলে থামে)। \`&\` লাগে না — Array-এর নাম নিজেই একটি Address। Width 19 দেওয়ায় Overflow হয় না।
- \`fgets(line, sizeof line, stdin)\` স্পেসসহ পুরো লাইন পড়ে (শেষের Newline-ও রেখে দেয়)।

### String-এ লুপ চালানো
\`'\\0'\` পাওয়া পর্যন্ত লুপ চালাও:
\`\`\`c
for (int i = 0; s[i] != '\\0'; i++) { ... }
\`\`\``,
    mistakes_en: ["Making the array exactly as long as the text, with no room for '\\0'", "Using gets(), which is unsafe and removed from C", "Comparing strings with == instead of strcmp"],
    mistakes_bn: ["লেখার সমান দৈর্ঘ্যের Array বানানো, '\\0' এর জায়গা না রাখা", "gets() ব্যবহার করা — এটি অনিরাপদ এবং C থেকে বাদ দেওয়া হয়েছে", "strcmp এর বদলে == দিয়ে String তুলনা করা"],
    practice_en: ["Solve Count Vowels", "Read a word and print it with every letter in uppercase"],
    practice_bn: ["Count Vowels সমাধান করো", "একটি শব্দ ইনপুট নিয়ে সব অক্ষর বড় হাতে প্রিন্ট করো"],
    examples: [{
      title_en: "Length and uppercase by hand", title_bn: "নিজে দৈর্ঘ্য ও Uppercase বের করা",
      code: `#include <stdio.h>

int main(void) {
    char word[51];
    scanf("%50s", word);

    int len = 0;
    while (word[len] != '\\0') len++;

    for (int i = 0; word[i] != '\\0'; i++) {
        if (word[i] >= 'a' && word[i] <= 'z') word[i] -= 32;
    }
    printf("%s has %d characters\\n", word, len);
    return 0;
}`,
      stdin: "campuscode",
      explanation_en: "The while loop counts characters until '\\0'. The for loop converts each lowercase letter to uppercase by subtracting 32.",
      explanation_bn: "while লুপ '\\0' পাওয়া পর্যন্ত Character গোনে। for লুপ প্রতিটি ছোট হাতের অক্ষর থেকে 32 বিয়োগ করে বড় হাতে রূপান্তর করে।",
    }],
  },
  {
    number: 23, slug: "string-functions", chapter: "strings", topic: "strings", minutes: 18,
    title_en: "String Functions", title_bn: "String Function",
    summary_en: "Use strlen, strcpy, strcat and strcmp from <string.h>.",
    summary_bn: "<string.h> এর strlen, strcpy, strcat ও strcmp ব্যবহার।",
    objectives_en: ["Use the main functions in <string.h>", "Compare strings correctly", "Avoid buffer overflows when copying"],
    objectives_bn: ["<string.h> এর প্রধান Function গুলো ব্যবহার", "সঠিকভাবে String তুলনা করা", "কপি করার সময় Buffer Overflow এড়ানো"],
    body_en: `\`#include <string.h>\` gives you ready-made string tools:

| Function | Does |
|---|---|
| \`strlen(s)\` | length, not counting \`'\\0'\` |
| \`strcpy(dst, src)\` | copies src into dst |
| \`strcat(dst, src)\` | appends src to the end of dst |
| \`strcmp(a, b)\` | 0 if equal, negative if a comes first, positive otherwise |

### Comparing
\`a == b\` compares **addresses**, not text. Always use \`strcmp(a, b) == 0\`.

### Safety
\`strcpy\` and \`strcat\` don't know how big \`dst\` is. Make sure the destination has enough space, or use the bounded versions \`strncpy\` / \`snprintf\`.

### Performance tip
Don't write \`for (i = 0; i < strlen(s); i++)\` — strlen walks the whole string every iteration. Store the length once.`,
    body_bn: `\`#include <string.h>\` দিলে তৈরি String টুল পাওয়া যায়:

| Function | কাজ |
|---|---|
| \`strlen(s)\` | দৈর্ঘ্য, \`'\\0'\` বাদে |
| \`strcpy(dst, src)\` | src কে dst তে কপি করে |
| \`strcat(dst, src)\` | dst এর শেষে src জুড়ে দেয় |
| \`strcmp(a, b)\` | সমান হলে 0, a আগে এলে ঋণাত্মক, নইলে ধনাত্মক |

### তুলনা
\`a == b\` লেখা তুলনা করে **Address**, লেখা নয়। সবসময় \`strcmp(a, b) == 0\` ব্যবহার করো।

### নিরাপত্তা
\`strcpy\` আর \`strcat\` জানে না \`dst\` কত বড়। গন্তব্যে যথেষ্ট জায়গা আছে কিনা নিশ্চিত হও, অথবা সীমাবদ্ধ সংস্করণ \`strncpy\` / \`snprintf\` ব্যবহার করো।

### Performance টিপস
\`for (i = 0; i < strlen(s); i++)\` লিখো না — strlen প্রতিবার পুরো String হেঁটে দেখে। দৈর্ঘ্য একবার বের করে রেখে দাও।`,
    mistakes_en: ["Comparing strings with ==", "strcat into a buffer that is too small", "Calling strlen in the loop condition on long strings"],
    mistakes_bn: ["== দিয়ে String তুলনা করা", "ছোট Buffer-এ strcat করা", "লম্বা String-এ লুপের শর্তে বারবার strlen কল করা"],
    practice_en: ["Solve Palindrome Check and Word Count", "Read two words and print them in dictionary order"],
    practice_bn: ["Palindrome Check আর Word Count সমাধান করো", "দুটি শব্দ ইনপুট নিয়ে অভিধানের ক্রমে প্রিন্ট করো"],
    examples: [{
      title_en: "The string toolkit", title_bn: "String টুলকিট",
      code: `#include <stdio.h>
#include <string.h>

int main(void) {
    char first[40] = "Campus";
    char second[] = "Code";
    char copy[40];

    strcat(first, second);
    strcpy(copy, first);

    printf("Joined: %s (length %zu)\\n", first, strlen(first));
    printf("Copy equals original? %s\\n", strcmp(copy, first) == 0 ? "yes" : "no");
    printf("strcmp(\\"apple\\", \\"banana\\") < 0? %s\\n",
           strcmp("apple", "banana") < 0 ? "yes" : "no");
    return 0;
}`,
      explanation_en: "strcat appends Code to Campus (first has room for 40 chars). strcpy duplicates it, and strcmp returns 0 because the texts match. apple sorts before banana, so strcmp is negative.",
      explanation_bn: "strcat Campus এর শেষে Code জুড়ে দেয় (first এ ৪০টি Character-এর জায়গা আছে)। strcpy সেটি কপি করে, আর লেখা মিলে যাওয়ায় strcmp 0 দেয়। apple অভিধানে banana-র আগে, তাই strcmp ঋণাত্মক।",
    }],
  },
  {
    number: 24, slug: "structure-in-c", chapter: "structures-and-pointers", topic: "structures", minutes: 18,
    title_en: "Structure in C", title_bn: "C-তে Structure",
    summary_en: "Group related values of different types into one struct.",
    summary_bn: "ভিন্ন ভিন্ন Type-এর সম্পর্কিত মান একটি struct-এ একসাথে রাখা।",
    objectives_en: ["Define a struct type", "Access members with the dot operator", "Use arrays of structures"],
    objectives_bn: ["struct Type তৈরি করা", "Dot Operator দিয়ে Member ব্যবহার", "Structure-এর Array ব্যবহার"],
    body_en: `A student has a name, a roll number and a CGPA — three different types that belong together. A **structure** groups them:

\`\`\`c
struct Student {
    char name[30];
    int roll;
    double cgpa;
};
\`\`\`

This defines a new type. Create variables with \`struct Student s;\` and access members with the **dot operator**: \`s.roll = 7;\`.

### Arrays of structures
\`struct Student list[50];\` stores 50 students; \`list[i].cgpa\` is the i-th student's CGPA. This is much cleaner than three parallel arrays.

### typedef
\`typedef struct Student Student;\` lets you write \`Student s;\` instead of \`struct Student s;\`.

Structures can be assigned with \`=\` (all members are copied) and passed to and returned from functions.`,
    body_bn: `একজন শিক্ষার্থীর নাম, রোল আর CGPA আছে — তিনটি ভিন্ন Type যা একসাথে থাকা উচিত। **Structure** এদের একত্র করে:

\`\`\`c
struct Student {
    char name[30];
    int roll;
    double cgpa;
};
\`\`\`

এতে একটি নতুন Type তৈরি হয়। \`struct Student s;\` দিয়ে Variable বানাও আর **Dot Operator** দিয়ে Member ব্যবহার করো: \`s.roll = 7;\`।

### Structure-এর Array
\`struct Student list[50];\` এ ৫০ জন শিক্ষার্থী রাখা যায়; \`list[i].cgpa\` হলো i-তম শিক্ষার্থীর CGPA। তিনটি সমান্তরাল Array রাখার চেয়ে এটি অনেক পরিষ্কার।

### typedef
\`typedef struct Student Student;\` লিখলে \`struct Student s;\` এর বদলে শুধু \`Student s;\` লেখা যায়।

Structure \`=\` দিয়ে Assign করা যায় (সব Member কপি হয়), এবং Function-এ পাঠানো ও Function থেকে Return করাও যায়।`,
    mistakes_en: ["Forgetting the semicolon after the closing brace of struct", "Assigning a string member with = instead of strcpy", "Using -> on a struct variable (it's for pointers)"],
    mistakes_bn: ["struct এর শেষ Brace এর পরে সেমিকোলন ভুলে যাওয়া", "String Member-এ strcpy এর বদলে = দিয়ে মান বসানো", "struct Variable-এ -> ব্যবহার করা (এটি Pointer এর জন্য)"],
    practice_en: ["Solve Student Records and Distance Between Two Points", "Store N books (title, price) and print the cheapest"],
    practice_bn: ["Student Records আর Distance Between Two Points সমাধান করো", "N টি বই (নাম, দাম) রেখে সবচেয়ে সস্তাটি প্রিন্ট করো"],
    examples: [{
      title_en: "Students in a struct array", title_bn: "struct Array-তে শিক্ষার্থী",
      code: `#include <stdio.h>

typedef struct {
    char name[30];
    int roll;
    double cgpa;
} Student;

int main(void) {
    Student list[3] = {
        {"Araf", 1, 3.45},
        {"Mim", 2, 3.92},
        {"Tanvir", 3, 3.60}
    };

    int best = 0;
    for (int i = 1; i < 3; i++)
        if (list[i].cgpa > list[best].cgpa) best = i;

    for (int i = 0; i < 3; i++)
        printf("%-8s roll %d  CGPA %.2f\\n", list[i].name, list[i].roll, list[i].cgpa);
    printf("Top: %s\\n", list[best].name);
    return 0;
}`,
      explanation_en: "Each element of list is a whole Student. We compare cgpa members to find the best one; %-8s left-aligns names in an 8-character column.",
      explanation_bn: "list এর প্রতিটি উপাদান একটি পূর্ণ Student। cgpa Member তুলনা করে সেরাজন বের করা হয়; %-8s নামগুলোকে ৮ ঘরের কলামে বামে সাজায়।",
    }],
  },
  {
    number: 25, slug: "pointer-in-c", chapter: "structures-and-pointers", topic: "pointers", minutes: 22,
    title_en: "Pointer in C", title_bn: "C-তে Pointer",
    summary_en: "Variables that store memory addresses.",
    summary_bn: "যে Variable মেমোরির Address জমা রাখে।",
    objectives_en: ["Take addresses with & and dereference with *", "Change a caller's variable through a pointer", "Understand NULL"],
    objectives_bn: ["& দিয়ে Address নেওয়া আর * দিয়ে Dereference করা", "Pointer দিয়ে কলারের Variable বদলানো", "NULL বোঝা"],
    body_en: `Every variable lives at an **address** in memory. A **pointer** is a variable that stores such an address.

\`\`\`c
int x = 10;
int *p = &x;   /* p holds the address of x */
*p = 25;       /* change x through p */
\`\`\`

- \`&x\` — the address of x.
- \`int *p\` — p is a pointer to an int.
- \`*p\` — **dereference**: the value at the address in p.

### Why pointers?
Functions receive copies of their arguments. To let a function change the caller's variables — like \`swap\` — pass their addresses:

\`\`\`c
void swap(int *a, int *b) { int t = *a; *a = *b; *b = t; }
swap(&x, &y);
\`\`\`

That is also why \`scanf\` needs \`&\`.

### NULL
A pointer that points nowhere should be set to \`NULL\`. Dereferencing NULL or an uninitialised pointer crashes the program (Runtime Error).`,
    body_bn: `প্রতিটি Variable মেমোরির একটি **Address**-এ থাকে। **Pointer** হলো এমন একটি Variable যা সেই Address জমা রাখে।

\`\`\`c
int x = 10;
int *p = &x;   /* p তে x এর Address */
*p = 25;       /* p দিয়ে x বদলানো */
\`\`\`

- \`&x\` — x এর Address।
- \`int *p\` — p হলো একটি int এর Pointer।
- \`*p\` — **Dereference**: p তে থাকা Address-এর মান।

### Pointer কেন?
Function তার Argument-এর কপি পায়। কোনো Function দিয়ে কলারের Variable বদলাতে চাইলে — যেমন \`swap\` — তাদের Address পাঠাতে হয়:

\`\`\`c
void swap(int *a, int *b) { int t = *a; *a = *b; *b = t; }
swap(&x, &y);
\`\`\`

এ কারণেই \`scanf\` এ \`&\` লাগে।

### NULL
যে Pointer কোথাও নির্দেশ করে না তাকে \`NULL\` দিয়ে রাখা উচিত। NULL বা Initialize না করা Pointer Dereference করলে প্রোগ্রাম Crash করে (Runtime Error)।`,
    mistakes_en: ["Dereferencing an uninitialised pointer", "Confusing p (the address) with *p (the value)", "Returning the address of a local variable from a function"],
    mistakes_bn: ["Initialize না করা Pointer Dereference করা", "p (Address) আর *p (মান) গুলিয়ে ফেলা", "Function থেকে Local Variable-এর Address Return করা"],
    practice_en: ["Solve Swap Using Pointers", "Write void minMax(int a[], int n, int *mn, int *mx) that returns two results"],
    practice_bn: ["Swap Using Pointers সমাধান করো", "void minMax(int a[], int n, int *mn, int *mx) লেখো যা দুটি ফলাফল ফেরত দেয়"],
    examples: [{
      title_en: "Address, value and swap", title_bn: "Address, মান ও swap",
      code: `#include <stdio.h>

void swap(int *a, int *b) {
    int t = *a;
    *a = *b;
    *b = t;
}

int main(void) {
    int x = 10, y = 20;
    int *p = &x;

    *p = 25;
    printf("x = %d (changed through p)\\n", x);
    printf("p points to x? %s\\n", p == &x ? "yes" : "no");

    swap(&x, &y);
    printf("After swap: x = %d, y = %d\\n", x, y);
    return 0;
}`,
      explanation_en: "Writing *p = 25 changes x itself. swap receives the addresses of x and y, so its changes are visible in main.",
      explanation_bn: "*p = 25 লিখলে x নিজেই বদলে যায়। swap x আর y এর Address পায়, তাই তার করা পরিবর্তন main-এও দেখা যায়।",
    }],
  },
  {
    number: 26, slug: "dynamic-memory-allocation", chapter: "structures-and-pointers", topic: "pointers", minutes: 25,
    title_en: "Dynamic Memory Allocation: malloc, calloc, free, realloc", title_bn: "Dynamic Memory Allocation: malloc, calloc, free, realloc",
    summary_en: "Request memory at runtime and give it back when done.",
    summary_bn: "প্রোগ্রাম চলার সময় মেমোরি নেওয়া এবং কাজ শেষে ফেরত দেওয়া।",
    objectives_en: ["Allocate arrays with malloc and calloc", "Grow memory with realloc", "Release memory with free and check for NULL"],
    objectives_bn: ["malloc ও calloc দিয়ে Array বানানো", "realloc দিয়ে মেমোরি বাড়ানো", "free দিয়ে মেমোরি ফেরত দেওয়া এবং NULL যাচাই"],
    body_en: `Normal arrays need their size at compile time. When the size is only known at runtime, ask for memory on the **heap** with functions from \`<stdlib.h>\`:

| Function | Purpose |
|---|---|
| \`malloc(bytes)\` | allocate uninitialised memory |
| \`calloc(count, size)\` | allocate and set every byte to 0 |
| \`realloc(ptr, newBytes)\` | resize an existing block (contents kept) |
| \`free(ptr)\` | return the memory |

\`\`\`c
int *a = malloc(n * sizeof(int));
if (a == NULL) { /* out of memory */ }
\`\`\`

### Rules
- Always multiply by \`sizeof(type)\`.
- Always check for \`NULL\`.
- Every malloc/calloc needs exactly one \`free\`. Forgetting it is a **memory leak**; using memory after freeing it is a serious bug.
- Assign realloc's result to a temporary first, so you don't lose the original pointer if it fails.`,
    body_bn: `সাধারণ Array-এর সাইজ Compile করার সময়ই জানতে হয়। সাইজ শুধু প্রোগ্রাম চলার সময় জানা গেলে \`<stdlib.h>\` এর Function দিয়ে **Heap** থেকে মেমোরি চাইতে হয়:

| Function | কাজ |
|---|---|
| \`malloc(bytes)\` | মান না বসিয়ে মেমোরি দেয় |
| \`calloc(count, size)\` | মেমোরি দেয় এবং প্রতিটি বাইট 0 করে দেয় |
| \`realloc(ptr, newBytes)\` | আগের ব্লকের সাইজ বদলায় (ভেতরের মান থাকে) |
| \`free(ptr)\` | মেমোরি ফেরত দেয় |

\`\`\`c
int *a = malloc(n * sizeof(int));
if (a == NULL) { /* মেমোরি পাওয়া যায়নি */ }
\`\`\`

### নিয়মগুলো
- সবসময় \`sizeof(type)\` দিয়ে গুণ করো।
- সবসময় \`NULL\` যাচাই করো।
- প্রতিটি malloc/calloc এর জন্য ঠিক একবার \`free\` লাগবে। ভুলে গেলে **Memory Leak** হয়; free করার পর সেই মেমোরি ব্যবহার করা মারাত্মক ভুল।
- realloc এর ফলাফল আগে একটি অস্থায়ী Pointer-এ রাখো, যাতে ব্যর্থ হলে আসল Pointer হারিয়ে না যায়।`,
    mistakes_en: ["malloc(n) instead of malloc(n * sizeof(int))", "Forgetting free, or calling free twice", "Writing p = realloc(p, ...) and leaking memory on failure"],
    mistakes_bn: ["malloc(n * sizeof(int)) এর বদলে malloc(n) লেখা", "free ভুলে যাওয়া বা দুবার free করা", "p = realloc(p, ...) লিখে ব্যর্থতার সময় মেমোরি হারানো"],
    practice_en: ["Solve Dynamic Array Average", "Read numbers until 0, growing the array with realloc as needed"],
    practice_bn: ["Dynamic Array Average সমাধান করো", "0 না আসা পর্যন্ত সংখ্যা পড়ো এবং প্রয়োজনে realloc দিয়ে Array বড় করো"],
    examples: [{
      title_en: "malloc, calloc, realloc and free", title_bn: "malloc, calloc, realloc ও free",
      code: `#include <stdio.h>
#include <stdlib.h>

int main(void) {
    int n = 3;
    int *a = malloc(n * sizeof(int));
    int *zeros = calloc(4, sizeof(int));
    if (a == NULL || zeros == NULL) return 1;

    for (int i = 0; i < n; i++) a[i] = (i + 1) * 10;

    int *bigger = realloc(a, 5 * sizeof(int));
    if (bigger == NULL) { free(a); free(zeros); return 1; }
    a = bigger;
    a[3] = 40; a[4] = 50;

    printf("a:");
    for (int i = 0; i < 5; i++) printf(" %d", a[i]);
    printf("\\nzeros:");
    for (int i = 0; i < 4; i++) printf(" %d", zeros[i]);
    printf("\\n");

    free(a);
    free(zeros);
    return 0;
}`,
      explanation_en: "malloc gives room for 3 ints, realloc grows it to 5 while keeping 10, 20, 30. calloc's memory starts as zeros. Both blocks are freed at the end.",
      explanation_bn: "malloc ৩টি int এর জায়গা দেয়, realloc সেটিকে ৫টিতে বাড়ায় এবং 10, 20, 30 ঠিক রাখে। calloc এর মেমোরি শুরুতেই শূন্য। শেষে দুটো ব্লকই free করা হয়।",
    }],
  },
  {
    number: 27, slug: "pointer-array-function", chapter: "structures-and-pointers", topic: "pointers", minutes: 22,
    title_en: "Pointer Relationship with Array and Function", title_bn: "Array ও Function-এর সাথে Pointer-এর সম্পর্ক",
    summary_en: "See why arrays behave like pointers and how pointer arithmetic works.",
    summary_bn: "Array কেন Pointer-এর মতো আচরণ করে এবং Pointer Arithmetic কীভাবে কাজ করে।",
    objectives_en: ["Use pointer arithmetic", "Understand array decay when passing to functions", "Use -> with pointers to structures"],
    objectives_bn: ["Pointer Arithmetic ব্যবহার", "Function-এ পাঠানোর সময় Array Decay বোঝা", "Structure Pointer-এ -> ব্যবহার"],
    body_en: `An array's name, used in an expression, becomes a **pointer to its first element**: \`a\` is \`&a[0]\`.

### Pointer arithmetic
\`p + 1\` points to the **next element**, not the next byte — C scales by the element size. So \`*(a + i)\` is exactly \`a[i]\`.

### Arrays in functions
\`void f(int a[], int n)\` is really \`void f(int *a, int n)\`. The function receives the address, which is why it can modify the caller's array, and why \`sizeof(a)\` inside it gives the pointer size, not the array size.

### Pointers to structures
With \`Student *p = &s;\`, access members with the arrow: \`p->cgpa\` (same as \`(*p).cgpa\`). Passing a pointer avoids copying a big structure and lets the function update it.`,
    body_bn: `Expression-এ Array-এর নাম ব্যবহার করলে সেটি **প্রথম উপাদানের Pointer** হয়ে যায়: \`a\` মানে \`&a[0]\`।

### Pointer Arithmetic
\`p + 1\` পরের **বাইট** নয়, পরের **উপাদানকে** নির্দেশ করে — C উপাদানের সাইজ অনুযায়ী হিসাব করে। তাই \`*(a + i)\` হুবহু \`a[i]\`।

### Function-এ Array
\`void f(int a[], int n)\` আসলে \`void f(int *a, int n)\`। Function Address পায় — এ কারণেই সে কলারের Array বদলাতে পারে, আর এ কারণেই ভেতরে \`sizeof(a)\` Array-এর নয়, Pointer-এর সাইজ দেয়।

### Structure-এর Pointer
\`Student *p = &s;\` হলে Member ব্যবহার করো তীর চিহ্ন দিয়ে: \`p->cgpa\` (মানে \`(*p).cgpa\`)। Pointer পাঠালে বড় Structure কপি করতে হয় না এবং Function সেটি আপডেটও করতে পারে।`,
    mistakes_en: ["Expecting sizeof(arrayParam) to give the array length", "Moving a pointer past the end of the array", "Writing *p.cgpa instead of p->cgpa"],
    mistakes_bn: ["sizeof(arrayParam) দিয়ে Array-এর দৈর্ঘ্য পাওয়ার আশা করা", "Pointer কে Array-এর শেষের বাইরে নিয়ে যাওয়া", "p->cgpa এর বদলে *p.cgpa লেখা"],
    practice_en: ["Write a function that doubles every element of an array using only pointer arithmetic", "Write void raise(Student *s, double bonus) that adds to a student's marks"],
    practice_bn: ["শুধু Pointer Arithmetic দিয়ে Array-এর প্রতিটি উপাদান দ্বিগুণ করে এমন Function লেখো", "void raise(Student *s, double bonus) লেখো যা শিক্ষার্থীর নম্বর বাড়ায়"],
    examples: [{
      title_en: "Arrays, pointers and ->", title_bn: "Array, Pointer ও ->",
      code: `#include <stdio.h>

typedef struct { char name[20]; int marks; } Student;

void addBonus(int *a, int n, int bonus) {
    for (int *p = a; p < a + n; p++) *p += bonus;
}

void promote(Student *s) {
    s->marks += 5;
}

int main(void) {
    int a[] = {60, 72, 85};
    printf("a[1] = %d, *(a + 1) = %d\\n", a[1], *(a + 1));

    addBonus(a, 3, 3);
    printf("After bonus: %d %d %d\\n", a[0], a[1], a[2]);

    Student s = {"Riya", 78};
    promote(&s);
    printf("%s now has %d\\n", s.name, s.marks);
    return 0;
}`,
      explanation_en: "a[1] and *(a + 1) are the same element. addBonus walks the array with a pointer and changes the caller's data. promote updates the struct through s->marks.",
      explanation_bn: "a[1] আর *(a + 1) একই উপাদান। addBonus একটি Pointer দিয়ে Array-তে হাঁটে এবং কলারের ডেটা বদলায়। promote s->marks দিয়ে Structure আপডেট করে।",
    }],
  },
  {
    number: 28, slug: "file-handling", chapter: "files-and-preprocessor", topic: null, minutes: 25,
    title_en: "File Handling: Read, Write, fscanf(), fgets(), fputs()", title_bn: "File Handling: Read, Write, fscanf(), fgets(), fputs()",
    summary_en: "Save data to files and read it back.",
    summary_bn: "ফাইলে ডেটা সংরক্ষণ করা এবং আবার পড়া।",
    objectives_en: ["Open and close files with fopen and fclose", "Write with fprintf and fputs", "Read with fscanf and fgets"],
    objectives_bn: ["fopen ও fclose দিয়ে ফাইল খোলা ও বন্ধ করা", "fprintf ও fputs দিয়ে লেখা", "fscanf ও fgets দিয়ে পড়া"],
    body_en: `Variables disappear when a program ends. **Files** keep data permanently.

\`\`\`c
FILE *fp = fopen("marks.txt", "w");
if (fp == NULL) { /* could not open */ }
fprintf(fp, "%d\\n", 95);
fclose(fp);
\`\`\`

### Modes
- \`"r"\` read (file must exist)
- \`"w"\` write (creates or **erases** the file)
- \`"a"\` append to the end

### Writing and reading
- \`fprintf(fp, ...)\` / \`fscanf(fp, ...)\` — like printf/scanf, but for a file.
- \`fputs(str, fp)\` writes a string; \`fgets(buf, size, fp)\` reads one line.
- fscanf returns how many values it read — loop \`while (fscanf(fp, "%d", &x) == 1)\` to read until the end.

Always check that \`fopen\` didn't return NULL, and always \`fclose\` — buffered data might not be written otherwise.`,
    body_bn: `প্রোগ্রাম শেষ হলে Variable হারিয়ে যায়। **ফাইল** ডেটা স্থায়ীভাবে রাখে।

\`\`\`c
FILE *fp = fopen("marks.txt", "w");
if (fp == NULL) { /* খোলা যায়নি */ }
fprintf(fp, "%d\\n", 95);
fclose(fp);
\`\`\`

### Mode
- \`"r"\` পড়া (ফাইল আগে থেকে থাকতে হবে)
- \`"w"\` লেখা (ফাইল তৈরি করে, থাকলে **মুছে ফেলে**)
- \`"a"\` শেষে যোগ করা

### লেখা ও পড়া
- \`fprintf(fp, ...)\` / \`fscanf(fp, ...)\` — printf/scanf এর মতোই, তবে ফাইলের জন্য।
- \`fputs(str, fp)\` একটি String লেখে; \`fgets(buf, size, fp)\` একটি লাইন পড়ে।
- fscanf কয়টি মান পড়েছে তা Return করে — শেষ পর্যন্ত পড়তে \`while (fscanf(fp, "%d", &x) == 1)\` লুপ চালাও।

সবসময় যাচাই করো \`fopen\` NULL দিয়েছে কিনা, এবং সবসময় \`fclose\` করো — নইলে Buffer-এ থাকা ডেটা হয়তো লেখা হবে না।`,
    mistakes_en: ["Opening with \"w\" and accidentally erasing existing data", "Not checking fopen for NULL", "Looping with while (!feof(fp)) and processing the last value twice"],
    mistakes_bn: ["\"w\" দিয়ে খুলে ভুলবশত আগের ডেটা মুছে ফেলা", "fopen NULL দিয়েছে কিনা যাচাই না করা", "while (!feof(fp)) লুপে শেষ মানটি দুবার প্রসেস করা"],
    practice_en: ["Write 1 to 10 into a file, then read them back and print their sum", "Copy one text file into another line by line with fgets and fputs"],
    practice_bn: ["একটি ফাইলে 1 থেকে 10 লিখে আবার পড়ে যোগফল প্রিন্ট করো", "fgets আর fputs দিয়ে লাইন ধরে ধরে একটি টেক্সট ফাইল আরেকটিতে কপি করো"],
    examples: [{
      title_en: "Write, then read back", title_bn: "লেখা, তারপর আবার পড়া",
      code: `#include <stdio.h>

int main(void) {
    FILE *fp = fopen("marks.txt", "w");
    if (fp == NULL) { printf("Cannot open file\\n"); return 1; }
    fputs("Marks of section A\\n", fp);
    fprintf(fp, "%d %d %d\\n", 78, 91, 85);
    fclose(fp);

    fp = fopen("marks.txt", "r");
    if (fp == NULL) return 1;
    char title[50];
    fgets(title, sizeof title, fp);
    printf("Title: %s", title);

    int x, sum = 0;
    while (fscanf(fp, "%d", &x) == 1) sum += x;
    fclose(fp);

    printf("Sum of marks: %d\\n", sum);
    return 0;
}`,
      explanation_en: "The program writes a title line and three numbers, closes the file, reopens it for reading, reads the title with fgets and the numbers with fscanf until no more integers can be read.",
      explanation_bn: "প্রোগ্রামটি একটি শিরোনাম লাইন আর তিনটি সংখ্যা লেখে, ফাইল বন্ধ করে, আবার পড়ার জন্য খোলে, fgets দিয়ে শিরোনাম আর fscanf দিয়ে সংখ্যাগুলো পড়ে যতক্ষণ না আর কোনো Integer পাওয়া যায়।",
    }],
  },
  {
    number: 29, slug: "advanced-file-handling-project", chapter: "files-and-preprocessor", topic: null, minutes: 35, is_project: true,
    title_en: "Advanced File Handling and File Project", title_bn: "Advanced File Handling ও ফাইল প্রজেক্ট",
    summary_en: "Build a small record keeper that stores structured data in a file.",
    summary_bn: "ফাইলে গঠিত ডেটা সংরক্ষণ করে এমন একটি ছোট রেকর্ড-কিপার তৈরি।",
    objectives_en: ["Store structs in a text file with a clear format", "Append records and search them", "Use binary files with fwrite and fread"],
    objectives_bn: ["স্পষ্ট ফরম্যাটে struct টেক্সট ফাইলে রাখা", "রেকর্ড যোগ করা ও খোঁজা", "fwrite ও fread দিয়ে Binary File ব্যবহার"],
    body_en: `### Project: Student record keeper
Combine structures and files: each line of \`students.txt\` stores one student as \`roll name cgpa\`.

**Steps**
1. Define \`struct Student { int roll; char name[30]; double cgpa; };\`
2. \`addStudent\`: open in \`"a"\` mode and \`fprintf\` one line.
3. \`listStudents\`: open in \`"r"\` mode, read with \`fscanf(fp, "%d %29s %lf", ...) == 3\` in a loop.
4. \`findByRoll\`: read records until the roll matches.

### Binary files
For fixed-size records, \`fwrite(&s, sizeof s, 1, fp)\` writes the raw struct, and \`fread\` reads it back — fast, and you can jump to record k with \`fseek(fp, k * sizeof s, SEEK_SET)\`. Text files are easier to read by humans; binary files are faster and compact.

### Extend it
Add *update CGPA* by reading all records, changing one, and rewriting the file.`,
    body_bn: `### প্রজেক্ট: শিক্ষার্থী রেকর্ড-কিপার
Structure আর ফাইল একসাথে: \`students.txt\` এর প্রতিটি লাইনে একজন শিক্ষার্থী থাকবে \`roll name cgpa\` আকারে।

**ধাপগুলো**
1. \`struct Student { int roll; char name[30]; double cgpa; };\` তৈরি করো।
2. \`addStudent\`: \`"a"\` Mode-এ খুলে \`fprintf\` দিয়ে একটি লাইন লেখো।
3. \`listStudents\`: \`"r"\` Mode-এ খুলে লুপে \`fscanf(fp, "%d %29s %lf", ...) == 3\` দিয়ে পড়ো।
4. \`findByRoll\`: রোল না মেলা পর্যন্ত রেকর্ড পড়তে থাকো।

### Binary File
নির্দিষ্ট সাইজের রেকর্ডের জন্য \`fwrite(&s, sizeof s, 1, fp)\` পুরো struct সরাসরি লেখে, আর \`fread\` আবার পড়ে — দ্রুত, এবং \`fseek(fp, k * sizeof s, SEEK_SET)\` দিয়ে সরাসরি k-তম রেকর্ডে যাওয়া যায়। টেক্সট ফাইল মানুষের পড়তে সহজ; Binary File দ্রুত আর কম জায়গা নেয়।

### আরও বাড়াও
সব রেকর্ড পড়ে একটির CGPA বদলে পুরো ফাইল আবার লিখে *Update CGPA* ফিচার যোগ করো।`,
    mistakes_en: ["Mixing text and binary modes for the same file", "Reading names with spaces using %s", "Forgetting to rewind or reopen the file before reading what you just wrote"],
    mistakes_bn: ["একই ফাইলে টেক্সট আর Binary Mode মিশিয়ে ফেলা", "%s দিয়ে স্পেসসহ নাম পড়ার চেষ্টা", "সদ্য লেখা ডেটা পড়ার আগে ফাইল rewind বা আবার না খোলা"],
    practice_en: ["Add a menu: 1 add, 2 list, 3 find, 0 exit", "Store records in a binary file and read the third one directly with fseek"],
    practice_bn: ["একটি Menu যোগ করো: 1 যোগ, 2 তালিকা, 3 খোঁজা, 0 বের হওয়া", "Binary File-এ রেকর্ড রেখে fseek দিয়ে সরাসরি তৃতীয়টি পড়ো"],
    examples: [{
      title_en: "Record keeper core", title_bn: "রেকর্ড-কিপারের মূল অংশ",
      code: `#include <stdio.h>

typedef struct { int roll; char name[30]; double cgpa; } Student;

void addStudent(const char *path, Student s) {
    FILE *fp = fopen(path, "a");
    if (!fp) return;
    fprintf(fp, "%d %s %.2f\\n", s.roll, s.name, s.cgpa);
    fclose(fp);
}

int findByRoll(const char *path, int roll, Student *out) {
    FILE *fp = fopen(path, "r");
    if (!fp) return 0;
    Student s;
    while (fscanf(fp, "%d %29s %lf", &s.roll, s.name, &s.cgpa) == 3) {
        if (s.roll == roll) { *out = s; fclose(fp); return 1; }
    }
    fclose(fp);
    return 0;
}

int main(void) {
    const char *path = "students.txt";
    remove(path);
    addStudent(path, (Student){1, "Araf", 3.45});
    addStudent(path, (Student){2, "Mim", 3.92});
    addStudent(path, (Student){3, "Tanvir", 3.60});

    Student found;
    if (findByRoll(path, 2, &found))
        printf("Roll 2: %s, CGPA %.2f\\n", found.name, found.cgpa);
    if (!findByRoll(path, 9, &found))
        printf("Roll 9 not found\\n");
    return 0;
}`,
      explanation_en: "addStudent appends one line per record. findByRoll scans the file until the roll matches and returns the record through a pointer. remove() starts each run with a fresh file.",
      explanation_bn: "addStudent প্রতিটি রেকর্ডের জন্য একটি লাইন যোগ করে। findByRoll রোল না মেলা পর্যন্ত ফাইল পড়ে এবং Pointer দিয়ে রেকর্ডটি ফেরত দেয়। remove() প্রতিবার নতুন ফাইল দিয়ে শুরু করায়।",
    }],
  },
  {
    number: 30, slug: "header-files-and-define", chapter: "files-and-preprocessor", topic: null, minutes: 15,
    title_en: "C Header Files and #define", title_bn: "C Header File ও #define",
    summary_en: "Understand the preprocessor, standard headers and constants.",
    summary_bn: "Preprocessor, Standard Header আর ধ্রুবক বোঝা।",
    objectives_en: ["Know what #include does", "Define constants and simple macros", "Recognise common standard headers"],
    objectives_bn: ["#include কী করে তা জানা", "ধ্রুবক ও সহজ Macro তৈরি করা", "প্রচলিত Standard Header চেনা"],
    body_en: `Before compilation, the **preprocessor** handles lines starting with \`#\`.

### #include
\`#include <stdio.h>\` pastes the header's declarations into your file. Common headers:
- \`<stdio.h>\` input/output · \`<stdlib.h>\` malloc, free, rand · \`<string.h>\` string functions · \`<math.h>\` sqrt, pow · \`<ctype.h>\` isdigit, toupper · \`<time.h>\` time, clock

Use \`<...>\` for standard headers and \`"..."\` for your own, e.g. \`#include "student.h"\`.

### #define
\`#define MAX 100\` replaces every \`MAX\` with \`100\` before compiling — handy for array sizes and limits.

A **macro** can take parameters: \`#define SQUARE(x) ((x) * (x))\`. Wrap every parameter and the whole body in parentheses; without them, \`SQUARE(1 + 2)\` would expand to \`1 + 2 * 1 + 2\` = 5.

For typed constants you can also use \`const int MAX = 100;\`.`,
    body_bn: `Compile হওয়ার আগে **Preprocessor** \`#\` দিয়ে শুরু হওয়া লাইনগুলো সামলায়।

### #include
\`#include <stdio.h>\` Header-এর Declaration গুলো তোমার ফাইলে বসিয়ে দেয়। প্রচলিত Header:
- \`<stdio.h>\` ইনপুট/আউটপুট · \`<stdlib.h>\` malloc, free, rand · \`<string.h>\` String Function · \`<math.h>\` sqrt, pow · \`<ctype.h>\` isdigit, toupper · \`<time.h>\` time, clock

Standard Header-এর জন্য \`<...>\` আর নিজের Header-এর জন্য \`"..."\` ব্যবহার করো, যেমন \`#include "student.h"\`।

### #define
\`#define MAX 100\` Compile-এর আগে প্রতিটি \`MAX\` কে \`100\` দিয়ে বদলে দেয় — Array-এর সাইজ আর সীমা লেখার জন্য খুব কাজের।

**Macro** Parameter-ও নিতে পারে: \`#define SQUARE(x) ((x) * (x))\`। প্রতিটি Parameter আর পুরো Body Parentheses-এ রাখো; না রাখলে \`SQUARE(1 + 2)\` হয়ে যাবে \`1 + 2 * 1 + 2\` = 5।

Type-সহ ধ্রুবকের জন্য \`const int MAX = 100;\`-ও ব্যবহার করা যায়।`,
    mistakes_en: ["Putting a semicolon at the end of #define MAX 100;", "Writing macros without parentheses", "Forgetting <math.h> and getting wrong results from sqrt"],
    mistakes_bn: ["#define MAX 100; — শেষে সেমিকোলন দেওয়া", "Parentheses ছাড়া Macro লেখা", "<math.h> না দিয়ে sqrt থেকে ভুল ফলাফল পাওয়া"],
    practice_en: ["Define PI and a CIRCLE_AREA(r) macro and test it with r = 1 + 1", "Use <ctype.h> to count digits and letters in a line"],
    practice_bn: ["PI আর CIRCLE_AREA(r) Macro তৈরি করে r = 1 + 1 দিয়ে পরীক্ষা করো", "<ctype.h> দিয়ে একটি লাইনে কয়টি অঙ্ক আর অক্ষর আছে গোনো"],
    examples: [{
      title_en: "Constants and macros", title_bn: "ধ্রুবক ও Macro",
      code: `#include <stdio.h>
#include <ctype.h>

#define MAX_STUDENTS 60
#define PI 3.14159
#define BAD_SQUARE(x) x * x
#define SQUARE(x) ((x) * (x))

int main(void) {
    printf("Capacity: %d students\\n", MAX_STUDENTS);
    printf("Area of r=2: %.2f\\n", PI * SQUARE(2));
    printf("BAD_SQUARE(1 + 2) = %d\\n", BAD_SQUARE(1 + 2));
    printf("SQUARE(1 + 2) = %d\\n", SQUARE(1 + 2));
    printf("toupper('b') = %c, isdigit('7') = %d\\n", toupper('b'), isdigit('7') != 0);
    return 0;
}`,
      explanation_en: "BAD_SQUARE(1 + 2) expands to 1 + 2 * 1 + 2 = 5, while the parenthesised SQUARE gives 9. <ctype.h> provides character helpers.",
      explanation_bn: "BAD_SQUARE(1 + 2) হয়ে যায় 1 + 2 * 1 + 2 = 5, আর Parentheses দেওয়া SQUARE দেয় 9। <ctype.h> Character সংক্রান্ত সাহায্যকারী Function দেয়।",
    }],
  },
  {
    number: 31, slug: "digital-stopwatch-project", chapter: "projects", topic: null, minutes: 40, is_project: true,
    title_en: "Digital Stopwatch Project", title_bn: "ডিজিটাল স্টপওয়াচ প্রজেক্ট",
    summary_en: "Build a console stopwatch that formats elapsed time as HH:MM:SS.",
    summary_bn: "অতিবাহিত সময় HH:MM:SS আকারে দেখায় এমন একটি কনসোল স্টপওয়াচ তৈরি।",
    objectives_en: ["Convert seconds into hours, minutes and seconds", "Format output with zero padding", "Measure real time with <time.h>"],
    objectives_bn: ["সেকেন্ডকে ঘণ্টা, মিনিট আর সেকেন্ডে রূপান্তর", "শূন্য দিয়ে প্যাড করে আউটপুট ফরম্যাট", "<time.h> দিয়ে আসল সময় মাপা"],
    body_en: `### Goal
Show elapsed time like \`00:01:05\` and update it every second.

### Step 1 — the formatting core
Given total seconds \`t\`:
- hours = \`t / 3600\`
- minutes = \`(t % 3600) / 60\`
- seconds = \`t % 60\`

Print with \`%02d\` so single digits get a leading zero.

### Step 2 — counting real time
\`time(NULL)\` returns the current time in seconds. Record \`start = time(NULL)\`, then in a loop compute \`time(NULL) - start\` and print it when it changes. Printing \`\\r\` (carriage return) without \`\\n\` redraws the same line, making it look like a real stopwatch.

### Step 3 — laps
Store lap times in an array when the user presses a key, and print them at the end.

**Note:** The online IDE runs programs in a time-limited sandbox without live keyboard input, so the example below simulates ticks. Run the real-time version on your own computer.`,
    body_bn: `### লক্ষ্য
অতিবাহিত সময় \`00:01:05\` এর মতো দেখানো এবং প্রতি সেকেন্ডে আপডেট করা।

### ধাপ ১ — ফরম্যাটিংয়ের মূল অংশ
মোট সেকেন্ড \`t\` দেওয়া থাকলে:
- ঘণ্টা = \`t / 3600\`
- মিনিট = \`(t % 3600) / 60\`
- সেকেন্ড = \`t % 60\`

\`%02d\` দিয়ে প্রিন্ট করো যাতে এক অঙ্কের সংখ্যার আগে শূন্য বসে।

### ধাপ ২ — আসল সময় গোনা
\`time(NULL)\` বর্তমান সময় সেকেন্ডে দেয়। \`start = time(NULL)\` রেখে দাও, তারপর লুপে \`time(NULL) - start\` হিসাব করে মান বদলালে প্রিন্ট করো। \`\\n\` ছাড়া \`\\r\` (Carriage Return) প্রিন্ট করলে একই লাইন আবার আঁকা হয় — দেখতে আসল স্টপওয়াচের মতো লাগে।

### ধাপ ৩ — ল্যাপ
ইউজার কোনো কী চাপলে ল্যাপের সময় একটি Array-তে রাখো এবং শেষে প্রিন্ট করো।

**খেয়াল রাখো:** অনলাইন IDE প্রোগ্রাম চালায় সময়-সীমিত Sandbox-এ, যেখানে সরাসরি কিবোর্ড ইনপুট নেই — তাই নিচের উদাহরণে সময় Simulate করা হয়েছে। Real-time সংস্করণটি নিজের কম্পিউটারে চালিয়ে দেখো।`,
    mistakes_en: ["Printing 1:5:3 instead of 01:05:03 by not using %02d", "Busy-waiting without a delay and using 100% CPU", "Computing minutes as t / 60 and getting values above 59"],
    mistakes_bn: ["%02d ব্যবহার না করে 01:05:03 এর বদলে 1:5:3 প্রিন্ট করা", "কোনো বিরতি ছাড়া লুপ ঘুরিয়ে ১০০% CPU খরচ করা", "মিনিট t / 60 দিয়ে হিসাব করে 59 এর বেশি মান পাওয়া"],
    practice_en: ["Read total seconds as input and print HH:MM:SS", "Add a countdown mode that counts from a given time down to 00:00:00"],
    practice_bn: ["মোট সেকেন্ড ইনপুট নিয়ে HH:MM:SS প্রিন্ট করো", "একটি Countdown Mode যোগ করো যা দেওয়া সময় থেকে 00:00:00 পর্যন্ত গোনে"],
    examples: [{
      title_en: "Stopwatch core with simulated laps", title_bn: "Simulated ল্যাপসহ স্টপওয়াচের মূল অংশ",
      code: `#include <stdio.h>

void formatTime(int t, char *out) {
    int h = t / 3600;
    int m = (t % 3600) / 60;
    int s = t % 60;
    sprintf(out, "%02d:%02d:%02d", h, m, s);
}

int main(void) {
    int laps[] = {65, 125, 3661};   /* seconds when lap was pressed */
    int lapCount = 3;
    char buf[16];

    for (int i = 0; i < lapCount; i++) {
        formatTime(laps[i], buf);
        int split = laps[i] - (i ? laps[i - 1] : 0);
        char splitBuf[16];
        formatTime(split, splitBuf);
        printf("Lap %d  %s  (+%s)\\n", i + 1, buf, splitBuf);
    }
    return 0;
}`,
      explanation_en: "formatTime converts seconds to HH:MM:SS with zero padding using sprintf. Each lap also shows the split — the time since the previous lap.",
      explanation_bn: "formatTime sprintf দিয়ে সেকেন্ডকে শূন্য-প্যাডসহ HH:MM:SS এ রূপান্তর করে। প্রতিটি ল্যাপে Split-ও দেখায় — আগের ল্যাপ থেকে কত সময় গেছে।",
    }],
  },
  {
    number: 32, slug: "calendar-app-project", chapter: "projects", topic: null, minutes: 45, is_project: true,
    title_en: "Calendar App Project", title_bn: "ক্যালেন্ডার অ্যাপ প্রজেক্ট",
    summary_en: "Print a neatly aligned monthly calendar for any month and year.",
    summary_bn: "যেকোনো মাস ও বছরের জন্য সুন্দরভাবে সাজানো মাসিক ক্যালেন্ডার প্রিন্ট করা।",
    objectives_en: ["Compute the weekday of a date", "Handle leap years and month lengths", "Align output in a 7-column grid"],
    objectives_bn: ["কোনো তারিখের বার বের করা", "Leap Year আর মাসের দৈর্ঘ্য সামলানো", "৭ কলামের গ্রিডে আউটপুট সাজানো"],
    body_en: `### Goal
Input a year and month, print a calendar like \`cal\` does.

### Step 1 — days in a month
Use an array \`{31, 28, 31, 30, ...}\` and add one day to February in leap years (divisible by 400, or by 4 but not by 100).

### Step 2 — weekday of the 1st
**Zeller-style formula (Sakamoto's method):**
\`\`\`c
int t[] = {0, 3, 2, 5, 0, 3, 5, 1, 4, 6, 2, 4};
if (m < 3) y -= 1;
return (y + y/4 - y/100 + y/400 + t[m-1] + d) % 7;  /* 0 = Sunday */
\`\`\`

### Step 3 — printing the grid
Print the header \`Su Mo Tu We Th Fr Sa\`, then \`3 × weekday\` spaces of indentation, then each day with \`%2d\`, starting a new line after Saturday.

### Extend it
Print the whole year three months per row, or mark Bangladesh public holidays you store in an array.`,
    body_bn: `### লক্ষ্য
একটি বছর আর মাস ইনপুট নিয়ে \`cal\` কমান্ডের মতো ক্যালেন্ডার প্রিন্ট করা।

### ধাপ ১ — মাসের দিনসংখ্যা
\`{31, 28, 31, 30, ...}\` এর মতো একটি Array ব্যবহার করো, আর Leap Year হলে (৪০০ দিয়ে বিভাজ্য, অথবা ৪ দিয়ে বিভাজ্য কিন্তু ১০০ দিয়ে নয়) ফেব্রুয়ারিতে একদিন যোগ করো।

### ধাপ ২ — ১ তারিখ কোন বার
**Sakamoto-র পদ্ধতি:**
\`\`\`c
int t[] = {0, 3, 2, 5, 0, 3, 5, 1, 4, 6, 2, 4};
if (m < 3) y -= 1;
return (y + y/4 - y/100 + y/400 + t[m-1] + d) % 7;  /* 0 = রবিবার */
\`\`\`

### ধাপ ৩ — গ্রিড প্রিন্ট
প্রথমে \`Su Mo Tu We Th Fr Sa\` হেডার, তারপর \`3 × বার\` সংখ্যক স্পেস, তারপর \`%2d\` দিয়ে প্রতিটি দিন — শনিবারের পরে নতুন লাইন।

### আরও বাড়াও
প্রতি সারিতে তিনটি মাস রেখে পুরো বছর প্রিন্ট করো, অথবা একটি Array-তে রাখা বাংলাদেশের সরকারি ছুটির দিনগুলো চিহ্নিত করো।`,
    mistakes_en: ["Forgetting the leap-year adjustment for February", "Starting a new line after every 7 days without accounting for the first-day offset", "Using %d instead of %2d so the columns don't line up"],
    mistakes_bn: ["ফেব্রুয়ারির জন্য Leap Year সমন্বয় ভুলে যাওয়া", "প্রথম দিনের অফসেট না ধরে প্রতি ৭ দিনে নতুন লাইন শুরু করা", "%2d এর বদলে %d দিয়ে প্রিন্ট করায় কলাম না মেলা"],
    practice_en: ["Add input validation for month 1–12", "Print the day of the week for your birthday this year"],
    practice_bn: ["মাস ১–১২ এর মধ্যে কিনা তা যাচাই করো", "এ বছর তোমার জন্মদিন কোন বারে পড়েছে প্রিন্ট করো"],
    examples: [{
      title_en: "Monthly calendar", title_bn: "মাসিক ক্যালেন্ডার",
      code: `#include <stdio.h>

int isLeap(int y) {
    return (y % 400 == 0) || (y % 4 == 0 && y % 100 != 0);
}

int dayOfWeek(int y, int m, int d) {   /* 0 = Sunday */
    static const int t[] = {0, 3, 2, 5, 0, 3, 5, 1, 4, 6, 2, 4};
    if (m < 3) y -= 1;
    return (y + y / 4 - y / 100 + y / 400 + t[m - 1] + d) % 7;
}

int main(void) {
    const char *names[] = {"January", "February", "March", "April", "May", "June", "July",
                           "August", "September", "October", "November", "December"};
    int days[] = {31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31};
    int year, month;
    scanf("%d %d", &year, &month);
    if (month < 1 || month > 12) { printf("Invalid month\\n"); return 0; }
    if (isLeap(year)) days[1] = 29;

    printf("    %s %d\\n", names[month - 1], year);
    printf("Su Mo Tu We Th Fr Sa\\n");
    int start = dayOfWeek(year, month, 1);
    for (int i = 0; i < start; i++) printf("   ");
    for (int d = 1; d <= days[month - 1]; d++) {
        printf("%2d", d);
        if ((start + d) % 7 == 0 || d == days[month - 1]) printf("\\n");
        else printf(" ");
    }
    return 0;
}`,
      stdin: "2024 2",
      explanation_en: "February 2024 has 29 days because 2024 is a leap year, and it starts on a Thursday (weekday 4), so the first row is indented by 12 spaces.",
      explanation_bn: "২০২৪ Leap Year হওয়ায় ফেব্রুয়ারিতে ২৯ দিন, আর মাসটি শুরু বৃহস্পতিবারে (বার 4), তাই প্রথম সারি ১২টি স্পেস ভেতরে শুরু হয়।",
    }],
  },
];
