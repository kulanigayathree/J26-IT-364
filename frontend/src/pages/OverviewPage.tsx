import { ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { eezLegendItem, GeoJSONLayer, MapLegend, MapStatus, MapView } from '@/components/map';
import {
  AsyncView,
  Badge,
  ButtonLink,
  Card,
  DataSourceNote,
  Disclaimer,
  ErrorState,
  PageHeader,
  SeverityBadge,
  StatTile,
} from '@/components/ui';
import { mapStyles } from '@/design/mapStyles';
import { features } from '@/features/registry';
import type { DataSource } from '@/lib/apiClient';
import type { FeatureManifest, OverviewData } from '@/lib/feature';
import { formatDateTime, formatRelative } from '@/lib/format';
import { useAsync } from '@/lib/useAsync';

type Entry =
  | { manifest: FeatureManifest; ok: true; data: OverviewData; source: DataSource }
  | { manifest: FeatureManifest; ok: false; error: Error };

const ALERTS_PER_COMPONENT = 3;

async function loadAll(signal: AbortSignal) {
  // One failing component must not hide the others.
  const results = await Promise.allSettled(features.map((f) => f.loadOverview(signal)));
  const entries: Entry[] = results.map((result, i) => {
    const manifest = features[i]!.manifest;
    return result.status === 'fulfilled'
      ? { manifest, ok: true, data: result.value.data, source: result.value.source }
      : {
          manifest,
          ok: false,
          error: result.reason instanceof Error ? result.reason : new Error('Could not load.'),
        };
  });
  const sources = entries.flatMap((e) => (e.ok ? [e.source] : []));
  const source: DataSource = sources.includes('mock')
    ? 'mock'
    : sources.includes('cache')
      ? 'cache'
      : 'api';
  return { data: entries, source, fetchedAt: new Date().toISOString() };
}

export function OverviewPage() {
  const overview = useAsync((signal) => loadAll(signal), []);
  const entries = overview.status === 'success' ? overview.data : [];

  return (
    <>
      <PageHeader
        title="Overview"
        subtitle="Latest outputs of all four components on one map of Sri Lankan waters, with the newest alerts from each."
        actions={<DataSourceNote state={overview} />}
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="flex flex-col gap-4 lg:col-span-2">
          <MapView
            label="Overview map with all component layers"
            height="lg"
            bleed
            overlay={
              <>
                <MapStatus states={[overview]} />
                <MapLegend
                  title="Layers"
                  items={[
                    ...features.map(({ manifest }) => ({
                      label: `${manifest.id.toUpperCase()} ${manifest.shortTitle}`,
                      color: manifest.mapLayerColor,
                      fillStep: 55 as const,
                    })),
                    eezLegendItem,
                  ]}
                />
              </>
            }
          >
            {entries.map((entry) =>
              entry.ok ? (
                <GeoJSONLayer
                  key={entry.manifest.id}
                  data={entry.data.layer}
                  layerStyle={mapStyles.component(entry.manifest.id, { weight: 'thin', radius: 5 })}
                  tooltip={() => entry.manifest.title}
                />
              ) : null,
            )}
          </MapView>

          <AsyncView state={overview} compact loadingLabel="Counting alerts…">
            {(data) => (
              <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                {data.map((entry) => (
                  <StatTile
                    key={entry.manifest.id}
                    label={`${entry.manifest.id.toUpperCase()} ${entry.manifest.shortTitle}`}
                    value={entry.ok ? entry.data.alerts.length : '—'}
                    note={
                      <Link to={entry.manifest.route} className="text-sm font-bold">
                        Open
                      </Link>
                    }
                  />
                ))}
              </div>
            )}
          </AsyncView>
        </div>

        <div className="flex flex-col gap-4">
          <h2 className="text-xl font-bold">Latest alerts</h2>
          <AsyncView state={overview} loadingLabel="Loading latest alerts…">
            {(data) => (
              <>
                {data.map((entry) => {
                  const Icon = entry.manifest.icon;
                  return (
                    <Card
                      key={entry.manifest.id}
                      headingLevel={3}
                      title={
                        <span className="flex items-center gap-2">
                          <Icon aria-hidden className="h-4 w-4 shrink-0 text-navy" />
                          {entry.manifest.title}
                        </span>
                      }
                      actions={
                        <ButtonLink
                          to={entry.manifest.route}
                          variant="ghost"
                          size="sm"
                          icon={ArrowRight}
                        >
                          Open
                        </ButtonLink>
                      }
                    >
                      {!entry.ok ? (
                        <ErrorState compact error={entry.error} onRetry={overview.reload} />
                      ) : entry.data.alerts.length === 0 ? (
                        <p className="text-sm text-muted">No current alerts.</p>
                      ) : (
                        <ul className="flex flex-col divide-y divide-line">
                          {entry.data.alerts.slice(0, ALERTS_PER_COMPONENT).map((alert) => (
                            <li key={alert.id} className="py-2 first:pt-0 last:pb-0">
                              <div className="flex flex-wrap items-center gap-2">
                                {alert.severity ? (
                                  <SeverityBadge level={alert.severity} />
                                ) : (
                                  alert.tag && <Badge tone="info">{alert.tag}</Badge>
                                )}
                                <time
                                  dateTime={alert.time}
                                  title={formatDateTime(alert.time)}
                                  className="text-xs text-muted"
                                >
                                  {formatRelative(alert.time)}
                                </time>
                              </div>
                              <Link
                                to={alert.href}
                                className="mt-1 block text-sm font-bold hover:underline"
                              >
                                {alert.title}
                              </Link>
                              <p className="text-sm text-muted">{alert.detail}</p>
                            </li>
                          ))}
                        </ul>
                      )}
                    </Card>
                  );
                })}
              </>
            )}
          </AsyncView>
        </div>
      </div>

      <Disclaimer className="mt-6" title="Decision support, not decisions.">
        Every layer is a model output from satellite, AIS or ocean data. Open a component for its
        uncertainty and limits before acting on it.
      </Disclaimer>
    </>
  );
}
