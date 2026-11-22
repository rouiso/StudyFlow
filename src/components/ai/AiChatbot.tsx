'use client';

import React, { FormEvent, useEffect, useRef, useState } from 'react';
import { Bot, LoaderCircle, Send, Sparkles, X } from 'lucide-react';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface AiChatbotProps {
  projectId: string;
  projectName: string;
  module: string;
  isOpen: boolean;
  onOpen: () => void;
  onClose: () => void;
}

export function AiChatbot({ projectId, projectName, module, isOpen, onOpen, onClose }: AiChatbotProps) {
  const [question, setQuestion] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: 'assistant',
      content: `Bonjour ! Je peux répondre aux questions sur le projet « ${projectName} » et l’écran courant. Que souhaitez-vous savoir ?`,
    },
  ]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isOpen]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const text = question.trim();
    if (!text || isSending) return;

    const history = messages.slice(-8);
    setMessages((current) => [...current, { role: 'user', content: text }]);
    setQuestion('');
    setError('');
    setIsSending(true);

    try {
      const response = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          question: text,
          module,
          projectId,
          language: typeof navigator !== 'undefined' ? navigator.language : 'fr',
          history,
        }),
      });
      const result = await response.json();
      if (!response.ok || !result.ok) {
        throw new Error(result.error || 'Impossible d’obtenir une réponse.');
      }

      setMessages((current) => [
        ...current,
        { role: 'assistant', content: result.data?.answer || 'Je n’ai pas pu formuler de réponse.' },
      ]);
    } catch (requestError) {
      const message = requestError instanceof Error ? requestError.message : 'Erreur de connexion à l’assistant.';
      setError(message);
      setMessages((current) => [
        ...current,
        { role: 'assistant', content: 'Je n’ai pas pu traiter votre question. Vérifiez la connexion puis réessayez.' },
      ]);
    } finally {
      setIsSending(false);
    }
  }

  return (
    <>
      {isOpen && (
        <section
          aria-label="Assistant IA du projet"
          className="fixed bottom-24 right-3 z-[60] flex h-[min(70vh,560px)] w-[min(92vw,390px)] flex-col overflow-hidden rounded-2xl border border-indigo-400/30 bg-slate-950 shadow-2xl shadow-black/50 sm:bottom-24 sm:right-6"
        >
          <header className="flex items-center justify-between border-b border-slate-800 bg-gradient-to-r from-indigo-950 to-slate-950 px-4 py-3">
            <div className="flex items-center gap-2.5">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-500/20 text-indigo-300">
                <Sparkles className="h-5 w-5" />
              </span>
              <div>
                <h2 className="text-sm font-bold text-white">Assistant StudyFlow</h2>
                <p className="max-w-[240px] truncate text-[11px] text-slate-400">{projectName}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Fermer le chatbot"
              className="rounded-lg p-2 text-slate-400 hover:bg-slate-800 hover:text-white"
            >
              <X className="h-4 w-4" />
            </button>
          </header>

          <div className="flex-1 space-y-3 overflow-y-auto p-3" aria-live="polite">
            {messages.map((message, index) => (
              <div
                key={`${index}-${message.role}`}
                className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <p
                  className={`max-w-[88%] whitespace-pre-wrap break-words rounded-2xl px-3 py-2 text-sm leading-relaxed ${
                    message.role === 'user'
                      ? 'rounded-br-md bg-indigo-600 text-white'
                      : 'rounded-bl-md border border-slate-800 bg-slate-900 text-slate-200'
                  }`}
                >
                  {message.content}
                </p>
              </div>
            ))}
            {isSending && (
              <div className="flex items-center gap-2 text-xs text-slate-400">
                <LoaderCircle className="h-4 w-4 animate-spin" />
                Gemini prépare une réponse…
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {error && <p role="alert" className="px-3 pb-2 text-xs text-rose-300">{error}</p>}

          <form onSubmit={handleSubmit} className="flex items-end gap-2 border-t border-slate-800 p-3">
            <label className="sr-only" htmlFor="studyflow-ai-question">Votre question</label>
            <textarea
              id="studyflow-ai-question"
              value={question}
              onChange={(event) => setQuestion(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' && !event.shiftKey) {
                  event.preventDefault();
                  event.currentTarget.form?.requestSubmit();
                }
              }}
              maxLength={2000}
              rows={1}
              placeholder="Posez une question sur le projet…"
              className="max-h-24 min-h-10 flex-1 resize-y rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:border-indigo-400 focus:outline-none"
            />
            <button
              type="submit"
              disabled={!question.trim() || isSending}
              aria-label="Envoyer la question"
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-600 text-white transition-colors hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Send className="h-4 w-4" />
            </button>
          </form>
        </section>
      )}

      <button
        type="button"
        onClick={isOpen ? onClose : onOpen}
        aria-label={isOpen ? 'Fermer le chatbot IA' : 'Ouvrir le chatbot IA'}
        aria-expanded={isOpen}
        className="fixed bottom-20 right-4 z-[60] flex h-14 w-14 items-center justify-center rounded-full bg-indigo-600 text-white shadow-xl shadow-indigo-950/60 transition-transform hover:scale-105 hover:bg-indigo-500 sm:bottom-6 sm:right-6"
      >
        {isOpen ? <X className="h-6 w-6" /> : <Bot className="h-6 w-6" />}
      </button>
    </>
  );
}
