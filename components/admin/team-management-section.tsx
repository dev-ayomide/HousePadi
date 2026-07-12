'use client'

import { useEffect, useState, useCallback } from 'react'
import { 
  Plus, 
  GripVertical,
  Pencil,
  Trash2,
  Eye,
  EyeOff,
  Loader2,
  RefreshCw,
  Image as ImageIcon,
  ChevronUp,
  ChevronDown
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { 
  getTeamMembers, 
  toggleTeamMemberVisibility, 
  deleteTeamMember,
  reorderTeamMembers,
  TeamMember 
} from '@/app/actions/about-actions'
import { deleteFile } from '@/lib/supabase/storage-utils'
import { useToast } from '@/components/ui/use-toast'
import { TeamMemberModal } from '@/components/modals/team-member-modal'
import Image from 'next/image'

export function TeamManagementSection() {
  const [members, setMembers] = useState<TeamMember[]>([])
  const [loading, setLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [selectedMember, setSelectedMember] = useState<TeamMember | undefined>()
  const { toast } = useToast()

  const fetchMembers = useCallback(async () => {
    setLoading(true)
    const result = await getTeamMembers()
    if (result.success && result.data) {
      setMembers(result.data)
    } else {
      toast({ 
        title: "Sync Error", 
        description: "Failed to fetch team members from database.",
        variant: "destructive"
      })
    }
    setLoading(false)
  }, [toast])

  useEffect(() => {
    fetchMembers()
  }, [fetchMembers])

  const handleMove = async (index: number, direction: 'up' | 'down') => {
    const newMembers = [...members]
    const targetIndex = direction === 'up' ? index - 1 : index + 1
    
    if (targetIndex < 0 || targetIndex >= newMembers.length) return

    // Swap positions
    const [movedItem] = newMembers.splice(index, 1)
    newMembers.splice(targetIndex, 0, movedItem)

    // Update local state immediately for snappy UX
    setMembers(newMembers)

    // Prepare batch update for database
    const orders = newMembers.map((m, i) => ({
      id: m.id,
      display_order: i
    }))

    const result = await reorderTeamMembers(orders)
    if (!result.success) {
      toast({ 
        title: "Reorder Failed", 
        description: result.error, 
        variant: "destructive" 
      })
      fetchMembers() // Revert on failure
    }
  }

  const handleToggleVisibility = async (id: string, currentStatus: boolean) => {
    const result = await toggleTeamMemberVisibility(id, currentStatus)
    if (result.success) {
      setMembers(prev => prev.map(m => 
        m.id === id ? { ...m, is_visible: !currentStatus } : m
      ))
      toast({ title: "Visibility Updated" })
    }
  }

  const handleDelete = async (id: string) => {
    const memberToDelete = members.find(m => m.id === id)
    if (!memberToDelete) return

    if (!confirm(`Are you sure you want to remove ${memberToDelete.name}?`)) return
    
    // Delete from Storage if image exists
    if (memberToDelete.image_url) {
      await deleteFile(memberToDelete.image_url)
    }

    const result = await deleteTeamMember(id)
    if (result.success) {
      setMembers(prev => prev.filter(m => m.id !== id))
      toast({ title: "Team Member Removed" })
    }
  }

  const openAddModal = () => {
    setSelectedMember(undefined)
    setIsModalOpen(true)
  }

  const openEditModal = (member: TeamMember) => {
    setSelectedMember(member)
    setIsModalOpen(true)
  }

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center justify-between border-b border-neutral-800 pb-4">
        <div className="space-y-1">
          <h2 className="text-xl font-light text-white">Team Roster</h2>
          <p className="text-xs text-neutral-500">Manage individuals appearing on the About page.</p>
        </div>
        <div className="flex items-center gap-3">
          <Button 
            variant="ghost"
            size="icon"
            onClick={fetchMembers}
            className="text-neutral-500 hover:text-white"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
          <Button 
            onClick={openAddModal}
            className="bg-white text-black hover:bg-neutral-200 rounded-none h-10 px-4 text-[10px] font-bold uppercase tracking-widest transition-all"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Member
          </Button>
        </div>
      </div>

      <div className="space-y-4 relative min-h-[200px]">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <Loader2 className="w-6 h-6 text-neutral-500 animate-spin mb-4" />
            <p className="text-[10px] uppercase tracking-[0.2em] font-bold text-neutral-600">Syncing Roster...</p>
          </div>
        ) : members.length > 0 ? (
          <div className="grid grid-cols-1 gap-4">
            {members.map((member, index) => (
              <div 
                key={member.id} 
                className={`group relative flex items-center gap-4 p-4 border transition-all duration-300 ${
                  member.is_visible ? 'bg-neutral-900/20 border-neutral-800 hover:border-neutral-700' : 'bg-black border-neutral-900 opacity-50 hover:opacity-100'
                }`}
              >
                <div className="flex flex-col gap-0.5">
                  <button 
                    onClick={() => handleMove(index, 'up')}
                    disabled={index === 0}
                    className="p-1 text-neutral-700 hover:text-white disabled:opacity-0 transition-all"
                  >
                    <ChevronUp className="w-4 h-4" />
                  </button>
                  <button 
                    onClick={() => handleMove(index, 'down')}
                    disabled={index === members.length - 1}
                    className="p-1 text-neutral-700 hover:text-white disabled:opacity-0 transition-all"
                  >
                    <ChevronDown className="w-4 h-4" />
                  </button>
                </div>

                <div className="w-12 h-16 bg-neutral-900 border border-neutral-800 shrink-0 relative overflow-hidden flex items-center justify-center">
                  {member.image_url ? (
                    <Image src={member.image_url} alt={member.name} fill className="object-cover grayscale group-hover:grayscale-0 transition-all" />
                  ) : (
                    <ImageIcon className="w-4 h-4 text-neutral-700" />
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-medium text-white truncate">{member.name}</h3>
                  <p className="text-[10px] text-neutral-500 uppercase tracking-widest truncate">{member.role}</p>
                </div>
                
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button 
                    variant="ghost" 
                    size="icon"
                    onClick={() => handleToggleVisibility(member.id, member.is_visible)}
                    className="h-8 w-8 text-neutral-500 hover:text-white"
                  >
                    {member.is_visible ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="icon"
                    onClick={() => openEditModal(member)}
                    className="h-8 w-8 text-neutral-500 hover:text-white"
                  >
                    <Pencil className="w-4 h-4" />
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="icon"
                    onClick={() => handleDelete(member.id)}
                    className="h-8 w-8 text-neutral-500 hover:text-red-500"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="py-20 text-center border border-dashed border-neutral-800">
            <p className="text-neutral-600 text-xs italic tracking-wider">No team members architected yet.</p>
          </div>
        )}
      </div>

      <TeamMemberModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        member={selectedMember}
        onSuccess={fetchMembers}
      />
    </div>
  )
}
