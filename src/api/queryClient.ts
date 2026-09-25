import { QueryClient } from '@tanstack/react-query'

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      gcTime: 10 * 60_000,
      retry: (count, error) => {
        // Ошибки прав доступа и «не найдено» повторять бессмысленно.
        const code = (error as { code?: string } | null)?.code
        if (code && /^(PGRST|42|23)/.test(code)) return false
        return count < 2
      },
      refetchOnWindowFocus: false,
    },
  },
})
