// Shared protocol between controller, server, and boat simulator

export interface BoatState {
  id: string;
  lat: number;
  lng: number;
  heading: number; // degrees, 0 = north
  speed: number; // 0-1
  battery: number; // 0-100
  signal: number; // 0-100
  baitLevel: number; // 0-100
  distance: number; // meters from home
  isOnline: boolean;
}

export interface ControlCommand {
  throttle: number; // -1 to 1 (backward to forward)
  rudder: number; // -1 to 1 (left to right)
}

// Messages from Controller → Server → Boat
export type ControllerMessage =
  | { type: 'connect-boat'; boatId: string; controllerId: string }
  | { type: 'control'; command: ControlCommand }
  | { type: 'release-bait' }
  | { type: 'return-home' }
  | { type: 'set-waypoint'; lat: number; lng: number }
  | { type: 'ping' };

// Messages from Boat → Server → Controller
export type BoatMessage =
  | { type: 'register-boat'; id: string }
  | { type: 'state-update'; state: BoatState }
  | { type: 'bait-released'; remaining: number }
  | { type: 'returning-home' }
  | { type: 'arrived-home' }
  | { type: 'pong' };

// Messages from Server → Client
export type ServerMessage =
  | { type: 'boat-found'; boatId: string; state: BoatState }
  | { type: 'boat-offline'; boatId: string }
  | { type: 'error'; message: string }
  | { type: 'connected'; role: 'controller' | 'boat' };
