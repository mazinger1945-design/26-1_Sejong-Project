import { Copy } from 'lucide-react'

interface InviteCodeModalProps {
  isJoinMode: boolean
  inviteCode?: string
  inviteCodeInput: string
  setInviteCodeInput: (code: string) => void
  onJoin: () => void
  onCopy?: () => void
  onClose: () => void
  isJoining?: boolean
}

export function InviteCodeModal({
  isJoinMode,
  inviteCode,
  inviteCodeInput,
  setInviteCodeInput,
  onJoin,
  onCopy,
  onClose,
  isJoining,
}: InviteCodeModalProps) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl p-6 max-w-md w-full">
        <h2 className="text-xl font-semibold mb-4">
          {isJoinMode ? '그룹 참가' : '그룹 초대'}
        </h2>
        {!isJoinMode && inviteCode ? (
          <div>
            <p className="text-sm text-gray-600 mb-2">초대 코드를 친구에게 공유하세요.</p>
            <div className="bg-gray-100 p-4 rounded-lg text-center mb-4">
              <p className="text-2xl font-bold tracking-widest text-primary-600">
                {inviteCode}
              </p>
            </div>
            <button
              type="button"
              onClick={onCopy}
              className="w-full btn-secondary mb-2 flex items-center justify-center space-x-2"
            >
              <Copy className="w-4 h-4" />
              <span>코드 복사</span>
            </button>
          </div>
        ) : (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              초대 코드 입력
            </label>
            <input
              type="text"
              value={inviteCodeInput}
              onChange={(e) => setInviteCodeInput(e.target.value.toUpperCase())}
              placeholder="6자리 코드"
              maxLength={6}
              className="input mb-4 text-center text-2xl font-bold tracking-widest"
              autoFocus
            />
            <button
              type="button"
              onClick={onJoin}
              disabled={isJoining}
              className="w-full btn-primary disabled:opacity-50"
            >
              {isJoining ? '참가 중...' : '참가하기'}
            </button>
          </div>
        )}
        <button onClick={onClose} className="w-full mt-2 btn-secondary">
          닫기
        </button>
      </div>
    </div>
  )
}
