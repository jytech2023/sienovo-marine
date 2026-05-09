export type ComponentStatus = 'normal' | 'warning' | 'damaged' | 'offline';

export type ComponentKey =
  | 'motor'
  | 'battery'
  | 'gps'
  | 'camera'
  | 'light'
  | 'baitDispenser'
  | 'rudder'
  | 'link';

export type ComponentMap = Record<ComponentKey, ComponentStatus>;

export type BoatState = {
  id: string;
  lat: number;
  lng: number;
  heading: number;
  speed: number;
  battery: number;
  signal: number;
  baitLevel: number;
  distance: number;
  depth: number;
  waterTemp: number;
  ir: boolean;
  light: boolean;
  isOnline: boolean;
  components: ComponentMap;
};

export type BoatCommand = {
  throttle: number;
  rudder: number;
};

export type TrailPoint = {
  lat: number;
  lng: number;
};

export type Waypoint = {
  id: number;
  lat: number;
  lng: number;
};

export type LogLevel = 'info' | 'success' | 'warn' | 'error' | 'control';

export type LogEntry = {
  id: number;
  level: LogLevel;
  message: string;
  time: string;
};

export type ConnectionStatus = 'offline' | 'online' | 'connected';

export type IncomingMessage =
  | { type: 'controller-connected'; controllerId: string }
  | { type: 'control'; command: BoatCommand }
  | { type: 'release-bait' }
  | { type: 'return-home' }
  | { type: 'set-waypoint'; lat: number; lng: number }
  | { type: 'clear-waypoints' }
  | { type: 'bait-at-waypoint'; lat: number; lng: number }
  | { type: 'set-camera-mode'; ir?: boolean; light?: boolean }
  | { type: 'set-fault'; component: ComponentKey; status: ComponentStatus };
