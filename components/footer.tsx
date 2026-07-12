'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { getSiteSettings } from '@/app/actions/settings-actions'

export function Footer() {
  const [links, setLinks] = useState<Record<string, string>>({})

  useEffect(() => {
    async function loadLinks() {
      const result = await getSiteSettings()
      if (result.success) {
        setLinks(result.data)
      }
    }
    loadLinks()
  }, [])

  return (
    <footer className="bg-black text-neutral-500 py-24 px-6 sm:px-8 lg:px-12 border-t border-neutral-900">
      <div className="max-w-[90rem] mx-auto">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-12 mb-20">
          <div className="col-span-2 lg:col-span-1">
            <h4 className="text-white font-bold tracking-[0.2em] uppercase text-sm mb-8">HousePadi</h4>
            <p className="text-xs leading-relaxed max-w-xs font-light">
              Immersive virtual property inspections for homes, offices, and event venues across Nigeria.
            </p>
          </div>
          <div>
            <h4 className="text-white text-xs tracking-[0.2em] uppercase font-bold mb-8">Platform</h4>
            <ul className="space-y-4">
              <li><Link href="/pricing" className="text-xs hover:text-white transition-colors uppercase tracking-widest font-light">Access Levels</Link></li>
              <li><Link href="/resources" className="text-xs hover:text-white transition-colors uppercase tracking-widest font-light">Resources</Link></li>
              <li><Link href="/api-docs" className="text-xs hover:text-white transition-colors uppercase tracking-widest font-light">API Documentation</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="text-white text-xs tracking-[0.2em] uppercase font-bold mb-8">Company</h4>
            <ul className="space-y-4">
              <li><Link href="/about" className="text-xs hover:text-white transition-colors uppercase tracking-widest font-light">About Us</Link></li>
              <li><Link href="/careers" className="text-xs hover:text-white transition-colors uppercase tracking-widest font-light">Careers</Link></li>
              <li><Link href="/contact" className="text-xs hover:text-white transition-colors uppercase tracking-widest font-light">Inquiries</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="text-white text-xs tracking-[0.2em] uppercase font-bold mb-8">Legal</h4>
            <ul className="space-y-4">
              <li><Link href="/privacy" className="text-xs hover:text-white transition-colors uppercase tracking-widest font-light">Privacy (Portal)</Link></li>
              <li><Link href="/privacy/ar" className="text-xs hover:text-white transition-colors uppercase tracking-widest font-light">Privacy (AR App)</Link></li>
              <li><Link href="/terms" className="text-xs hover:text-white transition-colors uppercase tracking-widest font-light">Terms</Link></li>
            </ul>
          </div>
        </div>

        <div className="border-t border-neutral-900 pt-12 flex flex-col md:flex-row justify-between items-center gap-8">
          <div className="text-center md:text-left">
            <p className="text-[10px] tracking-[0.2em] uppercase font-light">
              &copy; 2026 HousePadi. All rights reserved. // Property Inspection, Reimagined.
            </p>
          </div>
          <div className="flex gap-8">
            {links.twitter_link && <a href={links.twitter_link} target="_blank" rel="noopener noreferrer" className="text-[10px] tracking-[0.2em] uppercase hover:text-white transition-colors font-bold">Twitter</a>}
            {links.linkedin_link && <a href={links.linkedin_link} target="_blank" rel="noopener noreferrer" className="text-[10px] tracking-[0.2em] uppercase hover:text-white transition-colors font-bold">LinkedIn</a>}
            {links.instagram_link && <a href={links.instagram_link} target="_blank" rel="noopener noreferrer" className="text-[10px] tracking-[0.2em] uppercase hover:text-white transition-colors font-bold">Instagram</a>}
            {links.facebook_link && <a href={links.facebook_link} target="_blank" rel="noopener noreferrer" className="text-[10px] tracking-[0.2em] uppercase hover:text-white transition-colors font-bold">Facebook</a>}
          </div>
        </div>
      </div>
    </footer>
  )
}
