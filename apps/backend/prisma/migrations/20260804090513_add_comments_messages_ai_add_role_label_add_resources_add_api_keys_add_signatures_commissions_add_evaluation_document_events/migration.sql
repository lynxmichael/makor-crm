-- CreateEnum
CREATE TYPE "WorkflowTrigger" AS ENUM ('DEAL_STAGE_CHANGED', 'DEAL_CREATED', 'QUOTE_SENT', 'QUOTE_ACCEPTED', 'QUOTE_REJECTED', 'PURCHASE_ORDER_SIGNED', 'CONTRACT_ACTIVATED', 'INVOICE_SENT', 'INVOICE_PAID', 'INVOICE_OVERDUE', 'CUSTOMER_CREATED', 'LEAD_CREATED', 'ACTIVITY_OVERDUE', 'CAMPAIGN_FINISHED', 'SIGNATURE_SIGNED', 'SIGNATURE_REFUSED');

-- CreateEnum
CREATE TYPE "WorkflowActionType" AS ENUM ('NOTIFY_USER', 'NOTIFY_ROLE', 'SEND_EMAIL', 'CREATE_ACTIVITY', 'ASSIGN_OWNER', 'UPDATE_FIELD', 'POST_COMMENT', 'CALL_WEBHOOK');

-- CreateEnum
CREATE TYPE "WorkflowRunStatus" AS ENUM ('SUCCESS', 'PARTIAL', 'FAILED', 'SKIPPED');

-- CreateEnum
CREATE TYPE "CancellationReason" AS ENUM ('CLIENT_INDISPONIBLE', 'CLIENT_REPORTE', 'CLIENT_DESISTE', 'COMMERCIAL_INDISPONIBLE', 'DOUBLON', 'AUTRE');

-- CreateEnum
CREATE TYPE "DocumentEventType" AS ENUM ('VIEWED', 'DOWNLOADED', 'SENT', 'PREVIEWED');

-- AlterTable
ALTER TABLE "Activity" ADD COLUMN     "cancellationNote" TEXT,
ADD COLUMN     "cancellationReason" "CancellationReason",
ADD COLUMN     "cancelledAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "Workflow" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "trigger" "WorkflowTrigger" NOT NULL,
    "conditions" JSONB NOT NULL DEFAULT '[]',
    "delayMinutes" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "maxRunsPerDay" INTEGER NOT NULL DEFAULT 500,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Workflow_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkflowAction" (
    "id" TEXT NOT NULL,
    "workflowId" TEXT NOT NULL,
    "type" "WorkflowActionType" NOT NULL,
    "config" JSONB NOT NULL DEFAULT '{}',
    "position" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WorkflowAction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkflowRun" (
    "id" TEXT NOT NULL,
    "workflowId" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "status" "WorkflowRunStatus" NOT NULL,
    "result" JSONB NOT NULL DEFAULT '{}',
    "skipReason" TEXT,
    "durationMs" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WorkflowRun_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DocumentEvent" (
    "id" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "type" "DocumentEventType" NOT NULL,
    "userId" TEXT,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DocumentEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Workflow_trigger_isActive_idx" ON "Workflow"("trigger", "isActive");

-- CreateIndex
CREATE INDEX "WorkflowAction_workflowId_position_idx" ON "WorkflowAction"("workflowId", "position");

-- CreateIndex
CREATE INDEX "WorkflowRun_workflowId_createdAt_idx" ON "WorkflowRun"("workflowId", "createdAt");

-- CreateIndex
CREATE INDEX "WorkflowRun_entityType_entityId_idx" ON "WorkflowRun"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "DocumentEvent_documentId_createdAt_idx" ON "DocumentEvent"("documentId", "createdAt");

-- CreateIndex
CREATE INDEX "DocumentEvent_type_idx" ON "DocumentEvent"("type");

-- AddForeignKey
ALTER TABLE "Workflow" ADD CONSTRAINT "Workflow_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkflowAction" ADD CONSTRAINT "WorkflowAction_workflowId_fkey" FOREIGN KEY ("workflowId") REFERENCES "Workflow"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkflowRun" ADD CONSTRAINT "WorkflowRun_workflowId_fkey" FOREIGN KEY ("workflowId") REFERENCES "Workflow"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentEvent" ADD CONSTRAINT "DocumentEvent_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "Document"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentEvent" ADD CONSTRAINT "DocumentEvent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
