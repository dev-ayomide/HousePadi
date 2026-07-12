'use client'

import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useToast } from '@/components/ui/use-toast'
import { FileText, Check, X, ExternalLink } from 'lucide-react'
import { approveAgency, revokeAgency } from '@/app/actions/moderator-agency-actions'

interface ReviewAgencyModalProps {
  agency: {
    id: string
    full_name: string | null
    email: string
    phone_number?: string | null
    website_url?: string | null
    created_at: string
    agency_status?: string
    verification_document_url?: string | null
  } | null
  isOpen: boolean
  onClose: () => void
  moderatorId: string
  onSuccess: () => void
}

export function ReviewAgencyModal({ agency, isOpen, onClose, moderatorId, onSuccess }: ReviewAgencyModalProps) {
  const { toast } = useToast()
  const [loadingAction, setLoadingAction] = useState<'approve' | 'revoke' | null>(null)
  const [notes, setNotes] = useState('')

  if (!agency) return null

  const handleApprove = async () => {
    setLoadingAction('approve')
    const res = await approveAgency(agency.id, moderatorId, agency.email, agency.full_name || 'Agency', notes)
    setLoadingAction(null)
    
    if (res.success) {
      toast({ title: 'Agency Approved', description: 'The agency has been granted access.' })
      onSuccess()
      onClose()
    } else {
      toast({ title: 'Approval Failed', description: res.error, variant: 'destructive' })
    }
  }

  const handleRevoke = async () => {
    setLoadingAction('revoke')
    const res = await revokeAgency(agency.id, moderatorId, agency.email, agency.full_name || 'Agency', notes)
    setLoadingAction(null)

    if (res.success) {
      toast({ title: 'Agency Revoked', description: 'The agency application has been rejected.' })
      onSuccess()
      onClose()
    } else {
      toast({ title: 'Revocation Failed', description: res.error, variant: 'destructive' })
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="bg-neutral-950 border-neutral-800 text-white rounded-none sm:max-w-[600px] p-0 overflow-hidden">
        <div className="p-8 space-y-6">
          <DialogHeader>
            <DialogTitle className="text-xl font-light tracking-tight text-white flex items-center gap-3">
              <FileText className="w-5 h-5 text-neutral-500" />
              Agency Application Review
            </DialogTitle>
            <DialogDescription className="text-xs text-neutral-500 uppercase tracking-widest font-bold">
              Verification & Vetting Process
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            {/* Agency Details */}
            <div className="grid grid-cols-2 gap-4 border border-neutral-800 bg-neutral-900/40 p-4">
              <div>
                <p className="text-[10px] text-neutral-500 uppercase tracking-widest font-bold mb-1">Agency Name</p>
                <p className="text-sm text-neutral-200">{agency.full_name || 'N/A'}</p>
              </div>
              <div>
                <p className="text-[10px] text-neutral-500 uppercase tracking-widest font-bold mb-1">Email</p>
                <p className="text-sm text-neutral-200">{agency.email}</p>
              </div>
              <div>
                <p className="text-[10px] text-neutral-500 uppercase tracking-widest font-bold mb-1">Phone</p>
                <p className="text-sm text-neutral-200">{agency.phone_number || 'N/A'}</p>
              </div>
              <div>
                <p className="text-[10px] text-neutral-500 uppercase tracking-widest font-bold mb-1">Website</p>
                <p className="text-sm text-neutral-200">
                  {agency.website_url ? (
                    <a href={agency.website_url.startsWith('http') ? agency.website_url : `https://${agency.website_url}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 hover:text-white transition-colors">
                      {agency.website_url} <ExternalLink className="w-3 h-3" />
                    </a>
                  ) : 'N/A'}
                </p>
              </div>
              <div>
                <p className="text-[10px] text-neutral-500 uppercase tracking-widest font-bold mb-1">Submitted</p>
                <p className="text-sm text-neutral-200">{new Date(agency.created_at).toLocaleString()}</p>
              </div>
              <div>
                <p className="text-[10px] text-neutral-500 uppercase tracking-widest font-bold mb-1">Status</p>
                <p className="text-sm text-yellow-500 uppercase tracking-widest text-[10px] font-bold mt-1">{agency.agency_status}</p>
              </div>
            </div>

            {/* Document Verification */}
            <div className="space-y-2">
              <p className="text-[10px] text-neutral-500 uppercase tracking-widest font-bold">Verification Document</p>
              {agency.verification_document_url ? (
                <div className="border border-neutral-800 p-4 flex items-center justify-between bg-neutral-900/20">
                  <span className="text-xs text-neutral-400 font-mono truncate max-w-[300px]">
                    {agency.verification_document_url.split('/').pop()}
                  </span>
                  <Button variant="outline" size="sm" className="h-8 text-[10px] uppercase tracking-widest rounded-none border-neutral-700 hover:bg-neutral-800 text-white" asChild>
                    <a href={agency.verification_document_url} target="_blank" rel="noopener noreferrer">
                      View Document
                    </a>
                  </Button>
                </div>
              ) : (
                <div className="border border-neutral-800 p-4 text-center text-xs text-neutral-600 italic">
                  No verification document uploaded.
                </div>
              )}
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <p className="text-[10px] text-neutral-500 uppercase tracking-widest font-bold">Moderator Notes (Optional)</p>
              <Input
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Add internal notes about this decision..."
                className="rounded-none bg-neutral-950 border-neutral-800 text-white placeholder:text-neutral-700 h-10 focus-visible:ring-1 focus-visible:ring-neutral-700 focus-visible:ring-offset-0 transition-all text-xs"
              />
            </div>
          </div>
        </div>

        {/* Action Footer */}
        <div className="flex border-t border-neutral-800">
          <Button 
            className="flex-1 rounded-none h-14 bg-red-950/20 hover:bg-red-900/40 text-red-500 hover:text-red-400 uppercase tracking-widest text-[10px] font-bold transition-all"
            onClick={handleRevoke}
            disabled={loadingAction !== null}
          >
            {loadingAction === 'revoke' ? 'Revoking...' : <><X className="w-4 h-4 mr-2" /> Revoke Application</>}
          </Button>
          <Button 
            className="flex-1 rounded-none h-14 bg-emerald-950/20 hover:bg-emerald-900/40 text-emerald-500 hover:text-emerald-400 uppercase tracking-widest text-[10px] font-bold transition-all border-l border-neutral-800"
            onClick={handleApprove}
            disabled={loadingAction !== null}
          >
            {loadingAction === 'approve' ? 'Approving...' : <><Check className="w-4 h-4 mr-2" /> Approve Application</>}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
