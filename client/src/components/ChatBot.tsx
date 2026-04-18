import { useState, useEffect, useRef, useCallback } from 'react';
import { MessageSquare, X, Send, Plus, Trash2, ChevronLeft, Bot, User } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import {
  sendChatMessage,
  getChatConversations,
  getChatConversation,
  deleteChatConversation,
} from '../services/api';
import { useAuth } from '../context/AuthContext';

const ROLE_PROMPTS: Record<string, { description: string; suggestions: string[] }> = {
  coach: {
    description: 'Ask me about apprentice progress, KSB coverage, submission trends, interventions, or any aspect of your coaching data.',
    suggestions: [
      'How are my apprentices performing overall?',
      'Which KSB areas need the most attention?',
      'Are there any apprentices at risk I should follow up with?',
    ],
  },
  admin: {
    description: 'Ask me about system-wide analytics, cohort comparisons, coach workloads, or programme health metrics.',
    suggestions: [
      'Give me an overview of all cohort performance',
      'Which coaches have the highest workload right now?',
      'What are the programme-wide submission and pass rates?',
    ],
  },
  apprentice: {
    description: 'Ask me about your progress, upcoming deadlines, KSB coverage, or tips to improve your submissions.',
    suggestions: [
      'How am I progressing against my KSB targets?',
      'What should I focus on to improve my portfolio?',
      'Which modules do I still need to submit evidence for?',
    ],
  },
};

const DEFAULT_PROMPTS = ROLE_PROMPTS.coach;

interface Message {
  id: number;
  role: 'user' | 'assistant';
  content: string;
  created_at: string;
}

interface Conversation {
  id: number;
  title: string | null;
  created_at: string;
  updated_at: string | null;
  message_count: number;
}

export default function ChatBot() {
  const { user } = useAuth();
  const roleConfig = ROLE_PROMPTS[user?.role ?? ''] ?? DEFAULT_PROMPTS;
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [conversationId, setConversationId] = useState<number | null>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = useCallback(() => {
    setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
  }, []);

  useEffect(() => { scrollToBottom(); }, [messages, scrollToBottom]);

  useEffect(() => {
    if (open && inputRef.current) {
      inputRef.current.focus();
    }
  }, [open]);

  const loadConversations = useCallback(async () => {
    setLoadingHistory(true);
    try {
      const res = await getChatConversations();
      setConversations(res.data);
    } catch { /* ignore */ }
    setLoadingHistory(false);
  }, []);

  const loadConversation = useCallback(async (id: number) => {
    try {
      const res = await getChatConversation(id);
      setConversationId(id);
      setMessages(
        res.data.messages
          .map((m: Message) => ({
            id: m.id,
            role: m.role,
            content: m.content,
            created_at: m.created_at,
          }))
      );
      setShowHistory(false);
    } catch { /* ignore */ }
  }, []);

  const handleSend = useCallback(async () => {
    const text = input.trim();
    if (!text || sending) return;

    const tempMsg: Message = {
      id: Date.now(),
      role: 'user',
      content: text,
      created_at: new Date().toISOString(),
    };
    setMessages(prev => [...prev, tempMsg]);
    setInput('');
    setSending(true);

    try {
      const res = await sendChatMessage(text, conversationId ?? undefined);
      const assistantMsg: Message = {
        id: res.data.id,
        role: 'assistant',
        content: res.data.content,
        created_at: res.data.created_at,
      };

      // If this was a new conversation, capture the conversation_id
      if (!conversationId && res.data.id) {
        // The conversation_id comes from the response pattern
        // We need to extract it; for now load conversations to get it
        const convRes = await getChatConversations();
        if (convRes.data.length > 0) {
          setConversationId(convRes.data[0].id);
        }
      }

      setMessages(prev => [...prev, assistantMsg]);
    } catch {
      setMessages(prev => [
        ...prev,
        {
          id: Date.now() + 1,
          role: 'assistant',
          content: 'Sorry, I encountered an error. Please try again.',
          created_at: new Date().toISOString(),
        },
      ]);
    }
    setSending(false);
  }, [input, sending, conversationId]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const startNewChat = () => {
    setConversationId(null);
    setMessages([]);
    setShowHistory(false);
    setInput('');
  };

  const handleDeleteConversation = async (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await deleteChatConversation(id);
      setConversations(prev => prev.filter(c => c.id !== id));
      if (conversationId === id) {
        startNewChat();
      }
    } catch { /* ignore */ }
  };

  const formatTime = (dateStr: string) => {
    const d = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    if (diff < 60000) return 'Just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
  };


  return (
    <>
      {/* Floating chat button */}
      {!open && (
        <button
          onClick={() => { setOpen(true); loadConversations(); }}
          className="fixed z-50 flex items-center justify-center rounded-full shadow-lg transition-all duration-300 hover:scale-110"
          style={{
            bottom: '24px',
            right: '24px',
            width: '56px',
            height: '56px',
            background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
            color: 'white',
          }}
          title="AI Assistant"
        >
          <MessageSquare size={24} />
        </button>
      )}

      {/* Chat panel */}
      {open && (
        <div
          className="fixed z-50 flex flex-col shadow-2xl"
          style={{
            bottom: '24px',
            right: '24px',
            width: '420px',
            height: '600px',
            maxHeight: 'calc(100vh - 48px)',
            borderRadius: '16px',
            overflow: 'hidden',
            border: '1px solid #e2e8f0',
            background: '#ffffff',
          }}
        >
          {/* Header */}
          <div
            className="flex items-center gap-3 px-4 py-3 flex-shrink-0"
            style={{
              background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
              color: 'white',
            }}
          >
            {showHistory ? (
              <>
                <button onClick={() => setShowHistory(false)} className="hover:bg-white/20 rounded-lg p-1 transition-colors">
                  <ChevronLeft size={20} />
                </button>
                <span className="flex-1 font-semibold text-sm">Chat History</span>
              </>
            ) : (
              <>
                <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.2)' }}>
                  <Bot size={18} />
                </div>
                <div className="flex-1">
                  <div className="font-semibold text-sm">AI Assistant</div>
                  <div className="text-[11px] opacity-80">Powered by ApprentiTrack</div>
                </div>
              </>
            )}
            <button
              onClick={() => { setShowHistory(true); loadConversations(); }}
              className="hover:bg-white/20 rounded-lg px-2 py-1 text-xs transition-colors"
              title="Chat history"
            >
              History
            </button>
            <button
              onClick={startNewChat}
              className="hover:bg-white/20 rounded-lg p-1 transition-colors"
              title="New chat"
            >
              <Plus size={18} />
            </button>
            <button
              onClick={() => setOpen(false)}
              className="hover:bg-white/20 rounded-lg p-1 transition-colors"
              title="Close"
            >
              <X size={18} />
            </button>
          </div>

          {/* Body */}
          {showHistory ? (
            /* Conversation list */
            <div className="flex-1 overflow-auto p-3 space-y-2">
              {loadingHistory ? (
                <div className="flex items-center justify-center py-8">
                  <div className="w-6 h-6 border-2 border-slate-200 border-t-blue-500 rounded-full animate-spin" />
                </div>
              ) : conversations.length === 0 ? (
                <div className="text-center py-8 text-sm text-slate-400">
                  No conversations yet. Start a new chat!
                </div>
              ) : (
                conversations.map(conv => (
                  <div
                    key={conv.id}
                    onClick={() => loadConversation(conv.id)}
                    className="flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors hover:bg-slate-50 group"
                    style={{ border: '1px solid #f1f5f9' }}
                  >
                    <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: '#f1f5f9' }}>
                      <MessageSquare size={14} style={{ color: '#64748b' }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate" style={{ color: '#0f172a' }}>
                        {conv.title || 'Untitled'}
                      </div>
                      <div className="text-[11px]" style={{ color: '#94a3b8' }}>
                        {conv.message_count} messages · {formatTime(conv.updated_at || conv.created_at)}
                      </div>
                    </div>
                    <button
                      onClick={(e) => handleDeleteConversation(conv.id, e)}
                      className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-red-500 transition-all p-1 rounded"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))
              )}
            </div>
          ) : (
            /* Messages area */
            <div className="flex-1 overflow-auto p-4 space-y-4" style={{ background: '#fafafa' }}>
              {messages.length === 0 && (
                <div className="flex flex-col items-center justify-center h-full text-center px-6">
                  <div className="w-14 h-14 rounded-full flex items-center justify-center mb-4" style={{ background: '#f1f5f9' }}>
                    <Bot size={28} style={{ color: '#3b82f6' }} />
                  </div>
                  <h3 className="font-semibold text-sm mb-2" style={{ color: '#0f172a' }}>
                    How can I help?
                  </h3>
                  <p className="text-xs leading-relaxed" style={{ color: '#64748b' }}>
                    {roleConfig.description}
                  </p>
                  <div className="mt-4 space-y-2 w-full">
                    {roleConfig.suggestions.map((q, i) => (
                      <button
                        key={i}
                        onClick={() => { setInput(q); }}
                        className="w-full text-left px-3 py-2 rounded-lg text-xs transition-colors hover:bg-white"
                        style={{ color: '#475569', border: '1px solid #e2e8f0' }}
                      >
                        {q}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex gap-2.5 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}
                >
                  <div
                    className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5"
                    style={{
                      background: msg.role === 'user' ? '#3b82f6' : '#f1f5f9',
                    }}
                  >
                    {msg.role === 'user' ? (
                      <User size={14} style={{ color: 'white' }} />
                    ) : (
                      <Bot size={14} style={{ color: '#3b82f6' }} />
                    )}
                  </div>
                  <div
                    className="max-w-[80%] px-3.5 py-2.5 rounded-xl text-[13px] leading-relaxed"
                    style={{
                      background: msg.role === 'user' ? '#3b82f6' : 'white',
                      color: msg.role === 'user' ? 'white' : '#334155',
                      border: msg.role === 'assistant' ? '1px solid #e2e8f0' : 'none',
                      boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
                    }}
                  >
                    {msg.role === 'assistant' ? (
                      <div className="chat-markdown">
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>
                          {msg.content}
                        </ReactMarkdown>
                      </div>
                    ) : (
                      msg.content
                    )}
                  </div>
                </div>
              ))}

              {sending && (
                <div className="flex gap-2.5">
                  <div className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: '#f1f5f9' }}>
                    <Bot size={14} style={{ color: '#3b82f6' }} />
                  </div>
                  <div className="px-3.5 py-2.5 rounded-xl" style={{ background: 'white', border: '1px solid #e2e8f0' }}>
                    <div className="flex items-center gap-1">
                      <div className="w-2 h-2 rounded-full bg-slate-300 animate-bounce" style={{ animationDelay: '0ms' }} />
                      <div className="w-2 h-2 rounded-full bg-slate-300 animate-bounce" style={{ animationDelay: '150ms' }} />
                      <div className="w-2 h-2 rounded-full bg-slate-300 animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>
          )}

          {/* Input area */}
          {!showHistory && (
            <div className="flex-shrink-0 px-4 py-3" style={{ borderTop: '1px solid #e2e8f0', background: 'white' }}>
              <div className="flex items-end gap-2">
                <textarea
                  ref={inputRef}
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Ask about your data..."
                  rows={1}
                  className="flex-1 resize-none rounded-xl px-3.5 py-2.5 text-sm outline-none transition-all"
                  style={{
                    border: '1px solid #e2e8f0',
                    maxHeight: '100px',
                    color: '#334155',
                  }}
                  onFocus={e => { e.target.style.borderColor = '#3b82f6'; }}
                  onBlur={e => { e.target.style.borderColor = '#e2e8f0'; }}
                />
                <button
                  onClick={handleSend}
                  disabled={!input.trim() || sending}
                  className="flex items-center justify-center rounded-xl transition-all duration-200"
                  style={{
                    width: '40px',
                    height: '40px',
                    background: input.trim() && !sending ? '#3b82f6' : '#e2e8f0',
                    color: input.trim() && !sending ? 'white' : '#94a3b8',
                    cursor: input.trim() && !sending ? 'pointer' : 'not-allowed',
                  }}
                >
                  <Send size={18} />
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </>
  );
}
