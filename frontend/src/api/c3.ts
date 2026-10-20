import type { C3Data, C3Summary } from '../types/c3';
import { api } from './client';

export const getC3Summary = () => api<C3Summary>('/api/c3/summary');
export const getC3Data = () => api<C3Data>('/api/c3/data');
