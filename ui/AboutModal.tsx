import { X } from 'lucide-react';
import ScaffildLogo from './ScaffildLogo';

interface AboutModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function AboutModal({ isOpen, onClose }: AboutModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-gray-900 border border-gray-700 rounded-lg shadow-2xl max-w-sm w-full overflow-hidden text-white animate-in fade-in zoom-in-95 duration-150 text-center p-6 space-y-4">
        <div className="flex justify-end">
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        <div className="inline-flex p-1.5 bg-gray-950 border border-cyan-500/30 rounded-full shadow-2xl shadow-cyan-900/20">
          <ScaffildLogo size={64} />
        </div>

        <div>
          <h3 className="text-xl font-bold text-white">Scaffild</h3>
          <p className="text-xs text-gray-400 font-mono mt-0.5">Version 0.1.0</p>
        </div>

        <p className="text-xs text-gray-300 leading-relaxed">
          High-performance desktop post-production project scaffolding, genuine Adobe project asset cloning, and checksum-verified media offloader.
        </p>

        <div className="pt-2 border-t border-gray-800 text-[11px] text-gray-500">
          Built with Tauri v2, Rust & React 19
        </div>

        <button
          onClick={onClose}
          className="w-full py-2 bg-gray-800 hover:bg-gray-700 text-white rounded text-xs font-semibold transition-colors"
        >
          Close
        </button>
      </div>
    </div>
  );
}
