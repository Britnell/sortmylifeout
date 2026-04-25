import { createAPIFileRoute } from '@tanstack/react-start/api'
import { createAuth } from '../../../lib/auth'

export const APIRoute = createAPIFileRoute('/api/auth/$')({
	GET: ({ request }) => createAuth().handler(request),
	POST: ({ request }) => createAuth().handler(request),
})
