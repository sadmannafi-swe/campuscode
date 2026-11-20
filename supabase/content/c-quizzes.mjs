// Module quizzes for the C Programming course — one per chapter, 8 questions each:
// 6 multiple-choice + 2 short programming problems judged by the real code runner.
//
// Verification (scripts/build-seed.mjs):
//   * MCQs with `verify: true` are compiled with gcc and run (with `stdin` if given); the normalised
//     output must equal the option marked correct, and must differ from every other option.
//   * Programming problems follow the same rules as supabase/content/problems.mjs: expected outputs
//     come from running `ref_py`, and `ref_c` must produce identical output on every input.
//     The first `samples` inputs are public; the rest are hidden tests, never sent to the browser.
//   * `answer` is the 0-based index of the correct option. Option order is shuffled per attempt.
const R = String.raw;

export const cQuizzes = [
  // =================================================================== MODULE 1
  {
    chapter: "getting-started",
    title_en: "Module 1 Quiz: Getting Started", title_bn: "মডিউল ১ কুইজ: শুরু করা যাক",
    mcq: [
      { key: "c-m1-q1", prompt: "Which function is the starting point of every C program?",
        options: ["main()", "start()", "printf()", "begin()"], answer: 0,
        explanation: "Execution of a C program always begins in main()." },
      { key: "c-m1-q2", prompt: "What does this program print?", verify: true,
        code: R`#include <stdio.h>

int main(void) {
    printf("%d", 7 / 2);
    return 0;
}`,
        options: ["3", "3.5", "4", "3.0"], answer: 0,
        explanation: "Both operands are int, so 7 / 2 is integer division and the fraction is discarded." },
      { key: "c-m1-q3", prompt: "Which of these is a valid variable name in C?",
        options: ["total_marks", "2ndValue", "float", "my-score"], answer: 0,
        explanation: "Names may contain letters, digits and _, cannot start with a digit, cannot be keywords (float) and cannot contain '-'." },
      { key: "c-m1-q4", prompt: "Which printf() format specifier prints a variable of type long int?",
        options: ["%ld", "%f", "%c", "%s"], answer: 0,
        explanation: "%ld is used for long int; %d is for int." },
      { key: "c-m1-q5", prompt: "What does this program print?", verify: true,
        code: R`#include <stdio.h>

int main(void) {
    double price = 2.5;
    printf("%.2f", price);
    return 0;
}`,
        options: ["2.50", "2.5", "2.500000", "3"], answer: 0,
        explanation: "%.2f prints exactly two digits after the decimal point." },
      { key: "c-m1-q6", prompt: "What does this program print?", verify: true,
        code: R`#include <stdio.h>

int main(void) {
    char c = 'A' + 2;
    printf("%c %d", c, c);
    return 0;
}`,
        options: ["C 67", "B 66", "A 65", "C 65"], answer: 0,
        explanation: "'A' is 65 in ASCII, so 'A' + 2 is 67, which is the character 'C'." },
    ],
    coding: [
      {
        slug: "quiz-c-m1-rectangle", difficulty: "easy",
        title: "Rectangle Area and Perimeter", title_bn: "আয়তক্ষেত্রের ক্ষেত্রফল ও পরিসীমা",
        statement: "The starter code already reads the length **L** and width **W** of a rectangle. Compute and print its area and perimeter exactly in the format shown.",
        statement_bn: "Starter code আয়তক্ষেত্রের দৈর্ঘ্য **L** ও প্রস্থ **W** পড়ে নেয়। ক্ষেত্রফল ও পরিসীমা নিচের ফরম্যাটে প্রিন্ট করো।",
        input_format: "One line with two integers L and W.",
        output_format: "Two lines: `Area = A` and `Perimeter = P`.",
        constraints: "1 ≤ L, W ≤ 10000",
        explanation: "For 5 and 3: area 5 × 3 = 15, perimeter 2 × (5 + 3) = 16.",
        hints: ["Area = L × W, perimeter = 2 × (L + W).", "The largest area is 10^8, which fits in an int."],
        samples: 1,
        inputs: ["5 3", "1 1", "10000 10000", "7 12", "250 4", "9999 2"],
        starter_c: R`#include <stdio.h>

int main(void) {
    int length, width;
    scanf("%d %d", &length, &width);
    /* Print the area and the perimeter here. */

    return 0;
}`,
        starter_py: "length, width = map(int, input().split())\n# Print the area and the perimeter here.\n",
        ref_py: "l, w = map(int, input().split())\nprint(f\"Area = {l * w}\")\nprint(f\"Perimeter = {2 * (l + w)}\")",
        ref_c: R`#include <stdio.h>
int main(void){int l,w;scanf("%d %d",&l,&w);printf("Area = %d\nPerimeter = %d\n",l*w,2*(l+w));return 0;}`,
      },
      {
        slug: "quiz-c-m1-ascii-neighbour", difficulty: "easy",
        title: "ASCII Code and Next Letter", title_bn: "ASCII কোড ও পরের অক্ষর",
        statement: "The starter code reads one lowercase letter **c** (from `a` to `y`). Print its ASCII code, a space, and the letter that comes right after it in the alphabet.",
        statement_bn: "Starter code একটি ছোট হাতের অক্ষর **c** (`a` থেকে `y`) পড়ে নেয়। এর ASCII কোড, একটি স্পেস, তারপর বর্ণমালায় ঠিক পরের অক্ষরটি প্রিন্ট করো।",
        input_format: "A single lowercase letter between a and y.",
        output_format: "The ASCII code, a space, and the next letter.",
        constraints: "c is one of a … y",
        explanation: "'a' has ASCII code 97 and the next letter is 'b'.",
        hints: ["A char is a small integer: print it with %d to see its code.", "c + 1 is the next character."],
        samples: 1,
        inputs: ["a", "m", "y", "q", "c", "x"],
        starter_c: R`#include <stdio.h>

int main(void) {
    char c;
    scanf(" %c", &c);
    /* Print the ASCII code of c and the next letter. */

    return 0;
}`,
        starter_py: "c = input().strip()\n# Print the ASCII code of c and the next letter (hint: ord() and chr()).\n",
        ref_py: "c = input().strip()\nprint(ord(c), chr(ord(c) + 1))",
        ref_c: R`#include <stdio.h>
int main(void){char c;scanf(" %c",&c);printf("%d %c\n",c,c+1);return 0;}`,
      },
    ],
  },

  // =================================================================== MODULE 2
  {
    chapter: "input-and-decisions",
    title_en: "Module 2 Quiz: Input and Decisions", title_bn: "মডিউল ২ কুইজ: ইনপুট ও সিদ্ধান্ত",
    mcq: [
      { key: "c-m2-q1", prompt: "Why is the & operator used in `scanf(\"%d\", &n);`?",
        options: ["It passes the address of n so scanf() can store the value there", "It makes n a constant", "It converts the input into an integer", "It prints n after reading it"], answer: 0,
        explanation: "scanf() needs to know where to write the value, so it receives the address of n." },
      { key: "c-m2-q2", prompt: "What does this program print?", verify: true,
        code: R`#include <stdio.h>

int main(void) {
    int x = 2 + 3 * 4;
    printf("%d", x);
    return 0;
}`,
        options: ["14", "20", "24", "9"], answer: 0,
        explanation: "* has higher precedence than +, so 3 * 4 is evaluated first: 2 + 12 = 14." },
      { key: "c-m2-q3", prompt: "What does this program print?", verify: true,
        code: R`#include <stdio.h>

int main(void) {
    int x = 20 / 5 * 2;
    printf("%d", x);
    return 0;
}`,
        options: ["8", "2", "10", "20"], answer: 0,
        explanation: "/ and * have the same precedence and associate left to right: (20 / 5) * 2 = 8." },
      { key: "c-m2-q4", prompt: "What does this program print?", verify: true,
        code: R`#include <stdio.h>

int main(void) {
    int marks = 75;
    if (marks >= 80) printf("A");
    else if (marks >= 70) printf("B");
    else if (marks >= 60) printf("C");
    else printf("F");
    return 0;
}`,
        options: ["B", "A", "BC", "F"], answer: 0,
        explanation: "The first true condition is marks >= 70; the rest of the else-if chain is skipped." },
      { key: "c-m2-q5", prompt: "What does this program print?", verify: true,
        code: R`#include <stdio.h>

int main(void) {
    int day = 2;
    switch (day) {
        case 1: printf("one ");
        case 2: printf("two ");
        case 3: printf("three ");
                break;
        default: printf("other");
    }
    return 0;
}`,
        options: ["two three", "two", "two three other", "one two three"], answer: 0,
        explanation: "Execution starts at case 2 and falls through to case 3 because case 2 has no break." },
      { key: "c-m2-q6", prompt: "What does this program print?", verify: true,
        code: R`#include <stdio.h>

int main(void) {
    int a = 10, b = 3;
    printf("%d", a % b);
    return 0;
}`,
        options: ["1", "3", "0", "10"], answer: 0,
        explanation: "% gives the remainder of integer division: 10 = 3 × 3 + 1." },
    ],
    coding: [
      {
        slug: "quiz-c-m2-ticket-price", difficulty: "easy",
        title: "Ticket Price by Age", title_bn: "বয়স অনুযায়ী টিকিটের দাম",
        statement: "A museum charges by age:\n\n| Age | Price |\n|---|---|\n| 0–4 | 0 |\n| 5–17 | 50 |\n| 18–59 | 100 |\n| 60 and above | 70 |\n\nRead the visitor's age and print the ticket price.",
        statement_bn: "একটি জাদুঘর বয়স অনুযায়ী টিকিটের দাম নেয়: ০–৪ বছর: ০, ৫–১৭: ৫০, ১৮–৫৯: ১০০, ৬০ বা বেশি: ৭০। বয়স ইনপুট নিয়ে টিকিটের দাম প্রিন্ট করো।",
        input_format: "A single integer: the age.",
        output_format: "A single integer: the price.",
        constraints: "0 ≤ age ≤ 120",
        explanation: "Age 17 is in the 5–17 group, so the price is 50.",
        hints: ["Use an if / else-if chain and check the ranges in order."],
        samples: 1,
        inputs: ["17", "0", "4", "5", "18", "59", "60", "120", "35"],
        ref_py: "a = int(input())\nprint(0 if a <= 4 else 50 if a <= 17 else 100 if a <= 59 else 70)",
        ref_c: R`#include <stdio.h>
int main(void){int a;scanf("%d",&a);if(a<=4)printf("0\n");else if(a<=17)printf("50\n");else if(a<=59)printf("100\n");else printf("70\n");return 0;}`,
      },
      {
        slug: "quiz-c-m2-calculator", difficulty: "easy",
        title: "Four-Operation Calculator", title_bn: "চার অপারেশনের ক্যালকুলেটর",
        statement: "Read an expression `a op b` where **op** is one of `+`, `-`, `*`, `/`. Print the result. Division is integer division that truncates toward zero, exactly like C's `/` on int. If the operation is `/` and b is 0, print `Error`.",
        statement_bn: "`a op b` আকারে একটি এক্সপ্রেশন পড়ো, যেখানে **op** হলো `+`, `-`, `*` বা `/`। ফলাফল প্রিন্ট করো। ভাগ হবে C-এর int `/` এর মতো integer division। `/` এর ক্ষেত্রে b শূন্য হলে `Error` প্রিন্ট করো।",
        input_format: "One line: integer a, a space, the operator, a space, integer b.",
        output_format: "The integer result, or `Error`.",
        constraints: "-10000 ≤ a, b ≤ 10000",
        explanation: "17 / 5 is 3 in integer division.",
        hints: ["Read the operator with \" %c\" in scanf().", "A switch on the operator character keeps the code tidy."],
        samples: 2,
        inputs: ["17 / 5", "6 * 7", "10 - 25", "-7 / 2", "9 / 0", "0 + 0", "-10000 * 10000", "100 / -3"],
        ref_py: "a, op, b = input().split()\na, b = int(a), int(b)\nif op == '+': print(a + b)\nelif op == '-': print(a - b)\nelif op == '*': print(a * b)\nelif b == 0: print('Error')\nelse:\n    q = abs(a) // abs(b)\n    print(q if (a >= 0) == (b >= 0) else -q)",
        ref_c: R`#include <stdio.h>
int main(void){int a,b;char op;scanf("%d %c %d",&a,&op,&b);switch(op){case '+':printf("%d\n",a+b);break;case '-':printf("%d\n",a-b);break;case '*':printf("%d\n",a*b);break;case '/':if(b==0)printf("Error\n");else printf("%d\n",a/b);break;}return 0;}`,
      },
    ],
  },

  // =================================================================== MODULE 3
  {
    chapter: "loops",
    title_en: "Module 3 Quiz: Loops", title_bn: "মডিউল ৩ কুইজ: লুপ",
    mcq: [
      { key: "c-m3-q1", prompt: "What does this program print?", verify: true,
        code: R`#include <stdio.h>

int main(void) {
    for (int i = 0; i < 5; i += 2)
        printf("%d ", i);
    return 0;
}`,
        options: ["0 2 4", "0 2 4 6", "1 3 5", "0 1 2 3 4"], answer: 0,
        explanation: "i takes the values 0, 2 and 4; at 6 the condition i < 5 is false." },
      { key: "c-m3-q2", prompt: "What does this program print?", verify: true,
        code: R`#include <stdio.h>

int main(void) {
    int n = 10;
    do {
        printf("%d ", n);
        n++;
    } while (n < 5);
    return 0;
}`,
        options: ["10", "Nothing is printed", "10 11 12 13 14", "5 6 7 8 9"], answer: 0,
        explanation: "A do-while body runs once before the condition is checked; 11 < 5 is false, so it stops." },
      { key: "c-m3-q3", prompt: "What does this program print?", verify: true,
        code: R`#include <stdio.h>

int main(void) {
    int sum = 0, i = 1;
    while (i <= 4) {
        sum += i;
        i++;
    }
    printf("%d", sum);
    return 0;
}`,
        options: ["10", "6", "15", "4"], answer: 0,
        explanation: "1 + 2 + 3 + 4 = 10." },
      { key: "c-m3-q4", prompt: "How many times is `count++` executed?", verify: true,
        code: R`#include <stdio.h>

int main(void) {
    int count = 0;
    for (int i = 0; i < 3; i++)
        for (int j = 0; j < 4; j++)
            count++;
    printf("%d", count);
    return 0;
}`,
        options: ["12", "7", "9", "16"], answer: 0,
        explanation: "The inner loop runs 4 times for each of the 3 outer iterations: 3 × 4 = 12." },
      { key: "c-m3-q5", prompt: "What does this program print?", verify: true,
        code: R`#include <stdio.h>

int main(void) {
    for (int i = 1; i <= 6; i++) {
        if (i == 3) continue;
        if (i == 5) break;
        printf("%d ", i);
    }
    return 0;
}`,
        options: ["1 2 4", "1 2", "1 2 4 5", "1 2 3 4"], answer: 0,
        explanation: "continue skips 3; break stops the loop when i reaches 5." },
      { key: "c-m3-q6", prompt: "Which loop always executes its body at least once?",
        options: ["do-while", "for", "while", "None of them"], answer: 0,
        explanation: "do-while checks its condition after running the body." },
    ],
    coding: [
      {
        slug: "quiz-c-m3-multiples", difficulty: "easy",
        title: "Multiples of K", title_bn: "K-এর গুণিতক",
        statement: "Read N and K. Print every multiple of K between 1 and N (inclusive) in increasing order, separated by single spaces. If there is none, print `None`.",
        statement_bn: "N ও K পড়ো। ১ থেকে N পর্যন্ত (N সহ) K-এর সব গুণিতক ছোট থেকে বড় ক্রমে, একটি করে স্পেস দিয়ে প্রিন্ট করো। একটিও না থাকলে `None` প্রিন্ট করো।",
        input_format: "One line with two integers N and K.",
        output_format: "The multiples on one line, or `None`.",
        constraints: "1 ≤ N ≤ 1000, 1 ≤ K ≤ 1000",
        explanation: "Multiples of 3 up to 10 are 3, 6 and 9.",
        hints: ["Start a loop at K and add K each time."],
        samples: 1,
        inputs: ["10 3", "5 7", "1 1", "20 5", "1000 250", "17 17", "999 1000"],
        ref_py: "n, k = map(int, input().split())\nm = list(range(k, n + 1, k))\nprint(' '.join(map(str, m)) if m else 'None')",
        ref_c: R`#include <stdio.h>
int main(void){int n,k;scanf("%d %d",&n,&k);if(k>n){printf("None\n");return 0;}for(int i=k;i<=n;i+=k)printf(i==k?"%d":" %d",i);printf("\n");return 0;}`,
      },
      {
        slug: "quiz-c-m3-number-triangle", difficulty: "easy",
        title: "Number Triangle", title_bn: "সংখ্যার ত্রিভুজ",
        statement: "Read N and print a triangle with N rows. Row i (starting from 1) contains the numbers 1 to i separated by single spaces.",
        statement_bn: "N পড়ে N সারির একটি ত্রিভুজ প্রিন্ট করো। i-তম সারিতে (১ থেকে শুরু) ১ থেকে i পর্যন্ত সংখ্যা একটি করে স্পেস দিয়ে থাকবে।",
        input_format: "A single integer N.",
        output_format: "N lines as described.",
        constraints: "1 ≤ N ≤ 9",
        explanation: "For N = 3 the rows are `1`, `1 2` and `1 2 3`.",
        hints: ["Use one loop for the rows and a nested loop for the numbers in each row."],
        samples: 1,
        inputs: ["3", "1", "9", "5", "2"],
        ref_py: "n = int(input())\nfor i in range(1, n + 1):\n    print(' '.join(str(j) for j in range(1, i + 1)))",
        ref_c: R`#include <stdio.h>
int main(void){int n;scanf("%d",&n);for(int i=1;i<=n;i++){for(int j=1;j<=i;j++)printf(j==1?"%d":" %d",j);printf("\n");}return 0;}`,
      },
    ],
  },

  // =================================================================== MODULE 4
  {
    chapter: "arrays",
    title_en: "Module 4 Quiz: Arrays", title_bn: "মডিউল ৪ কুইজ: অ্যারে",
    mcq: [
      { key: "c-m4-q1", prompt: "What does this program print?", verify: true,
        code: R`#include <stdio.h>

int main(void) {
    int a[5] = {1, 2};
    printf("%d", a[3]);
    return 0;
}`,
        options: ["0", "2", "A garbage value", "Compile error"], answer: 0,
        explanation: "When an array is partly initialised, the remaining elements are set to 0." },
      { key: "c-m4-q2", prompt: "For `int marks[10];`, what is the index of the last element?",
        options: ["9", "10", "1", "11"], answer: 0,
        explanation: "Indexes start at 0, so a 10-element array uses indexes 0 to 9." },
      { key: "c-m4-q3", prompt: "What does this program print?", verify: true,
        code: R`#include <stdio.h>

int main(void) {
    int a[] = {4, 8, 15, 16, 23};
    int sum = 0;
    for (int i = 0; i < 5; i++)
        if (a[i] % 2 == 0)
            sum += a[i];
    printf("%d", sum);
    return 0;
}`,
        options: ["28", "66", "38", "24"], answer: 0,
        explanation: "Only the even elements are added: 4 + 8 + 16 = 28." },
      { key: "c-m4-q4", prompt: "What does this program print?", verify: true,
        code: R`#include <stdio.h>

int main(void) {
    int m[2][3] = {{1, 2, 3}, {4, 5, 6}};
    printf("%d", m[1][2]);
    return 0;
}`,
        options: ["6", "5", "3", "2"], answer: 0,
        explanation: "m[1] is the second row {4, 5, 6}; index 2 in that row is 6." },
      { key: "c-m4-q5", prompt: "In a linear search of an unsorted array with n elements, how many comparisons are needed in the worst case?",
        options: ["n", "1", "n / 2", "n × n"], answer: 0,
        explanation: "If the value is last or missing, every element has to be checked once." },
      { key: "c-m4-q6", prompt: "What does this program print?", verify: true,
        code: R`#include <stdio.h>

int main(void) {
    int a[8];
    printf("%zu", sizeof(a) / sizeof(a[0]));
    return 0;
}`,
        options: ["8", "32", "4", "7"], answer: 0,
        explanation: "Total bytes of the array divided by the bytes of one element gives the number of elements." },
    ],
    coding: [
      {
        slug: "quiz-c-m4-above-average", difficulty: "easy",
        title: "Above the Average", title_bn: "গড়ের চেয়ে বেশি",
        statement: "Read N integers and print how many of them are **strictly greater** than their average.",
        statement_bn: "N টি পূর্ণসংখ্যা পড়ো এবং প্রিন্ট করো তাদের মধ্যে কয়টি গড়ের চেয়ে **কঠোরভাবে বড়**।",
        input_format: "First line: N. Second line: N integers.",
        output_format: "A single integer: the count.",
        constraints: "1 ≤ N ≤ 1000, -10^6 ≤ each value ≤ 10^6",
        explanation: "The average of 2 4 6 8 is 5, and two values (6 and 8) are greater than 5.",
        hints: ["Store the values in an array, compute the sum first, then traverse again.", "value > sum / N can be checked without fractions as value * N > sum (use long long)."],
        samples: 1,
        inputs: ["4\n2 4 6 8", "1\n5", "5\n1 1 1 1 1", "3\n-3 0 3", "6\n10 -10 7 -7 1 2", "4\n1000000 -1000000 999999 -999999", "5\n1 2 3 4 100"],
        ref_py: "n = int(input())\na = list(map(int, input().split()))\ns = sum(a)\nprint(sum(1 for x in a if x * n > s))",
        ref_c: R`#include <stdio.h>
int main(void){int n;long long a[1000],s=0;scanf("%d",&n);for(int i=0;i<n;i++){scanf("%lld",&a[i]);s+=a[i];}int c=0;for(int i=0;i<n;i++)if(a[i]*n>s)c++;printf("%d\n",c);return 0;}`,
      },
      {
        slug: "quiz-c-m4-diagonal", difficulty: "easy",
        title: "Main Diagonal Sum", title_bn: "প্রধান কর্ণের যোগফল",
        statement: "Read an N × N matrix and print the sum of its main diagonal (the elements where row index equals column index).",
        statement_bn: "একটি N × N ম্যাট্রিক্স পড়ে এর প্রধান কর্ণের (যেখানে সারি ও কলামের ইনডেক্স সমান) উপাদানগুলোর যোগফল প্রিন্ট করো।",
        input_format: "First line: N. Then N lines, each with N integers.",
        output_format: "A single integer: the diagonal sum.",
        constraints: "1 ≤ N ≤ 10, -1000 ≤ each value ≤ 1000",
        explanation: "For [[1, 2], [3, 4]] the diagonal is 1 and 4, so the sum is 5.",
        hints: ["Use a two-dimensional array int m[10][10].", "Add m[i][i] for each i."],
        samples: 1,
        inputs: ["2\n1 2\n3 4", "1\n-7", "3\n1 0 0\n0 1 0\n0 0 1", "3\n5 9 9\n9 -5 9\n9 9 5", "4\n1 2 3 4\n5 6 7 8\n9 10 11 12\n13 14 15 16"],
        ref_py: "n = int(input())\nm = [list(map(int, input().split())) for _ in range(n)]\nprint(sum(m[i][i] for i in range(n)))",
        ref_c: R`#include <stdio.h>
int main(void){int n,m[10][10],s=0;scanf("%d",&n);for(int i=0;i<n;i++)for(int j=0;j<n;j++)scanf("%d",&m[i][j]);for(int i=0;i<n;i++)s+=m[i][i];printf("%d\n",s);return 0;}`,
      },
    ],
  },

  // =================================================================== MODULE 5
  {
    chapter: "functions",
    title_en: "Module 5 Quiz: Functions", title_bn: "মডিউল ৫ কুইজ: ফাংশন",
    mcq: [
      { key: "c-m5-q1", prompt: "What does the return type `void` mean for a function?",
        options: ["The function does not return a value", "The function returns 0", "The function takes no parameters", "The function can return any type"], answer: 0,
        explanation: "void as a return type means no value is returned to the caller." },
      { key: "c-m5-q2", prompt: "What does this program print?", verify: true,
        code: R`#include <stdio.h>

int square(int x) {
    return x * x;
}

int main(void) {
    printf("%d", square(3) + square(2));
    return 0;
}`,
        options: ["13", "25", "10", "36"], answer: 0,
        explanation: "square(3) is 9 and square(2) is 4; 9 + 4 = 13." },
      { key: "c-m5-q3", prompt: "What does this program print?", verify: true,
        code: R`#include <stdio.h>

void change(int x) {
    x = 100;
}

int main(void) {
    int a = 5;
    change(a);
    printf("%d", a);
    return 0;
}`,
        options: ["5", "100", "0", "105"], answer: 0,
        explanation: "Arguments are passed by value: change() modifies its own copy, not a." },
      { key: "c-m5-q4", prompt: "What is a function prototype (declaration) such as `int add(int a, int b);`?",
        options: ["It tells the compiler the function's name, return type and parameter types before it is used", "It is the body of the function", "It calls the function", "It is a comment that the compiler ignores"], answer: 0,
        explanation: "A prototype declares the function so it can be called before its definition appears." },
      { key: "c-m5-q5", prompt: "What does this program print?", verify: true,
        code: R`#include <stdio.h>

int add(int a, int b) {
    return a + b;
}

int main(void) {
    printf("%d", add(add(1, 2), add(3, 4)));
    return 0;
}`,
        options: ["10", "7", "3", "24"], answer: 0,
        explanation: "The inner calls give 3 and 7, then add(3, 7) is 10." },
      { key: "c-m5-q6", prompt: "How many values can a C function return directly with one return statement?",
        options: ["One", "Two", "As many as it has parameters", "None"], answer: 0,
        explanation: "return gives back a single value (to return more, use pointers or a struct)." },
    ],
    coding: [
      {
        slug: "quiz-c-m5-perfect-number", difficulty: "easy",
        title: "Perfect Number Check", title_bn: "পারফেক্ট সংখ্যা যাচাই",
        statement: "A **perfect number** equals the sum of its positive divisors excluding itself (6 = 1 + 2 + 3). Write a function `int isPerfect(int n)` and use it to print `Perfect` or `Not Perfect` for the given N.",
        statement_bn: "**পারফেক্ট সংখ্যা** তার নিজেকে বাদ দিয়ে সব ধনাত্মক ভাজকের যোগফলের সমান (৬ = ১ + ২ + ৩)। `int isPerfect(int n)` ফাংশন লিখে প্রদত্ত N-এর জন্য `Perfect` বা `Not Perfect` প্রিন্ট করো।",
        input_format: "A single integer N.",
        output_format: "`Perfect` or `Not Perfect`.",
        constraints: "1 ≤ N ≤ 100000",
        explanation: "28 = 1 + 2 + 4 + 7 + 14, so 28 is perfect.",
        hints: ["Loop i from 1 to n − 1 and add i whenever n % i == 0.", "1 is not perfect: it has no divisors other than itself."],
        samples: 1,
        inputs: ["28", "6", "1", "12", "496", "8128", "100000", "2"],
        ref_py: "n = int(input())\ns = sum(i for i in range(1, n) if n % i == 0)\nprint('Perfect' if n > 1 and s == n else 'Not Perfect')",
        ref_c: R`#include <stdio.h>
int isPerfect(int n){int s=0;for(int i=1;i<n;i++)if(n%i==0)s+=i;return n>1&&s==n;}
int main(void){int n;scanf("%d",&n);printf(isPerfect(n)?"Perfect\n":"Not Perfect\n");return 0;}`,
      },
      {
        slug: "quiz-c-m5-digit-sum", difficulty: "easy",
        title: "Sum of Digits Function", title_bn: "অঙ্কের যোগফলের ফাংশন",
        statement: "Write a function `int digitSum(int n)` that returns the sum of the decimal digits of a non-negative integer, then read N and print `digitSum(N)`.",
        statement_bn: "একটি ফাংশন `int digitSum(int n)` লেখো যা একটি অঋণাত্মক পূর্ণসংখ্যার অঙ্কগুলোর যোগফল রিটার্ন করে, তারপর N পড়ে `digitSum(N)` প্রিন্ট করো।",
        input_format: "A single integer N.",
        output_format: "The sum of the digits of N.",
        constraints: "0 ≤ N ≤ 2 000 000 000",
        explanation: "1 + 2 + 3 + 4 = 10.",
        hints: ["n % 10 is the last digit and n / 10 removes it.", "Repeat while n > 0."],
        samples: 1,
        inputs: ["1234", "0", "9", "2000000000", "1999999999", "505"],
        ref_py: "print(sum(int(d) for d in input().strip()))",
        ref_c: R`#include <stdio.h>
int digitSum(int n){int s=0;while(n>0){s+=n%10;n/=10;}return s;}
int main(void){int n;scanf("%d",&n);printf("%d\n",digitSum(n));return 0;}`,
      },
    ],
  },

  // =================================================================== MODULE 6
  {
    chapter: "strings",
    title_en: "Module 6 Quiz: Strings", title_bn: "মডিউল ৬ কুইজ: স্ট্রিং",
    mcq: [
      { key: "c-m6-q1", prompt: "What does this program print?", verify: true,
        code: R`#include <stdio.h>

int main(void) {
    char s[] = "code";
    printf("%zu", sizeof(s));
    return 0;
}`,
        options: ["5", "4", "8", "1"], answer: 0,
        explanation: "The array holds the 4 letters plus the terminating '\\0'." },
      { key: "c-m6-q2", prompt: "Which character marks the end of a string in C?",
        options: ["'\\0' (the null character)", "'\\n' (newline)", "' ' (space)", "'.' (full stop)"], answer: 0,
        explanation: "Every C string ends with the null character '\\0'." },
      { key: "c-m6-q3", prompt: "What does this program print?", verify: true,
        code: R`#include <stdio.h>
#include <string.h>

int main(void) {
    printf("%zu", strlen("hello world"));
    return 0;
}`,
        options: ["11", "10", "12", "5"], answer: 0,
        explanation: "strlen() counts every character, including the space, but not the '\\0'." },
      { key: "c-m6-q4", prompt: "What does this program print?", verify: true,
        code: R`#include <stdio.h>
#include <string.h>

int main(void) {
    char a[20] = "Campus";
    strcat(a, "Code");
    printf("%s %zu", a, strlen(a));
    return 0;
}`,
        options: ["CampusCode 10", "Campus Code 11", "CampusCode 6", "Code 4"], answer: 0,
        explanation: "strcat() appends \"Code\" to the end of a, giving the 10-character string CampusCode." },
      { key: "c-m6-q5", prompt: "What does `strcmp(\"apple\", \"banana\")` return?",
        options: ["A negative value", "0", "A positive value", "The length of the shorter string"], answer: 0,
        explanation: "\"apple\" comes before \"banana\", so strcmp() returns a value less than 0." },
      { key: "c-m6-q6", prompt: "The user types `Rahim Khan` and presses Enter. What does this program print?", verify: true,
        stdin: "Rahim Khan\n",
        code: R`#include <stdio.h>

int main(void) {
    char name[50];
    scanf("%s", name);
    printf("%s", name);
    return 0;
}`,
        options: ["Rahim", "Rahim Khan", "Khan", "Nothing is printed"], answer: 0,
        explanation: "scanf(\"%s\") stops reading at the first whitespace." },
    ],
    coding: [
      {
        slug: "quiz-c-m6-count-uppercase", difficulty: "easy",
        title: "Count Capital Letters", title_bn: "বড় হাতের অক্ষর গণনা",
        statement: "Read one line of text (it may contain spaces) and print how many uppercase English letters (A–Z) it contains.",
        statement_bn: "এক লাইন টেক্সট পড়ো (এতে স্পেস থাকতে পারে) এবং এতে কয়টি বড় হাতের ইংরেজি অক্ষর (A–Z) আছে তা প্রিন্ট করো।",
        input_format: "One line of printable ASCII text.",
        output_format: "A single integer: the count.",
        constraints: "1 ≤ length ≤ 200",
        explanation: "\"Hello World\" contains H and W.",
        hints: ["scanf(\"%[^\\n]\", s) reads a whole line including spaces.", "A character c is uppercase when c >= 'A' && c <= 'Z'."],
        samples: 1,
        inputs: ["Hello World", "campuscode", "ABC def GHI", "C Programming In Bangla 2026!", "Z", "123 !? xyz"],
        ref_py: "s = input()\nprint(sum(1 for ch in s if 'A' <= ch <= 'Z'))",
        ref_c: R`#include <stdio.h>
int main(void){char s[256];scanf("%255[^\n]",s);int c=0;for(int i=0;s[i];i++)if(s[i]>='A'&&s[i]<='Z')c++;printf("%d\n",c);return 0;}`,
      },
      {
        slug: "quiz-c-m6-reverse-word", difficulty: "easy",
        title: "Reverse a Word", title_bn: "শব্দ উল্টে দাও",
        statement: "Read a single word (no spaces) and print it reversed.",
        statement_bn: "একটি শব্দ (স্পেস ছাড়া) পড়ে সেটিকে উল্টো করে প্রিন্ট করো।",
        input_format: "One word of letters and digits.",
        output_format: "The word reversed.",
        constraints: "1 ≤ length ≤ 100",
        explanation: "\"CampusCode\" reversed is \"edoCsupmaC\".",
        hints: ["strlen() gives the length; print from the last index down to 0."],
        samples: 1,
        inputs: ["CampusCode", "a", "level", "abc123", "Dhaka", "ZzYy"],
        ref_py: "print(input().strip()[::-1])",
        ref_c: R`#include <stdio.h>
#include <string.h>
int main(void){char s[128];scanf("%127s",s);for(int i=(int)strlen(s)-1;i>=0;i--)putchar(s[i]);printf("\n");return 0;}`,
      },
    ],
  },

  // =================================================================== MODULE 7
  {
    chapter: "structures-and-pointers",
    title_en: "Module 7 Quiz: Structures and Pointers", title_bn: "মডিউল ৭ কুইজ: স্ট্রাকচার ও পয়েন্টার",
    mcq: [
      { key: "c-m7-q1", prompt: "What does this program print?", verify: true,
        code: R`#include <stdio.h>

struct Point {
    int x;
    int y;
};

int main(void) {
    struct Point p = {3, 4};
    printf("%d", p.x * p.y);
    return 0;
}`,
        options: ["12", "7", "34", "0"], answer: 0,
        explanation: "p.x is 3 and p.y is 4; 3 × 4 = 12." },
      { key: "c-m7-q2", prompt: "What does this program print?", verify: true,
        code: R`#include <stdio.h>

int main(void) {
    int a = 10;
    int *p = &a;
    *p = 25;
    printf("%d", a);
    return 0;
}`,
        options: ["25", "10", "35", "The address of a"], answer: 0,
        explanation: "p points to a, so assigning through *p changes a itself." },
      { key: "c-m7-q3", prompt: "Which operator gives the memory address of a variable?",
        options: ["&", "*", "->", "%"], answer: 0,
        explanation: "&x is the address of x; * dereferences a pointer." },
      { key: "c-m7-q4", prompt: "Which statement about calloc() is true?",
        options: ["It allocates memory for an array of elements and sets every byte to zero", "It frees memory that was allocated earlier", "It can only shrink an existing block", "It allocates memory on the stack"], answer: 0,
        explanation: "calloc(n, size) allocates n × size bytes and zero-initialises them; malloc() does not initialise." },
      { key: "c-m7-q5", prompt: "What does this program print?", verify: true,
        code: R`#include <stdio.h>

int main(void) {
    int arr[] = {10, 20, 30, 40};
    int *p = arr;
    printf("%d", *(p + 2));
    return 0;
}`,
        options: ["30", "20", "12", "40"], answer: 0,
        explanation: "p + 2 points to arr[2], whose value is 30." },
      { key: "c-m7-q6", prompt: "After you have finished using memory obtained from malloc() or realloc(), which function should you call?",
        options: ["free()", "delete()", "release()", "fclose()"], answer: 0,
        explanation: "free() returns dynamically allocated memory to the system." },
    ],
    coding: [
      {
        slug: "quiz-c-m7-largest-rectangle", difficulty: "medium",
        title: "Largest Rectangle (struct)", title_bn: "সবচেয়ে বড় আয়তক্ষেত্র (struct)",
        statement: "Store N rectangles in an array of `struct Rect { int w; int h; };`. Print the 1-based position of the rectangle with the largest area, followed by that area. If several have the same largest area, choose the first one.",
        statement_bn: "N টি আয়তক্ষেত্র `struct Rect { int w; int h; };` এর অ্যারেতে রাখো। সবচেয়ে বড় ক্ষেত্রফলের আয়তক্ষেত্রের অবস্থান (১ থেকে গণনা) এবং সেই ক্ষেত্রফল প্রিন্ট করো। সমান হলে প্রথমটি নাও।",
        input_format: "First line: N. Then N lines, each with w and h.",
        output_format: "Two integers: the position and the area.",
        constraints: "1 ≤ N ≤ 100, 1 ≤ w, h ≤ 10000",
        explanation: "Areas are 6, 20 and 20; the first largest is rectangle 2.",
        hints: ["Keep the index of the best rectangle seen so far.", "Use > (not >=) so the first one wins a tie."],
        samples: 1,
        inputs: ["3\n2 3\n4 5\n10 2", "1\n7 7", "4\n1 1\n2 2\n3 3\n4 4", "3\n10000 10000\n1 1\n10000 10000", "5\n3 4\n6 2\n2 6\n1 12\n12 1"],
        ref_py: "n = int(input())\nbest, idx = -1, 0\nfor i in range(n):\n    w, h = map(int, input().split())\n    if w * h > best:\n        best, idx = w * h, i + 1\nprint(idx, best)",
        ref_c: R`#include <stdio.h>
struct Rect{int w;int h;};
int main(void){int n;struct Rect r[100];scanf("%d",&n);for(int i=0;i<n;i++)scanf("%d %d",&r[i].w,&r[i].h);int b=0;for(int i=1;i<n;i++)if(r[i].w*r[i].h>r[b].w*r[b].h)b=i;printf("%d %d\n",b+1,r[b].w*r[b].h);return 0;}`,
      },
      {
        slug: "quiz-c-m7-prefix-sums", difficulty: "medium",
        title: "Running Totals with malloc()", title_bn: "malloc() দিয়ে ক্রমযোজিত যোগফল",
        statement: "Read N, allocate an array of N integers with `malloc()`, read the values, and print the running totals: the i-th output is the sum of the first i values. Free the memory before the program ends.",
        statement_bn: "N পড়ে `malloc()` দিয়ে N টি পূর্ণসংখ্যার অ্যারে তৈরি করো, মানগুলো পড়ো এবং ক্রমযোজিত যোগফল প্রিন্ট করো: i-তম আউটপুট হলো প্রথম i টি মানের যোগফল। প্রোগ্রাম শেষের আগে মেমোরি free করো।",
        input_format: "First line: N. Second line: N integers.",
        output_format: "N running totals separated by single spaces.",
        constraints: "1 ≤ N ≤ 100000, -10^6 ≤ each value ≤ 10^6",
        explanation: "For 1 2 3 4 the totals are 1, 3, 6 and 10.",
        hints: ["int *a = malloc(n * sizeof(int));", "Totals can exceed int: use long long for the running sum."],
        samples: 1,
        inputs: ["4\n1 2 3 4", "1\n-5", "5\n1000000 1000000 1000000 1000000 1000000", "6\n3 -3 3 -3 3 -3", "3\n0 0 0"],
        ref_py: "n = int(input())\na = list(map(int, input().split()))\nt, out = 0, []\nfor x in a:\n    t += x\n    out.append(str(t))\nprint(' '.join(out))",
        ref_c: R`#include <stdio.h>
#include <stdlib.h>
int main(void){int n;scanf("%d",&n);int *a=malloc(n*sizeof(int));if(!a)return 1;for(int i=0;i<n;i++)scanf("%d",&a[i]);long long t=0;for(int i=0;i<n;i++){t+=a[i];printf(i?" %lld":"%lld",t);}printf("\n");free(a);return 0;}`,
      },
    ],
  },

  // =================================================================== MODULE 8
  {
    chapter: "files-and-preprocessor",
    title_en: "Module 8 Quiz: Files and the Preprocessor", title_bn: "মডিউল ৮ কুইজ: ফাইল ও প্রিপ্রসেসর",
    mcq: [
      { key: "c-m8-q1", prompt: "Which fopen() mode opens a text file for writing at the end of the file, keeping its existing contents?",
        options: ["\"a\"", "\"w\"", "\"r\"", "\"x\""], answer: 0,
        explanation: "\"a\" (append) adds to the end; \"w\" erases the file first; \"r\" only reads." },
      { key: "c-m8-q2", prompt: "What does fopen() return if the file cannot be opened?",
        options: ["NULL", "0 bytes of data", "EOF", "An empty file"], answer: 0,
        explanation: "Always check the returned FILE * against NULL before using it." },
      { key: "c-m8-q3", prompt: "What does this program print?", verify: true,
        code: R`#include <stdio.h>
#define SQUARE(x) ((x) * (x))

int main(void) {
    printf("%d", SQUARE(3 + 1));
    return 0;
}`,
        options: ["16", "7", "10", "4"], answer: 0,
        explanation: "The macro expands to ((3 + 1) * (3 + 1)) = 16; the parentheses in the macro make this safe." },
      { key: "c-m8-q4", prompt: "What does `#include <stdio.h>` do?",
        options: ["It inserts the contents of the header file, which declares functions like printf() and scanf()", "It links the program with the internet", "It defines the main() function", "It runs the program in standard mode"], answer: 0,
        explanation: "The preprocessor copies the header's declarations into your file before compilation." },
      { key: "c-m8-q5", prompt: "`fgets(buf, 10, fp)` reads at most how many characters into buf, not counting the terminating '\\0'?",
        options: ["9", "10", "11", "Until the end of the file"], answer: 0,
        explanation: "fgets() reads at most n − 1 characters and always leaves room for '\\0'." },
      { key: "c-m8-q6", prompt: "What does fscanf() return when it reaches the end of the file before reading any value?",
        options: ["EOF", "NULL", "The last value it read", "1"], answer: 0,
        explanation: "fscanf() returns EOF when input ends before the first conversion; loops often use while (fscanf(...) == 1)." },
    ],
    coding: [
      {
        slug: "quiz-c-m8-notes-file", difficulty: "medium",
        title: "Notes File Round Trip", title_bn: "নোট ফাইলে লেখা ও পড়া",
        statement: "Read N and then N lines of text. Write the lines to a file named `notes.txt` with `fputs()`, close it, open it again for reading, and print every line read back with `fgets()` prefixed by its line number and a colon, like `1: first line`.",
        statement_bn: "N এবং তারপর N লাইন টেক্সট পড়ো। লাইনগুলো `fputs()` দিয়ে `notes.txt` ফাইলে লেখো, ফাইল বন্ধ করো, আবার পড়ার জন্য খোলো এবং `fgets()` দিয়ে পড়া প্রতিটি লাইন তার লাইন নম্বর ও কোলনসহ প্রিন্ট করো, যেমন `1: first line`।",
        input_format: "First line: N. Then N lines (each up to 100 characters, may contain spaces).",
        output_format: "N lines in the form `k: text`.",
        constraints: "1 ≤ N ≤ 50",
        explanation: "Each line is written to the file and read back in the same order.",
        hints: ["After scanf(\"%d\", &n), consume the rest of the line before using fgets() on stdin.", "Always check that fopen() did not return NULL, and call fclose() after writing."],
        samples: 1,
        inputs: ["2\nhello world\nsecond line", "1\nCampusCode", "3\na b c\n123\nlast line here", "4\nOne\nTwo\nThree\nFour"],
        ref_py: "n = int(input())\nlines = [input() for _ in range(n)]\nwith open('notes.txt', 'w') as f:\n    for line in lines:\n        f.write(line + '\\n')\nwith open('notes.txt') as f:\n    for k, line in enumerate(f, 1):\n        print(f'{k}: {line.rstrip(chr(10))}')",
        ref_c: R`#include <stdio.h>
int main(void){int n;char line[256];scanf("%d",&n);fgets(line,sizeof line,stdin);FILE*f=fopen("notes.txt","w");if(!f)return 1;for(int i=0;i<n;i++){if(!fgets(line,sizeof line,stdin))break;fputs(line,f);}fclose(f);f=fopen("notes.txt","r");if(!f)return 1;int k=1;while(fgets(line,sizeof line,f)){int len=0;while(line[len])len++;if(len&&line[len-1]=='\n')line[len-1]=0;printf("%d: %s\n",k++,line);}fclose(f);return 0;}`,
      },
      {
        slug: "quiz-c-m8-circle-define", difficulty: "easy",
        title: "Circle with #define", title_bn: "#define দিয়ে বৃত্ত",
        statement: "Define the constant `#define PI 3.14159` and use it to print the area (PI × r × r) and the circumference (2 × PI × r) of a circle with radius r, each rounded to 2 decimal places.",
        statement_bn: "`#define PI 3.14159` ধ্রুবক সংজ্ঞায়িত করে r ব্যাসার্ধের বৃত্তের ক্ষেত্রফল (PI × r × r) ও পরিধি (2 × PI × r) দুই দশমিক ঘর পর্যন্ত প্রিন্ট করো।",
        input_format: "A single real number r.",
        output_format: "Two lines: `Area = A` and `Circumference = C`, both with two decimals.",
        constraints: "0 < r ≤ 1000",
        explanation: "For r = 1: area 3.14, circumference 6.28.",
        hints: ["Read r with %lf into a double.", "printf(\"%.2f\", x) prints two decimals."],
        samples: 1,
        inputs: ["1", "2.5", "10", "0.1", "1000", "7.75"],
        ref_py: "r = float(input())\nPI = 3.14159\nprint(f\"Area = {PI * r * r:.2f}\")\nprint(f\"Circumference = {2 * PI * r:.2f}\")",
        ref_c: R`#include <stdio.h>
#define PI 3.14159
int main(void){double r;scanf("%lf",&r);printf("Area = %.2f\nCircumference = %.2f\n",PI*r*r,2*PI*r);return 0;}`,
      },
    ],
  },

  // =================================================================== MODULE 9
  {
    chapter: "projects",
    title_en: "Module 9 Quiz: Projects", title_bn: "মডিউল ৯ কুইজ: প্রজেক্ট",
    mcq: [
      { key: "c-m9-q1", prompt: "Which of these years is a leap year?",
        options: ["2000", "1900", "2100", "2023"], answer: 0,
        explanation: "Century years are leap years only if divisible by 400: 2000 is, 1900 and 2100 are not." },
      { key: "c-m9-q2", prompt: "Which condition correctly checks whether year y is a leap year?",
        options: ["(y % 4 == 0 && y % 100 != 0) || y % 400 == 0", "y % 4 == 0", "y % 100 == 0 && y % 400 != 0", "y % 4 == 0 || y % 100 == 0"], answer: 0,
        explanation: "Divisible by 4 but not by 100, unless it is also divisible by 400." },
      { key: "c-m9-q3", prompt: "What does this program print?", verify: true,
        code: R`#include <stdio.h>

int main(void) {
    int total = 3725;
    int h = total / 3600;
    int m = (total % 3600) / 60;
    int s = total % 60;
    printf("%02d:%02d:%02d", h, m, s);
    return 0;
}`,
        options: ["01:02:05", "01:20:05", "1:2:5", "00:62:05"], answer: 0,
        explanation: "3725 s = 1 hour (3600 s) + 2 minutes (120 s) + 5 seconds; %02d pads with a zero." },
      { key: "c-m9-q4", prompt: "In a digital stopwatch that shows minutes and seconds, what should happen when the seconds value reaches 60?",
        options: ["Seconds reset to 0 and minutes increase by 1", "Seconds keep increasing to 61", "Minutes reset to 0", "The stopwatch stops"], answer: 0,
        explanation: "Each unit rolls over into the next: 60 seconds make one minute." },
      { key: "c-m9-q5", prompt: "If 1 January is a Monday, which day of the week is 1 February of the same year?",
        options: ["Thursday", "Wednesday", "Friday", "Monday"], answer: 0,
        explanation: "January has 31 days; 31 % 7 = 3, so the weekday moves 3 days forward from Monday." },
      { key: "c-m9-q6", prompt: "A calendar app prints dates with `printf(\"%3d\", day);`. What does %3d do?",
        options: ["Prints the integer right-aligned in a field at least 3 characters wide", "Prints only the first 3 digits", "Prints the number 3 times", "Prints the number with 3 decimal places"], answer: 0,
        explanation: "The width 3 pads with spaces on the left, so the calendar columns line up." },
    ],
    coding: [
      {
        slug: "quiz-c-m9-stopwatch-display", difficulty: "easy",
        title: "Stopwatch Display", title_bn: "স্টপওয়াচ ডিসপ্লে",
        statement: "A stopwatch has counted **T** seconds. Print the time as `HH:MM:SS`, each part with at least two digits (hours may grow beyond 99).",
        statement_bn: "একটি স্টপওয়াচ **T** সেকেন্ড গুনেছে। সময়টি `HH:MM:SS` আকারে প্রিন্ট করো, প্রতিটি অংশ কমপক্ষে দুই অঙ্কের (ঘণ্টা ৯৯-এর বেশি হতে পারে)।",
        input_format: "A single integer T.",
        output_format: "The time as HH:MM:SS.",
        constraints: "0 ≤ T ≤ 1 000 000",
        explanation: "3725 seconds is 1 hour, 2 minutes and 5 seconds: 01:02:05.",
        hints: ["Hours = T / 3600, minutes = (T % 3600) / 60, seconds = T % 60.", "%02d pads with a leading zero."],
        samples: 1,
        inputs: ["3725", "0", "59", "60", "86399", "1000000", "3600"],
        ref_py: "t = int(input())\nprint(f\"{t // 3600:02d}:{t % 3600 // 60:02d}:{t % 60:02d}\")",
        ref_c: R`#include <stdio.h>
int main(void){int t;scanf("%d",&t);printf("%02d:%02d:%02d\n",t/3600,t%3600/60,t%60);return 0;}`,
      },
      {
        slug: "quiz-c-m9-days-in-month", difficulty: "easy",
        title: "Days in a Month", title_bn: "মাসে কত দিন",
        statement: "Read a month number (1–12) and a year, and print how many days that month has, using the Gregorian leap-year rule for February.",
        statement_bn: "মাসের নম্বর (১–১২) ও বছর পড়ে সেই মাসে কত দিন তা প্রিন্ট করো। ফেব্রুয়ারির জন্য গ্রেগরিয়ান লিপ-ইয়ার নিয়ম ব্যবহার করো।",
        input_format: "One line with two integers: month and year.",
        output_format: "A single integer: the number of days.",
        constraints: "1 ≤ month ≤ 12, 1 ≤ year ≤ 9999",
        explanation: "February 2024 has 29 days because 2024 is a leap year.",
        hints: ["Leap year: (y % 4 == 0 && y % 100 != 0) || y % 400 == 0.", "A switch on the month keeps the 30/31-day months tidy."],
        samples: 1,
        inputs: ["2 2024", "2 1900", "2 2000", "2 2023", "1 2023", "4 2023", "12 9999", "9 1"],
        ref_py: "m, y = map(int, input().split())\nleap = (y % 4 == 0 and y % 100 != 0) or y % 400 == 0\nprint(29 if m == 2 and leap else 28 if m == 2 else 30 if m in (4, 6, 9, 11) else 31)",
        ref_c: R`#include <stdio.h>
int main(void){int m,y;scanf("%d %d",&m,&y);int leap=(y%4==0&&y%100!=0)||y%400==0;int d;switch(m){case 2:d=leap?29:28;break;case 4:case 6:case 9:case 11:d=30;break;default:d=31;}printf("%d\n",d);return 0;}`,
      },
    ],
  },
];
