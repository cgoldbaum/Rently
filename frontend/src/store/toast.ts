import { create } from 'zustand';

interface ToastState {
  message: string;
  showToast: (message: string) => void;
  clearToast: () => void;
}

export const useToastStore = create<ToastState>((set) => ({
  message: '',
  showToast: (message) => set({ message }),
  clearToast: () => set({ message: '' }),
}));
