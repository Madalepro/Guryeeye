import { Suspense } from 'react';
import { ListingBrowser } from '@/components/listing-browser';
import { PageIntro } from '@/components/site';

export const metadata = { title: 'Homes for rent' };

export default function Page() {
  return (
    <>
      <PageIntro eyebrow="For Rent · Guryaha Kirada" title="Homes for rent">
        Vacant apartments, houses and shops from verified landlords. Send an enquiry and the property manager will call you back.
      </PageIntro>
      <Suspense>
        <ListingBrowser kind="rent" />
      </Suspense>
    </>
  );
}
