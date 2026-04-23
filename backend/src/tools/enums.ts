export enum BinType {
  // mixed waste
  GENERAL = 'general',
  // plastic packaging
  PLASTIC = 'plastic',
  // paper / cardboard
  PAPER = 'paper',
  // bottle / glass
  GLASS = 'glass',
  // food / compost
  ORGANIC = 'organic',
  // cans
  METAL = 'metal',
  // e-waste
  ELECTRONIC = 'electronic',
  // auto-register or unconfigured bin
  UNKNOWN = 'unknown',
}

export enum BinStatus {
  // bin working normally
  ACTIVE = 'active',
  // temporarily disabled
  INACTIVE = 'inactive',
  // being repaired
  MAINTENANCE = 'maintenance',
  // bin removed from system
  REMOVED = 'removed',
  // auto-created but not configured
  UNVERIFIED = 'unverified',
}

export enum AlertType {
  // bin reached critical fill level
  OVERFLOW = 'overflow',
  // bin reached critical battery level
  LOW_BATTERY = 'low_battery',
  // sensor error
  SENSOR_FAILURE = 'sensor_failure',
  // no data received for long time
  SENSOR_INACTIVE = 'sensor_inactive',
  // unusual fill pattern
  ABNORMAL_FILL_RATE = 'abnormal_fill_rate',
}

export enum AlertStatus {
  // active problem
  OPEN = 'open',
  // someone saw it
  ACKNOWLEDGED = 'acknowledged',
  // issue fixed
  RESOLVED = 'resolved',
}

export enum RouteStatus {
  // created by AI
  GENERATED = 'generated',
  // truck currently collecting
  IN_PROGRESS = 'in_progress',
  // route finished
  COMPLETED = 'completed',
  // route abandoned
  CANCELLED = 'cancelled',
}

export enum PredictionTrend {
  STABLE = 'stable',
  INCREASING = 'increasing',
  INCREASING_FAST = 'increasing_fast',
  DECREASING = 'decreasing',
}

export enum ResponseStatusEnum {
  ERROR = 'error',
  SUCCESS = 'success',
}
