import React from 'react';
import { Badge } from './Badge';
import {
  type LeaveStatusName,
  type ComplaintStatusName,
  type GatePassStatusName,
  type AttendanceStatusName,
} from '@/constants';

// ── Status → Badge variant mapping ──

type StatusVariant = 'default' | 'success' | 'warning' | 'error' | 'info';

const LEAVE_STATUS_MAP: Record<LeaveStatusName, { label: string; variant: StatusVariant }> = {
  PENDING: { label: 'Pending', variant: 'warning' },
  PARENT_APPROVED: { label: 'Parent Approved', variant: 'info' },
  PARENT_REJECTED: { label: 'Parent Rejected', variant: 'error' },
  WARDEN_APPROVED: { label: 'Approved', variant: 'success' },
  REJECTED: { label: 'Rejected', variant: 'error' },
  CANCELLED: { label: 'Cancelled', variant: 'default' },
};

const COMPLAINT_STATUS_MAP: Record<ComplaintStatusName, { label: string; variant: StatusVariant }> = {
  OPEN: { label: 'Open', variant: 'warning' },
  ASSIGNED: { label: 'Assigned', variant: 'info' },
  IN_PROGRESS: { label: 'In Progress', variant: 'info' },
  RESOLVED: { label: 'Resolved', variant: 'success' },
  CLOSED: { label: 'Closed', variant: 'default' },
  REOPENED: { label: 'Reopened', variant: 'error' },
};

const GATE_PASS_STATUS_MAP: Record<GatePassStatusName, { label: string; variant: StatusVariant }> = {
  ACTIVE: { label: 'Active', variant: 'success' },
  USED: { label: 'Used', variant: 'default' },
  EXPIRED: { label: 'Expired', variant: 'error' },
  CANCELLED: { label: 'Cancelled', variant: 'default' },
};

const ATTENDANCE_STATUS_MAP: Record<AttendanceStatusName, { label: string; variant: StatusVariant }> = {
  PRESENT: { label: 'Present', variant: 'success' },
  ABSENT: { label: 'Absent', variant: 'error' },
  ON_LEAVE: { label: 'On Leave', variant: 'info' },
  LATE: { label: 'Late', variant: 'warning' },
  UNKNOWN: { label: 'Unknown', variant: 'default' },
};

// ── Components ──

export function LeaveStatusBadge({ status }: { status: LeaveStatusName }) {
  const config = LEAVE_STATUS_MAP[status] ?? { label: status, variant: 'default' as StatusVariant };
  return <Badge label={config.label} variant={config.variant} dot />;
}

export function ComplaintStatusBadge({ status }: { status: ComplaintStatusName }) {
  const config = COMPLAINT_STATUS_MAP[status] ?? { label: status, variant: 'default' as StatusVariant };
  return <Badge label={config.label} variant={config.variant} dot />;
}

export function GatePassStatusBadge({ status }: { status: GatePassStatusName }) {
  const config = GATE_PASS_STATUS_MAP[status] ?? { label: status, variant: 'default' as StatusVariant };
  return <Badge label={config.label} variant={config.variant} dot />;
}

export function AttendanceStatusBadge({ status }: { status: AttendanceStatusName }) {
  const config = ATTENDANCE_STATUS_MAP[status] ?? { label: status, variant: 'default' as StatusVariant };
  return <Badge label={config.label} variant={config.variant} dot />;
}
