import { render, screen } from '@testing-library/react';
import { act } from 'react';
import ToastProvider from '@/components/ToastProvider';
import { useToastStore } from '@/store/toast';

jest.mock('@/components/Icon', () => {
  const MockIcon = (_props: { name: string; size: number; color: string }) => (
    <span data-testid="mock-icon" />
  );
  return MockIcon;
});

describe('ToastProvider', () => {
  beforeEach(() => {
    useToastStore.setState({ message: '' });
  });

  it('renders nothing when there is no message', () => {
    const { container } = render(<ToastProvider />);
    expect(container.innerHTML).toBe('');
  });

  it('renders toast when message is set', () => {
    useToastStore.setState({ message: 'Test toast' });
    render(<ToastProvider />);
    expect(screen.getByText('Test toast')).toBeInTheDocument();
  });

  it('clears message when toast calls onClose', () => {
    jest.useFakeTimers();
    useToastStore.setState({ message: 'Test toast' });
    render(<ToastProvider />);
    act(() => { jest.advanceTimersByTime(3000); });
    expect(useToastStore.getState().message).toBe('');
    jest.useRealTimers();
  });

  it('showToast sets the message in the store', () => {
    act(() => { useToastStore.getState().showToast('New alert'); });
    expect(useToastStore.getState().message).toBe('New alert');
  });

  it('clearToast resets the message', () => {
    useToastStore.setState({ message: 'Active toast' });
    act(() => { useToastStore.getState().clearToast(); });
    expect(useToastStore.getState().message).toBe('');
  });
});
