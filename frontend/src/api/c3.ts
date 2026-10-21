import type { C3Data, C3Summary, ClassifyResult, ClassifyStatus } from '../types/c3';
import { api } from './client';

export const getC3Summary = () => api<C3Summary>('/api/c3/summary');
export const getC3Data = () => api<C3Data>('/api/c3/data');

/** C3 model info and the Sentinel-2 composites available on the server. */
export const getC3ClassifyStatus = () => api<ClassifyStatus>('/api/c3/classify/status');

/** Run the C3 benthic classifier on an uploaded GeoTIFF or an example composite. */
export function classifyReef(input: { file?: File; exampleId?: string; useMask: boolean; smooth: boolean }) {
  const form = new FormData();
  if (input.file) form.append('file', input.file);
  if (input.exampleId) form.append('example_id', input.exampleId);
  form.append('use_mask', String(input.useMask));
  form.append('smooth', String(input.smooth));
  return api<ClassifyResult>('/api/c3/classify', { method: 'POST', body: form });
}
