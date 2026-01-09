
import { CreditMemoData } from "../types";

export const exportToWord = (data: CreditMemoData) => {
  const header = `
    <html xmlns:o='urn:schemas-microsoft-com:office:office' 
          xmlns:w='urn:schemas-microsoft-com:office:word' 
          xmlns='http://www.w3.org/TR/REC-html40'>
    <head><meta charset='utf-8'><title>Credit Application Memo</title>
    <style>
      body { font-family: 'Calibri', 'Arial', sans-serif; line-height: 1.4; color: #333; margin: 20pt; }
      h1 { text-align: center; color: #008a00; text-transform: uppercase; border-bottom: 2pt solid #000; padding-bottom: 5pt; font-size: 18pt; }
      h2 { background-color: #f1f5f9; color: #0f172a; padding: 5pt; text-transform: uppercase; border-left: 5pt solid #000; margin-top: 15pt; font-size: 12pt; border-bottom: 1pt solid #cbd5e1; }
      h3 { font-size: 10pt; color: #64748b; text-transform: uppercase; border-bottom: 0.5pt solid #e2e8f0; padding-bottom: 2pt; margin-top: 10pt; }
      .section { margin-bottom: 15pt; }
      .field { margin-bottom: 3pt; font-size: 10pt; }
      .label { font-weight: bold; color: #475569; width: 180pt; display: inline-block; }
      .value { font-weight: bold; color: #000; }
      .recommendation { font-style: italic; border-left: 2pt solid #008a00; padding-left: 10pt; margin: 10pt 0; background: #f8fafc; padding: 10pt; font-size: 11pt; }
      .narrative { font-size: 10pt; background: #fff; padding: 5pt; border: 0.5pt solid #e2e8f0; margin-top: 5pt; }
      table { width: 100%; border-collapse: collapse; margin-top: 10pt; }
      th, td { border: 1px solid #e2e8f0; padding: 5pt; text-align: left; font-size: 9pt; }
      th { background-color: #f1f5f9; font-weight: bold; text-transform: uppercase; color: #475569; }
      .confidential { text-align: center; font-weight: bold; color: #fff; background: #000; padding: 3pt; font-size: 9pt; text-transform: uppercase; width: 100pt; margin: 0 auto; }
    </style>
    </head><body>`;

  const footer = "</body></html>";

  const getVal = (val: any) => val === true ? "YES" : val === false ? "NO" : (val || "N/A");

  const content = `
    <div class="confidential">Confidential</div>
    <h1>Credit Application Memo</h1>
    <p style="text-align: right; font-size: 9pt;">Date: ${data.compliance?.signOff?.date || new Date().toLocaleDateString()}</p>
    <p style="text-align: right; font-size: 9pt;">Reference: ${data.primaryBorrower?.borrowerName || "Draft"}</p>
    
    <h2>1. Executive Recommendation</h2>
    <div class="recommendation">
      ${data.analysis?.justification?.recommendation || "No recommendation provided."}
    </div>
    ${data.analysis?.additionalComments ? `<div class="narrative"><strong>Analyst Comments:</strong> ${data.analysis.additionalComments}</div>` : ''}

    <h2>2. Borrower Profile</h2>
    <div class="field"><span class="label">Legal Name:</span> <span class="value">${getVal(data.primaryBorrower?.borrowerName)}</span></div>
    <div class="field"><span class="label">Originating Office:</span> <span class="value">${getVal(data.primaryBorrower?.originatingOffice)}</span></div>
    <div class="field"><span class="label">Group:</span> <span class="value">${getVal(data.primaryBorrower?.group)}</span></div>
    <div class="field"><span class="label">Account Class:</span> <span class="value">${getVal(data.primaryBorrower?.accountClassification)}</span></div>
    
    <h3>Risk Classifications</h3>
    <div class="field"><span class="label">Quarterly Review:</span> <span class="value">${getVal(data.primaryBorrower?.quarterlyReview)}</span></div>
    <div class="field"><span class="label">Leveraged Lending:</span> <span class="value">${getVal(data.primaryBorrower?.leveragedLending)}</span></div>
    <div class="field"><span class="label">Strategic Loan:</span> <span class="value">${getVal(data.primaryBorrower?.strategicLoan)}</span></div>
    <div class="field"><span class="label">Credit Exception:</span> <span class="value">${getVal(data.primaryBorrower?.creditException)}</span></div>
    <div class="field"><span class="label">Covenant-Lite:</span> <span class="value">${getVal(data.primaryBorrower?.covenantLite)}</span></div>
    
    ${data.analysis?.overview?.companyDesc ? `<h3>Company Overview</h3><div class="narrative">${data.analysis.overview.companyDesc}</div>` : ''}

    <h2>3. Purpose & Exposure</h2>
    ${data.purpose?.businessPurpose ? `<h3>Business Purpose</h3><div class="narrative">${data.purpose.businessPurpose}</div>` : ''}
    <div class="field"><span class="label">Annual Review Status:</span> <span class="value">${getVal(data.purpose?.annualReviewStatus)}</span></div>
    
    <h3>Credit Position (CAD '000s)</h3>
    <div class="field"><span class="label">Credit Requested:</span> <span class="value">${data.creditPosition?.creditRequested?.toLocaleString() || "0"}</span></div>
    <div class="field"><span class="label">Present Position:</span> <span class="value">${data.creditPosition?.presentPosition?.toLocaleString() || "0"}</span></div>
    <div class="field"><span class="label">Previous Authorized:</span> <span class="value">${data.creditPosition?.previousAuthorization?.toLocaleString() || "0"}</span></div>
    <div class="field"><span class="label">Trading Line:</span> <span class="value">${data.creditPosition?.tradingLine?.toLocaleString() || "0"}</span></div>

    <h2>4. Financials & Profitability</h2>
    <div class="field"><span class="label">LCC Status:</span> <span class="value">${getVal(data.financialInfo?.raroc?.lccStatus)}</span></div>
    <div class="field"><span class="label">Economic RAROC:</span> <span class="value">${data.financialInfo?.raroc?.economicRaroc || 0}%</span></div>
    <div class="field"><span class="label">Relationship RAROC:</span> <span class="value">${data.financialInfo?.raroc?.relationshipRaroc || 0}%</span></div>
    
    <h2>5. Risk Ratings</h2>
    <div class="field"><span class="label">Proposed TD BRR:</span> <span class="value">${getVal(data.riskAssessment?.borrowerRating?.proposedBrr)}</span></div>
    <div class="field"><span class="label">Current TD BRR:</span> <span class="value">${getVal(data.riskAssessment?.borrowerRating?.currentBrr)}</span></div>
    <div class="field"><span class="label">Risk Analyst:</span> <span class="value">${getVal(data.riskAssessment?.borrowerRating?.riskAnalyst)}</span></div>

    <h3>Agency Ratings</h3>
    <table>
      <thead>
        <tr><th>Agency</th><th>Issuer</th><th>Senior Unsec</th><th>Outlook</th><th>Updated</th></tr>
      </thead>
      <tbody>
        ${(data.riskAssessment?.publicRatings || []).map(r => `
          <tr><td>${r.agency}</td><td>${r.issuerRating || '-'}</td><td>${r.seniorUnsecured || '-'}</td><td>${r.outlook || '-'}</td><td>${r.updatedAt || '-'}</td></tr>
        `).join('')}
      </tbody>
    </table>

    <h2>6. Facility Details</h2>
    <div class="field"><span class="label">Tenor:</span> <span class="value">${getVal(data.facilityDetails?.terms?.tenor)}</span></div>
    <div class="field"><span class="label">Maturity:</span> <span class="value">${getVal(data.facilityDetails?.terms?.maturity)}</span></div>
    <div class="field"><span class="label">Margin:</span> <span class="value">${getVal(data.facilityDetails?.rates?.margin)}</span></div>
    <div class="field"><span class="label">Fees:</span> <span class="value">${getVal(data.facilityDetails?.rates?.fee)}</span></div>
    <div class="field"><span class="label">Amortizing:</span> <span class="value">${getVal(data.facilityDetails?.repayment?.amortizing)}</span></div>

    <h2>7. Legal & Covenants</h2>
    <div class="field"><span class="label">Agreement Type:</span> <span class="value">${getVal(data.documentation?.agreementType)}</span></div>
    <div class="field"><span class="label">Jurisdiction:</span> <span class="value">${getVal(data.documentation?.jurisdiction)}</span></div>
    
    <h3>Financial Covenants</h3>
    <div class="narrative">${getVal(data.documentation?.financialCovenants)}</div>
    
    <h3>Reporting Requirements</h3>
    <div class="narrative">${getVal(data.documentation?.reportingReqs)}</div>

    <h2>8. Sign-off</h2>
    <div class="field"><span class="label">Prepared By:</span> <span class="value">${getVal(data.compliance?.signOff?.name)}</span></div>
    <div class="field"><span class="label">Title:</span> <span class="value">${getVal(data.compliance?.signOff?.title)}</span></div>
    <div class="field"><span class="label">Approver:</span> <span class="value">${getVal(data.compliance?.signOff?.approver)}</span></div>
  `;

  const source = header + content + footer;
  const blob = new Blob(['\ufeff', source], {
    type: 'application/msword'
  });

  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `Credit_Memo_${data.primaryBorrower?.borrowerName || 'Draft'}.doc`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};
