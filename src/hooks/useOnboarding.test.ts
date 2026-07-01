import { renderHook, act, waitFor } from '@testing-library/react'
import { describe, it, expect, beforeEach } from 'vitest'
import { useOnboarding } from './useOnboarding'
import type { User } from '../types'

const mockUser: User = {
  id: 'user-1',
  email: 'test@example.com',
  name: 'Test User',
  role: 'member',
}

const storageKey = (tourId: string) => `kelabsukan.onboarding.${tourId}.${mockUser.id}`

describe('useOnboarding', () => {
  beforeEach(() => {
    window.localStorage.clear()
  })

  it('shows tour automatically for a new user', async () => {
    const { result } = renderHook(() =>
      useOnboarding({ user: mockUser, tourId: 'test-tour', autoShow: true })
    )

    await waitFor(() => {
      expect(result.current.isVisible).toBe(true)
      expect(result.current.status).toBe('started')
    })
  })

  it('does not show tour when autoShow is false', async () => {
    const { result } = renderHook(() =>
      useOnboarding({ user: mockUser, tourId: 'test-tour', autoShow: false })
    )

    await waitFor(() => {
      expect(result.current.isVisible).toBe(false)
      expect(result.current.status).toBe('pending')
    })
  })

  it('hides tour after completion and persists state', async () => {
    const { result } = renderHook(() =>
      useOnboarding({ user: mockUser, tourId: 'test-tour', autoShow: true })
    )

    await waitFor(() => expect(result.current.isVisible).toBe(true))

    act(() => {
      result.current.complete()
    })

    await waitFor(() => {
      expect(result.current.isVisible).toBe(false)
      expect(result.current.status).toBe('completed')
    })

    expect(window.localStorage.getItem(storageKey('test-tour'))).toBe('completed')
  })

  it('hides tour after skip and persists state', async () => {
    const { result } = renderHook(() =>
      useOnboarding({ user: mockUser, tourId: 'test-tour', autoShow: true })
    )

    await waitFor(() => expect(result.current.isVisible).toBe(true))

    act(() => {
      result.current.skip()
    })

    await waitFor(() => {
      expect(result.current.isVisible).toBe(false)
      expect(result.current.status).toBe('skipped')
    })

    expect(window.localStorage.getItem(storageKey('test-tour'))).toBe('skipped')
  })

  it('can reset persisted state', async () => {
    window.localStorage.setItem(storageKey('test-tour'), 'completed')

    const { result } = renderHook(() =>
      useOnboarding({ user: mockUser, tourId: 'test-tour', autoShow: true })
    )

    await waitFor(() => expect(result.current.status).toBe('completed'))

    act(() => {
      result.current.reset()
    })

    await waitFor(() => {
      expect(result.current.status).toBe('started')
      expect(result.current.isVisible).toBe(true)
    })

    expect(window.localStorage.getItem(storageKey('test-tour'))).toBeNull()
  })

  it('stays pending when no user is provided', async () => {
    const { result } = renderHook(() =>
      useOnboarding({ user: null, tourId: 'test-tour', autoShow: true })
    )

    await waitFor(() => {
      expect(result.current.isVisible).toBe(false)
      expect(result.current.status).toBe('pending')
    })
  })

  it('stays pending when disabled', async () => {
    const { result } = renderHook(() =>
      useOnboarding({ user: mockUser, tourId: 'test-tour', autoShow: true, enabled: false })
    )

    await waitFor(() => {
      expect(result.current.isVisible).toBe(false)
      expect(result.current.status).toBe('pending')
    })
  })
})
