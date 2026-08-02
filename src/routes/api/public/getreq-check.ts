import { createFileRoute } from '@tanstack/react-router'
import { getRequest } from '@tanstack/react-start/server'

export const Route = createFileRoute('/api/public/getreq-check')({
  server: {
    handlers: {
      GET: async () => Response.json({ type: typeof getRequest }),
    },
  },
})
