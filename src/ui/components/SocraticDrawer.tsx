import React, { useState, useRef, useEffect } from 'react';
import { Sparkles, Send, Key, X, Trash2, Bot, User, Loader2 } from 'lucide-react';
import { GlassPanel } from './GlassPanel';
import { ChatMessage } from '../../ai/types';

export interface SocraticDrawerProps {
  isOpen: boolean;
  onToggle: () => void;
  messages: ChatMessage[];
  isLoading: boolean;
  error: string | null;
  hasApiKey: boolean;
  onSaveApiKey: (key: string) => void;
  onSendMessage: (text: string) => void;
  onClearChat: () => void;
  quickPrompts?: string[];
}

export const SocraticDrawer: React.FC<SocraticDrawerProps> = ({
  isOpen,
  onToggle,
  messages,
  isLoading,
  error,
  hasApiKey,
  onSaveApiKey,
  onSendMessage,
  onClearChat,
  quickPrompts = [
    'Analyze my current trajectory',
    'Why does increasing the field change the path?',
    'What happens if I change the sign of the variable?',
  ],
}) => {
  const [inputText, setInputText] = useState<string>('');
  const [apiKeyInput, setApiKeyInput] = useState<string>('');
  const [isConfiguringKey, setIsConfiguringKey] = useState<boolean>(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  const handleSend = () => {
    if (!inputText.trim() || isLoading) return;
    onSendMessage(inputText);
    setInputText('');
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSend();
    }
  };

  return (
    <>
      {/* Floating Toggle Button (Always accessible) */}
      <button
        onClick={onToggle}
        className="fixed bottom-6 right-6 z-30 p-3.5 rounded-2xl bg-accent hover:opacity-90 text-on-accent shadow-2xl backdrop-blur-md flex items-center gap-2.5 transition-all duration-300 hover:scale-105 cursor-pointer pointer-events-auto border border-accent"
        title="Open Socratic AI Tutor"
      >
        <Sparkles className="w-5 h-5 text-on-accent animate-pulse" />
        <span className="text-xs font-semibold tracking-wide hidden sm:inline">AI Tutor</span>
      </button>

      {/* Slide-out Drawer */}
      {isOpen && (
        <aside
          className="fixed top-0 right-0 h-full w-full sm:w-[420px] z-40 p-4 sm:p-6 flex flex-col pointer-events-auto transition-transform duration-300 ease-in-out"
        >
          <GlassPanel className="h-full w-full flex flex-col p-4 shadow-2xl border border-accent">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-line pb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-accent-soft text-accent border border-accent">
                  <Bot className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-xs font-semibold text-ink flex items-center gap-1.5">
                    Socratic AI Tutor
                    <span className="text-xs text-emerald-400 font-mono bg-emerald-950/60 px-1.5 py-0.2 rounded border border-emerald-500/20">
                      Gemini
                    </span>
                  </h3>
                  <p className="text-xs text-muted">Context-Aware Science Mentor</p>
                </div>
              </div>

              <div className="flex items-center gap-1">
                <button
                  onClick={() => setIsConfiguringKey(!isConfiguringKey)}
                  className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                    hasApiKey
                      ? 'text-muted hover:text-ink hover:bg-sunken'
                      : 'text-amber-400 bg-amber-500/10 animate-pulse'
                  }`}
                  title={hasApiKey ? 'Update API Key' : 'Configure Gemini API Key'}
                >
                  <Key className="w-4 h-4" />
                </button>

                {messages.length > 0 && (
                  <button
                    onClick={onClearChat}
                    className="p-1.5 text-muted hover:text-rose-300 hover:bg-sunken rounded-lg transition-colors cursor-pointer"
                    title="Clear Chat History"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}

                <button
                  onClick={onToggle}
                  className="p-1.5 text-muted hover:text-ink hover:bg-sunken rounded-lg transition-colors cursor-pointer"
                  title="Close Drawer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* API Key Configuration Panel */}
            {(isConfiguringKey || !hasApiKey) && (
              <div className="bg-card border border-line rounded-xl p-3 my-3 flex flex-col gap-2">
                <div className="flex justify-between items-center text-xs text-ink font-medium">
                  <span>Google Gemini API Key (BYOK)</span>
                  <a
                    href="https://aistudio.google.com/app/apikey"
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs text-accent hover:underline"
                  >
                    Get a key ↗
                  </a>
                </div>
                <p className="text-xs text-muted leading-relaxed">
                  Optional: every simulation works without AI. Your key stays in this browser's <code className="text-ink">localStorage</code>; your messages and telemetry are sent to Google. Use is governed by Google's terms, including age and regional rules. Use only services you are allowed to use: if you need permission from a parent, teacher or institution, get it first; many schools, colleges and employers restrict generative AI.
                </p>
                <div className="flex gap-2">
                  <input
                    type="password"
                    placeholder="AIzaSy..."
                    value={apiKeyInput}
                    onChange={(e) => setApiKeyInput(e.target.value)}
                    className="flex-1 bg-paper border border-line rounded-lg px-2.5 py-1 text-xs text-ink font-mono focus:outline-none focus:border-accent"
                  />
                  <button
                    onClick={() => {
                      if (apiKeyInput.trim()) {
                        onSaveApiKey(apiKeyInput.trim());
                        setApiKeyInput('');
                        setIsConfiguringKey(false);
                      }
                    }}
                    className="px-3 py-1 bg-accent hover:opacity-90 text-on-accent rounded-lg text-xs font-medium cursor-pointer transition-colors"
                  >
                    Save
                  </button>
                </div>
              </div>
            )}

            {/* Chat Messages */}
            <div className="flex-1 overflow-y-auto py-3 space-y-3 pr-1 text-xs">
              {messages.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center p-4 text-muted">
                  <Bot className="w-8 h-8 text-muted mb-2" />
                  <p className="font-medium text-ink text-xs">I am observing your simulation.</p>
                  <p className="text-xs text-muted mt-1 max-w-[260px]">
                    Adjust variables, run experiments, or ask me to interpret what's happening.
                  </p>
                </div>
              ) : (
                messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex gap-2.5 ${
                      msg.role === 'user' ? 'justify-end' : 'justify-start'
                    }`}
                  >
                    {msg.role === 'model' && (
                      <div className="w-6 h-6 rounded-full bg-accent-soft border border-accent flex items-center justify-center text-accent shrink-0 mt-0.5">
                        <Bot className="w-3.5 h-3.5" />
                      </div>
                    )}
                    <div
                      className={`rounded-2xl px-3.5 py-2.5 max-w-[85%] leading-relaxed ${
                        msg.role === 'user'
                          ? 'bg-accent text-on-accent rounded-tr-none'
                          : 'bg-card border border-line text-ink rounded-tl-none font-sans'
                      }`}
                    >
                      <p className="whitespace-pre-wrap">{msg.content}</p>
                    </div>
                    {msg.role === 'user' && (
                      <div className="w-6 h-6 rounded-full bg-sunken border border-line flex items-center justify-center text-ink shrink-0 mt-0.5">
                        <User className="w-3.5 h-3.5" />
                      </div>
                    )}
                  </div>
                ))
              )}

              {isLoading && (
                <div className="flex gap-2.5 items-center text-muted text-xs py-2">
                  <div className="w-6 h-6 rounded-full bg-accent-soft border border-accent flex items-center justify-center text-accent">
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  </div>
                  <span className="text-xs animate-pulse">Analyzing active telemetry...</span>
                </div>
              )}

              {error && (
                <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs leading-relaxed">
                  {error}
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Quick Action Chips */}
            {hasApiKey && (
              <div className="flex flex-wrap gap-1.5 py-2 border-t border-line">
                {quickPrompts.map((prompt, i) => (
                  <button
                    key={i}
                    onClick={() => onSendMessage(prompt)}
                    disabled={isLoading}
                    className="text-xs px-2.5 py-1 rounded-full bg-card hover:bg-sunken text-muted hover:text-ink border border-line cursor-pointer transition-colors"
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            )}

            {/* Input Bar */}
            <div className="pt-2 flex items-center gap-2 border-t border-line">
              <input
                type="text"
                placeholder={hasApiKey ? 'Ask your Socratic tutor...' : 'Configure API key first...'}
                disabled={!hasApiKey || isLoading}
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyDown={handleKeyDown}
                className="flex-1 bg-paper border border-line rounded-xl px-3 py-2 text-xs text-ink placeholder:text-muted focus:outline-none focus:border-accent disabled:opacity-50"
              />
              <button
                onClick={handleSend}
                disabled={!hasApiKey || !inputText.trim() || isLoading}
                className="p-2 rounded-xl bg-accent hover:opacity-90 text-on-accent disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </GlassPanel>
        </aside>
      )}
    </>
  );
};
