import { getCurrentUserProfile, getProfiles } from '../actions'
import { redirect } from 'next/navigation'
import TeamClient from './team-client'

export const revalidate = 0 // لضمان ظهور الأعضاء الجدد مباشرة فور إضافتهم

export default async function TeamPage() {
  const profile = await getCurrentUserProfile()

  if (!profile) {
    redirect('/login')
  }

  const teamProfiles = await getProfiles()

  return <TeamClient currentProfile={profile} initialTeam={teamProfiles} />
}
