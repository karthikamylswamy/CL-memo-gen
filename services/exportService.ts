
import { CreditMemoData } from "../types";

export const exportToWord = (data: CreditMemoData) => {
  const header = `
    <html xmlns:o='urn:schemas-microsoft-com:office:office' 
          xmlns:w='urn:schemas-microsoft-com:office:word' 
          xmlns='http://www.w3.org/TR/REC-html40'>
    <head><meta charset='utf-8'><title>Credit Memo</title>
    <style>
      body { font-family: 'Calibri', 'Arial', sans-serif; line-height: 1.5; color: #333; }
      h1 { text-align: center; color: #1e293b; text-transform: uppercase; border-bottom: 2px solid #000; padding-bottom: 10px; }
      h2 { background-color: #f1f5f9; color: #0f172a; padding: 5px 10px; text-transform: uppercase; border-left: 5px solid #000; margin-top: 20px; }
      .section { margin-bottom: 20px; }
      .field { margin-bottom: 5px; }
      .label { font-weight: bold; color: #64748b; width: 200px; display: inline-block; }
      .value { font-weight: bold; color: #000; }
      .recommendation { font-style: italic; border-left: 3px solid #6366f1; padding-left: 15px; margin-top: 10px; }
      table { width: 100%; border-collapse: collapse; margin-top: 10px; }
      th, td { border: 1px solid #e2e8f0; padding: 8px; text-align: left; }
      th { background-color: #f8fafc; font-size: 10px; text-transform: uppercase; }
    </style>
    </head><body>`;

  const footer = "</body></html>";

  const content = `
    <h1>Credit Application Memo</h1>
    <p style="text-align: right;">Date: ${data.compliance.signOff.date || new Date().toLocaleDateString()}</p>
    
    <h2>1. Executive Summary & Recommendation</h2>
    <div class="recommendation">
      ${data.analysis.justification.recommendation || "No recommendation provided."}
    </div>

    <h2>2. Borrower Profile</h2>
    <div class="field"><span class="label">Borrower:</span> <span class="value">${data.primaryBorrower.borrowerName || "N/A"}</span></div>
    <div class="field"><span class="label">Office:</span> <span class="value">${data.primaryBorrower.originatingOffice || "N/A"}</span></div>
    <div class="field"><span class="label">Group:</span> <span class="value">${data.primaryBorrower.group || "N/A"}</span></div>
    <div class="field"><span class="label">Classification:</span> <span class="value">${data.primaryBorrower.accountClassification || "N/A"}</span></div>
    <p>${data.analysis.overview.companyDesc || ""}</p>

    <h2>3. Credit Position & Facility Structure</h2>
    <div class="field"><span class="label">Credit Requested:</span> <span class="value">$${data.creditPosition.creditRequested?.toLocaleString() || "0"}</span></div>
    <div class="field"><span class="label">Previous Authorized:</span> <span class="value">$${data.creditPosition.previousAuthorization?.toLocaleString() || "0"}</span></div>
    <div class="field"><span class="label">Instrument:</span> <span class="value">${data.facilityDetails.options.instruments || "N/A"}</span></div>
    <div class="field"><span class="label">Tenor:</span> <span class="value">${data.facilityDetails.terms.tenor || "N/A"}</span></div>
    <div class="field"><span class="label">Maturity:</span> <span class="value">${data.facilityDetails.terms.maturity || "N/A"}</span></div>
    <div class="field"><span class="label">Pricing (Margin):</span> <span class="value">${data.facilityDetails.rates.margin || "N/A"}</span></div>

    <h2>4. Risk Ratings</h2>
    <div class="field"><span class="label">Borrower BRR:</span> <span class="value">${data.counterparty.ratings[0]?.brr || "TBD"}</span></div>
    <div class="field"><span class="label">Risk Analyst RA:</span> <span class="value">${data.counterparty.ratings[0]?.ra || "TBD"}</span></div>
    
    <h2>5. Sign-Off</h2>
    <div class="field"><span class="label">Signatory:</span> <span class="value">${data.compliance.signOff.name || ""}</span></div>
    <div class="field"><span class="label">Title:</span> <span class="value">${data.compliance.signOff.title || ""}</span></div>
    <div class="field"><span class="label">Approver:</span> <span class="value">${data.compliance.signOff.approver || ""}</span></div>
  `;

  const source = header + content + footer;
  const blob = new Blob(['\ufeff', source], {
    type: 'application/msword'
  });

  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `Credit_Memo_${data.primaryBorrower.borrowerName || 'Draft'}.doc`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};
