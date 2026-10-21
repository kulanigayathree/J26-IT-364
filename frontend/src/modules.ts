import { Droplets, Fish, Shell, Ship, type LucideIcon } from 'lucide-react';

export type ModelId = 'c1' | 'c2' | 'c3' | 'c4';

/** The four research components. Used by the homepage cards and the model-page tabs. */
export interface ModuleInfo {
  id: ModelId;
  code: string;
  /** tab label */
  short: string;
  /** model page title */
  title: string;
  subtitle: string;
  /** homepage card */
  cardTitle: string;
  body: string;
  icon: LucideIcon;
  /** card image in /public/images, or null for the drawn fishing preview */
  img: string | null;
  path: string;
  owner: string;
  /** footnote shown under the model page */
  caveat: string;
}

export const MODULES: ModuleInfo[] = [
  {
    id: 'c1',
    code: 'C1',
    short: 'Vessel behaviour',
    title: 'Vessel Behaviour Anomaly Detection',
    subtitle: 'Vessel positions from AIS and anomalies found by the C1 model, including radar (SAR) detections with no AIS signal.',
    cardTitle: 'Vessel Behaviour Monitoring',
    body: 'Identify unusual vessel movements and potentially suspicious activities.',
    icon: Ship,
    img: '/images/vessel.jpg',
    path: '/c1',
    owner: 'Pathirana K.G.T.K.S',
    caveat: 'Model output — not field-confirmed. An anomaly is a reason to look closer, not evidence of illegal activity.',
  },
  {
    id: 'c2',
    code: 'C2',
    short: 'Fishing zones',
    title: 'Fishing-Zone Prediction',
    subtitle: 'Chance of a good catch for the next 3 days, with uncertainty. Pick your port and boat to see the best zones, distance and fuel.',
    cardTitle: 'Fishing Zone Prediction',
    body: 'Estimate suitable fishing areas using oceanographic conditions.',
    icon: Fish,
    img: null,
    path: '/c2',
    owner: 'Gayathree M.G.K',
    caveat: 'Model output — not field-confirmed. Check the weather and official advisories before going to sea.',
  },
  {
    id: 'c3',
    code: 'C3',
    short: 'Reef health',
    title: 'Reef Health Monitoring',
    subtitle: 'Benthic cover per reef, estimated from Sentinel-2 satellite images. Select a reef to see its health and monthly chart.',
    cardTitle: 'Coral Reef Health',
    body: 'Monitor reef conditions using satellite imagery.',
    icon: Shell,
    img: '/images/reef.jpg',
    path: '/c3',
    owner: 'Adikaram W.M.T.P',
    caveat: 'Model output — not field-confirmed. Satellite estimates need confirming by a dive survey.',
  },
  {
    id: 'c4',
    code: 'C4',
    short: 'Oil spills',
    title: 'Oil-Spill Detection and Vessel Attribution',
    subtitle: 'Possible oil slicks found in Sentinel-1 radar images, with vessels that may be the source ranked by AIS evidence.',
    cardTitle: 'Oil Spill Detection',
    body: 'Detect potential spills in radar imagery, distinguish them from look-alikes, estimate drift, and rank candidate vessels for further investigation.',
    icon: Droplets,
    img: '/images/sar.jpg',
    path: '/c4',
    owner: 'Jayasundara K.H.W.M.G.M',
    caveat: 'Model output — not field-confirmed. Candidate vessels are candidates, not proof; attribution must be verified by the authorities.',
  },
];
