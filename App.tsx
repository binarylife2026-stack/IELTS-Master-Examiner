
import React, { useState } from 'react';
import { Module } from './types';
import Header from './components/Header';
import Dashboard from './components/Dashboard';
import SpeakingModule from './components/SpeakingModule';
import WritingModule from './components/WritingModule';
import ReadingModule from './components/ReadingModule';
import ListeningModule from './components/ListeningModule';
import GeneralChatModule from './components/GeneralChatModule';

const App: React.FC = () => {
  const [activeModule, setActiveModule] = useState<Module>('dashboard');

  const renderModule = () => {
    switch (activeModule) {
      case 'speaking':
        return <SpeakingModule onBack={() => setActiveModule('dashboard')} />;
      case 'writing':
        return <WritingModule onBack={() => setActiveModule('dashboard')} />;
      case 'reading':
        return <ReadingModule onBack={() => setActiveModule('dashboard')} />;
      case 'listening':
        return <ListeningModule onBack={() => setActiveModule('dashboard')} />;
      case 'general-chat':
        return <GeneralChatModule onBack={() => setActiveModule('dashboard')} />;
      default:
        return <Dashboard onSelectModule={setActiveModule} />;
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#F8FAFC]">
      <Header />
      <main className="flex-1 container mx-auto px-4 py-8 max-w-6xl">
        {renderModule()}
      </main>
      <footer className="py-6 border-t border-slate-200 text-center text-slate-500 text-sm">
        &copy; {new Date().getFullYear()} IELTS Master Examiner. British Council Standard Preparation.
      </footer>
    </div>
  );
};

export default App;
