import type { Lang } from "@/types/db";

export const TEMPLATES: Record<Lang, string> = {
  c: `#include <stdio.h>

int main(void) {
    int a, b;
    scanf("%d %d", &a, &b);
    printf("%d\\n", a + b);
    return 0;
}
`,
  python: `a, b = map(int, input().split())
print(a + b)
`,
};

export const TEMPLATE_STDIN = "12 30";

export interface IdeExample { id: string; title: string; language: Lang; code: string; stdin: string }

export const EXAMPLES: IdeExample[] = [
  { id: "c-hello", title: "Hello, World", language: "c", stdin: "",
    code: `#include <stdio.h>\n\nint main(void) {\n    printf("Hello, CampusCode!\\n");\n    return 0;\n}\n` },
  { id: "c-square", title: "Square of a number", language: "c", stdin: "12",
    code: `#include <stdio.h>\n\nint main(void) {\n    int n;\n    scanf("%d", &n);\n    printf("%d\\n", n * n);\n    return 0;\n}\n` },
  { id: "c-loop", title: "For loop: 1 to N", language: "c", stdin: "5",
    code: `#include <stdio.h>\n\nint main(void) {\n    int n;\n    scanf("%d", &n);\n    for (int i = 1; i <= n; i++) {\n        printf("%d ", i);\n    }\n    printf("\\n");\n    return 0;\n}\n` },
  { id: "c-array", title: "Array: max and average", language: "c", stdin: "5\n78 91 85 66 70",
    code: `#include <stdio.h>\n\nint main(void) {\n    int n, a[100], sum = 0;\n    scanf("%d", &n);\n    for (int i = 0; i < n; i++) {\n        scanf("%d", &a[i]);\n        sum += a[i];\n    }\n    int max = a[0];\n    for (int i = 1; i < n; i++)\n        if (a[i] > max) max = a[i];\n    printf("Max: %d\\nAverage: %.2f\\n", max, (double)sum / n);\n    return 0;\n}\n` },
  { id: "c-function", title: "Function: is prime?", language: "c", stdin: "97",
    code: `#include <stdio.h>\n\nint isPrime(int n) {\n    if (n < 2) return 0;\n    for (int i = 2; i * i <= n; i++)\n        if (n % i == 0) return 0;\n    return 1;\n}\n\nint main(void) {\n    int n;\n    scanf("%d", &n);\n    printf("%d is %s\\n", n, isPrime(n) ? "prime" : "not prime");\n    return 0;\n}\n` },
  { id: "py-hello", title: "Hello, World", language: "python", stdin: "",
    code: `print("Hello, CampusCode!")\n` },
  { id: "py-vowels", title: "Count vowels", language: "python", stdin: "campuscode",
    code: `def count_vowels(text):\n    total = 0\n    for ch in text:\n        if ch in "aeiou":\n            total += 1\n    return total\n\nprint(count_vowels(input().strip()))\n` },
  { id: "py-list", title: "List: sort and filter", language: "python", stdin: "7 2 9 4 12",
    code: `values = list(map(int, input().split()))\nprint("Sorted:", sorted(values))\nprint("Even:", [v for v in values if v % 2 == 0])\n` },
];
