import { useState, useEffect } from 'react';
import { Upload, FileText, Trash2, Database, Loader2 } from 'lucide-react';
import { api } from '../services/api';
import { useTranslation } from 'react-i18next';

export const KnowledgeManager = () => {
  const [files, setFiles] = useState<any[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const { t } = useTranslation();

  const fetchFiles = async () => {
    try {
      const data = await api.get('/knowledge');
      setFiles(data);
    } catch (err) {
      console.error('Error fetching knowledge:', err);
    }
  };

  useEffect(() => { fetchFiles(); }, []);

  const handleUpload = async (file: File) => {
    setIsUploading(true);
    const formData = new FormData();
    formData.append('file', file);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/knowledge/upload`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      if (!res.ok) throw new Error('Upload failed');
      await fetchFiles();
    } catch (err) {
      console.error('Upload error:', err);
      alert(t('uploadFailed'));
    } finally {
      setIsUploading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm(t('confirmDeleteKnowledge'))) return;
    try {
      await api.delete(`/knowledge/${id}`);
      setFiles(files.filter(f => f.id !== id));
    } catch (err) {
      console.error('Delete error:', err);
    }
  };

  const onDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(e.type === 'dragenter' || e.type === 'dragover');
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files?.[0]) handleUpload(e.dataTransfer.files[0]);
  };

  return (
    <div className="knowledge-page">
      {/* Upload Zone */}
      <div
        className={`upload-zone ${dragActive ? 'drag-active' : ''}`}
        onDragEnter={onDrag}
        onDragLeave={onDrag}
        onDragOver={onDrag}
        onDrop={onDrop}
      >
        <div className="upload-icon-wrap">
          {isUploading ? <Loader2 size={28} className="animate-spin" /> : <Upload size={28} />}
        </div>
        <h3 className="upload-title">
          {isUploading ? t('uploadProcessing') : t('uploadTitle')}
        </h3>
        <p className="upload-subtitle">
          {t('uploadSubtitle')}
        </p>
        <label className="btn btn-primary" style={{ cursor: isUploading ? 'not-allowed' : 'pointer' }}>
          {isUploading ? t('pleaseWait') : t('selectFilesBtn')}
          <input
            type="file"
            style={{ display: 'none' }}
            accept=".pdf,.txt"
            disabled={isUploading}
            onChange={(e) => e.target.files?.[0] && handleUpload(e.target.files[0])}
          />
        </label>
      </div>

      {/* Files List */}
      <div>
        <div className="knowledge-list-header">
          <Database size={16} />
          <span>{t('indexedKnowledge')} ({files.length})</span>
        </div>

        <div className="knowledge-list">
          {files.length === 0 && !isUploading ? (
            <div className="knowledge-empty">{t('noKnowledge')}</div>
          ) : (
            files.map(file => (
              <div key={file.id} className="knowledge-item">
                <div className="knowledge-item-info">
                  <div className="knowledge-file-icon">
                    <FileText size={18} />
                  </div>
                  <div>
                    <p className="knowledge-filename">{file.filename}</p>
                    <p className="knowledge-date">{t('addedOn')} {new Date(file.created_at).toLocaleDateString()}</p>
                  </div>
                </div>
                <button
                  className="knowledge-delete-btn"
                  onClick={() => handleDelete(file.id)}
                  title="Delete"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
