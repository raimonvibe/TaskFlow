import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import StatCard from './StatCard'

describe('StatCard', () => {
  it('should render title and value', () => {
    render(<StatCard title="Total Tasks" value={42} />)

    expect(screen.getByText('Total Tasks')).toBeInTheDocument()
    expect(screen.getByText('42')).toBeInTheDocument()
  })

  it('should render with icon when provided', () => {
    const MockIcon = () => <div data-testid="mock-icon">Icon</div>
    render(<StatCard title="Tasks" value={10} icon={<MockIcon />} />)

    expect(screen.getByTestId('mock-icon')).toBeInTheDocument()
  })

  it('should apply custom color class', () => {
    render(
      <StatCard title="Completed" value={5} color="text-green-600" />
    )

    const valueElement = screen.getByText('5')
    expect(valueElement.className).toContain('text-green-600')
  })

  it('should render zero value', () => {
    render(<StatCard title="Pending" value={0} />)

    expect(screen.getByText('0')).toBeInTheDocument()
  })

  it('should render large numbers correctly', () => {
    render(<StatCard title="All Tasks" value={9999} />)

    expect(screen.getByText('9999')).toBeInTheDocument()
  })
})
