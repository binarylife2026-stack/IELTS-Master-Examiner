
import React, { useState, useEffect } from 'react';
import { generateReadingTest } from '../services/gemini';
import { saveResult } from '../services/storage';

interface ReadingModuleProps {
  onBack: () => void;
}

const ReadingModule: React.FC<ReadingModuleProps> = ({ onBack }) => {
  const [loading, setLoading] = useState(true);
  const [testData, setTestData] = useState<any>(null);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    const fetchTest = async () => {
      try {
        const data = await generateReadingTest();
        setTestData(data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchTest();
  }, []);

  const handleSelectAnswer = (qId: number, ans: string) => {
    setAnswers(prev => ({ ...prev, [qId]: ans }));
  };

  const getScore = () => {
    let score = 0;
    testData.questions.forEach((q: any) => {
      if (answers[q.id]?.toLowerCase() === q.answer.toLowerCase()) score++;
    });
    return score;
  };

  const handleCheckAnswers = () => {
    const score = getScore();
    const bandScore = Math.max(1, Math.min(9, score / 1.1 + 1));
    saveResult({ module: 'reading', score: parseFloat(bandScore.toFixed(1)) });
    setSubmitted(true);
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 space-y-4">
        <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-slate-600 font-medium">Generating a fresh Reading test...</p>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <button onClick={onBack} className="flex items-center text-slate-600 hover:text-slate-900 font-medium">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" />
          </svg>
          Back to Dashboard
        </button>
        {submitted && (
            <div className="bg-emerald-600 text-white px-4 py-1.5 rounded-full text-sm font-bold shadow-md">
                Score: {getScore()} / {testData.questions.length}
            </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-stretch">
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8 overflow-y-auto max-h-[700px] custom-scrollbar">
          <h2 className="text-2xl font-black text-[#003399] mb-4 uppercase tracking-tight">{testData.title}</h2>
          <div className="prose prose-slate max-w-none">
            {testData.passage.split('\n\n').map((para: string, i: number) => (
              <p key={i} className="text-slate-700 leading-loose mb-4">{para}</p>
            ))}
          </div>
        </div>

        <div className="bg-slate-50 rounded-2xl border border-slate-200 p-8 overflow-y-auto max-h-[700px] custom-scrollbar space-y-8">
          <div className="flex items-center justify-between">
             <h3 className="text-xl font-bold text-slate-900">Questions 1-10</h3>
             <span className="text-xs bg-slate-200 text-slate-600 px-2 py-1 rounded-md font-bold uppercase">Reading</span>
          </div>

          <div className="space-y-6">
            {testData.questions.map((q: any) => (
              <div key={q.id} className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
                <p className="font-bold text-slate-800 leading-relaxed">
                   <span className="text-blue-600 mr-2">{q.id}.</span> {q.text}
                </p>
                
                {q.options ? (
                  <div className="grid grid-cols-1 gap-2">
                    {q.options.map((opt: string, idx: number) => (
                      <button
                        key={idx}
                        disabled={submitted}
                        onClick={() => handleSelectAnswer(q.id, opt)}
                        className={`text-left px-4 py-2 rounded-lg border text-sm font-medium transition-all ${
                          answers[q.id] === opt 
                            ? (submitted ? (opt.toLowerCase().includes(q.answer.toLowerCase()) ? 'bg-emerald-50 border-emerald-500 text-emerald-800' : 'bg-red-50 border-red-500 text-red-800') : 'bg-blue-50 border-blue-500 text-blue-700')
                            : 'bg-white border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        {opt}
                      </button>
                    ))}
                  </div>
                ) : (
                  <input
                    disabled={submitted}
                    type="text"
                    value={answers[q.id] || ''}
                    onChange={(e) => handleSelectAnswer(q.id, e.target.value)}
                    className="w-full p-2 border-b-2 border-slate-200 focus:border-blue-500 outline-none text-sm"
                    placeholder="Type answer..."
                  />
                )}

                {submitted && (
                  <div className="mt-4 p-4 bg-slate-50 rounded-lg text-xs space-y-1">
                    <p className="font-bold text-slate-700 uppercase tracking-tighter">Explanation</p>
                    <p className="text-emerald-700 font-bold mb-1">Answer: {q.answer}</p>
                    <p className="text-slate-500 leading-relaxed italic">{q.explanation}</p>
                  </div>
                )}
              </div>
            ))}
          </div>

          {!submitted ? (
            <button
              onClick={handleCheckAnswers}
              className="w-full py-4 bg-[#003399] text-white rounded-xl font-bold shadow-lg hover:bg-blue-800 transition-colors"
            >
              Check Answers
            </button>
          ) : (
            <div className="space-y-4">
                <div className="bg-blue-50 p-6 rounded-2xl text-center space-y-2">
                    <p className="text-blue-900 font-bold">Mock Score: {getScore()} / {testData.questions.length}</p>
                    <p className="text-blue-700 text-sm">Estimated Reading Band: {(getScore() / 1.1 + 1).toFixed(1)}</p>
                </div>
                <button
                    onClick={() => window.location.reload()}
                    className="w-full py-3 border-2 border-slate-200 rounded-xl font-bold hover:bg-white transition-colors"
                >
                    Try Another Test
                </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ReadingModule;
