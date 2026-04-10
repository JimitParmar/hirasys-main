// ==========================================
// Pipeline Node Types
// ==========================================

export type NodeCategory = "source" | "stage" | "filter" | "logic" | "action" | "exit";

export interface PipelineNodeData extends Record<string, any> {
  id: string;
  type: NodeCategory;
  subtype: string;
  label: string;
  config: Record<string, any>;
  costPerUnit: number;
  description?: string;
  icon?: string;
  color?: string;
}

// All available node subtypes
export type SourceSubtype = "job_posting" | "referral_import" | "bulk_upload";

export type StageSubtype =
  | "ai_resume_screen"
  | "coding_assessment"
  | "mcq_assessment"
  | "subjective_assessment"
  | "ai_technical_interview"
  | "ai_behavioral_interview"
  | "f2f_interview"
  | "panel_interview";

export type FilterSubtype =
  | "top_n"
  | "score_gate"
  | "percentage"
  | "multi_criteria"
  | "hybrid"
  | "human_approval"
  | "time_gate"
  | "waitlist";

export type LogicSubtype =
  | "conditional_branch"
  | "parallel_split"
  | "merge"
  | "delay";

export type ActionSubtype =
  | "send_email"
  | "notification"
  | "slack_notify"
  | "webhook"
  | "add_to_talent_pool";

export type ExitSubtype =
  | "offer"
  | "rejection"
  | "onboarding"
  | "archive";

export type NodeSubtype =
  | SourceSubtype
  | StageSubtype
  | FilterSubtype
  | LogicSubtype
  | ActionSubtype
  | ExitSubtype;

// ==========================================
// Filter Configurations
// ==========================================

export interface TopNFilterConfig {
  n: number;
  rankBy: string; // "previous_stage_score" | "resume_score" | "overall_score"
  tiebreaker?: string;
  batchMode: "all_complete" | "count_or_time";
  batchCount?: number;
  batchDays?: number;
  fastTrack?: {
    enabled: boolean;
    threshold: number;
  };
  filtered: FilteredAction;
}

export interface ScoreGateConfig {
  minScore: number;
  scoreSource: string;
  filtered: FilteredAction;
}

export interface PercentageFilterConfig {
  percentage: number;
  rankBy: string;
  minPass: number;
  maxPass: number;
  filtered: FilteredAction;
}

export interface MultiCriteriaConfig {
  mode: "all" | "any";
  rules: FilterRule[];
  filtered: FilteredAction;
}

export interface HybridFilterConfig {
  fastTrackThreshold: number;
  batchN: number;
  batchMode: "count_or_time";
  batchCount?: number;
  batchDays?: number;
  rankBy: string;
  filtered: FilteredAction;
}

export interface HumanApprovalConfig {
  approverRole: string;
  deadline: number; // days
  autoAction: "advance" | "hold";
  showData: string[]; // what to show approver
}

export interface FilterRule {
  field: string;
  operator: "gte" | "lte" | "eq" | "contains" | "in";
  value: any;
}

export interface FilteredAction {
  waitlist: boolean;
  waitlistSize?: number;
  rejectEmail: boolean;
  emailType: "ai_personalized" | "template";
  addToTalentPool: boolean;
}

// ==========================================
// Node Catalog
// ==========================================

export interface NodeCatalogItem {
  subtype: NodeSubtype;
  category: NodeCategory;
  label: string;
  description: string;
  icon: string;
  color: string;
  costPerUnit: number;
  defaultConfig: Record<string, any>;
}

export const NODE_CATALOG: NodeCatalogItem[] = [
  // Source Nodes
  {
    subtype: "job_posting",
    category: "source",
    label: "Job Posting",
    description: "Entry point — candidates apply to this job",
    icon: "Briefcase",
    color: "#10B981",
    costPerUnit: 0.50,
    defaultConfig: {},
  },

  // Stage Nodes
  {
    subtype: "ai_resume_screen",
    category: "stage",
    label: "AI Resume Screen",
    description: "AI analyzes and scores resumes against job requirements",
    icon: "FileSearch",
    color: "#3B82F6",
    costPerUnit: 0.15,
    defaultConfig: { criteria: ["skills_match", "experience", "education"] },
  },
  {
    subtype: "coding_assessment",
    category: "stage",
    label: "Coding Assessment",
    description: "Timed coding test with integrated IDE",
    icon: "Code",
    color: "#3B82F6",
    costPerUnit: 2.50,
    defaultConfig: { duration: 90, languages: ["javascript", "python","sql","typescript"], difficulty: "medium" },
  },
  {
    subtype: "mcq_assessment",
    category: "stage",
    label: "MCQ Assessment",
    description: "Multiple choice technical assessment",
    icon: "ListChecks",
    color: "#3B82F6",
    costPerUnit: 1.00,
    defaultConfig: { duration: 45, questionCount: 30 },
  },
  {
    subtype: "ai_technical_interview",
    category: "stage",
    label: "AI Technical Interview",
    description: "AI conducts adaptive technical interview",
    icon: "Bot",
    color: "#3B82F6",
    costPerUnit: 3.00,
    defaultConfig: { maxQuestions: 10, duration: 30 },
  },
  {
    subtype: "ai_behavioral_interview",
    category: "stage",
    label: "AI Behavioral Interview",
    description: "AI conducts behavioral and culture fit interview",
    icon: "MessageSquare",
    color: "#3B82F6",
    costPerUnit: 2.50,
    defaultConfig: { maxQuestions: 8, duration: 25 },
  },
  {
    subtype: "f2f_interview",
    category: "stage",
    label: "F2F Interview",
    description: "Schedule face-to-face interview with feedback form",
    icon: "Video",
    color: "#3B82F6",
    costPerUnit: 1.50,
    defaultConfig: { duration: 60, interviewType: "technical" },
  },
  {
    subtype: "panel_interview",
    category: "stage",
    label: "Panel Interview",
    description: "Multiple interviewers evaluate candidate",
    icon: "Users",
    color: "#3B82F6",
    costPerUnit: 2.00,
    defaultConfig: { panelSize: 3, duration: 60 },
  },

  // Filter Nodes (ALL FREE)
  {
    subtype: "top_n",
    category: "filter",
    label: "Top-N Filter",
    description: "Only top N candidates pass through",
    icon: "Filter",
    color: "#F59E0B",
    costPerUnit: 0,
    defaultConfig: {
      n: 50,
      rankBy: "previous_stage_score",
      batchMode: "count_or_time",
      batchCount: 100,
      batchDays: 7,
      fastTrack: { enabled: false, threshold: 90 },
      filtered: { waitlist: true, waitlistSize: 20, rejectEmail: true, emailType: "ai_personalized", addToTalentPool: false },
    },
  },
  {
    subtype: "score_gate",
    category: "filter",
    label: "Score Gate",
    description: "Only candidates scoring above threshold pass",
    icon: "Gauge",
    color: "#F59E0B",
    costPerUnit: 0,
    defaultConfig: {
      minScore: 70,
      scoreSource: "previous_stage_score",
      filtered: { waitlist: false, rejectEmail: true, emailType: "ai_personalized", addToTalentPool: false },
    },
  },
  {
    subtype: "percentage",
    category: "filter",
    label: "Top % Filter",
    description: "Top percentage of candidates pass",
    icon: "Percent",
    color: "#F59E0B",
    costPerUnit: 0,
    defaultConfig: {
      percentage: 25,
      rankBy: "previous_stage_score",
      minPass: 3,
      maxPass: 100,
      filtered: { waitlist: true, waitlistSize: 10, rejectEmail: true, emailType: "ai_personalized", addToTalentPool: false },
    },
  },
  {
    subtype: "multi_criteria",
    category: "filter",
    label: "Multi-Criteria Filter",
    description: "Filter by multiple conditions (AND/OR)",
    icon: "Settings2",
    color: "#F59E0B",
    costPerUnit: 0,
    defaultConfig: {
      mode: "all",
      rules: [],
      filtered: { waitlist: false, rejectEmail: true, emailType: "ai_personalized", addToTalentPool: false },
    },
  },
  {
    subtype: "hybrid",
    category: "filter",
    label: "Hybrid Filter",
    description: "Fast-track top performers + batch filter rest",
    icon: "Zap",
    color: "#F59E0B",
    costPerUnit: 0,
    defaultConfig: {
      fastTrackThreshold: 85,
      batchN: 40,
      batchMode: "count_or_time",
      batchCount: 100,
      batchDays: 7,
      rankBy: "previous_stage_score",
      filtered: { waitlist: true, waitlistSize: 15, rejectEmail: true, emailType: "ai_personalized", addToTalentPool: false },
    },
  },
  {
    subtype: "human_approval",
    category: "filter",
    label: "HR Approval Gate",
    description: "HR manually reviews and approves candidates",
    icon: "UserCheck",
    color: "#F59E0B",
    costPerUnit: 0,
    defaultConfig: {
      approverRole: "HR",
      deadline: 3,
      autoAction: "hold",
      showData: ["resume_score", "assessment_score", "ai_analysis"],
    },
  },
  {
    subtype: "time_gate",
    category: "filter",
    label: "Time Batch Gate",
    description: "Collect candidates for N days, then filter",
    icon: "Clock",
    color: "#F59E0B",
    costPerUnit: 0,
    defaultConfig: { waitDays: 7, thenFilter: "top_n", thenConfig: { n: 50 } },
  },
  {
    subtype: "waitlist",
    category: "filter",
    label: "Waitlist Buffer",
    description: "Hold backup candidates in reserve",
    icon: "Pause",
    color: "#F59E0B",
    costPerUnit: 0,
    defaultConfig: { capacity: 20, expireDays: 30, autoAdvance: true },
  },

  // Logic Nodes (ALL FREE)
  {
    subtype: "conditional_branch",
    category: "logic",
    label: "Conditional Branch",
    description: "Route candidates based on conditions",
    icon: "GitBranch",
    color: "#8B5CF6",
    costPerUnit: 0,
    defaultConfig: { condition: { field: "score", operator: "gte", value: 80 } },
  },
  {
    subtype: "parallel_split",
    category: "logic",
    label: "Parallel Split",
    description: "Run multiple stages simultaneously",
    icon: "Split",
    color: "#8B5CF6",
    costPerUnit: 0,
    defaultConfig: {},
  },
  {
    subtype: "merge",
    category: "logic",
    label: "Merge",
    description: "Wait for all parallel paths to complete",
    icon: "Merge",
    color: "#8B5CF6",
    costPerUnit: 0,
    defaultConfig: { waitForAll: true },
  },
  {
    subtype: "delay",
    category: "logic",
    label: "Delay Timer",
    description: "Wait N days before proceeding",
    icon: "Timer",
    color: "#8B5CF6",
    costPerUnit: 0,
    defaultConfig: { days: 1 },
  },

  // Action Nodes
  {
    subtype: "send_email",
    category: "action",
    label: "Send Email",
    description: "Send AI-personalized or template email",
    icon: "Mail",
    color: "#EF4444",
    costPerUnit: 0.05,
    defaultConfig: { emailType: "ai_personalized", template: "" },
  },
  {
    subtype: "notification",
    category: "action",
    label: "In-App Notification",
    description: "Send in-app notification to candidate or HR",
    icon: "Bell",
    color: "#EF4444",
    costPerUnit: 0,
    defaultConfig: { target: "candidate", message: "" },
  },
  {
    subtype: "webhook",
    category: "action",
    label: "Webhook",
    description: "Call external API",
    icon: "Globe",
    color: "#EF4444",
    costPerUnit: 0,
    defaultConfig: { url: "", method: "POST", headers: {} },
  },

  // Exit Nodes
  {
    subtype: "offer",
    category: "exit",
    label: "Extend Offer",
    description: "Generate and send offer to candidate",
    icon: "Award",
    color: "#EC4899",
    costPerUnit: 2.00,
    defaultConfig: {},
  },
  {
    subtype: "rejection",
    category: "exit",
    label: "Rejection + Feedback",
    description: "Reject with personalized improvement feedback",
    icon: "XCircle",
    color: "#EC4899",
    costPerUnit: 0.05,
    defaultConfig: { sendFeedback: true, addToTalentPool: false },
  },
  {
    subtype: "onboarding",
    category: "exit",
    label: "Start Onboarding",
    description: "Trigger onboarding process for hired candidate",
    icon: "Rocket",
    color: "#EC4899",
    costPerUnit: 2.00,
    defaultConfig: {},
  },
];

// ==========================================
// Cost Estimation
// ==========================================

export interface CostEstimate {
  totalCost: number;
  perHireCost: number;
  stageBreakdown: {
    nodeId: string;
    label: string;
    estimatedVolume: number;
    costPerUnit: number;
    totalCost: number;
  }[];
  savingsVsNoFilters: number;
}

// ==========================================
// Session Types
// ==========================================

export interface SessionUser {
  id: string;
  email: string;
  name: string;
  role: "ADMIN" | "HR" | "INTERVIEWER" | "CANDIDATE";
  firstName: string;
  lastName: string;
}