'use client';

import { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import Icon from '@/components/Icon';

type Conversation = {
  contractId: string;
  propertyName: string | null;
  propertyAddress: string;
  otherPartyName: string;
  otherPartyRole: 'OWNER' | 'TENANT';
  lastMessage: string | null;
  lastMessageAt: string | null;
  unreadCount: number;
};

type Message = {
  id: string;
  body: string;
  senderId: string;
  senderName: string;
  mine: boolean;
  readAt: string | null;
  createdAt: string;
};

function fmtTime(d: string) {
  return new Date(d).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });
}

export default function ChatView() {
  const queryClient = useQueryClient();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [draft, setDraft] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { data: conversations = [], isLoading: convLoading } = useQuery<Conversation[]>({
    queryKey: ['chat-conversations'],
    queryFn: async () => (await api.get('/chat/conversations')).data.data,
    refetchInterval: 5000,
  });

  // Auto-select the first conversation once the list loads.
  useEffect(() => {
    if (!selectedId && conversations.length > 0) {
      setSelectedId(conversations[0].contractId);
    }
  }, [conversations, selectedId]);

  const { data: messages = [] } = useQuery<Message[]>({
    queryKey: ['chat-messages', selectedId],
    queryFn: async () => (await api.get(`/chat/conversations/${selectedId}/messages`)).data.data,
    enabled: !!selectedId,
    refetchInterval: 3000,
  });

  const markRead = useMutation({
    mutationFn: (contractId: string) => api.put(`/chat/conversations/${contractId}/read`),
    onSuccess: (_d, contractId) => {
      queryClient.invalidateQueries({ queryKey: ['chat-messages', contractId] });
      queryClient.invalidateQueries({ queryKey: ['chat-conversations'] });
    },
  });

  const sendMessage = useMutation({
    mutationFn: (body: string) =>
      api.post(`/chat/conversations/${selectedId}/messages`, { body }),
    onSuccess: () => {
      setDraft('');
      queryClient.invalidateQueries({ queryKey: ['chat-messages', selectedId] });
      queryClient.invalidateQueries({ queryKey: ['chat-conversations'] });
    },
  });

  // Mark incoming messages as read when viewing a conversation.
  useEffect(() => {
    if (!selectedId) return;
    if (messages.some((m) => !m.mine && !m.readAt)) {
      markRead.mutate(selectedId);
    }
  }, [selectedId, messages]); // eslint-disable-line react-hooks/exhaustive-deps

  // Keep the view scrolled to the latest message.
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const selected = conversations.find((c) => c.contractId === selectedId);

  function handleSend(e: React.FormEvent) {
    e.preventDefault();
    const body = draft.trim();
    if (!body || sendMessage.isPending) return;
    sendMessage.mutate(body);
  }

  return (
    <div
      style={{
        display: 'flex',
        gap: 16,
        height: 'calc(100vh - 170px)',
        minHeight: 420,
      }}
    >
      {/* Conversation list */}
      <div
        style={{
          width: 280,
          flexShrink: 0,
          background: 'var(--bg-card)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border-light)', fontWeight: 700, fontSize: 14 }}>
          Conversaciones
        </div>
        <div style={{ overflowY: 'auto', flex: 1 }}>
          {convLoading ? (
            <div style={{ padding: 20, color: 'var(--text-muted)', fontSize: 13 }}>Cargando...</div>
          ) : conversations.length === 0 ? (
            <div style={{ padding: 20, color: 'var(--text-muted)', fontSize: 13 }}>
              No tenés conversaciones todavía.
            </div>
          ) : (
            conversations.map((c) => (
              <button
                key={c.contractId}
                onClick={() => setSelectedId(c.contractId)}
                style={{
                  display: 'block',
                  width: '100%',
                  textAlign: 'left',
                  padding: '12px 16px',
                  border: 'none',
                  borderBottom: '1px solid var(--border-light)',
                  background: c.contractId === selectedId ? 'var(--accent-bg)' : 'transparent',
                  cursor: 'pointer',
                  fontFamily: 'var(--font)',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontWeight: 700, fontSize: 13, color: 'var(--text)' }}>
                    {c.otherPartyName}
                  </span>
                  {c.unreadCount > 0 && (
                    <span
                      style={{
                        minWidth: 18,
                        height: 18,
                        borderRadius: 999,
                        background: 'var(--danger)',
                        color: '#fff',
                        fontSize: 11,
                        fontWeight: 700,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: '0 5px',
                      }}
                    >
                      {c.unreadCount}
                    </span>
                  )}
                </div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
                  {c.propertyName ?? c.propertyAddress}
                </div>
                {c.lastMessage && (
                  <div
                    style={{
                      fontSize: 12,
                      color: 'var(--text-secondary)',
                      marginTop: 4,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {c.lastMessage}
                  </div>
                )}
              </button>
            ))
          )}
        </div>
      </div>

      {/* Message thread */}
      <div
        style={{
          flex: 1,
          background: 'var(--bg-card)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        {!selected ? (
          <div
            style={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--text-muted)',
              fontSize: 14,
            }}
          >
            Elegí una conversación para empezar a chatear.
          </div>
        ) : (
          <>
            <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--border-light)' }}>
              <div style={{ fontWeight: 700, fontSize: 15 }}>{selected.otherPartyName}</div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                {selected.otherPartyRole === 'TENANT' ? 'Inquilino' : 'Propietario'} ·{' '}
                {selected.propertyName ?? selected.propertyAddress}
              </div>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', padding: 18, display: 'flex', flexDirection: 'column', gap: 8 }}>
              {messages.length === 0 ? (
                <div style={{ margin: 'auto', color: 'var(--text-muted)', fontSize: 13 }}>
                  No hay mensajes. ¡Escribí el primero!
                </div>
              ) : (
                messages.map((m) => (
                  <div
                    key={m.id}
                    style={{
                      alignSelf: m.mine ? 'flex-end' : 'flex-start',
                      maxWidth: '72%',
                      background: m.mine ? 'var(--accent)' : 'var(--bg-elevated)',
                      color: m.mine ? '#fff' : 'var(--text)',
                      padding: '8px 12px',
                      borderRadius: 12,
                    }}
                  >
                    <div style={{ fontSize: 14, lineHeight: 1.4, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                      {m.body}
                    </div>
                    <div
                      style={{
                        fontSize: 10,
                        marginTop: 3,
                        textAlign: 'right',
                        color: m.mine ? 'rgba(255,255,255,0.7)' : 'var(--text-muted)',
                      }}
                    >
                      {fmtTime(m.createdAt)}
                    </div>
                  </div>
                ))
              )}
              <div ref={messagesEndRef} />
            </div>

            <form
              onSubmit={handleSend}
              style={{
                display: 'flex',
                gap: 8,
                padding: 12,
                borderTop: '1px solid var(--border-light)',
              }}
            >
              <input
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder="Escribí un mensaje..."
                maxLength={2000}
                style={{
                  flex: 1,
                  padding: '10px 14px',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: 14,
                  fontFamily: 'var(--font)',
                }}
              />
              <button
                type="submit"
                disabled={!draft.trim() || sendMessage.isPending}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '10px 18px',
                  background: 'var(--accent)',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: 14,
                  fontWeight: 700,
                  cursor: draft.trim() ? 'pointer' : 'not-allowed',
                  opacity: draft.trim() && !sendMessage.isPending ? 1 : 0.5,
                  fontFamily: 'var(--font)',
                }}
              >
                Enviar
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
