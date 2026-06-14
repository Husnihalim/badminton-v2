import { Navigate, useParams } from 'react-router-dom'

export default function ClubMembersPage() {
  const { clubId } = useParams()
  return <Navigate to={`/club/${clubId}?tab=members`} replace />
}
