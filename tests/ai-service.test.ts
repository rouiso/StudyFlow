import assert from 'node:assert/strict';
import { afterEach, test } from 'node:test';
import {
  callAI,
  normalizeCalendarEvents,
  normalizeCoachingTopic,
  normalizeGeneratedSkills,
  normalizeGeneratedTraining,
} from '@/lib/ai-service';

const originalFetch = globalThis.fetch;
const originalGeminiKey = process.env.GEMINI_API_KEY;
const originalGeminiModel = process.env.GEMINI_MODEL;
const originalGroqKey = process.env.GROQ_API_KEY;

afterEach(() => {
  globalThis.fetch = originalFetch;
  if (originalGeminiKey === undefined) delete process.env.GEMINI_API_KEY;
  else process.env.GEMINI_API_KEY = originalGeminiKey;
  if (originalGeminiModel === undefined) delete process.env.GEMINI_MODEL;
  else process.env.GEMINI_MODEL = originalGeminiModel;
  if (originalGroqKey === undefined) delete process.env.GROQ_API_KEY;
  else process.env.GROQ_API_KEY = originalGroqKey;
});

test('calls the configured Gemini model server-side and parses its JSON response', async () => {
  process.env.GEMINI_API_KEY = 'test-key';
  process.env.GEMINI_MODEL = 'gemini-test';
  delete process.env.GROQ_API_KEY;

  let requestUrl = '';
  let requestBody: Record<string, any> = {};
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    requestUrl = String(input);
    requestBody = JSON.parse(String(init?.body));
    return new Response(
      JSON.stringify({
        candidates: [{ content: { parts: [{ text: '{"answer":"Réponse test"}' }] } }],
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  }) as typeof fetch;

  const result = await callAI('Question test', '{answer:string}', 'fr');

  assert.deepEqual(result, { answer: 'Réponse test' });
  assert.match(requestUrl, /models\/gemini-test:generateContent/);
  assert.equal(requestBody.contents[0].parts[0].text, 'Question test');
  assert.equal(requestBody.generationConfig.responseMimeType, 'application/json');
});

test('keeps only unique calendar events with valid explicit dates', () => {
  const events = normalizeCalendarEvents([
    { title: 'Remise du rapport', date: '2026-12-18', description: 'Document final' },
    { title: 'Remise du rapport', date: '2026-12-18', description: 'Doublon' },
    { title: 'Date invalide', date: '2026-02-30', description: '' },
    { title: 'Sans date complète', date: 'décembre 2026', description: '' },
  ]);

  assert.deepEqual(events, [
    { title: 'Remise du rapport', date: '2026-12-18', description: 'Document final' },
  ]);
});

test('normalizes generated skills and training drafts before showing them to users', () => {
  assert.deepEqual(normalizeGeneratedSkills([
    ' TypeScript ',
    'typescript',
    'MongoDB',
    null,
    'React',
  ]), ['TypeScript', 'MongoDB', 'React']);
  assert.deepEqual(
    normalizeGeneratedTraining({
      title: 'Atelier React',
      description: 'Créer une interface accessible.',
      skill: 'React',
      level: 'INVALID',
    }),
    {
      title: 'Atelier React',
      description: 'Créer une interface accessible.',
      skill: 'React',
      level: 'INTERMEDIATE',
    }
  );
  assert.equal(normalizeGeneratedTraining({ title: '', description: '', skill: '' }), null);
  assert.equal(normalizeCoachingTopic({ topic: '  Préparer une soutenance  ' }), 'Préparer une soutenance');
  assert.equal(normalizeCoachingTopic({ topic: '   ' }), null);
});
