import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Contact Concierge | HousePadi',
  description: 'Connect with the HousePadi team for business inquiries, integrations, or support with immersive real estate.',
}

export default function ContactLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>
}
