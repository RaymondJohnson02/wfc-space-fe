import {
  HubConnection,
  HubConnectionBuilder,
  LogLevel,
} from "@microsoft/signalr";

export function createSignalRConnection(): HubConnection {
  return new HubConnectionBuilder()
    .withUrl("http://localhost:5226/hubs/room")
    .withAutomaticReconnect()
    .configureLogging(LogLevel.Information)
    .build();
}