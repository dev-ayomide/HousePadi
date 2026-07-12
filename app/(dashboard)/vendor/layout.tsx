import { Metadata } from 'next'
import { VendorSidebar } from '@/components/vendor-sidebar'
import { DashboardHeader } from '@/components/dashboard-header'

export const metadata: Metadata = {
  title: 'Vendor Portal | HousePadi',
  description: 'Manage your product listings and vendor subscription.',
}

export default function VendorLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex h-screen bg-black overflow-hidden">
      <VendorSidebar />
      <main className="flex-1 min-w-0 bg-black overflow-y-auto relative">
        <DashboardHeader />
        {/* Mobile Spacer for floating menu button */}
        <div className="h-16 lg:hidden" />
        <div className="min-h-full pt-16 pb-12">
          {children}
        </div>
      </main>
    </div>
  )
}
