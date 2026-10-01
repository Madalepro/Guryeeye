import { Suspense } from 'react';
import { ListingBrowser } from '@/components/listing-browser';
import { PageIntro } from '@/components/site';

export const metadata = { title: 'Properties for sale' };

export default function Page() {
  return (
    <>
      <PageIntro eyebrow="For Sale · Iibka" title="Properties for sale">
        Villas, family homes, plots and commercial space on the market now. Enquiries go straight to the listing agent.
      </PageIntro>
      <Suspense>
        <ListingBrowser kind="sale" />
      </Suspense>
    </>
  );
}
