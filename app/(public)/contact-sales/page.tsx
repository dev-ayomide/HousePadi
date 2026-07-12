'use client'

import { useState } from 'react'
import { 
  Send, 
  Loader2,
  CheckCircle2,
  Briefcase
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Footer } from '@/components/footer'
import { submitContactForm } from '@/app/actions/contact-actions'
import { useToast } from '@/components/ui/use-toast'

export default function ContactSalesPage() {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSubmitted, setIsSubmitted] = useState(false)
  const { toast } = useToast()

  const [storageUnit, setStorageUnit] = useState<'GB' | 'TB'>('GB')

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsSubmitting(true)
    
    const formData = new FormData(e.currentTarget)
    const fullName = formData.get('full_name') as string
    const email = formData.get('email') as string
    const storageNeeded = formData.get('storage_needed') as string
    const agentLimit = formData.get('agent_limit') as string
    const listingsLimit = formData.get('listings_limit') as string
    const comments = formData.get('comments') as string

    const formattedMessage = `Storage Needed: ${storageNeeded} ${storageUnit}
Agent Limit: ${agentLimit}
Listings Limit: ${listingsLimit}

Additional Comments:
${comments}`

    const data = {
      full_name: fullName,
      email: email,
      subject: 'Custom Plan Request',
      message: formattedMessage,
    }

    const result = await submitContactForm(data)
    
    if (result.success) {
      setIsSubmitted(true)
      toast({
        title: "Request Received",
        description: "Our enterprise sales team will review your requirements.",
      })
    } else {
      toast({
        title: "Submission Failed",
        description: result.error,
        variant: "destructive"
      })
    }
    setIsSubmitting(false)
  }

  return (
    <div className="bg-black min-h-screen selection:bg-white selection:text-black">
      <main className="pt-32 pb-20 px-6 lg:px-10 max-w-7xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-20 items-start">
          
          {/* Left: Contact Info */}
          <div className="space-y-12 sticky top-32">
            <div className="space-y-4">
              <h1 className="text-5xl lg:text-7xl font-medium text-white tracking-tighter">
                Enterprise <br />
                <span className="text-neutral-500 italic font-serif">Solutions</span>
              </h1>
              <p className="text-neutral-400 text-lg max-w-md leading-relaxed">
                Need a tailored infrastructure? Tell us your scale requirements and our enterprise team will design a custom plan for your agency.
              </p>
            </div>

            <div className="space-y-8 pt-8 border-t border-neutral-900">
              <div className="flex items-start gap-6 group">
                <div className="w-12 h-12 rounded-full border border-neutral-800 flex items-center justify-center group-hover:bg-white group-hover:border-white transition-all duration-500">
                  <Briefcase className="w-5 h-5 text-neutral-500 group-hover:text-black" />
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-[0.3em] font-bold text-neutral-600 mb-1">Dedicated Support</p>
                  <p className="text-xl text-white font-light">sales@housepadi.example</p>
                </div>
              </div>
            </div>

            {/* Architectural element */}
            <div className="hidden lg:block pt-12">
               <div className="w-full h-[1px] bg-gradient-to-r from-neutral-800 to-transparent" />
               <div className="mt-4 flex gap-4">
                  <div className="w-2 h-2 rounded-full bg-neutral-800 animate-pulse" />
                  <div className="w-2 h-2 rounded-full bg-neutral-800 animate-pulse delay-75" />
                  <div className="w-2 h-2 rounded-full bg-neutral-800 animate-pulse delay-150" />
               </div>
            </div>
          </div>

          {/* Right: Contact Form */}
          <div className="relative">
            <div className="bg-neutral-900/20 backdrop-blur-3xl border border-neutral-800 p-8 lg:p-12 relative overflow-hidden">
              {isSubmitted ? (
                <div className="py-20 flex flex-col items-center text-center space-y-6">
                  <div className="w-20 h-20 rounded-full bg-white/5 border border-white/10 flex items-center justify-center mb-4">
                    <CheckCircle2 className="w-10 h-10 text-white" />
                  </div>
                  <h2 className="text-3xl font-light text-white tracking-tight">Request Logged</h2>
                  <p className="text-neutral-500 max-w-xs mx-auto text-sm leading-relaxed">
                    Your enterprise requirements have been submitted successfully. A sales representative will contact you shortly to finalize your plan.
                  </p>
                  <Button 
                    onClick={() => setIsSubmitted(false)}
                    variant="outline" 
                    className="border-neutral-800 rounded-none hover:bg-neutral-800 text-[10px] uppercase tracking-widest px-8 mt-4"
                  >
                    Submit Another Request
                  </Button>
                </div>
              ) : (
                <>
                  <div className="space-y-2 mb-10">
                    <h2 className="text-2xl font-light text-white">Custom Plan Configuration</h2>
                    <p className="text-[10px] uppercase tracking-[0.2em] font-bold text-neutral-600">Enterprise Requirements</p>
                  </div>

                  <form onSubmit={handleSubmit} className="space-y-8">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      <div className="space-y-2">
                        <label className="text-[10px] uppercase tracking-[0.2em] text-neutral-500 font-bold">Full Name</label>
                        <Input 
                          name="full_name"
                          required
                          placeholder="ALEXANDER VANCE"
                          className="rounded-none bg-black border-neutral-800 text-white h-14 focus-visible:ring-1 focus-visible:ring-neutral-700 placeholder:text-neutral-800"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] uppercase tracking-[0.2em] text-neutral-500 font-bold">Email Address</label>
                        <Input 
                          name="email"
                          type="email"
                          required
                          placeholder="client@vanguard.com"
                          className="rounded-none bg-black border-neutral-800 text-white h-14 focus-visible:ring-1 focus-visible:ring-neutral-700 placeholder:text-neutral-800"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="flex justify-between items-end">
                        <label className="text-[10px] uppercase tracking-[0.2em] text-neutral-500 font-bold">Storage Needed</label>
                        <div className="flex rounded bg-black border border-neutral-800 overflow-hidden">
                          <button
                            type="button"
                            onClick={() => setStorageUnit('GB')}
                            className={`px-3 py-1 text-[10px] font-bold uppercase transition-colors ${storageUnit === 'GB' ? 'bg-white text-black' : 'text-neutral-500 hover:text-white'}`}
                          >
                            GB
                          </button>
                          <button
                            type="button"
                            onClick={() => setStorageUnit('TB')}
                            className={`px-3 py-1 text-[10px] font-bold uppercase transition-colors ${storageUnit === 'TB' ? 'bg-white text-black' : 'text-neutral-500 hover:text-white'}`}
                          >
                            TB
                          </button>
                        </div>
                      </div>
                      <Input 
                        name="storage_needed"
                        type="number"
                        step="any"
                        required
                        placeholder={`Amount in ${storageUnit}`}
                        className="rounded-none bg-black border-neutral-800 text-white h-14 focus-visible:ring-1 focus-visible:ring-neutral-700 placeholder:text-neutral-800"
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      <div className="space-y-2">
                        <label className="text-[10px] uppercase tracking-[0.2em] text-neutral-500 font-bold">Agent Limit</label>
                        <Input 
                          name="agent_limit"
                          type="number"
                          step="any"
                          required
                          placeholder="Number of agents"
                          className="rounded-none bg-black border-neutral-800 text-white h-14 focus-visible:ring-1 focus-visible:ring-neutral-700 placeholder:text-neutral-800"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] uppercase tracking-[0.2em] text-neutral-500 font-bold">Listings Limit</label>
                        <Input 
                          name="listings_limit"
                          type="number"
                          step="any"
                          required
                          placeholder="Number of listings"
                          className="rounded-none bg-black border-neutral-800 text-white h-14 focus-visible:ring-1 focus-visible:ring-neutral-700 placeholder:text-neutral-800"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-[10px] uppercase tracking-[0.2em] text-neutral-500 font-bold">Additional Comments</label>
                      <Textarea 
                        name="comments"
                        placeholder="DESCRIBE ANY OTHER TECHNICAL REQUIREMENTS..."
                        className="rounded-none bg-black border-neutral-800 text-white min-h-[150px] focus-visible:ring-1 focus-visible:ring-neutral-700 p-4 leading-relaxed placeholder:text-neutral-800"
                      />
                    </div>

                    <Button 
                      disabled={isSubmitting}
                      className="w-full h-16 bg-white text-black hover:bg-neutral-200 rounded-none text-xs font-bold uppercase tracking-[0.3em] transition-all flex items-center justify-center gap-3"
                    >
                      {isSubmitting ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Encrypting...
                        </>
                      ) : (
                        <>
                          <Send className="w-4 h-4" />
                          Submit Request
                        </>
                      )}
                    </Button>
                  </form>
                </>
              )}
            </div>

            {/* Background decorative square */}
            <div className="absolute -top-4 -right-4 w-24 h-24 border-t border-r border-neutral-800 -z-10" />
            <div className="absolute -bottom-4 -left-4 w-24 h-24 border-b border-l border-neutral-800 -z-10" />
          </div>
        </div>
      </main>
      <Footer />
    </div>
  )
}
