import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import './ProjectUploadPage.css';

interface UploadedFile {
  file: File;
  id: string;
  status: 'pending' | 'uploading' | 'success' | 'error';
  progress: number;
}

const ProjectUploadPage: React.FC = () => {
  const [projectName, setProjectName] = useState('');
  const [projectDescription, setProjectDescription] = useState('');
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(event.target.files || []);
    const newFiles: UploadedFile[] = selectedFiles.map(file => ({
      file,
      id: `${Date.now()}-${Math.random()}`,
      status: 'pending',
      progress: 0
    }));
    setFiles(prev => [...prev, ...newFiles]);
  };

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    const droppedFiles = Array.from(event.dataTransfer.files);
    const newFiles: UploadedFile[] = droppedFiles.map(file => ({
      file,
      id: `${Date.now()}-${Math.random()}`,
      status: 'pending',
      progress: 0
    }));
    setFiles(prev => [...prev, ...newFiles]);
  };

  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
  };

  const removeFile = (id: string) => {
    setFiles(prev => prev.filter(f => f.id !== id));
  };

  const handleUpload = async () => {
    if (files.length === 0) {
      alert('Please select at least one file');
      return;
    }

    if (!projectName.trim()) {
      alert('Please enter a project name');
      return;
    }

    setUploading(true);

    try {
      const formData = new FormData();
      formData.append('name', projectName);
      formData.append('description', projectDescription);
      
      files.forEach(({ file }) => {
        formData.append('files', file);
      });

      const response = await axios.post('/api/projects', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        },
        onUploadProgress: (progressEvent) => {
          const percentCompleted = Math.round(
            (progressEvent.loaded * 100) / (progressEvent.total || 1)
          );
          console.log(`Upload progress: ${percentCompleted}%`);
        }
      });

      if (response.data.success) {
        const { projectId } = response.data.data;
        console.log('Project created:', response.data.data);
        
        // Navigate to project cleaning page to start pipeline
        navigate(`/project/${projectId}/clean`);
      }

    } catch (error: any) {
      console.error('Upload error:', error);
      alert(error.response?.data?.error || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
  };

  return (
    <div className="project-upload-container">
      <div className="project-upload-header">
        <h1>Create Multi-File Project</h1>
        <p>Upload multiple CSV files to analyze together</p>
      </div>

      <div className="project-details-section">
        <div className="form-group">
          <label htmlFor="projectName">Project Name *</label>
          <input
            id="projectName"
            type="text"
            className="form-input"
            value={projectName}
            onChange={(e) => setProjectName(e.target.value)}
            placeholder="e.g., Q4 Sales Analysis"
            disabled={uploading}
          />
        </div>

        <div className="form-group">
          <label htmlFor="projectDescription">Description (Optional)</label>
          <textarea
            id="projectDescription"
            className="form-textarea"
            value={projectDescription}
            onChange={(e) => setProjectDescription(e.target.value)}
            placeholder="Describe what this project is about..."
            rows={3}
            disabled={uploading}
          />
        </div>
      </div>

      <div
        className="drop-zone"
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onClick={() => !uploading && fileInputRef.current?.click()}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept=".csv,.xlsx,.xls,.json"
          onChange={handleFileSelect}
          style={{ display: 'none' }}
          disabled={uploading}
        />
        <div className="drop-zone-content">
          <svg className="upload-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <polyline points="17 8 12 3 7 8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <line x1="12" y1="3" x2="12" y2="15" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          <p className="drop-zone-text">Drag & drop files here or click to browse</p>
          <p className="drop-zone-subtext">Supports CSV, Excel, and JSON files (up to 10 files, 100MB each)</p>
        </div>
      </div>

      {files.length > 0 && (
        <div className="files-list">
          <h3>Selected Files ({files.length})</h3>
          {files.map((fileItem) => (
            <div key={fileItem.id} className="file-item">
              <div className="file-info">
                <svg className="file-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z" strokeWidth="2"/>
                  <polyline points="13 2 13 9 20 9" strokeWidth="2"/>
                </svg>
                <div>
                  <p className="file-name">{fileItem.file.name}</p>
                  <p className="file-size">{formatFileSize(fileItem.file.size)}</p>
                </div>
              </div>
              {!uploading && (
                <button
                  className="remove-file-btn"
                  onClick={() => removeFile(fileItem.id)}
                  aria-label="Remove file"
                >
                  ×
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      <div className="upload-actions">
        <button
          className="btn btn-secondary"
          onClick={() => navigate('/upload')}
          disabled={uploading}
        >
          Back to Single File Upload
        </button>
        <button
          className="btn btn-primary"
          onClick={handleUpload}
          disabled={uploading || files.length === 0 || !projectName.trim()}
        >
          {uploading ? 'Uploading...' : `Upload ${files.length} File${files.length !== 1 ? 's' : ''}`}
        </button>
      </div>
    </div>
  );
};

export default ProjectUploadPage;
