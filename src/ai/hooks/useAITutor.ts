import { useState, useCallback, useEffect } from 'react';
import { ChatMessage, SimulationTelemetryContext } from '../types';
import {
  getStoredApiKey,
  setStoredApiKey,
  generateTutorResponse,
} from '../geminiClient';

export function useAITutor() {
  const [apiKey, setApiKeyState] = useState<string>('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Load API key on mount
  useEffect(() => {
    const key = getStoredApiKey();
    if (key) {
      setApiKeyState(key);
    }
  }, []);

  const saveApiKey = useCallback((newKey: string) => {
    setStoredApiKey(newKey);
    setApiKeyState(newKey.trim());
    setError(null);
  }, []);

  const sendMessage = useCallback(
    async (text: string, context: SimulationTelemetryContext) => {
      if (!text.trim()) return;
      if (!apiKey) {
        setError('Please configure your free Google Gemini API Key first.');
        return;
      }

      const userMsg: ChatMessage = {
        id: `user-${Date.now()}`,
        role: 'user',
        content: text.trim(),
        timestamp: Date.now(),
      };

      setMessages((prev) => [...prev, userMsg]);
      setIsLoading(true);
      setError(null);

      try {
        const responseText = await generateTutorResponse({
          apiKey,
          history: messages,
          userMessage: text.trim(),
          context,
        });

        const modelMsg: ChatMessage = {
          id: `model-${Date.now()}`,
          role: 'model',
          content: responseText,
          timestamp: Date.now(),
        };

        setMessages((prev) => [...prev, modelMsg]);
      } catch (err: any) {
        setError(err?.message || 'Failed to communicate with Gemini Tutor.');
      } finally {
        setIsLoading(false);
      }
    },
    [apiKey, messages]
  );

  const clearChat = useCallback(() => {
    setMessages([]);
    setError(null);
  }, []);

  return {
    apiKey,
    hasApiKey: Boolean(apiKey),
    saveApiKey,
    messages,
    isLoading,
    error,
    sendMessage,
    clearChat,
  };
}
