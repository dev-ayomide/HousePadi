'use client'

import { useState, useRef } from 'react'
import { 
  Briefcase, 
  Globe2, 
  Laptop, 
  MapPin, 
  Upload, 
  CheckCircle2, 
  Loader2,
  ChevronDown
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { submitCareerApplication } from '@/app/actions/career-actions'
import { useToast } from '@/components/ui/use-toast'

export function CareersClient() {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSubmitted, setIsSubmitted] = useState(false)
  const [fileName, setFileName] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { toast } = useToast()

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFileName(e.target.files[0].name)
    } else {
      setFileName(null)
    }
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsSubmitting(true)
    
    const form = e.currentTarget
    const formData = new FormData(form)
    const result = await submitCareerApplication(formData)
    
    if (result.success) {
      setIsSubmitted(true)
      toast({
        title: "Application Received",
        description: "Thank you for applying. Our team will review your application soon.",
      })
      form.reset()
      setFileName(null)
    } else {
      toast({
        title: "Submission Failed",
        description: result.error || "An error occurred while submitting your application.",
        variant: "destructive"
      })
    }
    setIsSubmitting(false)
  }

  return (
    <div className="bg-black min-h-screen selection:bg-white selection:text-black font-sans relative">
      <div 
        className="absolute inset-0 opacity-[0.02] pointer-events-none" 
        style={{ backgroundImage: 'radial-gradient(#ffffff 1px, transparent 1px)', backgroundSize: '24px 24px' }} 
      />

      <main className="pt-32 pb-24 relative z-10">
        
        {/* Hero Section */}
        <section className="px-6 sm:px-8 lg:px-12 max-w-7xl mx-auto text-center space-y-8 mb-32">
          <div className="inline-block">
            <span className="text-[10px] tracking-[0.3em] uppercase text-neutral-500 font-bold border-x border-neutral-800 px-4">
              Join HousePadi
            </span>
          </div>
          <h1 className="text-4xl sm:text-6xl lg:text-7xl font-bold text-white tracking-tighter leading-[1.1] max-w-4xl mx-auto">
            Build the Future of <br className="hidden sm:block" />
            <span className="text-neutral-500 italic font-serif font-light">Space Exploration</span>
          </h1>
          <p className="text-lg sm:text-xl text-neutral-400 font-light max-w-2xl mx-auto leading-relaxed">
            We are building the technology that transforms how people discover, explore, and experience real-world spaces.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
            <Button 
              onClick={() => document.getElementById('open-roles')?.scrollIntoView({ behavior: 'smooth' })}
              className="w-full sm:w-auto bg-white text-black hover:bg-neutral-200 h-14 px-8 rounded-none text-xs tracking-widest uppercase font-bold"
            >
              View Open Roles
            </Button>
            <Button 
              onClick={() => document.getElementById('application-form')?.scrollIntoView({ behavior: 'smooth' })}
              variant="outline"
              className="w-full sm:w-auto border-neutral-800 text-white hover:bg-neutral-900 h-14 px-8 rounded-none text-xs tracking-widest uppercase font-bold bg-transparent"
            >
              Apply Now
            </Button>
          </div>
        </section>

        {/* Why Work With Us */}
        <section className="px-6 sm:px-8 lg:px-12 max-w-7xl mx-auto mb-32">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-light text-white tracking-tight">Why Work With Us</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="p-8 border border-neutral-800 bg-neutral-900/20 backdrop-blur-md space-y-4 hover:border-neutral-600 transition-colors">
              <Globe2 className="w-6 h-6 text-neutral-400" />
              <h3 className="text-lg font-medium text-white">Meaningful Impact</h3>
              <p className="text-sm text-neutral-500 leading-relaxed">
                Shape the future of Nigerian and African real estate technology with transformative digital solutions.
              </p>
            </div>
            <div className="p-8 border border-neutral-800 bg-neutral-900/20 backdrop-blur-md space-y-4 hover:border-neutral-600 transition-colors">
              <Laptop className="w-6 h-6 text-neutral-400" />
              <h3 className="text-lg font-medium text-white">Emerging Tech</h3>
              <p className="text-sm text-neutral-500 leading-relaxed">
                Work directly with cutting-edge AR, photogrammetry, and spatial web technologies daily.
              </p>
            </div>
            <div className="p-8 border border-neutral-800 bg-neutral-900/20 backdrop-blur-md space-y-4 hover:border-neutral-600 transition-colors">
              <MapPin className="w-6 h-6 text-neutral-400" />
              <h3 className="text-lg font-medium text-white">Flexible Environment</h3>
              <p className="text-sm text-neutral-500 leading-relaxed">
                Collaborative and flexible workflows that prioritize deep work and creative problem solving.
              </p>
            </div>
            <div className="p-8 border border-neutral-800 bg-neutral-900/20 backdrop-blur-md space-y-4 hover:border-neutral-600 transition-colors">
              <Briefcase className="w-6 h-6 text-neutral-400" />
              <h3 className="text-lg font-medium text-white">Shape a Startup</h3>
              <p className="text-sm text-neutral-500 leading-relaxed">
                Join early and help define the culture, engineering standards, and direction of a growing startup.
              </p>
            </div>
          </div>
        </section>

        {/* Open Roles */}
        <section id="open-roles" className="px-6 sm:px-8 lg:px-12 max-w-4xl mx-auto mb-32">
          <div className="mb-12">
            <h2 className="text-3xl font-light text-white tracking-tight mb-4">Open Positions</h2>
            <div className="w-12 h-[1px] bg-neutral-800"></div>
          </div>
          
          <div className="space-y-4">
            {[
              {
                title: "Real Estate Agent",
                desc: "Drive platform adoption among agencies and individuals. Must have deep knowledge of the local real estate market."
              },
              {
                title: "Platform Marketing Specialist",
                desc: "Lead our digital campaigns, craft the narrative around spatial real estate, and manage growth channels."
              },
              {
                title: "Customer Support Representative",
                desc: "Ensure our agents and agencies have a flawless experience navigating our infrastructure and 3D pipelines."
              },
              {
                title: "Interior Scanning Specialist",
                desc: "Operate advanced photogrammetry equipment to capture high-fidelity 3D environments on-site."
              }
            ].map((role, idx) => (
              <div key={idx} className="flex flex-col sm:flex-row sm:items-center justify-between p-6 border border-neutral-800 bg-neutral-950 hover:bg-neutral-900/50 transition-all gap-6">
                <div>
                  <h3 className="text-lg font-medium text-white mb-2">{role.title}</h3>
                  <p className="text-sm text-neutral-500">{role.desc}</p>
                </div>
                <Button 
                  onClick={() => {
                    const select = document.querySelector('select[name="role"]') as HTMLSelectElement
                    if (select) select.value = role.title
                    document.getElementById('application-form')?.scrollIntoView({ behavior: 'smooth' })
                  }}
                  variant="outline"
                  className="shrink-0 border-neutral-700 text-xs tracking-widest uppercase rounded-none bg-transparent hover:bg-white hover:text-black transition-colors"
                >
                  Apply
                </Button>
              </div>
            ))}
            
            <div className="flex flex-col sm:flex-row sm:items-center justify-between p-6 border border-neutral-800 bg-neutral-950 hover:bg-neutral-900/50 transition-all gap-6">
              <div>
                <h3 className="text-lg font-medium text-white mb-2">Other</h3>
                <p className="text-sm text-neutral-500">Don't see a perfect fit? Pitch us your role and how you can help HousePadi grow.</p>
              </div>
              <Button 
                onClick={() => {
                  const select = document.querySelector('select[name="role"]') as HTMLSelectElement
                  if (select) select.value = "Other"
                  document.getElementById('application-form')?.scrollIntoView({ behavior: 'smooth' })
                }}
                variant="outline"
                className="shrink-0 border-neutral-700 text-xs tracking-widest uppercase rounded-none bg-transparent hover:bg-white hover:text-black transition-colors"
              >
                Apply
              </Button>
            </div>
          </div>
        </section>

        {/* Application Form */}
        <section id="application-form" className="px-6 sm:px-8 lg:px-12 max-w-3xl mx-auto">
          <div className="bg-neutral-900/20 backdrop-blur-xl border border-neutral-800 p-8 lg:p-12 relative overflow-hidden">
            {isSubmitted ? (
              <div className="py-20 flex flex-col items-center text-center space-y-6">
                <div className="w-20 h-20 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mb-4">
                  <CheckCircle2 className="w-10 h-10 text-emerald-500" />
                </div>
                <h2 className="text-3xl font-light text-white tracking-tight">Application Submitted</h2>
                <p className="text-neutral-500 max-w-sm mx-auto text-sm leading-relaxed">
                  Thank you for your interest in HousePadi. Our recruiting team will review your profile and reach out if there's a strong fit.
                </p>
                <Button 
                  onClick={() => setIsSubmitted(false)}
                  variant="outline" 
                  className="border-neutral-800 rounded-none hover:bg-neutral-800 text-[10px] uppercase tracking-widest px-8 mt-4"
                >
                  Submit Another Application
                </Button>
              </div>
            ) : (
              <>
                <div className="space-y-2 mb-10 border-b border-neutral-800 pb-8">
                  <h2 className="text-2xl font-light text-white">Application Form</h2>
                  <p className="text-[10px] uppercase tracking-[0.2em] font-bold text-neutral-600">Join the Collective</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-8">
                  {/* Personal Information */}
                  <div className="space-y-6">
                    <h3 className="text-xs uppercase tracking-[0.2em] font-bold text-white mb-4">Personal Information</h3>
                    <div className="grid grid-cols-1 gap-6">
                      <div className="space-y-2">
                        <label className="text-[10px] uppercase tracking-[0.2em] text-neutral-500 font-bold">Full Name *</label>
                        <Input 
                          name="full_name"
                          required
                          className="rounded-none bg-black border-neutral-800 text-white h-12 focus-visible:ring-1 focus-visible:ring-neutral-700"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <label className="text-[10px] uppercase tracking-[0.2em] text-neutral-500 font-bold">Email Address *</label>
                        <Input 
                          name="email"
                          type="email"
                          required
                          className="rounded-none bg-black border-neutral-800 text-white h-12 focus-visible:ring-1 focus-visible:ring-neutral-700"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] uppercase tracking-[0.2em] text-neutral-500 font-bold">Phone Number *</label>
                        <Input 
                          name="phone_number"
                          type="tel"
                          required
                          className="rounded-none bg-black border-neutral-800 text-white h-12 focus-visible:ring-1 focus-visible:ring-neutral-700"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Application Details */}
                  <div className="space-y-6 pt-6 border-t border-neutral-800">
                    <h3 className="text-xs uppercase tracking-[0.2em] font-bold text-white mb-4">Application Details</h3>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <label className="text-[10px] uppercase tracking-[0.2em] text-neutral-500 font-bold">Role Applying For *</label>
                        <div className="relative">
                          <select 
                            name="role"
                            required
                            className="w-full appearance-none rounded-none bg-black border border-neutral-800 text-white h-12 px-3 text-sm focus:outline-none focus:ring-1 focus:ring-neutral-700"
                            defaultValue=""
                          >
                            <option value="" disabled>Select a role...</option>
                            <option value="Real Estate Agent">Real Estate Agent</option>
                            <option value="Platform Marketing Specialist">Platform Marketing Specialist</option>
                            <option value="Customer Support Representative">Customer Support Representative</option>
                            <option value="Interior Scanning Specialist">Interior Scanning Specialist</option>
                            <option value="Other">Other</option>
                          </select>
                          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500 pointer-events-none" />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] uppercase tracking-[0.2em] text-neutral-500 font-bold">Highest Education Level *</label>
                        <div className="relative">
                          <select 
                            name="education"
                            required
                            className="w-full appearance-none rounded-none bg-black border border-neutral-800 text-white h-12 px-3 text-sm focus:outline-none focus:ring-1 focus:ring-neutral-700"
                            defaultValue=""
                          >
                            <option value="" disabled>Select level...</option>
                            <option value="High School">High School</option>
                            <option value="Associate Degree">Associate Degree</option>
                            <option value="Bachelor's Degree">Bachelor's Degree</option>
                            <option value="Master's Degree">Master's Degree</option>
                            <option value="Doctorate">Doctorate</option>
                            <option value="Other">Other</option>
                          </select>
                          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500 pointer-events-none" />
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <label className="text-[10px] uppercase tracking-[0.2em] text-neutral-500 font-bold">Country *</label>
                        <Input 
                          name="country"
                          required
                          className="rounded-none bg-black border-neutral-800 text-white h-12 focus-visible:ring-1 focus-visible:ring-neutral-700"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] uppercase tracking-[0.2em] text-neutral-500 font-bold">State/Province/Region *</label>
                        <Input 
                          name="state"
                          required
                          className="rounded-none bg-black border-neutral-800 text-white h-12 focus-visible:ring-1 focus-visible:ring-neutral-700"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <label className="text-[10px] uppercase tracking-[0.2em] text-neutral-500 font-bold">LinkedIn Profile (Optional)</label>
                        <Input 
                          name="linkedin"
                          type="url"
                          placeholder="https://linkedin.com/in/..."
                          className="rounded-none bg-black border-neutral-800 text-white h-12 focus-visible:ring-1 focus-visible:ring-neutral-700 placeholder:text-neutral-800"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] uppercase tracking-[0.2em] text-neutral-500 font-bold">Portfolio/Website (Optional)</label>
                        <Input 
                          name="portfolio"
                          type="url"
                          placeholder="https://..."
                          className="rounded-none bg-black border-neutral-800 text-white h-12 focus-visible:ring-1 focus-visible:ring-neutral-700 placeholder:text-neutral-800"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Additional Information */}
                  <div className="space-y-6 pt-6 border-t border-neutral-800">
                    <div className="space-y-2">
                      <label className="text-[10px] uppercase tracking-[0.2em] text-neutral-500 font-bold">Personal Note / Cover Letter</label>
                      <Textarea 
                        name="notes"
                        placeholder="Tell us why you're a great fit for HousePadi..."
                        className="rounded-none bg-black border-neutral-800 text-white min-h-[120px] focus-visible:ring-1 focus-visible:ring-neutral-700 p-4 leading-relaxed placeholder:text-neutral-800"
                      />
                    </div>
                  </div>

                  {/* File Upload */}
                  <div className="space-y-6 pt-6 border-t border-neutral-800">
                    <div className="space-y-2">
                      <label className="text-[10px] uppercase tracking-[0.2em] text-neutral-500 font-bold">CV / Resume Upload *</label>
                      <div 
                        onClick={() => fileInputRef.current?.click()}
                        className="border-2 border-dashed border-neutral-800 hover:border-neutral-600 bg-black/50 transition-colors p-8 flex flex-col items-center justify-center cursor-pointer min-h-[160px] group"
                      >
                        <Upload className="w-8 h-8 text-neutral-600 group-hover:text-white mb-4 transition-colors" />
                        <p className="text-sm text-neutral-400 group-hover:text-white transition-colors">
                          {fileName ? fileName : 'Click to upload your CV or Resume'}
                        </p>
                        <p className="text-[10px] text-neutral-600 mt-2 uppercase tracking-widest">
                          PDF, DOC, DOCX (Max 5MB)
                        </p>
                        <input 
                          type="file" 
                          name="cv_file"
                          ref={fileInputRef}
                          onChange={handleFileChange}
                          accept=".pdf,.doc,.docx"
                          className="hidden"
                          required
                        />
                      </div>
                    </div>
                  </div>

                  <Button 
                    disabled={isSubmitting}
                    className="w-full h-16 bg-white text-black hover:bg-neutral-200 rounded-none text-xs font-bold uppercase tracking-[0.3em] transition-all flex items-center justify-center gap-3 mt-8"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Submitting Application...
                      </>
                    ) : (
                      'Submit Application'
                    )}
                  </Button>
                </form>
              </>
            )}
          </div>
        </section>

      </main>
    </div>
  )
}
