
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
  { id: 'document_preview', label: 'Final credit memo initial draft', icon: '👀', category: 'Review' },
  { id: 'executive_credit_memo', label: 'Executive Credit Memo', icon: '👑', category: 'Review' }
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
    tdsLeveragedLoan: false,
    regulatoryLeveragedLoan: false,
    highLeverageLoan: false,
    leveragePolicyRoom: true,
    extremeLeverage: false,
    hrslSubLimit: false,
    cmtStrategicLimit: false,
    esgStrategicLimit: false,
    euroInfraLimit: false,
    highRiskAccount: false,
    spotlightAccount: false,
    seaScore: '',
    additionalComments: '',
    sectionImages: [],
  },
  purpose: {
    businessPurpose: '',
    adjudicationConsiderations: '',
    annualReviewStatus: '',
    reviewPurpose: {
      newFacilities: false,
      // Removed space to match interface
      financialCovenants: false,
      maturityDates: false,
    },
    sponsorPurchase: '',
    arrangers: '',
    syndicatedFacilities: '',
    fundingMix: '',
    additionalComments: '',
    sectionImages: [],
  },
  creditPosition: {
    previousAuthorization: 0,
    presentPosition: 0,
    creditRequested: 0,
    committedOverOneYear: 0,
    totalExcludingTrading: 0,
    tradingLine: 0,
    warehouseRequest: 'N/A',
    // Removed space to match interface
    holdCommitment: 'N/A',
    subgroup: 'N/A',
    groupExposureStatus: 'Within guidelines',
    underwritingCommitment: '',
    timeToZeroHold: '',
    additionalComments: '',
    sectionImages: [],
  },
  groupExposure: [],
  financialInfo: {
    covenants: [],
    raroc: { lccStatus: '', economicRaroc: 0, relationshipRaroc: 0, creditOnlyRaroc: 0, economicCapital: 0 },
    additionalComments: '',
    sectionImages: [],
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
      proposedFrr: '',
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
    sectionImages: [],
  },
  facilityDetails: {
    summaries: [],
    tradingLines: { unhedged: 0, bond: 0, subtotal: 0, total: 0 },
    options: { instruments: '', currencies: '', lcSublimit: 0, competitiveAdvance: '' },
    rates: { margin: '', fee: '', allIn: '', upfront: '', underwritingFee: '', commitmentFee: '', undrawnFee: '' },
    terms: { tenor: '', maturity: '', extension: '', termOut: '', repaymentAnalysis: '', achievabilityTime: '' },
    repayment: { amortizing: false, comments: '' },
    prepayment: { permitted: false, comments: '' },
    additionalComments: '',
    sectionImages: [],
  },
  documentation: {
    agreementType: '', date: '', status: '', amendments: '', comments: '',
    jurisdiction: '', waiverJuryTrial: false, negativeCovenants: '',
    positiveCovenants: '', financialCovenants: '', eventsOfDefault: '', reportingReqs: '',
    fundingConditions: '', jCrewProvisions: 'N/A', subordinationRisk: '', additionalComments: '',
    sectionImages: [],
  },
  analysis: {
    overview: { 
      companyDesc: '', recentEvents: '', sourcesUses: '', financingPlan: '', segments: '', geography: '', 
      sponsorOverview: '', industryProfile: '', ltmMetrics: '' 
    },
    financial: { moodyAnalysis: '', ratioAnalysis: '', capStructure: '', liquidity: '', debtMaturity: '', operatingCosts: '' },
    leverage: '',
    valuation: { approach: '', multiples: '', reserves: '', peerComp: '' },
    sensitivity: { baseCase: '', downsideCase: '', assumptions: '' },
    justification: { mraOutput: '', peerComp: '', fundamentals: '', fcf: '', recommendation: '', mdComments: '', executivesSupporting: '' },
    additionalComments: '',
    sectionImages: [],
  },
  compliance: {
    signOff: { name: '', title: '', date: '', approver: '' },
    legal: { declarationInterest: '', directors: '', illegalTying: '' },
    additionalComments: '',
    sectionImages: [],
  },
  fieldSources: {}
});

export const INITIAL_DATA = getInitialData();
