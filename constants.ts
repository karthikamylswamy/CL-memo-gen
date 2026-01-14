
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
  { id: 'document_preview', label: 'Final Document Preview', icon: '👀', category: 'Review' }
];

export const getInitialData = (): CreditMemoData => ({
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
    additionalComments: '',
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
    additionalComments: '',
  },
  creditPosition: {
    previousAuthorization: 0,
    presentPosition: 0,
    creditRequested: 0,
    committedOverOneYear: 0,
    totalExcludingTrading: 0,
    tradingLine: 0,
    additionalComments: '',
  },
  groupExposure: [],
  financialInfo: {
    covenants: [],
    raroc: { lccStatus: '', economicRaroc: 0, relationshipRaroc: 0, economicCapital: 0 },
    additionalComments: '',
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
    borrowerRating: {
      proposedBrr: '',
      currentBrr: '',
      riskAnalyst: '',
      newRaPolicy: '',
      raPolicyModel: ''
    },
    publicRatings: [
      { agency: "Moody's", issuerRating: '', seniorUnsecured: '', outlook: '', updatedAt: '' },
      { agency: 'S&P', issuerRating: '', seniorUnsecured: '', outlook: '', updatedAt: '' },
      { agency: 'Fitch', issuerRating: '', seniorUnsecured: '', outlook: '', updatedAt: '' }
    ],
    details: {
      tdSic: '', industryRisk: '', security: '', ltv: 0, businessRisk: '',
      financialRisk: '', envRisk: '', countryRisk: '', governanceRisk: '', withinLimits: true
    },
    additionalComments: '',
  },
  facilityDetails: {
    summaries: [],
    tradingLines: { unhedged: 0, bond: 0, subtotal: 0, total: 0 },
    options: { instruments: '', currencies: '', lcSublimit: 0, competitiveAdvance: '' },
    rates: { margin: '', fee: '', allIn: '', upfront: '' },
    terms: { tenor: '', maturity: '', extension: '', termOut: '' },
    repayment: { amortizing: false, comments: '' },
    prepayment: { permitted: false, comments: '' },
    additionalComments: '',
  },
  documentation: {
    agreementType: '', date: '', status: '', amendments: '', comments: '',
    jurisdiction: '', waiverJuryTrial: false, negativeCovenants: '',
    positiveCovenants: '', financialCovenants: '', eventsOfDefault: '', reportingReqs: '',
    fundingConditions: '', additionalComments: '',
  },
  analysis: {
    overview: { companyDesc: '', recentEvents: '', sourcesUses: '', financingPlan: '' },
    financial: { moodyAnalysis: '', ratioAnalysis: '', capStructure: '', liquidity: '', debtMaturity: '' },
    leverage: '',
    sensitivity: { baseCase: '', downsideCase: '' },
    justification: { mraOutput: '', peerComp: '', fundamentals: '', fcf: '', recommendation: '' },
    additionalComments: '',
  },
  compliance: {
    signOff: { name: '', title: '', date: '', approver: '' },
    legal: { declarationInterest: '', directors: '', illegalTying: '' },
    additionalComments: '',
  },
  fieldSources: {}
});

export const INITIAL_DATA = getInitialData();
