'use client';

import { Suspense } from 'react';
import dynamic from 'next/dynamic';

// Use dynamic imports for components
const Hero = dynamic(() => import('./components/Hero'));
const About = dynamic(() => import('./components/About'));
const Projects = dynamic(() => import('./components/Projects'));
const Skills = dynamic(() => import('./components/Skills'));
const Contact = dynamic(() => import('./components/Contact'));

// Add loading fallbacks
const LoadingPlaceholder = () => (
  <div className="flex items-center justify-center min-h-[50vh]">
    <div className="animate-pulse text-indigo-600">Loading...</div>
  </div>
);

export default function Home() {
  return (
    <div className="min-h-screen">
      <Suspense fallback={<LoadingPlaceholder />}>
        <Hero />
      </Suspense>
      <Suspense fallback={<LoadingPlaceholder />}>
        <About />
      </Suspense>
      <Suspense fallback={<LoadingPlaceholder />}>
        <Skills />
      </Suspense>
      <Suspense fallback={<LoadingPlaceholder />}>
        <Projects />
      </Suspense>
      <Suspense fallback={<LoadingPlaceholder />}>
        <Contact />
      </Suspense>
    </div>
  );
}
