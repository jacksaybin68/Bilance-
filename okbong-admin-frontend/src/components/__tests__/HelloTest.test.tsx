import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'

describe('Admin frontend test', () => {
  it('renders page', () => {
    const { container } = render(<div data-testid="hello">Hello World</div>)
    expect(container.querySelector('[data-testid="hello"]')).toBeTruthy()
  })
})