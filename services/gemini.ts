
import { GoogleGenAI, Type } from "@google/genai";

const apiKey = process.env.API_KEY || '';
const ai = new GoogleGenAI({ apiKey });

export const getGeminiModel = (modelName = 'gemini-3-flash-preview') => {
  return ai.models.generateContent;
};

export const generateSpeakingTopic = async () => {
  const seed = Math.random().toString(36).substring(7);
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: `Generate a TOTALLY UNIQUE AND NEW IELTS Speaking Test Topic set. 
    Seed: ${seed}. Avoid overused topics like 'work' or 'studies'. 
    Provide Part 1 questions, a Part 2 Cue Card, and Part 3 discussion questions.`,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          part1: { type: Type.ARRAY, items: { type: Type.STRING } },
          part2: {
            type: Type.OBJECT,
            properties: {
              prompt: { type: Type.STRING },
              bulletPoints: { type: Type.ARRAY, items: { type: Type.STRING } }
            },
            required: ['prompt', 'bulletPoints']
          },
          part3: { type: Type.ARRAY, items: { type: Type.STRING } }
        },
        required: ['part1', 'part2', 'part3']
      }
    }
  });
  return JSON.parse(response.text);
};

export const gradeWriting = async (taskType: string, prompt: string, userText: string) => {
  const response = await ai.models.generateContent({
    model: 'gemini-3-pro-preview',
    contents: `You are a British Council IELTS Examiner. Grade the following ${taskType} response based on:
    1. Task Response
    2. Coherence and Cohesion
    3. Lexical Resource
    4. Grammatical Range and Accuracy
    
    Prompt: ${prompt}
    User Submission: ${userText}
    
    Return the result in JSON format with a band score (0.5 intervals). Highlight errors in bold.`,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          bandScore: { type: Type.NUMBER },
          taskResponse: { type: Type.STRING },
          coherenceCohesion: { type: Type.STRING },
          lexicalResource: { type: Type.STRING },
          grammaticalResource: { type: Type.STRING }, // Fixed typo in property name from previous turn if any
          lexicalResource_desc: { type: Type.STRING }, // Helper for schema consistency
          grammaticalRange: { type: Type.STRING },
          corrections: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                original: { type: Type.STRING },
                corrected: { type: Type.STRING },
                explanation: { type: Type.STRING },
              },
              required: ['original', 'corrected', 'explanation'],
            }
          }
        },
        required: ['bandScore', 'taskResponse', 'coherenceCohesion', 'lexicalResource', 'grammaticalRange', 'corrections'],
      }
    }
  });

  return JSON.parse(response.text);
};

export const generateReadingTest = async () => {
  const seed = Math.random().toString(36).substring(7);
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: `Generate a TOTALLY UNIQUE AND NEW realistic IELTS Academic Reading passage (about 800 words) with 10 questions. 
    Seed: ${seed}. Do not reuse common topics. Choose a niche scientific or cultural topic.
    Mix of Multiple Choice and True/False/Not Given. Include the correct answers and detailed explanations.`,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          title: { type: Type.STRING },
          passage: { type: Type.STRING },
          questions: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                id: { type: Type.INTEGER },
                text: { type: Type.STRING },
                options: { type: Type.ARRAY, items: { type: Type.STRING } },
                answer: { type: Type.STRING },
                explanation: { type: Type.STRING }
              },
              required: ['id', 'text', 'answer', 'explanation']
            }
          }
        },
        required: ['title', 'passage', 'questions']
      }
    }
  });
  return JSON.parse(response.text);
};

export const generateListeningTest = async () => {
    const seed = Math.random().toString(36).substring(7);
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Generate a TOTALLY UNIQUE AND NEW realistic IELTS Listening Section 3 (Academic Discussion) script and 10 questions.
      Seed: ${seed}. Topic: Ensure it is a fresh academic scenario.
      Mix of Completion and Multiple Choice. Include the correct answers and explanations.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            scenario: { type: Type.STRING },
            transcript: { type: Type.STRING },
            questions: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  id: { type: Type.INTEGER },
                  text: { type: Type.STRING },
                  options: { type: Type.ARRAY, items: { type: Type.STRING } },
                  answer: { type: Type.STRING },
                  explanation: { type: Type.STRING }
                }
              }
            }
          }
        }
      }
    });
    return JSON.parse(response.text);
};
