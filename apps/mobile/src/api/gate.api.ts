import apiClient, { type ApiResponse, type PaginationMeta } from './client';
import type { GatePassApprovalStatusName, GatePassStatusName } from '@/constants';

// ── Types ──

export interface GateEntry {
  id: string;
  studentId: string;
  type: 'IN' | 'OUT';
  gateNo: string;
  timestamp: string;
  linkedLeaveId: string | null;
  notes: string | null;
  student?: { firstName: string; lastName: string; usn: string | null };
  createdAt: string;
}

export interface GatePass {
  id: string;
  studentId: string;
  purpose: string;
  /** Alias for purpose */
  reason: string;
  destination: string | null;
  visitorName: string | null;
  visitorPhone: string | null;
  validFrom: string;
  validTo: string;
  /** Alias for validFrom */
  expectedOut: string;
  /** Alias for validTo */
  expectedIn: string;
  status: GatePassStatusName;
  approvalStatus: GatePassApprovalStatusName;
  student?: { firstName: string; lastName: string; usn: string | null };
  createdAt: string;
}

export interface GateEntryListParams {
  page?: number;
  limit?: number;
  studentId?: string;
  type?: 'IN' | 'OUT';
  lateOnly?: boolean;
  fromDate?: string;
  toDate?: string;
  search?: string;
}

function normalizeGatePass(pass: GatePass): GatePass {
  return {
    ...pass,
    reason: pass.reason ?? pass.purpose,
    destination: pass.destination ?? null,
    expectedOut: pass.expectedOut ?? pass.validFrom,
    expectedIn: pass.expectedIn ?? pass.validTo,
  };
}

function normalizeGatePassResponse(response: any) {
  const data = response.data.data;
  response.data.data = Array.isArray(data)
    ? data.map((pass) => normalizeGatePass(pass))
    : normalizeGatePass(data);
  return response;
}

export interface GatePassListParams {
  page?: number;
  limit?: number;
  studentId?: string;
  status?: GatePassStatusName;
  approvalStatus?: GatePassApprovalStatusName;
  search?: string;
}

// ── Gate API ──

export const gateApi = {
  // Entries
  createEntry: (data: {
    studentId: string;
    type: 'IN' | 'OUT';
    gateNo: string;
    linkedLeaveId?: string;
    notes?: string;
  }) => apiClient.post<ApiResponse<GateEntry>>('/gate/entries', data),

  listEntries: (params?: GateEntryListParams) =>
    apiClient.get<ApiResponse<GateEntry[]> & { meta: PaginationMeta }>('/gate/entries', { params }),

  getEntry: (id: string) =>
    apiClient.get<ApiResponse<GateEntry>>(`/gate/entries/${id}`),

  // Passes
  createPass: (data: {
    studentId?: string;
    purpose: string;
    visitorName?: string;
    visitorPhone?: string;
    validFrom: string;
    validTo: string;
  }) => apiClient.post<ApiResponse<GatePass>>('/gate/passes', data).then(normalizeGatePassResponse),

  listPasses: (params?: GatePassListParams) =>
    apiClient.get<ApiResponse<GatePass[]> & { meta: PaginationMeta }>('/gate/passes', { params }).then(normalizeGatePassResponse),

  getPass: (id: string) =>
    apiClient.get<ApiResponse<GatePass>>(`/gate/passes/${id}`).then(normalizeGatePassResponse),

  updatePass: (id: string, data: { status?: GatePassStatusName; approvalStatus?: GatePassApprovalStatusName }) =>
    apiClient.patch<ApiResponse<GatePass>>(`/gate/passes/${id}`, data).then(normalizeGatePassResponse),

  stats: () =>
    apiClient.get<ApiResponse<Record<string, number>>>('/gate/stats'),
};
