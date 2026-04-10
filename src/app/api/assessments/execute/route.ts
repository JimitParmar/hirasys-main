import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { exec } from "child_process";
import { writeFileSync, mkdirSync, rmSync, readFileSync } from "fs";
import { join } from "path";
import { promisify } from "util";

const execAsync = promisify(exec);
const TEMP_DIR = join(process.cwd(), ".tmp-exec");
const TIMEOUT = 15000; // 15 seconds

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { code, language, input } = await req.json();

    if (!code || !language) {
      return NextResponse.json({
        stdout: "",
        stderr: "Code and language are required",
        exitCode: 1,
        executionTime: 0,
      });
    }

    console.log("=== CODE EXECUTION ===");
    console.log("Language:", language);
    console.log("Input:", String(input).substring(0, 100));

    let result;

        switch (language) {
      case "javascript":
        result = await executeJavaScript(code, input || "");
        break;
      case "python":
        result = await executePython(code, input || "");
        break;
      case "typescript":
        result = await executeTypeScript(code, input || "");
        break;
      case "sql":
      case "mysql":
      case "postgresql":
        result = await executeSQL(code, input || "", language);
        break;
      default:
        result = await executeWithDocker(code, language, input || "");
        break;
    }

    console.log("Result:", {
      stdout: result.stdout.substring(0, 200),
      stderr: result.stderr.substring(0, 200),
      exitCode: result.exitCode,
    });

    return NextResponse.json(result);
  } catch (error: any) {
    console.error("Code execution error:", error);
    return NextResponse.json({
      stdout: "",
      stderr: `Server error: ${error.message}`,
      exitCode: 1,
      executionTime: 0,
    });
  }
}

// ==========================================
// SQL — Execute against a temporary in-memory database
// ==========================================
async function executeSQL(
  code: string,
  input: string,
  dialect: string
): Promise<ExecutionResult> {
  const execId = `sql_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const workDir = join(TEMP_DIR, execId);

  try {
    mkdirSync(workDir, { recursive: true });

    // Input contains the setup SQL (CREATE TABLE, INSERT) and expected format
    // Code is the candidate's query
    let setupSQL = "";
    let candidateQuery = code.trim();

    // Parse input — it contains table setup
    if (input) {
      try {
        const parsed = typeof input === "string" && input.startsWith("{")
          ? JSON.parse(input)
          : { setup: input };
        setupSQL = parsed.setup || parsed.schema || input;
      } catch {
        setupSQL = input;
      }
    }

    // Use Node.js with better-sqlite3 for in-memory execution
    // This is fast, safe, and requires no external DB
    const sqlScript = `
const Database = require('better-sqlite3');
const db = new Database(':memory:');

try {
  // Setup tables
  const setupStatements = ${JSON.stringify(setupSQL)}.split(';').filter(s => s.trim());
  for (const stmt of setupStatements) {
    if (stmt.trim()) {
      db.exec(stmt.trim());
    }
  }

  // Run candidate's query
  const query = ${JSON.stringify(candidateQuery)}.trim().replace(/;$/, '');

  // Detect if it's a SELECT or modification
  const isSelect = query.toUpperCase().trimStart().startsWith('SELECT');
  const isShow = query.toUpperCase().trimStart().startsWith('SHOW');

  if (isSelect || isShow) {
    const rows = db.prepare(query).all();
    if (rows.length === 0) {
      console.log('(empty result set)');
    } else {
      // Print as table
      const cols = Object.keys(rows[0]);
      console.log(cols.join('|'));
      for (const row of rows) {
        console.log(cols.map(c => {
          const val = row[c];
          return val === null ? 'NULL' : String(val);
        }).join('|'));
      }
    }
  } else {
    const result = db.prepare(query).run();
    console.log('Rows affected: ' + result.changes);
  }
} catch (e) {
  console.error(e.message);
  process.exit(1);
} finally {
  db.close();
}
`;

    writeFileSync(join(workDir, "solution.js"), sqlScript);

    const startTime = Date.now();

    // Check if better-sqlite3 is available
    const { stdout, stderr } = await execAsync(
      `node "${join(workDir, "solution.js")}"`,
      {
        timeout: TIMEOUT,
        maxBuffer: 1024 * 1024,
        env: { ...process.env, NODE_PATH: join(process.cwd(), "node_modules") },
      }
    );

    return {
      stdout: stdout.trim(),
      stderr: stderr.trim(),
      exitCode: 0,
      executionTime: Date.now() - startTime,
      version: `SQL (${dialect})`,
    };
  } catch (error: any) {
    // If better-sqlite3 is not available, fall back to pg
    if (error.message?.includes("better-sqlite3") || error.message?.includes("Cannot find module")) {
      return await executeSQLWithPg(code, input, dialect, workDir);
    }

    const isTimeout = error.killed || error.signal === "SIGTERM";
    return {
      stdout: error.stdout?.trim() || "",
      stderr: isTimeout
        ? "⏰ Time Limit Exceeded"
        : formatError(error.stderr || error.message || "SQL execution failed"),
      exitCode: error.code || 1,
      executionTime: 0,
      version: `SQL (${dialect})`,
    };
  } finally {
    try { rmSync(workDir, { recursive: true, force: true }); } catch {}
  }
}

// Fallback: Use the existing PostgreSQL connection
async function executeSQLWithPg(
  code: string,
  input: string,
  dialect: string,
  workDir: string
): Promise<ExecutionResult> {
  try {
    const { Pool } = require("pg");

    // Create a temporary schema for isolation
    const schemaName = `test_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

    const pool = new Pool({
      host: "localhost",
      port: 5432,
      user: "hirasys",
      password: "hirasys123",
      database: "hirasys",
      max: 1,
    });

    try {
      // Create isolated schema
      await pool.query(`CREATE SCHEMA IF NOT EXISTS "${schemaName}"`);
      await pool.query(`SET search_path TO "${schemaName}"`);

      // Run setup SQL
      if (input) {
        let setupSQL = input;
        try {
          const parsed = JSON.parse(input);
          setupSQL = parsed.setup || parsed.schema || input;
        } catch {}

        const statements = setupSQL.split(";").filter((s: string) => s.trim());
        for (const stmt of statements) {
          if (stmt.trim()) {
            await pool.query(`SET search_path TO "${schemaName}"; ${stmt.trim()}`);
          }
        }
      }

      // Run candidate query
      const startTime = Date.now();
      const result = await pool.query(`SET search_path TO "${schemaName}"; ${code.trim().replace(/;$/, "")}`);

      let output = "";
      if (result.rows && result.rows.length > 0) {
        const cols = result.fields.map((f: any) => f.name);
        output = cols.join("|") + "\n";
        output += result.rows.map((row: any) =>
          cols.map((c: string) => {
            const val = row[c];
            return val === null ? "NULL" : String(val);
          }).join("|")
        ).join("\n");
      } else if (result.rowCount !== null) {
        output = `Rows affected: ${result.rowCount}`;
      } else {
        output = "(empty result set)";
      }

      // Cleanup
      await pool.query(`DROP SCHEMA IF EXISTS "${schemaName}" CASCADE`);
      await pool.end();

      return {
        stdout: output,
        stderr: "",
        exitCode: 0,
        executionTime: Date.now() - startTime,
        version: "PostgreSQL (live)",
      };
    } catch (err: any) {
      // Cleanup on error
      try {
        await pool.query(`DROP SCHEMA IF EXISTS "${schemaName}" CASCADE`);
        await pool.end();
      } catch {}
      throw err;
    }
  } catch (error: any) {
    return {
      stdout: "",
      stderr: formatError(error.message || "SQL execution failed"),
      exitCode: 1,
      executionTime: 0,
      version: `SQL (${dialect})`,
    };
  }
}

// ==========================================
// JAVASCRIPT — Using Node.js directly
// ==========================================
async function executeJavaScript(code: string, input: string): Promise<ExecutionResult> {
  const execId = `js_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const workDir = join(TEMP_DIR, execId);

  try {
    mkdirSync(workDir, { recursive: true });

    writeFileSync(join(workDir, "input.txt"), input);

    // Smart wrapper: auto-parse JSON, handle all input types
    const wrappedCode = `
const __fs = require('fs');
const __path = require('path');

// Read raw input
const __rawInput = __fs.readFileSync(__path.join(__dirname, 'input.txt'), 'utf8').trim();

// Smart parse: try JSON first, then use as string
let __input;
try {
  __input = JSON.parse(__rawInput);
} catch {
  // Not JSON — check if it's a number
  if (!isNaN(__rawInput) && __rawInput !== '') {
    __input = Number(__rawInput);
  } else {
    // Keep as string
    __input = __rawInput;
  }
}

// User's code
${code}

// Try to call common function names and print result
try {
  let __result;
  if (typeof solve === 'function') {
    __result = solve(__input);
  } else if (typeof main === 'function') {
    __result = main(__input);
  } else if (typeof solution === 'function') {
    __result = solution(__input);
  }
  
  if (__result !== undefined && __result !== null) {
    if (typeof __result === 'object') {
      console.log(JSON.stringify(__result));
    } else {
      console.log(String(__result));
    }
  }
} catch (e) {
  console.error(e.message);
  process.exit(1);
}
`;

    writeFileSync(join(workDir, "solution.js"), wrappedCode);

    const startTime = Date.now();

    const { stdout, stderr } = await execAsync(
      `node "${join(workDir, "solution.js")}"`,
      {
        timeout: TIMEOUT,
        maxBuffer: 1024 * 1024,
        env: { ...process.env, NODE_PATH: "" },
      }
    );

    return {
      stdout: stdout.trim(),
      stderr: stderr.trim(),
      exitCode: 0,
      executionTime: Date.now() - startTime,
      version: "Node.js " + process.version,
    };
  } catch (error: any) {
    const isTimeout = error.killed || error.signal === "SIGTERM";

    return {
      stdout: error.stdout?.trim() || "",
      stderr: isTimeout
        ? "⏰ Time Limit Exceeded (15s)"
        : formatError(error.stderr || error.message || "Execution failed"),
      exitCode: error.code || 1,
      executionTime: 0,
      version: "Node.js " + process.version,
    };
  } finally {
    try { rmSync(workDir, { recursive: true, force: true }); } catch {}
  }
}

// ==========================================
// PYTHON — Using system Python
// ==========================================
async function executePython(code: string, input: string): Promise<ExecutionResult> {
  const execId = `py_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const workDir = join(TEMP_DIR, execId);

  try {
    mkdirSync(workDir, { recursive: true });

    writeFileSync(join(workDir, "input.txt"), input);

    // Smart wrapper: auto-parse JSON
    const wrappedCode = `
import sys
import os
import json

# Read raw input
with open(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'input.txt'), 'r') as f:
    __raw_input = f.read().strip()

# Smart parse: try JSON first, then number, then string
try:
    __input = json.loads(__raw_input)
except (json.JSONDecodeError, ValueError):
    try:
        __input = float(__raw_input) if '.' in __raw_input else int(__raw_input)
    except ValueError:
        __input = __raw_input

# User's code
${code}

# Try to call common function names
try:
    __result = None
    if 'solve' in dir():
        __result = solve(__input)
    elif 'main' in dir():
        __result = main(__input)
    elif 'solution' in dir():
        __result = solution(__input)
    
    if __result is not None:
        if isinstance(__result, (list, dict, tuple)):
            print(json.dumps(__result))
        elif isinstance(__result, bool):
            print(json.dumps(__result))
        else:
            print(__result)
except Exception as e:
    print(str(e), file=sys.stderr)
    sys.exit(1)
`;

    writeFileSync(join(workDir, "solution.py"), wrappedCode);

    const startTime = Date.now();

    let pythonCmd = "python3";
    try {
      await execAsync("python3 --version");
    } catch {
      pythonCmd = "python";
    }

    const { stdout, stderr } = await execAsync(
      `${pythonCmd} "${join(workDir, "solution.py")}"`,
      {
        timeout: TIMEOUT,
        maxBuffer: 1024 * 1024,
      }
    );

    return {
      stdout: stdout.trim(),
      stderr: stderr.trim(),
      exitCode: 0,
      executionTime: Date.now() - startTime,
      version: pythonCmd,
    };
  } catch (error: any) {
    const isTimeout = error.killed || error.signal === "SIGTERM";

    return {
      stdout: error.stdout?.trim() || "",
      stderr: isTimeout
        ? "⏰ Time Limit Exceeded (15s)"
        : formatError(error.stderr || error.message || "Execution failed"),
      exitCode: error.code || 1,
      executionTime: 0,
      version: "Python",
    };
  } finally {
    try { rmSync(workDir, { recursive: true, force: true }); } catch {}
  }
}

// ==========================================
// TYPESCRIPT — Compile + Run
// ==========================================
async function executeTypeScript(code: string, input: string): Promise<ExecutionResult> {
  // For TypeScript, we can use ts-node or just strip types and run as JS
  // Simplest: use tsx or ts-node if available, else strip types
  const jsCode = stripTypeScriptTypes(code);
  const result = await executeJavaScript(jsCode, input);
  result.version = "TypeScript (compiled to JS)";
  return result;
}

function stripTypeScriptTypes(code: string): string {
  // Basic TS → JS: remove type annotations
  // This is a simple approach — works for most assessment code
  return code
    .replace(/:\s*(string|number|boolean|any|void|never|unknown|object)\s*/g, " ")
    .replace(/:\s*(string|number|boolean|any|void|never|unknown|object)\[\]\s*/g, " ")
    .replace(/<[^>]+>/g, "") // Remove generics
    .replace(/\binterface\s+\w+\s*{[^}]*}/g, "") // Remove interfaces
    .replace(/\btype\s+\w+\s*=\s*[^;]+;/g, "") // Remove type aliases
    .replace(/\bas\s+\w+/g, "") // Remove type assertions
    .replace(/\!\.|\!\[/g, (match) => match.slice(1)); // Remove non-null assertions
}

// ==========================================
// DOCKER — For other languages (Java, C++, Go, etc.)
// ==========================================
async function executeWithDocker(
  code: string,
  language: string,
  input: string
): Promise<ExecutionResult> {
  const langConfig: Record<string, { image: string; filename: string; cmd: string }> = {
    java: {
      image: "openjdk:21-slim",
      filename: "Solution.java",
      cmd: "javac Solution.java && java Solution",
    },
    cpp: {
      image: "gcc:13",
      filename: "solution.cpp",
      cmd: "g++ -o solution solution.cpp && ./solution",
    },
    c: {
      image: "gcc:13",
      filename: "solution.c",
      cmd: "gcc -o solution solution.c && ./solution",
    },
    go: {
      image: "golang:1.21-alpine",
      filename: "solution.go",
      cmd: "go run solution.go",
    },
    rust: {
      image: "rust:1.75-slim",
      filename: "solution.rs",
      cmd: "rustc solution.rs -o solution && ./solution",
    },
  };

  const config = langConfig[language];
  if (!config) {
    return {
      stdout: "",
      stderr: `Language "${language}" is not supported. Available: javascript, python, typescript, java, cpp, c, go, rust`,
      exitCode: 1,
      executionTime: 0,
    };
  }

  const execId = `docker_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const workDir = join(TEMP_DIR, execId);

  try {
    mkdirSync(workDir, { recursive: true });
    writeFileSync(join(workDir, config.filename), code);
    writeFileSync(join(workDir, "input.txt"), input);

    const startTime = Date.now();

    const dockerCmd = [
      "docker run --rm",
      "--memory=256m",
      "--cpus=0.5",
      "--network=none",
      `--mount type=bind,source="${workDir}",target=/code`,
      "-w /code",
      config.image,
      `sh -c "${config.cmd} < input.txt"`,
    ].join(" ");

    const { stdout, stderr } = await execAsync(dockerCmd, {
      timeout: TIMEOUT,
      maxBuffer: 1024 * 1024,
    });

    return {
      stdout: stdout.trim(),
      stderr: stderr.trim(),
      exitCode: 0,
      executionTime: Date.now() - startTime,
      version: `Docker: ${config.image}`,
    };
  } catch (error: any) {
    const isTimeout = error.killed || error.signal === "SIGTERM";
    return {
      stdout: error.stdout?.trim() || "",
      stderr: isTimeout
        ? "⏰ Time Limit Exceeded (15s)"
        : formatError(error.stderr || error.message || "Execution failed"),
      exitCode: error.code || 1,
      executionTime: 0,
      version: `Docker: ${config.image}`,
    };
  } finally {
    try { rmSync(workDir, { recursive: true, force: true }); } catch {}
  }
}

// ==========================================
// HELPERS
// ==========================================

interface ExecutionResult {
  stdout: string;
  stderr: string;
  exitCode: number;
  executionTime: number;
  version?: string;
}

function formatError(error: string): string {
  // Clean up common error messages to be more readable
  return error
    .replace(/at Object\.<anonymous>.*\n?/g, "")
    .replace(/at Module\._compile.*\n?/g, "")
    .replace(/at Object\.Module\._extensions.*\n?/g, "")
    .replace(/at Module\.load.*\n?/g, "")
    .replace(/at Function\.Module\._load.*\n?/g, "")
    .replace(/at Module\.require.*\n?/g, "")
    .replace(/at require.*\n?/g, "")
    .replace(/\/.*\.tmp-exec\/[^/]+\//g, "") // Remove temp dir paths
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

// Add this export so other files can use it too
export function normalizeOutput(text: string): string {
  return text
    // Remove all whitespace variations
    .replace(/\r\n/g, "\n")        // Windows line endings
    .replace(/\r/g, "\n")          // Old Mac line endings
    // Normalize spaces around punctuation
    .replace(/\s*,\s*/g, ",")      // "1, 2, 3" → "1,2,3"
    .replace(/\s*:\s*/g, ":")      // "key: value" → "key:value"  
    .replace(/\[\s+/g, "[")        // "[ 1" → "[1"
    .replace(/\s+\]/g, "]")        // "1 ]" → "1]"
    .replace(/\{\s+/g, "{")        // "{ a" → "{a"
    .replace(/\s+\}/g, "}")        // "a }" → "a}"
    .replace(/\(\s+/g, "(")        // "( a" → "(a"
    .replace(/\s+\)/g, ")")        // "a )" → "a)"
    // Trim each line and remove empty lines
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .join("\n")
    // Final trim
    .trim()
    // Normalize case for boolean/null values
    .replace(/\bTrue\b/g, "true")
    .replace(/\bFalse\b/g, "false")
    .replace(/\bNone\b/g, "null")
    .replace(/\bNULL\b/g, "null");
}