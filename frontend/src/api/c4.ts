import type { C4Data, C4Summary, ClassifierStatus, DetectResult } from '../types/c4';
import { api } from './client';

export const getC4Summary = () => api<C4Summary>('/api/c4/summary');
export const getC4Data = () => api<C4Data>('/api/c4/data');

/** Is the trained C4 classifier installed on the server? */
export const getC4DetectStatus = () => api<ClassifierStatus>('/api/c4/detect/status');

/** Run the C4 model on an uploaded SAR image. */
export function detectSpill(file: File, isCoast: boolean) {
  const form = new FormData();
  form.append('image', file);
  form.append('is_coast', String(isCoast));
  return api<DetectResult>('/api/c4/detect', { method: 'POST', body: form });
}
