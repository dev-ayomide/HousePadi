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
  Image as ImageIcon
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { 
  getTeamMembers, 
  toggleTeamMemberVisibility, 
  deleteTeamMember,
  TeamMember 
} from '@/app/actions/about-actions'
import { useToast } from '@/components/ui/use-toast'
import { TeamMemberModal } from '@/components/modals/team-member-modal'
import Image from 'next/image'

export default function TeamCMSPage() {
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
    if (!confirm("Are you sure you want to remove this team member?")) return
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
    <div className="p-10 max-w-[1000px] mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-6 border-b border-neutral-800">
        <div className="space-y-2">
          <h1 className="text-3xl font-medium text-white tracking-tight">Team Management</h1>
          <p className="text-neutral-500 text-[10px] uppercase tracking-[0.2em] font-bold">
            Public Website Roster Control
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          <Button 
            variant="outline"
            onClick={fetchMembers}
            className="border-neutral-800 bg-transparent text-neutral-400 hover:text-white hover:bg-neutral-800 rounded-none h-12 px-4 uppercase tracking-widest text-[10px]"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Sync DB
          </Button>
          <Button 
            onClick={openAddModal}
            className="bg-white text-black hover:bg-neutral-200 rounded-none h-12 px-6 text-xs font-bold uppercase tracking-widest transition-all"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Member
          </Button>
        </div>
      </div>

      {/* CMS List */}
      <div className="space-y-4 relative min-h-[300px]">
        {loading ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/20 backdrop-blur-sm z-10">
            <Loader2 className="w-8 h-8 text-white animate-spin mb-4" />
            <p className="text-[10px] uppercase tracking-[0.2em] font-bold text-neutral-500">Syncing with Cloud...</p>
          </div>
        ) : members.length > 0 ? (
          members.map((member) => (
            <div 
              key={member.id} 
              className={`group relative flex items-start gap-6 p-6 border transition-all duration-300 ${
                member.is_visible ? 'bg-neutral-900/40 border-neutral-800 hover:border-neutral-600' : 'bg-black border-neutral-900 opacity-60 hover:opacity-100'
              }`}
            >
              <div className="mt-1 cursor-grab active:cursor-grabbing text-neutral-600 hover:text-white">
                <GripVertical className="w-5 h-5" />
              </div>

              {/* Profile Image Thumbnail */}
              <div className="w-16 h-16 bg-neutral-900 border border-neutral-800 shrink-0 relative overflow-hidden flex items-center justify-center">
                {member.image_url ? (
                  <Image src={member.image_url} alt={member.name} fill className="object-cover" />
                ) : (
                  <ImageIcon className="w-6 h-6 text-neutral-600" />
                )}
              </div>

              <div className="flex-1 space-y-2">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-lg font-medium text-white">{member.name}</h3>
                    <p className="text-xs text-neutral-400 mt-1">
                      {member.role} {member.handle && <span className="text-neutral-600 ml-2">{member.handle}</span>}
                    </p>
                  </div>
                  
                  <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button 
                      variant="ghost" 
                      size="icon"
                      onClick={() => handleToggleVisibility(member.id, member.is_visible)}
                      className="h-8 w-8 text-neutral-400 hover:text-white hover:bg-neutral-800 rounded-none"
                      title={member.is_visible ? "Hide from website" : "Show on website"}
                    >
                      {member.is_visible ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="icon"
                      onClick={() => openEditModal(member)}
                      className="h-8 w-8 text-neutral-400 hover:text-white hover:bg-neutral-800 rounded-none"
                    >
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="icon"
                      onClick={() => handleDelete(member.id)}
                      className="h-8 w-8 text-neutral-400 hover:text-red-500 hover:bg-red-950/30 rounded-none"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                <p className="text-sm text-neutral-500 italic max-w-2xl line-clamp-1">
                  {member.about}
                </p>
                
                <div className="flex items-center gap-2 pt-2">
                  <span className={`text-[10px] uppercase tracking-widest font-bold px-2 py-1 ${
                    member.is_visible ? 'bg-emerald-950/30 text-emerald-500 border border-emerald-900/50' : 'bg-neutral-900 text-neutral-500 border border-neutral-800'
                  }`}>
                    {member.is_visible ? 'Live on site' : 'Hidden'}
                  </span>
                  {member.status && (
                    <span className="text-[10px] uppercase tracking-widest font-bold px-2 py-1 bg-neutral-900 text-neutral-400 border border-neutral-800">
                      Status: {member.status}
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="p-20 text-center border border-dashed border-neutral-800">
            <p className="text-neutral-500 text-sm italic">No team members found in database.</p>
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
