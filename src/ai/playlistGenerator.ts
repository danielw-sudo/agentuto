import { StudyPlaylist } from '../knowledge/types';
import { globalKnowledgeGraph } from '../knowledge/KnowledgeGraphClient';
import { SIMULATION_CATALOG } from '../simulations';
import { DEFAULT_MODEL, modelUnavailableMessage } from './geminiClient';

export interface GeneratePlaylistOptions {
  apiKey: string;
  studentGoal: string;
  model?: string;
}

/**
 * Derives the Gemini responseSchema parameter properties dynamically from
 * SIMULATION_CATALOG[*].paramDescriptors (Constitution Art. 5: One source of truth).
 */
export function buildSuggestedParametersSchema(): Record<string, { type: 'NUMBER' }> {
  const properties: Record<string, { type: 'NUMBER' }> = {};
  for (const sim of Object.values(SIMULATION_CATALOG)) {
    for (const desc of sim.paramDescriptors) {
      properties[desc.id] = { type: 'NUMBER' };
    }
  }
  return properties;
}

export async function generateCustomStudyPlaylist({
  apiKey,
  studentGoal,
  model = DEFAULT_MODEL,
}: GeneratePlaylistOptions): Promise<StudyPlaylist> {
  if (!apiKey) {
    throw new Error('Missing Gemini API Key.');
  }

  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;

  const graphContext = globalKnowledgeGraph.exportGraphSummaryForAI();

  const systemInstruction = `You are the Agentuto Playlist Architect.
Your role is to build a customized, step-by-step interactive science study trajectory (playlist) for a student based on their learning goal.
You must construct the playlist strictly from the concepts and sandboxes present in the Agentuto Knowledge Graph.

Knowledge Graph Context:
${graphContext}

Strict Requirements:
1. Output MUST be valid JSON conforming strictly to the requested schema.
2. Select 2 to 4 focused steps leading the student from intuitive exploration to deeper mathematical insight.
3. Suggest concrete parameters for each sandbox (e.g., setting b = 4.47 for critical damping when k = 5, m = 1).
4. For each step, include an empirical "socratic_challenge" prompt instructing the student what physical variable to observe or measure.`;

  const prompt = `Student Learning Goal: "${studentGoal}".
Create an interactive sandbox study playlist for me.`;

  const payload = {
    system_instruction: {
      parts: [{ text: systemInstruction }],
    },
    contents: [
      {
        role: 'user',
        parts: [{ text: prompt }],
      },
    ],
    generationConfig: {
      temperature: 0.4,
      responseMimeType: 'application/json',
      responseSchema: {
        type: 'OBJECT',
        properties: {
          playlist_title: { type: 'STRING' },
          description: { type: 'STRING' },
          steps: {
            type: 'ARRAY',
            items: {
              type: 'OBJECT',
              properties: {
                step_index: { type: 'INTEGER' },
                sandbox_id: { type: 'STRING' },
                concept_id: { type: 'STRING' },
                learning_objective: { type: 'STRING' },
                suggested_parameters: {
                  type: 'OBJECT',
                  properties: buildSuggestedParametersSchema(),
                },
                socratic_challenge: { type: 'STRING' },
              },
              required: [
                'step_index',
                'sandbox_id',
                'concept_id',
                'learning_objective',
                'suggested_parameters',
                'socratic_challenge',
              ],
            },
          },
        },
        required: ['playlist_title', 'description', 'steps'],
      },
    },
  };

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 25000);

  let response: Response;
  try {
    response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': apiKey,
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
  } catch (err: any) {
    clearTimeout(timeoutId);
    if (err.name === 'AbortError') {
      throw new Error('Playlist generation timed out after 25s.');
    }
    throw err;
  } finally {
    clearTimeout(timeoutId);
  }

  if (!response.ok) {
    if (response.status === 404) {
      throw new Error(modelUnavailableMessage(model));
    }
    throw new Error(`Gemini playlist generation failed with status ${response.status}`);
  }

  const data = await response.json();
  const jsonText = data?.candidates?.[0]?.content?.parts?.[0]?.text;

  if (!jsonText) {
    throw new Error('Empty playlist response from Gemini API.');
  }

  const parsed = JSON.parse(jsonText) as StudyPlaylist;
  return parsed;
}
