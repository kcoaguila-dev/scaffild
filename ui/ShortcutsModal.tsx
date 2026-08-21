import { X, Keyboard } from 'lucide-react';

interface ShortcutsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function ShortcutsModal({ isOpen, onClose }: ShortcutsModalProps) {
  if (!isOpen) return null;

  const shortcuts = [
    { category: 'Navigation', keys: ['Ctrl', '1'], description: 'Switch to New Project tab' },
    { category: 'Navigation', keys: ['Ctrl', '2'], description: 'Switch to Templates tab' },
    { category: 'Navigation', keys: ['Ctrl', '3'], description: 'Switch to Media Ingest tab' },
    { category: 'Project Builder', keys: ['Ctrl', 'Enter'], description: 'Build and scaffold project' },
    { category: 'Project Builder', keys: ['Ctrl', 'O'], description: 'Browse target destination directory' },
    { category: 'General', keys: ['F1'], description: 'Open Keyboard Shortcuts Help' },
    { category: 'General', keys: ['Esc'], description: 'Close modal dialogs' },
  ];

  return (
    <div className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-gray-900 border border-gray-700 rounded-lg shadow-2xl max-w-md w-full overflow-hidden text-white animate-in fade-in zoom-in-95 duration-150">
        <div className="flex justify-between items-center px-5 py-4 border-b border-gray-800 bg-gray-900">
          <div className="flex items-center gap-2 font-bold text-base text-white">
            <Keyboard className="text-blue-400" size={18} />
            <span>Keyboard Shortcuts</span>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        <div className="p-5 max-h-[70vh] overflow-y-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="font-semibold text-gray-400 uppercase border-b border-gray-800">
                <th className="pb-2">Command</th>
                <th className="pb-2 text-right">Shortcut</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800/60 font-sans">
              {shortcuts.map((s, idx) => (
                <tr key={idx} className="hover:bg-gray-800/40">
                  <td className="py-2.5 text-gray-200">
                    <div className="font-medium">{s.description}</div>
                    <div className="text-[10px] text-gray-500">{s.category}</div>
                  </td>
                  <td className="py-2.5 text-right whitespace-nowrap">
                    <div className="flex items-center justify-end gap-1 font-mono">
                      {s.keys.map((k, kIdx) => (
                        <span key={kIdx}>
                          <kbd className="px-1.5 py-0.5 rounded bg-gray-800 border border-gray-700 text-gray-200 shadow-sm text-[11px]">
                            {k}
                          </kbd>
                          {kIdx < s.keys.length - 1 && <span className="text-gray-500 mx-0.5">+</span>}
                        </span>
                      ))}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="px-5 py-3 border-t border-gray-800 bg-gray-900 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded text-xs font-semibold transition-colors shadow-sm"
          >
            Got it
          </button>
        </div>
      </div>
    </div>
  );
}
