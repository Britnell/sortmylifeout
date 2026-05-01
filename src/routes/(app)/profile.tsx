import { createFileRoute } from '@tanstack/react-router'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { authClient } from '../../lib/auth-client'
import { getUserFn, updateUserFn } from '../../serverFn/queries.functions'

export const Route = createFileRoute('/(app)/profile')({
  component: ProfilePage,
})

// Normalise to international format with + prefix, stripping spaces/dashes
// e.g. "+1 (650) 555-1234" → "+16505551234". Returns null if no leading +.
function toIntlFormat(raw: string): string | null {
  const trimmed = raw.trim()
  if (!trimmed.startsWith('+')) return null
  return '+' + trimmed.slice(1).replace(/\D/g, '')
}

function ProfilePage() {
  const qc = useQueryClient()
  const { data: user, isLoading } = useQuery({
    queryKey: ['profile'],
    queryFn: () => getUserFn(),
  })

  const [name, setName] = useState('')
  const [nameEdited, setNameEdited] = useState(false)

  const [showPhoneInput, setShowPhoneInput] = useState(false)
  const [phoneRaw, setPhoneRaw] = useState('')
  const [phoneConfirm, setPhoneConfirm] = useState<string | null>(null)

  const mutation = useMutation({
    mutationFn: updateUserFn,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['profile'] }),
  })

  if (isLoading || !user) return null

  const currentName = nameEdited ? name : user.name

  function handleNameSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!currentName.trim()) return
    mutation.mutate({ data: { name: currentName.trim() } })
    setNameEdited(false)
  }

  function handlePhonePreview(e: React.FormEvent) {
    e.preventDefault()
    const normalised = toIntlFormat(phoneRaw)
    if (!normalised) return
    setPhoneConfirm(normalised)
  }

  function handlePhoneSave() {
    if (!phoneConfirm) return
    mutation.mutate({ data: { phone: phoneConfirm } })
    setShowPhoneInput(false)
    setPhoneRaw('')
    setPhoneConfirm(null)
  }

  function handleRemovePhone() {
    mutation.mutate({ data: { phone: null } })
  }

  return (
    <div className="max-w-md mx-auto py-10 px-4 flex flex-col gap-8">
      <h1 className="text-2xl font-semibold">Profile</h1>

      {/* Name */}
      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-medium text-gray-500 uppercase tracking-wide">Name</h2>
        <form onSubmit={handleNameSubmit} className="flex gap-2">
          <input
            className="flex-1 border rounded px-3 py-2 text-sm"
            value={nameEdited ? name : user.name}
            onChange={(e) => {
              setNameEdited(true)
              setName(e.target.value)
            }}
          />
          <button
            type="submit"
            disabled={!nameEdited || mutation.isPending}
            className="px-4 py-2 text-sm bg-black text-white rounded disabled:opacity-40"
          >
            Save
          </button>
        </form>
      </section>

      {/* Phone / WhatsApp */}
      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-medium text-gray-500 uppercase tracking-wide">WhatsApp</h2>

        {user.phone ? (
          <div className="flex items-center gap-3">
            <span className="text-sm font-mono">{user.phone}</span>
            <button
              onClick={handleRemovePhone}
              className="text-xs text-red-500 hover:underline"
              disabled={mutation.isPending}
            >
              Remove
            </button>
            <button
              onClick={() => {
                setShowPhoneInput(true)
                setPhoneRaw('')
                setPhoneConfirm(null)
              }}
              className="text-xs text-gray-500 hover:underline"
            >
              Change
            </button>
          </div>
        ) : !showPhoneInput ? (
          <button
            onClick={() => setShowPhoneInput(true)}
            className="self-start px-4 py-2 text-sm border rounded hover:bg-gray-50"
          >
            Add WhatsApp
          </button>
        ) : null}

        {showPhoneInput && (
          <div className="flex flex-col gap-3">
            {phoneConfirm === null ? (
              <form onSubmit={handlePhonePreview} className="flex gap-2">
                <input
                  className="flex-1 border rounded px-3 py-2 text-sm font-mono"
                  placeholder="+44 7911 123456"
                  value={phoneRaw}
                  onChange={(e) => setPhoneRaw(e.target.value)}
                  autoFocus
                />
                <button
                  type="submit"
                  className="px-4 py-2 text-sm bg-black text-white rounded"
                >
                  Next
                </button>
                <button
                  type="button"
                  onClick={() => { setShowPhoneInput(false); setPhoneRaw('') }}
                  className="px-3 py-2 text-sm text-gray-500"
                >
                  Cancel
                </button>
              </form>
            ) : (
              <div className="flex flex-col gap-2">
                <p className="text-sm text-gray-600">
                  Confirm your number in international format:
                </p>
                <p className="font-mono text-lg">{phoneConfirm}</p>
                <div className="flex gap-2">
                  <button
                    onClick={handlePhoneSave}
                    disabled={mutation.isPending}
                    className="px-4 py-2 text-sm bg-black text-white rounded disabled:opacity-40"
                  >
                    Confirm & Save
                  </button>
                  <button
                    onClick={() => setPhoneConfirm(null)}
                    className="px-3 py-2 text-sm text-gray-500"
                  >
                    Edit
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </section>

      {/* Logout */}
      <section className="pt-4 border-t">
        <button
          onClick={() => authClient.signOut()}
          className="px-4 py-2 text-sm text-red-600 border border-red-200 rounded hover:bg-red-50"
        >
          Log out
        </button>
      </section>
    </div>
  )
}
