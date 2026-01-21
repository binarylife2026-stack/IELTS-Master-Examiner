
export type Module = 'speaking' | 'writing' | 'reading' | 'listening' | 'dashboard' | 'general-chat';

export type VoiceName = 'Puck' | 'Charon' | 'Kore' | 'Fenrir' | 'Zephyr';

export interface ExamResult {
  id: string;
  date: string;
  module: Module;
  score: number;
  details?: string;
}

export interface Feedback {
  bandScore: number;
  taskResponse: string;
  coherenceCohesion: string;
  lexicalResource: string;
  grammaticalRange: string;
  corrections: Array<{
    original: string;
    corrected: string;
    explanation: string;
  }>;
}

export interface Question {
  id: number;
  text: string;
  options?: string[];
  answer: string;
  explanation: string;
}

export interface ExamSession {
  module: Module;
  startTime: number;
  status: 'idle' | 'in-progress' | 'completed';
}

export interface SpeakingTopic {
  part1: string[];
  part2: {
    prompt: string;
    bulletPoints: string[];
  };
  part3: string[];
}
