import type { C3Data, C3Summary, SiteHealth, SitesStatus } from '../types/c3';
import { api } from './client';

export const getC3Summary = () => api<C3Summary>('/api/c3/summary');
export const getC3Data = () => api<C3Data>('/api/c3/data');

/** Reef sites with C3 results (saved or live) and heat-stress data. */
export const getC3Sites = () => api<SitesStatus>('/api/c3/sites');

/** Health of one reef: habitat map, benthic cover, agreement with ACA, heat stress. */
export const getC3SiteHealth = (code: string) => api<SiteHealth>(`/api/c3/sites/${encodeURIComponent(code)}`);
