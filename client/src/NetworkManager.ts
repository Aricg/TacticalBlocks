import { Client, Room, getStateCallbacks } from 'colyseus.js';

type ServerUnitState = {
  x: number;
  y: number;
  rotation: number;
  team: string;
  unitId: string;
};

type BattleRoomState = {
  units: unknown;
};

export type NetworkUnitSnapshot = {
  unitId: string;
  team: string;
  x: number;
  y: number;
};

type UnitAddedHandler = (unit: NetworkUnitSnapshot) => void;
type UnitRemovedHandler = (unitId: string) => void;

export class NetworkManager {
  private readonly client: Client;
  private readonly roomName: string;
  private room: Room<BattleRoomState> | null = null;
  private detachCallbacks: Array<() => void> = [];

  constructor(
    private readonly onUnitAdded: UnitAddedHandler,
    private readonly onUnitRemoved: UnitRemovedHandler,
    endpoint = 'ws://localhost:2567',
    roomName = 'battle',
  ) {
    this.client = new Client(endpoint);
    this.roomName = roomName;
  }

  public async connect(): Promise<void> {
    if (this.room) {
      return;
    }

    const room = await this.client.joinOrCreate<BattleRoomState>(this.roomName);
    this.room = room;

    const $ = getStateCallbacks(room);
    room.onStateChange.once((state) => {
      const detachUnitAdd = $(state).units.onAdd(
        (serverUnit: ServerUnitState, unitKey: string) => {
          this.onUnitAdded({
            unitId: serverUnit.unitId || unitKey,
            team: serverUnit.team,
            x: serverUnit.x,
            y: serverUnit.y,
          });
        },
        true,
      );
      const detachUnitRemove = $(state).units.onRemove(
        (serverUnit: ServerUnitState, unitKey: string) => {
          this.onUnitRemoved(serverUnit.unitId || unitKey);
        },
      );

      this.detachCallbacks.push(detachUnitAdd, detachUnitRemove);
    });

    room.onError((code, message) => {
      console.error(`Colyseus room error (${code}): ${message ?? 'unknown error'}`);
    });
  }

  public async disconnect(): Promise<void> {
    if (!this.room) {
      return;
    }

    for (const detach of this.detachCallbacks) {
      detach();
    }
    this.detachCallbacks = [];

    const room = this.room;
    this.room = null;
    await room.leave();
  }
}
