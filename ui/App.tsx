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
            Slate
          </div>
          <nav className="flex gap-4">
            <button
              onClick={() => setActiveTab('build')}
              className={`px-3 py-1 rounded transition-colors ${activeTab === 'build' ? 'bg-blue-600 text-white' : 'hover:bg-gray-800'}`}
            >
              Builder
            </button>
            <button
              onClick={() => setActiveTab('templates')}
              className={`px-3 py-1 rounded transition-colors ${activeTab === 'templates' ? 'bg-blue-600 text-white' : 'hover:bg-gray-800'}`}
            >
              Templates
            </button>
            <button
              onClick={() => setActiveTab('ingest')}
              className={`px-3 py-1 rounded transition-colors ${activeTab === 'ingest' ? 'bg-blue-600 text-white' : 'hover:bg-gray-800'}`}
            >
              Ingest
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
