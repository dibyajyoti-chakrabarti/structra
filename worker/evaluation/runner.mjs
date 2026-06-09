import fs from 'node:fs';
import { buildEvaluationPrompt, evaluateRules, summarizeResults } from './evaluateRules.mjs';

const raw = fs.readFileSync(0, 'utf8');
const input = raw ? JSON.parse(raw) : {};
const workspaceTier = String(input.workspaceTier || 'core').toLowerCase();
const canvasState = {
  ...(input.canvasState || {}),
  workspaceTier,
};

const results = evaluateRules(canvasState);
const summary = summarizeResults(results);
const prompt = buildEvaluationPrompt(results, canvasState.systemMetadata || {}, workspaceTier);

process.stdout.write(
  JSON.stringify({
    results,
    summary,
    score: summary.score,
    prompt,
  })
);
