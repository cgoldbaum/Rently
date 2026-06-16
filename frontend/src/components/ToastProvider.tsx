'use client';
import { useToastStore } from '@/store/toast';
import Toast from './Toast';

export default function ToastProvider() {
  const message = useToastStore(s => s.message);
  const clearToast = useToastStore(s => s.clearToast);
  if (!message) return null;
  return <Toast message={message} onClose={clearToast} />;
}
