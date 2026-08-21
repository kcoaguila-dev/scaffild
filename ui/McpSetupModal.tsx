import { useState } from 'react';
import { Bot, Copy, Check, Terminal, X, Zap } from 'lucide-react';

interface McpSetupModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function McpSetupModal({ isOpen, onClose }: McpSetupModalProps) {
  const [copiedType, setCopiedType] = useState<string | null>(null);

  if (!isOpen) return null;

  const claudeConfig = JSON.stringify({
    mcpServers: {
      scaffild: {
        command: "scaffild",
        args: ["mcp"]
      }
    }
  }, null, 2);

  const cursorConfig = JSON.stringify({
    name: "scaffild",
    type: "stdio",
    command: "scaffild mcp"
  }, null, 2);

  const handleCopy = (text: string, type: string) => {
    navigator.clipboard.writeText(text);
    setCopiedType(type);
    setTimeout(() => setCopiedType(null), 2500);
  };

  return (
    <div className="fixed inset-0 bg-black/75 flex items-center justify-center p-4 z-50 animate-fade-in backdrop-blur-sm">
      <div className="bg-gray-900 border border-gray-700 rounded-xl max-w-2xl w-full p-6 shadow-2xl relative text-white">
        <div className="flex items-center justify-between mb-4 pb-3 border-b border-gray-800">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-purple-600/20 border border-purple-500/40 flex items-center justify-center text-purple-400">
              <Bot size={20} />
            </div>
            <div>
              <h3 className="text-base font-bold">AI Agent Setup (Model Context Protocol)</h3>
              <p className="text-xs text-gray-400">Connect Claude Desktop, Cursor, Antigravity, or terminal agents to Scaffild</p>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white p-1">
            <X size={18} />
          </button>
        </div>

        <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
          <div className="bg-purple-950/30 border border-purple-800/40 rounded-lg p-3 text-xs text-purple-200 flex items-start gap-2.5">
            <Zap size={16} className="text-purple-400 shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold text-purple-300">What AI Agents Can Do:</span> With Scaffild MCP, your AI agents can autonomously list templates, scaffold full Premiere/Photoshop project folders, ingest camera media with xxHash64 verification, and trigger Premiere bin syncs.
            </div>
          </div>

          {/* Claude Desktop Config */}
          <div className="bg-gray-800/80 border border-gray-700 rounded-lg p-3.5">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-gray-200">Claude Desktop Config</span>
                <span className="text-[10px] bg-gray-700 text-gray-300 px-1.5 py-0.5 rounded font-mono">claude_desktop_config.json</span>
              </div>
              <button
                onClick={() => handleCopy(claudeConfig, 'claude')}
                className="flex items-center gap-1 bg-gray-700 hover:bg-gray-600 text-xs px-2.5 py-1 rounded transition-colors text-gray-200"
              >
                {copiedType === 'claude' ? <Check size={13} className="text-green-400" /> : <Copy size={13} />}
                {copiedType === 'claude' ? 'Copied!' : 'Copy Config'}
              </button>
            </div>
            <pre className="bg-gray-950 p-2.5 rounded font-mono text-[11px] text-purple-300 overflow-x-auto border border-gray-850">
              {claudeConfig}
            </pre>
          </div>

          {/* Cursor Config */}
          <div className="bg-gray-800/80 border border-gray-700 rounded-lg p-3.5">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-gray-200">Cursor MCP Server</span>
                <span className="text-[10px] bg-gray-700 text-gray-300 px-1.5 py-0.5 rounded">Cursor Settings &gt; Features &gt; MCP</span>
              </div>
              <button
                onClick={() => handleCopy(cursorConfig, 'cursor')}
                className="flex items-center gap-1 bg-gray-700 hover:bg-gray-600 text-xs px-2.5 py-1 rounded transition-colors text-gray-200"
              >
                {copiedType === 'cursor' ? <Check size={13} className="text-green-400" /> : <Copy size={13} />}
                {copiedType === 'cursor' ? 'Copied!' : 'Copy'}
              </button>
            </div>
            <pre className="bg-gray-950 p-2.5 rounded font-mono text-[11px] text-blue-300 overflow-x-auto border border-gray-850">
              {cursorConfig}
            </pre>
          </div>

          {/* Terminal CLI Usage */}
          <div className="bg-gray-800/80 border border-gray-700 rounded-lg p-3.5">
            <div className="flex items-center gap-2 mb-2 text-xs font-bold text-gray-200">
              <Terminal size={14} className="text-green-400" /> Headless Terminal CLI
            </div>
            <div className="space-y-1.5 font-mono text-[11px] text-gray-300 bg-gray-950 p-2.5 rounded border border-gray-850">
              <div className="text-gray-500"># Run MCP Server for custom agent scripts</div>
              <div className="text-green-400">scaffild mcp</div>
              <div className="text-gray-500 pt-1"># Build a project headlessly</div>
              <div>scaffild build --template Horizontal_Video --target D:\Projects --title "Nike_Ad" --open</div>
              <div className="text-gray-500 pt-1"># Offload media with xxHash64 checksums</div>
              <div>scaffild ingest --source E:\DCIM --primary D:\Projects\Footage --secondary F:\Backup</div>
            </div>
          </div>
        </div>

        <div className="mt-5 pt-3 border-t border-gray-800 flex justify-end">
          <button
            onClick={onClose}
            className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold px-4 py-2 rounded transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
