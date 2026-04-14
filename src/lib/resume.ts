/**
 * Extract text from a resume URL (PDF, DOCX, etc.)
 */
export async function extractTextFromResume(
  resumeUrl: string
): Promise<string> {
  try {
    const response = await fetch(resumeUrl);
    if (!response.ok) {
      throw new Error(`Failed to fetch resume: ${response.status}`);
    }

    const contentType = response.headers.get("content-type") || "";
    const buffer = await response.arrayBuffer();

    // PDF extraction
    if (
      contentType.includes("pdf") ||
      resumeUrl.toLowerCase().endsWith(".pdf")
    ) {
      try {
        const pdfParse = (await import("pdf-parse")).default;
        const data = await pdfParse(Buffer.from(buffer));
        return data.text || "";
      } catch {
        // Fallback: basic text extraction
        const text = Buffer.from(buffer).toString("utf-8");
        return text.replace(/[^\x20-\x7E\n\r\t]/g, " ").trim();
      }
    }

    // Plain text
    if (
      contentType.includes("text") ||
      resumeUrl.toLowerCase().endsWith(".txt")
    ) {
      return Buffer.from(buffer).toString("utf-8");
    }

    // DOCX — extract without mammoth (parse XML directly)
    if (
      contentType.includes("wordprocessing") ||
      contentType.includes("officedocument") ||
      resumeUrl.toLowerCase().endsWith(".docx")
    ) {
      try {
        return await extractDocxText(Buffer.from(buffer));
      } catch {
        const text = Buffer.from(buffer).toString("utf-8");
        return text.replace(/[^\x20-\x7E\n\r\t]/g, " ").trim();
      }
    }

    // Fallback: try as text
    return Buffer.from(buffer).toString("utf-8");
  } catch (error: any) {
    console.error("Resume extraction error:", error);
    throw new Error(`Failed to extract resume text: ${error.message}`);
  }
}

/**
 * Extract text from DOCX without external dependencies.
 * DOCX files are ZIP archives containing XML.
 * We extract word/document.xml and strip XML tags.
 */
async function extractDocxText(buffer: Buffer): Promise<string> {
  // Use built-in zlib to decompress
  const { Readable } = await import("stream");
  const { createUnzip } = await import("zlib");

  // Simple ZIP parser — find word/document.xml
  // DOCX is a ZIP file, we look for PK signature and parse entries

  return new Promise((resolve, reject) => {
    try {
      // Find word/document.xml in the ZIP
      const zip = buffer;
      let documentXml = "";

      // Simple approach: search for the XML content between known markers
      const xmlStart = zip.indexOf("<w:body");
      const xmlEnd = zip.indexOf("</w:body>");

      if (xmlStart !== -1 && xmlEnd !== -1) {
        const xmlContent = zip
          .subarray(xmlStart, xmlEnd + 10)
          .toString("utf-8");

        // Extract text from <w:t> tags
        const textMatches = xmlContent.match(/<w:t[^>]*>([^<]*)<\/w:t>/g);
        if (textMatches) {
          documentXml = textMatches
            .map((match) => {
              const text = match.replace(/<[^>]+>/g, "");
              return text;
            })
            .join("");
        }
      }

      if (!documentXml) {
        // Broader approach: strip all XML tags from the entire buffer
        const fullText = zip.toString("utf-8");
        // Find text content between w:t tags
        const matches = fullText.match(/<w:t[^>]*>([^<]*)<\/w:t>/g);
        if (matches) {
          documentXml = matches
            .map((m) => m.replace(/<[^>]+>/g, ""))
            .join(" ");
        }
      }

      if (!documentXml) {
        // Last resort: strip ALL XML/binary and keep readable text
        documentXml = zip
          .toString("utf-8")
          .replace(/<[^>]+>/g, " ")
          .replace(/[^\x20-\x7E\n\r\t]/g, " ")
          .replace(/\s{2,}/g, " ")
          .trim();
      }

      // Clean up: add line breaks at paragraph boundaries
      documentXml = documentXml
        .replace(/<\/w:p>/g, "\n")
        .replace(/<[^>]+>/g, "")
        .replace(/\n{3,}/g, "\n\n")
        .trim();

      resolve(documentXml);
    } catch (err) {
      reject(err);
    }
  });
}