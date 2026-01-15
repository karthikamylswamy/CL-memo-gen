
import { CreditMemoData, SourceFile, FieldSource } from "../types";

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
      .source { font-size: 7pt; color: #94a3b8; font-style: italic; margin-left: 10pt; font-weight: normal; }
      .narrative { margin-top: 10pt; font-size: 10pt; background: #fff; padding: 5pt; }
      table { width:100%; border-collapse:collapse; margin-top: 10pt; }
      th, td { border: 1px solid #ddd; padding: 6pt; font-size: 9pt; }
      th { background: #f8fafc; font-weight: bold; color: #475569; }
    </style>
    </head><body>`;

  const footer = "</body></html>";
  
  const getVal = (v: any) => v === true ? "YES" : v === false ? "NO" : (v || "N/A");
  
  const getSourceStr = (path: string) => {
    const s = data.fieldSources?.[path];
    return s ? `<span class="source">[Ref: ${s.filename} | P.${s.pageNumber}]</span>` : '';
  };

  const renderField = (label: string, value: any, path: string) => `
    <div class="field">
      <span class="label">${label}:</span> 
      <span class="value">${getVal(value)}</span>
      ${getSourceStr(path)}
    </div>
  `;

  const recommendationHtml = processNarrativeForWord(data.analysis?.justification?.recommendation || "", files);

  const content = `
    <div style="text-align:center;font-weight:bold;background:#000;color:#fff;width:100pt;margin:0 auto;padding:2pt;">CONFIDENTIAL</div>
    <h1>Executive Credit Memo</h1>
    
    <h2>1. Strategic Recommendation</h2>
    <div class="recommendation">${recommendationHtml}</div>
    ${getSourceStr('analysis.justification.recommendation')}

    <h2>2. Borrower Profile & Policy Classification</h2>
    ${renderField("Legal Name", data.primaryBorrower?.borrowerName, "primaryBorrower.borrowerName")}
    ${renderField("Group", data.primaryBorrower?.group, "primaryBorrower.group")}
    ${renderField("Classification", data.primaryBorrower?.accountClassification, "primaryBorrower.accountClassification")}
    <div style="margin-top: 10pt;">
      ${renderField("Leveraged Lending Policy", data.primaryBorrower?.leveragedLending, "primaryBorrower.leveragedLending")}
      ${renderField("Regulatory Leveraged", data.primaryBorrower?.regulatoryLeveragedLoan, "primaryBorrower.regulatoryLeveragedLoan")}
      ${renderField("High Leverage (>5.5x)", data.primaryBorrower?.highLeverageLoan, "primaryBorrower.highLeverageLoan")}
      ${renderField("SEA Score", data.primaryBorrower?.seaScore, "primaryBorrower.seaScore")}
    </div>

    <h2>3. Credit & Exposure</h2>
    ${renderField("Amount Requested", data.creditPosition?.creditRequested?.toLocaleString(), "creditPosition.creditRequested")}
    ${renderField("Hold Commitment", data.creditPosition?.holdCommitment, "creditPosition.holdCommitment")}
    ${renderField("Warehouse Line", data.creditPosition?.warehouseRequest, "creditPosition.warehouseRequest")}
    ${renderField("Exposure Status", data.creditPosition?.groupExposureStatus, "creditPosition.groupExposureStatus")}

    <h2>4. Facility Details</h2>
    ${renderField("Margin", data.facilityDetails?.rates?.margin, "facilityDetails.rates.margin")}
    ${renderField("Underwriting Fee", data.facilityDetails?.rates?.underwritingFee, "facilityDetails.rates.underwritingFee")}
    ${renderField("Tenor", data.facilityDetails?.terms?.tenor, "facilityDetails.terms.tenor")}
    <div class="narrative"><strong>Repayment Analysis:</strong><br/>${data.facilityDetails?.terms?.repaymentAnalysis || "N/A"}</div>

    <h2>5. Legal & Covenants</h2>
    ${renderField("Agreement Type", data.documentation?.agreementType, "documentation.agreementType")}
    ${renderField("Jurisdiction", data.documentation?.jurisdiction, "documentation.jurisdiction")}
    <div class="narrative"><strong>Financial Covenants:</strong> ${getSourceStr('documentation.financialCovenants')}<br/>${data.documentation?.financialCovenants || "N/A"}</div>
    <div class="narrative"><strong>Lender Protections:</strong> ${getSourceStr('documentation.jCrewProvisions')}<br/>${data.documentation?.jCrewProvisions || "N/A"}</div>

    <h2>6. Risk & Ratings</h2>
    <h3>Borrower Rating</h3>
    ${renderField("Proposed BRR", data.riskAssessment?.borrowerRating?.proposedBrr, "riskAssessment.borrowerRating.proposedBrr")}
    ${renderField("Proposed FRR", data.riskAssessment?.borrowerRating?.proposedFrr, "riskAssessment.borrowerRating.proposedFrr")}
    ${renderField("Current BRR", data.riskAssessment?.borrowerRating?.currentBrr, "riskAssessment.borrowerRating.currentBrr")}
    
    <h3>Agency Ratings</h3>
    <table>
      <thead>
        <tr>
          <th>Agency</th>
          <th>Issuer Rating</th>
          <th>Outlook</th>
        </tr>
      </thead>
      <tbody>
        ${data.riskAssessment?.publicRatings?.map(r => `
          <tr>
            <td>${r.agency}</td>
            <td>${getVal(r.issuerRating)}</td>
            <td>${getVal(r.outlook)}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>

    <h2>7. Financials & RAROC</h2>
    ${renderField("Economic RAROC", data.financialInfo?.raroc?.economicRaroc + "%", "financialInfo.raroc.economicRaroc")}
    ${renderField("Relationship RAROC", data.financialInfo?.raroc?.relationshipRaroc + "%", "financialInfo.raroc.relationshipRaroc")}
    ${renderField("Economic Capital", data.financialInfo?.raroc?.economicCapital?.toLocaleString(), "financialInfo.raroc.economicCapital")}

    <h2>8. Analysis Overview</h2>
    <div class="narrative"><strong>Company Description:</strong><br/>${processNarrativeForWord(data.analysis?.overview?.companyDesc || "", files)}</div>
    <div class="narrative"><strong>Sponsor Overview:</strong><br/>${processNarrativeForWord(data.analysis?.overview?.sponsorOverview || "", files)}</div>

    <h2>9. Executive Recommendation & Sign-off</h2>
    <div class="narrative"><strong>MD Comments:</strong><br/>${data.analysis?.justification?.mdComments || "N/A"}</div>
    <div style="margin-top: 15pt;">
      ${renderField("Approver", data.compliance?.signOff?.approver, "compliance.signOff.approver")}
      ${renderField("Date", data.compliance?.signOff?.date, "compliance.signOff.date")}
    </div>
  `;

  const source = header + content + footer;
  const blob = new Blob(['\ufeff', source], { type: 'application/msword' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `Executive_Credit_Memo_${data.primaryBorrower?.borrowerName || 'Draft'}.doc`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};
