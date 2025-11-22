
export interface StrengthWeakness {
  point: string;
  explanation: string;
}

export interface CareerPath {
  role: string;
  matchPercentage: number;
  reasoning: string;
}

export interface AnalysisResult {
  summary: string;
  atsScore: number;
  strengths: StrengthWeakness[];
  weaknesses: StrengthWeakness[];
  suggestedRoles: CareerPath[];
}

export interface Suggestion {
  originalText: string;
  suggestedChange: string;
  explanation: string;
}

export interface ResumeSuggestionsResult {
  suggestions: Suggestion[];
}

export interface UpdatedAtsScoreResult {
    atsScore: number;
}

export interface RoadmapStep {
  stage: string;
  description: string;
  skillsToLearn: string[];
  projectIdeas: string[];
  resources: string[];
}

export interface RoadmapResult {
  roadmap: RoadmapStep[];
}

export interface InterviewTurn {
  speaker: 'user' | 'model';
  text: string;
}

export interface InterviewFeedback {
  clarityScore: number;
  clarityFeedback: string;
  relevanceScore: number;
  relevanceFeedback: string;
  confidenceScore: number;
  confidenceFeedback: string;
  overallFeedback: string;
  exampleImprovements: Array<{
    userAnswer: string;
    suggestion: string;
  }>;
  starMethodAdherence: {
    score: number;
    feedback: string;
  };
  relevantKeywordsUsed: string[];
  fillerWordCount: number;
  sentiment: 'Positive' | 'Neutral' | 'Negative';
}

export interface InterviewReportResult {
  feedback: InterviewFeedback;
}

export interface JobListing {
  title: string;
  company: string;
  location: string;
  description: string;
  url: string;
}

export interface GroundingChunk {
  web?: {
    uri: string;
    title: string;
  };
}

export type ApplicationStatus = 'Saved' | 'Applied' | 'Interviewing' | 'Offer Received';

export interface TrackedJob extends JobListing {
  id: string;
  status: ApplicationStatus;
  applicationDate?: string;
  notes?: string;
}

export interface ExperienceEntry {
  company: string;
  role: string;
  dates: string;
  description: string[];
}

export interface EducationEntry {
  institution: string;
  degree: string;
  dates: string;
}

export interface StructuredResume {
  name: string;
  email: string;
  phone: string;
  linkedin?: string;
  summary: string;
  experience: ExperienceEntry[];
  education: EducationEntry[];
  skills: string[];
}

export type MessageGoal = 'Informational Interview' | 'Referral Request' | 'General Networking';

export interface LinkedInConnection {
  name: string;
  title: string;
  linkedinUrl: string;
}

export interface LinkedInConnectionsResult {
  connections: LinkedInConnection[];
}

export interface TrajectoryStep {
  role: string;
  duration: string;
  keyResponsibilities: string[];
  skillsToAcquire: string[];
  suggestedResources: Array<{ name: string; url: string; }>;
}

export interface CareerTrajectoryResult {
  trajectory: TrajectoryStep[];
}

export interface SkillGap {
  skill: string;
  reason: string;
}

export interface ActionStep {
  skillGap: string;
  suggestion: string;
}

export interface JobFitAnalysisResult {
  fitScore: number;
  matchingSkills: string[];
  skillGaps: SkillGap[];
  actionableSteps: ActionStep[];
  overallVerdict: string;
}

export interface SuggestedNextStep {
  suggestion: string;
  targetTab: 'analysis' | 'jobs' | 'trajectory' | 'editor' | 'linkedin' | 'video' | 'vibe';
}

export interface LinkedInOptimizationResult {
  optimizedHeadline: string;
  optimizedAbout: string;
  keyImprovements: string[];
}

export interface VideoPitchFeedback {
  speechClarity: { score: number; feedback: string; };
  pacing: { score: number; feedback: string; };
  bodyLanguage: { score: number; feedback: string; };
  eyeContact: { score: number; feedback: string; };
  professionalism: { score: number; feedback: string; };
  overallFeedback: string;
  actionableImprovements: string[];
}

export interface UserVibeProfile {
  pace: 'Fast-paced & Dynamic' | 'Steady & Predictable';
  collaboration: 'Highly Collaborative' | 'Independent & Focused';
  structure: 'Structured & Hierarchical' | 'Flat & Autonomous';
  feedback: 'Direct & Frequent' | 'Indirect & Formal';
}

export interface CompanyVibe {
  pace: string;
  collaboration: string;
  structure: string;
  workLifeBalance: string;
  keywords: string[];
}

export interface CompanyVibeAnalysisResult {
  vibeFitScore: number;
  vibeSummary: string;
  matchReasoning: string;
  companyVibe: CompanyVibe;
}