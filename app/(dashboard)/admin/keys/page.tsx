'use client'

import { useState, useEffect } from 'react'
import { getAdminApiKeys, toggleApiKeyStatus, deleteApiKey, ApiKeyData } from '@/app/actions/api-key-actions'
import { KeyRound, ShieldAlert, Loader2, AlertCircle, Eye, Power, Trash2, Search, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { toast } from 'sonner'

export default function AdminApiKeysPage() {
  const [keys, setKeys] = useState<ApiKeyData[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [togglingId, setTogglingId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  useEffect(() => {
    loadKeys()
  }, [])

  async function loadKeys() {
    setLoading(true)
    try {
      const res = await getAdminApiKeys()
      if (res.success && res.data) {
        setKeys(res.data)
      } else {
        toast.error(res.error || 'Failed to retrieve platform API keys.')
      }
    } catch (err) {
      toast.error('Network error loading credentials database.')
    } finally {
      setLoading(false)
    }
  }

  const handleToggleStatus = async (keyId: string, currentStatus: boolean) => {
    setTogglingId(keyId)
    try {
      const res = await toggleApiKeyStatus(keyId, !currentStatus)
      if (res.success) {
        toast.success(`Key status changed to ${!currentStatus ? 'Active' : 'Suspended'}`)
        setKeys(prev => prev.map(k => k.id === keyId ? { ...k, is_active: !currentStatus } : k))
      } else {
        toast.error(res.error || 'Failed to update key status.')
      }
    } catch (err) {
      toast.error('Failed to communicate update.')
    } finally {
      setTogglingId(null)
    }
  }

  const handleDeleteKey = async (keyId: string, clientName: string) => {
    if (!confirm(`Are you sure you want to permanently revoke and delete the API Key for "${clientName}"?`)) {
      return
    }

    setDeletingId(keyId)
    try {
      const res = await deleteApiKey(keyId)
      if (res.success) {
        toast.success('API Key revoked successfully.')
        setKeys(prev => prev.filter(k => k.id !== keyId))
      } else {
        toast.error(res.error || 'Failed to delete key.')
      }
    } catch (err) {
      toast.error('Failed to communicate revocation.')
    } finally {
      setDeletingId(null)
    }
  }

  const filteredKeys = keys.filter(k => 
    k.name.toLowerCase().includes(search.toLowerCase()) || 
    (k.owner_email && k.owner_email.toLowerCase().includes(search.toLowerCase())) ||
    k.tier_name.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="p-6 lg:p-10 max-w-[1400px] mx-auto space-y-10">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between pb-6 border-b border-neutral-800">
        <div className="space-y-2">
          <h1 className="text-3xl font-medium text-white tracking-tight">
            API Key Monitor
          </h1>
          <p className="text-neutral-500 text-[10px] uppercase tracking-[0.2em] font-bold">
            Monitor, suspend, or revoke credentials issued to third-party developers
          </p>
        </div>
      </div>

      {/* Filter / Search bar */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-600" />
        <Input
          placeholder="Search by client, developer email, or tier..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10 bg-neutral-950/40 border-neutral-850 rounded-none h-11 text-white placeholder:text-neutral-600 focus-visible:ring-1 focus-visible:ring-neutral-700"
        />
      </div>

      {loading ? (
        <div className="py-24 flex items-center justify-center">
          <Loader2 className="w-8 h-8 text-neutral-500 animate-spin" />
        </div>
      ) : filteredKeys.length === 0 ? (
        <div className="py-24 text-center border border-dashed border-neutral-800 bg-neutral-900/10 space-y-4">
          <AlertCircle className="w-8 h-8 text-neutral-600 mx-auto animate-pulse" />
          <h4 className="text-sm font-semibold uppercase tracking-widest text-neutral-400">No Keys Found</h4>
          <p className="text-xs text-neutral-500 font-light max-w-sm mx-auto leading-relaxed">
            There are no active or suspended keys matching your search filters in the database.
          </p>
        </div>
      ) : (
        <div className="border border-neutral-900 bg-black/40 overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs select-none">
            <thead>
              <tr className="border-b border-neutral-900 uppercase tracking-widest text-neutral-500 font-bold bg-neutral-950/80">
                <th className="p-4 py-5 font-semibold">Client / Application</th>
                <th className="p-4 py-5 font-semibold">Developer Owner</th>
                <th className="p-4 py-5 font-semibold">Tier</th>
                <th className="p-4 py-5 font-semibold">API Calls Usage</th>
                <th className="p-4 py-5 font-semibold">Last Used</th>
                <th className="p-4 py-5 font-semibold">Status</th>
                <th className="p-4 py-5 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredKeys.map((key) => {
                const callsRatio = Math.min(100, (key.current_period_calls_count / key.included_calls) * 100)

                return (
                  <tr key={key.id} className="border-b border-neutral-900/60 hover:bg-neutral-900/10 transition-colors">
                    <td className="p-4 font-medium text-white py-5">
                      <div className="space-y-0.5">
                        <p className="text-sm">{key.name}</p>
                        <p className="text-[9px] text-neutral-600 font-mono">ID: {key.id}</p>
                      </div>
                    </td>
                    <td className="p-4 text-neutral-300 font-light">{key.owner_email}</td>
                    <td className="p-4 font-bold text-white">
                      <span className={`px-2 py-0.5 text-[9px] uppercase tracking-wider rounded-none font-bold ${
                        key.tier_name === 'Scale' ? 'bg-purple-500/10 border border-purple-500/30 text-purple-400' :
                        key.tier_name === 'Growth' ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-400' :
                        'bg-neutral-800 border border-neutral-700 text-neutral-400'
                      }`}>
                        {key.tier_name}
                      </span>
                    </td>
                    <td className="p-4 py-5">
                      <div className="space-y-1.5 w-40">
                        <div className="flex justify-between text-[10px] text-neutral-400 font-semibold font-mono">
                          <span>{key.current_period_calls_count}</span>
                          <span className="text-neutral-600">/ {key.included_calls}</span>
                        </div>
                        <div className="h-1 bg-neutral-900 overflow-hidden">
                          <div 
                            className={`h-full ${callsRatio >= 90 ? 'bg-red-500' : callsRatio >= 75 ? 'bg-amber-500' : 'bg-white'}`}
                            style={{ width: `${callsRatio}%` }}
                          />
                        </div>
                      </div>
                    </td>
                    <td className="p-4 text-neutral-500 font-light">
                      {key.last_used_at ? new Date(key.last_used_at).toLocaleDateString() : 'Never'}
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-1.5">
                        <div className={`w-1.5 h-1.5 rounded-full ${key.is_active ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.4)]' : 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.4)]'}`} />
                        <span className={`text-[10px] font-bold uppercase tracking-wider ${key.is_active ? 'text-emerald-400' : 'text-red-500'}`}>
                          {key.is_active ? 'Active' : 'Suspended'}
                        </span>
                      </div>
                    </td>
                    <td className="p-4 text-right">
                      <div className="flex justify-end gap-1">
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => handleToggleStatus(key.id, key.is_active)}
                          disabled={togglingId === key.id}
                          className={`h-8 w-8 rounded-none border border-neutral-900 hover:bg-neutral-900/50 ${key.is_active ? 'text-amber-500 hover:text-amber-400' : 'text-emerald-500 hover:text-emerald-400'}`}
                          title={key.is_active ? 'Deactivate Key' : 'Activate Key'}
                        >
                          {togglingId === key.id ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <Power className="w-3.5 h-3.5" />
                          )}
                        </Button>

                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => handleDeleteKey(key.id, key.name)}
                          disabled={deletingId === key.id}
                          className="h-8 w-8 text-neutral-600 hover:text-red-500 hover:bg-red-500/10 rounded-none border border-neutral-900"
                          title="Revoke Key"
                        >
                          {deletingId === key.id ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <Trash2 className="w-3.5 h-3.5" />
                          )}
                        </Button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
