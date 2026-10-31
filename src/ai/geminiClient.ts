import { ChatMessage, SimulationTelemetryContext } from './types';
import { buildSocraticSystemInstruction } from './prompts/socraticTutor';

const STORAGE_KEY = 'agentuto_gemini_api_key';
// Shared by the tutor and playlist generator. Check ai.google.dev/gemini-api/docs/deprecations
// before changing; gemini-2.0-flash was shut down on 2026-06-01.
export const DEFAULT_MODEL = 'gemini-3.8-flash';

export function modelUnavailableMessage(model: string): string {
  return `Gemini model "${model}" is not available (it may have been retired). Please report this issue so the default model can be updated.`;
}

export function getStoredApiKey(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

export function setStoredApiKey(key: string): void {
  try {
    if (key.trim()) {
      localStorage.setItem(STORAGE_KEY, key.trim());
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  } catch {
    // Ignore storage errors in restricted contexts
  }
}

export function clearStoredApiKey(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Ignore
  }
}

export interface GenerateTutorResponseOptions {
  apiKey: string;
  history: ChatMessage[];
  userMessage: string;
  context: SimulationTelemetryContext;
  model?: string;
}

export async function generateTutorResponse({
  apiKey,
  history,
  userMessage,
  context,
  model = DEFAULT_MODEL,
}: GenerateTutorResponseOptions): Promise<string> {
  if (!apiKey) {
    throw new Error('Missing Gemini API Key. Please provide an API key in settings.');
  }

  // Use HTTP header for API key instead of query parameter for security
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;

  const systemInstruction = buildSocraticSystemInstruction(context);

  // Format previous conversation turns
  const contents = history.map((msg) => ({
    role: msg.role === 'user' ? 'user' : 'model',
    parts: [{ text: msg.content }],
  }));

  // Append current user prompt
  contents.push({
    role: 'user',
    parts: [{ text: userMessage }],
  });

  const payload = {
    system_instruction: {
      parts: [{ text: systemInstruction }],
    },
    contents,
    generationConfig: {
      temperature: 0.7,
      maxOutputTokens: 1000,
    },
  };

  // Add 20-second timeout controller
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 20000);

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
      throw new Error('Request to Gemini API timed out after 20 seconds. Please try again.');
    }
    throw err;
  } finally {
    clearTimeout(timeoutId);
  }

  if (!response.ok) {
    if (response.status === 404) {
      throw new Error(modelUnavailableMessage(model));
    }
    if (response.status === 400 || response.status === 403) {
      throw new Error('Invalid Gemini API Key or permissions. Please check your key at Google AI Studio.');
    }
    if (response.status === 429) {
      throw new Error('Gemini rate limit reached for your API key. Please wait a minute and try again (your limits are shown in Google AI Studio).');
    }
    const errorData = await response.json().catch(() => ({}));
    const message =
      errorData?.error?.message || `Gemini API request failed with status ${response.status}`;
    throw new Error(message);
  }

  const data = await response.json();
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;

  if (!text) {
    throw new Error('Received empty response from Gemini API.');
  }

  return text;
}
