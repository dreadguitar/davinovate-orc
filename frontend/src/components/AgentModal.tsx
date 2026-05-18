import { useState, useEffect } from 'react';
import { X, Loader2 } from 'lucide-react';
import { api } from '../services/api';
import { useTranslation } from 'react-i18next';

interface Agent {
  id?: string;
  name: string;
  system_prompt: string;
  model_config: any;
}

interface AgentModalProps {
  agent?: Agent;
  onClose: () => void;
  onSave: (agent: Agent) => void;
}

interface AIModel {
  id: string;
  owned_by?: string;
}

export const AgentModal = ({ agent, onClose, onSave }: AgentModalProps) => {
  const [name, setName] = useState(agent?.name || '');
  const [systemPrompt, setSystemPrompt] = useState(agent?.system_prompt || '');
  const [model, setModel] = useState(agent?.model_config?.model || '');
  const [temperature, setTemperature] = useState(agent?.model_config?.temperature ?? 0.7);
  const [isLoading, setIsLoading] = useState(false);
  const [models, setModels] = useState<AIModel[]>([]);
  const [modelsLoading, setModelsLoading] = useState(true);
  const [modelsError, setModelsError] = useState('');
  const { t } = useTranslation();

  // Fetch available models from the configured AI server on mount
  useEffect(() => {
    const fetchModels = async () => {
      try {
        setModelsLoading(true);
        const data = await api.get('/ai/models');
        const list: AIModel[] = data.models || [];
        setModels(list);
        // Pre-select: keep existing model if still in list, otherwise select first
        if (!model && list.length > 0) {
          setModel(list[0].id);
        } else if (model && !list.find(m => m.id === model) && list.length > 0) {
          setModel(list[0].id);
        }
      } catch (err: any) {
        setModelsError('Could not load models from AI server.');
        console.error('Model fetch error:', err);
      } finally {
        setModelsLoading(false);
      }
    };
    fetchModels();
  }, []);

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    setIsLoading(true);
    const payload = { name, system_prompt: systemPrompt, model_config: { model, temperature } };
    try {
      const savedAgent = agent?.id
        ? await api.put(`/agents/${agent.id}`, payload)
        : await api.post('/agents', payload);
      onSave(savedAgent);
      onClose();
    } catch (err) {
      console.error('Error saving agent:', err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal-panel">
        <div className="modal-header">
          <h2 className="modal-title">{agent?.id ? t('editAgent') : t('newAgent')}</h2>
          <button className="modal-close-btn" onClick={onClose}><X size={18} /></button>
        </div>

        <form onSubmit={handleSubmit} className="modal-body">
          <div className="form-group">
            <label className="form-label">{t('agentName')}</label>
            <input
              type="text"
              required
              className="input-field"
              placeholder={t('agentNamePlaceholder')}
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label className="form-label">{t('systemPrompt')}</label>
            <textarea
              rows={6}
              className="input-field"
              style={{ resize: 'none' }}
              placeholder={t('systemPromptPlaceholder')}
              value={systemPrompt}
              onChange={(e) => setSystemPrompt(e.target.value)}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div className="form-group">
              <label className="form-label">{t('modelLabel')}</label>

              {modelsLoading ? (
                <div className="input-field" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-muted)' }}>
                  <Loader2 size={14} className="animate-spin" />
                  <span style={{ fontSize: '0.875rem' }}>{t('loading')}</span>
                </div>
              ) : modelsError ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <p style={{ fontSize: '0.8125rem', color: 'var(--red)' }}>{modelsError}</p>
                  <input
                    type="text"
                    className="input-field"
                    placeholder="Enter model ID manually"
                    value={model}
                    onChange={(e) => setModel(e.target.value)}
                  />
                </div>
              ) : (
                <select
                  className="input-field"
                  value={model}
                  onChange={(e) => setModel(e.target.value)}
                >
                  {models.map(m => (
                    <option key={m.id} value={m.id}>
                      {m.id}
                    </option>
                  ))}
                </select>
              )}
            </div>

            <div className="form-group">
              <label className="form-label">{t('temperatureLabel')} — {temperature.toFixed(1)}</label>
              <div style={{ paddingTop: '0.75rem' }}>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.1"
                  value={temperature}
                  onChange={(e) => setTemperature(parseFloat(e.target.value))}
                />
              </div>
            </div>
          </div>
        </form>

        <div className="modal-footer">
          <button onClick={onClose} className="btn btn-ghost">{t('cancel')}</button>
          <button
            onClick={handleSubmit}
            disabled={isLoading || !model}
            className="btn btn-primary"
            style={{ minWidth: '110px', justifyContent: 'center' }}
          >
            {isLoading
              ? <span className="animate-spin" style={{ display: 'inline-block', width: '1rem', height: '1rem', border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%' }} />
              : t('saveAgentBtn')
            }
          </button>
        </div>
      </div>
    </div>
  );
};
