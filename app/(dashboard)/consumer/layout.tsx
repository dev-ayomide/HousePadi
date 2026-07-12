import { Metadata } from 'next'
import { ConsumerSidebar } from '@/components/consumer-sidebar'
import { DashboardHeader } from '@/components/dashboard-header'
import { ConsumerAuthProvider } from '@/components/explore/consumer-auth-provider'

export const metadata: Metadata = {
  title: 'Consumer Portal | HousePadi',
  description: 'Manage your products, favorites, and profile.',
}

export default function ConsumerDashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <ConsumerAuthProvider>
      <div className="flex h-screen bg-black overflow-hidden">
        <ConsumerSidebar />
        <main className="flex-1 min-w-0 bg-black overflow-y-auto relative">
          <DashboardHeader />
          {/* Mobile Spacer for floating menu button */}
          <div className="h-16 lg:hidden" />
          <div className="min-h-full pt-16 pb-12">
            {children}
          </div>
        </main>
      </div>
    </ConsumerAuthProvider>
  )
}
