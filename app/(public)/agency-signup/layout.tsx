import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Agency Signup | HousePadi',
  description: 'Register your real estate agency for access to the HousePadi network and start creating immersive virtual property tours.',
}

export default function AgencySignupLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>
}
