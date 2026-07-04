'use client';

import { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { usePathname } from 'next/navigation';
import api from '@/lib/api';
import { i18n } from '@/lib/i18n';
import Icon from '@/components/Icon';

type AiMessage = { id: string; role: 'user' | 'assistant'; content: string };

// Mapea la ruta actual a una clave de etiqueta para darle contexto a la IA.
// El orden importa: las rutas más específicas van primero.
const PAGE_LABELS: [prefix: string, labelKey: string][] = [
  ['/tenant/contract', 'aiPageLabels.tenantContract'],
  ['/tenant/payments', 'aiPageLabels.tenantPayments'],
  ['/tenant/claims', 'aiPageLabels.tenantClaims'],
  ['/tenant/expensas', 'aiPageLabels.tenantExpensas'],
  ['/tenant/chat', 'aiPageLabels.tenantChat'],
  ['/tenant/settings', 'aiPageLabels.tenantSettings'],
  ['/tenant', 'aiPageLabels.tenantHome'],
  ['/properties', 'aiPageLabels.properties'],
  ['/payments', 'aiPageLabels.payments'],
  ['/claims', 'aiPageLabels.claims'],
  ['/adjustments', 'aiPageLabels.adjustments'],
  ['/performance', 'aiPageLabels.performance'],
  ['/reports', 'aiPageLabels.reports'],
  ['/photos', 'aiPageLabels.photos'],
  ['/professionals', 'aiPageLabels.professionals'],
  ['/chat', 'aiPageLabels.chat'],
  ['/settings', 'aiPageLabels.settings'],
];

function pageLabelFromPath(path: string): string {
  if (path === '/') return i18n.t('chat:aiPageLabels.ownerHome');
  const match = PAGE_LABELS.find(([prefix]) => path === prefix || path.startsWith(prefix + '/'));
  return match ? i18n.t(`chat:${match[1]}`) : 'Rently';
}

export default function AiAssistantWidget() {
  const { t } = useTranslation('chat');
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [initialized, setInitialized] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<AiMessage[]>([]);
  const [draft, setDraft] = useState('');
  const [loading, setLoading] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  // La página dedicada /ai-chat ya tiene el chat completo; ahí ocultamos la burbuja.
  const hidden = pathname === '/ai-chat' || pathname === '/tenant/ai-chat';

  useEffect(() => {
    if (open && !initialized) init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading, open]);

  async function init() {
    setInitialized(true);
    try {
      const res = await api.get('/ai-chat/sessions');
      const data = res.data.data;
      if (data.length > 0) {
        setSessionId(data[0].id);
        const m = await api.get(`/ai-chat/sessions/${data[0].id}`);
        setMessages(m.data.data.messages ?? []);
      }
    } catch {}
  }

  async function send(rawContent: string) {
    const content = rawContent.trim();
    if (!content || loading) return;

    let currentId = sessionId;
    if (!currentId) {
      try {
        const res = await api.post('/ai-chat/sessions', {});
        currentId = res.data.data.id;
        setSessionId(currentId);
      } catch { return; }
    }

    setDraft('');
    setLoading(true);
    const tempId = 'tmp-' + Date.now();
    setMessages(prev => [...prev, { id: tempId, role: 'user', content }]);

    try {
      const res = await api.post(`/ai-chat/sessions/${currentId}/messages`, {
        content,
        page: pageLabelFromPath(pathname),
      });
      const { assistantMessage } = res.data.data;
      setMessages(prev => [
        ...prev,
        { id: assistantMessage.id, role: 'assistant', content: assistantMessage.content },
      ]);
    } catch {
      setMessages(prev => prev.filter(m => m.id !== tempId));
    } finally {
      setLoading(false);
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    send(draft);
  }

  if (hidden) return null;

  return (
    <>
      {/* Panel */}
      {open && (
        <div
          style={{
            position: 'fixed',
            bottom: 88,
            right: 20,
            width: 'min(380px, calc(100vw - 32px))',
            height: 'min(540px, calc(100vh - 140px))',
            background: 'var(--bg-card)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius)',
            boxShadow: '0 12px 40px rgba(0,0,0,0.18)',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            zIndex: 1000,
          }}
        >
          {/* Header */}
          <div style={{
            padding: '12px 16px',
            borderBottom: '1px solid var(--border-light)',
            display: 'flex', alignItems: 'center', gap: 10,
          }}>
            <div style={{
              width: 32, height: 32, borderRadius: '50%',
              background: 'var(--accent-bg)', display: 'flex',
              alignItems: 'center', justifyContent: 'center', fontSize: 16, flexShrink: 0,
            }}>🤖</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 700, fontSize: 14 }}>{t('ai.title')}</div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{t('ai.subtitle')}</div>
            </div>
            <button
              onClick={() => setOpen(false)}
              aria-label={t('common:close')}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 4 }}
            >
              <Icon name="x" size={18} />
            </button>
          </div>

          {/* Messages */}
          <div style={{
            flex: 1, overflowY: 'auto', padding: 14,
            display: 'flex', flexDirection: 'column', gap: 10,
          }}>
            {messages.length === 0 && !loading ? (
              <div style={{ margin: 'auto', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, maxWidth: 300 }}>
                <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>{t('ai.emptyHint')}</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, justifyContent: 'center' }}>
                  {(['howToApp', 'contracts', 'index'] as const).map(key => {
                    const text = t(`ai.suggestions.${key}`);
                    return (
                      <button
                        key={key}
                        type="button"
                        onClick={() => send(text)}
                        style={{
                          padding: '7px 11px', background: 'var(--bg-elevated)',
                          border: '1px solid var(--border)', borderRadius: 999,
                          fontSize: 12, color: 'var(--text-secondary)', cursor: 'pointer',
                          fontFamily: 'var(--font)',
                        }}
                      >
                        {text}
                      </button>
                    );
                  })}
                </div>
              </div>
            ) : messages.map(m => (
              <div
                key={m.id}
                style={{
                  alignSelf: m.role === 'user' ? 'flex-end' : 'flex-start',
                  maxWidth: '85%',
                  background: m.role === 'user' ? 'var(--accent)' : 'var(--bg-elevated)',
                  color: m.role === 'user' ? '#fff' : 'var(--text)',
                  padding: '9px 13px', borderRadius: 12,
                  fontSize: 13.5, lineHeight: 1.55,
                  whiteSpace: 'pre-wrap', wordBreak: 'break-word',
                }}
              >
                {m.content}
              </div>
            ))}
            {loading && (
              <div style={{
                alignSelf: 'flex-start', background: 'var(--bg-elevated)',
                padding: '9px 13px', borderRadius: 12, fontSize: 13, color: 'var(--text-muted)',
              }}>
                {t('ai.thinking')}
              </div>
            )}
            <div ref={endRef} />
          </div>

          {/* Input */}
          <form
            onSubmit={handleSubmit}
            style={{ display: 'flex', gap: 8, padding: 10, borderTop: '1px solid var(--border-light)' }}
          >
            <input
              value={draft}
              onChange={e => setDraft(e.target.value)}
              placeholder={t('ai.inputPlaceholder')}
              maxLength={4000}
              disabled={loading}
              style={{
                flex: 1, padding: '9px 12px', border: '1px solid var(--border)',
                borderRadius: 'var(--radius-sm)', fontSize: 13.5, fontFamily: 'var(--font)',
                background: loading ? 'var(--bg-elevated)' : undefined,
              }}
            />
            <button
              type="submit"
              disabled={!draft.trim() || loading}
              style={{
                padding: '9px 14px', background: 'var(--accent)', color: '#fff',
                border: 'none', borderRadius: 'var(--radius-sm)', fontSize: 13.5, fontWeight: 700,
                cursor: draft.trim() && !loading ? 'pointer' : 'not-allowed',
                opacity: draft.trim() && !loading ? 1 : 0.5, fontFamily: 'var(--font)',
              }}
            >
              {loading ? '...' : t('send')}
            </button>
          </form>
        </div>
      )}

      {/* Floating button */}
      <button
        onClick={() => setOpen(o => !o)}
        aria-label={t('ai.title')}
        style={{
          position: 'fixed', bottom: 20, right: 20,
          width: 56, height: 56, borderRadius: '50%',
          background: 'var(--accent)', color: '#fff', border: 'none',
          boxShadow: '0 6px 20px rgba(0,0,0,0.22)', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 24, zIndex: 1000,
        }}
      >
        {open ? <Icon name="x" size={22} color="#fff" /> : '🤖'}
      </button>
    </>
  );
}
