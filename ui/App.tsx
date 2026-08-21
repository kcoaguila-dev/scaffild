import { useState } from 'react';
import ProjectBuilder from './ProjectBuilder';
import TemplateManager from './TemplateManager';
import MediaIngest from './MediaIngest';
import { Film } from 'lucide-react';

function App() {
  const [activeTab, setActiveTab] = useState<'build' | 'templates' | 'ingest'>('build');

  return (
    <div className="min-h-screen bg-[#121212] text-gray-200">
      <header className="bg-gray-900 border-b border-gray-800 p-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2 text-xl font-bold text-white">
            <Film className="text-blue-500" />
            Scaffild
          </div>
          <nav className="flex gap-2">
            <button
              onClick={() => setActiveTab('build')}
              className={`px-3.5 py-1.5 rounded-md text-sm font-medium transition-colors ${
                activeTab === 'build' ? 'bg-blue-600 text-white shadow-sm' : 'text-gray-300 hover:bg-gray-850 hover:text-white'
              }`}
            >
              New Project
            </button>
            <button
              onClick={() => setActiveTab('templates')}
              className={`px-3.5 py-1.5 rounded-md text-sm font-medium transition-colors ${
                activeTab === 'templates' ? 'bg-blue-600 text-white shadow-sm' : 'text-gray-300 hover:bg-gray-850 hover:text-white'
              }`}
            >
              Templates
            </button>
            <button
              onClick={() => setActiveTab('ingest')}
              className={`px-3.5 py-1.5 rounded-md text-sm font-medium transition-colors ${
                activeTab === 'ingest' ? 'bg-purple-600 text-white shadow-sm' : 'text-gray-400 hover:bg-gray-850 hover:text-gray-200'
              }`}
            >
              Media Ingest
            </button>
          </nav>
        </div>
      </header>

      <main className="max-w-6xl mx-auto p-4">
        {activeTab === 'build' && <ProjectBuilder />}
        {activeTab === 'templates' && <TemplateManager />}
        {activeTab === 'ingest' && <MediaIngest />}
      </main>
    </div>
  );
}

export default App;
