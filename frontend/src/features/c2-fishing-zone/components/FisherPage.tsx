import { useState } from 'react';
import { Fuel, MapPinned, Navigation, RefreshCw } from 'lucide-react';
import {
  AsyncView,
  Badge,
  Button,
  ButtonLink,
  Card,
  DataSourceNote,
  Disclaimer,
  PageHeader,
  Select,
} from '@/components/ui';
import { formatDate, formatDateTime, formatLatLon } from '@/lib/format';
import { recall, remember } from '@/lib/offlineCache';
import { useAsync } from '@/lib/useAsync';
import { DEFAULT_PORT, fetchBestZone, fetchPorts } from '../api';
import { confidenceWords, directionWords } from './plainWords';

const PORT_KEY = 'c2:fisher-port';

/** Simple, mobile-first view for fishers: one harbour, one answer, big touch targets. */
export function FisherPage() {
  const [portId, setPortId] = useState(() => recall<string>(PORT_KEY)?.data ?? DEFAULT_PORT);
  const ports = useAsync((signal) => fetchPorts(signal), []);
  const zone = useAsync((signal) => fetchBestZone(portId, 24, signal), [portId]);

  const choosePort = (id: string) => {
    setPortId(id);
    remember(PORT_KEY, id);
  };

  return (
    <div className="mx-auto max-w-narrow">
      <PageHeader
        eyebrow="C2 · Fisher view"
        title="Today’s best fishing zone"
        subtitle="Choose your harbour to see where to go today and how much fuel to take."
        actions={<DataSourceNote state={zone} />}
      />

      <Select
        label="Your harbour"
        size="lg"
        value={portId}
        onChange={choosePort}
        disabled={ports.status !== 'success'}
        options={
          ports.status === 'success'
            ? ports.data.map((p) => ({ value: p.id, label: p.name }))
            : [{ value: portId, label: 'Loading harbours…' }]
        }
      />

      <div className="mt-6">
        <AsyncView
          state={zone}
          loadingLabel="Finding today’s best zone…"
          errorTitle="No forecast available"
        >
          {(z) => {
            const confidence = confidenceWords[z.confidence];
            return (
              <div className="flex flex-col gap-4">
                <Card>
                  <p className="text-sm font-bold uppercase tracking-wide text-muted">Go about</p>
                  <p className="mt-1 text-2xl font-bold text-navy">
                    {z.distance_km.toFixed(0)} km {directionWords(z.direction)}
                  </p>
                  <p className="text-base text-muted">from {z.port_name}</p>

                  <dl className="mt-4 flex flex-col gap-4 border-t border-line pt-4 text-lg">
                    <div className="flex items-start gap-3">
                      <Navigation aria-hidden className="mt-1 h-5 w-5 shrink-0 text-navy" />
                      <div>
                        <dt className="text-sm text-muted">Position (GPS)</dt>
                        <dd className="font-bold">{formatLatLon(z.lat, z.lon, 3)}</dd>
                        <dd className="text-sm text-muted">
                          Heading {z.bearing_deg}° from the harbour
                        </dd>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <Fuel aria-hidden className="mt-1 h-5 w-5 shrink-0 text-navy" />
                      <div>
                        <dt className="text-sm text-muted">Fuel needed</dt>
                        <dd className="font-bold">About {z.fuel_litres} litres</dd>
                        <dd className="text-sm text-muted">there and back</dd>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <MapPinned aria-hidden className="mt-1 h-5 w-5 shrink-0 text-navy" />
                      <div>
                        <dt className="text-sm text-muted">How sure is this?</dt>
                        <dd className="mt-1">
                          <Badge tone={confidence.tone}>{confidence.short}</Badge>
                        </dd>
                        <dd className="mt-1 font-serif text-base">{confidence.sentence}</dd>
                      </div>
                    </div>
                  </dl>
                </Card>

                <ButtonLink to={`/c2?port=${z.port_id}`} size="lg" fullWidth icon={MapPinned}>
                  See it on the map
                </ButtonLink>
                <Button
                  variant="secondary"
                  size="lg"
                  fullWidth
                  icon={RefreshCw}
                  onClick={zone.reload}
                >
                  Check again
                </Button>

                <p className="text-sm text-muted">
                  Forecast for {formatDate(z.valid_from)}, valid until {formatDateTime(z.valid_to)}.
                  The last forecast is saved on this phone so you can see it without signal.
                </p>
              </div>
            );
          }}
        </AsyncView>
      </div>

      <Disclaimer kind="forecast" className="mt-6" />
    </div>
  );
}
