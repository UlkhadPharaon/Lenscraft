import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { MessageSquare, X, Send, Bot, Loader2, Sparkles, Check } from 'lucide-react';
import { useAppContext } from '../context';
import { VideoTreatment } from '../types';
import toast from 'react-hot-toast';
import { postJson, messageFor } from '../utils/api';

export default function ChatAssistant() {
  const { treatment, setTreatment, selectedModel } = useAppContext();
  const [isOpen, setIsOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [chatHistory, setChatHistory] = useState<{role: 'user' | 'assistant', content: string}[]>([
    { role: 'assistant', content: treatment
      ? `Bonjour ! Je suis l'assistant IA de LensCraft. Dites-moi ce que vous souhaitez modifier dans le dossier « ${treatment.analysis?.title || 'votre projet'} ».`
      : "Bonjour ! Je suis l'assistant IA de LensCraft. Dites-moi ce que vous souhaitez modifier dans ce dossier de production." }
  ]);
  const [error, setError] = useState<string | null>(null);

  // If no treatment, don't show the chat assistant
  if (!treatment) return null;

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim() || loading) return;

    const userMessage = message.trim();
    setMessage('');
    setChatHistory(prev => [...prev, { role: 'user', content: userMessage }]);
    setLoading(true);
    setError(null);

    try {
      const data: { assistantMessage: string, treatment: VideoTreatment } = await postJson<{
        assistantMessage: string;
        treatment: VideoTreatment;
      }>("/api/assistant", {
        body: { treatment, message: userMessage, model: selectedModel },
        retries: 3,
      });
      
      // Update treatment globally while preserving its original ID and Creation Date
      setTreatment({
        ...data.treatment,
        id: treatment.id,
        createdAt: treatment.createdAt
      });
      
      // Add assistant response to chat
      setChatHistory(prev => [...prev, { role: 'assistant', content: data.assistantMessage }]);
      toast.success('Dossier mis à jour par l\'assistant.');
    } catch (err: any) {
      const message = messageFor(err);
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* Floating Toggle Button */}
      <motion.button
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        onClick={() => setIsOpen(true)}
        className={`fixed bottom-6 right-6 p-4 rounded-full bg-indigo-600 hover:bg-indigo-500 text-white shadow-xl shadow-indigo-500/20 transition-transform ${isOpen ? 'scale-0' : 'scale-100 hover:scale-105'} flex items-center gap-2 z-40`}
      >
        <Sparkles className="w-5 h-5" />
        <span className="font-medium pr-1 text-sm hidden sm:block">IA Assistant</span>
      </motion.button>

      {/* Chat Window */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 100, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 100, scale: 0.95 }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="fixed bottom-6 right-6 w-full max-w-sm sm:max-w-md bg-zinc-950 border border-zinc-800 rounded-3xl shadow-2xl flex flex-col z-50 overflow-hidden"
            style={{ height: '550px', maxHeight: '80vh' }}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 px-5 bg-zinc-900 border-b border-zinc-800">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-indigo-500/20 rounded-lg">
                  <Bot className="w-5 h-5 text-indigo-400" />
                </div>
                <div>
                  <h3 className="font-semibold text-sm">Assistant LensCraft</h3>
                  <p className="text-xs text-zinc-400">Modifications intelligentes</p>
                </div>
              </div>
              <button 
                onClick={() => setIsOpen(false)}
                className="p-2 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Chat Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-zinc-950/50">
              {chatHistory.map((chat, i) => (
                <div key={i} className={`flex ${chat.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div 
                    className={`max-w-[85%] rounded-2xl p-3 px-4 text-sm leading-relaxed ${
                      chat.role === 'user' 
                        ? 'bg-zinc-800 text-zinc-100 rounded-br-sm' 
                        : 'bg-indigo-600/20 text-indigo-100 border border-indigo-500/20 rounded-bl-sm'
                    }`}
                  >
                    {chat.content}
                  </div>
                </div>
              ))}
              {loading && (
                <div className="flex justify-start">
                  <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-3 px-4 rounded-bl-sm flex items-center gap-3 text-sm text-zinc-400">
                    <Loader2 className="w-4 h-4 animate-spin text-indigo-400" />
                    Modification en cours...
                  </div>
                </div>
              )}
              {error && (
                <div className="flex justify-start">
                  <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-3 px-4 rounded-bl-sm text-sm text-red-400">
                    {error}
                  </div>
                </div>
              )}
            </div>

            {/* Input Area */}
            <div className="p-4 bg-zinc-900 border-t border-zinc-800">
              <form onSubmit={handleSend} className="relative">
                <input
                  type="text"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Ex: Ajoute une scène de nuit à la fin..."
                  disabled={loading}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl pl-4 pr-12 py-3 text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:ring-1 focus:ring-indigo-500/50 focus:border-indigo-500/50 transition-all disabled:opacity-50"
                />
                <button
                  type="submit"
                  disabled={!message.trim() || loading}
                  className="absolute right-2 top-2 p-1.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-500 transition-colors disabled:opacity-50 disabled:hover:bg-indigo-600"
                >
                  <Send className="w-4 h-4" />
                </button>
              </form>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
