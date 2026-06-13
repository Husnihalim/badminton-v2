import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, MoreVertical, Users, CheckCircle2 } from 'lucide-react'
import { Button } from '../components/ui/button'
import { Card, CardContent } from '../components/ui/card'
import { Badge } from '../components/ui/badge'
import { FriendlyScoreboard } from '../components/friendly/FriendlyScoreboard'
import { MatchmakingGrid } from '../components/friendly/MatchmakingGrid'
import { PairRegistrationForm } from '../components/friendly/PairRegistrationForm'
import { FriendlyStoryList } from '../components/friendly/FriendlyStoryCard'
import { FriendlyShareButton } from '../components/friendly/FriendlyShareCard'
import { generateFriendlyStories } from '../lib/storyMoments'
import ScoreRecordingModal from '../components/ScoreRecordingModal'
import {
  getFriendly,
  getFriendlyPairs,
  getFriendlyMatchups,
  registerPairs,
  lockMatchmaking,
  recordFriendlyMatch,
  completeFriendly,
} from '../lib/api/competitions'
import { getMyClubs } from '../lib/api'
import type { Friendly, FriendlyPair, FriendlyMatchup } from '../types/competition'
import type { FriendlyStoryMoment } from '../lib/storyMoments'
import type { User, Club } from '../types'

export default function FriendlyPage() {
  const { friendlyId } = useParams<{ friendlyId: string }>()
  const navigate = useNavigate()
  const [currentClub, setCurrentClub] = useState<Club | null>(null)
  
  const [friendly, setFriendly] = useState<Friendly | null>(null)
  const [pairs, setPairs] = useState<FriendlyPair[]>([])
  const [matchups, setMatchups] = useState<FriendlyMatchup[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [recordingMatchup, setRecordingMatchup] = useState<FriendlyMatchup | null>(null)
  const [showScoreModal, setShowScoreModal] = useState(false)
  const [stories, setStories] = useState<FriendlyStoryMoment[]>([])
  
  // Mock club members - replace with actual data
  const [clubMembers] = useState<User[]>([])

  useEffect(() => {
    if (!friendly) return
    async function loadUserClub() {
      try {
        const clubsData = await getMyClubs()
        const userClub = clubsData.find(
          c => c.id === friendly?.inviting_club_id || c.id === friendly?.invited_club_id
        )
        if (userClub) {
          setCurrentClub(userClub)
        } else if (clubsData.length > 0) {
          setCurrentClub(clubsData[0])
        }
      } catch (err) {
        console.error(err)
      }
    }
    loadUserClub()
  }, [friendly])



  async function loadFriendlyData() {
    setIsLoading(true)
    
    const [{ friendly }, { pairs: friendlyPairs }, { matchups: friendlyMatchups }] = await Promise.all([
      getFriendly(friendlyId!),
      getFriendlyPairs(friendlyId!),
      getFriendlyMatchups(friendlyId!),
    ])

    if (friendly) {
      setFriendly(friendly)
      setPairs(friendlyPairs || [])
      setMatchups(friendlyMatchups || [])
      
      // Generate stories
      const generatedStories = generateFriendlyStories(friendly, friendlyMatchups || [])
      setStories(generatedStories)
    }
    
    setIsLoading(false)
  }

  useEffect(() => {
    if (!friendlyId) return
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadFriendlyData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [friendlyId])

  const handleRegisterPairs = async (newPairs: { pair_name: string; player_1_id: string; player_2_id?: string }[]) => {
    if (!friendly || !currentClub) return
    
    setIsSubmitting(true)
    const { pairs: registeredPairs, error } = await registerPairs(
      friendly.id,
      currentClub.id,
      newPairs
    )
    
    if (!error && registeredPairs) {
      setPairs([...pairs, ...registeredPairs])
    }
    setIsSubmitting(false)
  }

  const handleLockMatchmaking = async (newMatchups: { pair_a_id: string; pair_b_id: string }[]) => {
    if (!friendly) return
    
    setIsSubmitting(true)
    const { matchups: lockedMatchups, error } = await lockMatchmaking(friendly.id, newMatchups)
    
    if (!error && lockedMatchups) {
      setMatchups(lockedMatchups)
      setFriendly({ ...friendly, status: 'live' })
    }
    setIsSubmitting(false)
  }

  const handleRecordMatch = (matchup: FriendlyMatchup) => {
    setRecordingMatchup(matchup)
    setShowScoreModal(true)
  }

  const handleSaveMatch = async (matchData: {
    sport: string
    match_type: 'doubles'
    participants: { user_id: string; team: number }[]
    score_sets: { set_number: number; team1_score: number; team2_score: number }[]
  }) => {
    if (!recordingMatchup || !currentClub) return

    const { error } = await recordFriendlyMatch(recordingMatchup.id, {
      ...matchData,
      club_id: currentClub.id,
    })

    if (!error) {
      setShowScoreModal(false)
      setRecordingMatchup(null)
      loadFriendlyData()
      
      // Check if all matches complete
      const updatedMatchups = await getFriendlyMatchups(friendly!.id)
      const allComplete = updatedMatchups.matchups?.every((m) => m.status === 'completed')
      if (allComplete && friendly) {
        await completeFriendly(friendly.id)
        loadFriendlyData()
      }
    }
  }

  if (isLoading || !friendly) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--arena-bg)]">
        <p className="text-slate-400">Loading...</p>
      </div>
    )
  }

  const isInvitingClub = currentClub?.id === friendly.inviting_club_id
  const myClubPairs = pairs.filter((p) => p.club_id === currentClub?.id)
  const opponentPairs = pairs.filter((p) => p.club_id !== currentClub?.id)

  return (
    <div className="min-h-screen bg-[var(--arena-bg)] p-4">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-slate-400 hover:text-white"
        >
          <ArrowLeft size={20} />
          <span className="hidden sm:inline">Back</span>
        </button>
        
        <div className="flex items-center gap-2">
          {friendly && (
            <FriendlyShareButton 
              friendly={friendly} 
              matchups={matchups} 
              story={stories[0]}
            />
          )}
          <Button variant="ghost" size="icon">
            <MoreVertical size={20} />
          </Button>
        </div>
      </div>

      {/* Title */}
      <div className="mb-6">
        <h1 className="arena-heading text-2xl">
          {friendly.inviting_club?.name} vs {friendly.invited_club?.name || friendly.invited_club_name}
        </h1>
        <p className="text-slate-400">Friday Night Friendly</p>
      </div>

      {/* Content based on status */}
      {friendly.status === 'pending' && (
        <Card className="border-white/10 bg-[var(--arena-surface)]">
          <CardContent className="p-6 text-center">
            <div className="mb-4 flex justify-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-amber-500/20">
                <span className="text-2xl">⏳</span>
              </div>
            </div>
            <h2 className="mb-2 text-xl font-bold text-white">Awaiting Response</h2>
            <p className="text-slate-400">
              Waiting for {friendly.invited_club?.name || friendly.invited_club_name} to accept the challenge
            </p>
          </CardContent>
        </Card>
      )}

      {friendly.status === 'accepted' && (
        <div className="space-y-6">
          {/* Registration Status */}
          <Card className="border-white/10 bg-[var(--arena-surface)]">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Users size={20} className="text-[var(--arena-lime)]" />
                  <div>
                    <p className="font-bold text-white">Register Your Pairs</p>
                    <p className="text-sm text-slate-400">
                      {myClubPairs.length} of {friendly.pair_count} pairs registered
                    </p>
                  </div>
                </div>
                <Badge variant={myClubPairs.length === friendly.pair_count ? 'live' : 'muted'}>
                  {myClubPairs.length === friendly.pair_count ? <><CheckCircle2 size={12} className="mr-1" /> Ready</> : 'Incomplete'}
                </Badge>
              </div>
            </CardContent>
          </Card>

          {/* Pair Registration */}
          {myClubPairs.length < friendly.pair_count && (
            <PairRegistrationForm
              clubMembers={clubMembers}
              requiredPairs={friendly.pair_count - myClubPairs.length}
              onSubmit={handleRegisterPairs}
              isLoading={isSubmitting}
            />
          )}

          {/* Matchmaking Preview */}
          {myClubPairs.length === friendly.pair_count && opponentPairs.length === friendly.pair_count && (
            <Card className="border-[var(--arena-lime)]/30 bg-[var(--arena-surface)]">
              <CardContent className="p-4 text-center">
                <p className="mb-2 text-white">Both clubs ready!</p>
                <p className="text-sm text-slate-400">Waiting for captains to set matchups</p>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {friendly.status === 'matchmaking' && (
        <div className="space-y-6">
          <p className="text-center text-sm text-slate-400">
            Captains are setting the matchups
          </p>
          
          {myClubPairs.length > 0 && opponentPairs.length > 0 && (
            <MatchmakingGrid
              pairsA={isInvitingClub ? myClubPairs : opponentPairs}
              pairsB={isInvitingClub ? opponentPairs : myClubPairs}
              isLocked={matchups.length > 0}
              existingMatchups={matchups}
              onLock={handleLockMatchmaking}
              isLoading={isSubmitting}
            />
          )}
        </div>
      )}

      {(friendly.status === 'live' || friendly.status === 'completed') && (
        <>
          <FriendlyScoreboard
            friendly={friendly}
            onRecordMatch={handleRecordMatch}
          />
          
          {/* Stories */}
          <div className="mt-6">
            <FriendlyStoryList 
              stories={stories}
              onShareStory={() => {
                // Handle share
              }}
            />
          </div>
        </>
      )}

      {/* Score Recording Modal */}
      {showScoreModal && recordingMatchup && (
        <ScoreRecordingModal
          isOpen={showScoreModal}
          onClose={() => {
            setShowScoreModal(false)
            setRecordingMatchup(null)
          }}
          clubId={currentClub?.id || ''}
          friendlyContext={{
            matchupId: recordingMatchup.id,
            pairA: recordingMatchup.pair_a,
            pairB: recordingMatchup.pair_b,
          }}
          onSave={handleSaveMatch}
        />
      )}
    </div>
  )
}
