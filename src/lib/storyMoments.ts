import type { MatchParticipant, MatchWithDetails, User } from '../types'
import type { Competition, CompetitionMatchup } from '../types/competition'

function getOpponentName(competition: Competition): string {
  const parts = competition.title.split(' vs ')
  return parts.length > 1 ? parts.slice(1).join(' vs ') : 'Opponent'
}

export type CompetitionStoryType =
  | 'competition_invited'
  | 'competition_accepted'
  | 'matchmaking_complete'
  | 'upset_alert'
  | 'clutch_moment'
  | 'comeback_in_progress'
  | 'competition_completed'
  | 'sweep_victory'
  | 'narrow_escape'
  | 'upset_victory'
  | 'rivalry_formed'

export type StoryMomentType =
  | 'win_streak'
  | 'response_needed'
  | 'comeback_win'
  | 'clean_sweep'
  | 'close_match'
  | 'rivalry_watch'
  | 'best_partner'
  | 'latest_result'
  | CompetitionStoryType

export interface StoryMoment {
  id: string
  type: StoryMomentType
  title: string
  body: string
  proofLabel: string
  matchId?: string
  clubId?: string
  clubName?: string
  matchDate?: string
  competitionId?: string
  priority: number
}

type StoryMatch = MatchWithDetails & { clubName?: string }

type GenerateStoryMomentsInput = {
  user: Pick<User, 'id' | 'name' | 'display_name'>
  matches: StoryMatch[]
  limit?: number
  excludeTemplates?: Set<string>
}

type MatchResult = {
  match: StoryMatch
  userPart: MatchParticipant
  winningTeam: 1 | 2
  isWin: boolean
  scoreline: string
  userTeamSets: number
  opponentTeamSets: number
  userTeamPoints: number
  opponentTeamPoints: number
}

function getMatchTime(match: StoryMatch) {
  return new Date(match.match_date || match.created_at).getTime()
}

function getTeamSetWins(match: StoryMatch) {
  const team1Sets = match.score_sets.filter((set) => set.team1_score > set.team2_score).length
  const team2Sets = match.score_sets.filter((set) => set.team2_score > set.team1_score).length

  if (team1Sets === team2Sets) return null
  return {
    winningTeam: team1Sets > team2Sets ? 1 as const : 2 as const,
    team1Sets,
    team2Sets,
  }
}

function getParticipantName(participant: MatchParticipant) {
  return participant.name || participant.guest_name || 'Guest player'
}

function getMatchLabel(match: StoryMatch) {
  return match.title || `${match.match_type === 'doubles' ? 'Doubles' : 'Singles'} match`
}

function getScoreline(match: StoryMatch) {
  return match.score_sets
    .sort((a, b) => a.set_number - b.set_number)
    .map((set) => `${set.team1_score}-${set.team2_score}`)
    .join(', ')
}

function buildResult(match: StoryMatch, userId: string): MatchResult | null {
  const userPart = match.participants.find((participant) => participant.user_id === userId)
  if (!userPart || match.score_sets.length === 0) return null

  const setWins = getTeamSetWins(match)
  if (!setWins) return null

  const userTeamSets = userPart.team === 1 ? setWins.team1Sets : setWins.team2Sets
  const opponentTeamSets = userPart.team === 1 ? setWins.team2Sets : setWins.team1Sets
  const userTeamPoints = match.score_sets.reduce(
    (sum, set) => sum + (userPart.team === 1 ? set.team1_score : set.team2_score),
    0
  )
  const opponentTeamPoints = match.score_sets.reduce(
    (sum, set) => sum + (userPart.team === 1 ? set.team2_score : set.team1_score),
    0
  )

  return {
    match,
    userPart,
    winningTeam: setWins.winningTeam,
    isWin: userPart.team === setWins.winningTeam,
    scoreline: getScoreline(match),
    userTeamSets,
    opponentTeamSets,
    userTeamPoints,
    opponentTeamPoints,
  }
}

function createMatchMoment(
  type: StoryMomentType,
  result: MatchResult,
  title: string,
  body: string,
  priority: number
): StoryMoment {
  return {
    id: `${type}-${result.match.id}`,
    type,
    title,
    body,
    proofLabel: `Proof: ${result.scoreline}`,
    matchId: result.match.id,
    clubId: result.match.club_id,
    clubName: result.match.clubName,
    matchDate: result.match.match_date || result.match.created_at,
    priority,
  }
}

function getOtherPlayers(match: StoryMatch, userPart: MatchParticipant, sameTeam: boolean) {
  return match.participants
    .filter((participant) => participant.id !== userPart.id && (sameTeam ? participant.team === userPart.team : participant.team !== userPart.team))
    .map(getParticipantName)
    .filter(Boolean)
}

export const winStreakTemplates = [
  "{displayName} is on absolute fire! Racking up {streakCount} consecutive wins. {oppList} played like sayur tonight, not even a challenge. Time to belanja water at the mamak!",
  "{displayName} is simply on another level! {streakCount} wins in a row. They are gliding across the court like a wizard while {oppList} is left fully koyak.",
  "God mode active! {displayName} hits a {streakCount}-match win streak, defeating {oppList}. Opponents are already filing dynamic excuses about shuttlecock speed.",
  "{displayName} is officially on a rampage, stacking up {streakCount} consecutive wins and leaving {oppList} in the dust. Opponents are starting to wonder if they've secretly upgraded their racket, changed the laws of gravity on the court, or if they are just playing against a badminton wizard. At this rate, someone needs to step up and check their racket for illegal substances before their ego takes over the entire arena!",
  "Unstoppable! {displayName} is tearing through the competition with a {streakCount}-match winning streak, most recently defeating {oppList}. Rumors are circulating that the local court administrators are considering a handicap because nobody can seem to find an answer to their lethal cross-court drops.",
  "Form of their life! {displayName} makes it {streakCount} wins in a row after putting on a clinic against {oppList}. Opponents are reportedly scheduling emergency coaching sessions, while {displayName} is already looking for a larger trophy cabinet.",
  "{displayName} is playing chess while everyone else is playing checkers. That's {streakCount} wins on the bounce, leaving {oppList} questioning their life choices on the court. Is there anyone in the club who can halt this run, or should we just hand over the season MVP award now?",
  "The hot streak continues! {displayName} is on fire, racking up {streakCount} consecutive wins. Their latest victims, {oppList}, could do nothing but watch as shuttlecocks repeatedly kissed the lines. Better call the fire department, because this court is burning!",
  "{displayName} has entered god mode! With {streakCount} wins in a row, {oppList} could only watch in awe. At this point, even their mis-hits are landing perfectly. Someone check if they've bribed the badminton gods!",
  "No entry! {displayName} has built a fortress of victories, securing {streakCount} consecutive wins. {oppList} tried to break it, but only ended up as another statistic. Absolute dominance!",
  "A masterclass in momentum. {displayName} cruises to a {streakCount}-match win streak, with {oppList} being the latest hurdle cleared. The confidence is radiating, and the shots are finding corners with laser precision.",
  "Is there anyone who can stop them? {displayName} makes it {streakCount} in a row by taking down {oppList}. They are gliding across the court like a hovercraft. Pure class!",
  "Racking up wins like arcade tickets! {displayName} is on a {streakCount}-match run, sending {oppList} packing. The local chat is already full of conspiracy theories about how they became this good.",
  "An absolute wrecking ball! {displayName} notches up win number {streakCount} in a row, leaving {oppList} behind. They are playing with supreme confidence, executing shots that feel unfair.",
  "The streak grows! {displayName} commands the court for their {streakCount}th straight win, leaving {oppList} to wonder what hit them. A flawless display of tactical badminton.",
  "Untouchable! {displayName} extends their winning run to {streakCount} matches after a solid display against {oppList}. They are setting a standard that is leaving the rest of the club breathless.",
  "{displayName} is on a golden run. That's {streakCount} wins in a row, with {oppList} unable to halt the freight train. The court chemistry and execution are at an all-time high.",
  "Welcome to the show! {displayName} continues to dominate with {streakCount} straight wins. Their latest opponents, {oppList}, were left chasing shadows. A truly spectacular run!",
  "Total control. {displayName} registers {streakCount} consecutive wins, including a clinic against {oppList}. They are playing with an aura of invincibility right now.",
  "Cruising altitude! {displayName} is flying high with a {streakCount}-match winning streak. {oppList} tried to bring them down to earth, but failed. Who will step up next?",
  "A dream run! {displayName} secures {streakCount} consecutive victories, shutting down {oppList} along the way. They are reading the game two steps ahead of everyone else.",
  "The rampage continues! {displayName} makes it {streakCount} wins on the trot, putting on a show against {oppList}. Opponents are starting to dread drawing them in matchups.",
  "Unrivaled form. {displayName} notches up their {streakCount}th consecutive win, leaving {oppList} with no answers. A true demonstration of power, precision, and court control.",
  "The juggernaut rolls on! {displayName} sweeps through for {streakCount} wins in a row. {oppList} gave it everything, but {displayName} is just operating on a higher plane right now."
]

export const responseNeededTemplates = [
  "Slump patrol! {displayName} has dropped {streakCount} matches in a row. Group chat is already cooking up memes and their mental state is fully koyak. Response match needed immediately to stop the banter!",
  "Tough luck! {displayName} is on a {streakCount}-match slide after falling to {oppList}. Insiders report a 5-page essay of excuses is currently being drafted.",
  "Finding the rhythm is key. {displayName} slips to {streakCount} straight defeats, latest to {oppList}. Time to change the grip tape, stop looking sayur, and bounce back!",
  "Rough patch alert! {displayName} has dropped {streakCount} matches in a row, with {oppList} taking full advantage of the situation. Rumor has it they are already drafting a 5-page essay in the club chat about 'unlucky court conditions', 'suboptimal racket tension', and 'the sun was in my eyes' (indoors, mind you). A response match is desperately needed in the next session to stop the group chat memes from becoming permanent lore!",
  "Crisis mode? {displayName} is currently on a {streakCount}-match slide, with {oppList} inflicting the latest damage. Club insiders report a sudden spike in {displayName}'s search history for 'how to serve without flicking' and 'best badminton excuses'. A bounce-back win next time is crucial to restore order.",
  "The struggle is real. {displayName} has suffered {streakCount} straight defeats, falling most recently to {oppList}. The badminton gods have not been kind, but a true champion is defined by how they rise. Time to dust off the racket, stretch those hamstrings, and get back in the win column!",
  "Tough times on the court. {displayName} finds themselves on a {streakCount}-match losing streak, with {oppList} adding to the tally. The whispers in the gallery are growing louder, but we all know a spectacular comeback is just one good smash away. Let's see the response next week!",
  "A temporary setback! {displayName} has dropped {streakCount} matches in a row, including a tough one against {oppList}. It might be time to change the grip tape, consult a fortune teller, or simply run a double-time warm-up. The bounce-back is going to be legendary.",
  "A character-building week! {displayName} has slipped in {streakCount} consecutive matches, with {oppList} claiming victory. The group chat is already cooking up memes, but a single good performance next session will silence the critics.",
  "Slump patrol! {displayName} is searching for answers after dropping {streakCount} matches on the bounce, latest to {oppList}. The grit is there, but the luck has been absent. Time to reset and unleash the fury next game!",
  "In a bit of a rut. {displayName} suffers their {streakCount}th straight defeat, falling to {oppList}. It's time to put the excuses aside, hit the practice wall, and bring that fire back to the court.",
  "The badminton gods are testing {displayName}. That's {streakCount} losses in a row, with {oppList} enjoying the spoils. But don't count them out just yet—the comeback is usually sweeter than the slide.",
  "Time for a tactical reset! {displayName} has dropped {streakCount} matches, with {oppList} proving to be the latest obstacle. A few minor adjustments and they will be back to crushing it.",
  "An unexpected cold streak. {displayName} drops their {streakCount}th consecutive match, this time to {oppList}. But form is temporary, and a spectacular response is definitely brewing.",
  "The bounce-back starts now! {displayName} has had a rough run of {streakCount} losses, most recently against {oppList}. The resolve is strong, and the next opponents should be very worried.",
  "A minor speed bump. {displayName} drops {streakCount} in a row, with {oppList} taking the win. It's time to shake off the rust, tighten the racket strings, and dominate the next session.",
  "{displayName} is experiencing a brief dip, falling in {streakCount} straight matches, latest to {oppList}. But true competitors love a challenge, and the fightback is going to be intense.",
  "Rough waters on the court. {displayName} is down {streakCount} matches, with {oppList} sealing the latest outcome. Time to hit the drawing board and come back with a brand new strategy.",
  "A test of resilience. {displayName} has dropped {streakCount} matches in a row, including a tough battle against {oppList}. The club is backing them to break the spell in their next outing.",
  "Searching for the spark. {displayName} slips to {streakCount} straight defeats, falling to {oppList}. The potential is huge; they just need one solid win to turn the tide.",
  "A temporary drought. {displayName} is on a {streakCount}-match losing run, latest to {oppList}. But the grind never stops, and we know they'll be back with a vengeance.",
  "Finding the rhythm is key. {displayName} drops {streakCount} matches in a row, with {oppList} taking the latest game. Time to focus, get the serves in, and secure that next victory.",
  "A challenging phase. {displayName} has dropped {streakCount} matches, with {oppList} capitalizing. A quick reset, a change of shoes, or maybe just a new grip, and they'll be back on top.",
  "The comeback build-up! {displayName} drops {streakCount} consecutive games, latest to {oppList}. The club is waiting on the edge of their seats for the bounce-back. Show them what you've got!"
]

export const comebackWinTemplates = [
  "The ultimate comeback! {displayName} staged a dramatic escape after dropping set one and looking ready to pack their gear. They managed to gostan and steal the win from {oppList}!",
  "{displayName} pulled off a legendary turnaround! Lost set one, looked dead and buried, but adjusted their tactics to leave {oppList} empty-handed. Never celebrate too early against them!",
  "Cardiac arrest averted! {displayName} did it the hard way, dropping the opener before fighting back to stun {oppList}. Absolute mental toughness and local grit on display.",
  "{displayName} staged a dramatic escape! After dropping the opening set and looking ready to pack their gear, they pulled off a spectacular turnaround to steal the match from {oppList}. Was it pure tactical genius, or did the opponents just run out of steam and start celebrating too early? Either way, the bragging rights are secured and {oppList} is left wondering how they let this slip.",
  "The ultimate turn-around! {displayName} looked dead and buried after set one, but summoned their inner warrior to snatch victory from the clutches of {oppList}. A masterclass in mental toughness and court adjustments that has left the crowd speechless and the opponents in disbelief.",
  "Never count them out! {displayName} clawed their way back from a set down to pull off an epic comeback against {oppList}. The first set was one to forget, but the next two were pure poetry in motion. This is why we play to the final point!",
  "Cardiac arrest averted! {displayName} did it the hard way, dropping the first set before launching a stunning counter-offensive to defeat {oppList}. Talk about high-drama badminton—this match had more twists than a thriller movie.",
  "From the brink of defeat! {displayName} turned the tide in spectacular fashion, overcoming a slow start to steal the win from {oppList}. A tactical masterclass in the second and third sets proved that form is temporary, but class (and stamina) is permanent.",
  "The great escape! {displayName} was down and almost out, but rallied brilliantly to turn a first-set loss into a spectacular win against {oppList}. Opponents are still rubbing their eyes in disbelief.",
  "{displayName} pulled off a Houdini act! Down one set, they completely rewrote the script to snatch victory from {oppList}. A phenomenal display of grit under intense pressure.",
  "A tactical masterclass! {displayName} dropped set one, figured out the puzzle, and absolutely dominated the rest of the match against {oppList}. Never celebrate too early against them!",
  "What a turnaround! {displayName} looked in trouble early on, but completely shifted gears to deny {oppList} the win. Talk about an inspiring display of focus and determination!",
  "The momentum shift of the century! {displayName} overcame a first-set deficit, turning the match into an absolute showcase of grit to defeat {oppList}. A well-deserved victory!",
  "An absolute thriller! {displayName} fell behind early, but refused to fold, coming back to stun {oppList}. The group chat is going wild over this comeback performance!",
  "Resilience personified. {displayName} lost the first set but kept their composure, fighting back to secure a dramatic win over {oppList}. That is how champions respond!",
  "Stunning recovery! {displayName} bounced back from a set down, showcasing incredible stamina and precise smashes to defeat {oppList}. A spectacular win that will be remembered!",
  "{displayName} proved that a slow start means nothing. After losing the first set, they staged a perfect recovery to down {oppList}. A brilliant display of mental fortitude!",
  "Down but never out. {displayName} turned a losing start into a glorious finish, overcoming a tough challenge from {oppList}. A massive statement of intent on the court!",
  "The comeback train has arrived! {displayName} rallied from set one down to seal a memorable victory against {oppList}. They found their rhythm when it mattered most.",
  "A legendary recovery. {displayName} was outplayed in the first set but adjusted their tactics perfectly to defeat {oppList} in three sets. A victory earned through pure brainpower.",
  "Clutch performance of the night! {displayName} dug deep after dropping the first set, turning the tables on {oppList} in spectacular style. Absolutely brilliant composure.",
  "{displayName} snatched victory from the jaws of defeat! After a tough opening set, they shut down {oppList} with some of the best badminton we've seen all month.",
  "Never stop believing! {displayName} overcame a first-set deficit to record a stunning victory over {oppList}. A masterclass in pacing and physical endurance.",
  "The turnaround king/queen! {displayName} dropped the opener but roared back to leave {oppList} empty-handed. That is how you fight for every single point!"
]

export const cleanSweepTemplates = [
  "Total slaughter! {displayName} completely dominated a set, beating {oppList} by {sweepMargin} points. They played like absolute ayam. Someone buy them a map because they were completely lost!",
  "Ruthless smash clinic! {displayName} won a set by a massive {sweepMargin} points against {oppList}. If you blink, you miss the shuttlecock. Time to belanja drinks!",
  "No mercy shown! {displayName} ran riot, securing a set with a commanding {sweepMargin}-point margin over {oppList}. Form is temporary, but class (and smashing power) is permanent.",
  "Total domination! {displayName} produced an absolute statement of a set, leaving {oppList} completely stranded with a margin of {sweepMargin} points or better. A clinical display of court coverage that probably has the other side checking the rulebook for mercy rules. Someone buy {oppList} a map, because they looked completely lost on the court!",
  "Class is in session! {displayName} taught a lesson in court placement, winning a set by a whopping {sweepMargin} points against {oppList}. It wasn't just a win; it was a badminton clinic. The scoreline speaks for itself, and {oppList} will definitely want to burn the game tape.",
  "Absolutely ruthless! {displayName} put on a show of power and precision, blowing {oppList} away by {sweepMargin} points in a single set. If you blink, you miss the smashes. An absolute demolition job that sends a clear warning to the rest of the club.",
  "No mercy shown! {displayName} ran riot on the court, securing a set with a commanding {sweepMargin}-point lead over {oppList}. They found angles that shouldn't physically exist and left the opposition chasing shadows.",
  "A true masterclass. {displayName} dominated the court, building a massive {sweepMargin}-point gap against {oppList}. From the first serve to the final smash, it was total control. A spectacular performance that will be talked about at the pub tonight.",
  "Blink and you missed it! {displayName} blitzed through the set, leaving {oppList} behind by {sweepMargin} points. An absolute masterclass in offensive badminton!",
  "{displayName} was in a hurry! They dismantled {oppList} by {sweepMargin} points in a dominant set. An incredible demonstration of speed, power, and precision.",
  "A proper clinic! {displayName} put on a display of pure badminton art, winning a set by {sweepMargin} points against {oppList}. The court was completely theirs.",
  "Unforgiving form! {displayName} completely locked down the court, cruising to a set win by {sweepMargin} points over {oppList}. The opposition had absolutely no response.",
  "{displayName} was on another level! They blew past {oppList} with a {sweepMargin}-point set margin. A flawless performance that showcased their peak conditioning.",
  "An absolute speedrun! {displayName} dominated the set, leaving {oppList} {sweepMargin} points adrift. That was as clinical as it gets on a badminton court.",
  "{displayName} put on a serving and smashing clinic, winning by {sweepMargin} points in a single set against {oppList}. A truly breathtaking performance!",
  "Dominance redefined. {displayName} cruised to a set victory with a {sweepMargin}-point cushion against {oppList}. Total control from the very first point.",
  "{displayName} left no room for doubt. They took the set by {sweepMargin} points, completely overwhelming {oppList} with high-intensity rallies.",
  "A statement set! {displayName} showed why they are feared on the court, beating {oppList} by {sweepMargin} points. Pure tactical dominance.",
  "Court coverage at its finest. {displayName} won a set by {sweepMargin} points against {oppList}, leaving them diving for shuttlecocks in vain.",
  "{displayName} ran the show! A massive {sweepMargin}-point set victory over {oppList} proved that they are in prime form right now.",
  "No way back for the opponents! {displayName} secured a set with a {sweepMargin}-point margin against {oppList}, playing some of the most aggressive badminton of the night.",
  "Ruthless efficiency. {displayName} took a set by {sweepMargin} points, making {oppList} work for every single shuttle. An absolute masterclass.",
  "A blowout set! {displayName} dominated {oppList} by {sweepMargin} points, showing incredible shot-selection and court awareness. Spectacular!",
  "{displayName} was absolutely unstoppable, taking a set by {sweepMargin} points against {oppList}. A warning shot fired to everyone else in the league!"
]

export const closeMatchTemplates = [
  "A complete nail-biter! The match came down to the absolute wire against {oppList}, decided by just a couple of clutch points. Both sides left everything on the court, although rumor has it {oppList} are still claiming the final line-call was highly questionable. The post-match handshake was filled with both relief and 'what-if' replays that will surely keep both sides awake tonight.",
  "Pulses were racing! {displayName} and {oppList} went toe-to-toe in a absolute classic that wasn't decided until the final seconds. A match of micro-margins where every single serve felt like a championship point. Absolute respect to both teams for a legendary battle.",
  "By the skin of their teeth! {displayName} edged out a dramatic victory against {oppList} in a match that could have gone either way. The spectators were on the edge of their seats as the score traded back and forth. A true showcase of badminton grit.",
  "An absolute thriller! Decided by the narrowest of margins, {displayName} and {oppList} fought tooth and nail. A few centimeters here, a lucky net chord there, and it was all over. A match that demands an immediate rematch!",
  "No breathing room! This encounter was a classic tug-of-war between {displayName} and {oppList}, resolved only at the very death. Both sides played out of their skins, making for a spectacular, high-tension match that was worth admission alone.",
  "A certified epic! {displayName} and {oppList} battled in a high-stakes chess match that came down to the final two points. A spectacular advertisement for the sport!",
  "Edge of your seat finish! {displayName} squeezed past {oppList} in a game that had everyone holding their breath. Absolute margins decided a beautiful match.",
  "A match of millimetres! {displayName} and {oppList} were practically inseparable, trading blows until the final rally. A massive round of applause for both sides!",
  "High drama on court! {displayName} took the win against {oppList} in a nail-biting finish. Every single point was contested like it was a grand final.",
  "A absolute classic! {displayName} and {oppList} left their hearts on the court, with the match decided by a couple of clutch errors. Truly top-tier entertainment.",
  "Pulses are still pounding! {displayName} edged out {oppList} in a match that could have swung either way. A beautiful display of competitive badminton.",
  "A nerve-shredding encounter. {displayName} and {oppList} went the distance, with the victory decided by the thinnest of margins. What a game!",
  "Stamina and nerves tested! {displayName} and {oppList} traded points in a grueling match that went down to the absolute wire. A brilliant spectacle!",
  "An absolute heartbreaker for one, glory for the other. {displayName} defeated {oppList} in a match where neither side deserved to lose. Exceptional grit!",
  "The definition of a close battle. {displayName} and {oppList} pushed each other to the absolute limit, deciding the match on a couple of dramatic final points.",
  "A high-tension showdown! {displayName} took a razor-thin victory against {oppList}. Both sides showed incredible sportsmanship after a grueling battle.",
  "A dramatic conclusion! {displayName} and {oppList} fought to a standstill, with {displayName} finding the final clutch shots to take the win. Amazing!",
  "Not for the faint-hearted! {displayName} and {oppList} played out a nail-biter where every serve, smash, and drop was loaded with pressure. What a match!",
  "A thrilling tug-of-war! {displayName} managed to secure the final points against {oppList} in an absolute classic. The rematch is going to be highly anticipated!",
  "Decided at the death! {displayName} and {oppList} put on a masterclass in high-pressure badminton, with the match settled by the absolute finest of margins.",
  "An absolute block-buster! {displayName} and {oppList} went head-to-head in a thriller that had the gallery cheering every single shot. A brilliant fight!"
]

export const rivalryWatchTemplates = [
  "The plot thickens! {displayName} and {name} have already crossed paths {matches} times. This is no longer just a friendly match—it's a certified personal rivalry. Every point has history, every smash is personal, and the group chat is eagerly waiting for the next chapter. Currently, the bragging rights are sitting with {winnerName}, but we all know the next session will be a warzone.",
  "It's personal now! With {matches} matches played between them, the rivalry between {displayName} and {name} is officially the talk of the club. They know each other's weaknesses, predict each other's drops, and refuse to lose. {winnerName} currently holds the upper hand, but the next showdown is bound to be a classic.",
  "A clash of titans! {displayName} vs {name} is quickly becoming a marquee matchup with {matches} encounters under their belts. There's no love lost when these two step on the court. {winnerName} has the temporary bragging rights, but you can bet the rematch is already being scheduled.",
  "Familiar foes! {displayName} and {name} have faced each other {matches} times, turning their matches into high-stakes drama. The intensity increases with every meeting. Right now, {winnerName} is leading the head-to-head, but in a rivalry this close, anything can happen next time.",
  "No quarter asked, no quarter given. {displayName} and {name} have locked horns {matches} times now. This isn't just about stats; it's about pride. {winnerName} is currently top dog, but the fire is lit and the next encounter will be absolute fire.",
  "The saga continues! {displayName} and {name} have written {matches} chapters in their head-to-head story. Every match is a tactical chess game. {winnerName} has the current lead, but the story is far from over.",
  "A classic club feud! {displayName} and {name} have met {matches} times, establishing themselves as the ultimate rivals. There are no friendly rallies when these two meet. {winnerName} holds the crown for now.",
  "Rivalry of the season! With {matches} meetings, {displayName} and {name} are providing the best drama in the club. Currently, {winnerName} is enjoying the bragging rights, but the next match is already highly anticipated.",
  "Locked in battle! {displayName} and {name} have faced off {matches} times, turning their head-to-head into a legendary contest. {winnerName} is leading, but every encounter is an absolute battle of wills.",
  "No love lost here! {displayName} vs {name} is a certified classic with {matches} matches played. The court heats up the moment they stand opposite each other. {winnerName} has the edge, but for how long?",
  "A rivalry etched in history. {displayName} and {name} have met on court {matches} times. It's a matchup of pride, skill, and grit. {winnerName} is currently leading, but a comeback is always on the cards.",
  "The ultimate head-to-head! {displayName} and {name} have crossed swords {matches} times now. The gallery always fills up when they play. Bragging rights currently belong to {winnerName}.",
  "Fierce competitors! With {matches} matches recorded, {displayName} and {name} continue to push each other to new heights. {winnerName} is leading the head-to-head, but every game is a clean slate.",
  "A battle of pride. {displayName} and {name} have clashed {matches} times. They know each other's games inside out, making for spectacular rallies. {winnerName} currently holds the advantage.",
  "An enduring rivalry! {displayName} and {name} have faced each other {matches} times. The respect is high, but the desire to win is higher. {winnerName} has the lead, but the fire still burns.",
  "The rivalry that keeps on giving. With {matches} matches played, {displayName} and {name} are the club's defining matchup. Currently, {winnerName} is the one to beat, but the next showdown is imminent.",
  "Staring each other down! {displayName} and {name} have locked horns {matches} times. The atmosphere is always electric when they play. {winnerName} is leading the series, but the drama never stops.",
  "Tactical foes. {displayName} and {name} have faced off {matches} times. Every match is a masterclass in adjustments. {winnerName} is currently sitting pretty at the top, but the challenger is hungry.",
  "A duel of epic proportions. {displayName} vs {name} has occurred {matches} times. It is the ultimate test of stamina and strategy. Bragging rights are currently with {winnerName}.",
  "The court is their arena. {displayName} and {name} have clashed {matches} times. Every single match is a showcase of high-quality badminton. {winnerName} is leading the head-to-head series for now.",
  "The ultimate clash! {displayName} and {name} have met {matches} times, turning their matchups into must-watch events. {winnerName} currently has the upper hand, but the next chapter is already being written."
]

export const bestPartnerTemplates = [
  "Double trouble! {displayName} and {name} are proving to be a formidable partnership, winning {wins} of their {matches} matches together. Their court chemistry is so synchronized they might as well start sharing a racket bag. Teammates are officially terrified of drawing them as opponents, with some already practicing their 'tactical bathroom breaks' to avoid facing them.",
  "The dream team! {displayName} and {name} have formed a lethal combination, racking up {wins} wins out of {matches} games. They cover each other's blind spots and run rotations like clockwork. If they keep this up, they might need to start playing with their hands tied to make it fair.",
  "A match made in badminton heaven. {displayName} and {name} have dominated the doubles scene with {wins}/{matches} wins. They don't even need to call for the shuttle anymore—telepathic communication is clearly at play here. Opponents, beware!",
  "Partners in crime! {displayName} and {name} continue their reign of terror in doubles, clinching {wins} wins from {matches} attempts. Their chemistry is unmatched, and their post-match high-fives are becoming legendary. A truly golden combination.",
  "Unbreakable bond! {displayName} and {name} are setting the gold standard for doubles play, winning {wins} of their {matches} matches. They've turned their side of the court into an absolute fortress. Good luck to anyone trying to break through!",
  "The ultimate dynamic duo! {displayName} and {name} are in sync, winning {wins} out of {matches} matches. Their rotations are flawless and their chemistry is the envy of the club.",
  "Two players, one mind. {displayName} and {name} are dominating doubles with a {wins}/{matches} record. They read each other's moves perfectly, leaving opponents completely flat-footed.",
  "Synergy at its best! {displayName} and {name} are crushing it in doubles, taking {wins} wins from {matches} games. They are a certified nightmare for any opposing pair.",
  "A formidable alliance! {displayName} and {name} have joined forces to win {wins} of their {matches} matches. They are setting the benchmark for doubles teamwork in the club.",
  "Doubles royalty! {displayName} and {name} are reigning supreme with {wins} wins out of {matches}. Their coordination on defense and attack is a joy to watch.",
  "An unstoppable partnership. {displayName} and {name} have secured {wins} wins in {matches} matches. Opponents are already looking for ways to ban this pairing!",
  "The chemistry is real! {displayName} and {name} are making doubles look easy, winning {wins} of their {matches} games. They are a perfectly balanced force on the court.",
  "A masterclass in partnership! {displayName} and {name} have conquered the doubles field, winning {wins} out of {matches} times. A truly elite combination.",
  "Racking up doubles wins for fun! {displayName} and {name} have won {wins} out of {matches} matches. They cover the court like a blanket and hit with devastating power.",
  "The court belongs to them! {displayName} and {name} are a dominant force, clinching {wins} wins in {matches} outings. A partnership built on trust and skill.",
  "A lethal connection! {displayName} and {name} continue their doubles dominance, winning {wins} of their {matches} matches. They are completely rewriting the doubles playbook.",
  "Perfect harmony on court! {displayName} and {name} have achieved a fantastic {wins}/{matches} record. Their tactical understanding of doubles rotation is peak-level.",
  "A golden pairing! {displayName} and {name} are showing everyone how doubles should be played, winning {wins} of their {matches} games. Simply outstanding teamwork.",
  "Double impact! {displayName} and {name} are on a roll, securing {wins} victories out of {matches} matches. A combination that strikes fear into the hearts of opponents.",
  "Synchronized success. {displayName} and {name} have compiled a brilliant {wins}/{matches} record. Their communication and positioning are absolutely flawless.",
  "The gold standard of doubles! {displayName} and {name} are sweeping through the opposition, winning {wins} of their {matches} matches. A partnership that is truly a joy to watch."
]

export const latestResultWinTemplates = [
  "{displayName} finished their latest match with a triumphant win, ending {userTeamSets}-{opponentTeamSets} in a {matchLabel} against {oppList}. Whether they are currently spamming emojis in the group chat or magnanimously offering 'pointers' to their defeated opponents, they are definitely walking tall. Let's see if they can back it up next time!",
  "Job done! {displayName} walked away with a solid {userTeamSets}-{opponentTeamSets} victory in a {matchLabel} against {oppList}. A composed performance that highlights their rising form. The post-match celebration was well-earned, and the confidence levels are through the roof.",
  "Victory secured! {displayName} put on a show in their latest {matchLabel}, defeating {oppList} with a final score of {userTeamSets}-{opponentTeamSets}. They dictated the pace from start to finish and fully deserved the win. A great addition to their record!",
  "{displayName} leaves the court victorious, wrapping up a {userTeamSets}-{opponentTeamSets} win in their latest {matchLabel} against {oppList}. Precision, patience, and some spectacular shot-making sealed the deal. Who's next?",
  "A clinical finish! {displayName} triumphed {userTeamSets}-{opponentTeamSets} in a thrilling {matchLabel} against {oppList}. They kept their cool when it mattered most to lock in the win. The victory march to the water cooler has never looked so good.",
  "Sweet taste of victory! {displayName} takes a convincing {userTeamSets}-{opponentTeamSets} win in a {matchLabel} against {oppList}. Their tactical plan worked to absolute perfection.",
  "{displayName} bags another win! They overcame {oppList} with a score of {userTeamSets}-{opponentTeamSets} in their latest {matchLabel}. The form is looking very sharp indeed!",
  "A stellar performance! {displayName} secured a {userTeamSets}-{opponentTeamSets} victory in a {matchLabel} against {oppList}. They controlled the net and dominated the rallies.",
  "In the win column! {displayName} wraps up a successful {matchLabel} against {oppList}, finishing {userTeamSets}-{opponentTeamSets}. A strong statement of intent for the next session!",
  "No mistakes made! {displayName} secures a {userTeamSets}-{opponentTeamSets} win in their latest {matchLabel} against {oppList}. A professional and highly focused performance.",
  "{displayName} gets the job done! A solid {userTeamSets}-{opponentTeamSets} victory in their latest {matchLabel} against {oppList}. The hard work on the practice court is paying off.",
  "A thoroughly deserved win! {displayName} outplayed {oppList} to win {userTeamSets}-{opponentTeamSets} in a stellar {matchLabel}. They are riding high on confidence right now.",
  "Victory is theirs! {displayName} triumphs {userTeamSets}-{opponentTeamSets} in a highly competitive {matchLabel} against {oppList}. A great show of competitive spirit.",
  "{displayName} stands tall! They clinched a {userTeamSets}-{opponentTeamSets} victory in their latest {matchLabel} against {oppList}. A very impressive display of stamina.",
  "A commanding win! {displayName} leaves the court victorious after a {userTeamSets}-{opponentTeamSets} result in a {matchLabel} against {oppList}. Excellent tactical discipline.",
  "Adding to the tally! {displayName} secures a {userTeamSets}-{opponentTeamSets} win against {oppList} in their latest {matchLabel}. The momentum is building nicely.",
  "Top-drawer badminton! {displayName} outlasts {oppList} to win {userTeamSets}-{opponentTeamSets} in a classic {matchLabel}. A fantastic display of court craft.",
  "A solid day at the office! {displayName} takes a {userTeamSets}-{opponentTeamSets} win in a {matchLabel} against {oppList}. They are setting a great benchmark for their games.",
  "Victory in style! {displayName} finishes their latest {matchLabel} with a {userTeamSets}-{opponentTeamSets} win over {oppList}. The smashes were absolutely lethal today.",
  "{displayName} claims the bragging rights! They won {userTeamSets}-{opponentTeamSets} in their latest {matchLabel} against {oppList}. A fantastic all-round performance.",
  "Win secured! {displayName} finishes strong to record a {userTeamSets}-{opponentTeamSets} victory in a {matchLabel} against {oppList}. The court coverage was outstanding."
]

export const latestResultLossTemplates = [
  "{displayName} finished their latest match with a hard-fought battle, ending {userTeamSets}-{opponentTeamSets} in a {matchLabel} against {oppList}. Whether they are currently drafting a long list of excuses or silently plotting their revenge session, the grind never stops. Better luck next time, and maybe check the racket tension!",
  "A tough pill to swallow. {displayName} fell {userTeamSets}-{opponentTeamSets} in a demanding {matchLabel} against {oppList}. Despite some brilliant rallies, it wasn't their day. The post-mortem of the match is already underway, and revenge is definitely on the menu.",
  "On to the next one! {displayName} fought hard but came up short, losing {userTeamSets}-{opponentTeamSets} in a {matchLabel} against {oppList}. It was a match of close margins, but a few errors proved costly. Time to regroup, practice those overheads, and come back stronger.",
  "A minor bump in the road. {displayName} dropped their latest {matchLabel} {userTeamSets}-{opponentTeamSets} to {oppList}. They showed great fight throughout, but couldn't quite get over the line. Expect them to hit the practice courts tomorrow with a point to prove.",
  "Hard luck! {displayName} was on the wrong side of a {userTeamSets}-{opponentTeamSets} scoreline in a {matchLabel} against {oppList}. They left it all on the court, but the opponents were just slightly sharper today. The fire is lit for the next session!",
  "A learning experience. {displayName} lost a hard-fought match {userTeamSets}-{opponentTeamSets} in a {matchLabel} against {oppList}. There were plenty of positives to take away.",
  "Not their day. {displayName} dropped their latest {matchLabel} {userTeamSets}-{opponentTeamSets} to {oppList}. But a true champion learns more from a loss than a win.",
  "A close encounter. {displayName} came up short with a {userTeamSets}-{opponentTeamSets} scoreline in a {matchLabel} against {oppList}. A few lucky net chords made the difference.",
  "Dusted off and ready to reset! {displayName} fell {userTeamSets}-{opponentTeamSets} in their latest {matchLabel} against {oppList}. They will be back stronger next time.",
  "A tough battle. {displayName} drops a {userTeamSets}-{opponentTeamSets} result in a {matchLabel} against {oppList}. The effort was 100%, but the execution fell slightly short.",
  "A temporary setback. {displayName} drops their latest {matchLabel} {userTeamSets}-{opponentTeamSets} to {oppList}. Time to work on the serves and dominate next time.",
  "Valiant effort! {displayName} fought to the end, finishing {userTeamSets}-{opponentTeamSets} in a {matchLabel} against {oppList}. The score doesn't reflect how close it was.",
  "Shaking it off. {displayName} was defeated {userTeamSets}-{opponentTeamSets} in their latest {matchLabel} against {oppList}. But the grind never stops in this club.",
  "Back to the drawing board. {displayName} drops a {userTeamSets}-{opponentTeamSets} game in a {matchLabel} against {oppList}. They are already scheduling their next practice.",
  "A hard-fought contest. {displayName} lost {userTeamSets}-{opponentTeamSets} in their latest {matchLabel} against {oppList}. Some fantastic rallies made this a great watch.",
  "A narrow defeat. {displayName} drops the {matchLabel} {userTeamSets}-{opponentTeamSets} to {oppList}. The determination is still there, and revenge will be sweet.",
  "A challenging match. {displayName} finishes {userTeamSets}-{opponentTeamSets} in a {matchLabel} against {oppList}. Time to analyze the gameplay and bounce back.",
  "Not the desired result. {displayName} drops their latest {matchLabel} {userTeamSets}-{opponentTeamSets} to {oppList}. But we know they will bounce back in no time.",
  "A tough outing. {displayName} was on the wrong end of a {userTeamSets}-{opponentTeamSets} match against {oppList} in their latest {matchLabel}. The focus is now on the next game.",
  "Defeat but with head held high. {displayName} loses {userTeamSets}-{opponentTeamSets} in a {matchLabel} against {oppList}. A great fight that could have gone either way.",
  "The bounce-back starts now! {displayName} drops their latest {matchLabel} {userTeamSets}-{opponentTeamSets} to {oppList}. Expect a fiery performance in the next session!"
]

function selectTemplate(templates: string[], seed: string, excludeTemplates?: Set<string>): string {
  let hash = 0
  for (let i = 0; i < seed.length; i++) {
    hash = seed.charCodeAt(i) + ((hash << 5) - hash)
  }
  const baseIndex = Math.abs(hash)
  for (let offset = 0; offset < templates.length; offset++) {
    const index = (baseIndex + offset) % templates.length
    const template = templates[index]
    const templateKey = `${template.substring(0, 30)}-${index}`
    if (!excludeTemplates || !excludeTemplates.has(templateKey)) {
      if (excludeTemplates) {
        excludeTemplates.add(templateKey)
      }
      return template
    }
  }
  return templates[baseIndex % templates.length]
}

export function generateStoryMoments({ user, matches, limit = 4, excludeTemplates }: GenerateStoryMomentsInput): StoryMoment[] {
  const results = matches
    .map((match) => buildResult(match, user.id))
    .filter((result): result is MatchResult => Boolean(result))
    .sort((a, b) => getMatchTime(b.match) - getMatchTime(a.match))

  if (!results.length) return []

  const moments: StoryMoment[] = []
  const displayName = user.display_name || user.name

  function formatOpponentsList(opponents: string[]) {
    if (opponents.length === 0) return 'their opponents'
    if (opponents.length === 1) return opponents[0]
    if (opponents.length === 2) return `${opponents[0]} and ${opponents[1]}`
    return `${opponents.slice(0, -1).join(', ')}, and ${opponents[opponents.length - 1]}`
  }

  let streakType: 'win' | 'loss' | null = null
  let streakCount = 0
  for (const result of results) {
    const currentType = result.isWin ? 'win' : 'loss'
    if (streakType === null) {
      streakType = currentType
      streakCount = 1
      continue
    }
    if (streakType !== currentType) break
    streakCount++
  }

  if (streakType === 'win' && streakCount >= 2) {
    const defeatedOpponents = Array.from(new Set(
      results.slice(0, streakCount).flatMap(r => getOtherPlayers(r.match, r.userPart, false))
    )).filter(Boolean)
    const oppList = formatOpponentsList(defeatedOpponents)

    const template = selectTemplate(winStreakTemplates, `${displayName}-${streakCount}-${results[0].match.id}`, excludeTemplates)
    const body = template
      .replace(/{displayName}/g, displayName)
      .replace(/{streakCount}/g, String(streakCount))
      .replace(/{oppList}/g, oppList)

    moments.push({
      id: `win-streak-${results[0].match.id}`,
      type: 'win_streak',
      title: `${streakCount}-match winning run`,
      body,
      proofLabel: `Latest proof: ${results[0].scoreline}`,
      matchId: results[0].match.id,
      clubId: results[0].match.club_id,
      clubName: results[0].match.clubName,
      matchDate: results[0].match.match_date || results[0].match.created_at,
      priority: 100,
    })
  } else if (streakType === 'loss' && streakCount >= 2) {
    const victoriousOpponents = Array.from(new Set(
      results.slice(0, streakCount).flatMap(r => getOtherPlayers(r.match, r.userPart, false))
    )).filter(Boolean)
    const oppList = formatOpponentsList(victoriousOpponents)

    const template = selectTemplate(responseNeededTemplates, `${displayName}-${streakCount}-${results[0].match.id}`, excludeTemplates)
    const body = template
      .replace(/{displayName}/g, displayName)
      .replace(/{streakCount}/g, String(streakCount))
      .replace(/{oppList}/g, oppList)

    moments.push({
      id: `response-needed-${results[0].match.id}`,
      type: 'response_needed',
      title: 'Response match needed',
      body,
      proofLabel: `Latest proof: ${results[0].scoreline}`,
      matchId: results[0].match.id,
      clubId: results[0].match.club_id,
      clubName: results[0].match.clubName,
      matchDate: results[0].match.match_date || results[0].match.created_at,
      priority: 95,
    })
  }

  const comeback = results.find((result) => {
    const firstSet = result.match.score_sets.sort((a, b) => a.set_number - b.set_number)[0]
    if (!firstSet || !result.isWin) return false
    const lostFirstSet = result.userPart.team === 1
      ? firstSet.team1_score < firstSet.team2_score
      : firstSet.team2_score < firstSet.team1_score
    return lostFirstSet && result.match.score_sets.length >= 2
  })

  if (comeback) {
    const comebackOpponents = getOtherPlayers(comeback.match, comeback.userPart, false)
    const oppList = formatOpponentsList(comebackOpponents)

    const template = selectTemplate(comebackWinTemplates, `${displayName}-${comeback.match.id}`, excludeTemplates)
    const body = template
      .replace(/{displayName}/g, displayName)
      .replace(/{oppList}/g, oppList)

    moments.push(createMatchMoment(
      'comeback_win',
      comeback,
      'Comeback win',
      body,
      90
    ))
  }

  const cleanSweep = results.find((result) => (
    result.isWin && result.userTeamSets > 0 && result.match.score_sets.some((set) => {
      const margin = result.userPart.team === 1
        ? set.team1_score - set.team2_score
        : set.team2_score - set.team1_score
      return margin >= 8
    })
  ))

  if (cleanSweep) {
    let sweepMargin = 8
    cleanSweep.match.score_sets.forEach((set) => {
      const margin = cleanSweep.userPart.team === 1
        ? set.team1_score - set.team2_score
        : set.team2_score - set.team1_score
      if (margin > sweepMargin) {
        sweepMargin = margin
      }
    })
    const sweptOpponents = getOtherPlayers(cleanSweep.match, cleanSweep.userPart, false)
    const oppList = formatOpponentsList(sweptOpponents)

    const template = selectTemplate(cleanSweepTemplates, `${displayName}-${cleanSweep.match.id}`, excludeTemplates)
    const body = template
      .replace(/{displayName}/g, displayName)
      .replace(/{oppList}/g, oppList)
      .replace(/{sweepMargin}/g, String(sweepMargin))

    moments.push(createMatchMoment(
      'clean_sweep',
      cleanSweep,
      'Dominant set',
      body,
      80
    ))
  }

  const closeMatch = results.find((result) => (
    Math.abs(result.userTeamPoints - result.opponentTeamPoints) <= 4
  ))

  if (closeMatch) {
    const closeOpponents = getOtherPlayers(closeMatch.match, closeMatch.userPart, false)
    const oppList = formatOpponentsList(closeOpponents)

    const template = selectTemplate(closeMatchTemplates, `${displayName}-${closeMatch.match.id}`, excludeTemplates)
    const body = template
      .replace(/{displayName}/g, displayName)
      .replace(/{oppList}/g, oppList)

    moments.push(createMatchMoment(
      'close_match',
      closeMatch,
      'Close match',
      body,
      75
    ))
  }

  const opponents = new Map<string, { matches: number; wins: number; latest: MatchResult }>()
  const partners = new Map<string, { matches: number; wins: number; latest: MatchResult }>()

  results.forEach((result) => {
    getOtherPlayers(result.match, result.userPart, false).forEach((name) => {
      const stats = opponents.get(name) ?? { matches: 0, wins: 0, latest: result }
      stats.matches++
      if (result.isWin) stats.wins++
      if (getMatchTime(result.match) >= getMatchTime(stats.latest.match)) stats.latest = result
      opponents.set(name, stats)
    })

    if (result.match.match_type === 'doubles') {
      getOtherPlayers(result.match, result.userPart, true).forEach((name) => {
        const stats = partners.get(name) ?? { matches: 0, wins: 0, latest: result }
        stats.matches++
        if (result.isWin) stats.wins++
        if (getMatchTime(result.match) >= getMatchTime(stats.latest.match)) stats.latest = result
        partners.set(name, stats)
      })
    }
  })

  const topRival = Array.from(opponents.entries())
    .filter(([, stats]) => stats.matches >= 2)
    .sort(([, a], [, b]) => b.matches - a.matches || Math.abs(50 - (a.wins / a.matches) * 100) - Math.abs(50 - (b.wins / b.matches) * 100))[0]

  if (topRival) {
    const [name, stats] = topRival
    const winnerName = stats.wins > stats.matches - stats.wins ? displayName : name
    const template = selectTemplate(rivalryWatchTemplates, `${displayName}-${name}`, excludeTemplates)
    const body = template
      .replace(/{displayName}/g, displayName)
      .replace(/{name}/g, name)
      .replace(/{matches}/g, String(stats.matches))
      .replace(/{winnerName}/g, winnerName)

    moments.push({
      id: `rivalry-watch-${name.toLowerCase().replace(/\s+/g, '-')}`,
      type: 'rivalry_watch',
      title: `Rivalry watch: ${name}`,
      body,
      proofLabel: `Record: ${stats.wins}-${stats.matches - stats.wins}`,
      matchId: stats.latest.match.id,
      clubId: stats.latest.match.club_id,
      clubName: stats.latest.match.clubName,
      matchDate: stats.latest.match.match_date || stats.latest.match.created_at,
      priority: 70,
    })
  }

  const bestPartner = Array.from(partners.entries())
    .filter(([, stats]) => stats.matches >= 2)
    .sort(([, a], [, b]) => (b.wins / b.matches) - (a.wins / a.matches) || b.wins - a.wins)[0]

  if (bestPartner) {
    const [name, stats] = bestPartner
    const template = selectTemplate(bestPartnerTemplates, `${displayName}-${name}`, excludeTemplates)
    const body = template
      .replace(/{displayName}/g, displayName)
      .replace(/{name}/g, name)
      .replace(/{wins}/g, String(stats.wins))
      .replace(/{matches}/g, String(stats.matches))

    moments.push({
      id: `best-partner-${name.toLowerCase().replace(/\s+/g, '-')}`,
      type: 'best_partner',
      title: `Best partner: ${name}`,
      body,
      proofLabel: `Partnership win rate: ${Math.round((stats.wins / stats.matches) * 100)}%`,
      matchId: stats.latest.match.id,
      clubId: stats.latest.match.club_id,
      clubName: stats.latest.match.clubName,
      matchDate: stats.latest.match.match_date || stats.latest.match.created_at,
      priority: 65,
    })
  }

  if (moments.length < limit) {
    const latest = results[0]
    const latestOpponents = getOtherPlayers(latest.match, latest.userPart, false)
    const oppList = formatOpponentsList(latestOpponents)
    const matchLabel = getMatchLabel(latest.match)

    let body: string
    if (latest.isWin) {
      const template = selectTemplate(latestResultWinTemplates, `${displayName}-${latest.match.id}`, excludeTemplates)
      body = template
        .replace(/{displayName}/g, displayName)
        .replace(/{userTeamSets}/g, String(latest.userTeamSets))
        .replace(/{opponentTeamSets}/g, String(latest.opponentTeamSets))
        .replace(/{matchLabel}/g, matchLabel)
        .replace(/{oppList}/g, oppList)
    } else {
      const template = selectTemplate(latestResultLossTemplates, `${displayName}-${latest.match.id}`, excludeTemplates)
      body = template
        .replace(/{displayName}/g, displayName)
        .replace(/{userTeamSets}/g, String(latest.userTeamSets))
        .replace(/{opponentTeamSets}/g, String(latest.opponentTeamSets))
        .replace(/{matchLabel}/g, matchLabel)
        .replace(/{oppList}/g, oppList)
    }

    moments.push(createMatchMoment(
      'latest_result',
      latest,
      latest.isWin ? 'Latest win recorded' : 'Latest result recorded',
      body,
      50
    ))
  }

  const seen = new Set<string>()
  return moments
    .sort((a, b) => b.priority - a.priority)
    .filter((moment) => {
      if (seen.has(moment.id)) return false
      seen.add(moment.id)
      return true
    })
    .slice(0, limit)
}

export function buildStoryMomentShareText(moment: StoryMoment, playerName: string) {
  return [
    `${playerName} on KelabSukan`,
    `🔥 *${moment.title}*`,
    `🏆 ${moment.body}`,
    "",
    `📊 *${moment.proofLabel}*`,
    moment.clubName ? `📍 ${moment.clubName}` : null,
    "",
    "Read the full match report & view stats:",
    `🔗 https://kelabsukan.com/stories/${moment.id}`
  ].filter((line) => line !== null).join('\n')
}

// ============================================
// COMPETITIONS STORY ENGINE
// ============================================

const competitionStoryTemplates: Record<CompetitionStoryType, string[]> = {
  competition_invited: [
    "{inviting_club} threw down the gauntlet. {opponent_club} has been challenged.",
    "{inviting_club} thinks they own Friday night. {opponent_club} gets to disagree.",
    "The group chat has been waiting for this. {inviting_club} vs {opponent_club}.",
    "{inviting_club} woke up and chose violence. {opponent_club} is the target.",
  ],
  competition_accepted: [
    "{opponent_club} answered the call. The friendly is on.",
    "{opponent_club} said yes. Now they have to back it up.",
    "Challenge accepted. {opponent_club} isn't backing down.",
    "{opponent_club} walked into the trap. Let's see if they walk out.",
  ],
  matchmaking_complete: [
    "The battles are set. May the best pairs win.",
    "Matchmaking locked. No take-backs.",
    "The matchups are spicy. This was intentional.",
    "Captains have spoken. The dice are cast.",
  ],
  upset_alert: [
    "The scoreboard just got interesting. {winning_pair} weren't supposed to win this.",
    "{losing_pair} had this in their pocket. Then they didn't.",
    "Upset of the night: {winning_pair} send {losing_pair} home early.",
    "Nobody saw this coming. {winning_pair} just changed everything.",
  ],
  clutch_moment: [
    "Final match decides it. The pressure is real.",
    "It all comes down to this. Nerves of steel required.",
    "The last dance. Winner takes all.",
    "This is why we play. Final match, everything on the line.",
  ],
  comeback_in_progress: [
    "{club} was down {deficit}. Now it's tied. Momentum is a funny thing.",
    "The comeback is live. {club} refuses to go quietly.",
    "From the ashes. {club} is one win away from completing the impossible.",
    "Remember when {club} was losing? They don't either.",
  ],
  competition_completed: [
    "{winning_club} takes the friendly. The dinner conversation just got one-sided.",
    "{losing_club} came close. Close doesn't get you bragging rights.",
    "{winning_club} owns this round. The rematch request is already in the group chat.",
    "It's done. {winning_club} will be insufferable for at least a week.",
  ],
  sweep_victory: [
    "{winning_club} didn't just win. They made a statement. {score}.",
    "Dominant. {winning_club} gave {losing_club} no room to breathe.",
    "A masterclass from {winning_club}. {losing_club} couldn't find an answer.",
    "Perfect night for {winning_club}. {losing_club} will want to forget this one.",
  ],
  narrow_escape: [
    "{winning_club} edged it out. One point either way and we're telling a different story.",
    "Heartstopper. {winning_club} survived by the thinnest margin.",
    "{losing_club} will replay that final point for weeks. {winning_club} moves on.",
    "Could have gone either way. {winning_club} will take it.",
  ],
  upset_victory: [
    "The underdogs did it. {winning_club} just shocked everyone.",
    "David met Goliath. David won. {winning_club} is living the dream.",
    "Nobody believed in {winning_club}. They believed in themselves. That's enough.",
    "The impossible happened. {winning_club} will never forget this night.",
  ],
  rivalry_formed: [
    "This isn't over. {club_a} and {club_b} have unfinished business.",
    "A rivalry is born. {club_a} vs {club_b} just became must-watch.",
    "They'll meet again. {club_a} and {club_b} are now tied at {wins}-{losses}.",
    "The rematch is already being discussed. {club_a} vs {club_b} is now a thing.",
  ],
}

// Invitation / Registration Story
export function generateCompetitionInvitedStory(competition: Competition): StoryMoment {
  const templates = competitionStoryTemplates.competition_invited
  const template = templates[Math.floor(Math.random() * templates.length)]
  const hostName = competition.club?.name || 'Host Club'
  const oppName = getOpponentName(competition)

  return {
    id: `invited-${competition.id}`,
    type: 'competition_invited',
    title: competition.format === 'friendly' ? 'Challenge Thrown' : 'Competition Created',
    body: competition.format === 'friendly'
      ? template.replace('{inviting_club}', hostName).replace('{opponent_club}', oppName)
      : `Registration is officially open for '${competition.title}'!`,
    proofLabel: `Format: ${competition.format.replace('_', ' ')}`,
    competitionId: competition.id,
    clubId: competition.club_id,
    clubName: competition.club?.name,
    priority: 80,
  }
}

// Accept / Signups Closed Story
export function generateCompetitionAcceptedStory(competition: Competition): StoryMoment {
  const templates = competitionStoryTemplates.competition_accepted
  const template = templates[Math.floor(Math.random() * templates.length)]
  const oppName = getOpponentName(competition)

  return {
    id: `accepted-${competition.id}`,
    type: 'competition_accepted',
    title: competition.format === 'friendly' ? 'Challenge Accepted' : 'Signups Complete',
    body: competition.format === 'friendly'
      ? template.replace('{opponent_club}', oppName)
      : `Roster locked. Matchmaking is now in progress for '${competition.title}'.`,
    proofLabel: `Status: ${competition.status}`,
    competitionId: competition.id,
    clubId: competition.club_id,
    clubName: competition.club?.name,
    priority: 85,
  }
}

// Matchmaking Locked Story
export function generateCompetitionMatchmakingCompleteStory(competition: Competition): StoryMoment {
  const templates = competitionStoryTemplates.matchmaking_complete
  const template = templates[Math.floor(Math.random() * templates.length)]

  return {
    id: `matchmaking-${competition.id}`,
    type: 'matchmaking_complete',
    title: 'The Battles Are Set',
    body: template,
    proofLabel: `Status: matchmaking locked`,
    competitionId: competition.id,
    clubId: competition.club_id,
    clubName: competition.club?.name,
    priority: 70,
  }
}

// Upset Alert Story
export function generateCompetitionUpsetAlertStory(
  competition: Competition,
  matchup: CompetitionMatchup,
  scoreA: number,
  scoreB: number
): StoryMoment | null {
  const isAWinning = scoreA > scoreB
  const isUpset = (isAWinning && scoreB > scoreA) || (!isAWinning && scoreA > scoreB)

  if (!isUpset) return null

  const templates = competitionStoryTemplates.upset_alert
  const template = templates[Math.floor(Math.random() * templates.length)]

  const winningPair = matchup.winner_participant_id === matchup.participant_a_id
    ? matchup.participant_a?.name
    : matchup.participant_b?.name

  const losingPair = matchup.winner_participant_id === matchup.participant_a_id
    ? matchup.participant_b?.name
    : matchup.participant_a?.name

  return {
    id: `upset-${matchup.id}`,
    type: 'upset_alert',
    title: 'Upset Alert',
    body: template
      .replace('{winning_pair}', winningPair || 'The underdogs')
      .replace('{losing_pair}', losingPair || 'The favorites'),
    proofLabel: `Match index: ${matchup.order_index + 1}`,
    competitionId: competition.id,
    clubId: competition.club_id,
    clubName: competition.club?.name,
    priority: 95,
  }
}

// Clutch Moment Story
export function generateCompetitionClutchMomentStory(
  competition: Competition,
  scoreA: number,
  scoreB: number,
  matchesRemaining: number
): StoryMoment | null {
  if (matchesRemaining !== 1 || Math.abs(scoreA - scoreB) !== 0) {
    return null
  }

  const templates = competitionStoryTemplates.clutch_moment
  const template = templates[Math.floor(Math.random() * templates.length)]

  return {
    id: `clutch-${competition.id}-${scoreA + scoreB}`,
    type: 'clutch_moment',
    title: 'It All Comes Down To This',
    body: template,
    proofLabel: `Series Tied: ${scoreA}-${scoreB}`,
    competitionId: competition.id,
    clubId: competition.club_id,
    clubName: competition.club?.name,
    priority: 100,
  }
}

// Comeback Story
export function generateCompetitionComebackStory(
  competition: Competition,
  scoreA: number,
  scoreB: number,
  scoreHistory: { scoreA: number; scoreB: number }[]
): StoryMoment | null {
  if (scoreHistory.length < 3) return null

  const currentLeader = scoreA > scoreB ? 'A' : 'B'
  const wasBehind = scoreHistory.slice(0, -1).some(
    s => currentLeader === 'A' ? s.scoreA < s.scoreB : s.scoreB < s.scoreA
  )

  if (!wasBehind) return null

  const templates = competitionStoryTemplates.comeback_in_progress
  const template = templates[Math.floor(Math.random() * templates.length)]

  const comebackClub = currentLeader === 'A'
    ? competition.club?.name
    : getOpponentName(competition)

  const maxDeficit = Math.max(...scoreHistory.map(s => 
    currentLeader === 'A' ? s.scoreB - s.scoreA : s.scoreA - s.scoreB
  ))

  return {
    id: `comeback-${competition.id}`,
    type: 'comeback_in_progress',
    title: 'The Comeback Is Real',
    body: template
      .replace('{club}', comebackClub || 'The comeback side')
      .replace('{deficit}', `${maxDeficit}-0`),
    proofLabel: `Deficit overcame: ${maxDeficit}`,
    competitionId: competition.id,
    clubId: competition.club_id,
    clubName: competition.club?.name,
    priority: 90,
  }
}

// Competition Completed Story
export function generateCompetitionCompletedStory(
  competition: Competition,
  matchups: CompetitionMatchup[]
): StoryMoment {
  const hostWins = matchups.filter(
    m => m.status === 'completed' && m.winner_participant_id && m.participant_a_id === m.winner_participant_id
  ).length
  const oppWins = matchups.filter(
    m => m.status === 'completed' && m.winner_participant_id && m.participant_b_id === m.winner_participant_id
  ).length

  const hostName = competition.club?.name || 'Host'
  const oppName = getOpponentName(competition)

  const winningClub = hostWins > oppWins ? hostName : oppName
  const losingClub = hostWins > oppWins ? oppName : hostName
  const winningScore = Math.max(hostWins, oppWins)
  const losingScore = Math.min(hostWins, oppWins)

  let storyType: CompetitionStoryType = 'competition_completed'
  let title = 'Competition Complete'

  if (winningScore === matchups.length) {
    storyType = 'sweep_victory'
    title = 'Sweep Victory'
  } else if (winningScore === losingScore + 1) {
    storyType = 'narrow_escape'
    title = 'Narrow Escape'
  }

  const templates = competitionStoryTemplates[storyType]
  const template = templates[Math.floor(Math.random() * templates.length)]

  return {
    id: `completed-${competition.id}`,
    type: storyType,
    title,
    body: template
      .replace('{winning_club}', winningClub)
      .replace('{losing_club}', losingClub)
      .replace('{score}', `${winningScore}-${losingScore}`),
    proofLabel: `Final Score: ${winningScore}-${losingScore}`,
    competitionId: competition.id,
    clubId: competition.club_id,
    clubName: competition.club?.name,
    priority: 100,
  }
}

// Generate all stories for a competition based on current state
export function generateCompetitionStories(
  competition: Competition,
  matchups: CompetitionMatchup[],
  scoreHistory?: { scoreA: number; scoreB: number }[]
): StoryMoment[] {
  const stories: StoryMoment[] = []

  // 1. Invitation / Creation
  stories.push(generateCompetitionInvitedStory(competition))

  // 2. Acceptance / Registration complete
  if (competition.status !== 'draft' && competition.status !== 'cancelled') {
    stories.push(generateCompetitionAcceptedStory(competition))
  }

  // 3. Matchmaking Locked
  if (matchups.length > 0) {
    stories.push(generateCompetitionMatchmakingCompleteStory(competition))
  }

  // Calculate scores
  const scoreA = matchups.filter(
    m => m.status === 'completed' && m.winner_participant_id && m.participant_a_id === m.winner_participant_id
  ).length
  const scoreB = matchups.filter(
    m => m.status === 'completed' && m.winner_participant_id && m.participant_b_id === m.winner_participant_id
  ).length
  const completedCount = scoreA + scoreB
  const remainingCount = matchups.length - completedCount

  // 4. Check for upsets
  matchups.forEach(matchup => {
    if (matchup.status === 'completed') {
      const upsetStory = generateCompetitionUpsetAlertStory(competition, matchup, scoreA, scoreB)
      if (upsetStory) stories.push(upsetStory)
    }
  })

  // 5. Clutch Moment
  const clutchStory = generateCompetitionClutchMomentStory(competition, scoreA, scoreB, remainingCount)
  if (clutchStory) stories.push(clutchStory)

  // 6. Comeback
  if (scoreHistory && scoreHistory.length > 0) {
    const comebackStory = generateCompetitionComebackStory(competition, scoreA, scoreB, scoreHistory)
    if (comebackStory) stories.push(comebackStory)
  }

  // 7. Completion
  if (competition.status === 'completed') {
    stories.push(generateCompetitionCompletedStory(competition, matchups))
  }

  return stories.sort((a, b) => b.priority - a.priority)
}

// Build share text for a competition
export function buildCompetitionShareText(
  competition: Competition,
  matchups: CompetitionMatchup[],
  story?: StoryMoment
): string {
  const hostWins = matchups.filter(
    m => m.status === 'completed' && m.winner_participant_id && m.participant_a_id === m.winner_participant_id
  ).length
  const oppWins = matchups.filter(
    m => m.status === 'completed' && m.winner_participant_id && m.participant_b_id === m.winner_participant_id
  ).length

  const hostName = competition.club?.name || 'Host'
  const oppName = getOpponentName(competition)

  const isComplete = competition.status === 'completed'
  const isLive = competition.status === 'live'

  let text: string

  if (competition.format === 'friendly') {
    if (isComplete) {
      const winner = hostWins > oppWins ? hostName : oppName
      text = `${hostName} ${hostWins}-${oppWins} ${oppName}\n\n${winner} wins the friendly!`
    } else if (isLive) {
      text = `${hostName} ${hostWins}-${oppWins} ${oppName} — LIVE!\n\n${matchups.length - hostWins - oppWins} matchups remain.`
    } else {
      text = `${hostName} vs ${oppName}\n\nFriendly challenge pending.`
    }
  } else {
    if (isComplete) {
      text = `${competition.title} — Completed!\n\nMatches played: ${matchups.length}`
    } else if (isLive) {
      text = `${competition.title} — LIVE!\n\nMatches played: ${hostWins + oppWins} / ${matchups.length}`
    } else {
      text = `${competition.title}\n\nTournament registrations open.`
    }
  }

  if (story) {
    text += `\n\n${story.title}: ${story.body}`
  }

  text += `\n\nLink: ${window.location.origin}/competition/${competition.id}`

  return text
}

// ============================================
// BACKWARD COMPATIBILITY FOR FRIENDLY STORIES
// ============================================

export type FriendlyStoryType =
  | 'friendly_invited'
  | 'friendly_accepted'
  | 'matchmaking_complete'
  | 'upset_alert'
  | 'clutch_moment'
  | 'comeback_in_progress'
  | 'friendly_completed'
  | 'sweep_victory'
  | 'narrow_escape'
  | 'upset_victory'
  | 'rivalry_formed'

export interface FriendlyStoryMoment {
  id: string
  type: FriendlyStoryType
  friendly_id: string
  title: string
  body: string
  proof?: string
  priority: number
  created_at: string
}

export function generateFriendlyStories(
  friendly: Competition,
  matchups: CompetitionMatchup[],
  scoreHistory?: { inviting: number; invited: number }[]
): FriendlyStoryMoment[] {
  const mappedScoreHistory = scoreHistory?.map((h) => ({
    scoreA: h.inviting,
    scoreB: h.invited,
  }))

  const compStories = generateCompetitionStories(friendly, matchups, mappedScoreHistory)

  return compStories.map((story) => {
    let type = story.type as string
    if (type === 'competition_invited') type = 'friendly_invited'
    if (type === 'competition_accepted') type = 'friendly_accepted'
    if (type === 'competition_completed') type = 'friendly_completed'

    return {
      id: story.id,
      type: type as FriendlyStoryType,
      friendly_id: friendly.id,
      title: story.title,
      body: story.body,
      proof: story.proofLabel,
      priority: story.priority,
      created_at: story.matchDate || new Date().toISOString(),
    } as FriendlyStoryMoment
  })
}

export function buildFriendlyShareText(
  friendly: Competition,
  matchups: CompetitionMatchup[],
  story?: FriendlyStoryMoment
): string {
  let compStory: StoryMoment | undefined
  if (story) {
    let type = story.type as string
    if (type === 'friendly_invited') type = 'competition_invited'
    if (type === 'friendly_accepted') type = 'competition_accepted'
    if (type === 'friendly_completed') type = 'competition_completed'

    compStory = {
      id: story.id,
      type: type as StoryMomentType,
      title: story.title,
      body: story.body,
      proofLabel: story.proof || '',
      priority: story.priority,
    }
  }

  const text = buildCompetitionShareText(friendly, matchups, compStory)
  return text
}

