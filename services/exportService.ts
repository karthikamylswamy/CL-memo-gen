
import { CreditMemoData, SourceFile } from "../types";

/**
 * Converts simple markdown tables to HTML table tags for Word compatibility.
 */
const markdownTableToHtml = (text: string) => {
  if (!text || !text.includes('|')) return text;

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

/**
 * Processes markdown narrative, converting tables and embedding image base64 data.
 */
const processNarrativeForWord = (text: string, files: SourceFile[]) => {
  if (!text) return "N/A";
  
  let html = markdownTableToHtml(text);
  
  // Replace image references ![alt](filename) with base64 img tags for Word embedding
  const imageRegex = /!\[(.*?)\]\((.*?)\)/g;
  html = html.replace(imageRegex, (match, alt, filename) => {
    const file = files.find(f => f.name.toLowerCase() === filename.toLowerCase());
    if (file && file.type.startsWith('image/')) {
      return `<div style="text-align:center;margin:20pt 0;"><img src="${file.dataUrl}" alt="${alt}" style="max-width:100%;"><br/><p style="font-size:8pt;color:#666;">Exhibit: ${alt}</p></div>`;
    }
    return `<div style="color:red;font-size:8pt;margin:10pt 0;">[Image Reference Missing: ${filename}]</div>`;
  });

  return html.replace(/\n/g, '<br/>');
};

export const exportToWord = (data: CreditMemoData, files: SourceFile[] = []) => {
  const header = `
    <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
    <head><meta charset='utf-8'><title>Credit Memo</title>
    <style>
      body { font-family: 'Calibri', 'Arial', sans-serif; line-height: 1.4; color: #333; }
      h1 { text-align: center; color: #008a00; border-bottom: 2pt solid #000; padding-bottom: 5pt; font-size: 18pt; }
      h2 { background-color: #f1f5f9; padding: 5pt; border-left: 5pt solid #000; margin-top: 15pt; font-size: 12pt; }
      h3 { border-bottom: 1pt solid #cbd5e1; color: #64748b; font-size: 10pt; text-transform: uppercase; margin-top: 10pt; }
      .recommendation { font-style: italic; border-left: 2pt solid #008a00; padding: 10pt; background: #f8fafc; margin: 10pt 0; }
      .field { margin-bottom: 4pt; font-size: 10pt; }
      .label { font-weight: bold; width: 150pt; display: inline-block; color: #64748b; }
      .value { font-weight: bold; }
      .narrative { margin-top: 10pt; font-size: 10pt; background: #fff; padding: 5pt; }
      table { width:100%; border-collapse:collapse; margin-top: 10pt; }
      th, td { border: 1px solid #ddd; padding: 6pt; font-size: 9pt; }
      th { background: #f8fafc; font-weight: bold; color: #475569; }
    </style>
    </head><body>`;

  const footer = "</body></html>";
  const getVal = (v: any) => v === true ? "YES" : v === false ? "NO" : (v || "N/A");

  const recommendationHtml = processNarrativeForWord(data.analysis?.justification?.recommendation || "", files);

  const content = `
    <div style="text-align:center;font-weight:bold;background:#000;color:#fff;width:100pt;margin:0 auto;padding:2pt;">CONFIDENTIAL</div>
    <h1>Credit Memo</h1>
    
    <h2>1. Recommendation</h2>
    <div class="recommendation">${recommendationHtml}</div>

    <h2>2. Borrower Profile</h2>
    <div class="field"><span class="label">Legal Name:</span> <span class="value">${getVal(data.primaryBorrower?.borrowerName)}</span></div>
    <div class="field"><span class="label">Group:</span> <span class="value">${getVal(data.primaryBorrower?.group)}</span></div>
    <div class="field"><span class="label">Originating Office:</span> <span class="value">${getVal(data.primaryBorrower?.originatingOffice)}</span></div>
    <div class="field"><span class="label">Classification:</span> <span class="value">${getVal(data.primaryBorrower?.accountClassification)}</span></div>
    <div class="field"><span class="label">Leveraged:</span> <span class="value">${getVal(data.primaryBorrower?.leveragedLending)}</span></div>

    <h2>3. Credit & Exposure</h2>
    <div class="field"><span class="label">Amount Requested:</span> <span class="value">${data.creditPosition?.creditRequested?.toLocaleString() || "0"}</span></div>
    <div class="field"><span class="label">Present Position:</span> <span class="value">${data.creditPosition?.presentPosition?.toLocaleString() || "0"}</span></div>
    <div class="field"><span class="label">Previous Auth:</span> <span class="value">${data.creditPosition?.previousAuthorization?.toLocaleString() || "0"}</span></div>
    <div class="field"><span class="label">Trading Line:</span> <span class="value">${data.creditPosition?.tradingLine?.toLocaleString() || "0"}</span></div>

    <h2>4. Facility Details</h2>
    <div class="field"><span class="label">Margin:</span> <span class="value">${getVal(data.facilityDetails?.rates?.margin)}</span></div>
    <div class="field"><span class="label">Tenor:</span> <span class="value">${getVal(data.facilityDetails?.terms?.tenor)}</span></div>
    <div class="field"><span class="label">Maturity:</span> <span class="value">${getVal(data.facilityDetails?.terms?.maturity)}</span></div>
    <div class="field"><span class="label">Fee:</span> <span class="value">${getVal(data.facilityDetails?.rates?.fee)}</span></div>

    <h2>5. Legal & Covenants</h2>
    <div class="field"><span class="label">Agreement Type:</span> <span class="value">${getVal(data.documentation?.agreementType)}</span></div>
    <div class="field"><span class="label">Jurisdiction:</span> <span class="value">${getVal(data.documentation?.jurisdiction)}</span></div>
    <div class="narrative"><strong>Financial Covenants:</strong><br/>${data.documentation?.financialCovenants || "N/A"}</div>
    <div class="narrative"><strong>Negative Covenants:</strong><br/>${data.documentation?.negativeCovenants || "N/A"}</div>
    <div class="narrative"><strong>Positive Covenants:</strong><br/>${data.documentation?.positiveCovenants || "N/A"}</div>
    <div class="narrative"><strong>Reporting Requirements:</strong><br/>${data.documentation?.reportingReqs || "N/A"}</div>
    <div class="narrative"><strong>Funding Conditions:</strong><br/>${data.documentation?.fundingConditions || "N/A"}</div>

    <h2>6. Risk & Ratings</h2>
    <h3>Borrower Rating</h3>
    <div class="field"><span class="label">Proposed BRR:</span> <span class="value">${getVal(data.riskAssessment?.borrowerRating?.proposedBrr)}</span></div>
    <div class="field"><span class="label">Current BRR:</span> <span class="value">${getVal(data.riskAssessment?.borrowerRating?.currentBrr)}</span></div>
    <div class="field"><span class="label">Risk Analyst:</span> <span class="value">${getVal(data.riskAssessment?.borrowerRating?.riskAnalyst)}</span></div>
    
    <h3>Agency Ratings</h3>
    <table>
      <thead>
        <tr>
          <th>Agency</th>
          <th>Issuer Rating</th>
          <th>Senior Unsecured</th>
          <th>Outlook</th>
        </tr>
      </thead>
      <tbody>
        ${data.riskAssessment?.publicRatings?.map(r => `
          <tr>
            <td>${r.agency}</td>
            <td>${getVal(r.issuerRating)}</td>
            <td>${getVal(r.seniorUnsecured)}</td>
            <td>${getVal(r.outlook)}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>

    <h2>7. Financials & RAROC</h2>
    <div class="field"><span class="label">Economic RAROC:</span> <span class="value">${getVal(data.financialInfo?.raroc?.economicRaroc)}%</span></div>
    <div class="field"><span class="label">Relationship RAROC:</span> <span class="value">${getVal(data.financialInfo?.raroc?.relationshipRaroc)}%</span></div>
    <div class="field"><span class="label">LCC Status:</span> <span class="value">${getVal(data.financialInfo?.raroc?.lccStatus)}</span></div>

    <h2>8. Analysis</h2>
    <div class="narrative">${processNarrativeForWord(data.analysis?.overview?.companyDesc || "", files)}</div>

    <h2>9. Compliance</h2>
    <div class="field"><span class="label">Approver:</span> <span class="value">${getVal(data.compliance?.signOff?.approver)}</span></div>
    <div class="field"><span class="label">Date:</span> <span class="value">${getVal(data.compliance?.signOff?.date)}</span></div>
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
