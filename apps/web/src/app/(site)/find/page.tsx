import { Suspense } from 'react';
import { ListingBrowser } from '@/components/listing-browser';
import { PageIntro } from '@/components/site';

export const metadata = { title: 'Search every home on Guryeeye' };

export default function Page() {
  return (
    <>
      <PageIntro eyebrow="Find a Home" title="Search every home on Guryeeye">
        Rentals and sales in one search — filter by city, type, bedrooms and budget.
      </PageIntro>
      <Suspense>
        <ListingBrowser />
      </Suspense>
    </>
  );
}
