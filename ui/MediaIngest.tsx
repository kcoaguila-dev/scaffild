import { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { listen, UnlistenFn } from '@tauri-apps/api/event';
import { HardDriveDownload, FolderOpen, Film, ExternalLink, ShieldCheck, Plus, Trash2, CheckCircle2 } from 'lucide-react';

interface ProgressEvent {
  file: string;
  bytes_copied: number;
  total_bytes: number;
  status: string;
}

interface IngestSummary {
  total_files: number;
  total_bytes: number;
  verified_checksums: number;
}

interface MediaIngestProps {
  initialTargetDir?: string;
}

function playCompletionChime() {
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const now = ctx.currentTime;

    // Note 1: D5 (587.33 Hz)
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(587.33, now);
    osc1.frequency.exponentialRampToValueAtTime(880, now + 0.15); // Slide to A5
    gain1.gain.setValueAtTime(0.12, now);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(now);
    osc1.stop(now + 0.5);

    // Note 2: D6 (1174.66 Hz)
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(1174.66, now + 0.12);
    gain2.gain.setValueAtTime(0.15, now + 0.12);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.8);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(now + 0.12);
    osc2.stop(now + 0.8);
  } catch (e) {
    console.warn('AudioContext chime failed:', e);
  }
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

export default function MediaIngest({ initialTargetDir }: MediaIngestProps) {
  const [sourceDir, setSourceDir] = useState('');
  const [targetProjectDir, setTargetProjectDir] = useState(initialTargetDir || '');
  const [enableBackup, setEnableBackup] = useState(false);
  const [backupDir, setBackupDir] = useState('');
  const [status, setStatus] = useState('');
  const [currentFile, setCurrentFile] = useState('');
  const [fileProgress, setFileProgress] = useState(0);
  const [isIngesting, setIsIngesting] = useState(false);
  const [ingestSummary, setIngestSummary] = useState<IngestSummary | null>(null);

  useEffect(() => {
    if (initialTargetDir) {
      setTargetProjectDir(initialTargetDir);
    }
  }, [initialTargetDir]);

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
      setStatus('Please select both source and primary target directories.');
      return;
    }

    if (enableBackup && !backupDir) {
      setStatus('Please select a secondary backup directory or disable backup.');
      return;
    }

    setIsIngesting(true);
    setStatus('Starting ingest & checksum verification...');
    setFileProgress(0);
    setIngestSummary(null);

    try {
      const summary = await invoke<IngestSummary>('ingest_media', {
        sourceDir,
        targetProjectDir,
        secondaryTargetDir: enableBackup ? backupDir : null,
      });
      setIngestSummary(summary);
      setStatus('Ingest complete! All checksums verified.');
      playCompletionChime();
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

  const handleBrowseBackup = async () => {
    try {
      const selected = await invoke<string | null>('pick_directory');
      if (selected) setBackupDir(selected);
    } catch (err) {
      console.error('Failed to pick backup directory:', err);
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
    <div className="p-6 bg-gray-900 text-white rounded-lg shadow-md max-w-2xl mx-auto mt-6 border border-gray-800">
      <h2 className="text-2xl font-bold mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <HardDriveDownload className="text-purple-400" /> Media Ingest
        </div>
        <span className="text-xs text-gray-400 font-mono font-normal flex items-center gap-1">
          <ShieldCheck size={14} className="text-emerald-400" /> xxHash64 Verified
        </span>
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
          <label className="block text-sm font-medium mb-1">Target Project Directory (Primary Working Drive)</label>
          <div className="flex gap-2">
            <input
              type="text"
              value={targetProjectDir}
              onChange={e => setTargetProjectDir(e.target.value)}
              placeholder="e.g. D:\Projects\2026\0042_Nike_Commercial"
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

        {/* Dual-Destination Backup */}
        <div className="pt-1">
          {!enableBackup ? (
            <button
              type="button"
              onClick={() => setEnableBackup(true)}
              className="text-xs text-purple-400 hover:text-purple-300 font-medium flex items-center gap-1.5 transition-colors"
            >
              <Plus size={14} />
              <span>Add Dual-Destination Backup (3-2-1 Safety Rule)</span>
            </button>
          ) : (
            <div className="p-3 bg-gray-950/60 border border-purple-900/60 rounded-md space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-purple-300 flex items-center gap-1.5">
                  <ShieldCheck size={14} className="text-purple-400" />
                  <span>Secondary Backup Destination (Archive / External RAID)</span>
                </label>
                <button
                  type="button"
                  onClick={() => {
                    setEnableBackup(false);
                    setBackupDir('');
                  }}
                  className="text-gray-500 hover:text-red-400 transition-colors"
                  title="Remove Backup Destination"
                >
                  <Trash2 size={14} />
                </button>
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={backupDir}
                  onChange={e => setBackupDir(e.target.value)}
                  placeholder="e.g. E:\BACKUP_ARCHIVE\0001_New_Project"
                  className="flex-grow bg-gray-800 border border-gray-700 rounded p-1.5 focus:outline-none focus:border-purple-500 font-mono text-xs text-white"
                />
                <button
                  type="button"
                  onClick={handleBrowseBackup}
                  className="px-3 py-1.5 bg-gray-800 hover:bg-gray-700 text-gray-200 hover:text-white border border-gray-700 rounded text-xs font-medium transition-colors flex items-center gap-1 shrink-0"
                >
                  <FolderOpen size={14} className="text-amber-400" />
                  <span>Browse...</span>
                </button>
              </div>
            </div>
          )}
        </div>

        <button
          onClick={handleIngest}
          disabled={isIngesting}
          className={`w-full text-white font-bold py-2.5 px-4 rounded transition-colors shadow-sm ${isIngesting ? 'bg-gray-600 cursor-not-allowed' : 'bg-purple-600 hover:bg-purple-700'}`}
        >
          {isIngesting ? 'Offloading & Verifying Checksums...' : enableBackup ? 'Start Dual Ingest & Verify' : 'Start Ingest & Verify'}
        </button>

        {status && (
          <div className="p-4 bg-gray-800 rounded border border-gray-700 space-y-3">
            <div className="text-sm">{status}</div>
            {isIngesting && currentFile && (
              <div className="w-full bg-gray-700 rounded-full h-2.5">
                <div
                  className="bg-purple-500 h-2.5 rounded-full transition-all duration-300"
                  style={{ width: `${fileProgress}%` }}
                ></div>
              </div>
            )}

            {ingestSummary && (
              <div className="grid grid-cols-3 gap-2 p-2.5 bg-gray-950/60 rounded border border-gray-700/80 text-center text-xs">
                <div>
                  <div className="text-gray-400">Total Files</div>
                  <div className="font-semibold text-gray-200">{ingestSummary.total_files}</div>
                </div>
                <div>
                  <div className="text-gray-400">Transferred</div>
                  <div className="font-semibold text-emerald-400">{formatBytes(ingestSummary.total_bytes)}</div>
                </div>
                <div>
                  <div className="text-gray-400">Verified (xxHash64)</div>
                  <div className="font-semibold text-purple-300 flex items-center justify-center gap-1">
                    <CheckCircle2 size={13} className="text-emerald-400" />
                    <span>{ingestSummary.verified_checksums} / {ingestSummary.total_files}</span>
                  </div>
                </div>
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
                  Drag your <code className="bg-purple-900/80 px-1.5 py-0.5 rounded text-purple-200 font-mono text-[11px]">02_FOOTAGE</code> folder directly into Premiere&apos;s Project Panel to instantly import all subfolders as organized bins.
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}