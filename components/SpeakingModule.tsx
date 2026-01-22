
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { GoogleGenAI, Modality, LiveServerMessage } from '@google/genai';
import { generateSpeakingTopic } from '../services/gemini';
import { saveResult } from '../services/storage';
import { VoiceName } from '../types';

interface SpeakingModuleProps {
  onBack: () => void;
}

const VOICES: { name: VoiceName, desc: string }[] = [
  { name: 'Zephyr', desc: 'Neutral, Professional' },
  { name: 'Kore', desc: 'Clear, Articulate' },
  { name: 'Charon', desc: 'Enthusiastic, Friendly' },
  { name: 'Puck', desc: 'Soft, Calm' },
  { name: 'Fenrir', desc: 'Deep, Authoritative' },
];

const SpeakingModule: React.FC<SpeakingModuleProps> = ({ onBack }) => {
  const [isConnecting, setIsConnecting] = useState(false);
  const [isActiveState, setIsActiveState] = useState(false);
  const [transcriptions, setTranscriptions] = useState<{role: 'Examiner' | 'Candidate', text: string}[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [selectedVoice, setSelectedVoice] = useState<VoiceName>('Kore');
  const [topic, setTopic] = useState<any>(null);
  const [prepTime, setPrepTime] = useState<number | null>(null);
  
  const audioContextRef = useRef<AudioContext | null>(null);
  const outputAudioContextRef = useRef<AudioContext | null>(null);
  const nextStartTimeRef = useRef(0);
  const sourcesRef = useRef(new Set<AudioBufferSourceNode>());
  const sessionRef = useRef<any>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const scriptProcessorRef = useRef<ScriptProcessorNode | null>(null);
  const isActiveRef = useRef(false);

  const encode = (bytes: Uint8Array) => {
    let binary = '';
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  };

  const decode = (base64: string) => {
    const binaryString = atob(base64);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes;
  };

  const decodeAudioData = async (
    data: Uint8Array,
    ctx: AudioContext,
    sampleRate: number,
    numChannels: number,
  ): Promise<AudioBuffer> => {
    const dataInt16 = new Int16Array(data.buffer);
    const frameCount = dataInt16.length / numChannels;
    const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

    for (let channel = 0; channel < numChannels; channel++) {
      const channelData = buffer.getChannelData(channel);
      for (let i = 0; i < frameCount; i++) {
        channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
      }
    }
    return buffer;
  };

  const stopTest = useCallback(() => {
    isActiveRef.current = false;
    setIsActiveState(false);
    
    if (sessionRef.current) {
      try { sessionRef.current.close(); } catch(e) {}
      sessionRef.current = null;
    }
    if (scriptProcessorRef.current) {
      scriptProcessorRef.current.disconnect();
      scriptProcessorRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setIsConnecting(false);
    setPrepTime(null);
  }, []);

  useEffect(() => {
    let timer: any;
    if (prepTime !== null && prepTime > 0) {
      timer = setTimeout(() => setPrepTime(prepTime - 1), 1000);
    } else if (prepTime === 0) {
      setPrepTime(null);
    }
    return () => clearTimeout(timer);
  }, [prepTime]);

  useEffect(() => {
    return () => stopTest();
  }, [stopTest]);

  const startTest = async () => {
    setIsConnecting(true);
    setError(null);
    setTranscriptions([]);

    try {
      const uniqueTopic = await generateSpeakingTopic();
      setTopic(uniqueTopic);

      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      
      const inputCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
      const outputCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      audioContextRef.current = inputCtx;
      outputAudioContextRef.current = outputCtx;

      // Resume context for browsers that auto-suspend
      if (inputCtx.state === 'suspended') await inputCtx.resume();
      if (outputCtx.state === 'suspended') await outputCtx.resume();

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const sessionPromise = ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-12-2025',
        callbacks: {
          onopen: () => {
            setIsConnecting(false);
            setIsActiveState(true);
            isActiveRef.current = true;
            
            const source = inputCtx.createMediaStreamSource(stream);
            const scriptProcessor = inputCtx.createScriptProcessor(4096, 1, 1);
            scriptProcessorRef.current = scriptProcessor;
            
            scriptProcessor.onaudioprocess = (e) => {
              if (!isActiveRef.current || !sessionRef.current) return;
              
              const inputData = e.inputBuffer.getChannelData(0);
              const l = inputData.length;
              const int16 = new Int16Array(l);
              for (let i = 0; i < l; i++) {
                int16[i] = inputData[i] * 32768;
              }
              const pcmBlob = {
                data: encode(new Uint8Array(int16.buffer)),
                mimeType: 'audio/pcm;rate=16000',
              };
              
              try {
                sessionRef.current.sendRealtimeInput({ media: pcmBlob });
              } catch (err) {
                console.warn("Input stream failed to send.");
              }
            };
            
            source.connect(scriptProcessor);
            scriptProcessor.connect(inputCtx.destination);
          },
          onmessage: async (message: LiveServerMessage) => {
            if (message.serverContent?.outputTranscription) {
              const text = message.serverContent.outputTranscription.text;
              if (text.toLowerCase().includes('one minute to think') || text.toLowerCase().includes('one minute to prepare')) {
                setPrepTime(60);
              }
              setTranscriptions(prev => {
                const last = prev[prev.length - 1];
                if (last && last.role === 'Examiner') {
                  const newText = last.text + text;
                  if (newText.toLowerCase().includes('concludes the test')) {
                    const bandMatch = newText.match(/band\s+(\d(\.\d)?)/i);
                    if (bandMatch) saveResult({ module: 'speaking', score: parseFloat(bandMatch[1]) });
                  }
                  return [...prev.slice(0, -1), { ...last, text: newText }];
                }
                return [...prev, { role: 'Examiner', text }];
              });
            } else if (message.serverContent?.inputTranscription) {
              const text = message.serverContent.inputTranscription.text;
              setTranscriptions(prev => {
                const last = prev[prev.length - 1];
                if (last && last.role === 'Candidate') {
                  return [...prev.slice(0, -1), { ...last, text: last.text + text }];
                }
                return [...prev, { role: 'Candidate', text }];
              });
            }

            const base64Audio = message.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
            if (base64Audio && outputAudioContextRef.current) {
              const ctx = outputAudioContextRef.current;
              nextStartTimeRef.current = Math.max(nextStartTimeRef.current, ctx.currentTime);
              try {
                const audioBuffer = await decodeAudioData(decode(base64Audio), ctx, 24000, 1);
                const source = ctx.createBufferSource();
                source.buffer = audioBuffer;
                source.connect(ctx.destination);
                source.addEventListener('ended', () => sourcesRef.current.delete(source));
                source.start(nextStartTimeRef.current);
                nextStartTimeRef.current += audioBuffer.duration;
                sourcesRef.current.add(source);
              } catch (e) {
                console.warn("Audio buffer error:", e);
              }
            }

            if (message.serverContent?.interrupted) {
              sourcesRef.current.forEach(s => { try { s.stop(); } catch(e){} });
              sourcesRef.current.clear();
              nextStartTimeRef.current = 0;
            }
          },
          onerror: (e) => {
            setError("Session interrupted. Try again.");
            stopTest();
          },
          onclose: () => stopTest()
        },
        config: {
          responseModalities: [Modality.AUDIO],
          outputAudioTranscription: {},
          inputAudioTranscription: {},
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: selectedVoice } }
          },
          systemInstruction: `You are a professional IELTS Examiner. Be brief. Minimize latency.
          Topics:
          Part 1: ${uniqueTopic.part1.join(', ')}
          Part 2: ${uniqueTopic.part2.prompt}
          Part 3: ${uniqueTopic.part3.join(', ')}
          Ask one question at a time. Do not repeat candidate answers.`
        }
      });
      
      sessionRef.current = await sessionPromise;
    } catch (err) {
      setError("Network error. Please refresh and try again.");
      setIsConnecting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <button onClick={onBack} className="flex items-center text-slate-600 hover:text-slate-900 font-bold text-sm bg-white px-4 py-2 rounded-xl border border-slate-200 shadow-sm transition-all hover:shadow-md">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" />
          </svg>
          EXIT TEST
        </button>
        <div className="text-right">
          <h3 className="text-xl font-black text-slate-900 tracking-tight uppercase">Speaking Module</h3>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Official IELTS Simulation</p>
        </div>
      </div>

      <div className="bg-white rounded-[2.5rem] shadow-2xl border border-slate-100 overflow-hidden min-h-[600px] flex flex-col">
        {isActiveState ? (
          <div className="flex-1 flex flex-col p-8 space-y-6">
            <div className="flex justify-between items-center pb-6 border-b border-slate-50">
              <div className="flex items-center space-x-3">
                <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse shadow-[0_0_10px_rgba(239,68,68,0.5)]"></div>
                <span className="text-xs font-black text-slate-700 uppercase tracking-wider">Live Examiner Session</span>
                <span className="text-[10px] bg-slate-900 text-white px-3 py-1 rounded-full font-bold uppercase">{selectedVoice} Voice</span>
              </div>
              <button 
                onClick={stopTest}
                className="text-xs bg-red-50 hover:bg-red-100 text-red-600 px-5 py-2 rounded-2xl font-black transition-all active:scale-95"
              >
                FINISH NOW
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto space-y-6 pr-4 custom-scrollbar max-h-[450px]">
              {transcriptions.map((t, i) => (
                <div key={i} className={`flex ${t.role === 'Examiner' ? 'justify-start' : 'justify-end'} animate-in slide-in-from-bottom-2`}>
                  <div className={`max-w-[85%] rounded-[1.5rem] p-5 shadow-sm ${
                    t.role === 'Examiner' 
                      ? 'bg-slate-50 text-slate-800 border border-slate-100' 
                      : 'bg-blue-600 text-white shadow-blue-200'
                  }`}>
                    <p className="text-[9px] font-black uppercase mb-1.5 opacity-60 tracking-widest">{t.role}</p>
                    <p className="text-sm leading-relaxed font-medium">{t.text}</p>
                  </div>
                </div>
              ))}
              
              {prepTime !== null && (
                <div className="bg-amber-50 border border-amber-100 p-8 rounded-[2rem] text-center space-y-4 animate-in zoom-in-95">
                  <p className="text-xs font-black text-amber-600 uppercase tracking-widest">Preparation Time Remaining</p>
                  <p className="text-6xl font-black text-amber-800">{prepTime}s</p>
                  <div className="max-w-sm mx-auto p-4 bg-white rounded-xl shadow-sm border border-amber-200">
                    <p className="text-xs font-bold text-slate-500 uppercase mb-1">Part 2 Cue Card</p>
                    <p className="text-sm font-black text-slate-900">{topic?.part2?.prompt}</p>
                  </div>
                </div>
              )}

              {transcriptions.length === 0 && !prepTime && (
                <div className="text-center py-24 text-slate-300">
                   <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4 border border-slate-100">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                      </svg>
                   </div>
                  <p className="text-sm font-bold uppercase tracking-widest">The examiner is waiting for you to speak...</p>
                </div>
              )}
            </div>

            <div className="pt-6 border-t border-slate-50 flex items-center justify-center h-20">
              <div className="flex items-center space-x-1.5 h-12">
                {[...Array(24)].map((_, i) => (
                  <div 
                    key={i} 
                    className="w-1.5 bg-blue-500/80 rounded-full transition-all animate-bounce"
                    style={{ 
                        height: `${Math.random() * 100}%`, 
                        animationDelay: `${i * 0.05}s`,
                        animationDuration: '0.6s'
                    }}
                  ></div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center p-12 text-center space-y-10">
            <div className="w-28 h-28 bg-blue-50 text-blue-600 rounded-[2rem] flex items-center justify-center shadow-[inset_0_2px_10px_rgba(0,0,0,0.05)] border border-blue-100">
               <svg xmlns="http://www.w3.org/2000/svg" className="h-14 w-14" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                </svg>
            </div>
            
            <div className="space-y-4 w-full max-w-sm">
              <h3 className="text-3xl font-black text-slate-900 tracking-tight">Speaking Mock Test</h3>
              <p className="text-slate-500 text-sm font-medium leading-relaxed">
                Choose a voice profile for your examiner. Ensure you're in a quiet room with your microphone ready.
              </p>
              
              <div className="grid grid-cols-1 gap-2.5 pt-4">
                {VOICES.map((v) => (
                   <button 
                     key={v.name}
                     onClick={() => setSelectedVoice(v.name)}
                     className={`flex items-center justify-between p-4 rounded-2xl border-2 transition-all ${selectedVoice === v.name ? 'border-blue-600 bg-blue-50/50 shadow-md' : 'border-slate-100 bg-white hover:border-slate-200'}`}
                   >
                     <div className="text-left">
                        <p className="font-black text-slate-900 text-sm tracking-tight">{v.name}</p>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{v.desc}</p>
                     </div>
                     {selectedVoice === v.name && (
                        <div className="w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center shadow-lg shadow-blue-600/30">
                           <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={4} d="M5 13l4 4L19 7" />
                           </svg>
                        </div>
                     )}
                   </button>
                ))}
              </div>
            </div>
            
            {error && (
                <div className="bg-red-50 text-red-700 p-5 rounded-2xl text-xs font-bold border-2 border-red-100 max-w-sm animate-in shake duration-500">
                    <div className="flex items-center space-x-2 mb-1">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span className="uppercase">Error</span>
                    </div>
                    {error}
                </div>
            )}

            <button
              onClick={startTest}
              disabled={isConnecting}
              className={`px-12 py-5 bg-[#003399] text-white rounded-[1.5rem] font-black text-xl shadow-2xl hover:bg-blue-800 transition-all transform hover:-translate-y-1 active:scale-95 flex items-center space-x-4 border-b-4 border-blue-900 ${isConnecting ? 'opacity-70 cursor-not-allowed' : ''}`}
            >
              {isConnecting ? (
                  <>
                    <div className="w-5 h-5 border-3 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span className="uppercase tracking-widest text-sm">Wait...</span>
                  </>
              ) : (
                  <>
                    <span>START EXAM</span>
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
                    </svg>
                  </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default SpeakingModule;
