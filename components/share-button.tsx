'use client'

import { Share2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { useToast } from '@/components/ui/use-toast'

interface ShareButtonProps {
  title: string
  url?: string
  className?: string
  variant?: 'outline' | 'default' | 'ghost' | 'secondary'
}

export function ShareButton({ title, url, className, variant = 'outline' }: ShareButtonProps) {
  const { toast: uiToast } = useToast()

  const handleShare = async () => {
    const shareUrl = url || window.location.href

    if (navigator.share) {
      try {
        await navigator.share({
          title,
          url: shareUrl,
        })
        return
      } catch (err: any) {
        if (err.name !== 'AbortError') {
          console.error('Error sharing:', err)
        }
      }
    }

    // Fallback to clipboard
    try {
      await navigator.clipboard.writeText(shareUrl)
      // Attempt to use both toast libraries just in case the context varies
      try { toast.success('Link copied to clipboard!') } catch(e) {}
      try { uiToast({ title: 'Link Copied', description: 'The link has been copied to your clipboard.' }) } catch(e) {}
    } catch (err) {
      console.error('Failed to copy link:', err)
    }
  }

  return (
    <Button 
      variant={variant} 
      className={className || "flex items-center gap-2 h-10 px-4 text-xs font-bold uppercase tracking-widest"}
      onClick={handleShare}
    >
      <Share2 className="w-4 h-4" /> Share
    </Button>
  )
}
