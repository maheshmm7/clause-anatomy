import { z } from 'zod';
import { EXPLANATION_LANGUAGES } from './languages.js';
import { LIMITS, UPLOAD_MIME_TYPES } from './limits.js';

// No runtime code generation: Zod's JIT probes `new Function`, which the app's strict
// Content-Security-Policy (script-src 'self', no 'unsafe-eval') rightly blocks.
z.config({ jitless: true });

/* -------------------------------------------------------------------------- */
/*  AI output schemas                                                          */
/*  These double as the JSON Schema that constrains Gemini's structured output */
/*  (see server/ai/geminiSchema.ts) and as the runtime validator of its reply. */
/*  String lengths are enforced by truncation after parsing (server/services/ */
/*  postprocess.ts) because Gemini does not support `maxLength`.             */
/* -------------------------------------------------------------------------- */

export const partySchema = z.object({
  id: z.string().describe('Short lowercase id, e.g. "tenant", "landlord", "sender", "recipient".'),
  name: z
    .string()
    .describe('How the paper names this party, e.g. "Lessee (Ravi Kumar)". Keep hidden markers.'),
  role: z.string().describe('Plain everyday role, e.g. "Tenant", "Landlord", "Employer".'),
});

export const termSchema = z.object({
  term: z.string().describe('The legal word or section exactly as written in the paper.'),
  meaning: z.string().describe('What it means here, in one short plain sentence.'),
  source: z
    .enum(['document', 'general'])
    .describe(
      '"document" if the meaning comes from the paper itself; "general" if it is general legal knowledge (e.g. what an Act section usually says).',
    ),
});

export const ruleSchema = z.object({
  partyId: z.string().describe('Id of the party this rule applies to.'),
  type: z.enum(['must', 'mustNot', 'may']).describe('Duty, prohibition, or permission.'),
  action: z.string().describe('What they must / must not / may do, in plain words.'),
});

export const teachBackSchema = z.object({
  question: z
    .string()
    .describe(
      'A short real-life situation question answerable with Yes or No, testing whether the reader understood this point.',
    ),
  answer: z.enum(['yes', 'no']),
  explanation: z.string().describe('Why, in one or two short sentences, naming the point.'),
});

export const pointSchema = z.object({
  id: z.string().describe('Unique id: "p1", "p2", ...'),
  title: z.string().describe('3-8 word plain title, e.g. "Renting the flat to someone else".'),
  sourceLabel: z
    .string()
    .describe(
      'Clause/section label as printed, e.g. "Clause 9" or "Para 3". Empty string if none.',
    ),
  quote: z
    .string()
    .describe(
      'EXACT, verbatim excerpt (15-300 characters) copied from the paper in its ORIGINAL language that supports this point. Never paraphrase or translate.',
    ),
  simple: z
    .string()
    .describe('ONE short sentence (max 20 words) with only the most important thing.'),
  detailed: z
    .string()
    .describe(
      '2-4 sentences that ADD what "simple" leaves out: exact amounts, dates, deadlines, conditions, exceptions and what happens if the rule is broken. Never repeats "simple".',
    ),
  importance: z.enum(['high', 'medium', 'low']),
  favours: z.string().describe('Party id this point mainly benefits, or "both", or "neutral".'),
  rules: z.array(ruleSchema).max(6),
  conditions: z
    .array(z.string())
    .max(4)
    .describe('"Unless" / "only if" conditions and exceptions, in plain words.'),
  consequences: z
    .array(z.string())
    .max(4)
    .describe('What happens if the rule is broken, in plain words.'),
  relatedPointIds: z
    .array(z.string())
    .max(4)
    .describe('Ids of other points this one refers to, overrides, or depends on.'),
  deadline: z.string().describe('Any time limit in plain words, or empty string.'),
  terms: z.array(termSchema).max(5),
  check: teachBackSchema.optional(),
});

export const keyDateSchema = z.object({
  date: z.string().describe('Calendar date in YYYY-MM-DD. Only include dates written in full.'),
  label: z.string().describe('What happens on this date, in plain words.'),
  pointId: z.string().describe('Related point id, or empty string.'),
});

export const scenarioNodeSchema = z.object({
  id: z.string().describe('Unique id like "q1".'),
  question: z.string().describe("A Yes/No question about the reader's situation."),
  yes: z.string().describe('Id of the next question or outcome if Yes.'),
  no: z.string().describe('Id of the next question or outcome if No.'),
  pointIds: z.array(z.string()).max(3),
});

export const scenarioOutcomeSchema = z.object({
  id: z.string().describe('Unique id like "o1".'),
  text: z.string().describe('What the paper says happens in this case, in 1-3 plain sentences.'),
  tone: z.enum(['good', 'caution', 'bad']),
  pointIds: z.array(z.string()).max(3),
});

export const scenarioSchema = z.object({
  id: z.string(),
  title: z
    .string()
    .describe('A common "What if…?" question, e.g. "What if I want to leave early?"'),
  startId: z.string(),
  nodes: z.array(scenarioNodeSchema).max(6),
  outcomes: z.array(scenarioOutcomeSchema).max(8),
});

export const noticeSummarySchema = z.object({
  sender: z.string(),
  claim: z.string().describe('What the sender says happened.'),
  demand: z.string().describe('What the sender wants the reader to do.'),
  deadline: z.string().describe('By when, in plain words, or empty string.'),
  ifIgnored: z.string().describe('What the sender says will happen if ignored.'),
});

export const DOCUMENT_CATEGORIES = [
  'contract',
  'notice',
  'court',
  'policy',
  'other-legal',
  'not-legal',
] as const;

export const analysisSchema = z.object({
  category: z
    .enum(DOCUMENT_CATEGORIES)
    .describe(
      'contract = agreements/offer letters/loans; notice = legal or demand notices, bank or government letters; court = summons, orders, FIRs, judgments; policy = terms of service, privacy or insurance policies; other-legal; not-legal.',
    ),
  documentType: z.string().describe('Plain name, e.g. "Rent agreement", "Cheque bounce notice".'),
  summary: z
    .string()
    .describe('What this paper is and what it means for the reader, in 1-2 short sentences.'),
  parties: z.array(partySchema).max(6),
  urgency: z.object({
    level: z.enum(['none', 'soon', 'urgent']),
    reason: z.string().describe('Why, in one plain sentence, or empty string.'),
  }),
  notice: noticeSummarySchema.optional().describe('Only for notices and court papers.'),
  points: z.array(pointSchema).max(15),
  keyDates: z.array(keyDateSchema).max(10),
  scenarios: z.array(scenarioSchema).max(3),
  lawyerQuestions: z
    .array(z.string())
    .max(6)
    .describe('Useful questions the reader could ask a lawyer about this paper.'),
});

export const extractionSchema = z.object({
  quality: z
    .enum(['clear', 'partial', 'unreadable'])
    .describe(
      'clear = all text readable; partial = some parts unreadable; unreadable = cannot read.',
    ),
  text: z
    .string()
    .describe(
      'The full text of the paper, transcribed exactly in its original language. Empty if unreadable.',
    ),
});

export const answerSchema = z.object({
  basis: z
    .enum(['document', 'general', 'none'])
    .describe(
      '"document" if the paper answers it; "general" if only general legal information applies; "none" if it cannot be answered.',
    ),
  answer: z.string().describe('Plain-language answer in 1-4 short sentences.'),
  quotes: z
    .array(z.string())
    .max(3)
    .describe(
      'Exact verbatim excerpts from the paper supporting the answer, in its original language.',
    ),
});

export type Party = z.infer<typeof partySchema>;
export type Term = z.infer<typeof termSchema>;
export type Rule = z.infer<typeof ruleSchema>;
export type TeachBack = z.infer<typeof teachBackSchema>;
export type Point = z.infer<typeof pointSchema>;
export type KeyDate = z.infer<typeof keyDateSchema>;
export type ScenarioNode = z.infer<typeof scenarioNodeSchema>;
export type ScenarioOutcome = z.infer<typeof scenarioOutcomeSchema>;
export type Scenario = z.infer<typeof scenarioSchema>;
export type NoticeSummary = z.infer<typeof noticeSummarySchema>;
export type DocumentCategory = (typeof DOCUMENT_CATEGORIES)[number];
export type Analysis = z.infer<typeof analysisSchema>;
export type Extraction = z.infer<typeof extractionSchema>;
export type ModelAnswer = z.infer<typeof answerSchema>;

/* -------------------------------------------------------------------------- */
/*  API contracts                                                              */
/* -------------------------------------------------------------------------- */

const languageSchema = z.enum(EXPLANATION_LANGUAGES);

const documentTextSchema = z
  .string()
  .trim()
  .min(LIMITS.minDocumentChars)
  .max(LIMITS.maxDocumentChars);

export const analyzeRequestSchema = z.strictObject({
  text: documentTextSchema,
  language: languageSchema,
});

export const askRequestSchema = z.strictObject({
  text: documentTextSchema,
  question: z.string().trim().min(LIMITS.minQuestionChars).max(LIMITS.maxQuestionChars),
  language: languageSchema,
});

export const extractRequestSchema = z.strictObject({
  mimeType: z.enum(UPLOAD_MIME_TYPES),
  data: z
    .string()
    .min(16)
    .max(LIMITS.maxUploadBase64Chars)
    .regex(/^[A-Za-z0-9+/]+={0,2}$/, 'data must be base64'),
});

/**
 * Translating an explanation that was already written: only its plain-language texts
 * travel (never the paper), each with a stable id so the result maps back exactly.
 */
const translateItemSchema = z.strictObject({
  id: z.string().regex(/^[A-Za-z0-9._-]{1,80}$/, 'id must be a simple path'),
  text: z.string().max(LIMITS.maxTranslateItemChars),
});

export const translateRequestSchema = z
  .strictObject({
    language: languageSchema,
    items: z.array(translateItemSchema).min(1).max(LIMITS.maxTranslateItems),
  })
  .refine(
    (request) => new Set(request.items.map((item) => item.id)).size === request.items.length,
    {
      message: 'item ids must be unique',
    },
  )
  .refine(
    (request) =>
      request.items.reduce((total, item) => total + item.text.length, 0) <=
      LIMITS.maxTranslateTotalChars,
    { message: 'too much text to translate' },
  );

/** What the model returns when translating (validated again before use). */
export const translationSchema = z.object({
  items: z
    .array(
      z.object({
        id: z.string().describe('The id of the input text, unchanged.'),
        text: z.string().describe('The translated text.'),
      }),
    )
    .describe('Every input text, translated, each id exactly once.'),
});

export const translateResultSchema = z.object({
  items: z.array(z.object({ id: z.string(), text: z.string() })),
});

export type TranslateRequest = z.infer<typeof translateRequestSchema>;
export type TranslateResult = z.infer<typeof translateResultSchema>;
export type AnalyzeRequest = z.infer<typeof analyzeRequestSchema>;
export type AskRequest = z.infer<typeof askRequestSchema>;
export type ExtractRequest = z.infer<typeof extractRequestSchema>;

/** A point after server-side grounding checks. */
export const verifiedPointSchema = pointSchema.extend({
  verified: z.boolean(),
});

export const analysisResultSchema = analysisSchema.extend({
  points: z.array(verifiedPointSchema),
  language: languageSchema,
});

export const extractResultSchema = extractionSchema;

export const answerResultSchema = z.object({
  basis: z.enum(['document', 'general', 'none']),
  answer: z.string(),
  quotes: z.array(z.object({ text: z.string(), verified: z.boolean() })),
});

export type VerifiedPoint = z.infer<typeof verifiedPointSchema>;
export type AnalysisResult = z.infer<typeof analysisResultSchema>;
export type ExtractResult = z.infer<typeof extractResultSchema>;
export type AnswerResult = z.infer<typeof answerResultSchema>;

export const API_ERROR_CODES = [
  'invalid_input',
  'payload_too_large',
  'unsupported_file',
  'rate_limited',
  'ai_unavailable',
  'ai_busy',
  'ai_bad_response',
  'ai_key_invalid',
  'forbidden',
  'not_found',
  'internal',
] as const;
export type ApiErrorCode = (typeof API_ERROR_CODES)[number];

export const apiErrorSchema = z.object({
  error: z.object({
    code: z.enum(API_ERROR_CODES),
    message: z.string(),
  }),
});
export type ApiErrorBody = z.infer<typeof apiErrorSchema>;

export const healthSchema = z.object({
  status: z.literal('ok'),
  aiAvailable: z.boolean(),
});
export type HealthResult = z.infer<typeof healthSchema>;
