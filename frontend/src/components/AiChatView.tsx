'use client';

import { useState, useEffect, useRef } from 'react';
import api from '@/lib/api';
import Icon from '@/components/Icon';

type Session = {
  id: string;
  title: string | null;
  contractId: string | null;
  createdAt: string;
  updatedAt: string;
  _count: { messages: number };
};

type AiMessage = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt: string;
};

function fmtRelative(d: string) {
  const diff = Date.now() - new Date(d).getTime();
  const days = Math.floor(diff / 86400000);
  if (days === 0) return new Date(d).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });
  if (days === 1) return 'ayer';
  if (days < 7) return `hace ${days} días`;
  return new Date(d).toLocaleDateString('es-AR', { day: '2-digit', month: 'short' });
}

export default function AiChatView() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [messages, setMessages] = useState<AiMessage[]>([]);
  const [draft, setDraft] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingSessions, setLoadingSessions] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => { loadSessions(); }, []);

  useEffect(() => {
    if (selectedId) loadMessages(selectedId);
    else setMessages([]);
  }, [selectedId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  async function loadSessions() {
    try {
      setLoadingSessions(true);
      const res = await api.get('/ai-chat/sessions');
      const data: Session[] = res.data.data;
      setSessions(data);
      if (data.length > 0 && !selectedId) setSelectedId(data[0].id);
    } catch {}
    finally { setLoadingSessions(false); }
  }

  async function loadMessages(sessionId: string) {
    try {
      const res = await api.get(`/ai-chat/sessions/${sessionId}`);
      setMessages(res.data.data.messages ?? []);
    } catch {}
  }

  async function createSession() {
    try {
      const res = await api.post('/ai-chat/sessions', {});
      const s: Session = { ...res.data.data, _count: { messages: 0 } };
      setSessions(prev => [s, ...prev]);
      setSelectedId(s.id);
      setMessages([]);
    } catch {}
  }

  async function deleteSession(sessionId: string, e: React.MouseEvent) {
    e.stopPropagation();
    try {
      await api.delete(`/ai-chat/sessions/${sessionId}`);
      const remaining = sessions.filter(s => s.id !== sessionId);
      setSessions(remaining);
      if (selectedId === sessionId) {
        setSelectedId(remaining.length > 0 ? remaining[0].id : null);
      }
    } catch {}
  }

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    const content = draft.trim();
    if (!content || loading) return;

    let currentId = selectedId;
    if (!currentId) {
      try {
        const res = await api.post('/ai-chat/sessions', {});
        const s: Session = { ...res.data.data, _count: { messages: 0 } };
        setSessions(prev => [s, ...prev]);
        setSelectedId(s.id);
        currentId = s.id;
      } catch { return; }
    }

    setDraft('');
    setLoading(true);

    const tempId = 'tmp-' + Date.now();
    setMessages(prev => [...prev, { id: tempId, role: 'user', content, createdAt: new Date().toISOString() }]);

    try {
      const res = await api.post(`/ai-chat/sessions/${currentId}/messages`, { content });
      const { assistantMessage } = res.data.data;
      setMessages(prev => [
        ...prev,
        { id: assistantMessage.id, role: 'assistant', content: assistantMessage.content, createdAt: new Date().toISOString() },
      ]);
      // Refresh session list to update title + timestamp
      const listRes = await api.get('/ai-chat/sessions');
      setSessions(listRes.data.data);
    } catch {
      setMessages(prev => prev.filter(m => m.id !== tempId));
    } finally {
      setLoading(false);
    }
  }

  const selectedSession = sessions.find(s => s.id === selectedId);

  return (
    <div style={{ display: 'flex', gap: 16, height: 'calc(100vh - 170px)', minHeight: 420 }}>
      {/* Session list */}
      <div style={{
        width: 260,
        flexShrink: 0,
        background: 'var(--bg-card)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius)',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
      }}>
        <div style={{ padding: '10px 12px', borderBottom: '1px solid var(--border-light)' }}>
          <button
            onClick={createSession}
            style={{
              width: '100%',
              padding: '8px 12px',
              background: 'var(--accent)',
              color: '#fff',
              border: 'none',
              borderRadius: 'var(--radius-sm)',
              fontSize: 13,
              fontWeight: 700,
              cursor: 'pointer',
              fontFamily: 'var(--font)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
            }}
          >
            <Icon name="plus" size={14} color="#fff" />
            Nueva conversación
          </button>
        </div>

        <div style={{ overflowY: 'auto', flex: 1 }}>
          {loadingSessions ? (
            <div style={{ padding: 20, color: 'var(--text-muted)', fontSize: 13 }}>Cargando...</div>
          ) : sessions.length === 0 ? (
            <div style={{ padding: 20, color: 'var(--text-muted)', fontSize: 13 }}>
              Empezá una nueva conversación.
            </div>
          ) : sessions.map(s => (
            <div
              key={s.id}
              onClick={() => setSelectedId(s.id)}
              role="button"
              tabIndex={0}
              style={{
                display: 'block',
                width: '100%',
                textAlign: 'left',
                padding: '10px 12px',
                borderBottom: '1px solid var(--border-light)',
                background: s.id === selectedId ? 'var(--accent-bg)' : 'transparent',
                cursor: 'pointer',
                fontFamily: 'var(--font)',
                position: 'relative',
              }}
            >
              <div style={{
                fontSize: 13, fontWeight: 600, color: 'var(--text)',
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', paddingRight: 24,
              }}>
                {s.title ?? 'Nueva conversación'}
              </div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                {fmtRelative(s.updatedAt)} · {s._count.messages} msg
              </div>
              <button
                onClick={e => deleteSession(s.id, e)}
                title="Eliminar"
                style={{
                  position: 'absolute', right: 6, top: '50%', transform: 'translateY(-50%)',
                  background: 'none', border: 'none', cursor: 'pointer',
                  color: 'var(--text-muted)', padding: 4,
                }}
              >
                <Icon name="trash" size={12} />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Chat area */}
      <div style={{
        flex: 1,
        background: 'var(--bg-card)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}>
        {!selectedId ? (
          <div style={{
            flex: 1, display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center', gap: 16, padding: 24,
          }}>
            <div style={{ fontSize: 48 }}>🤖</div>
            <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--text)' }}>Asistente IA de Rently</div>
            <div style={{ fontSize: 14, color: 'var(--text-secondary)', textAlign: 'center', maxWidth: 400, lineHeight: 1.6 }}>
              Preguntame sobre tus propiedades, contratos, pagos, reclamos o cualquier consulta de alquiler.
            </div>
            <button
              onClick={createSession}
              style={{
                padding: '10px 28px', background: 'var(--accent)', color: '#fff',
                border: 'none', borderRadius: 'var(--radius-sm)', fontSize: 14,
                fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font)',
              }}
            >
              Empezar conversación
            </button>
          </div>
        ) : (
          <>
            {/* Header */}
            <div style={{
              padding: '12px 18px', borderBottom: '1px solid var(--border-light)',
              display: 'flex', alignItems: 'center', gap: 10,
            }}>
              <div style={{
                width: 32, height: 32, borderRadius: '50%',
                background: 'var(--accent-bg)', display: 'flex',
                alignItems: 'center', justifyContent: 'center', fontSize: 16, flexShrink: 0,
              }}>
                🤖
              </div>
              <div>
                <div style={{ fontWeight: 700, fontSize: 14 }}>
                  {selectedSession?.title ?? 'Asistente IA'}
                </div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Rently AI · Llama 3.3</div>
              </div>
            </div>

            {/* Messages */}
            <div style={{
              flex: 1, overflowY: 'auto', padding: 18,
              display: 'flex', flexDirection: 'column', gap: 12,
            }}>
              {messages.length === 0 && !loading ? (
                <div style={{ margin: 'auto', textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
                  Escribí tu consulta para empezar.
                </div>
              ) : messages.map(m => (
                <div
                  key={m.id}
                  style={{
                    alignSelf: m.role === 'user' ? 'flex-end' : 'flex-start',
                    maxWidth: '78%',
                    display: 'flex',
                    gap: 8,
                    flexDirection: m.role === 'user' ? 'row-reverse' : 'row',
                    alignItems: 'flex-start',
                  }}
                >
                  {m.role === 'assistant' && (
                    <div style={{
                      width: 28, height: 28, borderRadius: '50%',
                      background: 'var(--accent-bg)', display: 'flex',
                      alignItems: 'center', justifyContent: 'center',
                      fontSize: 14, flexShrink: 0, marginTop: 2,
                    }}>
                      🤖
                    </div>
                  )}
                  <div style={{
                    background: m.role === 'user' ? 'var(--accent)' : 'var(--bg-elevated)',
                    color: m.role === 'user' ? '#fff' : 'var(--text)',
                    padding: '10px 14px',
                    borderRadius: 12,
                    fontSize: 14,
                    lineHeight: 1.6,
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-word',
                  }}>
                    {m.content}
                  </div>
                </div>
              ))}

              {loading && (
                <div style={{ alignSelf: 'flex-start', display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                  <div style={{
                    width: 28, height: 28, borderRadius: '50%',
                    background: 'var(--accent-bg)', display: 'flex',
                    alignItems: 'center', justifyContent: 'center', fontSize: 14,
                  }}>
                    🤖
                  </div>
                  <div style={{
                    background: 'var(--bg-elevated)', padding: '10px 14px',
                    borderRadius: 12, fontSize: 14, color: 'var(--text-muted)',
                  }}>
                    Pensando...
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <form
              onSubmit={handleSend}
              style={{
                display: 'flex', gap: 8, padding: 12,
                borderTop: '1px solid var(--border-light)',
              }}
            >
              <input
                value={draft}
                onChange={e => setDraft(e.target.value)}
                placeholder="Hacé una consulta a la IA..."
                maxLength={4000}
                disabled={loading}
                style={{
                  flex: 1, padding: '10px 14px',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: 14, fontFamily: 'var(--font)',
                  background: loading ? 'var(--bg-elevated)' : undefined,
                }}
              />
              <button
                type="submit"
                disabled={!draft.trim() || loading}
                style={{
                  padding: '10px 18px',
                  background: 'var(--accent)', color: '#fff',
                  border: 'none', borderRadius: 'var(--radius-sm)',
                  fontSize: 14, fontWeight: 700,
                  cursor: draft.trim() && !loading ? 'pointer' : 'not-allowed',
                  opacity: draft.trim() && !loading ? 1 : 0.5,
                  fontFamily: 'var(--font)',
                }}
              >
                {loading ? '...' : 'Enviar'}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
