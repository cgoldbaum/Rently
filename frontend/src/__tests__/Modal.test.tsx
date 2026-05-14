import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import Modal from '../components/Modal'

// Mock del componente Icon para evitar dependencias externas en tests
jest.mock('../components/Icon', () => ({
  __esModule: true,
  default: ({ name }: { name: string }) => <span data-testid={`icon-${name}`} />,
}))

describe('Modal', () => {
  const defaultProps = {
    title: 'Título del modal',
    onClose: jest.fn(),
    children: <p>Contenido del modal</p>,
  }

  beforeEach(() => {
    defaultProps.onClose = jest.fn()
  })

  it('muestra el título', () => {
    render(<Modal {...defaultProps} />)
    expect(screen.getByText('Título del modal')).toBeInTheDocument()
  })

  it('muestra el contenido (children)', () => {
    render(<Modal {...defaultProps} />)
    expect(screen.getByText('Contenido del modal')).toBeInTheDocument()
  })

  it('llama a onClose al hacer click en el botón cerrar', async () => {
    render(<Modal {...defaultProps} />)
    await userEvent.click(screen.getByRole('button'))
    expect(defaultProps.onClose).toHaveBeenCalledTimes(1)
  })

  it('llama a onClose al hacer click en el overlay', async () => {
    const { container } = render(<Modal {...defaultProps} />)
    await userEvent.click(container.querySelector('.modal-overlay')!)
    expect(defaultProps.onClose).toHaveBeenCalledTimes(1)
  })

  it('NO llama a onClose al hacer click dentro del modal', async () => {
    const { container } = render(<Modal {...defaultProps} />)
    await userEvent.click(container.querySelector('.modal')!)
    expect(defaultProps.onClose).not.toHaveBeenCalled()
  })

  it('muestra el footer cuando se pasa', () => {
    render(<Modal {...defaultProps} footer={<button>Guardar</button>} />)
    expect(screen.getByRole('button', { name: 'Guardar' })).toBeInTheDocument()
  })

  it('no muestra el footer cuando no se pasa', () => {
    const { container } = render(<Modal {...defaultProps} />)
    expect(container.querySelector('.modal-footer')).not.toBeInTheDocument()
  })
})
