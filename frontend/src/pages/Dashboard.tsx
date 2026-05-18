import React, { useState, useEffect } from 'react';
import { useStore } from '../store/useStore';
import { api } from '../services/api';
import { useTranslation } from 'react-i18next';
import {
  Bot,
  Brain,
  Database,
  MessageSquare,
  Plus,
  LogOut,
  User as UserIcon,
  ChevronRight,
  Code2,
  Globe,
  Menu,
  X
} from 'lucide-react';
import { AgentModal } from '../components/AgentModal';
import { SkillModal } from '../components/SkillModal';
import { KnowledgeManager } from '../components/KnowledgeManager';
import { ChatStudio } from '../components/ChatStudio';
import { SystemBot } from '../components/SystemBot';

export const Dashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'agents' | 'skills' | 'knowledge' | 'chat'>('agents');
  const [showAgentModal, setShowAgentModal] = useState(false);
  const [showSkillModal, setShowSkillModal] = useState(false);
  const [selectedAgent, setSelectedAgent] = useState<any>(null);
  const [selectedSkill, setSelectedSkill] = useState<any>(null);

  const { user, logout, setAgents, setSkills, agents, skills } = useStore();
  const { t, i18n } = useTranslation();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const fetchData = async () => {
    try {
      const [agentsData, skillsData] = await Promise.all([
        api.get('/agents'),
        api.get('/skills')
      ]);
      setAgents(agentsData);
      setSkills(skillsData);
    } catch (err) {
      console.error('Fetch error:', err);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCreateNew = () => {
    if (activeTab === 'agents') {
      setSelectedAgent(null);
      setShowAgentModal(true);
    } else if (activeTab === 'skills') {
      setSelectedSkill(null);
      setShowSkillModal(true);
    }
  };

  const toggleLanguage = () => {
    const nextLang = i18n.language.startsWith('en') ? 'es' : 'en';
    i18n.changeLanguage(nextLang);
  };

  return (
    <div className={`dashboard-layout ${isSidebarOpen ? 'sidebar-open' : ''}`}>
      {/* Mobile Top Header */}
      <header className="mobile-top-header">
        <div className="sidebar-brand">
          <div className="brand-logo">
            <Bot size={18} />
          </div>
          <span className="brand-name">Orchestrator</span>
        </div>
        <button className="menu-toggle-btn" onClick={() => setIsSidebarOpen(true)}>
          <Menu size={24} />
        </button>
      </header>

      {/* Sidebar Overlay (Mobile) */}
      {isSidebarOpen && (
        <div className="sidebar-overlay" onClick={() => setIsSidebarOpen(false)} />
      )}

      {/* Sidebar - Glassmorphic */}
      <aside className={`dashboard-sidebar glass ${isSidebarOpen ? 'open' : ''}`} style={{ display: 'flex', flexDirection: 'column' }}>
        <div className="sidebar-header-mobile">
          <div className="sidebar-brand">
            <div className="brand-logo">
              <Bot size={20} />
            </div>
            <span className="brand-name">Orchestrator</span>
          </div>
          <button className="close-sidebar-btn" onClick={() => setIsSidebarOpen(false)}>
            <X size={20} />
          </button>
        </div>

        <div className="sidebar-brand desktop-only">
          <div className="brand-logo">
            <Bot size={20} />
          </div>
          <span className="brand-name">Orchestrator</span>
        </div>

        <nav className="sidebar-nav">
          <SidebarItem
            icon={<Bot size={18} />}
            label={t('agents')}
            active={activeTab === 'agents'}
            onClick={() => { setActiveTab('agents'); setIsSidebarOpen(false); }}
          />
          <SidebarItem
            icon={<Brain size={18} />}
            label={t('skills')}
            active={activeTab === 'skills'}
            onClick={() => { setActiveTab('skills'); setIsSidebarOpen(false); }}
          />
          <SidebarItem
            icon={<Database size={18} />}
            label={t('knowledge')}
            active={activeTab === 'knowledge'}
            onClick={() => { setActiveTab('knowledge'); setIsSidebarOpen(false); }}
          />
          <SidebarItem
            icon={<MessageSquare size={18} />}
            label={t('chatStudio')}
            active={activeTab === 'chat'}
            onClick={() => { setActiveTab('chat'); setIsSidebarOpen(false); }}
          />
        </nav>

        <div className="sidebar-footer">
          <div className="user-profile">
            <div className="avatar">
              <UserIcon size={14} />
            </div>
            <div className="user-info">
              <p className="email">{user?.email}</p>
              <span className="status">Online</span>
            </div>
          </div>

          <button onClick={toggleLanguage} className="btn-logout" style={{ marginBottom: '8px' }}>
            <Globe size={16} />
            <span>{t('languageToggle')}</span>
          </button>

          <button onClick={logout} className="btn-logout">
            <LogOut size={16} />
            <span>{t('logout')}</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="dashboard-main">
        <div className="content-container">
          <header className="content-header">
            <div className="header-info">
              <h1 className="header-title text-gradient">
                {activeTab === 'chat' ? t('chatStudio') : t(activeTab)}
              </h1>
              <p className="header-subtitle">
                {activeTab === 'agents' && t('overview')}
                {activeTab === 'skills' && t('noSkillsSubtitle')}
                {activeTab === 'knowledge' && t('uploadSubtitle')}
                {activeTab === 'chat' && t('selectAgentToStart')}
              </p>
            </div>
            {activeTab !== 'chat' && activeTab !== 'knowledge' && (
              <button onClick={handleCreateNew} className="btn btn-primary">
                <Plus size={18} />
                <span>{activeTab === 'agents' ? t('newAgentBtn') : t('newSkillBtn')}</span>
              </button>
            )}
          </header>

          <div className="data-grid">
            {activeTab === 'agents' && agents.map(agent => (
              <div
                key={agent.id}
                className="card agent-card"
                onClick={() => { setSelectedAgent(agent); setShowAgentModal(true); }}
              >
                <div className="card-top">
                  <div className="icon-box purple">
                    <Bot size={20} />
                  </div>
                  <ChevronRight size={18} className="arrow-icon" />
                </div>
                <h3 className="card-title">{agent.name}</h3>
                <p className="card-description">
                  {agent.system_prompt || t('systemPromptPlaceholder')}
                </p>
                <div className="card-footer">
                  <span className="badge badge-purple">{t('activeAgents')}</span>
                </div>
              </div>
            ))}

            {activeTab === 'skills' && skills.map(skill => (
              <div
                key={skill.id}
                className="card skill-card"
                onClick={() => { setSelectedSkill(skill); setShowSkillModal(true); }}
              >
                <div className="card-top">
                  <div className="icon-box green">
                    <Code2 size={20} />
                  </div>
                  <ChevronRight size={18} className="arrow-icon" />
                </div>
                <h3 className="card-title">{skill.name}</h3>
                <p className="card-description">
                  {skill.description || t('skillDescriptionPlaceholder')}
                </p>
                <div className="card-footer">
                  <span className="badge badge-green">{t('customSkills')}</span>
                </div>
              </div>
            ))}

            {activeTab === 'knowledge' && (
              <div className="full-width">
                <KnowledgeManager />
              </div>
            )}

            {activeTab === 'chat' && (
              <div className="full-width chat-view">
                <ChatStudio />
              </div>
            )}

            {((activeTab === 'agents' && agents.length === 0) || (activeTab === 'skills' && skills.length === 0)) && (
              <div className="empty-state">
                <div className="empty-icon">
                  {activeTab === 'agents' ? <Bot size={32} /> : <Code2 size={32} />}
                </div>
                <h3 className="empty-title">
                  {activeTab === 'agents' ? t('noAgentsTitle') : t('noSkillsTitle')}
                </h3>
                <p className="empty-subtitle">
                  {activeTab === 'agents' ? t('noAgentsSubtitle') : t('noSkillsSubtitle')}
                </p>
                <button onClick={handleCreateNew} className="btn btn-primary">
                  <Plus size={18} />
                  <span>{activeTab === 'agents' ? t('newAgentBtn') : t('newSkillBtn')}</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </main>

      {showAgentModal && (
        <AgentModal
          agent={selectedAgent}
          onClose={() => setShowAgentModal(false)}
          onSave={fetchData}
        />
      )}
      {showSkillModal && (
        <SkillModal
          skill={selectedSkill}
          onClose={() => setShowSkillModal(false)}
          onSave={fetchData}
        />
      )}

      <SystemBot
        onNavigate={(route) => setActiveTab(route as any)}
        onRefresh={fetchData}
      />
    </div>
  );
};

interface SidebarItemProps {
  icon: React.ReactNode;
  label: string;
  active?: boolean;
  onClick: () => void;
}

const SidebarItem: React.FC<SidebarItemProps> = ({ icon, label, active, onClick }) => (
  <button
    onClick={onClick}
    className={`sidebar-item ${active ? 'active' : ''}`}
  >
    <span className="item-icon">{icon}</span>
    <span className="item-label">{label}</span>
  </button>
);
