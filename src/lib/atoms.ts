import { atom } from 'jotai'

// https://jotai.org/docs/guides/persistence
const atomWithLocalStorage = <T>(key: string, initialValue: T) => {
	const getInitialValue = () => {
		if (typeof window === 'undefined') return initialValue
		try {
			const item = localStorage.getItem(key)
			if (item !== null) {
				return JSON.parse(item)
			}
		} catch {
			/* storage unavailable */
		}
		return initialValue
	}
	const baseAtom = atom(getInitialValue())
	const derivedAtom = atom(
		(get) => get(baseAtom),
		(get, set, update: T | ((prev: T) => T)) => {
			const nextValue =
				typeof update === 'function'
					? (update as (prev: T) => T)(get(baseAtom))
					: update
			set(baseAtom, nextValue)
			try {
				localStorage.setItem(key, JSON.stringify(nextValue))
			} catch {
				/* storage unavailable */
			}
		},
	)
	return derivedAtom
}

export const sidebarOpenAtom = atomWithLocalStorage('sidebar-open', false)
