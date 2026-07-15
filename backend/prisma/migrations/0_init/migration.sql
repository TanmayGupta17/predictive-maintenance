-- CreateEnum
CREATE TYPE "DeviceType" AS ENUM ('PUMP', 'MOTOR', 'COMPRESSOR', 'GENERATOR', 'CONVEYOR', 'TURBINE', 'SENSOR', 'OTHER');

-- CreateEnum
CREATE TYPE "DeviceStatus" AS ENUM ('ONLINE', 'OFFLINE', 'WARNING', 'CRITICAL', 'MAINTENANCE', 'DECOMMISSIONED');

-- CreateEnum
CREATE TYPE "TelemetryMetric" AS ENUM ('TEMPERATURE', 'VIBRATION', 'PRESSURE', 'HUMIDITY', 'VOLTAGE', 'CURRENT', 'RPM', 'POWER', 'NOISE', 'OTHER');

-- CreateEnum
CREATE TYPE "AlertSeverity" AS ENUM ('INFO', 'WARNING', 'CRITICAL');

-- CreateEnum
CREATE TYPE "AlertStatus" AS ENUM ('OPEN', 'ACKNOWLEDGED', 'RESOLVED', 'DISMISSED');

-- CreateEnum
CREATE TYPE "AlertHistoryAction" AS ENUM ('CREATED', 'ACKNOWLEDGED', 'STATUS_CHANGED', 'SEVERITY_CHANGED', 'UPDATED', 'RESOLVED', 'DISMISSED');

-- CreateTable
CREATE TABLE "devices" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "DeviceType" NOT NULL,
    "location" TEXT NOT NULL,
    "healthScore" INTEGER NOT NULL DEFAULT 100,
    "status" "DeviceStatus" NOT NULL DEFAULT 'ONLINE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "devices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "telemetry" (
    "id" TEXT NOT NULL,
    "deviceId" TEXT NOT NULL,
    "metric" "TelemetryMetric" NOT NULL,
    "value" DECIMAL(18,6) NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL,
    "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "telemetry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "alerts" (
    "id" TEXT NOT NULL,
    "deviceId" TEXT NOT NULL,
    "metric" "TelemetryMetric",
    "ruleKey" TEXT,
    "severity" "AlertSeverity" NOT NULL,
    "confidenceScore" INTEGER,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "reason" TEXT,
    "recommendation" TEXT,
    "status" "AlertStatus" NOT NULL DEFAULT 'OPEN',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvedAt" TIMESTAMP(3),

    CONSTRAINT "alerts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "alert_history" (
    "id" TEXT NOT NULL,
    "alertId" TEXT NOT NULL,
    "fromStatus" "AlertStatus",
    "toStatus" "AlertStatus",
    "fromSeverity" "AlertSeverity",
    "toSeverity" "AlertSeverity",
    "action" "AlertHistoryAction" NOT NULL,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "alert_history_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "devices_status_idx" ON "devices"("status");

-- CreateIndex
CREATE INDEX "devices_type_idx" ON "devices"("type");

-- CreateIndex
CREATE INDEX "devices_location_idx" ON "devices"("location");

-- CreateIndex
CREATE INDEX "telemetry_deviceId_metric_timestamp_idx" ON "telemetry"("deviceId", "metric", "timestamp" DESC);

-- CreateIndex
CREATE INDEX "telemetry_deviceId_timestamp_idx" ON "telemetry"("deviceId", "timestamp" DESC);

-- CreateIndex
CREATE INDEX "telemetry_metric_timestamp_idx" ON "telemetry"("metric", "timestamp" DESC);

-- CreateIndex
CREATE INDEX "telemetry_timestamp_idx" ON "telemetry"("timestamp" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "telemetry_deviceId_metric_timestamp_key" ON "telemetry"("deviceId", "metric", "timestamp");

-- CreateIndex
CREATE INDEX "alerts_deviceId_metric_ruleKey_status_idx" ON "alerts"("deviceId", "metric", "ruleKey", "status");

-- CreateIndex
CREATE INDEX "alerts_deviceId_status_createdAt_idx" ON "alerts"("deviceId", "status", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "alerts_severity_status_idx" ON "alerts"("severity", "status");

-- CreateIndex
CREATE INDEX "alerts_status_createdAt_idx" ON "alerts"("status", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "alert_history_alertId_createdAt_idx" ON "alert_history"("alertId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "alert_history_action_createdAt_idx" ON "alert_history"("action", "createdAt" DESC);

-- AddForeignKey
ALTER TABLE "telemetry" ADD CONSTRAINT "telemetry_deviceId_fkey" FOREIGN KEY ("deviceId") REFERENCES "devices"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "alerts" ADD CONSTRAINT "alerts_deviceId_fkey" FOREIGN KEY ("deviceId") REFERENCES "devices"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "alert_history" ADD CONSTRAINT "alert_history_alertId_fkey" FOREIGN KEY ("alertId") REFERENCES "alerts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

