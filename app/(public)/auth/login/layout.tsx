import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Login | HousePadi Portal',
  description: 'Log in to your HousePadi dashboard to manage virtual properties, configure spatial annotation layers, and administer your real estate listings.',
}

export default function LoginLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>
}
