export type WritingCopilotSuggestions = {
  headlineIdeas: string[];
  suggestedExcerpt: string;
  seoKeywords: string[];
  callToAction: string;
  contentAngles: string[];
  toneNotes: string[];
};

export type WritingCopilotResponse = {
  message: string;
  suggestions: WritingCopilotSuggestions;
};

export type DraftPost = {
  title: string;
  excerpt: string;
  content: string;
  tags: string[];
};

export type DraftResponse = {
  message: string;
  draft: DraftPost;
};

export type ConciergeRecommendation = {
  _id: string;
  slug: string;
  title: string;
  category: string;
  excerpt: string;
  coverImageUrl: string;
  reason: string;
  takeaway: string;
};

export type ReadingConciergeResponse = {
  message: string;
  summary: string;
  nextMove: string;
  recommendations: ConciergeRecommendation[];
};

export type RepurposeAssets = {
  tldr: string;
  pullQuote: string;
  metaDescription: string;
  xThread: string[];
  linkedinPost: string;
  newsletterBlurb: string;
};

export type RepurposeResponse = {
  message: string;
  assets: RepurposeAssets;
};

export type ContrarianInsightSet = {
  coreClaim: string;
  counterpoints: string[];
  blindSpots: string[];
  skepticQuestions: string[];
  followUpAngles: string[];
};

export type ContrarianInsightsResponse = {
  message: string;
  insights: ContrarianInsightSet;
};

export type ModerationFlag = {
  label: string;
  severity: 'low' | 'medium' | 'high';
  reason: string;
};

export type ModerationReview = {
  postId: string;
  title: string;
  riskLevel: 'low' | 'medium' | 'high';
  confidence: number;
  verdict: 'approve' | 'monitor' | 'flag' | 'remove';
  summary: string;
  suggestedModeratorReason: string;
  safeRevisionHint: string;
  flags: ModerationFlag[];
};

export type ModerationReviewResponse = {
  message: string;
  review: ModerationReview;
};

export type AiFeature =
  | 'draft'
  | 'writing-copilot'
  | 'reading-concierge'
  | 'repurpose'
  | 'contrarian-insights'
  | 'moderation-review';

export type AiHistoryActor = {
  id: string;
  username: string;
  fullName: string;
  role: 'guest' | 'user' | 'admin' | 'superadmin';
};

export type AiHistoryTargetPost = {
  id: string;
  title: string;
  slug: string;
  category: string;
};

export type AiHistoryEntry = {
  _id: string;
  feature: AiFeature;
  title: string;
  inputSummary: string;
  previewText: string;
  createdAt: string;
  actor: AiHistoryActor | null;
  targetPost: AiHistoryTargetPost | null;
  output:
    | DraftResponse
    | WritingCopilotResponse
    | ReadingConciergeResponse
    | RepurposeResponse
    | ContrarianInsightsResponse
    | ModerationReviewResponse
    | null;
};

export type AiHistoryResponse = {
  message: string;
  history: AiHistoryEntry[];
};

export const AI_FEATURE_LABELS: Record<AiFeature, string> = {
  draft: 'Draft Assistant',
  'writing-copilot': 'Writing Copilot',
  'reading-concierge': 'Reading Concierge',
  repurpose: 'Repurpose Engine',
  'contrarian-insights': 'Contrarian Insight Mode',
  'moderation-review': 'Moderation Copilot',
};

const READING_HISTORY_KEY = 'batblogs_reading_history';

export const getReadingHistory = () => {
  if (typeof window === 'undefined') {
    return [] as string[];
  }

  try {
    const raw = window.localStorage.getItem(READING_HISTORY_KEY);
    const parsed = raw ? (JSON.parse(raw) as string[]) : [];
    return Array.isArray(parsed) ? parsed.filter(Boolean).slice(0, 6) : [];
  } catch {
    return [] as string[];
  }
};

export const trackReadPost = (slug: string) => {
  if (!slug || typeof window === 'undefined') {
    return;
  }

  const nextHistory = [slug, ...getReadingHistory().filter((item) => item !== slug)].slice(0, 6);
  window.localStorage.setItem(READING_HISTORY_KEY, JSON.stringify(nextHistory));
};

export const copyTextToClipboard = async (value: string) => {
  const text = String(value || '').trim();

  if (!text || typeof window === 'undefined') {
    return false;
  }

  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return true;
  }

  const textArea = document.createElement('textarea');
  textArea.value = text;
  textArea.setAttribute('readonly', 'true');
  textArea.style.position = 'absolute';
  textArea.style.left = '-9999px';
  document.body.appendChild(textArea);
  textArea.select();

  const copied = document.execCommand('copy');
  document.body.removeChild(textArea);
  return copied;
};