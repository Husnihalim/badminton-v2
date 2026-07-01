import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { ClubMarketplace } from './ClubMarketplace'

describe('ClubMarketplace', () => {
  it('previews an uploaded photo and saves it into a visible draft listing', async () => {
    const user = userEvent.setup()
    render(<ClubMarketplace clubName="LEP BC" isMember />)

    await user.click(screen.getByRole('button', { name: /sell or request item/i }))
    await user.type(screen.getByPlaceholderText(/item or request title/i), 'Test racket')

    const photoInput = document.querySelector<HTMLInputElement>('input[type="file"]')
    expect(photoInput).toBeTruthy()

    const photo = new File(['photo'], 'racket.png', { type: 'image/png' })
    await user.upload(photoInput as HTMLInputElement, photo)

    await waitFor(() => expect(screen.getByText('racket.png')).toBeInTheDocument())

    await user.click(screen.getByRole('button', { name: /save draft/i }))

    expect(screen.getByText('Test racket')).toBeInTheDocument()
    expect(screen.getByAltText('Test racket')).toBeInTheDocument()
  })
})
