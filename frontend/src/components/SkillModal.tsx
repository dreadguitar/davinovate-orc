import { useState } from 'react';
import { X, Code2 } from 'lucide-react';
import { api } from '../services/api';
import { useTranslation } from 'react-i18next';

interface Skill {
  id?: string;
  name: string;
  description: string;
  parameters_schema: any;
  action_code: string;
}

interface SkillModalProps {
  skill?: Skill;
  onClose: () => void;
  onSave: (skill: Skill) => void;
}

export const SkillModal = ({ skill, onClose, onSave }: SkillModalProps) => {
  const [name, setName] = useState(skill?.name || '');
  const [description, setDescription] = useState(skill?.description || '');
  const [code, setCode] = useState(skill?.action_code || `async function perform(params) {\n  const { arg1 } = params;\n  // Your logic here\n  return { result: arg1 };\n}`);
  const [schema, setSchema] = useState(
    JSON.stringify(skill?.parameters_schema || { type: 'object', properties: { arg1: { type: 'string', description: 'Input argument' } }, required: ['arg1'] }, null, 2)
  );
  const [isLoading, setIsLoading] = useState(false);
  const { t } = useTranslation();

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    setIsLoading(true);
    try {
      const payload = { name, description, parameters_schema: JSON.parse(schema), action_code: code };
      const savedSkill = skill?.id
        ? await api.put(`/skills/${skill.id}`, payload)
        : await api.post('/skills', payload);
      onSave(savedSkill);
      onClose();
    } catch (err: any) {
      alert('Error saving skill: ' + err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal-panel" style={{ maxWidth: '860px' }}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
            <Code2 size={20} style={{ color: 'var(--green)' }} />
            <h2 className="modal-title">{skill?.id ? t('editSkill') : t('newSkill')}</h2>
          </div>
          <button className="modal-close-btn" onClick={onClose}><X size={18} /></button>
        </div>

        <form onSubmit={handleSubmit} style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          <div className="modal-body" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', overflowY: 'auto' }}>
            {/* Left Column */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.125rem' }}>
              <div className="form-group">
                <label className="form-label">{t('skillName')}</label>
                <input
                  type="text"
                  required
                  className="input-field"
                  placeholder={t('skillNamePlaceholder')}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
              <div className="form-group">
                <label className="form-label">{t('skillDescription')}</label>
                <textarea
                  rows={3}
                  className="input-field"
                  style={{ resize: 'none' }}
                  placeholder={t('skillDescriptionPlaceholder')}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>
              <div className="form-group" style={{ flex: 1 }}>
                <label className="form-label">{t('parametersSchema')}</label>
                <textarea
                  rows={8}
                  className="input-field"
                  style={{ resize: 'none', fontFamily: 'ui-monospace, monospace', fontSize: '0.8125rem' }}
                  value={schema}
                  onChange={(e) => setSchema(e.target.value)}
                />
              </div>
            </div>

            {/* Right Column */}
            <div className="form-group" style={{ display: 'flex', flexDirection: 'column' }}>
              <label className="form-label">{t('actionLogic')}</label>
              <textarea
                className="input-field"
                style={{ flex: 1, resize: 'none', fontFamily: 'ui-monospace, monospace', fontSize: '0.8125rem', minHeight: '280px' }}
                value={code}
                onChange={(e) => setCode(e.target.value)}
              />
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" onClick={onClose} className="btn btn-ghost">{t('cancel')}</button>
            <button type="submit" disabled={isLoading} className="btn btn-primary" style={{ minWidth: '130px', justifyContent: 'center' }}>
              {isLoading
                ? <span className="animate-spin" style={{ display: 'inline-block', width: '1rem', height: '1rem', border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%' }} />
                : t('registerSkillBtn')
              }
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
