import { useEffect, useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import { RefreshCw, CheckCircle2, Eye, EyeOff } from 'lucide-react';

interface WatcherStatus {
  is_watching: boolean;
  active_project: string | null;
}

interface MediaDetectedPayload {
  event_type: string;
  file_path: string;
  file_name: string;
  bin_hierarchy: string[];
}

export function LiveSyncBar() {
  const [status, setStatus] = useState<WatcherStatus>({ is_watching: false, active_project: null });
  const [lastSyncedFile, setLastSyncedFile] = useState<string | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);

  useEffect(() => {
    // Initial status fetch
    invoke<WatcherStatus>('get_watcher_status')
      .then(setStatus)
      .catch(() => {});

    // Listen for status changes
    const unlistenStatus = listen<WatcherStatus>('watcher-status-changed', (event) => {
      setStatus(event.payload);
    });

    // Listen for detected media
    const unlistenMedia = listen<MediaDetectedPayload>('media-detected', (event) => {
      const { file_name, bin_hierarchy } = event.payload;
      const binPath = bin_hierarchy.length > 0 ? bin_hierarchy.join(' > ') : 'Root';
      setLastSyncedFile(`${file_name} -> Bin: ${binPath}`);
      setTimeout(() => setLastSyncedFile(null), 5000);
    });

    return () => {
      unlistenStatus.then((fn) => fn());
      unlistenMedia.then((fn) => fn());
    };
  }, []);

  const handleToggleWatcher = async () => {
    if (status.is_watching) {
      await invoke('stop_project_watcher');
      setStatus({ is_watching: false, active_project: status.active_project });
    } else if (status.active_project) {
      await invoke('start_project_watcher', { projectDir: status.active_project });
      setStatus({ is_watching: true, active_project: status.active_project });
    }
  };

  const handleManualScan = async () => {
    if (!status.active_project) return;
    setIsSyncing(true);
    try {
      const items = await invoke<any[]>('scan_project_media_bins', { projectDir: status.active_project });
      setSyncMessage(`Found ${items.length} media items in project hierarchy.`);
      setTimeout(() => setSyncMessage(null), 4000);
    } catch (e: any) {
      setSyncMessage(`Scan error: ${e}`);
    } finally {
      setIsSyncing(false);
    }
  };

  if (!status.active_project) {
    return null;
  }

  const projectName = status.active_project.split(/[\\/]/).pop() || status.active_project;

  return (
    <div className="bg-[#12141a] border-t border-gray-800 px-4 py-2 flex items-center justify-between text-xs select-none">
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1.5">
          <span
            className={`w-2 h-2 rounded-full ${
              status.is_watching ? 'bg-emerald-500 animate-pulse' : 'bg-gray-500'
            }`}
          />
          <span className="text-gray-400 font-medium">
            {status.is_watching ? 'Live Auto-Sync Active' : 'Auto-Sync Paused'}:
          </span>
          <span className="text-gray-200 font-mono font-semibold max-w-[220px] truncate" title={status.active_project}>
            {projectName}
          </span>
        </div>

        {lastSyncedFile && (
          <div className="flex items-center gap-1 text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-800/40 text-[11px] animate-fadeIn">
            <CheckCircle2 size={12} />
            <span className="truncate max-w-[300px]">Synced: {lastSyncedFile}</span>
          </div>
        )}

        {syncMessage && (
          <span className="text-purple-300 bg-purple-950/50 px-2 py-0.5 rounded border border-purple-800/30 text-[11px]">
            {syncMessage}
          </span>
        )}
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={handleManualScan}
          disabled={isSyncing}
          className="px-2.5 py-1 bg-gray-800 hover:bg-gray-700 active:bg-gray-600 text-gray-200 rounded flex items-center gap-1 text-[11px] transition-colors border border-gray-700/60 disabled:opacity-50"
          title="Scan project directory and verify dynamic bins"
        >
          <RefreshCw size={11} className={isSyncing ? 'animate-spin' : ''} />
          <span>Scan Bins</span>
        </button>

        <button
          onClick={handleToggleWatcher}
          className={`px-2.5 py-1 rounded flex items-center gap-1 text-[11px] font-medium transition-colors border ${
            status.is_watching
              ? 'bg-emerald-950/50 border-emerald-700/60 text-emerald-300 hover:bg-emerald-900/60'
              : 'bg-gray-800 border-gray-700 text-gray-400 hover:bg-gray-700'
          }`}
          title={status.is_watching ? 'Pause background watcher' : 'Resume background watcher'}
        >
          {status.is_watching ? <Eye size={11} /> : <EyeOff size={11} />}
          <span>{status.is_watching ? 'Watching' : 'Paused'}</span>
        </button>
      </div>
    </div>
  );
}
