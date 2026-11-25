import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import App from './App'
import { menu } from './fixtures'

describe('App', () => {
  it('shows the app title', () => {
    render(<App />)
    expect(screen.getByRole('heading', { name: 'Smart Order Builder' })).toBeInTheDocument()
  })

  it('loads the menu from /api/menu and shows every group', async () => {
    render(<App />)
    for (const group of menu.groups) {
      expect(await screen.findByRole('group', { name: new RegExp(`^${group.name}`) })).toBeInTheDocument()
    }
  })
})
