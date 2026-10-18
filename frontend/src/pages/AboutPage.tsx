import { Link } from 'react-router-dom';
import { Card, DataTable, Disclaimer, PageHeader, Section } from '@/components/ui';
import { features } from '@/features/registry';
import type { FeatureManifest } from '@/lib/feature';

export function AboutPage() {
  return (
    <>
      <PageHeader
        title="About the project"
        subtitle="AI-Based Marine Monitoring and Decision Support System for Sri Lankan waters. Final-year IT research project J26-IT-364, SLIIT."
      />

      <div className="max-w-prose font-serif text-base leading-relaxed">
        <p>
          Sri Lanka’s waters face illegal fishing, oil pollution and coral bleaching, while
          small-scale fishers spend a large share of their income on fuel searching for fish. This
          system combines four machine-learning components that share one data pipeline, one
          geospatial database (PostGIS) and this web app.
        </p>
        <p className="mt-4">
          Agencies use the full map dashboard on desktop. Fishers use the simple{' '}
          <Link to="/c2/fisher">fisher view</Link> on their phones, which keeps the last forecast
          for use without signal.
        </p>
      </div>

      <Section title="Components">
        <DataTable<FeatureManifest>
          caption="Project components and owners"
          rows={features.map((f) => f.manifest)}
          getRowId={(m) => m.id}
          columns={[
            { key: 'id', header: 'ID', cell: (m) => m.id.toUpperCase() },
            { key: 'title', header: 'Component', cell: (m) => <Link to={m.route}>{m.title}</Link> },
            { key: 'description', header: 'What it shows', cell: (m) => m.description },
            { key: 'owner', header: 'Owner', cell: (m) => m.owner },
          ]}
        />
      </Section>

      <Section title="Data sources">
        <div className="grid gap-4 md:grid-cols-2">
          <Card title="Satellites" headingLevel={3}>
            <p className="font-serif text-sm">
              Sentinel-1 SAR (vessels, oil slicks), Sentinel-2 (reef benthic cover), and sea-surface
              temperature products for heat stress.
            </p>
          </Card>
          <Card title="Vessels and ocean" headingLevel={3}>
            <p className="font-serif text-sm">
              AIS vessel positions, Copernicus Marine ocean data, and catch records for the
              fishing-zone model.
            </p>
          </Card>
        </div>
      </Section>

      <Section title="Limits">
        <div className="flex flex-col gap-3">
          <Disclaimer kind="satellite" />
          <Disclaimer kind="candidate" />
          <Disclaimer kind="forecast" />
          <Disclaimer kind="anomaly" />
        </div>
      </Section>

      <p className="mt-8 text-sm text-muted">
        Building a page? See the <Link to="/styleguide">styleguide</Link> for every shared
        component.
      </p>
    </>
  );
}
