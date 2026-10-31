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
        className="fixed bottom-6 right-6 z-30 p-3.5 rounded-2xl bg-indigo-600/90 hover:bg-indigo-500 text-white shadow-2xl backdrop-blur-md flex items-center gap-2.5 transition-all duration-300 hover:scale-105 cursor-pointer pointer-events-auto border border-indigo-400/30"
        title="Open Socratic AI Tutor"
      >
        <Sparkles className="w-5 h-5 text-indigo-200 animate-pulse" />
        <span className="text-xs font-semibold tracking-wide hidden sm:inline">AI Tutor</span>
      </button>

      {/* Slide-out Drawer */}
      {isOpen && (
        <aside
          className="fixed top-0 right-0 h-full w-full sm:w-[420px] z-40 p-4 sm:p-6 flex flex-col pointer-events-auto transition-transform duration-300 ease-in-out"
        >
          <GlassPanel className="h-full w-full flex flex-col p-4 shadow-2xl border border-indigo-500/20">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                  <Bot className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-xs font-semibold text-neutral-100 flex items-center gap-1.5">
                    Socratic AI Tutor
                    <span className="text-[10px] text-emerald-400 font-mono bg-emerald-950/60 px-1.5 py-0.2 rounded border border-emerald-500/20">
                      Gemini
                    </span>
                  </h3>
                  <p className="text-[10px] text-neutral-400">Context-Aware Science Mentor</p>
                </div>
              </div>

              <div className="flex items-center gap-1">
                <button
                  onClick={() => setIsConfiguringKey(!isConfiguringKey)}
                  className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                    hasApiKey
                      ? 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800/60'
                      : 'text-amber-400 bg-amber-500/10 animate-pulse'
                  }`}
                  title={hasApiKey ? 'Update API Key' : 'Configure Gemini API Key'}
                >
                  <Key className="w-4 h-4" />
                </button>

                {messages.length > 0 && (
                  <button
                    onClick={onClearChat}
                    className="p-1.5 text-neutral-400 hover:text-rose-300 hover:bg-neutral-800/60 rounded-lg transition-colors cursor-pointer"
                    title="Clear Chat History"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}

                <button
                  onClick={onToggle}
                  className="p-1.5 text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800/60 rounded-lg transition-colors cursor-pointer"
                  title="Close Drawer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* API Key Configuration Panel */}
            {(isConfiguringKey || !hasApiKey) && (
              <div className="bg-neutral-900/80 border border-neutral-800 rounded-xl p-3 my-3 flex flex-col gap-2">
                <div className="flex justify-between items-center text-xs text-neutral-200 font-medium">
                  <span>Google Gemini API Key (BYOK)</span>
                  <a
                    href="https://aistudio.google.com/app/apikey"
                    target="_blank"
                    rel="noreferrer"
                    className="text-[10px] text-indigo-400 hover:underline"
                  >
                    Get a key ↗
                  </a>
                </div>
                <p className="text-[10px] text-neutral-400 leading-relaxed">
                  Optional: every simulation works without AI. Your key stays in this browser's <code className="text-neutral-300">localStorage</code>; your messages and telemetry are sent to Google. Use is governed by Google's terms, including age and regional rules. Students: please check with a parent, guardian or teacher first.
                </p>
                <div className="flex gap-2">
                  <input
                    type="password"
                    placeholder="AIzaSy..."
                    value={apiKeyInput}
                    onChange={(e) => setApiKeyInput(e.target.value)}
                    className="flex-1 bg-neutral-950 border border-neutral-700 rounded-lg px-2.5 py-1 text-xs text-neutral-200 font-mono focus:outline-none focus:border-indigo-500"
                  />
                  <button
                    onClick={() => {
                      if (apiKeyInput.trim()) {
                        onSaveApiKey(apiKeyInput.trim());
                        setApiKeyInput('');
                        setIsConfiguringKey(false);
                      }
                    }}
                    className="px-3 py-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-medium cursor-pointer transition-colors"
                  >
                    Save
                  </button>
                </div>
              </div>
            )}

            {/* Chat Messages */}
            <div className="flex-1 overflow-y-auto py-3 space-y-3 pr-1 text-xs">
              {messages.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center p-4 text-neutral-400">
                  <Bot className="w-8 h-8 text-neutral-600 mb-2" />
                  <p className="font-medium text-neutral-300 text-xs">I am observing your simulation.</p>
                  <p className="text-[11px] text-neutral-500 mt-1 max-w-[260px]">
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
                      <div className="w-6 h-6 rounded-full bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-indigo-300 shrink-0 mt-0.5">
                        <Bot className="w-3.5 h-3.5" />
                      </div>
                    )}
                    <div
                      className={`rounded-2xl px-3.5 py-2.5 max-w-[85%] leading-relaxed ${
                        msg.role === 'user'
                          ? 'bg-indigo-600 text-white rounded-tr-none'
                          : 'bg-neutral-900/80 border border-neutral-800 text-neutral-200 rounded-tl-none font-sans'
                      }`}
                    >
                      <p className="whitespace-pre-wrap">{msg.content}</p>
                    </div>
                    {msg.role === 'user' && (
                      <div className="w-6 h-6 rounded-full bg-neutral-800 border border-neutral-700 flex items-center justify-center text-neutral-300 shrink-0 mt-0.5">
                        <User className="w-3.5 h-3.5" />
                      </div>
                    )}
                  </div>
                ))
              )}

              {isLoading && (
                <div className="flex gap-2.5 items-center text-neutral-400 text-xs py-2">
                  <div className="w-6 h-6 rounded-full bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-indigo-300">
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  </div>
                  <span className="text-[11px] animate-pulse">Analyzing active telemetry...</span>
                </div>
              )}

              {error && (
                <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-[11px] leading-relaxed">
                  {error}
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Quick Action Chips */}
            {hasApiKey && (
              <div className="flex flex-wrap gap-1.5 py-2 border-t border-neutral-800/80">
                {quickPrompts.map((prompt, i) => (
                  <button
                    key={i}
                    onClick={() => onSendMessage(prompt)}
                    disabled={isLoading}
                    className="text-[10px] px-2.5 py-1 rounded-full bg-neutral-900/60 hover:bg-neutral-800 text-neutral-400 hover:text-neutral-200 border border-neutral-800 cursor-pointer transition-colors"
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            )}

            {/* Input Bar */}
            <div className="pt-2 flex items-center gap-2 border-t border-neutral-800">
              <input
                type="text"
                placeholder={hasApiKey ? 'Ask your Socratic tutor...' : 'Configure API key first...'}
                disabled={!hasApiKey || isLoading}
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyDown={handleKeyDown}
                className="flex-1 bg-neutral-950/80 border border-neutral-800 rounded-xl px-3 py-2 text-xs text-neutral-200 placeholder-neutral-500 focus:outline-none focus:border-indigo-500 disabled:opacity-50"
              />
              <button
                onClick={handleSend}
                disabled={!hasApiKey || !inputText.trim() || isLoading}
                className="p-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors"
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
