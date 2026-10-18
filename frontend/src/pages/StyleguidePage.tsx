import { useState } from 'react';
import type { FeatureCollection, Point } from 'geojson';
import { Download, Plus, RefreshCw } from 'lucide-react';
import { eezLegendItem, GeoJSONLayer, MapLegend, MapView } from '@/components/map';
import {
  Badge,
  Button,
  Card,
  DataTable,
  DatePicker,
  Disclaimer,
  EmptyState,
  ErrorState,
  Legend,
  LoadingState,
  PageHeader,
  Section,
  SegmentedControl,
  Select,
  SeverityBadge,
  StatTile,
  Tabs,
  Toggle,
  type BadgeTone,
} from '@/components/ui';
import { bgClass, textClass } from '@/design/classes';
import { AA_TEXT, contrastRatio } from '@/design/contrast';
import { mapStyles } from '@/design/mapStyles';
import {
  colors,
  componentColors,
  fontSize,
  textPairs,
  type ColorToken,
  type ComponentId,
} from '@/design/tokens';
import { cn } from '@/lib/cn';

const typeClass: Record<string, string> = {
  xs: 'text-xs',
  sm: 'text-sm',
  base: 'text-base',
  lg: 'text-lg',
  xl: 'text-xl',
  '2xl': 'text-2xl',
};

const sampleRows = [
  { id: 'a', name: 'Bar Reef', score: 0.82, region: 'Puttalam' },
  { id: 'b', name: 'Hikkaduwa', score: 0.41, region: 'Galle' },
  { id: 'c', name: 'Pigeon Island', score: 0.67, region: 'Trincomalee' },
];

const samplePoints: FeatureCollection<Point, { id: ComponentId }> = {
  type: 'FeatureCollection',
  features: (['c1', 'c2', 'c3', 'c4'] as const).map((id, i) => ({
    type: 'Feature',
    id,
    geometry: { type: 'Point', coordinates: [79.4 + i * 0.8, 6.0 + (i % 2) * 2.2] },
    properties: { id },
  })),
};

function Swatch({ token }: { token: ColorToken }) {
  return (
    <div className="min-w-0 rounded border border-line bg-paper">
      <div className={cn('h-12 rounded border-b border-line', bgClass[token])} />
      <div className="p-2 text-xs">
        <p className="font-bold text-navy">{token}</p>
        <p className="text-muted">{colors[token]}</p>
      </div>
    </div>
  );
}

export function StyleguidePage() {
  const [tab, setTab] = useState<'one' | 'two'>('one');
  const [lead, setLead] = useState<24 | 48 | 72>(24);
  const [toggle, setToggle] = useState(true);
  const [select, setSelect] = useState('negombo');
  const [date, setDate] = useState('2026-10-18');

  return (
    <>
      <PageHeader
        eyebrow="For developers"
        title="Styleguide"
        subtitle="Every shared component with its variants. Build pages only from these. Need something new? Open an issue for components/ui instead of making a private copy."
        actions={
          <>
            <Button variant="secondary" icon={RefreshCw}>
              Secondary
            </Button>
            <Button icon={Plus}>Primary action</Button>
          </>
        }
      />

      <Section title="Colours" description="src/design/tokens.ts. No other colours are allowed.">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6">
          {(Object.keys(colors) as ColorToken[]).map((token) => (
            <Swatch key={token} token={token} />
          ))}
        </div>
        <p className="mt-4 text-sm font-bold text-ink">Component layer colours</p>
        <div className="mt-2">
          <Legend
            direction="row"
            items={(Object.keys(componentColors) as ComponentId[]).map((id) => ({
              label: `${id.toUpperCase()} → ${componentColors[id]}`,
              color: componentColors[id],
            }))}
          />
        </div>
      </Section>

      <Section
        title="Text contrast"
        description={`Every text/background pair used by the kit. Minimum ${AA_TEXT}:1 (WCAG AA).`}
      >
        <DataTable
          caption="Contrast of text colour pairs"
          rows={textPairs.map((p) => ({
            ...p,
            ratio: contrastRatio(colors[p.text], colors[p.background]),
          }))}
          getRowId={(p) => `${p.text}-${p.background}`}
          columns={[
            {
              key: 'sample',
              header: 'Sample',
              cell: (p) => (
                <span
                  className={cn(
                    'inline-block rounded px-2 py-1 font-bold',
                    bgClass[p.background],
                    textClass[p.text],
                  )}
                >
                  Aa Sample
                </span>
              ),
            },
            {
              key: 'pair',
              header: 'Text on background',
              cell: (p) => `${p.text} on ${p.background}`,
            },
            { key: 'use', header: 'Used for', cell: (p) => p.use },
            {
              key: 'ratio',
              header: 'Ratio',
              align: 'right',
              cell: (p) => `${p.ratio.toFixed(2)}:1`,
              sortValue: (p) => p.ratio,
            },
            {
              key: 'result',
              header: 'AA',
              cell: (p) =>
                p.ratio >= AA_TEXT ? (
                  <Badge tone="positive">Pass</Badge>
                ) : (
                  <Badge tone="accent">Fail</Badge>
                ),
            },
          ]}
        />
      </Section>

      <Section
        title="Typography"
        description="Carlito for headings and UI, Caladea for long text. Only these six sizes."
      >
        <div className="flex flex-col gap-2 rounded border border-line bg-paper p-4">
          {Object.keys(fontSize).map((size) => (
            <p key={size} className={cn(typeClass[size], 'text-navy')}>
              <span className="inline-block w-12 text-xs text-muted">{size}</span> Ocean AI – Marine
              Monitoring
            </p>
          ))}
          <p className="mt-2 max-w-prose font-serif text-base">
            Caladea body text: monthly benthic cover is estimated from cloud-free Sentinel-2
            composites and should be read together with the heat-stress record.
          </p>
        </div>
      </Section>

      <Section title="Buttons">
        <div className="flex flex-wrap items-center gap-3">
          <Button>Primary</Button>
          <Button variant="secondary">Secondary</Button>
          <Button variant="ghost">Ghost</Button>
          <Button icon={Download}>With icon</Button>
          <Button size="sm">Small</Button>
          <Button disabled>Disabled</Button>
        </div>
        <div className="mt-3 max-w-narrow">
          <Button size="lg" fullWidth>
            Large touch target (fisher view)
          </Button>
        </div>
      </Section>

      <Section title="Badges and severity">
        <div className="flex flex-wrap gap-2">
          {(['neutral', 'info', 'positive', 'warning', 'accent', 'solid'] as BadgeTone[]).map(
            (tone) => (
              <Badge key={tone} tone={tone}>
                {tone}
              </Badge>
            ),
          )}
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <SeverityBadge level="low" />
          <SeverityBadge level="medium" />
          <SeverityBadge level="high" />
          <SeverityBadge level="high" long />
        </div>
      </Section>

      <Section title="Cards and stat tiles">
        <div className="grid gap-4 md:grid-cols-3">
          <Card
            title="Card title"
            description="Optional description"
            actions={
              <Button size="sm" variant="ghost">
                Action
              </Button>
            }
          >
            <p className="text-sm">Default card body.</p>
          </Card>
          <Card title="Alternate tone" tone="alt">
            <p className="text-sm">For secondary panels.</p>
          </Card>
          <div className="grid grid-cols-2 gap-3">
            <StatTile label="Slick area" value="6.8" unit="km²" emphasis source="Sentinel-1" />
            <StatTile label="Alerts" value={12} note={<SeverityBadge level="high" />} />
          </div>
        </div>
      </Section>

      <Section title="Form controls">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Select
            label="Harbour"
            value={select}
            onChange={setSelect}
            options={[
              { value: 'negombo', label: 'Negombo' },
              { value: 'galle', label: 'Galle' },
            ]}
            hint="Native select"
          />
          <DatePicker
            label="Detected from"
            value={date}
            onChange={setDate}
            hint="Native date input"
          />
          <SegmentedControl
            label="Lead time"
            value={lead}
            onChange={setLead}
            options={[
              { value: 24, label: '24 h' },
              { value: 48, label: '48 h' },
              { value: 72, label: '72 h' },
            ]}
          />
          <Toggle
            label="Show uncertainty"
            description="Switch"
            checked={toggle}
            onChange={setToggle}
          />
        </div>
      </Section>

      <Section title="Tabs">
        <Tabs
          label="Example tabs"
          value={tab}
          onChange={setTab}
          items={[
            {
              value: 'one',
              label: 'Time series',
              content: <p className="text-sm">First panel.</p>,
            },
            {
              value: 'two',
              label: 'Heat stress',
              content: <p className="text-sm">Second panel.</p>,
            },
          ]}
        />
      </Section>

      <Section title="Data table" description="Sortable. Becomes a list of cards below 768px.">
        <DataTable
          caption="Example table"
          rows={sampleRows}
          getRowId={(r) => r.id}
          onRowClick={() => undefined}
          selectedId="c"
          columns={[
            { key: 'name', header: 'Name', cell: (r) => r.name, sortValue: (r) => r.name },
            { key: 'region', header: 'Region', cell: (r) => r.region },
            {
              key: 'score',
              header: 'Score',
              align: 'right',
              cell: (r) => r.score.toFixed(2),
              sortValue: (r) => r.score,
            },
          ]}
        />
      </Section>

      <Section
        title="Loading, empty and error states"
        description="Use AsyncView to get these automatically."
      >
        <div className="grid gap-4 md:grid-cols-3">
          <LoadingState label="Loading data…" />
          <EmptyState title="No spills detected" message="Nothing was found in this date range." />
          <ErrorState error="The data service could not be reached." onRetry={() => undefined} />
        </div>
      </Section>

      <Section
        title="Disclaimers"
        description="Every component page states the limits of its data."
      >
        <div className="flex flex-col gap-3">
          <Disclaimer kind="satellite" />
          <Disclaimer kind="candidate" />
          <Disclaimer kind="forecast" />
          <Disclaimer kind="anomaly" />
        </div>
      </Section>

      <Section
        title="Map"
        description="MapView + GeoJSONLayer + MapLegend. Styles come from mapStyles."
      >
        <MapView
          label="Example map"
          height="sm"
          overlay={
            <MapLegend
              items={[
                ...(Object.keys(componentColors) as ComponentId[]).map((id) => ({
                  label: id.toUpperCase(),
                  color: componentColors[id],
                  shape: 'dot' as const,
                })),
                eezLegendItem,
              ]}
            />
          }
        >
          <GeoJSONLayer
            data={samplePoints}
            layerStyle={(f) => mapStyles.component(f.properties.id, { radius: 8 })}
            tooltip={(f) => f.properties.id.toUpperCase()}
          />
        </MapView>
      </Section>
    </>
  );
}
