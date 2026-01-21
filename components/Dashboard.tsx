
import React, { useState, useEffect } from 'react';
import { Module, ExamResult } from '../types';
import { getResults, clearResults } from '../services/storage';

interface DashboardProps {
  onSelectModule: (module: Module) => void;
}

const Dashboard: React.FC<DashboardProps> = ({ onSelectModule }) => {
  const [showHistory, setShowHistory] = useState(false);
  const [results, setResults] = useState<ExamResult[]>([]);

  useEffect(() => {
    if (showHistory) {
      setResults(getResults());
    }
  }, [showHistory]);

  const modules = [
    {
      id: 'speaking' as Module,
      title: 'Speaking Module',
      description: 'Face-to-face simulation with real-time AI audio feedback. Covers Part 1, 2, and 3.',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
        </svg>
      ),
      color: 'bg-indigo-600',
    },
    {
      id: 'writing' as Module,
      title: 'Writing Module',
      description: 'Practice Academic/General Task 1 and Task 2. Get detailed grammatical and lexical analysis.',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
        </svg>
      ),
      color: 'bg-emerald-600',
    },
    {
      id: 'reading' as Module,
      title: 'Reading Module',
      description: 'Full-length passages with interactive questions. Detailed explanations for Band 9 techniques.',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
        </svg>
      ),
      color: 'bg-amber-600',
    },
    {
      id: 'listening' as Module,
      title: 'Listening Module',
      description: 'Immersive audio tests. Practice keyword spotting and spelling in complex scenarios.',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
        </svg>
      ),
      color: 'bg-rose-600',
    },
    {
      id: 'general-chat' as Module,
      title: 'Casual Conversation',
      description: 'No exam pressure! Practice natural English fluency with our AI companion to improve talking skills.',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
        </svg>
      ),
      color: 'bg-sky-600',
    }
  ];

  return (
    <div className="space-y-12 animate-in fade-in duration-500 pb-20">
      <div className="text-center space-y-3">
        <h2 className="text-3xl font-extrabold text-slate-900 sm:text-4xl">
          Welcome to Your Mock Test Center
        </h2>
        <p className="text-lg text-slate-600 max-w-2xl mx-auto">
          Choose a module to start your realistic IELTS exam simulation. Your performance will be graded against official British Council standards.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pt-4">
        {modules.map((module) => (
          <button
            key={module.id}
            onClick={() => onSelectModule(module.id)}
            className="group relative bg-white rounded-2xl p-8 shadow-sm border border-slate-200 hover:shadow-xl transition-all duration-300 text-left overflow-hidden flex flex-col h-full"
          >
            <div className={`inline-flex p-3 rounded-xl text-white ${module.color} mb-6 transition-transform group-hover:scale-110`}>
              {module.icon}
            </div>
            <h3 className="text-xl font-bold text-slate-900 mb-2">{module.title}</h3>
            <p className="text-slate-600 leading-relaxed flex-grow">{module.description}</p>
            <div className="mt-6 flex items-center text-sm font-semibold text-slate-900">
              Start Module
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 ml-2 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
            <div className={`absolute top-0 right-0 w-24 h-24 -mr-8 -mt-8 opacity-[0.03] text-slate-900`}>
              {module.icon}
            </div>
          </button>
        ))}
      </div>

      <div className="flex flex-col items-center space-y-6">
        <div className="w-full h-px bg-gradient-to-r from-transparent via-slate-300 to-transparent"></div>
        <div className="text-center space-y-2">
            <h3 className="text-xl font-bold text-slate-900">Ready for a full simulation?</h3>
            <p className="text-slate-500 text-sm">Jump straight into the Speaking module for a complete examiner experience.</p>
        </div>
        <button 
          onClick={() => onSelectModule('speaking')}
          className="group px-10 py-5 bg-[#003399] text-white rounded-2xl font-black text-xl shadow-2xl hover:bg-blue-800 transition-all transform hover:-translate-y-1 active:scale-95 flex items-center space-x-4"
        >
          <span>START FULL MOCK TEST</span>
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 group-hover:translate-x-2 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M13 5l7 7-7 7M5 5l7 7-7 7" />
          </svg>
        </button>
      </div>

      <div className="bg-blue-50 border border-blue-100 rounded-2xl p-6 flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-start space-x-4">
          <div className="p-2 bg-blue-100 rounded-lg text-blue-700">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div>
            <h4 className="font-bold text-blue-900">Expert Mode Enabled</h4>
            <p className="text-blue-700 text-sm">All feedback is provided in English by default. For explanations in Bengali, simply ask the examiner during your session.</p>
          </div>
        </div>
        <button 
          onClick={() => setShowHistory(true)}
          className="whitespace-nowrap bg-white text-[#003399] border border-blue-200 px-6 py-2.5 rounded-lg font-bold hover:bg-blue-50 transition-colors shadow-sm"
        >
          View Exam History
        </button>
      </div>

      {showHistory && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-3xl w-full max-w-2xl max-h-[80vh] overflow-hidden shadow-2xl flex flex-col">
            <div className="p-6 border-b flex items-center justify-between bg-slate-50">
              <h3 className="text-xl font-black text-slate-900">Your Exam History</h3>
              <button onClick={() => setShowHistory(false)} className="p-2 hover:bg-slate-200 rounded-full transition-colors">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {results.length === 0 ? (
                <div className="text-center py-20 text-slate-400">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mx-auto mb-4 opacity-20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <p>No test results found yet. Start practicing!</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {results.map((r) => (
                    <div key={r.id} className="bg-slate-50 p-4 rounded-xl border border-slate-100 flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                         <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-white ${
                           r.module === 'speaking' ? 'bg-indigo-600' :
                           r.module === 'writing' ? 'bg-emerald-600' :
                           r.module === 'reading' ? 'bg-amber-600' : 'bg-rose-600'
                         }`}>
                           <span className="text-[10px] font-bold uppercase">{r.module.charAt(0)}</span>
                         </div>
                         <div>
                            <p className="font-bold text-slate-900 capitalize">{r.module}</p>
                            <p className="text-xs text-slate-500">{new Date(r.date).toLocaleDateString()} at {new Date(r.date).toLocaleTimeString()}</p>
                         </div>
                      </div>
                      <div className="bg-white px-3 py-1 rounded-lg border font-black text-slate-700">
                         {r.score.toFixed(1)}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="p-6 border-t bg-slate-50 flex justify-between">
              <button 
                onClick={() => { if(confirm('Clear all history?')) { clearResults(); setResults([]); } }}
                className="text-xs font-bold text-red-600 hover:underline"
              >
                Clear All History
              </button>
              <button 
                onClick={() => setShowHistory(false)}
                className="bg-[#003399] text-white px-6 py-2 rounded-xl text-sm font-bold"
              >
                Close Review
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
