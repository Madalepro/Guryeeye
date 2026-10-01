'use client';

import { PROPERTY_TYPE_LABELS, PropertyType, type PublicListing, type PublicListingQuery } from '@guryeeye/shared';
import { useSearchParams } from 'next/navigation';
import { useState } from 'react';
import { InquiryModal, ListingCard } from '@/components/site';
import { EmptyState, ErrorBanner, Segmented, Spinner } from '@/components/ui';
import { api } from '@/lib/api';
import { useAsync } from '@/lib/use-async';

type Kind = 'all' | 'rent' | 'sale';

export function ListingBrowser({ kind: fixedKind }: { kind?: 'rent' | 'sale' }) {
  const params = useSearchParams();
  const [kind, setKind] = useState<Kind>(fixedKind ?? ((params.get('kind') as Kind | null) ?? 'all'));
  const [city, setCity] = useState(params.get('city') ?? '');
  const [type, setType] = useState<PropertyType | ''>((params.get('type') as PropertyType | null) ?? '');
  const [beds, setBeds] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [q, setQ] = useState(params.get('q') ?? '');
  const [inquiring, setInquiring] = useState<PublicListing | null>(null);

  const query: PublicListingQuery = {
    kind: kind === 'all' ? undefined : kind,
    city: city || undefined,
    type: type || undefined,
    minBedrooms: beds ? Number(beds) : undefined,
    maxPriceCents: maxPrice ? Math.round(Number(maxPrice) * 100) : undefined,
    q: q.trim() || undefined,
  };
  const stats = useAsync(() => api.marketplace.stats(), []);
  const { data, error, loading, reload } = useAsync(() => api.marketplace.listings(query), [JSON.stringify(query)]);

  return (
    <div className="mx-auto max-w-7xl px-6 py-8">
      <div className="mb-6 grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-card sm:grid-cols-2 lg:grid-cols-6">
        {!fixedKind && (
          <div className="flex items-end lg:col-span-6">
            <Segmented<Kind>
              value={kind}
              onChange={setKind}
              options={[
                { value: 'all', label: 'Rent & buy' },
                { value: 'rent', label: 'To rent' },
                { value: 'sale', label: 'To buy' },
              ]}
            />
          </div>
        )}
        <div className="lg:col-span-2">
          <label className="label" htmlFor="fSearch">Search</label>
          <input id="fSearch" name="fSearch" className="input" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Neighbourhood, street or building" />
        </div>
        <div>
          <label className="label" htmlFor="fCity">City</label>
          <select id="fCity" name="fCity" className="input" value={city} onChange={(e) => setCity(e.target.value)}>
            <option value="">All cities</option>
            {stats.data?.cities.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div>
          <label className="label" htmlFor="fType">Type</label>
          <select id="fType" name="fType" className="input" value={type} onChange={(e) => setType(e.target.value as PropertyType | '')}>
            <option value="">Any type</option>
            {Object.values(PropertyType).map((t) => <option key={t} value={t}>{PROPERTY_TYPE_LABELS[t]}</option>)}
          </select>
        </div>
        <div>
          <label className="label" htmlFor="fBeds">Bedrooms</label>
          <select id="fBeds" name="fBeds" className="input" value={beds} onChange={(e) => setBeds(e.target.value)}>
            <option value="">Any</option>
            {[1, 2, 3, 4, 5].map((n) => <option key={n} value={n}>{n}+</option>)}
          </select>
        </div>
        <div>
          <label className="label" htmlFor="fMax">Max price (USD)</label>
          <input id="fMax" name="fMax" type="number" min={0} className="input" value={maxPrice} onChange={(e) => setMaxPrice(e.target.value)} placeholder={kind === 'rent' ? 'per month' : 'Any'} />
        </div>
      </div>

      <ErrorBanner error={error} onRetry={reload} />
      {loading && !data ? (
        <div className="flex justify-center py-20 text-brand-700"><Spinner /></div>
      ) : data && data.length === 0 ? (
        <EmptyState title="No homes match these filters" description="Try another city or widen your price range." />
      ) : (
        <>
          <p className="mb-4 text-sm text-ink-muted">{data?.length ?? 0} propert{data?.length === 1 ? 'y' : 'ies'} found</p>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {data?.map((l) => <ListingCard key={`${l.kind}-${l.id}`} listing={l} onInquire={setInquiring} />)}
          </div>
        </>
      )}
      <InquiryModal listing={inquiring} onClose={() => setInquiring(null)} />
    </div>
  );
}
