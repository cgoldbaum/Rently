import { render, screen } from '@testing-library/react';
import Toast from '@/components/Toast';

jest.mock('@/components/Icon', () => ({ name, size, color }: { name: string; size: number; color: string }) => (
  <span data-testid="mock-icon" data-name={name} data-size={size} data-color={color} />
));

beforeEach(() => {
  jest.useFakeTimers();
});

afterEach(() => {
  jest.useRealTimers();
});

describe('Toast', () => {
  it('renders the message', () => {
    render(<Toast message="Propiedad actualizada" onClose={() => {}} />);
    expect(screen.getByText('Propiedad actualizada')).toBeInTheDocument();
  });

  it('has role="status" for accessibility', () => {
    render(<Toast message="Test" onClose={() => {}} />);
    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('renders the check icon', () => {
    render(<Toast message="Test" onClose={() => {}} />);
    expect(screen.getByTestId('mock-icon')).toBeInTheDocument();
    expect(screen.getByTestId('mock-icon')).toHaveAttribute('data-name', 'check');
  });

  it('calls onClose after 3 seconds', () => {
    const onClose = jest.fn();
    render(<Toast message="Test" onClose={onClose} />);
    expect(onClose).not.toHaveBeenCalled();
    jest.advanceTimersByTime(3000);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('cleans up the timeout on unmount', () => {
    const onClose = jest.fn();
    const { unmount } = render(<Toast message="Test" onClose={onClose} />);
    unmount();
    jest.advanceTimersByTime(3000);
    expect(onClose).not.toHaveBeenCalled();
  });

  it('has aria-live="polite" for screen readers', () => {
    render(<Toast message="Test" onClose={() => {}} />);
    expect(screen.getByRole('status')).toHaveAttribute('aria-live', 'polite');
  });
});
