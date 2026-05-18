import React, { useState, useEffect, useRef } from 'react';
import { Send, Bot, User, Loader2, Sparkles, Mic, Volume2 } from 'lucide-react';
import { api } from '../services/api';
import { useStore } from '../store/useStore';
import { useVoiceChat } from '../hooks/useVoiceChat';
import { useTranslation } from 'react-i18next';

export const ChatStudio: React.FC = () => {
  const { agents } = useStore();
  const [selectedAgentId, setSelectedAgentId] = useState<string>(agents[0]?.id || '');
  const [messages, setMessages] = useState<any[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);

  useEffect(() => {
    if (!selectedAgentId && agents.length > 0) {
      setSelectedAgentId(agents[0].id);
    }
  }, [agents, selectedAgentId]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { t, i18n } = useTranslation();

  const handleReply = (text: string, role: string) => {
      setMessages(prev => [...prev, { role, content: text }]);
      setIsLoading(false);
  };

  const { isVoiceMode, toggleVoiceMode, isListening, startListening, sendText } = useVoiceChat({
      targetType: 'agent',
      targetId: selectedAgentId,
      lang: i18n.language.startsWith('en') ? 'en' : 'es',
      onReply: handleReply,
      onSpeechResult: (text) => handleSendMessage(text)
  });

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async (text?: string) => {
    const messageToSend = text || input;
    if (!messageToSend.trim() || !selectedAgentId || isLoading) return;

    const userMessage = { role: 'user', content: messageToSend };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    if (isVoiceMode) {
        sendText(messageToSend, messages);
    } else {
        try {
          const response = await api.post('/chat/message', {
            agentId: selectedAgentId,
            message: messageToSend,
            conversationId
          });

          setConversationId(response.conversationId);
          setMessages(prev => [...prev, { role: 'assistant', content: response.reply }]);
        } catch (err) {
          console.error('Chat error:', err);
          setMessages(prev => [...prev, { role: 'assistant', content: t('chatError') }]);
        } finally {
          setIsLoading(false);
        }
    }
  };

  return (
    <div className="chat-studio glass">
      {/* Chat Header */}
      <header className="chat-header">
        <div className="header-agent">
          <div className="agent-icon-box">
            <Bot size={18} />
          </div>
          <select 
            className="agent-selector"
            value={selectedAgentId}
            onChange={(e) => { setSelectedAgentId(e.target.value); setMessages([]); setConversationId(null); }}
          >
            {agents.map(agent => (
              <option key={agent.id} value={agent.id}>{agent.name}</option>
            ))}
          </select>
        </div>
        
        <div className="header-tools">
          <button 
            onClick={toggleVoiceMode}
            className={`tool-btn ${isVoiceMode ? 'active' : ''}`}
            title="Toggle Voice Output (TTS)"
          >
            <Volume2 size={18} />
          </button>
          <div className="status-indicator">
            <Sparkles size={14} className="sparkle-icon" />
            <span>{t('ragActive')}</span>
          </div>
        </div>
      </header>

      {/* Messages Area */}
      <div className="chat-messages">
        {messages.length === 0 && (
          <div className="chat-empty-state">
            <Bot size={48} className="empty-icon-large" />
            <p className="empty-text">{t('selectAgentToStart')}</p>
          </div>
        )}
        
        {messages.map((m, i) => (
          <div key={i} className={`message-row ${m.role === 'user' ? 'user' : 'assistant'}`}>
            <div className="message-content-wrapper">
              <div className="message-avatar">
                {m.role === 'user' ? <User size={16} /> : <Bot size={16} />}
              </div>
              <div className="message-bubble">
                {m.content}
              </div>
            </div>
          </div>
        ))}
        
        {isLoading && (
          <div className="message-row assistant typing">
            <div className="message-content-wrapper">
              <div className="message-avatar">
                <Bot size={16} />
              </div>
              <div className="message-bubble typing-bubble">
                <Loader2 size={16} className="animate-spin" />
                <span>{t('thinking')}</span>
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Chat Input */}
      <footer className="chat-input-area">
        <form 
          onSubmit={(e) => { e.preventDefault(); handleSendMessage(); }} 
          className="input-wrapper"
        >
          <button
            type="button"
            onClick={() => startListening((text) => handleSendMessage(text))}
            className={`voice-btn ${isListening ? 'listening' : ''}`}
          >
            <Mic size={20} />
          </button>
          
          <div className="text-input-container">
            <input
              type="text"
              className="chat-input"
              placeholder={t('typeMessage')}
              value={input}
              onChange={(e) => setInput(e.target.value)}
            />
            <button 
              type="submit"
              disabled={!input.trim() || isLoading}
              className="send-btn"
            >
              <Send size={18} />
            </button>
          </div>
        </form>
      </footer>
    </div>
  );
};
