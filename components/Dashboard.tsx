
import React, { useState, useEffect, useMemo } from 'react';
import { Module, ExamResult } from '../types';
import { getResults, clearResults } from '../services/storage';

interface DashboardProps {
  onSelectModule: (module: Module) => void;
}

const Dashboard: React.FC<DashboardProps> = ({ onSelectModule }) => {
  const [showHistory, setShowHistory] = useState(false);
  const [results, setResults] = useState<ExamResult[]>([]);

  useEffect(() => {
    setResults(getResults());
  }, []);

  useEffect(() => {
    if (showHistory) {
      setResults(getResults());
    }
  }, [showHistory]);

  const stats = useMemo(() => {
    if (results.length === 0) return { avg: 0, total: 0, weakArea: 'None' };
    const avg = results.reduce((acc, curr) => acc + curr.score, 0) / results.length;
    
    const moduleScores: Record<string, number[]> = {};
    results.forEach(r => {
      if (!moduleScores[r.module]) moduleScores[r.module] = [];
      moduleScores[r.module].push(r.score);
    });

    let weakArea = 'None';
    let minAvg = 10;
    Object.entries(moduleScores).forEach(([mod, scores]) => {
      const modAvg = scores.reduce((a, b) => a + b, 0) / scores.length;
      if (modAvg < minAvg) {
        minAvg = modAvg;
        weakArea = mod;
      }
    });

    return { avg: parseFloat(avg.toFixed(1)), total: results.length, weakArea };
  }, [results]);

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
    <div className="space-y-10 animate-in fade-in duration-500 pb-20">
      <div className="flex flex-col lg:flex-row gap-8 items-start">
        <div className="flex-1 space-y-4">
          <h2 className="text-3xl font-extrabold text-slate-900 sm:text-4xl">
            Welcome to Your Mock Test Center
          </h2>
          <p className="text-lg text-slate-600 max-w-2xl leading-relaxed">
            Choose a module to start your realistic IELTS exam simulation. Your performance will be graded against official British Council standards.
          </p>
        </div>

        {results.length > 0 && (
          <div className="w-full lg:w-80 bg-white rounded-3xl p-6 shadow-sm border border-slate-100 space-y-4">
            <h4 className="text-xs font-black uppercase tracking-widest text-slate-400">Progress Tracker</h4>
            <div className="flex items-end justify-between">
              <div>
                <p className="text-3xl font-black text-blue-600">{stats.avg}</p>
                <p className="text-xs font-bold text-slate-500">Avg. Band Score</p>
              </div>
              <div className="flex space-x-1 h-12 items-end">
                {results.slice(-5).map((r, i) => (
                  <div 
                    key={i} 
                    className="w-2 bg-blue-500 rounded-t-sm transition-all hover:bg-blue-600"
                    style={{ height: `${(r.score / 9) * 100}%` }}
                    title={`${r.module}: ${r.score}`}
                  ></div>
                ))}
              </div>
            </div>
            <div className="pt-4 border-t border-slate-50">
               <p className="text-[10px] font-bold text-slate-400 uppercase">Improvement Tip</p>
               <p className="text-xs text-slate-600 leading-relaxed mt-1">
                 {stats.weakArea !== 'None' ? `Focus more on ${stats.weakArea} to boost your overall average.` : "Keep practicing across all modules!"}
               </p>
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
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
          </button>
        ))}
      </div>

      <div className="flex flex-col items-center space-y-6 pt-10">
        <div className="w-full h-px bg-gradient-to-r from-transparent via-slate-200 to-transparent"></div>
        <button 
          onClick={() => onSelectModule('speaking')}
          className="group px-12 py-6 bg-[#003399] text-white rounded-3xl font-black text-2xl shadow-2xl hover:bg-blue-800 hover:scale-[1.02] transition-all flex items-center space-x-4 border-4 border-blue-400/20"
        >
          <span>START FULL MOCK TEST</span>
          <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 group-hover:translate-x-2 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M13 5l7 7-7 7M5 5l7 7-7 7" />
          </svg>
        </button>
        <p className="text-slate-400 text-xs font-bold uppercase tracking-widest">Simulation of official British Council examination</p>
      </div>

      <div className="bg-white border border-slate-200 rounded-3xl p-8 flex flex-col md:flex-row items-center justify-between gap-8">
        <div className="flex items-start space-x-6">
          <div className="p-4 bg-blue-50 rounded-2xl text-blue-600 shadow-inner">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
          </div>
          <div className="space-y-1">
            <h4 className="font-black text-slate-900 text-xl tracking-tight">Review Your Journey</h4>
            <p className="text-slate-500 leading-relaxed max-w-md">Every mock test is stored locally so you can track your progress and revisit examiner feedback anytime.</p>
          </div>
        </div>
        <button 
          onClick={() => setShowHistory(true)}
          className="whitespace-nowrap bg-slate-900 text-white px-8 py-4 rounded-2xl font-black hover:bg-slate-800 transition-all shadow-xl active:scale-95"
        >
          OPEN EXAM HISTORY
        </button>
      </div>

      {showHistory && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white rounded-[2rem] w-full max-w-2xl max-h-[85vh] overflow-hidden shadow-2xl flex flex-col border border-white/20">
            <div className="p-8 border-b flex items-center justify-between bg-slate-50">
              <div>
                <h3 className="text-2xl font-black text-slate-900 tracking-tight">Exam History</h3>
                <p className="text-slate-500 text-sm font-medium">Your past performance analytics</p>
              </div>
              <button onClick={() => setShowHistory(false)} className="p-3 hover:bg-slate-200 rounded-2xl transition-all">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-8 space-y-4 custom-scrollbar">
              {results.length === 0 ? (
                <div className="text-center py-20 text-slate-400 space-y-4">
                  <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mx-auto opacity-50">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <p className="font-bold">No test results found yet.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {results.map((r) => (
                    <div key={r.id} className="group bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between hover:border-blue-200 hover:shadow-md transition-all">
                      <div className="flex items-center space-x-5">
                         <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-white shadow-sm transition-transform group-hover:scale-110 ${
                           r.module === 'speaking' ? 'bg-indigo-600' :
                           r.module === 'writing' ? 'bg-emerald-600' :
                           r.module === 'reading' ? 'bg-amber-600' : 'bg-rose-600'
                         }`}>
                           <span className="text-sm font-black uppercase">{r.module.charAt(0)}</span>
                         </div>
                         <div>
                            <p className="font-black text-slate-900 capitalize tracking-tight">{r.module}</p>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                              {new Date(r.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                            </p>
                         </div>
                      </div>
                      <div className="flex items-center space-x-3">
                        <div className="text-right">
                          <p className="text-xs font-bold text-slate-400 uppercase">Score</p>
                          <p className="text-xl font-black text-slate-900">{r.score.toFixed(1)}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="p-8 border-t bg-slate-50 flex justify-between items-center">
              <button 
                onClick={() => { if(confirm('Delete all your exam history permanently?')) { clearResults(); setResults([]); } }}
                className="text-xs font-bold text-slate-400 hover:text-red-600 transition-colors uppercase tracking-widest"
              >
                Clear History
              </button>
              <button 
                onClick={() => setShowHistory(false)}
                className="bg-[#003399] text-white px-10 py-3 rounded-2xl font-black text-sm shadow-xl hover:bg-blue-800 transition-all active:scale-95"
              >
                CLOSE
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
