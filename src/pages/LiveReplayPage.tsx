import { useParams, useNavigate, Link } from 'react-router-dom'
import { LiveReplayPlayer, LiveReplayList, type Replay } from '../components/live/LiveReplay'
import { SAMPLE_REPLAYS } from '../data/liveReplays'

export function LiveReplayPage() {
  const { id } = useParams()
  const navigate = useNavigate()

  if (!id) return <LiveReplayList />

  const replay = SAMPLE_REPLAYS.find((r) => r.id === id)
  if (!replay) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-20 text-center">
        <h2 className="text-2xl font-bold mb-2">回放不存在</h2>
        <Link to="/shop/live/replay" className="text-nova-500 hover:underline">返回回放列表</Link>
      </div>
    )
  }

  return <LiveReplayPlayer replay={replay} onClose={() => navigate('/shop/live/replay')} />
}
