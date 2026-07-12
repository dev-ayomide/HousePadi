import { Header } from '@/components/header'
import { Footer } from '@/components/footer'
import { ConsumerAuthProvider } from '@/components/explore/consumer-auth-provider'

export default function LocationsLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <ConsumerAuthProvider>
      <div className="flex min-h-screen flex-col bg-background">
        <Header />
        <main className="flex-1">
          {children}
        </main>
        <Footer />
      </div>
    </ConsumerAuthProvider>
  )
}
