import { Droplets, Fish, Shell, Ship, type LucideIcon } from 'lucide-react';

/** The four components. Used by the landing page and dashboard. */
export interface ModuleInfo {
  id: 'c1' | 'c2' | 'c3' | 'c4';
  name: string;
  short: string;
  description: string;
  icon: LucideIcon;
  owner: string;
  path: string;
}

export const MODULES: ModuleInfo[] = [
  {
    id: 'c1',
    name: 'Vessel Behaviour Anomaly Detection',
    short: 'Vessel anomalies',
    description: 'Flags unusual vessel behaviour from AIS tracks and satellite radar, such as AIS gaps and loitering.',
    icon: Ship,
    owner: 'Pathirana K.G.T.K.S',
    path: '/c1',
  },
  {
    id: 'c2',
    name: 'Fishing-Zone Prediction',
    short: 'Fishing zones',
    description: 'Forecasts good fishing zones for the next 3 days, with uncertainty, distance and fuel from each port.',
    icon: Fish,
    owner: 'Gayathree M.G.K',
    path: '/c2',
  },
  {
    id: 'c3',
    name: 'Reef Health Monitoring',
    short: 'Reef health',
    description: 'Estimates monthly coral and algae cover on each reef from Sentinel-2 satellite images.',
    icon: Shell,
    owner: 'Adikaram W.M.T.P',
    path: '/c3',
  },
  {
    id: 'c4',
    name: 'Oil-Spill Detection and Vessel Attribution',
    short: 'Oil spills',
    description: 'Detects oil slicks in Sentinel-1 radar images and ranks candidate vessels that may be the source.',
    icon: Droplets,
    owner: 'Jayasundara K.H.W.M.G.M',
    path: '/c4',
  },
];
