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
  SeasonStarted
} from "../generated/schema"

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

export function handleGamePlayed(event: GamePlayedEvent): void {
  let entity = new GamePlayed(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  )
  entity.player = event.params.player
  entity.seasonId = event.params.seasonId
  entity.clicks = event.params.clicks

  entity.blockNumber = event.block.number
  entity.blockTimestamp = event.block.timestamp
  entity.transactionHash = event.transaction.hash

  entity.save()
}

export function handleGameStarted(event: GameStartedEvent): void {
  let entity = new GameStarted(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  )
  entity.player = event.params.player
  entity.seasonId = event.params.seasonId
  entity.sessionEndsAt = event.params.sessionEndsAt

  entity.blockNumber = event.block.number
  entity.blockTimestamp = event.block.timestamp
  entity.transactionHash = event.transaction.hash

  entity.save()
}

export function handleItemBought(event: ItemBoughtEvent): void {
  let entity = new ItemBought(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  )
  entity.player = event.params.player
  entity.slot = event.params.slot
  entity.level = event.params.level

  entity.blockNumber = event.block.number
  entity.blockTimestamp = event.block.timestamp
  entity.transactionHash = event.transaction.hash

  entity.save()
}

export function handleOwnershipTransferred(
  event: OwnershipTransferredEvent
): void {
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
  let entity = new PlayerAdded(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  )
  entity.player = event.params.player
  entity.seasonId = event.params.seasonId

  entity.blockNumber = event.block.number
  entity.blockTimestamp = event.block.timestamp
  entity.transactionHash = event.transaction.hash

  entity.save()
}

export function handlePointsClaimed(event: PointsClaimedEvent): void {
  let entity = new PointsClaimed(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  )
  entity.player = event.params.player
  entity.amount = event.params.amount

  entity.blockNumber = event.block.number
  entity.blockTimestamp = event.block.timestamp
  entity.transactionHash = event.transaction.hash

  entity.save()
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
