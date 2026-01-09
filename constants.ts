
import { Section, CreditMemoData } from './types';

export const SECTIONS: Section[] = [
  { id: 'borrower_details', label: 'Primary Borrower', icon: '👤', category: 'General' },
  { id: 'purpose', label: 'Purpose & Review', icon: '🎯', category: 'General' },
  { id: 'credit_exposure', label: 'Credit & Exposure', icon: '💰', category: 'Financial' },
  { id: 'financials_raroc', label: 'Financials & RAROC', icon: '📊', category: 'Financial' },
  { id: 'risk_ratings', label: 'Risk & Ratings', icon: '⭐', category: 'Risk' },
  { id: 'facility_info', label: 'Facility Details', icon: '🏢', category: 'Terms' },
  { id: 'documentation_covenants', label: 'Legal & Covenants', icon: '📄', category: 'Legal' },
  { id: 'analysis_narrative', label: 'Analysis & Narrative', icon: '🖋️', category: 'Analysis' },
  { id: 'compliance_signoff', label: 'Sign-off & Compliance', icon: '✅', category: 'Closing' },
  { id: 'source_documents', label: 'Source Documents', icon: '📂', category: 'Review' },
  { id: 'document_preview', label: 'Final Document Preview', icon: '👀', category: 'Review' },
];

export const INITIAL_DATA: CreditMemoData = {
  primaryBorrower: {
    borrowerName: '',
    originatingOffice: '',
    group: '',
    accountClassification: '',
    quarterlyReview: false,
    leveragedLending: false,
    strategicLoan: false,
    creditException: false,
    covenantLite: false,
    weakUnderwriting: false,
    tdsPolicyException: false,
  },
  purpose: {
    businessPurpose: '',
    adjudicationConsiderations: '',
    annualReviewStatus: '',
    reviewPurpose: {
      newFacilities: false,
      financialCovenants: false,
      maturityDates: false,
    },
  },
  creditPosition: {
    previousAuthorization: 0,
    presentPosition: 0,
    creditRequested: 0,
    committedOverOneYear: 0,
    totalExcludingTrading: 0,
    tradingLine: 0,
  },
  groupExposure: [],
  financialInfo: {
    covenants: [],
    raroc: { lccStatus: '', economicRaroc: 0, relationshipRaroc: 0, economicCapital: 0 }
  },
  reviewDates: { newAnnualDate: '', authorizedDate: '', interimDate: '', comments: '' },
  counterparty: {
    ratings: [],
    info: {
      legalName: '', address: '', accountType: '', envRisk: '', countryInc: '',
      countryRevenue: '', established: '', customerSince: '', baselAdequacy: ''
    }
  },
  riskAssessment: {
    summary: { ratings: '', analyst: '', fileName: '' },
    publicRatings: [],
    details: {
      tdSic: '', industryRisk: '', security: '', ltv: 0, businessRisk: '',
      financialRisk: '', envRisk: '', countryRisk: '', governanceRisk: '', withinLimits: true
    }
  },
  facilityDetails: {
    summaries: [],
    tradingLines: { unhedged: 0, bond: 0, subtotal: 0, total: 0 },
    options: { instruments: '', currencies: '', lcSublimit: 0, competitiveAdvance: '' },
    rates: { margin: '', fee: '', allIn: '', upfront: '' },
    terms: { tenor: '', maturity: '', extension: '', termOut: '' },
    repayment: { amortizing: false, comments: '' },
    prepayment: { permitted: false, comments: '' },
  },
  documentation: {
    agreementType: '', date: '', status: '', amendments: '', comments: '',
    jurisdiction: '', waiverJuryTrial: false, negativeCovenants: '',
    positiveCovenants: '', financialCovenants: [], eventsOfDefault: '', reportingReqs: ''
  },
  analysis: {
    // Fixed: Initialized overview with empty strings instead of type names and used commas instead of semicolons
    overview: { companyDesc: '', recentEvents: '', sourcesUses: '', financingPlan: '' },
    financial: { moodyAnalysis: '', ratioAnalysis: '', capStructure: '', liquidity: '', debtMaturity: '' },
    leverage: '',
    sensitivity: { baseCase: '', downsideCase: '' },
    justification: { mraOutput: '', peerComp: '', fundamentals: '', fcf: '', recommendation: '' }
  },
  compliance: {
    signOff: { name: '', title: '', date: '', approver: '' },
    legal: { declarationInterest: '', directors: '', illegalTying: '' }
  },
  fieldSources: {}
};
