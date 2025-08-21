import { BigInt, Address } from "@graphprotocol/graph-ts"
import {
  ContractPaused as ContractPausedEvent,
  ContractUnpaused as ContractUnpausedEvent,
  GamePlayed as GamePlayedEvent,
  GameStarted as GameStartedEvent,
  ItemBought as ItemBoughtEvent,
  OwnershipTransferred as OwnershipTransferredEvent,
  PlayerAdded as PlayerAddedEvent,
  PointsClaimed as PointsClaimedEvent,
  SeasonStarted as SeasonStartedEvent
} from "../generated/digitrabbits/digitrabbits"
import {
  ContractPaused,
  ContractUnpaused,
  GamePlayed,
  GameStarted,
  ItemBought,
  OwnershipTransferred,
  PlayerAdded,
  PointsClaimed,
  SeasonStarted,
  GlobalStats,
  SeasonStats,
  Player,
  PlayerSeasonStats,
  GlobalRecord
} from "../generated/schema"

// Constantes
const ZERO = BigInt.fromI32(0)
const ONE = BigInt.fromI32(1)
const HUNDRED = BigInt.fromI32(100)
const FIFTY = BigInt.fromI32(50)
const SECONDS_IN_DAY = BigInt.fromI32(86400)

// Fonction utilitaire pour récupérer ou créer GlobalStats
function getOrCreateGlobalStats(): GlobalStats {
  let globalStats = GlobalStats.load("global")
  
  if (globalStats == null) {
    globalStats = new GlobalStats("global")
    globalStats.totalGamesStarted = ZERO
    globalStats.totalGamesPlayed = ZERO
    globalStats.totalPointsClaimed = ZERO
    globalStats.totalPlayers = ZERO
    globalStats.totalItemsBought = ZERO
    globalStats.lastUpdatedBlock = ZERO
    globalStats.lastUpdatedTimestamp = ZERO
  }
  
  return globalStats
}

// Fonction pour récupérer ou créer un Player
function getOrCreatePlayer(address: Address, blockNumber: BigInt, timestamp: BigInt): Player {
  let playerId = address.toHexString()
  let player = Player.load(playerId)
  
  if (player == null) {
    player = new Player(playerId)
    player.walletAddress = address
    player.totalGamesPlayed = ZERO
    player.totalGamesStarted = ZERO
    player.totalClicks = ZERO
    player.totalPointsClaimed = ZERO
    player.totalItemsBought = ZERO
    player.bestClicksInGame = ZERO
    player.bestClicksGameId = ZERO
    player.averageClicks = ZERO
    player.currentStreak = ZERO
    player.longestStreak = ZERO
    player.lastGameTimestamp = ZERO
    player.firstGameTimestamp = timestamp
    player.seasonsParticipated = []
    player.isActive = true
    player.lastUpdatedBlock = blockNumber
    player.lastUpdatedTimestamp = timestamp
  }
  
  return player
}

// Fonction pour récupérer ou créer PlayerSeasonStats
function getOrCreatePlayerSeasonStats(
  address: Address, 
  seasonId: BigInt, 
  blockNumber: BigInt, 
  timestamp: BigInt
): PlayerSeasonStats {
  let statsId = address.toHexString() + "-" + seasonId.toString()
  let stats = PlayerSeasonStats.load(statsId)
  
  if (stats == null) {
    stats = new PlayerSeasonStats(statsId)
    let player = getOrCreatePlayer(address, blockNumber, timestamp)
    stats.player = player.id
    stats.seasonId = seasonId
    stats.gamesPlayed = ZERO
    stats.gamesStarted = ZERO
    stats.totalClicks = ZERO
    stats.pointsClaimed = ZERO
    stats.itemsBought = ZERO
    stats.bestClicksInGame = ZERO
    stats.bestClicksGameId = ZERO
    stats.averageClicks = ZERO
    stats.currentStreak = ZERO
    stats.longestStreak = ZERO
    stats.firstGameTimestamp = timestamp
    stats.lastGameTimestamp = ZERO
    stats.leaderboardScore = ZERO
    stats.rank = null
    stats.lastUpdatedBlock = blockNumber
    stats.lastUpdatedTimestamp = timestamp
    
    // Ajouter la saison à la liste des saisons du joueur
    let seasons = player.seasonsParticipated
    if (seasons.indexOf(seasonId) == -1) {
      seasons.push(seasonId)
      player.seasonsParticipated = seasons
      player.save()
    }
  }
  
  return stats
}

// Fonction pour calculer le score du leaderboard
function calculateLeaderboardScore(
  totalClicks: BigInt, 
  pointsClaimed: BigInt, 
  currentStreak: BigInt
): BigInt {
  // Formule: clicks * 100 + points + streak * 50
  return totalClicks.times(HUNDRED).plus(pointsClaimed).plus(currentStreak.times(FIFTY))
}

// Fonction pour vérifier et mettre à jour les records globaux
function updateGlobalRecords(
  player: Player,
  gameId: BigInt,
  seasonId: BigInt,
  clicks: BigInt,
  blockNumber: BigInt,
  timestamp: BigInt
): void {
  // Record de meilleur clicker
  let topClickerRecord = GlobalRecord.load("topClicker")
  if (topClickerRecord == null || clicks.gt(topClickerRecord.value)) {
    if (topClickerRecord == null) {
      topClickerRecord = new GlobalRecord("topClicker")
      topClickerRecord.recordType = "BEST_CLICKS"
      topClickerRecord.previousRecord = ZERO
    } else {
      topClickerRecord.previousRecord = topClickerRecord.value
    }
    
    topClickerRecord.player = player.id
    topClickerRecord.value = clicks
    topClickerRecord.gameId = gameId
    topClickerRecord.seasonId = seasonId
    topClickerRecord.achievedAt = timestamp
    topClickerRecord.achievedAtBlock = blockNumber
    topClickerRecord.lastUpdatedBlock = blockNumber
    topClickerRecord.lastUpdatedTimestamp = timestamp
    topClickerRecord.save()
  }
  
  // Record de plus long streak
  let longestStreakRecord = GlobalRecord.load("longestStreak")
  if (longestStreakRecord == null || player.currentStreak.gt(longestStreakRecord.value)) {
    if (longestStreakRecord == null) {
      longestStreakRecord = new GlobalRecord("longestStreak")
      longestStreakRecord.recordType = "LONGEST_STREAK"
      longestStreakRecord.previousRecord = ZERO
    } else {
      longestStreakRecord.previousRecord = longestStreakRecord.value
    }
    
    longestStreakRecord.player = player.id
    longestStreakRecord.value = player.currentStreak
    longestStreakRecord.gameId = gameId
    longestStreakRecord.seasonId = seasonId
    longestStreakRecord.achievedAt = timestamp
    longestStreakRecord.achievedAtBlock = blockNumber
    longestStreakRecord.lastUpdatedBlock = blockNumber
    longestStreakRecord.lastUpdatedTimestamp = timestamp
    longestStreakRecord.save()
  }
}

// Gestionnaires d'événements existants (inchangés)
export function handleContractPaused(event: ContractPausedEvent): void {
  let entity = new ContractPaused(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  )
  entity.by = event.params.by
  entity.blockNumber = event.block.number
  entity.blockTimestamp = event.block.timestamp
  entity.transactionHash = event.transaction.hash
  entity.save()
}

export function handleContractUnpaused(event: ContractUnpausedEvent): void {
  let entity = new ContractUnpaused(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  )
  entity.by = event.params.by
  entity.blockNumber = event.block.number
  entity.blockTimestamp = event.block.timestamp
  entity.transactionHash = event.transaction.hash
  entity.save()
}

// 🎯 GESTIONNAIRE PRINCIPAL: GamePlayed (mis à jour pour le nouveau schéma)
export function handleGamePlayed(event: GamePlayedEvent): void {
  // Récupérer ou créer le Player AVANT de sauver l'événement
  let player = getOrCreatePlayer(event.params.player, event.block.number, event.block.timestamp)
  
  // Sauver l'événement original avec les nouvelles références
  let entity = new GamePlayed(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  )
  
  let globalStats = getOrCreateGlobalStats()
  globalStats.totalGamesPlayed = globalStats.totalGamesPlayed.plus(ONE)
  
  entity.sequentialId = globalStats.totalGamesPlayed
  entity.playerAddress = event.params.player  // L'adresse brute
  entity.player = player.id                   // Référence vers l'entité Player
  entity.seasonId = event.params.seasonId
  entity.clicks = event.params.clicks
  entity.blockNumber = event.block.number
  entity.blockTimestamp = event.block.timestamp
  entity.transactionHash = event.transaction.hash
  entity.save()
  
  // 🎯 NOUVELLE LOGIQUE: Mettre à jour le Player et ses stats
  let seasonStats = getOrCreatePlayerSeasonStats(
    event.params.player, 
    event.params.seasonId, 
    event.block.number, 
    event.block.timestamp
  )
  
  // Mettre à jour les stats du joueur (global)
  player.totalGamesPlayed = player.totalGamesPlayed.plus(ONE)
  player.totalClicks = player.totalClicks.plus(event.params.clicks)
  player.lastGameTimestamp = event.block.timestamp
  
  // Vérifier si c'est un nouveau record personnel
  if (event.params.clicks.gt(player.bestClicksInGame)) {
    player.bestClicksInGame = event.params.clicks
    player.bestClicksGameId = entity.sequentialId
  }
  
  // Calculer la moyenne
  if (player.totalGamesPlayed.gt(ZERO)) {
    player.averageClicks = player.totalClicks.div(player.totalGamesPlayed)
  }
  
  // Gérer le streak (simplifié: +1 si dernière partie < 24h, sinon reset)
  let timeSinceLastGame = event.block.timestamp.minus(player.lastGameTimestamp)
  if (player.lastGameTimestamp.equals(ZERO) || timeSinceLastGame.le(SECONDS_IN_DAY)) {
    player.currentStreak = player.currentStreak.plus(ONE)
  } else {
    player.currentStreak = ONE // Reset du streak
  }
  
  // Mettre à jour le plus long streak
  if (player.currentStreak.gt(player.longestStreak)) {
    player.longestStreak = player.currentStreak
  }
  
  // Déterminer si le joueur est actif (dernière partie < 24h)
  player.isActive = timeSinceLastGame.le(SECONDS_IN_DAY)
  
  player.lastUpdatedBlock = event.block.number
  player.lastUpdatedTimestamp = event.block.timestamp
  player.save()
  
  // Mettre à jour les stats de saison
  seasonStats.gamesPlayed = seasonStats.gamesPlayed.plus(ONE)
  seasonStats.totalClicks = seasonStats.totalClicks.plus(event.params.clicks)
  seasonStats.lastGameTimestamp = event.block.timestamp
  
  // Record personnel pour cette saison
  if (event.params.clicks.gt(seasonStats.bestClicksInGame)) {
    seasonStats.bestClicksInGame = event.params.clicks
    seasonStats.bestClicksGameId = entity.sequentialId
  }
  
  // Calculer la moyenne pour cette saison
  if (seasonStats.gamesPlayed.gt(ZERO)) {
    seasonStats.averageClicks = seasonStats.totalClicks.div(seasonStats.gamesPlayed)
  }
  
  // Streak pour cette saison (même logique)
  if (timeSinceLastGame.le(SECONDS_IN_DAY)) {
    seasonStats.currentStreak = seasonStats.currentStreak.plus(ONE)
  } else {
    seasonStats.currentStreak = ONE
  }
  
  if (seasonStats.currentStreak.gt(seasonStats.longestStreak)) {
    seasonStats.longestStreak = seasonStats.currentStreak
  }
  
  // Calculer le score du leaderboard
  seasonStats.leaderboardScore = calculateLeaderboardScore(
    seasonStats.totalClicks,
    seasonStats.pointsClaimed,
    seasonStats.currentStreak
  )
  
  seasonStats.lastUpdatedBlock = event.block.number
  seasonStats.lastUpdatedTimestamp = event.block.timestamp
  seasonStats.save()
  
  // Mettre à jour les records globaux
  updateGlobalRecords(
    player,
    entity.sequentialId,
    event.params.seasonId,
    event.params.clicks,
    event.block.number,
    event.block.timestamp
  )
  
  // Sauvegarder les stats globales
  globalStats.lastUpdatedBlock = event.block.number
  globalStats.lastUpdatedTimestamp = event.block.timestamp
  globalStats.save()
}

export function handleGameStarted(event: GameStartedEvent): void {
  // Récupérer ou créer le Player AVANT de sauver l'événement
  let player = getOrCreatePlayer(event.params.player, event.block.number, event.block.timestamp)
  
  let entity = new GameStarted(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  )
  entity.playerAddress = event.params.player  // L'adresse brute
  entity.player = player.id                   // Référence vers l'entité Player
  entity.seasonId = event.params.seasonId
  entity.sessionEndsAt = event.params.sessionEndsAt
  entity.blockNumber = event.block.number
  entity.blockTimestamp = event.block.timestamp
  entity.transactionHash = event.transaction.hash
  entity.save()

  // Mettre à jour les stats du joueur
  let seasonStats = getOrCreatePlayerSeasonStats(
    event.params.player, 
    event.params.seasonId, 
    event.block.number, 
    event.block.timestamp
  )
  
  player.totalGamesStarted = player.totalGamesStarted.plus(ONE)
  player.lastUpdatedBlock = event.block.number
  player.lastUpdatedTimestamp = event.block.timestamp
  player.save()
  
  seasonStats.gamesStarted = seasonStats.gamesStarted.plus(ONE)
  seasonStats.lastUpdatedBlock = event.block.number
  seasonStats.lastUpdatedTimestamp = event.block.timestamp
  seasonStats.save()

  // Mettre à jour les statistiques globales
  let globalStats = getOrCreateGlobalStats()
  globalStats.totalGamesStarted = globalStats.totalGamesStarted.plus(ONE)
  globalStats.lastUpdatedBlock = event.block.number
  globalStats.lastUpdatedTimestamp = event.block.timestamp
  globalStats.save()
}

export function handleItemBought(event: ItemBoughtEvent): void {
  // Récupérer ou créer le Player AVANT de sauver l'événement
  let player = getOrCreatePlayer(event.params.player, event.block.number, event.block.timestamp)
  
  let entity = new ItemBought(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  )
  entity.playerAddress = event.params.player  // L'adresse brute
  entity.player = player.id                   // Référence vers l'entité Player
  entity.slot = event.params.slot
  entity.level = event.params.level
  entity.blockNumber = event.block.number
  entity.blockTimestamp = event.block.timestamp
  entity.transactionHash = event.transaction.hash
  entity.save()

  // Mettre à jour les stats du joueur
  player.totalItemsBought = player.totalItemsBought.plus(ONE)
  player.lastUpdatedBlock = event.block.number
  player.lastUpdatedTimestamp = event.block.timestamp
  player.save()

  // Mettre à jour les statistiques globales
  let globalStats = getOrCreateGlobalStats()
  globalStats.totalItemsBought = globalStats.totalItemsBought.plus(ONE)
  globalStats.lastUpdatedBlock = event.block.number
  globalStats.lastUpdatedTimestamp = event.block.timestamp
  globalStats.save()
}

export function handleOwnershipTransferred(event: OwnershipTransferredEvent): void {
  let entity = new OwnershipTransferred(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  )
  entity.previousOwner = event.params.previousOwner
  entity.newOwner = event.params.newOwner
  entity.blockNumber = event.block.number
  entity.blockTimestamp = event.block.timestamp
  entity.transactionHash = event.transaction.hash
  entity.save()
}

export function handlePlayerAdded(event: PlayerAddedEvent): void {
  // Récupérer ou créer le Player AVANT de sauver l'événement
  let player = getOrCreatePlayer(event.params.player, event.block.number, event.block.timestamp)
  
  let entity = new PlayerAdded(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  )
  entity.playerAddress = event.params.player  // L'adresse brute
  entity.player = player.id                   // Référence vers l'entité Player
  entity.seasonId = event.params.seasonId
  entity.blockNumber = event.block.number
  entity.blockTimestamp = event.block.timestamp
  entity.transactionHash = event.transaction.hash
  entity.save()

  // S'assurer que le Player existe et le sauvegarder
  player.save()

  // Mettre à jour les statistiques globales
  let globalStats = getOrCreateGlobalStats()
  globalStats.totalPlayers = globalStats.totalPlayers.plus(ONE)
  globalStats.lastUpdatedBlock = event.block.number
  globalStats.lastUpdatedTimestamp = event.block.timestamp
  globalStats.save()
}

export function handlePointsClaimed(event: PointsClaimedEvent): void {
  // Récupérer ou créer le Player AVANT de sauver l'événement
  let player = getOrCreatePlayer(event.params.player, event.block.number, event.block.timestamp)
  
  let entity = new PointsClaimed(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  )
  entity.playerAddress = event.params.player  // L'adresse brute
  entity.player = player.id                   // Référence vers l'entité Player
  entity.amount = event.params.amount
  entity.blockNumber = event.block.number
  entity.blockTimestamp = event.block.timestamp
  entity.transactionHash = event.transaction.hash
  entity.save()

  // Mettre à jour les stats du joueur - on ne peut pas déterminer la saison ici
  // donc on met à jour seulement les stats globales
  player.totalPointsClaimed = player.totalPointsClaimed.plus(event.params.amount)
  player.lastUpdatedBlock = event.block.number
  player.lastUpdatedTimestamp = event.block.timestamp
  player.save()

  // Mettre à jour les statistiques globales
  let globalStats = getOrCreateGlobalStats()
  globalStats.totalPointsClaimed = globalStats.totalPointsClaimed.plus(event.params.amount)
  globalStats.lastUpdatedBlock = event.block.number
  globalStats.lastUpdatedTimestamp = event.block.timestamp
  globalStats.save()
}

export function handleSeasonStarted(event: SeasonStartedEvent): void {
  let entity = new SeasonStarted(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  )
  entity.seasonId = event.params.seasonId
  entity.blockNumber = event.block.number
  entity.blockTimestamp = event.block.timestamp
  entity.transactionHash = event.transaction.hash
  entity.save()
}