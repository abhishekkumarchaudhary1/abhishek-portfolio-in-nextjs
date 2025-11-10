'use client';

import { Suspense } from 'react';
import dynamic from 'next/dynamic';

export const dynamicParams = false;

const TermsContent = dynamic(() => import('./termsContent'));

export default function TermsPage() {
  return (
    <section className="pt-32 pb-20 bg-white">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8 text-center">
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900">Terms & Conditions</h1>
          <div className="w-20 h-1 bg-indigo-600 mx-auto mt-4"></div>
        </div>
        <Suspense fallback={<div className="text-indigo-600">Loading...</div>}>
          <TermsContent />
        </Suspense>
      </div>
    </section>
  );
}


