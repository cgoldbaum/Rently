'use client';

import { useRouter } from 'next/navigation';
import Link from 'next/link';

// Register is handled directly from login page via tab switching
export default function RegisterPage() {
  const router = useRouter();
  router.replace('/login');
  return null;
}
