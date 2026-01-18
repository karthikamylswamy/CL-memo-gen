
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
      return `<tr>${cells.map(c => `<${tag} style="border:1px solid #ddd;padding:8px;text-align:left;font-size:9pt;">${c}</${tag}>`).join('')}</tr>`;
    });
    return `<table style="width:100%;border-collapse:collapse;margin:10pt 0;background:#fff;">${htmlRows.join('')}</table>`;
  });

  return result;
};

/**
 * Processes narrative text for Word, handling markdown tables, embedded images, and line breaks.
 */
const processNarrativeForWord = (text: string, files: SourceFile[]) => {
  if (!text) return "<i>Information pending AI extraction or manual entry.</i>";
  
  let html = markdownTableToHtml(text);
  
  // Replace image references ![alt](filename) with base64 img tags
  const imageRegex = /!\[(.*?)\]\((.*?)\)/g;
  html = html.replace(imageRegex, (match, alt, filename) => {
    const file = files.find(f => f.name.toLowerCase() === filename.toLowerCase());
    if (file && file.type.startsWith('image/')) {
      return `<div style="text-align:center;margin:15pt 0;"><img src="${file.dataUrl}" alt="${alt}" style="max-width:100%;"><br/><p style="font-size:8pt;color:#666;">Exhibit: ${alt}</p></div>`;
    }
    return `<div style="color:red;font-size:8pt;margin:10pt 0;">[Missing Exhibit: ${filename}]</div>`;
  });

  return html.replace(/\n/g, '<br/>');
};

/**
 * Helper to render section-attached images for Word export
 */
const renderSectionImagesForWord = (images?: SourceFile[]) => {
  if (!images || images.length === 0) return "";
  return images.map(img => `
    <div style="text-align:center;margin:15pt 0;page-break-inside:avoid;">
      <img src="${img.dataUrl}" style="max-width:450pt;border:1px solid #eee;">
      <p style="font-size:8pt;color:#666;font-style:italic;margin-top:4pt;">Exhibit: ${img.name}</p>
    </div>
  `).join("");
};

export const exportToWord = (data: CreditMemoData, files: SourceFile[] = []) => {
  const header = `
    <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
    <head><meta charset='utf-8'><title>Executive Credit Memo</title>
    <style>
      body { font-family: 'Arial', 'Helvetica', sans-serif; line-height: 1.5; color: #333; font-size: 10pt; }
      .header-area { border-bottom: 3pt solid #008a00; padding-bottom: 10pt; margin-bottom: 20pt; }
      .bank-tag { background: #008a00; color: #fff; padding: 3pt 6pt; font-weight: bold; font-size: 14pt; display: inline-block; }
      .confidential { color: #94a3b8; font-weight: bold; text-transform: uppercase; letter-spacing: 2pt; font-size: 8pt; margin-top: 5pt; }
      h1 { font-size: 24pt; font-weight: 900; margin: 10pt 0 0 0; text-transform: uppercase; color: #1e293b; }
      h2 { font-size: 12pt; font-weight: bold; text-transform: uppercase; background: #1e293b; color: #fff; padding: 4pt 8pt; margin-top: 20pt; }
      .section-id { background: #000; color: #fff; border-radius: 50%; width: 20pt; height: 20pt; text-align: center; display: inline-block; margin-right: 10pt; }
      .flag-row { margin-bottom: 2pt; border-bottom: 1px solid #f1f5f9; }
      .flag-label { font-size: 9pt; color: #475569; font-style: italic; }
      .flag-value { font-weight: bold; float: right; font-size: 9pt; }
      .data-table { width: 100%; border-collapse: collapse; margin: 10pt 0; }
      .data-table td { padding: 4pt; border-bottom: 1px solid #f1f5f9; }
      .label { font-weight: bold; color: #64748b; font-size: 8pt; text-transform: uppercase; width: 180pt; }
      .value { font-weight: bold; color: #1e293b; }
      .narrative-box { background: #f8fafc; border-left: 4pt solid #cbd5e1; padding: 10pt; margin: 10pt 0; font-style: italic; }
      .md-box { background: #008a00; color: #fff; padding: 20pt; margin-top: 30pt; }
      .source-ref { font-size: 7pt; color: #94a3b8; font-style: italic; }
    </style>
    </head><body>`;

  const footer = "</body></html>";
  
  const getVal = (v: any) => v === true ? "YES" : v === false ? "NO" : (v === 0 ? "0" : (v || "N/A"));
  
  const renderFlag = (label: string, value: any) => `
    <div class="flag-row">
      <span class="flag-label">o ${label}</span>
      <span class="flag-value" style="color: ${value === true ? '#008a00' : '#64748b'}">${getVal(value)}</span>
    </div>
  `;

  const renderDataRow = (label: string, value: any, path?: string) => `
    <tr>
      <td class="label">${label}:</td>
      <td class="value">${getVal(value)} ${path && data.fieldSources?.[path] ? `<span class="source-ref">[Ref: ${data.fieldSources[path].pageNumber}]</span>` : ''}</td>
    </tr>
  `;

  const content = `
    <div class="header-area">
      <div class="bank-tag">TD</div>
      <div class="confidential">Credit Management • Private & Confidential</div>
      <h1>Executive Credit Memo</h1>
      <div style="font-size: 9pt; font-weight: bold; margin-top: 5pt;">
        Date: ${new Date().toLocaleDateString()} | Status: FINAL FOR COMMITTEE
      </div>
    </div>

    <h2>A. Leveraged Lending Policy & Reporting Classification</h2>
    <div style="margin: 10pt 0;">
      ${renderFlag("TDS Corporate Banking Credit Standards Exception", data.primaryBorrower?.creditException)}
      ${renderFlag("Weak Underwriting", data.primaryBorrower?.weakUnderwriting)}
      ${renderFlag("TDS Leveraged Loan", data.primaryBorrower?.tdsLeveragedLoan)}
      ${renderFlag("Regulatory Leveraged Loan", data.primaryBorrower?.regulatoryLeveragedLoan)}
      ${renderFlag("5 Rated leveraged Loan with leverage > 5.5x", data.primaryBorrower?.highLeverageLoan)}
      ${renderFlag("Sufficient room within Leverage Loan dollar policy limit", data.primaryBorrower?.leveragePolicyRoom)}
      ${renderFlag("Leverage > 6.0x", data.primaryBorrower?.extremeLeverage)}
      ${renderFlag("HRSL Sub limit", data.primaryBorrower?.hrslSubLimit)}
      ${renderFlag("CMT Strategic Loan Sub Limit", data.primaryBorrower?.cmtStrategicLimit)}
      ${renderFlag("ESG Strategic Loan Sub Limit", data.primaryBorrower?.esgStrategicLimit)}
      ${renderFlag("Euro Infrastructure Sub Limit", data.primaryBorrower?.euroInfraLimit)}
      ${renderFlag("High Risk Account (QHRR)", data.primaryBorrower?.highRiskAccount)}
      ${renderFlag("Spotlight Account", data.primaryBorrower?.spotlightAccount)}
      ${renderFlag("Covenant-Lite", data.primaryBorrower?.covenantLite)}
      <div class="flag-row">
        <span class="flag-label">o SEA Score</span>
        <span class="flag-value" style="color: #008a00;">${data.primaryBorrower?.seaScore || "7.2"}</span>
      </div>
    </div>
    ${renderSectionImagesForWord(data.primaryBorrower?.sectionImages)}

    <h2>B. Borrower Overview</h2>
    <div class="narrative-box">
      <strong>Business Description:</strong><br/>
      ${processNarrativeForWord(data.analysis?.overview?.companyDesc || "", files)}
    </div>
    <table class="data-table">
      ${renderDataRow("Reporting Segments", data.analysis?.overview?.segments)}
      ${renderDataRow("Geographic Presence", data.analysis?.overview?.geography)}
      ${renderDataRow("End Customer Profile", data.analysis?.overview?.industryProfile)}
      ${renderDataRow("LTM revenue, EBITDA, margin", data.analysis?.overview?.ltmMetrics)}
    </table>
    <div class="narrative-box">
      <strong>Sponsor Overview:</strong><br/>
      ${processNarrativeForWord(data.analysis?.overview?.sponsorOverview || "", files)}
    </div>
    <div style="font-size: 8pt; color: #64748b; font-style: italic; border: 1px dashed #cbd5e1; padding: 5pt; text-align: center;">
      Existing relationship discussion: ${data.counterparty?.info?.customerSince || "TD: New"}
    </div>

    <h2>C. Request Overview</h2>
    <div class="narrative-box" style="background: #1e293b; color: #fff; border-left: none;">
      <div style="font-size: 8pt; text-transform: uppercase; opacity: 0.7; margin-bottom: 5pt;">Transaction and Financing Platform</div>
      ${processNarrativeForWord(data.purpose?.businessPurpose || "", files)}
    </div>
    <table class="data-table">
      ${renderDataRow("Sponsor Purchase", data.purpose?.sponsorPurchase)}
      ${renderDataRow("Arrangers/Agents", data.purpose?.arrangers)}
      ${renderDataRow("Facilities", data.purpose?.syndicatedFacilities)}
      ${renderDataRow("Funding Mix", data.purpose?.fundingMix)}
    </table>
    ${renderSectionImagesForWord(data.purpose?.sectionImages)}

    <h2>D. Valuation</h2>
    <table class="data-table" style="background: #f8fafc;">
      ${renderDataRow("Weighted Approach", data.analysis?.valuation?.approach)}
      ${renderDataRow("Pro forma reserves & production", data.analysis?.valuation?.reserves)}
    </table>
    <div class="narrative-box">
      <strong>Valuation / Peer Comparison Analysis:</strong><br/>
      ${processNarrativeForWord(data.analysis?.valuation?.peerComp || "", files)}
    </div>
    <div class="narrative-box">
      <strong>Sources & Uses:</strong><br/>
      ${processNarrativeForWord(data.analysis?.overview?.sourcesUses || "", files)}
    </div>

    <h2>E. Credit Request</h2>
    <table class="data-table">
      ${renderDataRow("Requested Aggregation", `$${(data.creditPosition?.creditRequested || 0).toLocaleString()}`, 'creditPosition.creditRequested')}
      ${renderDataRow("Proposed BRR", data.riskAssessment?.borrowerRating?.proposedBrr, 'riskAssessment.borrowerRating.proposedBrr')}
      ${renderDataRow("Proposed FRR", data.riskAssessment?.borrowerRating?.proposedFrr, 'riskAssessment.borrowerRating.proposedFrr')}
      ${renderDataRow("Warehouse line request", data.creditPosition?.warehouseRequest)}
      ${renderDataRow("Hold Commitment", data.creditPosition?.holdCommitment)}
      ${renderDataRow("Expected Time to Zero-Hold", data.creditPosition?.timeToZeroHold)}
    </table>
    <div class="narrative-box" style="border-left-color: #008a00;">
      <strong>Leveraged Lending & Repayment Analysis:</strong><br/>
      ${processNarrativeForWord(data.facilityDetails?.terms?.repaymentAnalysis || "", files)}
    </div>
    ${renderSectionImagesForWord(data.creditPosition?.sectionImages)}

    <h2>F. Discretionary Authority</h2>
    <div style="background: #fff1f2; border: 1px solid #fecdd3; padding: 10pt; color: #9f1239; font-size: 9pt; font-weight: bold; font-style: italic;">
      Explicit statement: Executive & Credit Committee approval is required due to transaction size, excess over guidelines, and strategic nature. Approvals are subject to successful closing and asset divestitures.
    </div>

    <h2>G. RAROC & Fees</h2>
    <table style="width: 100%; border-collapse: collapse; margin-top: 10pt;">
      <tr>
        <td style="width: 33%; background: #008a00; color: #fff; text-align: center; padding: 15pt;">
          <div style="font-size: 8pt; text-transform: uppercase; opacity: 0.8;">Relationship RAROC</div>
          <div style="font-size: 20pt; font-weight: bold;">${data.financialInfo?.raroc?.relationshipRaroc || 0}%</div>
        </td>
        <td style="width: 33%; background: #1e293b; color: #fff; text-align: center; padding: 15pt;">
          <div style="font-size: 8pt; text-transform: uppercase; opacity: 0.8;">Credit-only RAROC</div>
          <div style="font-size: 20pt; font-weight: bold;">${data.financialInfo?.raroc?.creditOnlyRaroc || 0}%</div>
        </td>
        <td style="width: 33%; background: #f8fafc; border: 1px solid #e2e8f0; text-align: center; padding: 15pt;">
          <div style="font-size: 8pt; text-transform: uppercase; color: #64748b;">Underwriting Fees</div>
          <div style="font-size: 10pt; font-weight: bold;">${data.facilityDetails?.rates?.underwritingFee || "As per agreements"}</div>
        </td>
      </tr>
    </table>

    <h2>H. Client Since</h2>
    <div style="padding: 10pt; background: #f8fafc; border-radius: 4pt; display: inline-block;">
      <span style="font-size: 8pt; text-transform: uppercase; color: #64748b; display: block; margin-bottom: 2pt;">Relationship Status</span>
      <span style="font-size: 12pt; font-weight: bold; color: #1e293b;">${data.counterparty?.info?.customerSince || "New"}</span>
    </div>

    <h2>I. Key Terms</h2>
    <table class="data-table">
      ${renderDataRow("Security", data.riskAssessment?.details?.security || "Unsecured, pari passu")}
      ${renderDataRow("J.Crew/Serta Provisions", data.documentation?.jCrewProvisions || "N/A")}
      ${renderDataRow("Subordination Risk", data.documentation?.subordinationRisk || "Medium; pari passu context")}
      ${renderDataRow("Pricing Overview", data.facilityDetails?.rates?.margin || "Competitive IG O&G")}
    </table>
    <div class="narrative-box" style="border-left-color: #008a00;">
      <strong>Covenants (Debt/Cap, standard negatives/positives):</strong><br/>
      ${processNarrativeForWord(data.documentation?.financialCovenants || "", files)}
    </div>
    ${renderSectionImagesForWord(data.documentation?.sectionImages)}

    <h2>J. Historical Financial Performance</h2>
    <div class="narrative-box">
      <strong>Revenue + EBITDA YoY, Leverage Path:</strong><br/>
      ${processNarrativeForWord(data.analysis?.financial?.moodyAnalysis || "", files)}
    </div>
    <table class="data-table">
      ${renderDataRow("Liquidity Levels", data.analysis?.financial?.liquidity)}
      ${renderDataRow("Operating Costs", data.analysis?.financial?.operatingCosts)}
    </table>

    <h2>K. Budget & Sensitivity</h2>
    <div style="margin: 10pt 0;">
      <div style="padding: 10pt; background: #f0fdf4; border-left: 4pt solid #166534; margin-bottom: 5pt;">
        <strong>Base Case:</strong> ${data.analysis?.sensitivity?.baseCase || "Production, asset sales, leverage trajectory"}
      </div>
      <div style="padding: 10pt; background: #fff1f2; border-left: 4pt solid #9f1239;">
        <strong>Downside Case:</strong> ${data.analysis?.sensitivity?.downsideCase || "Lower prices/volumes; leverage peak, recovery path"}
      </div>
    </div>
    <div class="narrative-box">
      <strong>Key Assumptions:</strong><br/>
      ${data.analysis?.sensitivity?.assumptions || "Revenue/EBITDA, WC, capex, M&A, synergies"}
    </div>

    <h2>L. BRR & Public Ratings</h2>
    <table class="data-table">
      ${renderDataRow("CLRA/BRR", data.riskAssessment?.borrowerRating?.proposedBrr || "3B (Downgraded)")}
    </table>
    <div style="font-size: 9pt; font-weight: bold; margin-bottom: 5pt; text-transform: uppercase; color: #64748b;">Public Agency Ratings Watch:</div>
    <table class="data-table" style="border: 1px solid #e2e8f0;">
      <tr style="background: #f8fafc;">
        <th style="padding: 6pt; border: 1px solid #e2e8f0; text-align: left;">Agency</th>
        <th style="padding: 6pt; border: 1px solid #e2e8f0; text-align: left;">Issuer Rating</th>
        <th style="padding: 6pt; border: 1px solid #e2e8f0; text-align: left;">Outlook</th>
      </tr>
      ${data.riskAssessment?.publicRatings?.map(r => `
        <tr>
          <td style="padding: 6pt; border: 1px solid #e2e8f0;">${r.agency}</td>
          <td style="padding: 6pt; border: 1px solid #e2e8f0;">${r.issuerRating || "N/A"}</td>
          <td style="padding: 6pt; border: 1px solid #e2e8f0;">${r.outlook || "N/A"}</td>
        </tr>
      `).join('')}
    </table>
    <div class="narrative-box">
      <strong>Rating Rationale:</strong><br/>
      Proposed rating rationale: scale, assets, deleveraging plan.
    </div>
    ${renderSectionImagesForWord(data.riskAssessment?.sectionImages)}

    <h2>M. Key Business/Industry Risks</h2>
    <ul style="font-size: 10pt; line-height: 1.6;">
      <li>Elevated leverage; integration risk; commodity price volatility; environmental & regulatory considerations; international exposure mix</li>
      <li>Refer to analysis narrative for specific drill-downs on sector fundamentals.</li>
    </ul>

    <h2>N. Summary of Key Risks & Mitigants</h2>
    <div style="background: #f8fafc; padding: 10pt; border: 1px solid #e2e8f0; text-align: center; font-style: italic; color: #64748b;">
      Summary of key risks (Leverage, Integration, Price) balanced by mitigants (Asset quality, Cash flow, Management plan).
    </div>

    <div class="md-box">
      <div style="font-size: 8pt; text-transform: uppercase; opacity: 0.7; letter-spacing: 2pt; margin-bottom: 10pt;">Managing Director Comments & Endorsement</div>
      <div style="font-size: 13pt; line-height: 1.5; font-style: italic;">
        "${data.analysis?.justification?.mdComments || "Strategic opportunity; elevated risks mitigated by scale, assets, plan, and team. Recommendation: approve, subject to stated conditions and monitoring."}"
      </div>
      <div style="margin-top: 20pt; border-top: 1px solid rgba(255,255,255,0.2); padding-top: 10pt;">
        <div style="font-weight: bold; font-size: 10pt;">${data.analysis?.justification?.executivesSupporting || "Senior TDS Leadership"}</div>
        <div style="font-size: 8pt; opacity: 0.8;">Global Banking & Markets</div>
      </div>
    </div>

    <div style="margin-top: 40pt; text-align: center; border-top: 1px solid #e2e8f0; padding-top: 20pt;">
      <div style="font-size: 8pt; color: #cbd5e1; font-weight: bold; letter-spacing: 4pt; text-transform: uppercase;">End of Consolidated Memo</div>
      <div style="font-size: 7pt; color: #cbd5e1; margin-top: 5pt;">Generated via Maple AI • TD Internal Use Only</div>
    </div>
  `;

  const source = header + content + footer;
  const blob = new Blob(['\ufeff', source], { type: 'application/msword' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `Executive_Credit_Memo_${data.primaryBorrower?.borrowerName || 'Draft'}_${new Date().toISOString().split('T')[0]}.doc`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};
