
import React, { useState, useEffect } from 'react';
import { generateListeningTest } from '../services/gemini';
import { saveResult } from '../services/storage';

interface ListeningModuleProps {
  onBack: () => void;
}

const ListeningModule: React.FC<ListeningModuleProps> = ({ onBack }) => {
  const [loading, setLoading] = useState(true);
  const [testData, setTestData] = useState<any>(null);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [submitted, setSubmitted] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);

  useEffect(() => {
    const fetchTest = async () => {
      try {
        const data = await generateListeningTest();
        setTestData(data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchTest();
  }, []);

  const getScore = () => {
    let score = 0;
    testData.questions.forEach((q: any) => {
      if (answers[q.id]?.toLowerCase().trim() === q.answer.toLowerCase().trim()) score++;
    });
    return score;
  };

  const handleCheckAnswers = () => {
    const score = getScore();
    const bandScore = Math.max(1, Math.min(9, score / 1.1 + 1));
    saveResult({ module: 'listening', score: parseFloat(bandScore.toFixed(1)) });
    setSubmitted(true);
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 space-y-4">
        <div className="w-12 h-12 border-4 border-rose-600 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-slate-600 font-medium">Preparing Listening Section...</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <button onClick={onBack} className="flex items-center text-slate-600 hover:text-slate-900 font-medium">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" />
          </svg>
          Back to Dashboard
        </button>
        <div className="text-right">
           <h3 className="text-xl font-bold">Listening Module</h3>
           <p className="text-sm text-slate-500">{testData.scenario}</p>
        </div>
      </div>

      <div className="bg-[#0F172A] rounded-3xl p-8 text-white shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-rose-500/10 rounded-full -mr-32 -mt-32 blur-3xl"></div>
        <div className="relative z-10 flex flex-col md:flex-row items-center gap-8">
            <div className="w-24 h-24 bg-white/10 rounded-2xl flex items-center justify-center backdrop-blur-md">
                <svg xmlns="http://www.w3.org/2000/svg" className={`h-12 w-12 text-rose-500 ${isPlaying ? 'animate-pulse' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                </svg>
            </div>
            <div className="flex-1 space-y-4">
                <div className="space-y-1">
                    <h4 className="text-lg font-bold">Audio Track</h4>
                    <p className="text-slate-400 text-sm">Academic Tutorial</p>
                </div>
                <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
                    <div className={`h-full bg-rose-500 transition-all duration-1000 ${isPlaying ? 'w-1/2' : 'w-0'}`}></div>
                </div>
            </div>
            <button 
                onClick={() => setIsPlaying(!isPlaying)}
                className="w-16 h-16 bg-rose-600 rounded-full flex items-center justify-center hover:bg-rose-500 transition-colors shadow-lg active:scale-95"
            >
                {isPlaying ? (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zM7 8a1 1 0 012 0v4a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v4a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 ml-1" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
                    </svg>
                )}
            </button>
        </div>
      </div>

      <div className="bg-white rounded-3xl shadow-sm border border-slate-200 p-8 space-y-8">
        <h3 className="text-xl font-bold text-slate-900 border-b pb-4">Exam Questions</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {testData.questions.map((q: any) => (
                <div key={q.id} className={`p-6 rounded-2xl border ${submitted ? (answers[q.id]?.toLowerCase().trim() === q.answer.toLowerCase().trim() ? 'bg-emerald-50 border-emerald-200' : 'bg-rose-50 border-rose-200') : 'bg-slate-50 border-slate-100'}`}>
                    <div className="flex items-start space-x-3">
                        <span className="w-8 h-8 rounded-lg bg-white flex items-center justify-center text-xs font-black shadow-sm text-slate-400 border border-slate-100">
                            {q.id}
                        </span>
                        <div className="flex-1 space-y-3">
                            <p className="text-sm font-bold text-slate-800">{q.text}</p>
                            {q.options ? (
                                <div className="space-y-1">
                                    {q.options.map((opt: string, i: number) => (
                                        <button 
                                            key={i}
                                            disabled={submitted}
                                            onClick={() => setAnswers({...answers, [q.id]: opt})}
                                            className={`w-full text-left text-xs p-2 rounded-md border transition-all ${answers[q.id] === opt ? 'bg-[#003399] text-white border-[#003399]' : 'bg-white border-slate-200 hover:border-slate-300'}`}
                                        >
                                            {opt}
                                        </button>
                                    ))}
                                </div>
                            ) : (
                                <input 
                                    disabled={submitted}
                                    type="text" 
                                    className="w-full bg-white p-2 rounded-lg border border-slate-200 text-xs focus:ring-2 focus:ring-rose-500 outline-none"
                                    placeholder="Answer..."
                                    value={answers[q.id] || ''}
                                    onChange={(e) => setAnswers({...answers, [q.id]: e.target.value})}
                                />
                            )}
                        </div>
                    </div>
                </div>
            ))}
        </div>

        <div className="pt-4 border-t flex items-center justify-between">
            <p className="text-xs text-slate-400 font-medium">Spelling counts!</p>
            {!submitted ? (
                <button 
                    onClick={handleCheckAnswers}
                    className="bg-rose-600 text-white px-8 py-3 rounded-xl font-bold shadow-lg hover:bg-rose-700 transition-all"
                >
                    Submit Answers
                </button>
            ) : (
                <div className="flex items-center space-x-4">
                    <div className="text-right">
                        <p className="text-sm font-bold text-slate-900">Score: {getScore()} / {testData.questions.length}</p>
                        <p className="text-xs text-slate-500 italic">Band: {(getScore() / 1.1 + 1).toFixed(1)}</p>
                    </div>
                    <button 
                        onClick={() => window.location.reload()}
                        className="bg-slate-900 text-white px-6 py-2 rounded-xl text-xs font-bold"
                    >
                        Try Again
                    </button>
                </div>
            )}
        </div>
      </div>
    </div>
  );
};

export default ListeningModule;
