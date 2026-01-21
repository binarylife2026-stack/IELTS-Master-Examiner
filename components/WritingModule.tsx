
import React, { useState } from 'react';
import { gradeWriting } from '../services/gemini';
import { saveResult } from '../services/storage';
import { Feedback } from '../types';

interface WritingModuleProps {
  onBack: () => void;
}

const WritingModule: React.FC<WritingModuleProps> = ({ onBack }) => {
  const [taskType, setTaskType] = useState<'Task 1' | 'Task 2'>('Task 2');
  const [userText, setUserText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<Feedback | null>(null);

  const tasks = {
    'Task 1': "The chart below shows the levels of participation in different sports in a specific country between 2010 and 2020. Summarize the information by selecting and reporting the main features, and make comparisons where relevant. (Write at least 150 words)",
    'Task 2': "Some people believe that it is best to accept a bad situation, such as an unsatisfactory job or shortage of money. Others argue that it is better to try and improve such situations. Discuss both these views and give your own opinion. (Write at least 250 words)"
  };

  const wordCount = userText.trim().split(/\s+/).filter(x => x.length > 0).length;

  const handleSubmit = async () => {
    if (userText.length < 50) {
      alert("Please write a bit more before submitting for feedback.");
      return;
    }
    setIsSubmitting(true);
    try {
      const result = await gradeWriting(taskType, tasks[taskType], userText);
      setFeedback(result);
      saveResult({ module: 'writing', score: result.bandScore });
    } catch (err) {
      console.error(err);
      alert("Failed to grade your writing. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const getBandColor = (score: number) => {
    if (score >= 8) return 'bg-emerald-100 text-emerald-800 border-emerald-200';
    if (score >= 7) return 'bg-blue-100 text-blue-800 border-blue-200';
    if (score >= 6) return 'bg-amber-100 text-amber-800 border-amber-200';
    return 'bg-red-100 text-red-800 border-red-200';
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <button onClick={onBack} className="flex items-center text-slate-600 hover:text-slate-900 font-medium">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" />
          </svg>
          Back to Dashboard
        </button>
        <div className="flex bg-slate-200 p-1 rounded-xl">
          <button 
            onClick={() => {setTaskType('Task 1'); setFeedback(null);}}
            className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${taskType === 'Task 1' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
          >
            Task 1
          </button>
          <button 
            onClick={() => {setTaskType('Task 2'); setFeedback(null);}}
            className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${taskType === 'Task 2' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
          >
            Task 2
          </button>
        </div>
      </div>

      {!feedback ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-stretch">
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8 space-y-6">
            <div className="flex items-center space-x-3 text-slate-900">
               <div className="p-2 bg-blue-100 rounded-lg text-blue-700">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
               </div>
               <h3 className="text-xl font-bold">{taskType} Prompt</h3>
            </div>
            <div className="prose prose-slate">
                <p className="text-slate-700 text-lg leading-relaxed">{tasks[taskType]}</p>
            </div>
            <div className="pt-4 border-t border-slate-100 space-y-2">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Scoring Criteria</p>
                <div className="grid grid-cols-2 gap-2">
                    <span className="text-xs bg-slate-50 p-2 rounded border">Task Response</span>
                    <span className="text-xs bg-slate-50 p-2 rounded border">Coherence & Cohesion</span>
                    <span className="text-xs bg-slate-50 p-2 rounded border">Lexical Resource</span>
                    <span className="text-xs bg-slate-50 p-2 rounded border">Grammatical Accuracy</span>
                </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 flex flex-col p-6">
            <div className="flex justify-between items-center mb-4">
              <span className="text-sm font-bold text-slate-500">ANSWER SHEET</span>
              <span className={`text-sm font-bold ${wordCount < (taskType === 'Task 1' ? 150 : 250) ? 'text-amber-600' : 'text-emerald-600'}`}>
                {wordCount} Words
              </span>
            </div>
            <textarea
              value={userText}
              onChange={(e) => setUserText(e.target.value)}
              className="flex-1 min-h-[400px] w-full p-4 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-slate-800 leading-relaxed resize-none custom-scrollbar"
              placeholder="Type your response here..."
            />
            <div className="mt-6 flex justify-end">
              <button
                onClick={handleSubmit}
                disabled={isSubmitting || userText.length < 50}
                className={`px-8 py-3 bg-[#003399] text-white rounded-xl font-bold flex items-center space-x-2 shadow-lg transition-all ${isSubmitting ? 'opacity-50 cursor-not-allowed' : 'hover:bg-blue-800 hover:shadow-xl'}`}
              >
                {isSubmitting ? (
                    <>
                      <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      <span>Analyzing...</span>
                    </>
                ) : (
                    <>
                      <span>Submit for Grading</span>
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-8.707l-3-3a1 1 0 00-1.414 1.414L10.586 9H7a1 1 0 100 2h3.586l-1.293 1.293a1 1 0 101.414 1.414l3-3a1 1 0 000-1.414z" clipRule="evenodd" />
                      </svg>
                    </>
                )}
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-8 animate-in slide-in-from-bottom-4 duration-500">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden">
             <div className="bg-[#003399] p-8 text-white flex items-center justify-between">
                <div>
                   <p className="text-blue-200 text-sm font-bold uppercase tracking-widest mb-1">Official Examiner Report</p>
                   <h2 className="text-3xl font-extrabold">Results for {taskType}</h2>
                </div>
                <div className={`text-4xl font-black w-24 h-24 rounded-full flex flex-col items-center justify-center border-4 border-white ${getBandColor(feedback.bandScore)}`}>
                   <span className="text-xs font-bold uppercase -mb-1 opacity-70">Band</span>
                   {feedback.bandScore.toFixed(1)}
                </div>
             </div>
             
             <div className="p-8 grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-6">
                   <div className="space-y-2">
                      <h4 className="font-bold text-slate-900 border-l-4 border-blue-600 pl-3">Task Response</h4>
                      <p className="text-slate-600 text-sm leading-relaxed">{feedback.taskResponse}</p>
                   </div>
                   <div className="space-y-2">
                      <h4 className="font-bold text-slate-900 border-l-4 border-emerald-600 pl-3">Coherence & Cohesion</h4>
                      <p className="text-slate-600 text-sm leading-relaxed">{feedback.coherenceCohesion}</p>
                   </div>
                   <div className="space-y-2">
                      <h4 className="font-bold text-slate-900 border-l-4 border-amber-600 pl-3">Lexical Resource</h4>
                      <p className="text-slate-600 text-sm leading-relaxed">{feedback.lexicalResource}</p>
                   </div>
                   <div className="space-y-2">
                      <h4 className="font-bold text-slate-900 border-l-4 border-rose-600 pl-3">Grammatical Range</h4>
                      <p className="text-slate-600 text-sm leading-relaxed">{feedback.grammaticalRange}</p>
                   </div>
                </div>

                <div className="bg-slate-50 rounded-2xl p-6 border border-slate-100">
                    <h4 className="font-extrabold text-slate-900 mb-6 flex items-center">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                           <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                        Pedagogical Feedback
                    </h4>
                    <div className="space-y-4">
                        {feedback.corrections.map((c, i) => (
                            <div key={i} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-2">
                                <div className="flex flex-wrap items-center gap-2">
                                    <span className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded font-bold line-through">{c.original}</span>
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                       <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                                    </svg>
                                    <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-1 rounded font-bold">{c.corrected}</span>
                                </div>
                                <p className="text-xs text-slate-500 italic">{c.explanation}</p>
                            </div>
                        ))}
                    </div>
                    <div className="mt-8 text-center">
                        <button 
                            onClick={() => {setFeedback(null); setUserText('');}}
                            className="bg-slate-900 text-white px-6 py-2 rounded-xl text-sm font-bold hover:bg-slate-800 transition-colors"
                        >
                            Try Another Task
                        </button>
                    </div>
                </div>
             </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default WritingModule;
