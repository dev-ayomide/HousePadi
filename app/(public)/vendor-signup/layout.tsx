import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Vendor Signup | HousePadi',
  description: 'Register as a product vendor to start selling your furniture and fixtures on HousePadi.',
}

export default function VendorSignupLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>
}
