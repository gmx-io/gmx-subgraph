import { log } from "@graphprotocol/graph-ts";

export function notNullOrDie<T>(value: T | null): T {
  if (value === null) {
    log.warning("Value is null", []);
    throw new Error("Value is null");
  }

  return value as T;
}
