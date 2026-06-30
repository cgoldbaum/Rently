'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

// Register is handled directly from login page via tab switching
export default function RegisterPage() {
  const router = useRouter();
  useEffect(() => {
    router.replace('/login');
  }, [router]);
  return null;
}
