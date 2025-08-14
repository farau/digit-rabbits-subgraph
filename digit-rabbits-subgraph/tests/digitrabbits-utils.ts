import { newMockEvent } from "matchstick-as"
import { ethereum, Address, BigInt } from "@graphprotocol/graph-ts"
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
} from "../generated/digitrabbits/digitrabbits"

export function createContractPausedEvent(by: Address): ContractPaused {
  let contractPausedEvent = changetype<ContractPaused>(newMockEvent())

  contractPausedEvent.parameters = new Array()

  contractPausedEvent.parameters.push(
    new ethereum.EventParam("by", ethereum.Value.fromAddress(by))
  )

  return contractPausedEvent
}

export function createContractUnpausedEvent(by: Address): ContractUnpaused {
  let contractUnpausedEvent = changetype<ContractUnpaused>(newMockEvent())

  contractUnpausedEvent.parameters = new Array()

  contractUnpausedEvent.parameters.push(
    new ethereum.EventParam("by", ethereum.Value.fromAddress(by))
  )

  return contractUnpausedEvent
}

export function createGamePlayedEvent(
  player: Address,
  seasonId: BigInt,
  clicks: BigInt
): GamePlayed {
  let gamePlayedEvent = changetype<GamePlayed>(newMockEvent())

  gamePlayedEvent.parameters = new Array()

  gamePlayedEvent.parameters.push(
    new ethereum.EventParam("player", ethereum.Value.fromAddress(player))
  )
  gamePlayedEvent.parameters.push(
    new ethereum.EventParam(
      "seasonId",
      ethereum.Value.fromUnsignedBigInt(seasonId)
    )
  )
  gamePlayedEvent.parameters.push(
    new ethereum.EventParam("clicks", ethereum.Value.fromUnsignedBigInt(clicks))
  )

  return gamePlayedEvent
}

export function createGameStartedEvent(
  player: Address,
  seasonId: BigInt,
  sessionEndsAt: BigInt
): GameStarted {
  let gameStartedEvent = changetype<GameStarted>(newMockEvent())

  gameStartedEvent.parameters = new Array()

  gameStartedEvent.parameters.push(
    new ethereum.EventParam("player", ethereum.Value.fromAddress(player))
  )
  gameStartedEvent.parameters.push(
    new ethereum.EventParam(
      "seasonId",
      ethereum.Value.fromUnsignedBigInt(seasonId)
    )
  )
  gameStartedEvent.parameters.push(
    new ethereum.EventParam(
      "sessionEndsAt",
      ethereum.Value.fromUnsignedBigInt(sessionEndsAt)
    )
  )

  return gameStartedEvent
}

export function createItemBoughtEvent(
  player: Address,
  slot: i32,
  level: i32
): ItemBought {
  let itemBoughtEvent = changetype<ItemBought>(newMockEvent())

  itemBoughtEvent.parameters = new Array()

  itemBoughtEvent.parameters.push(
    new ethereum.EventParam("player", ethereum.Value.fromAddress(player))
  )
  itemBoughtEvent.parameters.push(
    new ethereum.EventParam(
      "slot",
      ethereum.Value.fromUnsignedBigInt(BigInt.fromI32(slot))
    )
  )
  itemBoughtEvent.parameters.push(
    new ethereum.EventParam(
      "level",
      ethereum.Value.fromUnsignedBigInt(BigInt.fromI32(level))
    )
  )

  return itemBoughtEvent
}

export function createOwnershipTransferredEvent(
  previousOwner: Address,
  newOwner: Address
): OwnershipTransferred {
  let ownershipTransferredEvent =
    changetype<OwnershipTransferred>(newMockEvent())

  ownershipTransferredEvent.parameters = new Array()

  ownershipTransferredEvent.parameters.push(
    new ethereum.EventParam(
      "previousOwner",
      ethereum.Value.fromAddress(previousOwner)
    )
  )
  ownershipTransferredEvent.parameters.push(
    new ethereum.EventParam("newOwner", ethereum.Value.fromAddress(newOwner))
  )

  return ownershipTransferredEvent
}

export function createPlayerAddedEvent(
  player: Address,
  seasonId: BigInt
): PlayerAdded {
  let playerAddedEvent = changetype<PlayerAdded>(newMockEvent())

  playerAddedEvent.parameters = new Array()

  playerAddedEvent.parameters.push(
    new ethereum.EventParam("player", ethereum.Value.fromAddress(player))
  )
  playerAddedEvent.parameters.push(
    new ethereum.EventParam(
      "seasonId",
      ethereum.Value.fromUnsignedBigInt(seasonId)
    )
  )

  return playerAddedEvent
}

export function createPointsClaimedEvent(
  player: Address,
  amount: BigInt
): PointsClaimed {
  let pointsClaimedEvent = changetype<PointsClaimed>(newMockEvent())

  pointsClaimedEvent.parameters = new Array()

  pointsClaimedEvent.parameters.push(
    new ethereum.EventParam("player", ethereum.Value.fromAddress(player))
  )
  pointsClaimedEvent.parameters.push(
    new ethereum.EventParam("amount", ethereum.Value.fromUnsignedBigInt(amount))
  )

  return pointsClaimedEvent
}

export function createSeasonStartedEvent(seasonId: BigInt): SeasonStarted {
  let seasonStartedEvent = changetype<SeasonStarted>(newMockEvent())

  seasonStartedEvent.parameters = new Array()

  seasonStartedEvent.parameters.push(
    new ethereum.EventParam(
      "seasonId",
      ethereum.Value.fromUnsignedBigInt(seasonId)
    )
  )

  return seasonStartedEvent
}
