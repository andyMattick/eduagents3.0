import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import type { Plugin } from 'vite'
import tsconfigPaths from 'vite-tsconfig-paths'

async function readJsonBody(req: NodeJS.ReadableStream): Promise<any> {
  const chunks: Buffer[] = []

  await new Promise<void>((resolve, reject) => {
    req.on('data', (chunk: Buffer) => chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)))
    req.on('end', resolve)
    req.on('error', reject)
  })

  const raw = Buffer.concat(chunks).toString() || '{}'
  return JSON.parse(raw)
}

function setApiCors(res: any, methods: string) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', methods)
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
}

function sendJson(res: any, statusCode: number, payload: unknown) {
  res.writeHead(statusCode, { 'Content-Type': 'application/json' })
  res.end(JSON.stringify(payload))
}

async function readTextBody(req: NodeJS.ReadableStream): Promise<string> {
  const chunks: Buffer[] = []

  await new Promise<void>((resolve, reject) => {
    req.on('data', (chunk: Buffer) => chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)))
    req.on('end', resolve)
    req.on('error', reject)
  })
//
  return Buffer.concat(chunks).toString()
}

function appendQueryValue(target: Record<string, string | string[]>, key: string, value: string) {
  const current = target[key]

  if (typeof current === 'undefined') {
    target[key] = value
    return
  }

  if (Array.isArray(current)) {
    current.push(value)
    target[key] = current
    return
  }

  target[key] = [current, value]
}

function createLocalQuery(url: URL, extra: Record<string, string> = {}) {
  const query: Record<string, string | string[]> = {}

  url.searchParams.forEach((value, key) => {
    appendQueryValue(query, key, value)
  })

  Object.entries(extra).forEach(([key, value]) => {
    appendQueryValue(query, key, value)
  })

  return query
}

function createLocalVercelResponse(res: any) {
  const response = res

  response.status = (code: number) => {
    res.statusCode = code
    return response
  }

  response.json = (payload: unknown) => {
    if (!res.getHeader('Content-Type')) {
      res.setHeader('Content-Type', 'application/json')
    }
    res.end(JSON.stringify(payload))
    return response
  }

  response.send = (payload: unknown) => {
    if (typeof payload === 'object' && payload !== null && !Buffer.isBuffer(payload)) {
      return response.json(payload)
    }
    res.end(payload)
    return response
  }

  return response
}

type LocalApiRoute = {
  pattern: RegExp
  modulePath: string
  queryFromMatch?: (match: RegExpMatchArray) => Record<string, string>
  readRawBody?: boolean
}

const localPrismRoutes: LocalApiRoute[] = [
  { pattern: /^\/documents\/upload$/, modulePath: '/api/v4/documents/upload.ts', readRawBody: true },
  { pattern: /^\/documents\/session$/, modulePath: '/api/v4/documents/session.ts' },
  { pattern: /^\/documents\/session-analysis$/, modulePath: '/api/v4/documents/session-analysis.ts' },
  {
    pattern: /^\/documents\/session\/([^/]+)\/analysis$/,
    modulePath: '/api/v4/documents/session/[sessionId]/analysis.ts',
    queryFromMatch: (match) => ({ sessionId: decodeURIComponent(match[1] ?? '') }),
  },
  { pattern: /^\/documents\/intent$/, modulePath: '/api/v4/documents/intent.ts' },
  { pattern: /^\/documents\/analyze$/, modulePath: '/api/v4/documents/analyze.ts' },
  { pattern: /^\/documents\/status$/, modulePath: '/api/v4/documents/status.ts' },
  { pattern: /^\/sessions\/assessment-preview$/, modulePath: '/api/v4/sessions/assessment-preview.ts' },
  { pattern: /^\/sessions\/builder-plan$/, modulePath: '/api/v4/sessions/builder-plan.ts' },
  { pattern: /^\/sessions\/blueprint$/, modulePath: '/api/v4/sessions/blueprint.ts' },
  {
    pattern: /^\/sessions\/([^/]+)\/assessment-preview$/,
    modulePath: '/api/v4/sessions/assessment-preview.ts',
    queryFromMatch: (match) => ({ sessionId: decodeURIComponent(match[1] ?? '') }),
  },
  {
    pattern: /^\/sessions\/([^/]+)\/builder-plan$/,
    modulePath: '/api/v4/sessions/builder-plan.ts',
    queryFromMatch: (match) => ({ sessionId: decodeURIComponent(match[1] ?? '') }),
  },
  {
    pattern: /^\/sessions\/([^/]+)\/blueprint$/,
    modulePath: '/api/v4/sessions/blueprint.ts',
    queryFromMatch: (match) => ({ sessionId: decodeURIComponent(match[1] ?? '') }),
  },
  {
    pattern: /^\/students\/([^/]+)\/performance$/,
    modulePath: '/api/v4/students/[studentId]/performance.ts',
    queryFromMatch: (match) => ({ studentId: decodeURIComponent(match[1] ?? '') }),
  },
  {
    pattern: /^\/teachers\/([^/]+)\/fingerprint$/,
    modulePath: '/api/v4/teachers/[teacherId]/fingerprint.ts',
    queryFromMatch: (match) => ({ teacherId: decodeURIComponent(match[1] ?? '') }),
  },
  {
    pattern: /^\/classes\/([^/]+)\/performance$/,
    modulePath: '/api/v4/classes/[classId]/performance.ts',
    queryFromMatch: (match) => ({ classId: decodeURIComponent(match[1] ?? '') }),
  },
  {
    pattern: /^\/classes\/([^/]+)\/differentiated-build$/,
    modulePath: '/api/v4/classes/[classId]/differentiated-build.ts',
    queryFromMatch: (match) => ({ classId: decodeURIComponent(match[1] ?? '') }),
  },
  { pattern: /^\/narrate-problem$/, modulePath: '/api/v4/narrate-problem.ts' },
  { pattern: /^\/teacher-feedback\/templates$/, modulePath: '/api/v4/teacher-feedback/templates.ts' },
  { pattern: /^\/teacher-feedback\/assessment-blueprint$/, modulePath: '/api/v4/teacher-feedback/assessment-blueprint.ts' },
  { pattern: /^\/teacher-feedback\/concept-verification-preview$/, modulePath: '/api/v4/teacher-feedback/concept-verification-preview.ts' },
  { pattern: /^\/teacher-feedback\/regenerate-item$/, modulePath: '/api/v4/teacher-feedback/regenerate-item.ts' },
  { pattern: /^\/teacher-feedback\/regenerate-section$/, modulePath: '/api/v4/teacher-feedback/regenerate-section.ts' },
  { pattern: /^\/teacher-feedback\/learning$/, modulePath: '/api/v4/teacher-feedback/learning.ts' },
  {
    pattern: /^\/teacher-feedback\/([^/]+)$/,
    modulePath: '/api/v4/teacher-feedback/[canonicalProblemId].ts',
    queryFromMatch: (match) => ({ canonicalProblemId: decodeURIComponent(match[1] ?? '') }),
  },
  { pattern: /^\/teacher-feedback$/, modulePath: '/api/v4/teacher-feedback.ts' },
  {
    pattern: /^\/problem-overrides\/([^/]+)$/,
    modulePath: '/api/v4/problem-overrides/[canonicalProblemId].ts',
    queryFromMatch: (match) => ({ canonicalProblemId: decodeURIComponent(match[1] ?? '') }),
  },
  { pattern: /^\/student-performance\/ingestAssessment$/, modulePath: '/api/v4/student-performance/ingestAssessment.ts' },
  { pattern: /^\/student-portal\/documents\/submit$/, modulePath: '/api/v4/student-portal/documents/submit.ts' },
  // ── Studio routes ──────────────────────────────────────────────────────────
  {
    pattern: /^\/studio\/sessions\/([^/]+)$/,
    modulePath: '/api/v4/studio/sessions/[sessionId].ts',
    queryFromMatch: (match) => ({ sessionId: decodeURIComponent(match[1] ?? '') }),
  },
  {
    pattern: /^\/studio\/sessions\/([^/]+)\/analysis$/,
    modulePath: '/api/v4/studio/sessions/[sessionId]/analysis.ts',
    queryFromMatch: (match) => ({ sessionId: decodeURIComponent(match[1] ?? '') }),
  },
  {
    pattern: /^\/studio\/sessions\/([^/]+)\/blueprints$/,
    modulePath: '/api/v4/studio/sessions/[sessionId]/blueprints.ts',
    queryFromMatch: (match) => ({ sessionId: decodeURIComponent(match[1] ?? '') }),
  },
  {
    pattern: /^\/studio\/sessions\/([^/]+)\/active-blueprint$/,
    modulePath: '/api/v4/studio/sessions/[sessionId]/active-blueprint.ts',
    queryFromMatch: (match) => ({ sessionId: decodeURIComponent(match[1] ?? '') }),
  },
  {
    pattern: /^\/studio\/sessions\/([^/]+)\/outputs$/,
    modulePath: '/api/v4/studio/sessions/[sessionId]/outputs.ts',
    queryFromMatch: (match) => ({ sessionId: decodeURIComponent(match[1] ?? '') }),
  },
  {
    pattern: /^\/studio\/blueprints\/([^/]+)\/versions\/([^/]+)$/,
    modulePath: '/api/v4/studio/blueprints/[blueprintId]/versions/[version].ts',
    queryFromMatch: (match) => ({ blueprintId: decodeURIComponent(match[1] ?? ''), version: decodeURIComponent(match[2] ?? '') }),
  },
  {
    pattern: /^\/studio\/blueprints\/([^/]+)\/versions$/,
    modulePath: '/api/v4/studio/blueprints/[blueprintId]/versions.ts',
    queryFromMatch: (match) => ({ blueprintId: decodeURIComponent(match[1] ?? '') }),
  },
  {
    pattern: /^\/studio\/blueprints\/([^/]+)\/outputs\/assessment$/,
    modulePath: '/api/v4/studio/blueprints/[blueprintId]/outputs/assessment.ts',
    queryFromMatch: (match) => ({ blueprintId: decodeURIComponent(match[1] ?? '') }),
  },
  {
    pattern: /^\/studio\/blueprints\/([^/]+)$/,
    modulePath: '/api/v4/studio/blueprints/[blueprintId].ts',
    queryFromMatch: (match) => ({ blueprintId: decodeURIComponent(match[1] ?? '') }),
  },
  {
    pattern: /^\/studio\/outputs\/([^/]+)\/items\/([^/]+)\/rewrite$/,
    modulePath: '/api/v4/studio/outputs/[outputId]/items/[itemId]/rewrite.ts',
    queryFromMatch: (match) => ({ outputId: decodeURIComponent(match[1] ?? ''), itemId: decodeURIComponent(match[2] ?? '') }),
  },
  {
    pattern: /^\/studio\/outputs\/([^/]+)\/items\/([^/]+)\/replace$/,
    modulePath: '/api/v4/studio/outputs/[outputId]/items/[itemId]/replace.ts',
    queryFromMatch: (match) => ({ outputId: decodeURIComponent(match[1] ?? ''), itemId: decodeURIComponent(match[2] ?? '') }),
  },
  {
    pattern: /^\/studio\/outputs\/([^/]+)$/,
    modulePath: '/api/v4/studio/outputs/[outputId].ts',
    queryFromMatch: (match) => ({ outputId: decodeURIComponent(match[1] ?? '') }),
  },
  { pattern: /^\/studio\/generateItems$/, modulePath: '/api/v4/studio/generateItems.ts' },
  { pattern: /^\/simulator\/single$/, modulePath: '/api/v4/simulator/single.ts' },
  { pattern: /^\/preparedness$/, modulePath: '/api/v4/preparedness.ts' },
  { pattern: /^\/simulator\/multi$/, modulePath: '/api/v4/simulator/multi.ts' },
  { pattern: /^\/simulator\/generate-test$/, modulePath: '/api/v4/simulator/generate-test.ts' },
  { pattern: /^\/rewrite$/, modulePath: '/api/v4/rewrite/index.ts' },
  { pattern: /^\/usage\/today$/, modulePath: '/api/v4/usage/today.ts' },
]

const localApiRoutes: LocalApiRoute[] = [
  { pattern: /^\/rewrite$/, modulePath: '/api/rewrite/index.ts' },
  { pattern: /^\/rewrite\/report-bad$/, modulePath: '/api/rewrite/report-bad.ts' },
]

async function invokeLocalApiRoute(server: any, req: any, res: any, route: LocalApiRoute, url: URL, match: RegExpMatchArray) {
  const mod = await server.ssrLoadModule(route.modulePath)
  const handler = mod?.default

  if (typeof handler !== 'function') {
    throw new Error(`No default handler exported from ${route.modulePath}`)
  }

  req.query = createLocalQuery(url, route.queryFromMatch?.(match) ?? {})

  if (!route.readRawBody && req.method && !['GET', 'HEAD', 'OPTIONS'].includes(req.method) && typeof req.body === 'undefined') {
    req.body = await readTextBody(req)
  }

  return handler(req, createLocalVercelResponse(res))
}

/**
 * Local dev middleware — serves /api/llm so `npm run dev` works without
 * Vercel CLI. In production, the real Vercel serverless function takes over.
 *
 * Security note: GEMINI_API_KEY is read by the Vite Node.js process and
 * is NEVER sent to the browser — it stays server-side even locally.
 */
function localLLMProxy(geminiApiKey: string): Plugin {
  return {
    name: 'local-llm-proxy',
    configureServer(server) {
      server.middlewares.use('/api/llm', async (req, res) => {
        if (req.method === 'OPTIONS') {
          res.writeHead(200, {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization',
          });
          res.end();
          return;
        }

        if (req.method !== 'POST') {
          res.writeHead(405, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Method not allowed' }));
          return;
        }

        if (!geminiApiKey) {
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'GEMINI_API_KEY not set in .env.local' }));
          return;
        }

        try {
          // Read request body
          const chunks: Buffer[] = [];
          await new Promise<void>((resolve, reject) => {
            req.on('data', (chunk: Buffer) => chunks.push(chunk));
            req.on('end', resolve);
            req.on('error', reject);
          });
          const body = JSON.parse(Buffer.concat(chunks).toString());
          const { model, prompt, temperature = 0.2, maxOutputTokens = 4096 } = body;

          if (!model || !prompt) {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Missing required fields: model, prompt' }));
            return;
          }

          // Call Gemini REST API from the Node.js process (key never reaches browser)
          const geminiRes = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${geminiApiKey}`,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                contents: [{ role: 'user', parts: [{ text: prompt }] }],
                generationConfig: { temperature, maxOutputTokens },
              }),
            }
          );

          if (!geminiRes.ok) {
            const err = await geminiRes.text();
            console.error('[local-llm-proxy] Gemini error:', geminiRes.status, err);
            res.writeHead(502, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: `Gemini returned ${geminiRes.status}` }));
            return;
          }

          const data = await geminiRes.json() as any;
          const text = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? '';

          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ text }));
        } catch (err: any) {
          console.error('[local-llm-proxy] Error:', err.message);
          res.writeHead(502, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'AI generation failed locally.', detail: err.message }));
        }
      });
    },
  };
}

/**
 * Local dev middleware for template endpoints so /api/* routes return JSON
 * while running `npm run dev` (without Vercel runtime).
 */
function localTemplateProxy(): Plugin {
  return {
    name: 'local-template-proxy',
    configureServer(server) {
      server.middlewares.use('/api/templates', async (req, res) => {
        if (req.method === 'OPTIONS') {
          res.writeHead(200, {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization',
          });
          res.end();
          return;
        }

        if (req.method !== 'GET') {
          res.writeHead(405, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Method not allowed' }));
          return;
        }

        try {
          const url = new URL(req.url ?? '', 'http://localhost');
          const teacherId = (url.searchParams.get('teacherId') ?? '').trim();

          if (!teacherId) {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'teacherId is required' }));
            return;
          }

          const schemaMod = await server.ssrLoadModule('/src/pipeline/schema/templates/problemTypes/index.ts');
          const explanationMod = await server.ssrLoadModule('/src/utils/templateExplanation.ts');
          const merged = await schemaMod.getAllProblemTypesForTeacher(teacherId);

          const subjectMap: Record<string, string> = {
            'English Language Arts': 'ELA',
            English: 'ELA',
            ELA: 'ELA',
            Math: 'Math',
            Mathematics: 'Math',
            Science: 'Science',
            History: 'Social Studies',
            'Social Studies': 'Social Studies',
            STEM: 'STEM',
            'World Languages': 'World Languages',
            'Foreign Language': 'World Languages',
          };

          const normalizeString = (value: unknown, fallback = ''): string => {
            const str = String(value ?? fallback).trim();
            return str || fallback;
          };

          const firstConfigOption = (configurableFields: Record<string, unknown> | undefined): string | null => {
            if (!configurableFields) return null;
            for (const value of Object.values(configurableFields)) {
              if (Array.isArray(value) && value.length > 0) {
                return String(value[0]);
              }
              if (typeof value === 'string' && value.trim()) {
                return value.trim();
              }
            }
            return null;
          };

          const fallbackPreviewItems = (template: {
            label: string;
            subject: string;
            cognitiveIntent: string;
            sharedContext: string;
            configurableFields?: Record<string, unknown>;
          }): Array<{ prompt: string; answer: string }> => {
            const focus = firstConfigOption(template.configurableFields);
            const contextPhrase = template.sharedContext && template.sharedContext !== 'none'
              ? `using a ${template.sharedContext.replace(/_/g, ' ')}`
              : 'from a short prompt';
            const focusPhrase = focus ? ` Focus on ${String(focus).replace(/_/g, ' ')}.` : '';

            return [
              {
                prompt: `${template.label}: Have students ${template.cognitiveIntent} ${contextPhrase}.${focusPhrase}`,
                answer: `Sample response should clearly ${template.cognitiveIntent} and reference key details accurately.`,
              },
              {
                prompt: `${template.subject} task: Ask students to ${template.cognitiveIntent} in a second variation of the same skill.${focusPhrase}`,
                answer: 'Sample response should demonstrate consistent reasoning and domain-appropriate vocabulary.',
              },
            ];
          };

          const normalizePreviewItems = (
            entry: any,
            normalizedTemplate: {
              label: string;
              subject: string;
              cognitiveIntent: string;
              sharedContext: string;
              configurableFields?: Record<string, unknown>;
            }
          ) => {
            if (Array.isArray(entry.previewItems) && entry.previewItems.length > 0) {
              return entry.previewItems;
            }

            if (Array.isArray(entry.examples) && entry.examples.length > 0) {
              return entry.examples.slice(0, 2).map((example: unknown, idx: number) => ({
                prompt: String(example),
                answer: `Sample answer outline ${idx + 1}`,
              }));
            }

            return fallbackPreviewItems(normalizedTemplate);
          };

          const inferSystemSubject = (templateId: string): string => {
            if (templateId.startsWith('ela_')) return 'English';
            if (templateId.startsWith('history_')) return 'History';
            if (templateId.startsWith('science_')) return 'Science';
            if (templateId.startsWith('stem_')) return 'STEM';
            if (templateId === 'foreign_language') return 'World Languages';
            return 'Math';
          };

          const normalizeSystemTemplate = (entry: any) => {
            const id = normalizeString(entry.id);
            const rawSubject =
              (typeof entry.subject === 'string' && entry.subject.trim().length > 0
                ? entry.subject.trim()
                : inferSystemSubject(id));
            const subject = subjectMap[rawSubject] ?? 'Other';

            const normalized = {
              id,
              label: normalizeString(entry.label, id),
              subject,
              itemType: entry.itemType ?? 'short_answer',
              cognitiveIntent: entry.defaultIntent ?? entry.cognitiveIntent ?? 'analyze',
              difficulty: entry.defaultDifficulty ?? entry.difficulty ?? 'medium',
              sharedContext: entry.sharedContext ?? 'none',
              configurableFields: entry.configurableFields ?? {},
              previewItems: [] as unknown[],
              isTeacherTemplate: false,
            };

            normalized.previewItems = normalizePreviewItems(entry, normalized);

            return {
              ...normalized,
              explanation: explanationMod.generateTemplateExplanation(normalized),
            };
          };

          const normalizeTeacherTemplate = (entry: any) => {
            const id = normalizeString(entry.id);

            const normalized = {
              id,
              label: normalizeString(entry.label, id),
              subject: normalizeString(entry.subject, 'Other'),
              itemType: entry.itemType ?? 'short_answer',
              cognitiveIntent: entry.cognitiveIntent ?? 'analyze',
              difficulty: entry.difficulty ?? 'medium',
              sharedContext: entry.sharedContext ?? 'none',
              configurableFields: entry.configurableFields ?? {},
              previewItems: [] as unknown[],
              examples: Array.isArray(entry.examples) ? entry.examples : [],
              inferred: entry.inferred ?? {},
              isTeacherTemplate: true,
            };

            normalized.previewItems = normalizePreviewItems(entry, normalized);

            return {
              ...normalized,
              explanation: explanationMod.generateTemplateExplanation(normalized),
            };
          };

          const systemSource = Array.isArray(merged.system)
            ? merged.system
            : Object.values(merged.system ?? {});

          const system = systemSource.map((entry: any) => normalizeSystemTemplate(entry));
          const teacher = (merged.teacher ?? []).map((entry: any) => normalizeTeacherTemplate(entry));

          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ system, teacher }));
        } catch (err: any) {
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: err?.message ?? 'Failed to load templates' }));
        }
      });

      server.middlewares.use('/api/derive-template', async (req, res) => {
        if (req.method === 'OPTIONS') {
          res.writeHead(200, {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization',
          });
          res.end();
          return;
        }

        if (req.method !== 'POST') {
          res.writeHead(405, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Method not allowed' }));
          return;
        }

        try {
          const chunks: Buffer[] = [];
          await new Promise<void>((resolve, reject) => {
            req.on('data', (chunk: Buffer) => chunks.push(chunk));
            req.on('end', resolve);
            req.on('error', reject);
          });

          const body = JSON.parse(Buffer.concat(chunks).toString() || '{}');
          const mod = await server.ssrLoadModule('/src/pipeline/agents/templateDeriver/derive.ts');
          const result = await mod.deriveTemplate(body);

          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify(result));
        } catch (err: any) {
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: err?.message ?? 'deriveTemplate failed' }));
        }
      });

      server.middlewares.use('/api/save-template', async (req, res) => {
        if (req.method === 'OPTIONS') {
          res.writeHead(200, {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization',
          });
          res.end();
          return;
        }

        if (req.method !== 'POST') {
          res.writeHead(405, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Method not allowed' }));
          return;
        }

        try {
          const chunks: Buffer[] = [];
          await new Promise<void>((resolve, reject) => {
            req.on('data', (chunk: Buffer) => chunks.push(chunk));
            req.on('end', resolve);
            req.on('error', reject);
          });

          const body = JSON.parse(Buffer.concat(chunks).toString() || '{}');
          const teacherId = body?.teacherId;
          const template = body?.template;

          if (!teacherId || !template) {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'teacherId and template are required' }));
            return;
          }

          const mod = await server.ssrLoadModule('/src/pipeline/persistence/saveTemplate.ts');
          await mod.saveTemplate(teacherId, template);

          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ ok: true }));
        } catch (err: any) {
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: err?.message ?? 'saveTemplate failed' }));
        }
      });

      server.middlewares.use('/api/delete-template', async (req, res) => {
        if (req.method === 'OPTIONS') {
          res.writeHead(200, {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'DELETE, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization',
          });
          res.end();
          return;
        }

        if (req.method !== 'DELETE') {
          res.writeHead(405, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Method not allowed' }));
          return;
        }

        try {
          const chunks: Buffer[] = [];
          await new Promise<void>((resolve, reject) => {
            req.on('data', (chunk: Buffer) => chunks.push(chunk));
            req.on('end', resolve);
            req.on('error', reject);
          });

          const body = JSON.parse(Buffer.concat(chunks).toString() || '{}');
          const teacherId = body?.teacherId;
          const templateId = body?.templateId;

          if (!teacherId || !templateId) {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'teacherId and templateId are required' }));
            return;
          }

          const mod = await server.ssrLoadModule('/src/pipeline/persistence/deleteTemplate.ts');
          await mod.deleteTemplate(String(teacherId), String(templateId));

          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ ok: true }));
        } catch (err: any) {
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: err?.message ?? 'deleteTemplate failed' }));
        }
      });
    },
  };
}

function localPrismV4Proxy(): Plugin {
  return {
    name: 'local-prism-v4-proxy',
    configureServer(server) {
      server.middlewares.use('/api/v4', async (req, res, next) => {
        const url = new URL(req.url ?? '/', 'http://localhost')
        const pathname = url.pathname.replace(/\/+$/, '') || '/'

        const route = localPrismRoutes.find((entry) => entry.pattern.test(pathname))
        if (!route) {
          next()
          return
        }

        setApiCors(res, 'GET, POST, PATCH, DELETE, OPTIONS')

        if (req.method === 'OPTIONS') {
          sendJson(res, 200, {})
          return
        }

        try {
          const match = pathname.match(route.pattern)
          if (!match) {
            next()
            return
          }

          await invokeLocalApiRoute(server, req, res, route, url, match)
        } catch (err: any) {
          sendJson(res, 500, { error: err?.message ?? 'Local PRISM v4 API proxy failed' })
        }
      })
    },
  }
}

function localApiProxy(): Plugin {
  return {
    name: 'local-api-proxy',
    configureServer(server) {
      server.middlewares.use('/api', async (req, res, next) => {
        const url = new URL(req.url ?? '/', 'http://localhost')
        const pathname = url.pathname.replace(/\/+$/, '') || '/'

        const route = localApiRoutes.find((entry) => entry.pattern.test(pathname))
        if (!route) {
          next()
          return
        }

        setApiCors(res, 'GET, POST, PATCH, DELETE, OPTIONS')

        if (req.method === 'OPTIONS') {
          sendJson(res, 200, {})
          return
        }

        try {
          const match = pathname.match(route.pattern)
          if (!match) {
            next()
            return
          }

          await invokeLocalApiRoute(server, req, res, route, url, match)
        } catch (err: any) {
          sendJson(res, 500, { error: err?.message ?? 'Local API proxy failed' })
        }
      })
    },
  }
}

export default defineConfig(({ mode }) => {
  // loadEnv reads .env, .env.local, .env.[mode], .env.[mode].local
  // The third arg '' means load ALL vars (not just VITE_ prefixed ones)
  const env = loadEnv(mode, process.cwd(), '');
  Object.entries(env).forEach(([key, value]) => {
    if (typeof process.env[key] === 'undefined') {
      process.env[key] = value
    }
  })
  const geminiApiKey = env.GEMINI_API_KEY || env.GOOGLE_API_KEY || '';
  const devApiTarget = env.VITE_DEV_SERVER_URL || 'http://localhost:3000';

  return {
    plugins: [tsconfigPaths(), react(), localLLMProxy(geminiApiKey), localPrismV4Proxy(), localApiProxy()],
    server: {
      port: 3000,
      open: true,
      proxy: {
        '/api/v4': {
          target: devApiTarget,
          secure: false,
          changeOrigin: true,
        },
      },
    },
    build: {
      outDir: 'dist',
      sourcemap: true,
      rollupOptions: {
        external: ['server', 'api']
      }
    },
    optimizeDeps: {
      exclude: ['server', 'api']
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, 'src')
      },
      extensions: ['.tsx', '.ts', '.jsx', '.js']
    }
  };
});
