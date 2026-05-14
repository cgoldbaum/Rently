import { render, screen } from '@testing-library/react'
import StatusBadge from '../components/StatusBadge'

describe('StatusBadge', () => {
  it('muestra "Ocupado" para el estado OCCUPIED', () => {
    render(<StatusBadge status="OCCUPIED" />)
    expect(screen.getByText('Ocupado')).toBeInTheDocument()
  })

  it('muestra "Vacante" para el estado VACANT', () => {
    render(<StatusBadge status="VACANT" />)
    expect(screen.getByText('Vacante')).toBeInTheDocument()
  })

  it('muestra "En mora" para el estado IN_ARREARS', () => {
    render(<StatusBadge status="IN_ARREARS" />)
    expect(screen.getByText('En mora')).toBeInTheDocument()
  })

  it('muestra "Próx. vto." para el estado EXPIRING_SOON', () => {
    render(<StatusBadge status="EXPIRING_SOON" />)
    expect(screen.getByText('Próx. vto.')).toBeInTheDocument()
  })

  it('muestra el estado tal cual si no tiene etiqueta', () => {
    render(<StatusBadge status="ESTADO_DESCONOCIDO" />)
    expect(screen.getByText('ESTADO_DESCONOCIDO')).toBeInTheDocument()
  })

  it('incluye el punto de estado en el DOM', () => {
    const { container } = render(<StatusBadge status="PAID" />)
    expect(container.querySelector('.status-dot')).toBeInTheDocument()
  })

  it('aplica la clase CSS del estado', () => {
    const { container } = render(<StatusBadge status="RESOLVED" />)
    expect(container.querySelector('.status-RESOLVED')).toBeInTheDocument()
  })
})
