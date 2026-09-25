import { UserX } from 'lucide-react'
import { Link, Navigate, useParams } from 'react-router-dom'
import { useProfileByUsername } from '../api/profiles'
import { CommentFeed } from '../components/profile/CommentFeed'
import { ProfileHeader } from '../components/profile/ProfileHeader'
import { EmptyState, PageLoader } from '../components/ui/misc'
import { useAuth } from '../store/auth'

export default function UserPage() {
  const { username } = useParams()
  const me = useAuth((s) => s.profile)
  const { data: profile, isLoading } = useProfileByUsername(username)

  if (me && username && me.username.toLowerCase() === username.toLowerCase()) return <Navigate to="/profile" replace />
  if (isLoading) return <PageLoader />
  if (!profile) {
    return (
      <div className="container-page py-16">
        <EmptyState
          icon={<UserX size={24} />}
          title="Читатель не найден"
          action={
            <Link to="/" className="btn-ghost">
              На главную
            </Link>
          }
        >
          Возможно, ник изменился или аккаунт удалён.
        </EmptyState>
      </div>
    )
  }

  return (
    <div className="container-page pb-10 pt-8 sm:pt-12">
      <ProfileHeader profile={profile} />
      <h2 className="mb-5 mt-12 font-display text-xl font-semibold">Комментарии</h2>
      <CommentFeed userId={profile.id} />
    </div>
  )
}
