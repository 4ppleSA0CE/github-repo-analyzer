import puppeteer from "puppeteer";
import { PDFDocument } from "pdf-lib";
import type { AnalysisResult } from "../types/index.js";

function escapeHtml(input: string): string {
  return input
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function renderPlainParagraphs(text: string): string {
  const normalized = text.replaceAll("\r\n", "\n").trim();
  if (!normalized) return `<p class="p muted">No content generated.</p>`;

  const paragraphs = normalized
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter((p) => p.length > 0);

  return paragraphs.map((p) => `<p class="p">${escapeHtml(p)}</p>`).join("");
}

function applyInlineMarkdown(escapedText: string): string {
  // Order matters: code first, then bold.
  const withCode = escapedText.replaceAll(/`([^`]+)`/g, "<code>$1</code>");
  return withCode.replaceAll(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
}

function renderMarkdownLite(text: string): string {
  const normalized = text.replaceAll("\r\n", "\n").trim();
  if (!normalized) return `<p class="p muted">No content generated.</p>`;

  const lines = normalized.split("\n");
  let html = "";
  let inList = false;
  let inOrderedList = false;

  const closeList = (): void => {
    if (inList) {
      html += "</ul>";
      inList = false;
    }
    if (inOrderedList) {
      html += "</ol>";
      inOrderedList = false;
    }
  };

  for (const rawLine of lines) {
    const line = rawLine.trimEnd();
    if (line.trim().length === 0) {
      closeList();
      continue;
    }

    const trimmed = line.trim();
    const h3 = trimmed.match(/^###\s+(.*)$/);
    if (h3?.[1]) {
      closeList();
      html += `<h3 class="h3">${applyInlineMarkdown(escapeHtml(h3[1]))}</h3>`;
      continue;
    }

    const bulletMatch = line.match(/^\s*-\s+(.*)$/);
    if (bulletMatch?.[1]) {
      if (inOrderedList) {
        html += "</ol>";
        inOrderedList = false;
      }
      if (!inList) {
        html += '<ul class="ul">';
        inList = true;
      }
      const item = applyInlineMarkdown(escapeHtml(bulletMatch[1]));
      html += `<li>${item}</li>`;
      continue;
    }

    const orderedMatch = line.match(/^\s*\d+\.\s+(.*)$/);
    if (orderedMatch?.[1]) {
      if (inList) {
        html += "</ul>";
        inList = false;
      }
      if (!inOrderedList) {
        html += '<ol class="ol">';
        inOrderedList = true;
      }
      const item = applyInlineMarkdown(escapeHtml(orderedMatch[1]));
      html += `<li>${item}</li>`;
      continue;
    }

    closeList();
    const content = applyInlineMarkdown(escapeHtml(line));
    html += `<p class="p">${content}</p>`;
  }

  closeList();
  return html;
}

function renderHtml(result: AnalysisResult): string {
  const { repoContext } = result;
  const title = `${repoContext.owner}/${repoContext.name}`;
  const metaLine = [
    repoContext.primaryLanguage ? `Primary language: ${repoContext.primaryLanguage}` : "",
    `Stars: ${repoContext.stars}`,
    `Forks: ${repoContext.forks}`,
    `Contributors: ${repoContext.contributorCount}`,
    `Last updated: ${repoContext.lastUpdated}`,
  ]
    .filter((s) => s.length > 0)
    .join(" • ");

  return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <style>
      :root { --text: #111827; --muted: #6b7280; --border: #e5e7eb; --bg: #ffffff; }
      * { box-sizing: border-box; }
      body { margin: 0; font-family: system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif; color: var(--text); background: var(--bg); font-size: 15px; }
      .page { padding: 40px 48px 56px; }
      h1 { margin: 0 0 8px; font-size: 30px; letter-spacing: -0.02em; }
      .meta { margin: 0 0 24px; color: var(--muted); font-size: 13px; }
      .section { margin-top: 28px; }
      .break { break-before: page; page-break-before: always; }
      .section h2 { margin: 0 0 10px; font-size: 18px; text-transform: uppercase; letter-spacing: 0.06em; color: #111827; }
      .card { border: 1px solid var(--border); border-radius: 12px; padding: 18px 20px; }
      .content { font-size: 15px; line-height: 1.7; }
      .p { margin: 0 0 12px; }
      .p:last-child { margin-bottom: 0; }
      .muted { color: var(--muted); }
      .ul { margin: 6px 0 12px 20px; padding: 0; }
      .ul li { margin: 5px 0; }
      .ol { margin: 6px 0 12px 24px; padding: 0; }
      .ol li { margin: 5px 0; }
      .h3 { margin: 16px 0 8px; font-size: 15px; letter-spacing: -0.01em; }
      code { font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace; font-size: 0.97em; background: #f3f4f6; border: 1px solid #e5e7eb; padding: 2px 5px; border-radius: 6px; }
      .cover { border: 1px solid var(--border); border-radius: 16px; padding: 24px; }
      .cover .k { color: var(--muted); font-size: 12px; margin-top: 10px; }
      .divider { height: 1px; background: var(--border); margin: 18px 0; }
    </style>
  </head>
  <body>
    <div class="page">
      <div class="cover">
        <h1>${escapeHtml(title)}</h1>
        <div class="meta">${escapeHtml(metaLine)}</div>
        <div class="divider"></div>
        <div class="k">Source</div>
        <div class="content"><p class="p">${escapeHtml(result.repoUrl)}</p></div>
        ${
          repoContext.description
            ? `<div class="k">Description</div><div class="content"><p class="p">${escapeHtml(repoContext.description)}</p></div>`
            : ""
        }
        <div class="k">Generated at</div>
        <div class="content"><p class="p muted">${escapeHtml(result.generatedAt)}</p></div>
      </div>

      <div class="section">
        <h2>Point 1 — Plain English Summary</h2>
        <div class="card"><div class="content">${renderPlainParagraphs(result.laymanSummary)}</div></div>
      </div>

      <div class="section break">
        <h2>Point 2 — Business / Functional Summary</h2>
        <div class="card"><div class="content">${renderMarkdownLite(result.businessSummary)}</div></div>
      </div>

      <div class="section break">
        <h2>Point 3 — Technical Deep-Dive</h2>
        <div class="card"><div class="content">${renderMarkdownLite(result.engineerSummary)}</div></div>
      </div>
    </div>
  </body>
</html>`;
}

export async function generateRepoPdf(result: AnalysisResult): Promise<Buffer> {
  const html = renderHtml(result);
  const browser = await puppeteer.launch({
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "domcontentloaded" });
    const pdf = await page.pdf({
      format: "A4",
      printBackground: true,
      displayHeaderFooter: true,
      margin: { top: "32px", bottom: "48px", left: "0px", right: "0px" },
      headerTemplate: `<div style="font-size:10px; color:#6b7280; width:100%; padding:0 56px;"></div>`,
      footerTemplate: `<div style="font-size:10px; color:#6b7280; width:100%; padding:0 56px; display:flex; justify-content:space-between;">
        <span>${escapeHtml(result.repoContext.owner)}/${escapeHtml(result.repoContext.name)}</span>
        <span>Page <span class="pageNumber"></span> of <span class="totalPages"></span></span>
      </div>`,
    });
    return Buffer.from(pdf);
  } finally {
    await browser.close();
  }
}

export async function combinePdfs(buffers: Buffer[]): Promise<Buffer> {
  const out = await PDFDocument.create();
  for (const buf of buffers) {
    const pdf = await PDFDocument.load(buf);
    const pages = await out.copyPages(pdf, pdf.getPageIndices());
    for (const p of pages) out.addPage(p);
  }
  const bytes = await out.save();
  return Buffer.from(bytes);
}

