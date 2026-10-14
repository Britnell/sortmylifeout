import { atomWithStorage } from 'jotai/utils'
import type { CalView } from '@/components/CalViewSwitcher'

// https://jotai.org/docs/guides/persistence
export const sidebarOpenAtom = atomWithStorage('sidebar-open', false, undefined, {
  getOnInit: true,
})

export const calViewAtom = atomWithStorage<CalView>(
  'cal-last-view',
  '/cal/month',
  undefined,
  { getOnInit: true },
)
