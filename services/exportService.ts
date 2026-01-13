
import { CreditMemoData } from "../types";

/**
 * Converts simple markdown tables to HTML table tags for Word compatibility.
 */
const markdownTableToHtml = (text: string) => {
  if (!text.includes('|')) return text;

  const lines = text.split('\n');
  const tableStartIndex = lines.findIndex(l => l.includes('|') && l.includes('-'));
  if (tableStartIndex === -1) return text;

  let result = text;
  const tableRegex = /(\|[^\n]+\|\n\|[\s-|\n]+\|(?:\n\|[^\n]+\|)+)/g;

  result = result.replace(tableRegex, (match) => {
    const rows = match.split('\n').filter(r => r.trim() && !r.includes('---|'));
    const htmlRows = rows.map((row, i) => {
      const cells = row.split('|').filter(c => c.trim() !== '' || row.indexOf('|') !== row.lastIndexOf('|')).map(c => c.trim());
      const tag = i === 0 ? 'th' : 'td';
      return `<tr>${cells.map(c => `<${tag} style="border:1px solid #ddd;padding:8px;text-align:left;">${c}</${tag}>`).join('')}</tr>`;
    });
    return `<table style="width:100%;border-collapse:collapse;margin:15px 0;font-size:10pt;background:#fff;">${htmlRows.join('')}</table>`;
  });

  return result;
};

export const exportToWord = (data: CreditMemoData) => {
  const header = `
    <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
    <head><meta charset='utf-8'><title>Credit Memo</title>
    <style>
      body { font-family: 'Calibri', 'Arial', sans-serif; line-height: 1.4; color: #333; }
      h1 { text-align: center; color: #008a00; border-bottom: 2pt solid #000; padding-bottom: 5pt; font-size: 18pt; }
      h2 { background-color: #f1f5f9; padding: 5pt; border-left: 5pt solid #000; margin-top: 15pt; font-size: 12pt; }
      .recommendation { font-style: italic; border-left: 2pt solid #008a00; padding: 10pt; background: #f8fafc; margin: 10pt 0; }
      .field { margin-bottom: 4pt; font-size: 10pt; }
      .label { font-weight: bold; width: 150pt; display: inline-block; color: #64748b; }
      .value { font-weight: bold; }
      .narrative { margin-top: 10pt; font-size: 10pt; background: #fff; padding: 5pt; }
    </style>
    </head><body>`;

  const footer = "</body></html>";
  const getVal = (v: any) => v === true ? "YES" : v === false ? "NO" : (v || "N/A");

  const recommendationHtml = markdownTableToHtml(data.analysis?.justification?.recommendation || "No recommendation.");

  const content = `
    <div style="text-align:center;font-weight:bold;background:#000;color:#fff;width:100pt;margin:0 auto;padding:2pt;">CONFIDENTIAL</div>
    <h1>Credit Memo</h1>
    
    <h2>1. Recommendation</h2>
    <div class="recommendation">${recommendationHtml}</div>

    <h2>2. Borrower Profile</h2>
    <div class="field"><span class="label">Legal Name:</span> <span class="value">${getVal(data.primaryBorrower?.borrowerName)}</span></div>
    <div class="field"><span class="label">Group:</span> <span class="value">${getVal(data.primaryBorrower?.group)}</span></div>
    <div class="field"><span class="label">Originating Office:</span> <span class="value">${getVal(data.primaryBorrower?.originatingOffice)}</span></div>

    <h2>3. Credit Details</h2>
    <div class="field"><span class="label">Amount Requested:</span> <span class="value">${data.creditPosition?.creditRequested?.toLocaleString() || "0"}</span></div>
    <div class="field"><span class="label">Margin:</span> <span class="value">${getVal(data.facilityDetails?.rates?.margin)}</span></div>
    <div class="field"><span class="label">Tenor:</span> <span class="value">${getVal(data.facilityDetails?.terms?.tenor)}</span></div>

    <h2>4. Legal & Covenants</h2>
    <div class="field"><span class="label">Agreement Type:</span> <span class="value">${getVal(data.documentation?.agreementType)}</span></div>
    <div class="field"><span class="label">Jurisdiction:</span> <span class="value">${getVal(data.documentation?.jurisdiction)}</span></div>
    <div class="narrative"><strong>Financial Covenants:</strong><br/>${data.documentation?.financialCovenants || "N/A"}</div>
    <div class="narrative"><strong>Negative Covenants:</strong><br/>${data.documentation?.negativeCovenants || "N/A"}</div>
    <div class="narrative"><strong>Positive Covenants:</strong><br/>${data.documentation?.positiveCovenants || "N/A"}</div>
    <div class="narrative"><strong>Reporting Requirements:</strong><br/>${data.documentation?.reportingReqs || "N/A"}</div>
    <div class="narrative"><strong>Funding Conditions:</strong><br/>${data.documentation?.fundingConditions || "N/A"}</div>

    <h2>5. Analysis</h2>
    <div style="font-size:10pt;">${markdownTableToHtml(data.analysis?.overview?.companyDesc || "")}</div>
  `;

  const source = header + content + footer;
  const blob = new Blob(['\ufeff', source], { type: 'application/msword' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `Credit_Memo_${data.primaryBorrower?.borrowerName || 'Draft'}.doc`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};
