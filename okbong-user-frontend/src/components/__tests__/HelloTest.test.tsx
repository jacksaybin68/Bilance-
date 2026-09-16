import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'

describe('User frontend test', () => {
  it('renders link', () => {
    const { container } = render(<a data-testid="home-link" href="/">Home</a>)
    expect(container.querySelector('[data-testid="home-link"]')).toBeTruthy()
  })
})