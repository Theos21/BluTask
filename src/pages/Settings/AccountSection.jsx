import { useState, useRef } from 'react'
import { Camera, Check, Loader2, LogOut } from 'lucide-react'
import { useAuthStore } from '../../stores/useAuthStore'
import { supabase } from '../../lib/supabase'
import Avatar from '../../components/ui/Avatar'
import { AVATAR_COLORS } from '../../lib/constants'
import { showToast } from '../../lib/toast'
import ChangePasswordModal from './ChangePasswordModal'

function SaveButton({ saving, saved, onClick, label = 'Save' }) {
  return (
    <button
      onClick={onClick}
      disabled={saving}
      className="btn-primary text-xs px-3 py-1.5 disabled:opacity-50"
    >
      {saving ? <Loader2 size={13} className="animate-spin" /> : saved ? <Check size={13} /> : null}
      {saving ? 'Saving…' : saved ? 'Saved' : label}
    </button>
  )
}

export default function AccountSection() {
  const { user, profile, updateProfile, updateEmail, signOut } = useAuthStore()
  const fileRef = useRef(null)

  // Full name
  const [fullName, setFullName] = useState(profile?.full_name || '')
  const [nameSaving, setNameSaving] = useState(false)
  const [nameSaved, setNameSaved] = useState(false)

  // Display name (greeting alias)
  const [displayName, setDisplayName] = useState(profile?.display_name || '')
  const [displayNameSaving, setDisplayNameSaving] = useState(false)
  const [displayNameSaved, setDisplayNameSaved] = useState(false)

  // Email
  const [showEmailForm, setShowEmailForm] = useState(false)
  const [newEmail, setNewEmail] = useState('')
  const [emailMsg, setEmailMsg] = useState('')
  const [emailSaving, setEmailSaving] = useState(false)

  // Password modal
  const [passwordModalOpen, setPasswordModalOpen] = useState(false)

  // Avatar
  const [avatarSaving, setAvatarSaving] = useState(false)
  const [avatarError, setAvatarError] = useState('')

  async function saveName() {
    if (!fullName.trim()) return
    setNameSaving(true)
    await updateProfile({ full_name: fullName.trim() })
    setNameSaving(false)
    setNameSaved(true)
    setTimeout(() => setNameSaved(false), 2000)
    showToast({ message: 'Changes saved', variant: 'success' })
  }

  async function saveDisplayName() {
    setDisplayNameSaving(true)
    await updateProfile({ display_name: displayName.trim() || null })
    setDisplayNameSaving(false)
    setDisplayNameSaved(true)
    setTimeout(() => setDisplayNameSaved(false), 2000)
    showToast({ message: 'Changes saved', variant: 'success' })
  }

  async function changeEmail(e) {
    e.preventDefault()
    if (!newEmail.trim()) return
    setEmailSaving(true)
    setEmailMsg('')
    const { error } = await updateEmail(newEmail.trim())
    setEmailSaving(false)
    if (error) setEmailMsg(error.message)
    else {
      setEmailMsg('Confirmation sent to both addresses. Check your inbox.')
      setNewEmail('')
      setShowEmailForm(false)
    }
  }

  async function pickAvatarColor(color) {
    setAvatarSaving(true)
    setAvatarError('')
    const { error } = await updateProfile({ avatar_url: `color:${color}` })
    setAvatarSaving(false)
    if (error) setAvatarError(error.message)
    else showToast({ message: 'Changes saved', variant: 'success' })
  }

  async function uploadAvatar(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setAvatarSaving(true)
    const ext = file.name.split('.').pop()
    const path = `${user.id}/avatar.${ext}`
    const { error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(path, file, { upsert: true })
    if (uploadError) {
      setAvatarSaving(false)
      alert('Upload failed. Make sure you have created a public "avatars" bucket in Supabase Storage.')
      return
    }
    const { data } = supabase.storage.from('avatars').getPublicUrl(path)
    await updateProfile({ avatar_url: data.publicUrl + `?t=${Date.now()}` })
    setAvatarSaving(false)
  }

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-1">Account</h2>
        <p className="text-xs text-gray-400 dark:text-gray-500">Manage your name, email, password, and avatar.</p>
      </div>

      {/* Avatar */}
      <div className="flex items-start gap-6">
        <div className="relative flex-shrink-0">
          <Avatar profile={profile} email={user?.email} size="xl" />
          {avatarSaving && (
            <div className="absolute inset-0 rounded-full bg-black/30 flex items-center justify-center">
              <Loader2 size={20} className="text-white animate-spin" />
            </div>
          )}
          <button
            onClick={() => fileRef.current?.click()}
            className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow flex items-center justify-center text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
          >
            <Camera size={13} />
          </button>
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={uploadAvatar} />
        </div>

        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-2">Avatar color</p>
          <div className="flex flex-wrap gap-2">
            {AVATAR_COLORS.map((color) => {
              const active = profile?.avatar_url === `color:${color}`
              return (
                <button
                  key={color}
                  onClick={() => pickAvatarColor(color)}
                  className={`w-7 h-7 rounded-full transition-all ${
                    active ? 'ring-2 ring-offset-2 ring-gray-400 dark:ring-gray-500 scale-110' : 'hover:scale-105'
                  }`}
                  style={{ backgroundColor: color }}
                />
              )
            })}
          </div>
          {avatarError && (
            <p className="text-xs text-rose-500 bg-rose-50 dark:bg-rose-900/20 px-3 py-2 rounded-lg mt-2">{avatarError}</p>
          )}
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">
            Or click the camera to upload a photo.
          </p>
        </div>
      </div>

      {/* Full name */}
      <div>
        <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5">Full name</label>
        <div className="flex gap-2">
          <input
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && saveName()}
            placeholder="Your full name"
            className="input-base flex-1"
          />
          <SaveButton saving={nameSaving} saved={nameSaved} onClick={saveName} />
        </div>
      </div>

      {/* Display name */}
      <div>
        <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5">Display name</label>
        <div className="flex gap-2">
          <input
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && saveDisplayName()}
            placeholder={fullName.split(' ')[0] || 'Nickname for greeting'}
            className="input-base flex-1"
          />
          <SaveButton saving={displayNameSaving} saved={displayNameSaved} onClick={saveDisplayName} />
        </div>
        <p className="text-xs text-gray-400 dark:text-gray-600 mt-1.5">
          Shown in your home greeting. Defaults to your first name.
        </p>
      </div>

      {/* Email */}
      <div>
        <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5">Email</label>
        <div className="flex items-center gap-3">
          <p className="flex-1 text-sm text-gray-700 dark:text-gray-300 truncate">{user?.email}</p>
          <button
            onClick={() => { setShowEmailForm((v) => !v); setEmailMsg('') }}
            className="btn-ghost text-xs"
          >
            Change
          </button>
        </div>
        {showEmailForm && (
          <form onSubmit={changeEmail} className="mt-3 space-y-2">
            <input
              type="email"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              placeholder="New email address"
              required
              autoFocus
              className="input-base"
            />
            {emailMsg && (
              <p className={`text-xs px-3 py-2 rounded-lg ${
                emailMsg.includes('sent') || emailMsg.includes('success')
                  ? 'text-teal-600 dark:text-teal-400 bg-teal-50 dark:bg-teal-900/20'
                  : 'text-rose-500 bg-rose-50 dark:bg-rose-900/20'
              }`}>{emailMsg}</p>
            )}
            <div className="flex gap-2">
              <button type="button" onClick={() => setShowEmailForm(false)} className="btn-ghost text-xs">Cancel</button>
              <button type="submit" disabled={emailSaving} className="btn-primary text-xs disabled:opacity-50">
                {emailSaving ? 'Sending…' : 'Send confirmation'}
              </button>
            </div>
          </form>
        )}
      </div>

      {/* Password */}
      <div>
        <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5">Password</label>
        <button onClick={() => setPasswordModalOpen(true)} className="btn-ghost text-xs">
          Change password
        </button>
      </div>

      {/* Sign out */}
      <div className="pt-2 border-t border-gray-100 dark:border-gray-800">
        <button
          onClick={() => signOut()}
          className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 hover:text-rose-500 dark:hover:text-rose-400 transition-colors"
        >
          <LogOut size={15} />
          Sign out
        </button>
      </div>

      <ChangePasswordModal isOpen={passwordModalOpen} onClose={() => setPasswordModalOpen(false)} />
    </div>
  )
}
