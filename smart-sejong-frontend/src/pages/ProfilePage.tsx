import { User } from 'lucide-react'
import { useAuthStore } from '@/store/authStore'

export default function ProfilePage() {
  const user = useAuthStore((state) => state.user)

  return (
    <div className="min-h-screen bg-gray-50">
      <main className="max-w-5xl mx-auto px-4 py-8 space-y-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">내 정보</h1>
          <p className="text-gray-600">로그인된 사용자 정보를 확인합니다.</p>
        </div>

        <section className="card max-w-2xl">
          <div className="flex items-center gap-4 mb-6">
            <div className="rounded-full bg-primary-100 p-4">
              <User className="h-8 w-8 text-primary-600" />
            </div>
            <div>
              <h2 className="text-xl font-semibold">프로필</h2>
              <p className="text-sm text-gray-500">개인 정보를 관리합니다</p>
            </div>
          </div>

          <div className="space-y-5">
            <ProfileRow label="닉네임" value={user?.nickname || '-'} />
            <ProfileRow label="학번" value={user?.student_id || '-'} />
            <ProfileRow label="전공" value={user?.major || '-'} />
            <div>
              <div className="mb-2 text-sm font-medium text-gray-700">인증 상태</div>
              <span
                className={`inline-flex rounded-full px-3 py-1 text-sm font-medium ${
                  user?.is_verified ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                }`}
              >
                {user?.is_verified ? '인증 완료' : '인증 필요'}
              </span>
            </div>
          </div>
        </section>
      </main>
    </div>
  )
}

function ProfileRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="mb-2 text-sm font-medium text-gray-700">{label}</div>
      <p className="text-gray-900">{value}</p>
    </div>
  )
}
