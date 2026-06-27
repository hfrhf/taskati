import { 
  getCurrentUserProfile, 
  getUserAvailability, 
  getProfiles, 
  getAllMembersAvailability, 
  getActivePolls, 
  getScheduledMeetings 
} from '../actions'
import { redirect } from 'next/navigation'
import AvailabilityClient from './availability-client'

export const revalidate = 0 // لضمان جلب أحدث أوقات التوفر مباشرة

export default async function AvailabilityPage() {
  const profile = await getCurrentUserProfile()

  if (!profile) {
    redirect('/login')
  }

  const availability = await getUserAvailability(profile.id)
  const teamProfiles = await getProfiles()
  const allAvailability = await getAllMembersAvailability()
  const activePolls = await getActivePolls()
  const scheduledMeetings = await getScheduledMeetings()

  return (
    <AvailabilityClient 
      currentProfile={profile} 
      initialAvailability={availability} 
      teamProfiles={teamProfiles}
      allAvailability={allAvailability}
      initialActivePolls={activePolls}
      initialScheduledMeetings={scheduledMeetings}
    />
  )
}

