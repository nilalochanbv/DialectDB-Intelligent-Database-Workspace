import React, { useState, useRef, useEffect } from 'react';
import { Send, Sparkles, Copy, Play, ArrowUpRight, MessageSquare, Trash2, ArrowRight } from 'lucide-react';

interface ChatMessage {
  id: string;
  sender: 'user' | 'assistant';
  text: string; // Plain string or markdown explanation
  sql?: string | null; // SQL query generated
  optimizations?: string | null;
  suggested_questions?: string[];
}

interface AiAssistantProps {
  chatMessages: ChatMessage[];
  setChatMessages: React.Dispatch<React.SetStateAction<ChatMessage[]>>;
  onSendMessage: (msg: string) => void;
  isGenerating: boolean;
  onOpenInEditor: (sql: string) => void;
  onExecuteSql: (sql: string) => void;
}

export const AiAssistant: React.FC<AiAssistantProps> = ({
  chatMessages,
  setChatMessages,
  onSendMessage,
  isGenerating,
  onOpenInEditor,
  onExecuteSql
}) => {
  const [input, setInput] = useState('');
  const chatEndRef = useRef<HTMLDivElement>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Auto-scroll to bottom of chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages, isGenerating]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isGenerating) return;
    onSendMessage(input.trim());
    setInput('');
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const clearChat = () => {
    setChatMessages([]);
  };

  const suggestedPrompts = [
    { label: "Show customers from Chennai", text: "Show all customers from Chennai" },
    { label: "இந்த மாதத்தில் அதிக வாங்கியவர்", text: "இந்த மாதத்தில் அதிகமாக வாங்கிய வாடிக்கையாளர்களைக் காட்டு" },
    { label: "last month la top 5 customers", text: "last month la top 5 customers kaatu" },
    { label: "Mostrar todos los clientes", text: "Mostrar todos los clientes" },
    { label: "顧客一覧を表示", text: "顧客一覧を表示してください" }
  ];

  return (
    <div style={{ display: 'grid', gridTemplateRows: '1fr auto', height: '100%', overflow: 'hidden', background: 'var(--bg-primary)' }}>
      {/* Chat Messages Log */}
      <div style={{ overflowY: 'auto', padding: '20px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
        {chatMessages.length === 0 ? (
          /* Empty State / Welcome Screen */
          <div style={{ maxWidth: '600px', margin: 'auto', textAlign: 'center', padding: '40px 20px' }} className="animate-slide-in">
            <div style={{ display: 'inline-flex', padding: '12px', background: 'var(--border-glow)', borderRadius: '16px', color: 'var(--accent-purple)', marginBottom: '16px' }} className="glowing-card">
              <Sparkles size={32} />
            </div>
            <h2 style={{ fontSize: '22px', fontWeight: 700, marginBottom: '8px', background: 'linear-gradient(90deg, #a78bfa, #60a5fa)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              Welcome to DialectDB AI Assistant
            </h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginBottom: '32px' }}>
              Ask questions in any language. The AI will translate your request into database-optimized SQL statements and explain the execution path.
            </p>

            <div style={{ textAlign: 'left', marginBottom: '24px' }}>
              <span style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600, letterSpacing: '1px', display: 'block', marginBottom: '10px' }}>Suggested Prompts</span>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {suggestedPrompts.map((p, idx) => (
                  <button
                    key={idx}
                    onClick={() => onSendMessage(p.text)}
                    className="btn-secondary"
                    style={{ fontSize: '13px', padding: '8px 12px', borderRadius: '20px', display: 'flex', alignItems: 'center', gap: '6px' }}
                  >
                    <span>{p.label}</span>
                    <ArrowRight size={12} style={{ color: 'var(--accent-purple)' }} />
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : (
          /* Message thread */
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', width: '100%', maxWidth: '800px', margin: '0 auto' }}>
            <div style={{ display: 'flex', justifyContent: 'flex-end', borderBottom: '1px solid var(--border-color)', paddingBottom: '8px' }}>
              <button 
                onClick={clearChat}
                style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                <Trash2 size={12} /> Clear Chat History
              </button>
            </div>
            
            {chatMessages.map((msg) => (
              <div 
                key={msg.id} 
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: msg.sender === 'user' ? 'flex-end' : 'flex-start',
                  width: '100%'
                }}
              >
                {/* Message Bubble wrapper */}
                <div 
                  style={{
                    maxWidth: '85%',
                    padding: '12px 16px',
                    borderRadius: '12px',
                    background: msg.sender === 'user' ? 'var(--accent-purple)' : 'var(--bg-secondary)',
                    border: msg.sender === 'user' ? 'none' : '1px solid var(--border-color)',
                    color: '#fff',
                    boxShadow: 'var(--shadow-sm)'
                  }}
                  className="animate-slide-in"
                >
                  {/* Markdown/Text body */}
                  <div style={{ fontSize: '14px', whiteSpace: 'pre-wrap', lineHeight: '1.6' }}>
                    {msg.text}
                  </div>

                  {/* Generated SQL block */}
                  {msg.sql && (
                    <div style={{ marginTop: '12px', background: 'rgba(0,0,0,0.3)', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.06)', overflow: 'hidden' }}>
                      {/* SQL Header controls */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.02)', padding: '6px 12px', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                        <span style={{ fontSize: '11px', fontFamily: 'JetBrains Mono, monospace', color: 'var(--accent-purple-hover)' }}>SQL GENERATED</span>
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <button 
                            onClick={() => copyToClipboard(msg.sql!, msg.id)}
                            style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '11px', display: 'flex', alignItems: 'center', gap: '4px' }}
                            title="Copy Query"
                          >
                            <Copy size={12} /> {copiedId === msg.id ? 'Copied!' : 'Copy'}
                          </button>
                          <button 
                            onClick={() => onOpenInEditor(msg.sql!)}
                            style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '11px', display: 'flex', alignItems: 'center', gap: '4px' }}
                            title="Open in SQL Editor"
                          >
                            <ArrowUpRight size={12} /> Edit
                          </button>
                          <button 
                            onClick={() => onExecuteSql(msg.sql!)}
                            style={{ background: 'transparent', border: 'none', color: 'var(--accent-emerald)', cursor: 'pointer', fontSize: '11px', display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 600 }}
                            title="Run SQL statement immediately"
                          >
                            <Play size={12} fill="var(--accent-emerald)" /> Run
                          </button>
                        </div>
                      </div>
                      {/* SQL Code */}
                      <pre style={{ margin: 0, padding: '12px', fontFamily: 'JetBrains Mono, monospace', fontSize: '13px', overflowX: 'auto', color: '#e0f2fe', lineHeight: '1.5' }}>
                        {msg.sql}
                      </pre>
                    </div>
                  )}

                  {/* SQL optimizations */}
                  {msg.optimizations && (
                    <div style={{ marginTop: '8px', padding: '8px 12px', background: 'rgba(59,130,246,0.05)', border: '1px solid rgba(59,130,246,0.1)', borderRadius: '6px', fontSize: '12px', color: 'var(--text-secondary)' }}>
                      <strong style={{ color: 'var(--accent-blue)', display: 'block', marginBottom: '2px' }}>AI Suggestion:</strong>
                      {msg.optimizations}
                    </div>
                  )}
                </div>

                {/* Follow up suggestions pills */}
                {msg.sender === 'assistant' && msg.suggested_questions && msg.suggested_questions.length > 0 && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '8px', maxWidth: '85%' }}>
                    {msg.suggested_questions.map((q, qIdx) => (
                      <button
                        key={qIdx}
                        onClick={() => onSendMessage(q)}
                        style={{
                          background: 'var(--bg-secondary)',
                          border: '1px solid var(--border-color)',
                          color: 'var(--text-secondary)',
                          fontSize: '12px',
                          padding: '6px 12px',
                          borderRadius: '16px',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px'
                        }}
                        className="glass-interactive"
                      >
                        <MessageSquare size={10} style={{ color: 'var(--accent-purple)' }} />
                        <span>{q}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}

            {/* AI is thinking indicator */}
            {isGenerating && (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', padding: '12px 16px', borderRadius: '12px' }} className="glass">
                  <div style={{ display: 'flex', gap: '4px' }}>
                    <span className="animate-bounce" style={{ width: '6px', height: '6px', background: 'var(--accent-purple)', borderRadius: '50%', animationDelay: '0ms' }}></span>
                    <span className="animate-bounce" style={{ width: '6px', height: '6px', background: 'var(--accent-purple)', borderRadius: '50%', animationDelay: '150ms' }}></span>
                    <span className="animate-bounce" style={{ width: '6px', height: '6px', background: 'var(--accent-purple)', borderRadius: '50%', animationDelay: '300ms' }}></span>
                  </div>
                  <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>AI Assistant is thinking...</span>
                </div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>
        )}
      </div>

      {/* Input bar */}
      <form onSubmit={handleSubmit} style={{ borderTop: '1px solid var(--border-color)', padding: '16px 24px', background: 'rgba(11, 15, 25, 0.9)', backdropFilter: 'blur(8px)' }}>
        <div style={{ position: 'relative', maxWidth: '800px', margin: '0 auto', display: 'flex', gap: '10px' }}>
          <input
            type="text"
            placeholder="Ask AI Assistant anything about the database..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={isGenerating}
            className="input-base"
            style={{ flex: 1, paddingRight: '40px', height: '44px', borderRadius: '10px' }}
          />
          <button
            type="submit"
            disabled={isGenerating || !input.trim()}
            className="btn-primary"
            style={{ width: '44px', height: '44px', padding: 0, justifyContent: 'center', borderRadius: '10px', flexShrink: 0 }}
          >
            <Send size={16} />
          </button>
        </div>
      </form>
    </div>
  );
};
