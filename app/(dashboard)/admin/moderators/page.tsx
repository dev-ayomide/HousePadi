'use client'

import { useEffect, useState, useCallback } from 'react'
import { 
  Search, 
  UserCircle,
  CheckCircle2,
  MoreHorizontal,
  Loader2,
  Ban,
  Trash2,
  ShieldCheck,
  ShieldAlert,
  Plus,
  Mail,
  User,
  Copy,
  Check
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog'
import { useToast } from '@/components/ui/use-toast'
import { 
  getModerators, 
  toggleModeratorApproval, 
  toggleModeratorSuspension, 
  deleteModerator,
  addModerator,
  ModeratorData 
} from '@/app/actions/moderator-actions'

export default function ModeratorManagementPage() {
  const [moderators, setModerators] = useState<ModeratorData[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [newMod, setNewMod] = useState({ full_name: '', email: '' })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [generatedPassword, setGeneratedPassword] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const { toast } = useToast()

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text)
    setCopied(true)
    toast({ title: "Copied", description: "Password saved to clipboard." })
    setTimeout(() => setCopied(false), 2000)
  }

  const fetchModerators = useCallback(async () => {
    setLoading(true)
    const result = await getModerators()
    if (result.success) {
      setModerators(result.data || [])
    } else {
      toast({ title: "Fetch Failed", description: result.error, variant: "destructive" })
    }
    setLoading(false)
  }, [toast])

  useEffect(() => {
    fetchModerators()
  }, [fetchModerators])

  const handleToggleApproval = async (id: string, name: string, currentStatus: boolean) => {
    const result = await toggleModeratorApproval(id, currentStatus)
    if (result.success) {
      setModerators(moderators.map(m => m.id === id ? { ...m, is_approved: result.newStatus } : m))
      toast({ 
        title: result.newStatus ? "Moderator Approved" : "Approval Revoked", 
        description: `${name}'s access status has been updated.` 
      })
    } else {
      toast({ title: "Operation Failed", description: result.error, variant: "destructive" })
    }
  }

  const handleToggleSuspension = async (id: string, name: string, currentStatus: boolean) => {
    const result = await toggleModeratorSuspension(id, currentStatus)
    if (result.success) {
      setModerators(moderators.map(m => m.id === id ? { ...m, suspended: result.newStatus } : m))
      toast({ 
        title: result.newStatus ? "Moderator Suspended" : "Moderator Reactivated", 
        description: `${name}'s system status has been updated.` 
      })
    } else {
      toast({ title: "Operation Failed", description: result.error, variant: "destructive" })
    }
  }

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to PERMANENTLY remove ${name}?`)) return;
    
    const result = await deleteModerator(id)
    if (result.success) {
      setModerators(moderators.filter(m => m.id !== id))
      toast({ title: "Moderator Removed", description: `${name} has been deleted from the platform.` })
    } else {
      toast({ title: "Deletion Failed", description: result.error, variant: "destructive" })
    }
  }

  const handleAddModerator = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    const result = await addModerator(newMod)
    if (result.success) {
      setGeneratedPassword(result.password || null)
      toast({ title: "Moderator Provisioned", description: "Security credentials have been generated." })
      fetchModerators()
    } else {
      toast({ title: "Creation Failed", description: result.error, variant: "destructive" })
    }
    setIsSubmitting(false)
  }

  const resetAddDialog = () => {
    setIsAddDialogOpen(false)
    setGeneratedPassword(null)
    setNewMod({ full_name: '', email: '' })
  }

  const filteredModerators = moderators.filter(mod => 
    (mod.full_name?.toLowerCase() || '').includes(searchQuery.toLowerCase()) ||
    mod.email.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <div className="p-6 lg:p-10 max-w-[1400px] mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="space-y-2">
          <h1 className="text-3xl font-medium text-white tracking-tight">System Moderators</h1>
          <p className="text-neutral-500 text-[10px] uppercase tracking-[0.2em] font-bold">
            Internal Governance & Access Control
          </p>
        </div>

        <Dialog open={isAddDialogOpen} onOpenChange={(open) => !open && resetAddDialog()}>
          <DialogTrigger asChild>
            <Button onClick={() => setIsAddDialogOpen(true)} className="bg-white text-black hover:bg-neutral-200 rounded-none h-12 px-6 text-xs font-bold uppercase tracking-widest transition-all">
              <Plus className="w-4 h-4 mr-2" />
              Add Moderator
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-black border-neutral-800 text-white rounded-none max-w-md">
            <DialogHeader>
              <DialogTitle className="text-xl font-light tracking-tight">
                {generatedPassword ? 'Provisioning Complete' : 'Provision New Moderator'}
              </DialogTitle>
              <DialogDescription className="text-neutral-500 text-xs uppercase tracking-widest mt-2">
                {generatedPassword ? 'Secure these credentials immediately.' : 'Create an internal administrative profile.'}
              </DialogDescription>
            </DialogHeader>

            {generatedPassword !== null ? (
              <div className="space-y-8 py-6">
                <div className="bg-emerald-950/10 border border-emerald-900/30 p-6 space-y-6">
                  <div className="flex items-center gap-3 text-emerald-500">
                    <CheckCircle2 className="w-5 h-5" />
                    <span className="text-[10px] uppercase tracking-widest font-bold">Registry Updated</span>
                  </div>
                  
                  <div className="space-y-3">
                    <label className="text-[10px] uppercase tracking-[0.2em] text-neutral-500 font-bold">Temporary Credentials</label>
                    <div className="flex flex-col gap-3">
                      <div className="bg-black border border-neutral-800 px-5 py-4 font-mono text-white text-xl tracking-[0.2em] text-center select-all">
                        {generatedPassword}
                      </div>
                      <Button 
                        onClick={() => generatedPassword && handleCopy(generatedPassword)}
                        variant="outline" 
                        className="w-full border-neutral-700 bg-neutral-900 hover:bg-white hover:text-black rounded-none h-12 text-[10px] uppercase tracking-widest font-bold transition-all"
                      >
                        {copied ? <Check className="w-4 h-4 mr-2 text-emerald-500" /> : <Copy className="w-4 h-4 mr-2" />}
                        {copied ? 'Successfully Copied' : 'Copy Credentials'}
                      </Button>
                    </div>
                  </div>
                </div>

                <div className="p-4 border border-neutral-900 bg-neutral-900/20 text-[10px] text-neutral-500 uppercase tracking-widest leading-relaxed text-center">
                  Notice: This key is ephemeral and will not be displayed again.
                </div>

                <Button 
                  onClick={resetAddDialog}
                  className="w-full bg-white text-black hover:bg-neutral-200 rounded-none h-12 text-xs font-bold uppercase tracking-widest transition-all"
                >
                  Finalize Provisioning
                </Button>
              </div>
            ) : (
              <form onSubmit={handleAddModerator} className="space-y-6 py-6">
                <div className="space-y-2">
                  <label className="text-[10px] uppercase tracking-[0.2em] text-neutral-500 font-bold">Full Name</label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-600" />
                    <Input 
                      required
                      placeholder="Enter full name"
                      value={newMod.full_name}
                      onChange={(e) => setNewMod({ ...newMod, full_name: e.target.value })}
                      className="pl-10 rounded-none bg-neutral-900/50 border-neutral-800 text-white h-12 focus-visible:ring-1 focus-visible:ring-neutral-700"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] uppercase tracking-[0.2em] text-neutral-500 font-bold">Email Address</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-600" />
                    <Input 
                      required
                      type="email"
                      placeholder="moderator@housepadi.example"
                      value={newMod.email}
                      onChange={(e) => setNewMod({ ...newMod, email: e.target.value })}
                      className="pl-10 rounded-none bg-neutral-900/50 border-neutral-800 text-white h-12 focus-visible:ring-1 focus-visible:ring-neutral-700"
                    />
                  </div>
                </div>
                <DialogFooter className="pt-4">
                  <Button 
                    type="submit" 
                    disabled={isSubmitting}
                    className="w-full bg-white text-black hover:bg-neutral-200 rounded-none h-12 text-xs font-bold uppercase tracking-widest transition-all"
                  >
                    {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Provision Profile'}
                  </Button>
                </DialogFooter>
              </form>
            )}
          </DialogContent>
        </Dialog>
      </div>

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4 bg-neutral-900/40 p-4 border border-neutral-800">
        <div className="relative w-full sm:w-96">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500" />
          <Input 
            placeholder="Search moderators..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 bg-black border-neutral-800 text-white placeholder:text-neutral-600 rounded-none h-10 focus-visible:ring-1 focus-visible:ring-neutral-700"
          />
        </div>
      </div>

      {/* Data Table */}
      <div className="border border-neutral-800 bg-neutral-900/20 overflow-hidden min-h-[400px] relative">
        {loading ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/20 backdrop-blur-sm z-10">
            <Loader2 className="w-8 h-8 text-white animate-spin mb-4" />
            <p className="text-[10px] uppercase tracking-[0.2em] font-bold text-neutral-500">Scanning Registry...</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-neutral-800 bg-black/50">
                  <th className="p-4 text-[10px] font-bold uppercase tracking-[0.2em] text-neutral-500">Moderator Details</th>
                  <th className="p-4 text-[10px] font-bold uppercase tracking-[0.2em] text-neutral-500">Access Rights</th>
                  <th className="p-4 text-[10px] font-bold uppercase tracking-[0.2em] text-neutral-500">System Status</th>
                  <th className="p-4 text-[10px] font-bold uppercase tracking-[0.2em] text-neutral-500">Created</th>
                  <th className="p-4 text-[10px] font-bold uppercase tracking-[0.2em] text-neutral-500 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-800/50">
                {filteredModerators.length > 0 ? (
                  filteredModerators.map((mod) => (
                    <tr key={mod.id} className="hover:bg-neutral-900/40 transition-colors group">
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-neutral-800 flex items-center justify-center border border-neutral-700">
                            <UserCircle className="w-5 h-5 text-neutral-400" />
                          </div>
                          <div>
                            <p className="text-sm font-medium text-white">{mod.full_name || 'Unnamed Moderator'}</p>
                            <p className="text-xs text-neutral-500">{mod.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          {mod.is_approved ? (
                            <div className="flex items-center gap-2 text-emerald-500">
                              <ShieldCheck className="w-4 h-4" />
                              <span className="text-xs uppercase tracking-wider font-bold">Approved</span>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2 text-amber-500">
                              <ShieldAlert className="w-4 h-4" />
                              <span className="text-xs uppercase tracking-wider font-bold">Pending</span>
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          {mod.suspended ? (
                            <div className="flex items-center gap-2 text-red-500">
                              <Ban className="w-4 h-4" />
                              <span className="text-xs uppercase tracking-wider font-bold">Suspended</span>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2 text-neutral-400">
                              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                              <span className="text-xs uppercase tracking-wider font-bold">Active</span>
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="p-4 text-xs text-neutral-500 font-mono">
                        {new Date(mod.created_at).toLocaleDateString()}
                      </td>
                      <td className="p-4 text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0 hover:bg-neutral-800 rounded-none text-neutral-400 hover:text-white">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-56 bg-black border-neutral-800 rounded-none">
                            <DropdownMenuItem 
                              onClick={() => handleToggleApproval(mod.id, mod.full_name || 'Moderator', mod.is_approved)}
                              className={`flex items-center gap-2 text-xs uppercase tracking-wider font-medium cursor-pointer rounded-none ${mod.is_approved ? 'text-amber-500 focus:bg-amber-950/30' : 'text-emerald-500 focus:bg-emerald-950/30'}`}
                            >
                              <ShieldCheck className="w-3 h-3" /> {mod.is_approved ? 'Revoke Approval' : 'Grant Approval'}
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              onClick={() => handleToggleSuspension(mod.id, mod.full_name || 'Moderator', mod.suspended)}
                              className={`flex items-center gap-2 text-xs uppercase tracking-wider font-medium cursor-pointer rounded-none border-t border-neutral-900 mt-2 pt-2 ${mod.suspended ? 'text-emerald-500 focus:bg-emerald-950/30' : 'text-orange-500 focus:bg-orange-950/30'}`}
                            >
                              <Ban className="w-3 h-3" /> {mod.suspended ? 'Reactivate Mod' : 'Suspend Mod'}
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              onClick={() => handleDelete(mod.id, mod.full_name || 'Moderator')}
                              className="flex items-center gap-2 text-xs uppercase tracking-wider font-medium text-red-500 focus:bg-red-950 focus:text-red-400 cursor-pointer rounded-none border-t border-neutral-900 mt-2 pt-2"
                            >
                              <Trash2 className="w-3 h-3" /> Delete Permanent
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="p-20 text-center">
                      <p className="text-neutral-500 text-sm italic">No moderators found in the registry.</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
