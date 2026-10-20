import type { C1Data, C1Summary } from '../types/c1';
import { api } from './client';

export const getC1Summary = () => api<C1Summary>('/api/c1/summary');
export const getC1Data = () => api<C1Data>('/api/c1/data');
