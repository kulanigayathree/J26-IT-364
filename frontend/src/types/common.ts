export type Severity = 'low' | 'medium' | 'high';

/** Every /data response starts with these fields (see integration/api/app/schemas/__init__.py). */
export interface ModelMeta {
  model_name: string;
  model_version: string;
  /** ISO 8601 UTC */
  generated_at: string;
  /** true when the API is showing sample data because the real model output is missing */
  is_sample: boolean;
}
