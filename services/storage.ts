
import { ExamResult } from '../types';

const STORAGE_KEY = 'ielts_master_results';

export const saveResult = (result: Omit<ExamResult, 'id' | 'date'>) => {
  const results = getResults();
  const newResult: ExamResult = {
    ...result,
    id: Math.random().toString(36).substr(2, 9),
    date: new Date().toISOString(),
  };
  localStorage.setItem(STORAGE_KEY, JSON.stringify([newResult, ...results]));
  return newResult;
};

export const getResults = (): ExamResult[] => {
  const data = localStorage.getItem(STORAGE_KEY);
  if (!data) return [];
  try {
    return JSON.parse(data);
  } catch (e) {
    return [];
  }
};

export const clearResults = () => {
  localStorage.removeItem(STORAGE_KEY);
};
