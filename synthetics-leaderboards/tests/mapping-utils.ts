import { newMockEvent } from "matchstick-as"
import { ethereum, Address, Bytes } from "@graphprotocol/graph-ts"
import {
  EventLog,
  EventLog1,
  EventLog2
} from "../generated/EventEmitter/EventEmitter"

export function createEventLogEvent(
  msgSender: Address,
  eventName: string,
  eventNameHash: string,
  eventData: ethereum.Tuple
): EventLog {
  let eventLogEvent = changetype<EventLog>(newMockEvent())

  eventLogEvent.parameters = new Array()

  eventLogEvent.parameters.push(
    new ethereum.EventParam("msgSender", ethereum.Value.fromAddress(msgSender))
  )
  eventLogEvent.parameters.push(
    new ethereum.EventParam("eventName", ethereum.Value.fromString(eventName))
  )
  eventLogEvent.parameters.push(
    new ethereum.EventParam(
      "eventNameHash",
      ethereum.Value.fromString(eventNameHash)
    )
  )
  eventLogEvent.parameters.push(
    new ethereum.EventParam("eventData", ethereum.Value.fromTuple(eventData))
  )

  return eventLogEvent
}

export function createEventLog1Event(
  msgSender: Address,
  eventName: string,
  eventNameHash: string,
  topic1: Bytes,
  eventData: ethereum.Tuple
): EventLog1 {
  let eventLog1Event = changetype<EventLog1>(newMockEvent())

  eventLog1Event.parameters = new Array()

  eventLog1Event.parameters.push(
    new ethereum.EventParam("msgSender", ethereum.Value.fromAddress(msgSender))
  )
  eventLog1Event.parameters.push(
    new ethereum.EventParam("eventName", ethereum.Value.fromString(eventName))
  )
  eventLog1Event.parameters.push(
    new ethereum.EventParam(
      "eventNameHash",
      ethereum.Value.fromString(eventNameHash)
    )
  )
  eventLog1Event.parameters.push(
    new ethereum.EventParam("topic1", ethereum.Value.fromFixedBytes(topic1))
  )
  eventLog1Event.parameters.push(
    new ethereum.EventParam("eventData", ethereum.Value.fromTuple(eventData))
  )

  return eventLog1Event
}

export function createEventLog2Event(
  msgSender: Address,
  eventName: string,
  eventNameHash: string,
  topic1: Bytes,
  topic2: Bytes,
  eventData: ethereum.Tuple
): EventLog2 {
  let eventLog2Event = changetype<EventLog2>(newMockEvent())

  eventLog2Event.parameters = new Array()

  eventLog2Event.parameters.push(
    new ethereum.EventParam("msgSender", ethereum.Value.fromAddress(msgSender))
  )
  eventLog2Event.parameters.push(
    new ethereum.EventParam("eventName", ethereum.Value.fromString(eventName))
  )
  eventLog2Event.parameters.push(
    new ethereum.EventParam(
      "eventNameHash",
      ethereum.Value.fromString(eventNameHash)
    )
  )
  eventLog2Event.parameters.push(
    new ethereum.EventParam("topic1", ethereum.Value.fromFixedBytes(topic1))
  )
  eventLog2Event.parameters.push(
    new ethereum.EventParam("topic2", ethereum.Value.fromFixedBytes(topic2))
  )
  eventLog2Event.parameters.push(
    new ethereum.EventParam("eventData", ethereum.Value.fromTuple(eventData))
  )

  return eventLog2Event
}
