import { BigInt, Address } from "@graphprotocol/graph-ts"
import {
  GamePlayed as GamePlayedEvent,
  GameStarted as GameStartedEvent,
  PlayerAdded as PlayerAddedEvent,
  SeasonStarted as SeasonStartedEvent,
  ContractPaused as ContractPausedEvent,
  ContractUnpaused as ContractUnpausedEvent,
  QuestClaimed as QuestClaimedEvent,
  PointsClaimed as PointsClaimedEvent,
  OwnershipTransferred as OwnershipTransferredEvent,
} from "../generated/digitrabbits/digitrabbits"
import {
  GamePlayed,
  GameStarted,
  PlayerAdded,
  SeasonStarted,
  Player,
  PlayerSeasonStats,
  GlobalRecord,
  GlobalStats,
  ContractPaused,
  ContractUnpaused,
  QuestsClaimed,
  PointsClaimed,
  OwnershipTransferred,
} from "../generated/schema"

// Import du contrat pour faire des appels
import { digitrabbits } from "../generated/digitrabbits/digitrabbits"

const ZERO = BigInt.fromI32(0)
const ONE = BigInt.fromI32(1)

// Fonction utilitaire pour récupérer ou créer GlobalStats
function getOrCreateGlobalStats(): GlobalStats {
  let globalStats = GlobalStats.load("global")
  
  if (globalStats == null) {
    globalStats = new GlobalStats("global")
    globalStats.totalGamesStarted = ZERO
    globalStats.totalGamesPlayed = ZERO
    globalStats.totalPointsClaimed = ZERO
    globalStats.totalPlayers = ZERO
    globalStats.totalQuestsClaimed = ZERO
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
    player.totalQuestsClaimed = ZERO
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

// Fonction séparée pour mettre à jour les records globaux depuis le contrat (sans gameId)
function updateGlobalRecordsFromContract(
  playerAddress: Address,
  maxClicks: BigInt,
  seasonId: BigInt,
  blockNumber: BigInt,
  timestamp: BigInt
): void {
  
  let topClickerRecord = GlobalRecord.load("topClicker")
  let player = getOrCreatePlayer(playerAddress, blockNumber, timestamp)
  
  if (topClickerRecord == null || maxClicks.gt(topClickerRecord.value)) {
    if (topClickerRecord == null) {
      topClickerRecord = new GlobalRecord("topClicker")
      topClickerRecord.recordType = "BEST_CLICKS"
      topClickerRecord.previousRecord = ZERO
    } else {
      topClickerRecord.previousRecord = topClickerRecord.value
    }
    
    topClickerRecord.player = player.id
    topClickerRecord.value = maxClicks
    topClickerRecord.gameId = ZERO // On ne peut pas déterminer le gameId depuis le contrat
    topClickerRecord.seasonId = seasonId
    topClickerRecord.achievedAt = timestamp
    topClickerRecord.achievedAtBlock = blockNumber
    topClickerRecord.lastUpdatedBlock = blockNumber
    topClickerRecord.lastUpdatedTimestamp = timestamp
    topClickerRecord.save()
  }
}

// Fonction pour mettre à jour les records globaux
function updateGlobalRecords(
  playerAddress: Address,
  clicks: BigInt,
  gameId: BigInt,
  seasonId: BigInt,
  blockNumber: BigInt,
  timestamp: BigInt
): void {
  
  let topClickerRecord = GlobalRecord.load("topClicker")
  let player = getOrCreatePlayer(playerAddress, blockNumber, timestamp)
  
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
    topClickerRecord.gameId = gameId  // Maintenant on a le bon gameId
    topClickerRecord.seasonId = seasonId
    topClickerRecord.achievedAt = timestamp
    topClickerRecord.achievedAtBlock = blockNumber
    topClickerRecord.lastUpdatedBlock = blockNumber
    topClickerRecord.lastUpdatedTimestamp = timestamp
    topClickerRecord.save()
  }
}

// Fonction pour synchroniser les données d'un joueur avec le contrat
function syncPlayerDataWithContract(
  contractAddress: Address,
  playerAddress: Address,
  seasonId: BigInt,
  blockNumber: BigInt,
  timestamp: BigInt
): PlayerSeasonStats | null {
  
  // Charger le contrat
  let contract = digitrabbits.bind(contractAddress)
  
  // Appeler getAllPlayersSeasonData
  let callResult = contract.try_getAllPlayersSeasonData()
  
  if (callResult.reverted) {
    // Si l'appel échoue, on retourne null
    return null
  }
  
  let addresses = callResult.value.getAddresses()
  let scores = callResult.value.getScores()
  let totalClicks = callResult.value.getTotalClicks()
  let streaks = callResult.value.getStreak()
  let lastClaimTimestamps = callResult.value.getLastClaimTimestamps()
  let maxClicks = callResult.value.getMaxClicks()
  let gamePlayed = callResult.value.getGamePlayed()
  
  // Chercher l'index du joueur dans les résultats
  let playerIndex = -1
  for (let i = 0; i < addresses.length; i++) {
    if (addresses[i].equals(playerAddress)) {
      playerIndex = i
      break
    }
  }
  
  if (playerIndex == -1) {
    // Joueur pas trouvé dans les données du contrat
    return null
  }
  
  // Créer ou mettre à jour les stats du joueur
  let statsId = playerAddress.toHexString() + "-" + seasonId.toString()
  let stats = PlayerSeasonStats.load(statsId)
  
  if (stats == null) {
    stats = new PlayerSeasonStats(statsId)
    
    // Créer le Player si nécessaire
    let player = getOrCreatePlayer(playerAddress, blockNumber, timestamp)
    
    // Ajouter la saison à la liste des saisons du joueur
    let seasons = player.seasonsParticipated
    if (seasons.indexOf(seasonId) == -1) {
      seasons.push(seasonId)
      player.seasonsParticipated = seasons
      player.save()
    }
    
    stats.player = player.id
    stats.seasonId = seasonId
    stats.firstGameTimestamp = timestamp
      stats.gamesPlayed = ZERO
      stats.gamesStarted = ZERO
      stats.questsClaimed = ZERO
      stats.bestClicksGameId = null // 🔥 NULL car pas requis dans le schéma
      stats.rank = null // 🔥 NULL car pas requis dans le schéma
    
    // INITIALISER TOUS LES CHAMPS REQUIS (avec ! dans le schéma)
    stats.totalClicks = ZERO
    stats.pointsClaimed = ZERO
    stats.bestClicksInGame = ZERO
    stats.averageClicks = ZERO
    stats.currentStreak = ZERO
    stats.longestStreak = ZERO
    stats.leaderboardScore = ZERO
    stats.lastGameTimestamp = timestamp
    stats.lastUpdatedBlock = blockNumber
    stats.lastUpdatedTimestamp = timestamp
  }
  
  // 🎯 UTILISER LES VRAIES DONNÉES DU CONTRAT
  stats.leaderboardScore = scores[playerIndex] // Score calculé par le contrat
  stats.totalClicks = totalClicks[playerIndex] // Total des clicks du contrat
  stats.currentStreak = streaks[playerIndex] // Streak réel du contrat
  stats.bestClicksInGame = maxClicks[playerIndex] // Max clicks du contrat
  stats.gamesPlayed = gamePlayed[playerIndex]
  
  // Calculer la moyenne avec les vraies données
  if (stats.gamesPlayed.gt(ZERO)) {
    stats.averageClicks = stats.totalClicks.div(stats.gamesPlayed)
  } else {
    stats.averageClicks = ZERO
  }
  
  // Mettre à jour le longest streak si nécessaire
  if (stats.currentStreak.gt(stats.longestStreak)) {
    stats.longestStreak = stats.currentStreak
  }

  if (lastClaimTimestamps[playerIndex].gt(ZERO)) {
    stats.pointsClaimed = stats.leaderboardScore
  }

  stats.lastGameTimestamp = timestamp
  stats.lastUpdatedBlock = blockNumber
  stats.lastUpdatedTimestamp = timestamp
  
  stats.save()
  
  return stats
}

// Fonction pour synchroniser TOUS les joueurs de la saison
function syncAllPlayersDataWithContract(
  contractAddress: Address,
  seasonId: BigInt,
  blockNumber: BigInt,
  timestamp: BigInt
): void {
  
  let contract = digitrabbits.bind(contractAddress)
  let callResult = contract.try_getAllPlayersSeasonData()
  
  if (callResult.reverted) {
    return
  }
  
  let addresses = callResult.value.getAddresses()
  let scores = callResult.value.getScores()
  let totalClicks = callResult.value.getTotalClicks()
  let streaks = callResult.value.getStreak()
  let lastClaimTimestamps = callResult.value.getLastClaimTimestamps()
  let maxClicks = callResult.value.getMaxClicks()
  let gamePlayed = callResult.value.getGamePlayed()
  
  // Synchroniser tous les joueurs
  for (let i = 0; i < addresses.length; i++) {
    let playerAddress = addresses[i]
    let statsId = playerAddress.toHexString() + "-" + seasonId.toString()
    let stats = PlayerSeasonStats.load(statsId)
    
    if (stats == null) {
      // Créer les stats si elles n'existent pas
      stats = new PlayerSeasonStats(statsId)
      
      let player = getOrCreatePlayer(playerAddress, blockNumber, timestamp)
      
      // Ajouter la saison à la liste des saisons du joueur
      let seasons = player.seasonsParticipated
      if (seasons.indexOf(seasonId) == -1) {
        seasons.push(seasonId)
        player.seasonsParticipated = seasons
        player.save()
      }
      
      stats.player = player.id
      stats.seasonId = seasonId
      stats.firstGameTimestamp = timestamp
      stats.gamesPlayed = ZERO
      stats.gamesStarted = ZERO
      stats.questsClaimed = ZERO
      stats.bestClicksGameId = null
      stats.rank = null
      
      // INITIALISER TOUS LES CHAMPS REQUIS
      stats.totalClicks = ZERO
      stats.pointsClaimed = ZERO
      stats.bestClicksInGame = ZERO
      stats.averageClicks = ZERO
      stats.currentStreak = ZERO
      stats.longestStreak = ZERO
      stats.leaderboardScore = ZERO
      stats.lastGameTimestamp = timestamp
      stats.lastUpdatedBlock = blockNumber
      stats.lastUpdatedTimestamp = timestamp
    }
    
    // 🎯 SYNCHRONISER AVEC LES VRAIES DONNÉES
    stats.leaderboardScore = scores[i]
    stats.totalClicks = totalClicks[i]
    stats.currentStreak = streaks[i]
    stats.bestClicksInGame = maxClicks[i]
    stats.gamesPlayed = gamePlayed[i]
    
    if (stats.gamesPlayed.gt(ZERO)) {
      stats.averageClicks = stats.totalClicks.div(stats.gamesPlayed)
    } else {
      stats.averageClicks = ZERO
    }
    
    if (stats.currentStreak.gt(stats.longestStreak)) {
      stats.longestStreak = stats.currentStreak
    }

    if (lastClaimTimestamps[i].gt(ZERO)) {
      stats.pointsClaimed = stats.leaderboardScore
    }
    
    stats.lastGameTimestamp = timestamp
    stats.lastUpdatedBlock = blockNumber
    stats.lastUpdatedTimestamp = timestamp
    stats.save()
    
    // Mettre à jour les records globaux si nécessaire
    updateGlobalRecordsFromContract(playerAddress, maxClicks[i], seasonId, blockNumber, timestamp)
  }
}

// 🎯 GESTIONNAIRES D'ÉVÉNEMENTS

export function handleGamePlayed(event: GamePlayedEvent): void {
  // Créer ou récupérer le Player AVANT de sauver l'événement
  let player = getOrCreatePlayer(event.params.player, event.block.number, event.block.timestamp)
  
  // GÉRER LE SEQUENTIAL ID
  let globalStats = getOrCreateGlobalStats()
  globalStats.totalGamesPlayed = globalStats.totalGamesPlayed.plus(ONE)
  let currentSequentialId = globalStats.totalGamesPlayed
  
  // Sauver l'événement original avec les références correctes
  let entity = new GamePlayed(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  )
  entity.sequentialId = currentSequentialId  // ID séquentiel : 1, 2, 3, 4...
  entity.playerAddress = event.params.player  // L'adresse brute
  entity.player = player.id                   // Référence vers l'entité Player
  entity.seasonId = event.params.seasonId
  entity.clicks = event.params.clicks
  entity.blockNumber = event.block.number
  entity.blockTimestamp = event.block.timestamp
  entity.transactionHash = event.transaction.hash
  entity.save()
  
  // Sauvegarder les stats globales avec le nouveau compteur
  globalStats.lastUpdatedBlock = event.block.number
  globalStats.lastUpdatedTimestamp = event.block.timestamp
  globalStats.save()
  
  // SYNCHRONISER AVEC LES VRAIES DONNÉES DU CONTRAT
  let contractAddress = event.address
  let stats = syncPlayerDataWithContract(
    contractAddress,
    event.params.player,
    event.params.seasonId,
    event.block.number,
    event.block.timestamp
  )
  
  if (stats != null) {
    // Mettre à jour bestClicksGameId avec le sequential ID si c'est un nouveau record
    if (event.params.clicks.gt(stats.bestClicksInGame)) {
      stats.bestClicksGameId = currentSequentialId
    }
    
    stats.save()
    
    // Mettre à jour le Player global
    player.totalGamesPlayed = player.totalGamesPlayed.plus(ONE)
    player.totalClicks = stats.totalClicks
    player.currentStreak = stats.currentStreak
    let previousBestClicks = player.bestClicksInGame
    player.bestClicksInGame = stats.bestClicksInGame
    
    // Mettre à jour bestClicksGameId global si c'est un nouveau record
    if (event.params.clicks.gt(previousBestClicks)) {
      player.bestClicksGameId = currentSequentialId
    }
    
    player.lastGameTimestamp = event.block.timestamp
    player.isActive = true
    player.lastUpdatedBlock = event.block.number
    player.lastUpdatedTimestamp = event.block.timestamp
    player.save()
    
    // Mettre à jour les records globaux avec le sequential ID
    updateGlobalRecords(
      event.params.player, 
      event.params.clicks, 
      currentSequentialId, 
      event.params.seasonId, 
      event.block.number, 
      event.block.timestamp
    )
  }
}

export function handleGameStarted(event: GameStartedEvent): void {
  // Créer ou récupérer le Player AVANT de sauver l'événement
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
  
  // Incrémenter le compteur de games started
  let statsId = event.params.player.toHexString() + "-" + event.params.seasonId.toString()
  let stats = PlayerSeasonStats.load(statsId)
  if (stats != null) {
    stats.gamesStarted = stats.gamesStarted.plus(ONE)
    stats.save()
  }
  
  // Mettre à jour le player global
  player.totalGamesStarted = player.totalGamesStarted.plus(ONE)
  player.lastUpdatedBlock = event.block.number
  player.lastUpdatedTimestamp = event.block.timestamp
  player.save()
  
  // Mettre à jour les stats globales
  let globalStats = getOrCreateGlobalStats()
  globalStats.totalGamesStarted = globalStats.totalGamesStarted.plus(ONE)
  globalStats.lastUpdatedBlock = event.block.number
  globalStats.lastUpdatedTimestamp = event.block.timestamp
  globalStats.save()
}

export function handlePlayerAdded(event: PlayerAddedEvent): void {
  // Créer ou récupérer le Player AVANT de sauver l'événement
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
  
  // Synchroniser ce nouveau joueur avec les données du contrat
  syncPlayerDataWithContract(
    event.address,
    event.params.player,
    event.params.seasonId,
    event.block.number,
    event.block.timestamp
  )
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
  
  // Optionnel: Synchroniser tous les joueurs de cette nouvelle saison
  syncAllPlayersDataWithContract(
    event.address,
    event.params.seasonId,
    event.block.number,
    event.block.timestamp
  )
}

export function handleContractPaused(event: ContractPausedEvent): void {
  // Create the event entity
  let entity = new ContractPaused(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  )
  entity.by = event.params.by
  entity.blockNumber = event.block.number
  entity.blockTimestamp = event.block.timestamp
  entity.transactionHash = event.transaction.hash
  entity.save()
  
  // Update global stats
  let globalStats = getOrCreateGlobalStats()
  globalStats.lastUpdatedBlock = event.block.number
  globalStats.lastUpdatedTimestamp = event.block.timestamp
  globalStats.save()
}

export function handleContractUnpaused(event: ContractUnpausedEvent): void {
  // Create the event entity
  let entity = new ContractUnpaused(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  )
  entity.by = event.params.by
  entity.blockNumber = event.block.number
  entity.blockTimestamp = event.block.timestamp
  entity.transactionHash = event.transaction.hash
  entity.save()
  
  // Update global stats
  let globalStats = getOrCreateGlobalStats()
  globalStats.lastUpdatedBlock = event.block.number
  globalStats.lastUpdatedTimestamp = event.block.timestamp
  globalStats.save()
}

export function handleQuestClaimed(event: QuestClaimedEvent): void {
  // Create or get the player
  let player = getOrCreatePlayer(event.params.player, event.block.number, event.block.timestamp)
  
  // Create the event entity
  let entity = new QuestsClaimed(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  )
  entity.playerAddress = event.params.player
  entity.player = player.id
  entity.questId = event.params.questId
  entity.period = event.params.period
  entity.rewardAmount = event.params.rewardAmount
  entity.questTimestamp = event.params.timestamp
  entity.blockNumber = event.block.number
  entity.blockTimestamp = event.block.timestamp
  entity.transactionHash = event.transaction.hash
  entity.save()
  
  // Synchroniser avec les vraies données du contrat pour obtenir le currentSeasonId
  let contract = digitrabbits.bind(event.address)
  let currentSeasonResult = contract.try_currentSeasonId()
  
  if (!currentSeasonResult.reverted) {
    let currentSeasonId = currentSeasonResult.value
    
    // Synchroniser les données du joueur avec le contrat
    let stats = syncPlayerDataWithContract(
      event.address,
      event.params.player,
      currentSeasonId,
      event.block.number,
      event.block.timestamp
    )
    
    if (stats != null) {
      // Incrémenter le compteur de quêtes claimées pour cette saison
      stats.questsClaimed = stats.questsClaimed.plus(ONE)
      stats.save()
    }
  }
  
  // Update player stats
  player.totalQuestsClaimed = player.totalQuestsClaimed.plus(ONE)
  player.lastUpdatedBlock = event.block.number
  player.lastUpdatedTimestamp = event.block.timestamp
  player.save()
  
  // Update global stats
  let globalStats = getOrCreateGlobalStats()
  globalStats.totalQuestsClaimed = globalStats.totalQuestsClaimed.plus(ONE)
  globalStats.lastUpdatedBlock = event.block.number
  globalStats.lastUpdatedTimestamp = event.block.timestamp
  globalStats.save()
}

export function handlePointsClaimed(event: PointsClaimedEvent): void {
  // Créer ou récupérer le Player AVANT de sauver l'événement
  let player = getOrCreatePlayer(event.params.player, event.block.number, event.block.timestamp)
  
  // Créer l'entité de l'événement
  let entity = new PointsClaimed(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  )
  entity.playerAddress = event.params.player  // L'adresse brute
  entity.player = player.id                   // Référence vers l'entité Player
  entity.amount = event.params.amount         // Montant réclamé
  entity.blockNumber = event.block.number
  entity.blockTimestamp = event.block.timestamp
  entity.transactionHash = event.transaction.hash
  entity.save()
  
  // Synchroniser avec les vraies données du contrat pour obtenir le currentSeasonId
  let contract = digitrabbits.bind(event.address)
  let currentSeasonResult = contract.try_currentSeasonId()
  
  if (!currentSeasonResult.reverted) {
    let currentSeasonId = currentSeasonResult.value
    
    // Synchroniser les données du joueur avec le contrat
    let stats = syncPlayerDataWithContract(
      event.address,
      event.params.player,
      currentSeasonId,
      event.block.number,
      event.block.timestamp
    )
    
    if (stats != null) {
      // Les points sont déjà synchronisés via syncPlayerDataWithContract
      stats.pointsClaimed = event.params.amount
      stats.save()
    }
  }
  
  // Mettre à jour les stats du joueur global
  player.totalPointsClaimed = player.totalPointsClaimed.plus(event.params.amount)
  player.lastUpdatedBlock = event.block.number
  player.lastUpdatedTimestamp = event.block.timestamp
  player.save()
  
  // Mettre à jour les stats globales
  let globalStats = getOrCreateGlobalStats()
  globalStats.totalPointsClaimed = globalStats.totalPointsClaimed.plus(event.params.amount)
  globalStats.lastUpdatedBlock = event.block.number
  globalStats.lastUpdatedTimestamp = event.block.timestamp
  globalStats.save()
}

export function handleOwnershipTransferred(event: OwnershipTransferredEvent): void {
  // Create the event entity
  let entity = new OwnershipTransferred(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  )
  entity.previousOwner = event.params.previousOwner
  entity.newOwner = event.params.newOwner
  entity.blockNumber = event.block.number
  entity.blockTimestamp = event.block.timestamp
  entity.transactionHash = event.transaction.hash
  entity.save()
  
  // Update global stats
  let globalStats = getOrCreateGlobalStats()
  globalStats.lastUpdatedBlock = event.block.number
  globalStats.lastUpdatedTimestamp = event.block.timestamp
  globalStats.save()
}
