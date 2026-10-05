import { useSyncExternalStore } from 'react'
import {
  getSessionUser,
  getStatus,
  subscribe,
  type AuthUser,
} from '../../lib/auth/session.ts'

export function useSessionStatus() {
  return useSyncExternalStore(subscribe, getStatus, getStatus)
}

export function useSessionUser(): AuthUser | null {
  return useSyncExternalStore(subscribe, getSessionUser, getSessionUser)
}
