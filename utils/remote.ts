import { RemoteSourceType } from "./dataTypes";

export function getCreatedByForRemote(source: RemoteSourceType, id: string) {
  return `${source}:::${id}`;
}
