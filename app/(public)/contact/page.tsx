'use client'

import { useState } from 'react'
import { 
  Mail, 
  MapPin, 
  Phone, 
  Send, 
  MessageSquare,
  Globe,
  Loader2,
  CheckCircle2
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Footer } from '@/components/footer'
import { submitContactForm } from '@/app/actions/contact-actions'
import { useToast } from '@/components/ui/use-toast'

export default function ContactPage() {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSubmitted, setIsSubmitted] = useState(false)
  const { toast } = useToast()

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsSubmitting(true)
    
    const formData = new FormData(e.currentTarget)
    const data = {
      full_name: formData.get('full_name') as string,
      email: formData.get('email') as string,
      subject: formData.get('subject') as string,
      message: formData.get('message') as string,
    }

    const result = await submitContactForm(data)
    
    if (result.success) {
      setIsSubmitted(true)
      toast({
        title: "Message Dispatched",
        description: "Our concierge team has received your inquiry.",
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
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-20">
          
          {/* Left: Contact Info */}
          <div className="space-y-12">
            <div className="space-y-4">
              <h1 className="text-5xl lg:text-7xl font-medium text-white tracking-tighter">
                Connect with <br />
                <span className="text-neutral-500 italic font-serif">HousePadi</span>
              </h1>
              <p className="text-neutral-400 text-lg max-w-md leading-relaxed">
                Whether you're looking to showcase a luxury portfolio or integrate spatial marketing into your agency, our team is ready to assist.
              </p>
            </div>

            <div className="space-y-8 pt-8 border-t border-neutral-900">
              <div className="flex items-start gap-6 group">
                <div className="w-12 h-12 rounded-full border border-neutral-800 flex items-center justify-center group-hover:bg-white group-hover:border-white transition-all duration-500">
                  <Mail className="w-5 h-5 text-neutral-500 group-hover:text-black" />
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-[0.3em] font-bold text-neutral-600 mb-1">Global Inquiries</p>
                  <p className="text-xl text-white font-light">contact@housepadi.example</p>
                </div>
              </div>

              <div className="flex items-start gap-6 group">
                <div className="w-12 h-12 rounded-full border border-neutral-800 flex items-center justify-center group-hover:bg-white group-hover:border-white transition-all duration-500">
                  <MapPin className="w-5 h-5 text-neutral-500 group-hover:text-black" />
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-[0.3em] font-bold text-neutral-600 mb-1">HQ Presence</p>
                  <p className="text-xl text-white font-light">Nigeria</p>
                </div>
              </div>

              <div className="flex items-start gap-6 group">
                <div className="w-12 h-12 rounded-full border border-neutral-800 flex items-center justify-center group-hover:bg-white group-hover:border-white transition-all duration-500">
                  <Globe className="w-5 h-5 text-neutral-500 group-hover:text-black" />
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-[0.3em] font-bold text-neutral-600 mb-1">Digital Presence</p>
                  <p className="text-xl text-white font-light">housepadi.example</p>
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
                  <h2 className="text-3xl font-light text-white tracking-tight">Transmission Complete</h2>
                  <p className="text-neutral-500 max-w-xs mx-auto text-sm leading-relaxed">
                    Your inquiry has been logged in our secure system. An associate will reach out shortly.
                  </p>
                  <Button 
                    onClick={() => setIsSubmitted(false)}
                    variant="outline" 
                    className="border-neutral-800 rounded-none hover:bg-neutral-800 text-[10px] uppercase tracking-widest px-8"
                  >
                    Send Another Message
                  </Button>
                </div>
              ) : (
                <>
                  <div className="space-y-2 mb-10">
                    <h2 className="text-2xl font-light text-white">Direct Inquiry</h2>
                    <p className="text-[10px] uppercase tracking-[0.2em] font-bold text-neutral-600">Secure Message Interface</p>
                  </div>

                  <form onSubmit={handleSubmit} className="space-y-8">
                    <div className="space-y-2">
                      <label className="text-[10px] uppercase tracking-[0.2em] text-neutral-500 font-bold">Full Name</label>
                      <Input 
                        name="full_name"
                        required
                        placeholder="ALEXANDER VANCE"
                        className="rounded-none bg-black border-neutral-800 text-white h-14 focus-visible:ring-1 focus-visible:ring-neutral-700 placeholder:text-neutral-800"
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
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
                      <div className="space-y-2">
                        <label className="text-[10px] uppercase tracking-[0.2em] text-neutral-500 font-bold">Subject</label>
                        <Input 
                          name="subject"
                          required
                          placeholder="PORTFOLIO INQUIRY"
                          className="rounded-none bg-black border-neutral-800 text-white h-14 focus-visible:ring-1 focus-visible:ring-neutral-700 placeholder:text-neutral-800"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-[10px] uppercase tracking-[0.2em] text-neutral-500 font-bold">Message Content</label>
                      <Textarea 
                        name="message"
                        required
                        placeholder="DESCRIBE YOUR VISION OR TECHNICAL REQUIREMENTS..."
                        className="rounded-none bg-black border-neutral-800 text-white min-h-[200px] focus-visible:ring-1 focus-visible:ring-neutral-700 p-4 leading-relaxed placeholder:text-neutral-800"
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
                          Dispatch Inquiry
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
