import { Server } from "socket.io";
import { DefaultEventsMap } from "socket.io/dist/typed-events";

export type IO = Server<
  DefaultEventsMap,
  DefaultEventsMap,
  DefaultEventsMap,
  any
>;
