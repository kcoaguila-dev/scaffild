import { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { listen, UnlistenFn } from '@tauri-apps/api/event';
import { HardDriveDownload, FolderOpen } from 'lucide-react';

interface ProgressEvent {
  file: string;
  bytes_copied: number;
  total_bytes: number;
  status: string;
}

export default function MediaIngest() {
  const [sourceDir, setSourceDir] = useState('');
  const [targetProjectDir, setTargetProjectDir] = useState('');
  const [status, setStatus] = useState('');
  const [currentFile, setCurrentFile] = useState('');
  const [fileProgress, setFileProgress] = useState(0);
  const [isIngesting, setIsIngesting] = useState(false);

  useEffect(() => {
    let unlisten: UnlistenFn;

    const setupListener = async () => {
      unlisten = await listen<ProgressEvent>('ingest-progress', (event) => {
        const { file, bytes_copied, total_bytes, status } = event.payload;
        setCurrentFile(file);

        if (total_bytes > 0) {
          setFileProgress((bytes_copied / total_bytes) * 100);
        }

        if (status === 'error') {
          setStatus(`Error processing ${file}`);
        } else {
          setStatus(`Status: ${status} - ${file}`);
        }
      });
    };

    setupListener();

    return () => {
      if (unlisten) unlisten();
    };
  }, []);

  const handleIngest = async () => {
    if (!sourceDir || !targetProjectDir) {
      setStatus('Please select both source and target directories.');
      return;
    }

    setIsIngesting(true);
    setStatus('Starting ingest...');
    setFileProgress(0);

    try {
      await invoke('ingest_media', { sourceDir, targetProjectDir });
      setStatus('Ingest complete! Verified successfully.');
    } catch (e: any) {
      setStatus(`Ingest failed: ${e}`);
    } finally {
      setIsIngesting(false);
      setCurrentFile('');
    }
  };

  const handleBrowseSource = async () => {
    try {
      const selected = await invoke<string | null>('pick_directory');
      if (selected) setSourceDir(selected);
    } catch (err) {
      console.error('Failed to pick source directory:', err);
    }
  };

  const handleBrowseTarget = async () => {
    try {
      const selected = await invoke<string | null>('pick_directory');
      if (selected) setTargetProjectDir(selected);
    } catch (err) {
      console.error('Failed to pick target directory:', err);
    }
  };

  return (
    <div className="p-6 bg-gray-900 text-white rounded-lg shadow-md max-w-2xl mx-auto mt-8">
      <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
        <HardDriveDownload /> Media Ingest
      </h2>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">Source Directory (SD Card / Camera)</label>
          <div className="flex gap-2">
            <input
              type="text"
              value={sourceDir}
              onChange={e => setSourceDir(e.target.value)}
              placeholder="e.g. D:\DCIM\100MEDIA"
              className="flex-grow bg-gray-800 border border-gray-700 rounded p-2 focus:outline-none focus:border-blue-500 font-mono text-sm text-white"
            />
            <button
              type="button"
              onClick={handleBrowseSource}
              className="px-3.5 py-2 bg-gray-800 hover:bg-gray-700 text-gray-200 hover:text-white border border-gray-700 rounded text-sm font-medium transition-colors flex items-center gap-1.5 shrink-0"
            >
              <FolderOpen size={16} className="text-amber-400" />
              <span>Browse...</span>
            </button>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Target Project Directory (Root)</label>
          <div className="flex gap-2">
            <input
              type="text"
              value={targetProjectDir}
              onChange={e => setTargetProjectDir(e.target.value)}
              placeholder="e.g. C:\Users\hippo\Videos\00_PROJECTS\0001_NewProject"
              className="flex-grow bg-gray-800 border border-gray-700 rounded p-2 focus:outline-none focus:border-blue-500 font-mono text-sm text-white"
            />
            <button
              type="button"
              onClick={handleBrowseTarget}
              className="px-3.5 py-2 bg-gray-800 hover:bg-gray-700 text-gray-200 hover:text-white border border-gray-700 rounded text-sm font-medium transition-colors flex items-center gap-1.5 shrink-0"
            >
              <FolderOpen size={16} className="text-amber-400" />
              <span>Browse...</span>
            </button>
          </div>
        </div>

        <button
          onClick={handleIngest}
          disabled={isIngesting}
          className={`w-full text-white font-bold py-2 px-4 rounded transition-colors ${isIngesting ? 'bg-gray-600' : 'bg-purple-600 hover:bg-purple-700'}`}
        >
          {isIngesting ? 'Ingesting...' : 'Start Ingest & Verify'}
        </button>

        {status && (
          <div className="p-4 bg-gray-800 rounded border border-gray-700">
            <div className="text-sm mb-2">{status}</div>
            {isIngesting && currentFile && (
              <div className="w-full bg-gray-700 rounded-full h-2.5">
                <div
                  className="bg-blue-600 h-2.5 rounded-full transition-all duration-300"
                  style={{ width: `${fileProgress}%` }}
                ></div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}