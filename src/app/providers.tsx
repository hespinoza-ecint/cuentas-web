import { QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { PwaUpdatePrompt } from './PwaUpdatePrompt.tsx'
import { queryClient } from './query-client.ts'

export function Providers({ children }: { children: ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      {children}
      <PwaUpdatePrompt />
    </QueryClientProvider>
  )
}
