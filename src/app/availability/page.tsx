import { getCurrentUserProfile, getUserAvailability } from '../actions'
import { redirect } from 'next/navigation'
import AvailabilityClient from './availability-client'

export const revalidate = 0 // لضمان جلب أحدث أوقات التوفر مباشرة

export default async function AvailabilityPage() {
  const profile = await getCurrentUserProfile()

  if (!profile) {
    redirect('/login')
  }

  const availability = await getUserAvailability(profile.id)

  return (
    <AvailabilityClient 
      currentProfile={profile} 
      initialAvailability={availability} 
    />
  )
}
