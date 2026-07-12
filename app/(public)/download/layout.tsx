import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Download App | HousePadi',
  description: 'Download the HousePadi mobile application to experience immersive 3D real estate visualization and virtual listings on the go.',
}

export default function DownloadLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>
}
