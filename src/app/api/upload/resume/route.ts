import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { query } from "@/lib/db";

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await req.formData();
    const file = formData.get("resume") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    }

    const allowedTypes = [
      "application/pdf",
      "text/plain",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ];

    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: "Only PDF, TXT, DOC, DOCX files are allowed" },
        { status: 400 }
      );
    }

    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json(
        { error: "File too large. Max 10MB." },
        { status: 400 }
      );
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    let resumeText = "";

    if (file.type === "application/pdf") {
      // Extract text from PDF without any library
      resumeText = extractTextFromPDF(buffer);

      // If basic extraction got very little, try the stream extraction
      if (resumeText.length < 100) {
        resumeText = extractTextFromPDFStreams(buffer);
      }

      // If still not enough, use Gemini to extract from base64
      if (resumeText.length < 50 && process.env.GEMINI_API_KEY) {
        try {
          resumeText = await extractWithGemini(buffer);
        } catch (err) {
          console.error("Gemini extraction failed:", err);
        }
      }

      if (resumeText.length < 30) {
        return NextResponse.json(
          { error: "Could not extract enough text from this PDF. Please paste your resume text instead." },
          { status: 400 }
        );
      }
    } else if (file.type === "text/plain") {
      resumeText = buffer.toString("utf-8");
    } else {
      // DOC/DOCX — extract readable text
      resumeText = buffer
        .toString("utf-8")
        .replace(/[^\x20-\x7E\n\r\t]/g, " ")
        .replace(/\s{3,}/g, " ")
        .trim();
    }

    // Clean up
    resumeText = cleanText(resumeText);

    // Save to user profile
    const userId = (session.user as any).id;
    await query(
      "UPDATE users SET resume_text = $1, resume_url = $2, updated_at = NOW() WHERE id = $3",
      [resumeText, file.name, userId]
    );

    console.log(`Resume parsed: ${resumeText.length} chars from ${file.name}`);

    return NextResponse.json({
      success: true,
      text: resumeText,
      fileName: file.name,
      fileSize: file.size,
      charCount: resumeText.length,
    });
  } catch (error: any) {
    console.error("Upload error:", error);
    return NextResponse.json(
      { error: `Upload failed: ${error.message}` },
      { status: 500 }
    );
  }
}

// ==========================================
// Method 1: Extract text between BT/ET markers
// Works for most simple PDFs
// ==========================================
function extractTextFromPDF(buffer: Buffer): string {
  const str = buffer.toString("latin1");
  const texts: string[] = [];

  const btRegex = /BT\s([\s\S]*?)ET/g;
  let match;

  while ((match = btRegex.exec(str)) !== null) {
    const block = match[1];

    // Tj operator — single string
    const tjRegex = /\((.*?)\)\s*Tj/g;
    let tjMatch;
    while ((tjMatch = tjRegex.exec(block)) !== null) {
      texts.push(decodePDFString(tjMatch[1]));
    }

    // TJ operator — array of strings
    const tjArrayRegex = /\[(.*?)\]\s*TJ/gi;
    let tjArrMatch;
    while ((tjArrMatch = tjArrayRegex.exec(block)) !== null) {
      const innerTexts = tjArrMatch[1].match(/\((.*?)\)/g);
      if (innerTexts) {
        texts.push(
          innerTexts.map((t) => decodePDFString(t.slice(1, -1))).join("")
        );
      }
    }

    // Detect line breaks from Td/TD operators (vertical movement)
    if (block.match(/\d+\s+(-?\d+)\s+Td/i)) {
      texts.push("\n");
    }
  }

  return texts.join(" ");
}

// ==========================================
// Method 2: Extract from deflated streams
// Works for compressed PDFs
// ==========================================
function extractTextFromPDFStreams(buffer: Buffer): string {
  const zlib = require("zlib");
  const str = buffer.toString("binary");
  const texts: string[] = [];

  // Find all stream objects
  const streamRegex = /stream\r?\n([\s\S]*?)\r?\nendstream/g;
  let match;

  while ((match = streamRegex.exec(str)) !== null) {
    try {
      // Try to inflate (decompress) the stream
      const streamData = Buffer.from(match[1], "binary");
      let decoded: string;

      try {
        const inflated = zlib.inflateSync(streamData);
        decoded = inflated.toString("latin1");
      } catch {
        // Not compressed, use as-is
        decoded = match[1];
      }

      // Extract text from the decoded stream
      const btRegex = /BT\s([\s\S]*?)ET/g;
      let btMatch;
      while ((btMatch = btRegex.exec(decoded)) !== null) {
        const block = btMatch[1];

        const tjRegex = /\((.*?)\)\s*Tj/g;
        let tjMatch;
        while ((tjMatch = tjRegex.exec(block)) !== null) {
          texts.push(decodePDFString(tjMatch[1]));
        }

        const tjArrayRegex = /\[(.*?)\]\s*TJ/gi;
        let tjArrMatch;
        while ((tjArrMatch = tjArrayRegex.exec(block)) !== null) {
          const innerTexts = tjArrMatch[1].match(/\((.*?)\)/g);
          if (innerTexts) {
            texts.push(
              innerTexts.map((t) => decodePDFString(t.slice(1, -1))).join("")
            );
          }
        }
      }
    } catch {
      // Skip streams that can't be processed
    }
  }

  return texts.join(" ");
}

// ==========================================
// Method 3: Use Gemini AI to extract text from PDF
// Most reliable but uses API credits
// ==========================================
async function extractWithGemini(buffer: Buffer): Promise<string> {
  const { GoogleGenerativeAI } = await import("@google/generative-ai");

  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");
  const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

  const base64 = buffer.toString("base64");

  const result = await model.generateContent([
    {
      inlineData: {
        mimeType: "application/pdf",
        data: base64,
      },
    },
    "Extract ALL text content from this PDF resume. Return the complete text as-is, preserving the structure. Include name, contact info, skills, experience, education — everything. Return ONLY the extracted text, no commentary.",
  ]);

  return result.response.text();
}

// ==========================================
// Helpers
// ==========================================
function decodePDFString(str: string): string {
  return str
    .replace(/\\n/g, "\n")
    .replace(/\\r/g, "\r")
    .replace(/\\t/g, "\t")
    .replace(/\\\(/g, "(")
    .replace(/\\\)/g, ")")
    .replace(/\\\\/g, "\\")
    .replace(/\\(\d{3})/g, (_, oct) => String.fromCharCode(parseInt(oct, 8)));
}

function cleanText(text: string): string {
  return text
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[^\S\n]{3,}/g, "  ")
    .replace(/[^\x20-\x7E\n\t]/g, " ") // Remove non-printable chars
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .join("\n")
    .trim();
}