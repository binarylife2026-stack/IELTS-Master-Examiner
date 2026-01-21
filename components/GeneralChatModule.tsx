
import React, { useState, useRef, useCallback } from 'react';
import { GoogleGenAI, Modality, LiveServerMessage } from '@google/genai';
import { VoiceName } from '../types';

interface GeneralChatModuleProps {
  onBack: () => void;
}

const VOICES: { name: VoiceName, desc: string }[] = [
  { name: 'Charon', desc: 'Warm & Friendly' },
  { name: 'Puck', desc: 'Gentle & Soft' },
  { name: 'Kore', desc: 'Professional' },
  { name: 'Zephyr', desc: 'Brisk & Clear' },
  { name: 'Fenrir', desc: 'Steady & Deep' },
];

const GeneralChatModule: React.FC<GeneralChatModuleProps> = ({ onBack }) => {
  const [isConnecting, setIsConnecting] = useState(false);
  const [isActive, setIsActive] = useState(false);
  const [transcriptions, setTranscriptions] = useState<{role: 'Companion' | 'You', text: string}[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [selectedVoice, setSelectedVoice] = useState<VoiceName>('Charon');
  
  const audioContextRef = useRef<AudioContext | null>(null);
  const outputAudioContextRef = useRef<AudioContext | null>(null);
  const nextStartTimeRef = useRef(0);
  const sourcesRef = useRef(new Set<AudioBufferSourceNode>());
  const sessionRef = useRef<any>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const scriptProcessorRef = useRef<ScriptProcessorNode | null>(null);
  const sourceNodeRef = useRef<MediaStreamAudioSourceNode | null>(null);

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

  const stopChat = useCallback(() => {
    if (sessionRef.current) {
        try { sessionRef.current.close(); } catch(e) {}
        sessionRef.current = null;
    }
    if (sourceNodeRef.current) {
      sourceNodeRef.current.disconnect();
      sourceNodeRef.current = null;
    }
    if (scriptProcessorRef.current) {
      scriptProcessorRef.current.disconnect();
      scriptProcessorRef.current = null;
    }
    if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
    }
    setIsActive(false);
    setIsConnecting(false);
  }, []);

  const startChat = async () => {
    setIsConnecting(true);
    setError(null);
    setTranscriptions([]);

    try {
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
            sourceNodeRef.current = source;
            const scriptProcessor = inputCtx.createScriptProcessor(4096, 1, 1);
            scriptProcessorRef.current = scriptProcessor;
            
            scriptProcessor.onaudioprocess = (e) => {
              if (!sessionRef.current) return;
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
                if (session && sessionRef.current) {
                  try {
                    session.sendRealtimeInput({ media: pcmBlob });
                  } catch (err) {
                    console.warn("Input stream failed:", err);
                  }
                }
              }).catch(() => {});
            };
            
            source.connect(scriptProcessor);
            scriptProcessor.connect(inputCtx.destination);
          },
          onmessage: async (message: LiveServerMessage) => {
            if (message.serverContent?.outputTranscription) {
              const text = message.serverContent.outputTranscription.text;
              setTranscriptions(prev => {
                const last = prev[prev.length - 1];
                if (last && last.role === 'Companion') {
                    return [...prev.slice(0, -1), { ...last, text: last.text + text }];
                }
                return [...prev, { role: 'Companion', text }];
              });
            } else if (message.serverContent?.inputTranscription) {
              const text = message.serverContent.inputTranscription.text;
              setTranscriptions(prev => {
                const last = prev[prev.length - 1];
                if (last && last.role === 'You') {
                    return [...prev.slice(0, -1), { ...last, text: last.text + text }];
                }
                return [...prev, { role: 'You', text }];
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
                console.warn("Audio error:", e);
              }
            }

            if (message.serverContent?.interrupted) {
              sourcesRef.current.forEach(s => { try { s.stop(); } catch(e){} });
              sourcesRef.current.clear();
              nextStartTimeRef.current = 0;
            }
          },
          onerror: (e) => {
            console.error("WebSocket Error:", e);
            setError("Connection lost. Tap 'Start Talking' to reconnect.");
            stopChat();
          },
          onclose: () => stopChat()
        },
        config: {
          responseModalities: [Modality.AUDIO],
          outputAudioTranscription: {},
          inputAudioTranscription: {},
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: selectedVoice } }
          },
          systemInstruction: `You are a warm English companion. Be very concise and quick to reply. 
          Use simple language. Short responses only. 
          Do not repeat the user's input. Act as a real conversational partner.`
        }
      });
      
      sessionRef.current = await sessionPromise;
    } catch (err) {
      console.error("Init Error:", err);
      setError("Please check microphone permissions and internet.");
      setIsConnecting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <button onClick={onBack} className="flex items-center text-slate-600 hover:text-slate-900 font-bold text-sm bg-white px-4 py-2 rounded-xl border border-slate-200 shadow-sm">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" />
          </svg>
          BACK
        </button>
        <div className="text-right">
          <h3 className="text-xl font-black text-slate-900 tracking-tight uppercase">Casual Practice</h3>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Natural Partner</p>
        </div>
      </div>

      <div className="bg-white rounded-[2rem] shadow-xl border border-slate-100 overflow-hidden min-h-[550px] flex flex-col">
        {isActive ? (
          <div className="flex-1 flex flex-col p-8 space-y-6">
            <div className="flex justify-between items-center pb-6 border-b border-slate-50">
              <div className="flex items-center space-x-3">
                <div className="w-3 h-3 bg-sky-500 rounded-full animate-pulse shadow-[0_0_10px_rgba(14,165,233,0.5)]"></div>
                <span className="text-xs font-black text-slate-700 uppercase tracking-wider">CHATTING WITH {selectedVoice}</span>
              </div>
              <button onClick={stopChat} className="text-xs bg-slate-100 hover:bg-slate-200 text-slate-600 px-6 py-2 rounded-2xl font-black transition-all">LEAVE CHAT</button>
            </div>
            <div className="flex-1 overflow-y-auto space-y-6 max-h-[400px] pr-4 custom-scrollbar">
              {transcriptions.map((t, i) => (
                <div key={i} className={`flex ${t.role === 'Companion' ? 'justify-start' : 'justify-end'} animate-in fade-in slide-in-from-bottom-2`}>
                  <div className={`max-w-[80%] rounded-2xl p-5 ${t.role === 'Companion' ? 'bg-sky-50 text-slate-800 border border-sky-100' : 'bg-slate-900 text-white shadow-lg'}`}>
                    <p className="text-[9px] font-black mb-1.5 opacity-60 uppercase tracking-widest">{t.role}</p>
                    <p className="text-sm leading-relaxed">{t.text}</p>
                  </div>
                </div>
              ))}
              {transcriptions.length === 0 && (
                <div className="text-center py-20 text-slate-300">
                  <p className="text-sm font-bold uppercase tracking-widest">Start speaking to your partner...</p>
                </div>
              )}
            </div>
            <div className="flex items-center justify-center space-x-1 h-12">
               {[...Array(12)].map((_, i) => (
                 <div 
                   key={i} 
                   className="w-1.5 bg-sky-400 rounded-full animate-bounce"
                   style={{ height: `${20 + Math.random() * 80}%`, animationDelay: `${i * 0.1}s` }}
                 ></div>
               ))}
            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center p-12 text-center space-y-12">
            <div className="w-24 h-24 bg-sky-50 text-sky-600 rounded-[2rem] flex items-center justify-center shadow-inner border border-sky-100">
               <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
            </div>
            <div className="space-y-4 w-full max-w-sm">
              <h3 className="text-3xl font-black text-slate-900 tracking-tight uppercase">Casual Conversation</h3>
              <p className="text-slate-500 text-sm font-medium leading-relaxed">Choose a friendly partner to practice your English fluency without any exam pressure.</p>
              <div className="grid grid-cols-1 gap-2.5 pt-4">
                {VOICES.map((v) => (
                  <button key={v.name} onClick={() => setSelectedVoice(v.name)} className={`p-4 rounded-2xl border-2 transition-all ${selectedVoice === v.name ? 'border-sky-600 bg-sky-50 shadow-md' : 'border-slate-100 bg-white hover:border-slate-200'}`}>
                    <p className="font-black text-slate-900 text-sm tracking-tight">{v.name}</p>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{v.desc}</p>
                  </button>
                ))}
              </div>
            </div>
            
            {error && (
                <div className="bg-red-50 text-red-600 p-4 rounded-2xl text-xs font-bold border border-red-100 animate-in shake">
                  {error}
                </div>
            )}

            <button onClick={startChat} disabled={isConnecting} className="px-12 py-5 bg-sky-600 text-white rounded-[1.5rem] font-black text-xl shadow-2xl hover:bg-sky-700 transition-all flex items-center space-x-4 active:scale-95 disabled:opacity-50">
              {isConnecting ? <span>CONNECTING...</span> : <span>START TALKING</span>}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default GeneralChatModule;
