import { ChangeEvent, useState } from 'react';
import '../styles/FileUpload.css';

interface IRSUploadProps {
  onFileUpload: (xmlData: Document) => void;
}

export const IRSUpload: React.FC<IRSUploadProps> = ({ onFileUpload }) => {
  const [dragActive, setDragActive] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const processFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(e.target?.result as string, 'text/xml');
        
        // Validate that it's an IRS XML file
        const rootElement = xmlDoc.documentElement;
        if (rootElement.nodeName !== 'Modelo3IRSv2024') {
          setError('Invalid IRS XML file format. Expected Modelo3IRSv2024 root element.');
          return;
        }

        setError(null);
        onFileUpload(xmlDoc);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Unknown error';
        setError(`Error processing XML file: ${errorMessage}`);
        console.error('Error details:', err);
      }
    };

    reader.onerror = () => {
      setError('Error reading the file');
    };

    reader.readAsText(file);
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  };

  return (
    <div className="file-upload-container">
      <div
        className={`file-upload-area ${dragActive ? 'drag-active' : ''}`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
      >
        <input
          type="file"
          accept=".xml"
          onChange={handleChange}
          className="file-input"
        />
        <div className="file-upload-content">
          <p>Drag and drop your IRS XML file here or click to select</p>
          <small>Supported format: IRS XML file (Modelo3IRSv2024)</small>
        </div>
      </div>
      {error && <div className="error-message">{error}</div>}
    </div>
  );
}; 