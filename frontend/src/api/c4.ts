import type { C4Data, C4Summary } from '../types/c4';
import { api } from './client';

export const getC4Summary = () => api<C4Summary>('/api/c4/summary');
export const getC4Data = () => api<C4Data>('/api/c4/data');
