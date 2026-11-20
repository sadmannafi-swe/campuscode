// YouTube playlist → C course mapping (playlist inspected in full: 33 videos, channel "Bangla Coding Tutor").
// Every video was checked against its YouTube description before mapping; all 33 are public and embeddable
// (oEmbed 200). Video 1 is the course trailer → course-level intro, not a lesson.
export const PLAYLIST_ID = "PLdl6zXgLsy3zwNjSMiYlOZOr20sykTfgo";
export const CHANNEL = "Bangla Coding Tutor";

export const cVideos = [
  { position: 1, videoId: "O3vzpGGZpIE", durationSeconds: 107, lesson: null, // course intro
    title: "সি প্রোগ্রামিং শিখি অ্যামাজন ইঞ্জিনিয়ার এর সাথে- ইউনিভার্সিটির ফুল কোর্স। C Programming Bangla." },
  { position: 2, videoId: "Kwye58pHhxE", durationSeconds: 1325, lesson: "getting-started-printf", // L01 Getting Started with C and printf()
    title: "সি প্রোগ্রামিং- ০১:  Play with Printf()- কিভাবে শুরু করব সি প্রোগামিং. C Programming Bangla Tutorial" },
  { position: 3, videoId: "yrhf85_bqP0", durationSeconds: 1954, lesson: "data-types-and-variables", // L02 Data Types and Variables
    title: "সি প্রোগ্রামিং- ০২: Data Type & Variables | C Programming Bangla Tutorial | Bangla Coding Tutor" },
  { position: 4, videoId: "WJznertdKXg", durationSeconds: 550, lesson: "integer-and-long-integer", // L03 Integer and Long Integer
    title: "সি প্রোগ্রামিং - ০৩ঃ Integer & Long Integer | Bangla Coding Tutor | C Programming Bangla Tutorial" },
  { position: 5, videoId: "vHCCmlAwEO4", durationSeconds: 447, lesson: "float-and-double", // L04 Float and Double
    title: "সি প্রোগ্রামিং - ০৪ঃ Float & Double | Bangla Coding Tutor | C Programming Bangla Tutorial" },
  { position: 6, videoId: "A0BBp-sKTeg", durationSeconds: 526, lesson: "character-and-ascii", // L05 Character and ASCII Code
    title: "সি প্রোগ্রামিং - ০৫ঃ Character & ASCII Code | Bangla Coding Tutor | C Programming Bangla Tutorial" },
  { position: 7, videoId: "bz2fhsxH6dw", durationSeconds: 741, lesson: "user-input-scanf", // L06 User Input and scanf()
    title: "সি প্রোগ্রামিং - ০৬ঃ User Input scanf() | Bangla Coding Tutor | C Programming Bangla Tutorial" },
  { position: 8, videoId: "131sbMRQVxc", durationSeconds: 1467, lesson: "if-else", // L07 If-Else
    title: "সি প্রোগ্রামিং - ০৭ঃ Condition- If Else | Bangla Coding Tutor | C Programming Bangla Tutorial" },
  { position: 9, videoId: "YiSSRggLTg0", durationSeconds: 911, lesson: "else-if",
    noteEn: "The video's author notes in the description that part of the theory in this video is incorrect: an if block placed inside another if or else block is a *nested* if-else, while if…else if is a flatter way to express most of the same decisions (some people also call it a nested condition). The written explanation below follows the correct terminology.",
    noteBn: "ভিডিওর লেখক ডিসক্রিপশনে জানিয়েছেন, এই ভিডিওর কিছু থিওরিটিক্যাল কথা ভুল ছিল: একটি if বা else ব্লকের ভেতরে আরেকটি if থাকলে সেটাকে Nested if-else বলে, আর if…else if দিয়ে প্রায় একই সিদ্ধান্তগুলো এক লেয়ারে সহজভাবে লেখা যায় (অনেকে একে Nested Condition-ও বলেন)। নিচের লেখা ব্যাখ্যায় সঠিক পরিভাষা ব্যবহার করা হয়েছে।", // L08 Else-If
    title: "সি প্রোগ্রামিং - ০৮ঃ Condition- if.. else if | Bangla Coding Tutor | C Programming Bangla Tutorial" },
  { position: 10, videoId: "v7I6-qm2ZYU", durationSeconds: 838, lesson: "switch-case", // L09 Switch Case
    title: "সি প্রোগ্রামিং - ০৯ঃ Switch Case | Bangla Coding Tutor | C Programming Bangla Tutorial" },
  { position: 11, videoId: "AR2HKNPntME", durationSeconds: 1024, lesson: "operators-precedence-associativity", // L10 Operators, Precedence and Associativity
    title: "সি প্রোগ্রামিং - ১০ঃ Operator, Precedence, Associativity | Bangla Coding Tutor | C Bangla Tutorial" },
  { position: 12, videoId: "6-9xhJsp1Vo", durationSeconds: 1467, lesson: "for-loop", // L11 For Loop
    title: "সি প্রোগ্রামিং -১১ঃ for Loop | Bangla Coding Tutor | C Programming Bangla Tutorial" },
  { position: 13, videoId: "hTU2AA-lpSU", durationSeconds: 622, lesson: "while-loop", // L12 While Loop
    title: "সি প্রোগ্রামিং - ১২ঃ while Loop | Bangla Coding Tutor | C Programming Bangla Tutorial" },
  { position: 14, videoId: "U6SfSl3Nf-g", durationSeconds: 393, lesson: "do-while-loop", // L13 Do-While Loop
    title: "সি প্রোগ্রামিং - ১৩ঃ do while Loop | Bangla Coding Tutor | C Programming Bangla Tutorial" },
  { position: 15, videoId: "AY7GOmY9a8Y", durationSeconds: 984, lesson: "nested-loop", // L14 Nested Loop
    title: "সি প্রোগ্রামিং - ১৪ঃ Nested Loop | Bangla Coding Tutor | C Programming Bangla Tutorial" },
  { position: 16, videoId: "UQVM-empou4", durationSeconds: 490, lesson: "break-and-continue", // L15 Break and Continue
    title: "সি প্রোগ্রামিং - ১৫ঃ Break and Continue | Bangla Coding Tutor | C Programming Bangla Tutorial" },
  { position: 17, videoId: "QGkMWkOQro0", durationSeconds: 643, lesson: "loop-practice-problems", // L16 Loop Practice Problems
    title: "সি প্রোগ্রামিং - ১৬ঃ Loop Practice Problems| Bangla Coding Tutor | C Programming Bangla Tutorial" },
  { position: 18, videoId: "iGenyxwahTw", durationSeconds: 1084, lesson: "array-introduction", // L17 Array Introduction
    title: "সি প্রোগ্রামিং - ১৭ঃ Array Introduction | Bangla Coding Tutor | C Programming Bangla Tutorial" },
  { position: 19, videoId: "cLl2BRl0oeI", durationSeconds: 1110, lesson: "array-operations", // L18 Array Operations
    title: "সি প্রোগ্রামিং - ১৮ঃ Array Operations | Bangla Coding Tutor | C Programming Bangla Tutorial" },
  { position: 20, videoId: "SxijtYOqQ00", durationSeconds: 1079, lesson: "two-dimensional-array", // L19 Two-Dimensional Array
    title: "সি প্রোগ্রামিং - ১৯ঃ 2D Array | Bangla Coding Tutor | C Programming Bangla Tutorial" },
  { position: 21, videoId: "Uu9I_mCIR58", durationSeconds: 1187, lesson: "function-introduction", // L20 Function Introduction
    title: "সি প্রোগ্রামিং - ২০ঃ Function Introduction | Bangla Coding Tutor | C Programming Bangla Tutorial" },
  { position: 22, videoId: "-6V1KO3tjKw", durationSeconds: 1030, lesson: "function-exercises", // L21 Function Exercises
    title: "সি প্রোগ্রামিং - ২১ঃ Function Exercise in C | Bangla Coding Tutor | C Programming Bangla Tutorial" },
  { position: 23, videoId: "ASyLQYGgPks", durationSeconds: 829, lesson: "string-in-c", // L22 String in C
    title: "সি প্রোগ্রামিং - ২২ঃ String in C | Bangla Coding Tutor | C Programming Bangla Tutorial" },
  { position: 24, videoId: "lY5KalJGc48", durationSeconds: 532, lesson: "string-functions", // L23 String Functions
    title: "সি প্রোগ্রামিং - ২৩ঃ String Functions in C | Bangla Coding Tutor | C Programming Bangla Tutorial" },
  { position: 25, videoId: "2EiIYRFBBus", durationSeconds: 654, lesson: "structure-in-c", // L24 Structure in C
    title: "সি প্রোগ্রামিং - ২৪ঃ Structure in C | Bangla Coding Tutor | C Programming Bangla Tutorial" },
  { position: 26, videoId: "ZDwB72yiqeE", durationSeconds: 1407, lesson: "pointer-in-c", // L25 Pointer in C
    title: "সি প্রোগ্রামিং -২৫ঃ Pointer in C | Bangla Coding Tutor | C Programming Bangla Tutorial" },
  { position: 27, videoId: "M9D677MoXZg", durationSeconds: 1293, lesson: "dynamic-memory-allocation", // L26 Dynamic Memory Allocation: malloc, calloc, free, realloc
    title: "C Programming - 26: Pointers - Dynamic Memory Allocation, malloc(), calloc(), free(), realloc()" },
  { position: 28, videoId: "91ucuAeAGd8", durationSeconds: 1296, lesson: "pointer-array-function", // L27 Pointer Relationship with Array and Function
    title: "সি প্রোগ্রামিং -২৭ঃ Pointer- relation with Array and Function | Bangla Coding Tutor" },
  { position: 29, videoId: "aaqXmefOLKU", durationSeconds: 2002, lesson: "file-handling", // L28 File Handling: Read, Write, fscanf(), fgets(), fputs()
    title: "সি প্রোগ্রামিং - ২৮: File in C Programming Bangla Tutorial. Read, Write, fscanf, fgets, fputs" },
  { position: 30, videoId: "JW0ltVKS2po", durationSeconds: 1738, lesson: "advanced-file-handling-project", // L29 Advanced File Handling and File Project
    title: "সি প্রোগ্রামিং - ২৯: File in C Programming (Advanced & Complete) Bangla Tutorial. File Project in C." },
  { position: 31, videoId: "FW19KIqRJZc", durationSeconds: 893, lesson: "header-files-and-define", // L30 C Header Files and #define
    title: "সি প্রোগ্রামিং - ৩০: C Header Files and #define Bangla Tutorial. Header file in C Programming Bangla" },
  { position: 32, videoId: "ovfyxbijcc0", durationSeconds: 1452, lesson: "digital-stopwatch-project", // L31 Digital Stopwatch Project
    title: "Digital Stop Watch- C Programming Full Project in Bangla. C Programming Semester Final Class Project" },
  { position: 33, videoId: "hafg8uCSb1w", durationSeconds: 1628, lesson: "calendar-app-project", // L32 Calendar App Project
    title: "Calendar App- C Programming Full Project in Bangla. C Programming Semester Final Class Project" },
];
