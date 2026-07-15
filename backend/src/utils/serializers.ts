import type { Alert, Device, Telemetry } from '@prisma/client';

export function serializeTelemetry(telemetry: Telemetry) {
  return {
    ...telemetry,
    value: Number(telemetry.value),
  };
}

export function serializeDevice(device: Device) {
  return device;
}

export function serializeAlert(alert: Alert & { device?: Pick<Device, 'id' | 'name' | 'type' | 'location'> }) {
  return alert;
}
