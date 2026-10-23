'use client'

import { create } from 'zustand'
import type { PublicAccount, Role } from '@/lib/auth'

interface AuthState {
  account: PublicAccount | null
  loading: boolean // initial session check
  submitting: boolean
  error: string | null
  fetchMe: () => Promise<void>
  login: (email: string, password: string) => Promise<boolean>
  signup: (input: {
    name: string
    email: string
    password: string
    role: Role
    department?: string
  }) => Promise<boolean>
  logout: () => Promise<void>
  clearError: () => void
}

export const useAuth = create<AuthState>((set) => ({
  account: null,
  loading: true,
  submitting: false,
  error: null,

  fetchMe: async () => {
    try {
      const res = await fetch('/api/auth/me', { cache: 'no-store' })
      const data = await res.json()
      set({ account: data.account ?? null, loading: false })
    } catch {
      set({ account: null, loading: false })
    }
  },

  login: async (email, password) => {
    set({ submitting: true, error: null })
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })
      const data = await res.json()
      if (!res.ok) {
        set({ submitting: false, error: data.error || 'Login failed' })
        return false
      }
      set({ submitting: false, error: null, account: data.account })
      return true
    } catch {
      set({ submitting: false, error: 'Network error. Please try again.' })
      return false
    }
  },

  signup: async (input) => {
    set({ submitting: true, error: null })
    try {
      const res = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      })
      const data = await res.json()
      if (!res.ok) {
        set({ submitting: false, error: data.error || 'Sign up failed' })
        return false
      }
      set({ submitting: false, error: null, account: data.account })
      return true
    } catch {
      set({ submitting: false, error: 'Network error. Please try again.' })
      return false
    }
  },

  logout: async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' })
    } finally {
      set({ account: null, error: null })
    }
  },

  clearError: () => set({ error: null }),
}))
