import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import type { Plugin } from 'vite'

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

export default defineConfig(({ mode }) => {
  // loadEnv reads .env, .env.local, .env.[mode], .env.[mode].local
  // The third arg '' means load ALL vars (not just VITE_ prefixed ones)
  const env = loadEnv(mode, process.cwd(), '');
  const geminiApiKey = env.GEMINI_API_KEY || env.GOOGLE_API_KEY || '';

  return {
  plugins: [react(), localLLMProxy(geminiApiKey), localTemplateProxy()],
  server: {
    port: 3000,
    open: true
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
