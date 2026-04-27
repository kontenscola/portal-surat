'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function LoginForm() {
  const router = useRouter()
  const [showAdminForm, setShowAdminForm] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Siswa form state
  const [nis, setNis] = useState('')
  const [password, setPassword] = useState('')

  // Admin form state
  const [adminUsername, setAdminUsername] = useState('')
  const [adminPassword, setAdminPassword] = useState('')

  const handleSiswaSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!nis.trim() || !password) {
      setError('NIS dan Password wajib diisi')
      return
    }

    setIsLoading(true)
    try {
      const res = await fetch('/api/auth/login-siswa', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nis: nis.trim(), password }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error ?? 'NIS atau password tidak sesuai.')
        return
      }

      router.push('/surat-saya')
      router.refresh()
    } catch {
      setError('Terjadi kesalahan. Silakan coba lagi.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleAdminSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!adminUsername.trim() || !adminPassword) {
      setError('Username dan Password wajib diisi')
      return
    }

    setIsLoading(true)
    try {
      const res = await fetch('/api/auth/login-admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: adminUsername.trim(), password: adminPassword }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error ?? 'Username atau password salah.')
        return
      }

      router.push('/admin')
      router.refresh()
    } catch {
      setError('Terjadi kesalahan. Silakan coba lagi.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="w-full max-w-sm">
      {/* Logo */}
      <div className="flex flex-col items-center mb-6">
        <div className="relative mb-4">
          <div className="absolute -top-2 -right-2 w-16 h-16 rounded-full bg-purple-100 opacity-60" />
          <img
            src="/logo-sekolah.png"
            alt="Logo SMA Antartika"
            className="relative z-10 w-16 h-16 object-contain"
          />
        </div>
        <span className="inline-flex items-center gap-1.5 rounded-full border border-purple-300 bg-purple-50 px-3 py-1 text-xs font-medium text-purple-700 mb-4">
          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
            <path d="M10.394 2.08a1 1 0 00-.788 0l-7 3a1 1 0 000 1.84L5.25 8.051a.999.999 0 01.356-.257l4-1.714a1 1 0 11.788 1.838L7.667 9.088l1.94.831a1 1 0 00.787 0l7-3a1 1 0 000-1.838l-7-3zM3.31 9.397L5 10.12v4.102a8.969 8.969 0 00-1.05-.174 1 1 0 01-.89-.89 11.115 11.115 0 01.25-3.762zM9.3 16.573A9.026 9.026 0 007 14.935v-3.957l1.818.78a3 3 0 002.364 0l5.508-2.361a11.026 11.026 0 01.25 3.762 1 1 0 01-.89.89 8.968 8.968 0 00-5.35 2.524 1 1 0 01-1.4 0zM6 18a1 1 0 001-1v-2.065a8.935 8.935 0 00-2-.712V17a1 1 0 001 1z" />
          </svg>
          PORTAL SEKOLAH · AKSES SURAT
        </span>
      </div>

      {/* Card */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
        {!showAdminForm ? (
          <>
            <h1 className="text-2xl font-bold text-gray-900 mb-1">Selamat Datang</h1>
            <p className="text-sm text-gray-500 mb-6">Masuk untuk mengakses surat dan dokumen sekolah</p>

            {error && (
              <div className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700 border border-red-100">
                {error}
              </div>
            )}

            <form onSubmit={handleSiswaSubmit} noValidate className="space-y-4">
              <div>
                <label htmlFor="nis" className="block text-sm font-medium text-gray-700 mb-1">
                  NIS (Nomor Induk Siswa) <span className="text-red-500">*</span>
                </label>
                <input
                  id="nis"
                  type="text"
                  value={nis}
                  onChange={(e) => setNis(e.target.value)}
                  placeholder="Masukkan NIS kamu"
                  disabled={isLoading}
                  className="w-full rounded-lg border border-gray-200 px-4 py-2.5 text-sm placeholder-gray-400 focus:border-purple-400 focus:outline-none focus:ring-2 focus:ring-purple-100 disabled:bg-gray-50"
                />
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                  Password <span className="text-red-500">*</span>
                </label>
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Masukkan password kamu"
                  disabled={isLoading}
                  className="w-full rounded-lg border border-gray-200 px-4 py-2.5 text-sm placeholder-gray-400 focus:border-purple-400 focus:outline-none focus:ring-2 focus:ring-purple-100 disabled:bg-gray-50"
                />
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full rounded-lg bg-purple-700 py-2.5 text-sm font-semibold text-white hover:bg-purple-800 transition-colors focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {isLoading ? 'Memproses...' : 'Masuk →'}
              </button>
            </form>

            <div className="mt-4 text-center">
              <button
                type="button"
                onClick={() => { setShowAdminForm(true); setError(null) }}
                className="text-sm text-gray-500 hover:text-purple-700 transition-colors"
              >
                Admin? Masuk di sini
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="flex items-center gap-2 mb-6">
              <button
                type="button"
                onClick={() => { setShowAdminForm(false); setError(null) }}
                className="text-gray-400 hover:text-gray-600 transition-colors"
                aria-label="Kembali"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <h1 className="text-xl font-bold text-gray-900">Login Admin</h1>
            </div>

            {error && (
              <div className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700 border border-red-100">
                {error}
              </div>
            )}

            <form onSubmit={handleAdminSubmit} noValidate className="space-y-4">
              <div>
                <label htmlFor="admin-username" className="block text-sm font-medium text-gray-700 mb-1">
                  Username / Email
                </label>
                <input
                  id="admin-username"
                  type="text"
                  value={adminUsername}
                  onChange={(e) => setAdminUsername(e.target.value)}
                  placeholder="Masukkan username"
                  disabled={isLoading}
                  className="w-full rounded-lg border border-gray-200 px-4 py-2.5 text-sm placeholder-gray-400 focus:border-purple-400 focus:outline-none focus:ring-2 focus:ring-purple-100 disabled:bg-gray-50"
                />
              </div>

              <div>
                <label htmlFor="admin-password" className="block text-sm font-medium text-gray-700 mb-1">
                  Password
                </label>
                <input
                  id="admin-password"
                  type="password"
                  value={adminPassword}
                  onChange={(e) => setAdminPassword(e.target.value)}
                  placeholder="Masukkan password"
                  disabled={isLoading}
                  className="w-full rounded-lg border border-gray-200 px-4 py-2.5 text-sm placeholder-gray-400 focus:border-purple-400 focus:outline-none focus:ring-2 focus:ring-purple-100 disabled:bg-gray-50"
                />
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full rounded-lg bg-purple-700 py-2.5 text-sm font-semibold text-white hover:bg-purple-800 transition-colors focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {isLoading ? 'Memproses...' : 'Masuk →'}
              </button>
            </form>
          </>
        )}
      </div>

      {/* Footer */}
      <div className="mt-6 text-center">
        <p className="text-xs text-gray-400">SMA Antartika Sidoharjo · Portal Surat &amp; Dokumen</p>
        <p className="text-xs text-gray-400">© 2025 · All rights reserved</p>
      </div>
    </div>
  )
}
