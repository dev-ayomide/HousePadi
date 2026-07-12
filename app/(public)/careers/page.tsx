import { CareersClient } from './careers-client'
import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Careers | HousePadi',
  description: 'Join HousePadi and help build the future of space exploration. We are looking for talented individuals to join our team.',
  openGraph: {
    title: 'Careers | HousePadi',
    description: 'Join HousePadi and help build the future of space exploration. View open roles and apply today.',
  }
}

export default function CareersPage() {
  return <CareersClient />
}
