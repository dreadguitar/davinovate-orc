import { useState, useRef, useEffect } from 'react';
import { Sparkles, X, Send, Loader2, Bot, Navigation, Volume2, Mic } from 'lucide-react';
import { api } from '../services/api';
import { useTranslation } from 'react-i18next';
import { useVoiceChat } from '../hooks/useVoiceChat';

interface SystemBotProps {
  onNavigate: (route: string) => void;
  onRefresh?: () => void;
}

type MessageRole = 'user' | 'assistant';

interface ChatMessage {
  role: MessageRole;
  content: string;
  action?: 'NAVIGATE' | 'NOTIFY' | 'CHAT' | 'CREATED' | 'CONFIRM';
  target?: string;
  type?: string;
}

// Simple markdown-like renderer: bold **text**, inline code `code`, and line breaks
const renderText = (text: string) => {
  const parts = text.split(/(\*\*.*?\*\*|`.*?`)/g);
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={i}>{part.slice(2, -2)}</strong>;
    }
    if (part.startsWith('`') && part.endsWith('`')) {
      return <code key={i} style={{ background: 'rgba(255,255,255,0.08)', padding: '0.1rem 0.35rem', borderRadius: '4px', fontSize: '0.8em', fontFamily: 'ui-monospace, monospace' }}>{part.slice(1, -1)}</code>;
    }
    // Convert newlines to <br>
    return part.split('\n').map((line, j, arr) => (
      <span key={`${i}-${j}`}>{line}{j < arr.length - 1 && <br />}</span>
    ));
  });
};

export const SystemBot = ({ onNavigate, onRefresh }: SystemBotProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { t, i18n } = useTranslation();

  const handleReply = (text: string, role: string) => {
      setMessages(prev => [...prev, { role: role as MessageRole, content: text, action: 'CHAT' }]);
      setIsLoading(false);
  };

  const handleAction = (action: string, target?: string) => {
      if (action === 'NAVIGATE' && target) {
          setTimeout(() => onNavigate(target), 600);
      }
      if (action === 'CREATED' && onRefresh) {
          onRefresh();
      }
  };

  const { isVoiceMode, toggleVoiceMode, isListening, startListening, sendText } = useVoiceChat({
      targetType: 'system',
      targetId: 'system',
      lang: i18n.language.startsWith('en') ? 'en' : 'es',
      onReply: handleReply,
      onAction: handleAction,
      onSpeechResult: (text) => handleSendMessage(text)
  });

  // Auto scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async (text?: string) => {
    const textToSend = text || input.trim();
    if (!textToSend || isLoading) return;

    const userMsg: ChatMessage = { role: 'user', content: textToSend };
    const updatedMessages = [...messages, userMsg];
    setMessages(updatedMessages);
    setInput('');
    setIsLoading(true);

    if (isVoiceMode) {
        sendText(textToSend, updatedMessages.slice(0, -1));
    } else {
        try {
          // Send conversation history so the AI has full context
          const history = updatedMessages.map(m => ({
            role: m.role,
            content: m.content
          }));

          const response = await api.post('/system/command', {
            message: textToSend,
            history: history.slice(0, -1) // exclude the new user message
          });

          const assistantMsg: ChatMessage = {
            role: 'assistant',
            content: response.text || 'Done!',
            action: response.action,
            target: response.target
          };

          setMessages(prev => [...prev, assistantMsg]);

          // Execute side effects
          if (response.action === 'NAVIGATE' && response.target) {
            setTimeout(() => onNavigate(response.target), 600);
          }

          if (response.action === 'CREATED' && onRefresh) {
            onRefresh();
          }
        } catch {
          setMessages(prev => [...prev, {
            role: 'assistant',
            content: t('chatError'),
            action: 'CHAT'
          }]);
        } finally {
          setIsLoading(false);
        }
    }
  };

  const handleSendForm = (e: React.FormEvent) => {
      e.preventDefault();
      handleSendMessage(input);
  };

  const handleOpen = () => {
    setIsOpen(true);
    // Add a greeting on first open
    if (messages.length === 0) {
      setMessages([{
        role: 'assistant',
        content: t('botGreeting'),
        action: 'CHAT'
      }]);
    }
  };

  return (
    <div className="system-bot-container">
      {!isOpen && (
        <button className="bot-fab" onClick={handleOpen} title={t('botTitle')}>
          <Sparkles size={22} />
        </button>
      )}

      {isOpen && (
        <div className="bot-panel">
          <div className="bot-header">
            <div className="bot-header-info">
              <Bot size={18} />
              {t('botTitle')}
            </div>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <button 
                  onClick={toggleVoiceMode} 
                  className={`tool-btn ${isVoiceMode ? 'active' : ''}`}
                  title="Toggle Voice Output (TTS)"
                  style={{ background: isVoiceMode ? 'rgba(0,0,0,0.1)' : 'transparent', border: 'none', cursor: 'pointer', borderRadius: '4px', padding: '4px' }}
                >
                  <Volume2 size={16} />
                </button>
                <button className="bot-close-btn" onClick={() => setIsOpen(false)}>
                  <X size={16} />
                </button>
            </div>
          </div>

          <div className="bot-messages">
            {messages.map((m, i) => (
              <div key={i} className={`bot-message ${m.role}`}>
                {m.role === 'assistant' && m.action === 'NAVIGATE' ? (
                  // Navigation action — distinct visual style
                  <div className="bot-bubble bot-action-bubble">
                    <Navigation size={13} style={{ flexShrink: 0, color: 'var(--accent)' }} />
                    <span>{renderText(m.content)}</span>
                  </div>
                ) : m.role === 'assistant' ? (
                  // Conversational reply
                  <div className="bot-bubble">
                    {renderText(m.content)}
                  </div>
                ) : (
                  // User message
                  <div className="bot-bubble">{m.content}</div>
                )}
              </div>
            ))}

            {isLoading && (
              <div className="bot-message bot">
                <div className="bot-bubble bot-typing-bubble">
                  <span className="bot-typing-dot" />
                  <span className="bot-typing-dot" />
                  <span className="bot-typing-dot" />
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          <div className="bot-input-area">
            {/* Suggestion chips */}
            {messages.length <= 1 && (
              <div className="bot-chips">
                {[t('botChipGoToAgents'), t('botChipWhatAreSkills'), t('botChipHowRagWorks')].map((chip) => (
                  <button
                    key={chip}
                    className="bot-chip"
                    onClick={() => {
                      setInput(chip);
                    }}
                  >
                    {chip}
                  </button>
                ))}
              </div>
            )}
            <form onSubmit={handleSendForm} className="bot-input-wrapper">
              <button
                type="button"
                onClick={() => startListening((text) => handleSendMessage(text))}
                className={`voice-btn ${isListening ? 'listening' : ''}`}
                style={{ padding: '0 8px', background: 'transparent', border: 'none', cursor: 'pointer', color: isListening ? 'var(--accent)' : 'inherit' }}
              >
                <Mic size={16} />
              </button>
              <input
                type="text"
                autoFocus
                className="bot-input"
                placeholder={t('botAskAnything')}
                value={input}
                onChange={(e) => setInput(e.target.value)}
              />
              <button type="submit" disabled={!input.trim() || isLoading} className="bot-send-btn">
                {isLoading ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
