import { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { listen, UnlistenFn } from '@tauri-apps/api/event';
import { HardDriveDownload, FolderOpen, Film, ExternalLink } from 'lucide-react';

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

  const handleOpenPremiere = async () => {
    try {
      if (targetProjectDir) {
        await invoke('open_project_in_premiere', { projectPath: targetProjectDir });
      }
    } catch (e) {
      console.error('Failed to open Premiere:', e);
    }
  };

  return (
    <div className="p-6 bg-gray-900 text-white rounded-lg shadow-md max-w-2xl mx-auto mt-8">
      <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
        <HardDriveDownload className="text-purple-400" /> Media Ingest
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
          <div className="p-4 bg-gray-800 rounded border border-gray-700 space-y-3">
            <div className="text-sm">{status}</div>
            {isIngesting && currentFile && (
              <div className="w-full bg-gray-700 rounded-full h-2.5">
                <div
                  className="bg-blue-600 h-2.5 rounded-full transition-all duration-300"
                  style={{ width: `${fileProgress}%` }}
                ></div>
              </div>
            )}

            {status.includes('complete') && (
              <div className="p-3.5 bg-purple-950/50 border border-purple-800/70 rounded-md space-y-2 mt-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 font-semibold text-purple-200 text-sm">
                    <Film size={16} className="text-purple-400" />
                    <span>Sync with Premiere Pro</span>
                  </div>
                  <button
                    type="button"
                    onClick={handleOpenPremiere}
                    className="px-3 py-1.5 bg-purple-600 hover:bg-purple-500 text-white rounded text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-sm"
                  >
                    <ExternalLink size={13} />
                    <span>Open in Premiere</span>
                  </button>
                </div>
                <p className="text-xs text-gray-300 leading-relaxed">
                  To batch-import your newly ingested media into Premiere bins, run <code className="bg-purple-900/80 px-1.5 py-0.5 rounded text-purple-200 font-mono text-[11px]">SyncBins.jsx</code> inside Premiere (<strong>File &gt; Scripts &gt; Run Script File...</strong> located in your <code className="text-purple-300 font-mono text-[11px]">01_PROJECT_FILES</code> folder).
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}