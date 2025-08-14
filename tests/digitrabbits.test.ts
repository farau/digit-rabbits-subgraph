import {
  assert,
  describe,
  test,
  clearStore,
  beforeAll,
  afterAll
} from "matchstick-as/assembly/index"
import { Address, BigInt } from "@graphprotocol/graph-ts"
import { ContractPaused } from "../generated/schema"
import { ContractPaused as ContractPausedEvent } from "../generated/digitrabbits/digitrabbits"
import { handleContractPaused } from "../src/digitrabbits"
import { createContractPausedEvent } from "./digitrabbits-utils"

// Tests structure (matchstick-as >=0.5.0)
// https://thegraph.com/docs/en/subgraphs/developing/creating/unit-testing-framework/#tests-structure

describe("Describe entity assertions", () => {
  beforeAll(() => {
    let by = Address.fromString("0x0000000000000000000000000000000000000001")
    let newContractPausedEvent = createContractPausedEvent(by)
    handleContractPaused(newContractPausedEvent)
  })

  afterAll(() => {
    clearStore()
  })

  // For more test scenarios, see:
  // https://thegraph.com/docs/en/subgraphs/developing/creating/unit-testing-framework/#write-a-unit-test

  test("ContractPaused created and stored", () => {
    assert.entityCount("ContractPaused", 1)

    // 0xa16081f360e3847006db660bae1c6d1b2e17ec2a is the default address used in newMockEvent() function
    assert.fieldEquals(
      "ContractPaused",
      "0xa16081f360e3847006db660bae1c6d1b2e17ec2a-1",
      "by",
      "0x0000000000000000000000000000000000000001"
    )

    // More assert options:
    // https://thegraph.com/docs/en/subgraphs/developing/creating/unit-testing-framework/#asserts
  })
})
