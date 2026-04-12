export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session || !["HR", "ADMIN"].includes((session.user as any).role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { type, difficulty, questionCount, languages, skills, context, jobContext } = await req.json();

    // Build rich context from job description
    let jobDescription = context || "";
    let jobSkills: string[] = skills || [];
    let jobTitle = "";
    let jobRequirements: string[] = [];

    if (jobContext) {
      jobTitle = jobContext.title || "";
      jobDescription = jobContext.description || jobDescription;
      jobSkills = jobContext.skills || jobSkills;
      jobRequirements = jobContext.requirements || [];
    }

    console.log("Generating questions for:", jobTitle || "No job linked");
    console.log("Skills:", jobSkills.join(", "));
    console.log("Languages:", (languages || []).join(", "));

    // Check if Gemini is configured
    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json({
        questions: generateMockQuestions(type, difficulty, questionCount || 3, languages || []),
      });
    }

    const { aiJSON } = await import("@/lib/ai");

    if (type === "coding") {
      const hasSQL = languages?.some((l: string) => ["sql", "mysql", "postgresql"].includes(l));

      const result = await aiJSON<{ questions: any[] }>(
        `You are an expert technical interviewer. Generate ${questionCount || 3} coding assessment questions.

JOB CONTEXT:
Title: ${jobTitle || "Software Developer"}
Description: ${jobDescription || "General software development role"}
Required Skills: ${jobSkills.join(", ") || "Programming"}
Requirements: ${jobRequirements.join(", ") || "Not specified"}

IMPORTANT:
- Questions MUST be relevant to this specific job
- Test skills mentioned in the job description
- If the job mentions React, ask React-related coding questions
- If the job mentions databases/SQL, include SQL questions
- If the job mentions system design, ask architecture questions
- Match difficulty to "${difficulty || "medium"}"
- Available languages: ${(languages || ["javascript", "python"]).join(", ")}
${hasSQL ? `- MUST include at least 1 SQL question since SQL is an enabled language
- For SQL questions, provide setup SQL (CREATE TABLE + INSERT) in the test case input as JSON: {"setup": "CREATE TABLE...INSERT INTO..."}
- SQL test case expectedOutput should be pipe-separated: "col1|col2\\nval1|val2"` : ""}

For each coding question return:
{
  "title": "Short descriptive title",
  "description": "Detailed problem with examples, input/output format, constraints",
  "difficulty": "${difficulty || "medium"}",
  "type": "coding",
  "points": 25,
  "starterCode": {
    ${(languages || ["javascript", "python"]).map((l: string) => {
      if (l === "javascript") return '"javascript": "function solve(input) {\\n  // Your code here\\n}"';
      if (l === "python") return '"python": "def solve(input):\\n    # Your code here\\n    pass"';
      if (l === "typescript") return '"typescript": "function solve(input: any): any {\\n  // Your code here\\n}"';
      if (l === "sql" || l === "mysql" || l === "postgresql") return '"sql": "-- Write your SQL query here\\nSELECT "';
      if (l === "java") return '"java": "class Solution {\\n  public static String solve(String input) {\\n    // Your code here\\n    return \\\"\\\";\\n  }\\n}"';
      return `"${l}": "// Your code here"`;
    }).join(",\n    ")}
  },
  "testCases": [
    { "id": "tc1", "input": "sample input", "expectedOutput": "expected output", "isHidden": false, "points": 5 },
    { "id": "tc2", "input": "another input", "expectedOutput": "expected output", "isHidden": false, "points": 5 },
    { "id": "tc3", "input": "edge case", "expectedOutput": "expected", "isHidden": true, "points": 5 },
    { "id": "tc4", "input": "large input", "expectedOutput": "expected", "isHidden": true, "points": 5 },
    { "id": "tc5", "input": "corner case", "expectedOutput": "expected", "isHidden": true, "points": 5 }
  ]
}

Return as: { "questions": [...] }`,
        `Generate ${questionCount || 3} ${difficulty || "medium"} coding questions for "${jobTitle || "Developer"}".
Test these skills: ${jobSkills.join(", ") || "general programming"}.
Languages: ${(languages || ["javascript", "python"]).join(", ")}`
      );

      return NextResponse.json({ questions: result.questions || [] });
    }

    if (type === "mcq") {
      const result = await aiJSON<{ questions: any[] }>(
        `Generate ${questionCount || 20} MCQ questions for a technical assessment.

JOB CONTEXT:
Title: ${jobTitle || "Software Developer"}
Description: ${jobDescription || "General software development role"}
Required Skills: ${jobSkills.join(", ") || "Programming"}
Requirements: ${jobRequirements.join(", ") || "Not specified"}

IMPORTANT:
- Questions MUST test skills relevant to THIS specific job
- Cover all required skills from the description
- Mix conceptual understanding with practical knowledge
- Make wrong options plausible
- Difficulty: ${difficulty || "medium"}

Return JSON:
{
  "questions": [
    {
      "title": "Question text",
      "description": "Code snippet or context if needed",
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
      "explanation": "Brief explanation of why this is correct"
    }
  ]
}`,
        `Generate ${questionCount || 20} ${difficulty || "medium"} MCQs for "${jobTitle || "Developer"}" testing: ${jobSkills.join(", ") || "programming"}`
      );

      return NextResponse.json({ questions: result.questions || [] });
    }

    return NextResponse.json({ error: "Unknown type" }, { status: 400 });
  } catch (error: any) {
    console.error("Generation error:", error);
    return NextResponse.json({ error: "Failed to generate" }, { status: 500 });
  }
}

// ==========================================
// MOCK QUESTIONS (when no AI key available)
// ==========================================

function generateMockQuestions(
  type: string,
  difficulty: string,
  count: number,
  languages: string[] = []
) {
  if (type === "coding") {
    const hasSQL = languages.some((l) => ["sql", "mysql", "postgresql"].includes(l));
    const problems = [];

    // JavaScript/Python problems
    problems.push(
      {
        title: "Two Sum",
        description: `Given a comma-separated list of integers and a target value (last number), find two numbers that add up to the target and return their indices separated by a comma.

Input Format:
- Comma-separated string where the last number is the target
- Example: "2,7,11,15,9" means array=[2,7,11,15] and target=9

Output Format:
- Two indices separated by comma: "0,1"

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
          javascript: `function solve(input) {\n  const parts = input.split(',').map(Number);\n  const target = parts.pop();\n  const nums = parts;\n  \n  // Your code here\n  // Return "index1,index2"\n}`,
          python: `def solve(input):\n    parts = list(map(int, input.split(',')))\n    target = parts.pop()\n    nums = parts\n    \n    # Your code here\n    # Return "index1,index2"\n    pass`,
          typescript: `function solve(input: string): string {\n  const parts = input.split(',').map(Number);\n  const target = parts.pop()!;\n  const nums = parts;\n  \n  // Your code here\n  return "";\n}`,
          sql: "-- This is a programming question. Use JavaScript or Python.",
        },
        testCases: [
          { id: "tc1", input: "2,7,11,15,9", expectedOutput: "0,1", isHidden: false, points: 5 },
          { id: "tc2", input: "3,2,4,6", expectedOutput: "1,2", isHidden: false, points: 5 },
          { id: "tc3", input: "3,3,6", expectedOutput: "0,1", isHidden: false, points: 5 },
          { id: "tc4", input: "-1,0,1,0", expectedOutput: "0,2", isHidden: true, points: 5 },
          { id: "tc5", input: "1,5,3,7,8", expectedOutput: "0,3", isHidden: true, points: 5 },
          { id: "tc6", input: "100,200,300,400,500", expectedOutput: "1,2", isHidden: true, points: 5 },
        ],
      },
      {
        title: "Reverse Words",
        description: `Given a string of words separated by spaces, reverse the order of words.

Input: A string with words
Output: Words in reversed order

Examples:
Input: hello world
Output: world hello

Input: the sky is blue
Output: blue is sky the

Input: coding is fun
Output: fun is coding`,
        difficulty: "easy",
        type: "coding",
        points: 20,
        starterCode: {
          javascript: `function solve(input) {\n  // Reverse the words in the string\n  // Return the reversed string\n}`,
          python: `def solve(input):\n    # Reverse the words in the string\n    pass`,
          typescript: `function solve(input: string): string {\n  // Reverse the words\n  return "";\n}`,
          sql: "-- This is a programming question. Use JavaScript or Python.",
        },
        testCases: [
          { id: "tc1", input: "hello world", expectedOutput: "world hello", isHidden: false, points: 5 },
          { id: "tc2", input: "the sky is blue", expectedOutput: "blue is sky the", isHidden: false, points: 5 },
          { id: "tc3", input: "coding is fun", expectedOutput: "fun is coding", isHidden: false, points: 5 },
          { id: "tc4", input: "a", expectedOutput: "a", isHidden: true, points: 5 },
        ],
      },
      {
        title: "Maximum Subarray Sum",
        description: `Given a comma-separated list of integers, find the contiguous subarray with the largest sum.

Input: Comma-separated integers
Output: The maximum subarray sum

Examples:
Input: -2,1,-3,4,-1,2,1,-5,4
Output: 6
(Subarray [4,-1,2,1] has sum 6)

Input: 5,4,-1,7,8
Output: 23

Input: -1
Output: -1`,
        difficulty: "medium",
        type: "coding",
        points: 30,
        starterCode: {
          javascript: `function solve(input) {\n  const nums = input.split(',').map(Number);\n  \n  // Find maximum subarray sum\n  // Return the sum\n}`,
          python: `def solve(input):\n    nums = list(map(int, input.split(',')))\n    \n    # Find maximum subarray sum\n    pass`,
          typescript: `function solve(input: string): string {\n  const nums = input.split(',').map(Number);\n  // Kadane's algorithm\n  return "";\n}`,
          sql: "-- This is a programming question. Use JavaScript or Python.",
        },
        testCases: [
          { id: "tc1", input: "-2,1,-3,4,-1,2,1,-5,4", expectedOutput: "6", isHidden: false, points: 5 },
          { id: "tc2", input: "1", expectedOutput: "1", isHidden: false, points: 5 },
          { id: "tc3", input: "5,4,-1,7,8", expectedOutput: "23", isHidden: false, points: 5 },
          { id: "tc4", input: "-1,-2,-3,-4", expectedOutput: "-1", isHidden: true, points: 5 },
          { id: "tc5", input: "1,2,3,4,5", expectedOutput: "15", isHidden: true, points: 5 },
          { id: "tc6", input: "-1,2,3,-5,4,6,-2", expectedOutput: "10", isHidden: true, points: 5 },
        ],
      }
    );

    // SQL problems — only add if SQL is enabled
    if (hasSQL) {
      problems.push(
        {
          title: "Top Customers by Order Total",
          description: `Given a 'customers' table and an 'orders' table, find the top 3 customers by total order amount.

Tables:
- customers (id INT, name TEXT, email TEXT)
- orders (id INT, customer_id INT, amount DECIMAL, order_date TEXT)

Write a SQL query that returns:
- Customer name
- Total order amount (as total_amount)
- Sorted by total descending
- Limited to top 3

Output format: name|total_amount (pipe separated)`,
          difficulty,
          type: "coding",
          points: 25,
          starterCode: {
            sql: `-- Find top 3 customers by total order amount\nSELECT \n  c.name,\n  SUM(o.amount) as total_amount\nFROM customers c\nJOIN orders o ON c.id = o.customer_id\nGROUP BY c.name\nORDER BY total_amount DESC\nLIMIT 3;`,
            postgresql: `-- Find top 3 customers by total order amount\nSELECT \n  c.name,\n  SUM(o.amount) as total_amount\nFROM customers c\nJOIN orders o ON c.id = o.customer_id\nGROUP BY c.name\nORDER BY total_amount DESC\nLIMIT 3;`,
            javascript: `// This is a SQL question. Switch language to SQL.\nfunction solve(input) {\n  return "Switch to SQL language";\n}`,
            python: `# This is a SQL question. Switch language to SQL.\ndef solve(input):\n    return "Switch to SQL language"`,
          },
          testCases: [
            {
              id: "sql_tc1",
              input: JSON.stringify({
                setup: `CREATE TABLE customers (id INTEGER PRIMARY KEY, name TEXT, email TEXT);
CREATE TABLE orders (id INTEGER PRIMARY KEY, customer_id INTEGER, amount DECIMAL(10,2), order_date TEXT);
INSERT INTO customers VALUES (1, 'Alice', 'alice@test.com');
INSERT INTO customers VALUES (2, 'Bob', 'bob@test.com');
INSERT INTO customers VALUES (3, 'Charlie', 'charlie@test.com');
INSERT INTO customers VALUES (4, 'Diana', 'diana@test.com');
INSERT INTO orders VALUES (1, 1, 500.00, '2024-01-15');
INSERT INTO orders VALUES (2, 1, 300.00, '2024-02-20');
INSERT INTO orders VALUES (3, 2, 1000.00, '2024-01-10');
INSERT INTO orders VALUES (4, 3, 200.00, '2024-03-05');
INSERT INTO orders VALUES (5, 2, 250.00, '2024-03-15');
INSERT INTO orders VALUES (6, 4, 50.00, '2024-02-28');`,
              }),
              expectedOutput: "name|total_amount\nBob|1250.00\nAlice|800.00\nCharlie|200.00",
              isHidden: false,
              points: 10,
            },
            {
              id: "sql_tc2",
              input: JSON.stringify({
                setup: `CREATE TABLE customers (id INTEGER PRIMARY KEY, name TEXT, email TEXT);
CREATE TABLE orders (id INTEGER PRIMARY KEY, customer_id INTEGER, amount DECIMAL(10,2), order_date TEXT);
INSERT INTO customers VALUES (1, 'Eve', 'eve@test.com');
INSERT INTO customers VALUES (2, 'Frank', 'frank@test.com');
INSERT INTO customers VALUES (3, 'Grace', 'grace@test.com');
INSERT INTO orders VALUES (1, 1, 100.00, '2024-01-01');
INSERT INTO orders VALUES (2, 2, 500.00, '2024-01-02');
INSERT INTO orders VALUES (3, 1, 150.00, '2024-01-03');
INSERT INTO orders VALUES (4, 3, 300.00, '2024-01-04');
INSERT INTO orders VALUES (5, 2, 200.00, '2024-01-05');`,
              }),
              expectedOutput: "name|total_amount\nFrank|700.00\nGrace|300.00\nEve|250.00",
              isHidden: true,
              points: 15,
            },
          ],
        },
        {
          title: "Department Salary Analysis",
          description: `Given an 'employees' table, find each department's:
- Average salary (rounded to 2 decimal places)
- Number of employees
- Highest salary

Only include departments with more than 1 employee.
Sort by average salary descending.

Table:
- employees (id INT, name TEXT, department TEXT, salary DECIMAL)

Output format: department|avg_salary|employee_count|max_salary`,
          difficulty: "medium",
          type: "coding",
          points: 30,
          starterCode: {
            sql: `-- Department salary analysis\nSELECT \n  department,\n  ROUND(AVG(salary), 2) as avg_salary,\n  COUNT(*) as employee_count,\n  MAX(salary) as max_salary\nFROM employees\nGROUP BY department\nHAVING COUNT(*) > 1\nORDER BY avg_salary DESC;`,
            postgresql: `-- Department salary analysis\nSELECT \n  department,\n  ROUND(AVG(salary)::numeric, 2) as avg_salary,\n  COUNT(*) as employee_count,\n  MAX(salary) as max_salary\nFROM employees\nGROUP BY department\nHAVING COUNT(*) > 1\nORDER BY avg_salary DESC;`,
            javascript: `// SQL question — switch to SQL language`,
            python: `# SQL question — switch to SQL language`,
          },
          testCases: [
            {
              id: "dept_tc1",
              input: JSON.stringify({
                setup: `CREATE TABLE employees (id INTEGER PRIMARY KEY, name TEXT, department TEXT, salary DECIMAL(10,2));
INSERT INTO employees VALUES (1, 'Alice', 'Engineering', 120000.00);
INSERT INTO employees VALUES (2, 'Bob', 'Engineering', 130000.00);
INSERT INTO employees VALUES (3, 'Charlie', 'Engineering', 110000.00);
INSERT INTO employees VALUES (4, 'Diana', 'Marketing', 80000.00);
INSERT INTO employees VALUES (5, 'Eve', 'Marketing', 90000.00);
INSERT INTO employees VALUES (6, 'Frank', 'Sales', 70000.00);`,
              }),
              expectedOutput: "department|avg_salary|employee_count|max_salary\nEngineering|120000.00|3|130000.00\nMarketing|85000.00|2|90000.00",
              isHidden: false,
              points: 10,
            },
            {
              id: "dept_tc2",
              input: JSON.stringify({
                setup: `CREATE TABLE employees (id INTEGER PRIMARY KEY, name TEXT, department TEXT, salary DECIMAL(10,2));
INSERT INTO employees VALUES (1, 'A', 'Tech', 100000.00);
INSERT INTO employees VALUES (2, 'B', 'Tech', 120000.00);
INSERT INTO employees VALUES (3, 'C', 'HR', 60000.00);
INSERT INTO employees VALUES (4, 'D', 'HR', 65000.00);
INSERT INTO employees VALUES (5, 'E', 'HR', 70000.00);
INSERT INTO employees VALUES (6, 'F', 'Finance', 80000.00);`,
              }),
              expectedOutput: "department|avg_salary|employee_count|max_salary\nTech|110000.00|2|120000.00\nHR|65000.00|3|70000.00",
              isHidden: true,
              points: 10,
            },
          ],
        },
        {
          title: "Find Duplicate Emails",
          description: `Given a 'users' table, find all email addresses that appear more than once.

Table:
- users (id INT, name TEXT, email TEXT, created_at TEXT)

Return the duplicate emails and how many times they appear, sorted by count descending.

Output format: email|count`,
          difficulty: "easy",
          type: "coding",
          points: 20,
          starterCode: {
            sql: `-- Find duplicate emails\nSELECT \n  email,\n  COUNT(*) as count\nFROM users\nGROUP BY email\nHAVING COUNT(*) > 1\nORDER BY count DESC;`,
            postgresql: `-- Find duplicate emails\nSELECT \n  email,\n  COUNT(*) as count\nFROM users\nGROUP BY email\nHAVING COUNT(*) > 1\nORDER BY count DESC;`,
            javascript: `// SQL question — switch to SQL language`,
            python: `# SQL question — switch to SQL language`,
          },
          testCases: [
            {
              id: "dup_tc1",
              input: JSON.stringify({
                setup: `CREATE TABLE users (id INTEGER PRIMARY KEY, name TEXT, email TEXT, created_at TEXT);
INSERT INTO users VALUES (1, 'Alice', 'alice@test.com', '2024-01-01');
INSERT INTO users VALUES (2, 'Bob', 'bob@test.com', '2024-01-02');
INSERT INTO users VALUES (3, 'Alice2', 'alice@test.com', '2024-01-03');
INSERT INTO users VALUES (4, 'Charlie', 'charlie@test.com', '2024-01-04');
INSERT INTO users VALUES (5, 'Bob2', 'bob@test.com', '2024-01-05');
INSERT INTO users VALUES (6, 'Bob3', 'bob@test.com', '2024-01-06');`,
              }),
              expectedOutput: "email|count\nbob@test.com|3\nalice@test.com|2",
              isHidden: false,
              points: 10,
            },
            {
              id: "dup_tc2",
              input: JSON.stringify({
                setup: `CREATE TABLE users (id INTEGER PRIMARY KEY, name TEXT, email TEXT, created_at TEXT);
INSERT INTO users VALUES (1, 'A', 'a@test.com', '2024-01-01');
INSERT INTO users VALUES (2, 'B', 'b@test.com', '2024-01-02');
INSERT INTO users VALUES (3, 'C', 'a@test.com', '2024-01-03');
INSERT INTO users VALUES (4, 'D', 'c@test.com', '2024-01-04');
INSERT INTO users VALUES (5, 'E', 'a@test.com', '2024-01-05');`,
              }),
              expectedOutput: "email|count\na@test.com|3",
              isHidden: true,
              points: 10,
            },
          ],
        },
        {
          title: "Orders with Product Details",
          description: `Given three tables, write a query to get order details with customer and product names.

Tables:
- customers (id INT, name TEXT)
- products (id INT, name TEXT, price DECIMAL)
- order_items (id INT, customer_id INT, product_id INT, quantity INT, order_date TEXT)

Find all orders placed in January 2024. Show:
- Customer name
- Product name
- Quantity
- Total price (quantity × product price)

Sort by total price descending.

Output format: customer_name|product_name|quantity|total_price`,
          difficulty: "medium",
          type: "coding",
          points: 30,
          starterCode: {
            sql: `-- Join tables and calculate total\nSELECT \n  c.name as customer_name,\n  p.name as product_name,\n  oi.quantity,\n  (oi.quantity * p.price) as total_price\nFROM order_items oi\nJOIN customers c ON oi.customer_id = c.id\nJOIN products p ON oi.product_id = p.id\nWHERE oi.order_date LIKE '2024-01%'\nORDER BY total_price DESC;`,
            postgresql: `-- Join tables and calculate total\nSELECT \n  c.name as customer_name,\n  p.name as product_name,\n  oi.quantity,\n  (oi.quantity * p.price) as total_price\nFROM order_items oi\nJOIN customers c ON oi.customer_id = c.id\nJOIN products p ON oi.product_id = p.id\nWHERE oi.order_date LIKE '2024-01%'\nORDER BY total_price DESC;`,
            javascript: `// SQL question — switch to SQL language`,
            python: `# SQL question — switch to SQL language`,
          },
          testCases: [
            {
              id: "join_tc1",
              input: JSON.stringify({
                setup: `CREATE TABLE customers (id INTEGER PRIMARY KEY, name TEXT);
CREATE TABLE products (id INTEGER PRIMARY KEY, name TEXT, price DECIMAL(10,2));
CREATE TABLE order_items (id INTEGER PRIMARY KEY, customer_id INTEGER, product_id INTEGER, quantity INTEGER, order_date TEXT);
INSERT INTO customers VALUES (1, 'Alice');
INSERT INTO customers VALUES (2, 'Bob');
INSERT INTO products VALUES (1, 'Laptop', 999.99);
INSERT INTO products VALUES (2, 'Mouse', 29.99);
INSERT INTO products VALUES (3, 'Keyboard', 79.99);
INSERT INTO order_items VALUES (1, 1, 1, 2, '2024-01-15');
INSERT INTO order_items VALUES (2, 2, 2, 5, '2024-01-20');
INSERT INTO order_items VALUES (3, 1, 3, 1, '2024-01-25');
INSERT INTO order_items VALUES (4, 2, 1, 1, '2024-02-01');`,
              }),
              expectedOutput: "customer_name|product_name|quantity|total_price\nAlice|Laptop|2|1999.98\nBob|Mouse|5|149.95\nAlice|Keyboard|1|79.99",
              isHidden: false,
              points: 10,
            },
            {
              id: "join_tc2",
              input: JSON.stringify({
                setup: `CREATE TABLE customers (id INTEGER PRIMARY KEY, name TEXT);
CREATE TABLE products (id INTEGER PRIMARY KEY, name TEXT, price DECIMAL(10,2));
CREATE TABLE order_items (id INTEGER PRIMARY KEY, customer_id INTEGER, product_id INTEGER, quantity INTEGER, order_date TEXT);
INSERT INTO customers VALUES (1, 'Charlie');
INSERT INTO products VALUES (1, 'Book', 15.00);
INSERT INTO products VALUES (2, 'Pen', 2.50);
INSERT INTO order_items VALUES (1, 1, 1, 3, '2024-01-10');
INSERT INTO order_items VALUES (2, 1, 2, 10, '2024-01-11');
INSERT INTO order_items VALUES (3, 1, 1, 1, '2024-02-15');`,
              }),
              expectedOutput: "customer_name|product_name|quantity|total_price\nCharlie|Book|3|45.00\nCharlie|Pen|10|25.00",
              isHidden: true,
              points: 20,
            },
          ],
        }
      );
    }

    // Return requested count
    return problems.slice(0, count);
  }

  // MCQ mock questions
  if (type === "mcq") {
    return Array.from({ length: count }, (_, i) => {
      const questions = [
        {
          title: "What is the output of: console.log(typeof null)?",
          description: "",
          options: [
            { id: "a", text: '"null"' },
            { id: "b", text: '"object"' },
            { id: "c", text: '"undefined"' },
            { id: "d", text: '"boolean"' },
          ],
          correctAnswer: "b",
          explanation: "typeof null returns 'object' — this is a known JavaScript quirk.",
        },
        {
          title: "Which SQL clause filters groups?",
          description: "After using GROUP BY, which clause filters the aggregated results?",
          options: [
            { id: "a", text: "WHERE" },
            { id: "b", text: "HAVING" },
            { id: "c", text: "FILTER" },
            { id: "d", text: "GROUP FILTER" },
          ],
          correctAnswer: "b",
          explanation: "HAVING filters groups after GROUP BY. WHERE filters before grouping.",
        },
        {
          title: "What is the time complexity of binary search?",
          description: "",
          options: [
            { id: "a", text: "O(n)" },
            { id: "b", text: "O(log n)" },
            { id: "c", text: "O(n²)" },
            { id: "d", text: "O(1)" },
          ],
          correctAnswer: "b",
          explanation: "Binary search divides the search space in half each step.",
        },
        {
          title: "Which JOIN returns all rows from both tables?",
          description: "",
          options: [
            { id: "a", text: "INNER JOIN" },
            { id: "b", text: "LEFT JOIN" },
            { id: "c", text: "FULL OUTER JOIN" },
            { id: "d", text: "CROSS JOIN" },
          ],
          correctAnswer: "c",
          explanation: "FULL OUTER JOIN returns all rows from both tables, with NULLs where there's no match.",
        },
        {
          title: "What does CSS 'position: sticky' do?",
          description: "",
          options: [
            { id: "a", text: "Element is removed from document flow" },
            { id: "b", text: "Element toggles between relative and fixed based on scroll" },
            { id: "c", text: "Element is always fixed to viewport" },
            { id: "d", text: "Element is positioned relative to its parent" },
          ],
          correctAnswer: "b",
          explanation: "Sticky positioning toggles between relative and fixed depending on scroll position.",
        },
      ];

      const q = questions[i % questions.length];
      return {
        ...q,
        difficulty: difficulty || "medium",
        type: "mcq",
        points: 5,
      };
    });
  }

  return [];
}