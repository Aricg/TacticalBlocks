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

export type NetworkUnitPositionUpdate = {
  unitId: string;
  x: number;
  y: number;
};

type UnitAddedHandler = (unit: NetworkUnitSnapshot) => void;
type UnitRemovedHandler = (unitId: string) => void;
type TeamAssignedHandler = (team: string) => void;
type UnitPositionChangedHandler = (position: NetworkUnitPositionUpdate) => void;

type TeamAssignedMessage = {
  team: string;
};

export class NetworkManager {
  private readonly client: Client;
  private readonly roomName: string;
  private room: Room<BattleRoomState> | null = null;
  private detachCallbacks: Array<() => void> = [];

  constructor(
    private readonly onUnitAdded: UnitAddedHandler,
    private readonly onUnitRemoved: UnitRemovedHandler,
    private readonly onTeamAssigned: TeamAssignedHandler,
    private readonly onUnitPositionChanged: UnitPositionChangedHandler,
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

    room.onMessage('teamAssigned', (message: TeamAssignedMessage) => {
      this.onTeamAssigned(message.team);
    });

    const $ = getStateCallbacks(room);
    room.onStateChange.once((state) => {
      const detachUnitAdd = $(state).units.onAdd(
        (serverUnit: ServerUnitState, unitKey: string) => {
          const unitId = serverUnit.unitId || unitKey;
          this.onUnitAdded({
            unitId,
            team: serverUnit.team,
            x: serverUnit.x,
            y: serverUnit.y,
          });

          const detachX = $(serverUnit).listen('x', (x: number) => {
            this.onUnitPositionChanged({
              unitId,
              x,
              y: serverUnit.y,
            });
          });
          const detachY = $(serverUnit).listen('y', (y: number) => {
            this.onUnitPositionChanged({
              unitId,
              x: serverUnit.x,
              y,
            });
          });
          this.detachCallbacks.push(detachX, detachY);
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

  public sendUnitPosition(position: NetworkUnitPositionUpdate): void {
    if (!this.room) {
      return;
    }

    this.room.send('unitPosition', position);
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
