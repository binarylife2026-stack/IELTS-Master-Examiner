
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
    if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
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
            setError("Connection error. Please try again.");
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
          systemInstruction: `You are a friendly English language companion. Practice casual conversation with the user.`
        }
      });
      
      sessionRef.current = await sessionPromise;
    } catch (err) {
      console.error(err);
      setError("Microphone access required.");
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
          <h3 className="text-xl font-bold">Casual Practice</h3>
          <p className="text-sm text-slate-500">Natural partner</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-lg border border-slate-200 overflow-hidden min-h-[500px] flex flex-col">
        {isActive ? (
          <div className="flex-1 flex flex-col p-6 space-y-4">
            <div className="flex justify-between items-center pb-4 border-b">
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-sky-500 rounded-full animate-pulse"></div>
                <span className="text-sm font-bold text-slate-700">PRACTICE LIVE (Partner: {selectedVoice})</span>
              </div>
              <button onClick={stopChat} className="text-xs bg-slate-100 hover:bg-slate-200 text-slate-600 px-4 py-1.5 rounded-full font-bold transition-colors">STOP</button>
            </div>
            <div className="flex-1 overflow-y-auto space-y-4 max-h-[400px]">
              {transcriptions.map((t, i) => (
                <div key={i} className={`flex ${t.role === 'Companion' ? 'justify-start' : 'justify-end'}`}>
                  <div className={`max-w-[80%] rounded-2xl p-4 ${t.role === 'Companion' ? 'bg-sky-50 text-slate-800' : 'bg-slate-900 text-white shadow-md'}`}>
                    <p className="text-[10px] font-bold mb-1 opacity-70 uppercase">{t.role}</p>
                    <p className="text-sm">{t.text}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center p-12 text-center space-y-8">
            <div className="space-y-4 w-full max-w-sm">
              <h3 className="text-2xl font-bold text-slate-900">Let's just talk!</h3>
              <p className="text-slate-600 text-sm">Choose your practice partner's voice:</p>
              <div className="grid grid-cols-1 gap-2">
                {VOICES.map((v) => (
                  <button key={v.name} onClick={() => setSelectedVoice(v.name)} className={`p-3 rounded-xl border text-sm transition-all ${selectedVoice === v.name ? 'border-sky-600 bg-sky-50 shadow-sm' : 'border-slate-200 bg-white hover:border-slate-300'}`}>
                    <p className="font-bold text-slate-900">{v.name}</p>
                    <p className="text-xs text-slate-500">{v.desc}</p>
                  </button>
                ))}
              </div>
            </div>
            <button onClick={startChat} className="px-10 py-5 bg-sky-600 text-white rounded-2xl font-bold text-lg shadow-xl hover:bg-sky-700 transition-all flex items-center space-x-3">
              <span>Start Talking</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default GeneralChatModule;
