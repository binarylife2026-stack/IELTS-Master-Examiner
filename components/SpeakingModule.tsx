
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
  const [isActive, setIsActive] = useState(false);
  const [transcriptions, setTranscriptions] = useState<{role: 'Examiner' | 'Candidate', text: string}[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [selectedVoice, setSelectedVoice] = useState<VoiceName>('Kore');
  const [topic, setTopic] = useState<any>(null);
  
  const audioContextRef = useRef<AudioContext | null>(null);
  const outputAudioContextRef = useRef<AudioContext | null>(null);
  const nextStartTimeRef = useRef(0);
  const sourcesRef = useRef(new Set<AudioBufferSourceNode>());
  const sessionRef = useRef<any>(null);
  const streamRef = useRef<MediaStream | null>(null);

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
    if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
    }
    setIsActive(false);
    setIsConnecting(false);
  }, []);

  const startTest = async () => {
    setIsConnecting(true);
    setError(null);
    setTranscriptions([]);

    try {
      // 1. Generate unique topic first
      const uniqueTopic = await generateSpeakingTopic();
      setTopic(uniqueTopic);

      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      
      const inputCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
      const outputCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      audioContextRef.current = inputCtx;
      outputAudioContextRef.current = outputCtx;

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const sessionPromise = ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-12-2025',
        callbacks: {
          onopen: () => {
            setIsConnecting(false);
            setIsActive(true);
            
            const source = inputCtx.createMediaStreamSource(stream);
            const scriptProcessor = inputCtx.createScriptProcessor(4096, 1, 1);
            
            scriptProcessor.onaudioprocess = (e) => {
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
              
              sessionPromise.then((session) => {
                session.sendRealtimeInput({ media: pcmBlob });
              });
            };
            
            source.connect(scriptProcessor);
            scriptProcessor.connect(inputCtx.destination);
          },
          onmessage: async (message: LiveServerMessage) => {
            if (message.serverContent?.outputTranscription) {
              const text = message.serverContent.outputTranscription.text;
              setTranscriptions(prev => {
                const last = prev[prev.length - 1];
                if (last && last.role === 'Examiner') {
                    const newText = last.text + text;
                    // Detect band score for history
                    if (newText.toLowerCase().includes('concludes the test')) {
                        const bandMatch = newText.match(/band\s+(\d(\.\d)?)/i);
                        if (bandMatch) {
                            saveResult({ module: 'speaking', score: parseFloat(bandMatch[1]) });
                        }
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
              const audioBuffer = await decodeAudioData(decode(base64Audio), ctx, 24000, 1);
              const source = ctx.createBufferSource();
              source.buffer = audioBuffer;
              source.connect(ctx.destination);
              source.addEventListener('ended', () => sourcesRef.current.delete(source));
              source.start(nextStartTimeRef.current);
              nextStartTimeRef.current += audioBuffer.duration;
              sourcesRef.current.add(source);
            }

            if (message.serverContent?.interrupted) {
              sourcesRef.current.forEach(s => s.stop());
              sourcesRef.current.clear();
              nextStartTimeRef.current = 0;
            }
          },
          onerror: (e) => {
            console.error(e);
            setError("Connection error. Please check your microphone and try again.");
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
          systemInstruction: `You are a British Council IELTS Examiner. 
          Conduct a full Speaking test using these UNIQUE topics:
          PART 1 QUESTIONS: ${uniqueTopic.part1.join(', ')}
          PART 2 CUE CARD: ${uniqueTopic.part2.prompt}. Bullet points: ${uniqueTopic.part2.bulletPoints.join(', ')}.
          PART 3 QUESTIONS: ${uniqueTopic.part3.join(', ')}

          Follow the standard structure:
          Part 1: Initial questions.
          Part 2: Give cue card. (User gets 1 min - you just prompt them to start).
          Part 3: Deeper discussion.

          Provide 'Instant Corrections' only for major grammatical errors.
          At the end, say 'This concludes the test' and provide a predicted Band Score clearly.`
        }
      });
      
      sessionRef.current = await sessionPromise;
    } catch (err) {
      console.error(err);
      setError("Failed to start session. " + (err instanceof Error ? err.message : ''));
      setIsConnecting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <button onClick={onBack} className="flex items-center text-slate-600 hover:text-slate-900 font-medium">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" />
          </svg>
          Back to Dashboard
        </button>
        <div className="text-right">
          <h3 className="text-xl font-bold">Speaking Module</h3>
          <p className="text-sm text-slate-500">Live Interview Simulation</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-lg border border-slate-200 overflow-hidden min-h-[500px] flex flex-col">
        {isActive ? (
          <div className="flex-1 flex flex-col p-6 space-y-4">
            <div className="flex justify-between items-center pb-4 border-b">
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
                <span className="text-sm font-bold text-slate-700">LIVE SESSION</span>
                <span className="text-xs bg-slate-100 px-2 py-0.5 rounded text-slate-500 font-medium">Examiner: {selectedVoice}</span>
              </div>
              <button 
                onClick={stopTest}
                className="text-xs bg-slate-100 hover:bg-red-50 text-red-600 px-3 py-1 rounded-full font-bold transition-colors"
              >
                END TEST
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto space-y-4 pr-2 custom-scrollbar max-h-[400px]">
              {transcriptions.map((t, i) => (
                <div key={i} className={`flex ${t.role === 'Examiner' ? 'justify-start' : 'justify-end'}`}>
                  <div className={`max-w-[80%] rounded-2xl p-4 ${
                    t.role === 'Examiner' 
                      ? 'bg-slate-100 text-slate-800' 
                      : 'bg-blue-600 text-white shadow-md'
                  }`}>
                    <p className="text-[10px] font-bold uppercase mb-1 opacity-70">{t.role}</p>
                    <p className="text-sm leading-relaxed">{t.text}</p>
                  </div>
                </div>
              ))}
              {transcriptions.length === 0 && (
                <div className="text-center py-20 text-slate-400">
                  <p>Speak now, the examiner is listening...</p>
                </div>
              )}
            </div>

            <div className="pt-4 border-t">
              <div className="flex items-center justify-center h-16 space-x-1">
                {[...Array(20)].map((_, i) => (
                  <div 
                    key={i} 
                    className="w-1 bg-blue-500 rounded-full animate-bounce"
                    style={{ 
                        height: `${Math.random() * 100}%`, 
                        animationDelay: `${i * 0.1}s`,
                        animationDuration: '1s'
                    }}
                  ></div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center p-12 text-center space-y-8">
            <div className="w-24 h-24 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center shadow-inner">
               <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                </svg>
            </div>
            
            <div className="space-y-4 w-full max-w-sm">
              <h3 className="text-2xl font-bold text-slate-900">Ready for your speaking test?</h3>
              <p className="text-slate-600 text-sm">Select your examiner's voice profile below:</p>
              
              <div className="grid grid-cols-1 gap-2">
                {VOICES.map((v) => (
                   <button 
                     key={v.name}
                     onClick={() => setSelectedVoice(v.name)}
                     className={`flex items-center justify-between p-3 rounded-xl border text-sm transition-all ${selectedVoice === v.name ? 'border-blue-600 bg-blue-50 shadow-sm' : 'border-slate-200 bg-white hover:border-slate-300'}`}
                   >
                     <div className="text-left">
                        <p className="font-bold text-slate-900">{v.name}</p>
                        <p className="text-xs text-slate-500">{v.desc}</p>
                     </div>
                     {selectedVoice === v.name && (
                        <div className="w-5 h-5 bg-blue-600 rounded-full flex items-center justify-center">
                           <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={4} d="M5 13l4 4L19 7" />
                           </svg>
                        </div>
                     )}
                   </button>
                ))}
              </div>
            </div>
            
            {error && (
                <div className="bg-red-50 text-red-600 p-4 rounded-xl text-sm border border-red-100 max-w-sm">
                    {error}
                </div>
            )}

            <button
              onClick={startTest}
              disabled={isConnecting}
              className={`px-8 py-4 bg-[#003399] text-white rounded-xl font-bold text-lg shadow-xl hover:shadow-2xl transition-all transform hover:-translate-y-1 active:scale-95 flex items-center space-x-3 ${isConnecting ? 'opacity-70 cursor-not-allowed' : ''}`}
            >
              {isConnecting ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <span>Generating Topics...</span>
                  </>
              ) : (
                  <>
                    <span>Begin Mock Test</span>
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
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
