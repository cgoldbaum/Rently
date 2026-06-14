import { render, screen } from '@testing-library/react';
import Icon from '@/components/Icon';

describe('Icon', () => {
  it('renders an svg element', () => {
    const { container } = render(<Icon name="check" size={18} />);
    const svg = container.querySelector('svg');
    expect(svg).toBeInTheDocument();
  });

  it('applies size as width and height', () => {
    const { container } = render(<Icon name="check" size={24} />);
    const svg = container.querySelector('svg');
    expect(svg).toHaveAttribute('width', '24');
    expect(svg).toHaveAttribute('height', '24');
  });

  it('applies custom color as stroke', () => {
    const { container } = render(<Icon name="check" size={18} color="#ff0000" />);
    const svg = container.querySelector('svg');
    expect(svg).toHaveAttribute('stroke', '#ff0000');
  });

  it('uses default size 20 when not provided', () => {
    const { container } = render(<Icon name="home" />);
    const svg = container.querySelector('svg');
    expect(svg).toHaveAttribute('width', '20');
    expect(svg).toHaveAttribute('height', '20');
  });

  it('uses currentColor as default stroke', () => {
    const { container } = render(<Icon name="home" />);
    const svg = container.querySelector('svg');
    expect(svg).toHaveAttribute('stroke', 'currentColor');
  });

  it('sets aria-hidden when no label is provided', () => {
    const { container } = render(<Icon name="check" />);
    const svg = container.querySelector('svg');
    expect(svg).toHaveAttribute('aria-hidden', 'true');
    expect(svg).not.toHaveAttribute('role');
  });

  it('sets role="img" and aria-label when label is provided', () => {
    render(<Icon name="check" label="Confirmar" />);
    const svg = screen.getByRole('img');
    expect(svg).toHaveAttribute('aria-label', 'Confirmar');
  });

  it('renders use element with correct href', () => {
    const { container } = render(<Icon name="check" />);
    const useEl = container.querySelector('use');
    expect(useEl).toHaveAttribute('href', '/icons/check.svg#root');
  });
});
