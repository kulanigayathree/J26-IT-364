import type { AnalyseResult, AnalyseStatus, C1Data, C1Summary } from '../types/c1';
import { api } from './client';

export const getC1Summary = () => api<C1Summary>('/api/c1/summary');
export const getC1Data = () => api<C1Data>('/api/c1/data');

/** Is the trained C1 model installed? Includes example tracks. */
export const getC1AnalyseStatus = () => api<AnalyseStatus>('/api/c1/analyse/status');

/** Run the C1 model on an uploaded CSV or an example track, optionally injecting a test anomaly. */
export function analyseTrack(input: { file?: File; exampleId?: string; inject?: string }) {
  const form = new FormData();
  if (input.file) form.append('file', input.file);
  if (input.exampleId) form.append('example_id', input.exampleId);
  if (input.inject) form.append('inject', input.inject);
  return api<AnalyseResult>('/api/c1/analyse', { method: 'POST', body: form });
}
