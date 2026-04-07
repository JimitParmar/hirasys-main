import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session || !["HR", "ADMIN"].includes((session.user as any).role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { type, difficulty, questionCount, languages, skills, context } = await req.json();

    // Check if OpenAI is configured
    if (!process.env.GEMINI_API_KEY) {
      // Return mock questions for development
      return NextResponse.json({
        questions: generateMockQuestions(type, difficulty, questionCount || 3),
      });
    }

    const { aiJSON } = await import("@/lib/ai");

    if (type === "coding") {
      const result = await aiJSON<{ questions: any[] }>(
        `Generate ${questionCount || 3} coding assessment questions.
For each question return:
{
  "questions": [
    {
      "title": "Short descriptive title",
      "description": "Detailed problem description with input/output format and constraints. Include 2-3 examples.",
      "difficulty": "${difficulty || "medium"}",
      "type": "coding",
      "points": 25,
      "starterCode": {
        "javascript": "function solve(input) {\\n  // Your code here\\n}",
        "python": "def solve(input):\\n    # Your code here\\n    pass"
      },
      "testCases": [
        { "id": "tc1", "input": "sample", "expectedOutput": "result", "isHidden": false, "points": 5 },
        { "id": "tc2", "input": "sample2", "expectedOutput": "result2", "isHidden": false, "points": 5 },
        { "id": "tc3", "input": "edge", "expectedOutput": "result3", "isHidden": true, "points": 5 },
        { "id": "tc4", "input": "large", "expectedOutput": "result4", "isHidden": true, "points": 5 },
        { "id": "tc5", "input": "corner", "expectedOutput": "result5", "isHidden": true, "points": 5 }
      ]
    }
  ]
}
Make problems practical and relevant. Test real engineering skills.
${skills?.length ? `Focus on: ${skills.join(", ")}` : ""}
${context ? `Job context: ${context}` : ""}`,
        `Generate ${questionCount || 3} ${difficulty || "medium"} coding questions.
${languages?.length ? `Languages: ${languages.join(", ")}` : "Languages: JavaScript, Python"}`
      );

      return NextResponse.json({ questions: result.questions || [] });
    }

    if (type === "mcq") {
      const result = await aiJSON<{ questions: any[] }>(
        `Generate ${questionCount || 20} MCQ questions for a technical assessment.
Return:
{
  "questions": [
    {
      "title": "Question text",
      "description": "Additional context if needed",
      "difficulty": "${difficulty || "medium"}",
      "type": "mcq",
      "points": 5,
      "options": [
        { "id": "a", "text": "Option A" },
        { "id": "b", "text": "Option B" },
        { "id": "c", "text": "Option C" },
        { "id": "d", "text": "Option D" }
      ],
      "correctAnswer": "b",
      "explanation": "Brief explanation"
    }
  ]
}
Test deep understanding, not trivia. Make wrong options plausible.
${skills?.length ? `Topics: ${skills.join(", ")}` : ""}`,
        `Generate ${questionCount || 20} ${difficulty || "medium"} MCQ questions.`
      );

      return NextResponse.json({ questions: result.questions || [] });
    }

    return NextResponse.json({ error: "Unknown type" }, { status: 400 });
  } catch (error: any) {
    console.error("Generation error:", error);
    return NextResponse.json({ error: "Failed to generate" }, { status: 500 });
  }
}

// Mock questions for development without OpenAI key
function generateMockQuestions(type: string, difficulty: string, count: number) {
  if (type === "coding") {
    const problems = [
      {
        title: "Two Sum",
        description: `Given a comma-separated list of integers and a target value (last number), find two numbers that add up to the target and return their indices separated by a comma.

Input Format:
- A comma-separated string where the last number is the target
- Example: "2,7,11,15,9" means array=[2,7,11,15] and target=9

Output Format:
- Two indices separated by comma
- Example: "0,1" (because arr[0] + arr[1] = 2 + 7 = 9)

Constraints:
- Each input has exactly one solution
- You may not use the same element twice

Examples:
Input: 2,7,11,15,9
Output: 0,1
(Because 2 + 7 = 9)

Input: 3,2,4,6
Output: 1,2
(Because 2 + 4 = 6)`,
        difficulty,
        type: "coding",
        points: 30,
        starterCode: {
          javascript: `function solve(input) {
  // Parse input: last number is target, rest is the array
  const parts = input.split(',').map(Number);
  const target = parts.pop();
  const nums = parts;
  
  // Your code here
  // Return "index1,index2"
  
}`,
          python: `def solve(input):
    # Parse input: last number is target, rest is the array
    parts = list(map(int, input.split(',')))
    target = parts.pop()
    nums = parts
    
    # Your code here
    # Return "index1,index2"
    
    pass`,
        },
        testCases: [
          { id: "tc1", input: "2,7,11,15,9", expectedOutput: "0,1", isHidden: false, points: 5 },
          { id: "tc2", input: "3,2,4,6", expectedOutput: "1,2", isHidden: false, points: 5 },
          { id: "tc3", input: "3,3,6", expectedOutput: "0,1", isHidden: false, points: 5 },
          { id: "tc4", input: "1,5,3,7,8", expectedOutput: "2,1", isHidden: true, points: 5 },
          { id: "tc5", input: "-1,0,1,0", expectedOutput: "0,2", isHidden: true, points: 5 },
          { id: "tc6", input: "100,200,300,400,500", expectedOutput: "1,2", isHidden: true, points: 5 },
        ],
      },
      {
        title: "Reverse String Words",
        description: `Given a string of words separated by spaces, reverse the order of words.

Input Format:
- A string with words separated by spaces

Output Format:
- Words in reversed order, separated by single spaces

Examples:
Input: hello world
Output: world hello

Input: the sky is blue
Output: blue is sky the

Input: coding is fun
Output: fun is coding

Note: Remove any leading/trailing spaces.`,
        difficulty,
        type: "coding",
        points: 25,
        starterCode: {
          javascript: `function solve(input) {
  // Reverse the words in the string
  // Return the reversed string
  
}`,
          python: `def solve(input):
    # Reverse the words in the string
    # Return the reversed string
    
    pass`,
        },
        testCases: [
          { id: "tc1", input: "hello world", expectedOutput: "world hello", isHidden: false, points: 5 },
          { id: "tc2", input: "the sky is blue", expectedOutput: "blue is sky the", isHidden: false, points: 5 },
          { id: "tc3", input: "coding is fun", expectedOutput: "fun is coding", isHidden: false, points: 5 },
          { id: "tc4", input: "a", expectedOutput: "a", isHidden: true, points: 5 },
          { id: "tc5", input: "one two three four five", expectedOutput: "five four three two one", isHidden: true, points: 5 },
        ],
      },
      {
        title: "Find Maximum Subarray Sum",
        description: `Given a comma-separated list of integers, find the contiguous subarray with the largest sum and return that sum.

Input Format:
- Comma-separated integers

Output Format:
- A single integer (the maximum subarray sum)

Examples:
Input: -2,1,-3,4,-1,2,1,-5,4
Output: 6
(The subarray [4,-1,2,1] has the largest sum = 6)

Input: 1
Output: 1

Input: 5,4,-1,7,8
Output: 23
(The entire array has the largest sum)

Hint: Consider Kadane's algorithm.`,
        difficulty: "medium",
        type: "coding",
        points: 35,
        starterCode: {
          javascript: `function solve(input) {
  const nums = input.split(',').map(Number);
  
  // Find the maximum subarray sum
  // Return the sum as a string
  
}`,
          python: `def solve(input):
    nums = list(map(int, input.split(',')))
    
    # Find the maximum subarray sum
    # Return the sum
    
    pass`,
        },
        testCases: [
          { id: "tc1", input: "-2,1,-3,4,-1,2,1,-5,4", expectedOutput: "6", isHidden: false, points: 5 },
          { id: "tc2", input: "1", expectedOutput: "1", isHidden: false, points: 5 },
          { id: "tc3", input: "5,4,-1,7,8", expectedOutput: "23", isHidden: false, points: 5 },
          { id: "tc4", input: "-1,-2,-3,-4", expectedOutput: "-1", isHidden: true, points: 5 },
          { id: "tc5", input: "1,2,3,4,5", expectedOutput: "15", isHidden: true, points: 5 },
          { id: "tc6", input: "-1,2,3,-5,4,6,-2", expectedOutput: "10", isHidden: true, points: 5 },
          { id: "tc7", input: "0,0,0,0", expectedOutput: "0", isHidden: true, points: 5 },
        ],
      },
    ];

    return problems.slice(0, count);
  }

  // MCQ mock
  return Array.from({ length: count }, (_, i) => ({
    title: `What is the output of the following code? (Q${i + 1})`,
    description: i === 0
      ? '```\nconst a = [1,2,3];\nconst b = a;\nb.push(4);\nconsole.log(a.length);\n```'
      : i === 1
        ? 'Which data structure uses FIFO (First In, First Out)?'
        : 'What is the time complexity of binary search?',
    difficulty,
    type: "mcq",
    points: 5,
    options: i === 0
      ? [
          { id: "a", text: "3" },
          { id: "b", text: "4" },
          { id: "c", text: "undefined" },
          { id: "d", text: "Error" },
        ]
      : i === 1
        ? [
            { id: "a", text: "Stack" },
            { id: "b", text: "Queue" },
            { id: "c", text: "Tree" },
            { id: "d", text: "Graph" },
          ]
        : [
            { id: "a", text: "O(n)" },
            { id: "b", text: "O(log n)" },
            { id: "c", text: "O(n²)" },
            { id: "d", text: "O(1)" },
          ],
    correctAnswer: i === 0 ? "b" : i === 1 ? "b" : "b",
    explanation: i === 0
      ? "Arrays are reference types. b = a makes both point to the same array."
      : i === 1
        ? "Queue follows First In First Out principle."
        : "Binary search divides the search space in half each step.",
  }));
}