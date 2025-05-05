'use client';

import { useEffect, useState } from 'react';

// This is a client component wrapper that helps prevent hydration mismatches
export default function ClientWrapper({ children }) {
  const [isMounted, setIsMounted] = useState(false);
  
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Only render children on the client to avoid hydration mismatches
  if (!isMounted) {
    return <div suppressHydrationWarning></div>;
  }
  
  return <div suppressHydrationWarning>{children}</div>;
} 