'use client'

import { useEffect, useState, useCallback } from 'react'
import { 
  Mail, 
  User, 
  Calendar, 
  MessageSquare, 
  CheckCircle2, 
  Trash2, 
  Loader2,
  Clock,
  ChevronRight,
  Inbox
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useToast } from '@/components/ui/use-toast'
import { 
  getContactSubmissions, 
  markAsRead, 
  deleteSubmission 
} from '@/app/actions/contact-actions'
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

interface Submission {
  id: string
  full_name: string
  email: string
  subject: string
  message: string
  is_read: boolean
  created_at: string
}

export default function ContactSubmissionsPage() {
  const [submissions, setSubmissions] = useState<Submission[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const { toast } = useToast()

  const fetchSubmissions = useCallback(async () => {
    setLoading(true)
    const result = await getContactSubmissions()
    if (result.success) {
      setSubmissions(result.data || [])
    } else {
      toast({ title: "Fetch Failed", description: result.error, variant: "destructive" })
    }
    setLoading(false)
  }, [toast])

  useEffect(() => {
    fetchSubmissions()
  }, [fetchSubmissions])

  const handleMarkAsRead = async (id: string) => {
    const result = await markAsRead(id)
    if (result.success) {
      setSubmissions(submissions.map(s => s.id === id ? { ...s, is_read: true } : s))
      toast({ title: "Updated", description: "Message marked as read." })
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Permanently delete this inquiry?')) return
    const result = await deleteSubmission(id)
    if (result.success) {
      setSubmissions(submissions.filter(s => s.id !== id))
      setSelectedId(null)
      toast({ title: "Deleted", description: "Inquiry removed from system." })
    }
  }

  const selectedSubmission = submissions.find(s => s.id === selectedId)

  const unreadCount = submissions.filter(s => !s.is_read).length

  return (
    <div className="p-6 lg:p-10 max-w-[1400px] mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="space-y-2">
          <h1 className="text-3xl font-medium text-white tracking-tight">Portal Inquiries</h1>
          <p className="text-neutral-500 text-[10px] uppercase tracking-[0.2em] font-bold">
            Public Outreach & Client Communication
          </p>
        </div>
      </div>

      <Tabs defaultValue="all" className="w-full">
        <div className="flex items-center justify-between border-b border-neutral-800 pb-4">
          <TabsList className="bg-transparent h-auto p-0 gap-8">
            <TabsTrigger 
              value="all" 
              className="bg-transparent p-0 rounded-none border-b-2 border-transparent data-[state=active]:border-white data-[state=active]:text-white text-neutral-500 text-xs font-bold uppercase tracking-widest pb-4 transition-all"
            >
              All Inquiries ({submissions.length})
            </TabsTrigger>
            <TabsTrigger 
              value="unread" 
              className="bg-transparent p-0 rounded-none border-b-2 border-transparent data-[state=active]:border-white data-[state=active]:text-white text-neutral-500 text-xs font-bold uppercase tracking-widest pb-4 transition-all"
            >
              Unread {unreadCount > 0 && <span className="ml-2 px-1.5 py-0.5 bg-white text-black text-[10px] rounded-full">{unreadCount}</span>}
            </TabsTrigger>
            <TabsTrigger 
              value="read" 
              className="bg-transparent p-0 rounded-none border-b-2 border-transparent data-[state=active]:border-white data-[state=active]:text-white text-neutral-500 text-xs font-bold uppercase tracking-widest pb-4 transition-all"
            >
              Archived
            </TabsTrigger>
            <TabsTrigger 
              value="custom-plans" 
              className="bg-transparent p-0 rounded-none border-b-2 border-transparent data-[state=active]:border-white data-[state=active]:text-white text-neutral-500 text-xs font-bold uppercase tracking-widest pb-4 transition-all"
            >
              Custom Plans Request
            </TabsTrigger>
            <TabsTrigger 
              value="careers" 
              className="bg-transparent p-0 rounded-none border-b-2 border-transparent data-[state=active]:border-white data-[state=active]:text-white text-neutral-500 text-xs font-bold uppercase tracking-widest pb-4 transition-all"
            >
              Careers
            </TabsTrigger>
          </TabsList>
          
          <Button 
            onClick={fetchSubmissions}
            variant="ghost" 
            className="text-[10px] uppercase tracking-widest text-neutral-500 hover:text-white"
          >
            {loading ? <Loader2 className="w-3 h-3 animate-spin mr-2" /> : <Clock className="w-3 h-3 mr-2" />}
            Refresh Registry
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 mt-8">
          {/* List Section */}
          <div className="lg:col-span-4 space-y-4">
            <TabsContent value="all" className="mt-0">
              <SubmissionList 
                items={submissions} 
                onSelect={setSelectedId} 
                selectedId={selectedId} 
              />
            </TabsContent>
            <TabsContent value="unread" className="mt-0">
              <SubmissionList 
                items={submissions.filter(s => !s.is_read)} 
                onSelect={setSelectedId} 
                selectedId={selectedId} 
              />
            </TabsContent>
            <TabsContent value="read" className="mt-0">
              <SubmissionList 
                items={submissions.filter(s => s.is_read)} 
                onSelect={setSelectedId} 
                selectedId={selectedId} 
              />
            </TabsContent>
            <TabsContent value="custom-plans" className="mt-0">
              <SubmissionList 
                items={submissions.filter(s => s.subject === 'Custom Plan Request')} 
                onSelect={setSelectedId} 
                selectedId={selectedId} 
              />
            </TabsContent>
            <TabsContent value="careers" className="mt-0">
              <SubmissionList 
                items={submissions.filter(s => s.subject.startsWith('Career Application'))} 
                onSelect={setSelectedId} 
                selectedId={selectedId} 
              />
            </TabsContent>
          </div>

          {/* Preview Section */}
          <div className="lg:col-span-8">
            <div className="border border-neutral-800 bg-neutral-900/20 min-h-[600px] flex flex-col relative overflow-hidden">
              {selectedSubmission ? (
                <>
                  {/* Submission Header */}
                  <div className="p-8 border-b border-neutral-800 bg-black/40">
                    <div className="flex justify-between items-start gap-6">
                      <div className="space-y-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-neutral-800 flex items-center justify-center">
                            <User className="w-5 h-5 text-neutral-400" />
                          </div>
                          <div>
                            <h2 className="text-xl font-medium text-white">{selectedSubmission.full_name}</h2>
                            <p className="text-sm text-neutral-500">{selectedSubmission.email}</p>
                          </div>
                        </div>
                        <div className="flex gap-4">
                          <div className="flex items-center gap-2 text-[10px] uppercase tracking-widest font-bold text-neutral-600">
                            <Calendar className="w-3 h-3" />
                            {new Date(selectedSubmission.created_at).toLocaleString()}
                          </div>
                          {!selectedSubmission.is_read && (
                            <div className="flex items-center gap-2 text-[10px] uppercase tracking-widest font-bold text-emerald-500">
                              <Inbox className="w-3 h-3" />
                              Incoming
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        {!selectedSubmission.is_read && (
                          <Button 
                            onClick={() => handleMarkAsRead(selectedSubmission.id)}
                            className="bg-white text-black hover:bg-neutral-200 rounded-none h-10 text-[10px] uppercase tracking-widest px-6"
                          >
                            Mark as Read
                          </Button>
                        )}
                        <Button 
                          onClick={() => handleDelete(selectedSubmission.id)}
                          variant="ghost" 
                          className="border border-neutral-800 rounded-none h-10 text-neutral-500 hover:text-red-500 hover:bg-red-950/20 px-4"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </div>

                  {/* Submission Content */}
                  <div className="p-8 space-y-8 flex-1 overflow-y-auto">
                    <div className="space-y-2">
                      <p className="text-[10px] uppercase tracking-[0.2em] text-neutral-600 font-bold">Subject / Inquiry Type</p>
                      <h3 className="text-2xl font-light text-white italic">"{selectedSubmission.subject}"</h3>
                    </div>
                    
                    <div className="space-y-2">
                      <p className="text-[10px] uppercase tracking-[0.2em] text-neutral-600 font-bold">Message Payload</p>
                      <div className="bg-black/40 border border-neutral-800 p-6 leading-relaxed text-neutral-300 whitespace-pre-wrap font-light">
                        {selectedSubmission.message}
                      </div>
                    </div>
                  </div>

                  {/* Footer actions */}
                  <div className="p-6 border-t border-neutral-800 bg-black/20 flex justify-end">
                    <Button 
                      variant="ghost" 
                      className="text-neutral-500 hover:text-white flex items-center gap-2 text-[10px] uppercase tracking-widest"
                      onClick={() => window.location.href = `mailto:${selectedSubmission.email}?subject=Re: ${selectedSubmission.subject}`}
                    >
                      <Mail className="w-4 h-4" />
                      Reply via Email
                    </Button>
                  </div>
                </>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center p-20 text-center space-y-6">
                  <div className="w-16 h-16 rounded-full border border-neutral-800 flex items-center justify-center opacity-20">
                    <Inbox className="w-8 h-8 text-white" />
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-xl font-light text-neutral-400 tracking-tight">Secure Communications</h3>
                    <p className="text-neutral-600 text-xs max-w-xs mx-auto leading-relaxed">
                      Select an inquiry from the registry to decrypt and review the transmission payload.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </Tabs>
    </div>
  )
}

function SubmissionList({ items, onSelect, selectedId }: { 
  items: Submission[], 
  onSelect: (id: string) => void,
  selectedId: string | null
}) {
  if (items.length === 0) {
    return (
      <div className="p-12 border border-neutral-800 bg-neutral-900/10 text-center">
        <p className="text-[10px] uppercase tracking-[0.2em] text-neutral-600 font-bold">Registry Empty</p>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {items.map((item) => (
        <button
          key={item.id}
          onClick={() => onSelect(item.id)}
          className={`w-full text-left p-6 border transition-all relative overflow-hidden group ${
            selectedId === item.id 
              ? 'bg-white border-white text-black' 
              : 'bg-neutral-900/20 border-neutral-800 text-neutral-400 hover:border-neutral-600'
          }`}
        >
          {!item.is_read && selectedId !== item.id && (
            <div className="absolute top-0 right-0 w-2 h-2 bg-white m-2 rounded-full shadow-[0_0_10px_white]" />
          )}
          
          <div className="space-y-3">
            <div className="flex justify-between items-start">
              <p className={`text-[10px] uppercase tracking-widest font-bold ${selectedId === item.id ? 'text-black' : 'text-neutral-500'}`}>
                {new Date(item.created_at).toLocaleDateString()}
              </p>
              <ChevronRight className={`w-3 h-3 transition-transform group-hover:translate-x-1 ${selectedId === item.id ? 'text-black' : 'text-neutral-700'}`} />
            </div>
            
            <div className="space-y-1">
              <p className={`text-sm font-medium truncate ${selectedId === item.id ? 'text-black' : 'text-white'}`}>
                {item.full_name}
              </p>
              <p className={`text-xs truncate ${selectedId === item.id ? 'text-neutral-700' : 'text-neutral-500'}`}>
                {item.subject}
              </p>
            </div>
          </div>
        </button>
      ))}
    </div>
  )
}
