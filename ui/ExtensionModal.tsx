import { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { X, CheckCircle2, Download, AlertCircle, RefreshCw } from 'lucide-react';

interface ExtensionModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function ExtensionModal({ isOpen, onClose }: ExtensionModalProps) {
  const [isInstalled, setIsInstalled] = useState<boolean>(false);
  const [isInstalling, setIsInstalling] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [isError, setIsError] = useState<boolean>(false);

  useEffect(() => {
    if (isOpen) {
      checkStatus();
    }
  }, [isOpen]);

  const checkStatus = async () => {
    try {
      const installed = await invoke<boolean>('is_premiere_extension_installed');
      setIsInstalled(installed);
    } catch {
      setIsInstalled(false);
    }
  };

  const handleInstall = async () => {
    setIsInstalling(true);
    setStatusMessage(null);
    setIsError(false);
    try {
      const result = await invoke<string>('install_premiere_extension');
      setIsInstalled(true);
      setStatusMessage(result || 'Successfully installed Scaffild AutoSync into Premiere Pro!');
    } catch (e: any) {
      setIsError(true);
      setStatusMessage(typeof e === 'string' ? e : e?.message || 'Failed to install extension');
    } finally {
      setIsInstalling(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-gray-900 border border-gray-700/80 rounded-xl max-w-md w-full p-6 shadow-2xl relative text-gray-200">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 text-gray-400 hover:text-white transition-colors"
        >
          <X size={18} />
        </button>

        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-lg bg-blue-600/20 border border-blue-500/40 flex items-center justify-center text-blue-400">
            <Download size={20} />
          </div>
          <div>
            <h3 className="text-base font-bold text-white">Premiere Pro Extension</h3>
            <p className="text-xs text-gray-400">Real-time dynamic bin synchronization</p>
          </div>
        </div>

        <div className="bg-gray-950/70 border border-gray-800 rounded-lg p-3.5 mb-4 text-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-gray-400 font-medium">Plugin Status:</span>
            {isInstalled ? (
              <span className="flex items-center gap-1 text-emerald-400 font-semibold bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-800/40">
                <CheckCircle2 size={12} /> Installed & Ready
              </span>
            ) : (
              <span className="flex items-center gap-1 text-amber-400 font-semibold bg-amber-950/60 px-2 py-0.5 rounded border border-amber-800/40">
                <AlertCircle size={12} /> Not Installed
              </span>
            )}
          </div>
          <p className="text-gray-400 leading-relaxed text-[11px]">
            The Scaffild AutoSync CEP extension enables Premiere Pro to automatically ingest video, audio, and graphics files from your hard drive into matching bins in real time.
          </p>
        </div>

        {statusMessage && (
          <div
            className={`p-3 rounded-lg text-xs mb-4 border ${
              isError
                ? 'bg-red-950/60 border-red-800/60 text-red-300'
                : 'bg-emerald-950/60 border-emerald-800/60 text-emerald-300'
            }`}
          >
            {statusMessage}
          </div>
        )}

        <div className="space-y-3">
          <button
            onClick={handleInstall}
            disabled={isInstalling}
            className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-500 active:bg-blue-700 disabled:opacity-50 text-white font-semibold text-xs rounded-lg transition-colors flex items-center justify-center gap-2 shadow-lg shadow-blue-600/20"
          >
            {isInstalling ? (
              <>
                <RefreshCw size={14} className="animate-spin" />
                <span>Installing into Adobe CEP...</span>
              </>
            ) : (
              <>
                <Download size={14} />
                <span>{isInstalled ? 'Reinstall / Update Extension' : '1-Click Install into Premiere Pro'}</span>
              </>
            )}
          </button>

          <div className="text-[11px] text-gray-400 bg-gray-950/40 p-3 rounded-lg border border-gray-800/60 space-y-1">
            <p className="font-semibold text-gray-300">How to open in Premiere Pro:</p>
            <p>1. Open or restart Adobe Premiere Pro.</p>
            <p>2. Go to top menu: <span className="font-mono text-blue-400">Window &gt; Extensions &gt; Scaffild AutoSync</span>.</p>
            <p>3. Drop files into your project folders on disk�they sync automatically!</p>
          </div>
        </div>
      </div>
    </div>
  );
}
