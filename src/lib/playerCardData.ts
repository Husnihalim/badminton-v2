export type PlayerRatingSource = {
  singles_elo?: number | null
  doubles_elo?: number | null
  singles_games?: number | null
  doubles_games?: number | null
}

export function getPrimaryElo(player?: PlayerRatingSource | null, fallback = 1200) {
  if (!player) return fallback
  const singlesGames = player.singles_games ?? 0
  const doublesGames = player.doubles_games ?? 0
  return doublesGames > singlesGames
    ? (player.doubles_elo ?? fallback)
    : (player.singles_elo ?? fallback)
}
