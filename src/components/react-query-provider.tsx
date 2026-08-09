'use client'

import * as React from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

export function ReactQueryProvider({ children }: { children: React.ReactNode }) {
  const [client] = React.useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 0,
            refetchOnWindowFocus: true,
            // Cloud refresh: open Senlie tabs re-check Supabase-backed API data
            // every 5 seconds. Writes themselves are immediate; polling is only
            // for pulling changes made from another tab/device.
            refetchInterval: 5_000,
            refetchIntervalInBackground: false,
            retry: 1,
          },
        },
      })
  )
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>
}
