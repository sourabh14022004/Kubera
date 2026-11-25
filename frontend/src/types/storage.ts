export type StorageColor = "GREEN" | "BLACK" | "ORANGE";

export type StorageRackStatus = "ACTIVE" | "RETIRED";

export type RackStatusFilter = StorageRackStatus | "ALL";

export type TrackingType = "BULK" | "INDIVIDUAL";

export const ALLOWED_DRAWERS: Record<StorageColor, number[]> = {
  GREEN: [3],
  BLACK: [2, 3, 4],
  ORANGE: [2],
};

export interface StorageComponent {
  id: string;
  code: string;
  name: string;
  trackingType: TrackingType;
  quantityAvailable: number | null;
  unit: string;
  minimumStock: number;
}

export interface StorageComponentDetail extends StorageComponent {
  description: string | null;
  category: {
    id: string;
    name: string;
  };
}

export interface StorageDrawer {
  id: string;
  rackId: string;
  drawerNumber: number;
  createdAt: string;
  updatedAt: string;
  locationCode: string;
  components: StorageComponent[];
}

export interface StorageRack {
  id: string;
  color: StorageColor;
  drawersPerRack: number;
  rackNumber: number;
  status: StorageRackStatus;
  retiredAt: string | null;
  createdAt: string;
  updatedAt: string;
  locationCode: string;
  drawers: StorageDrawer[];
}

export interface StorageDrawerDetail {
  id: string;
  rackId: string;
  drawerNumber: number;
  createdAt: string;
  updatedAt: string;
  locationCode: string;
  rack: {
    id: string;
    color: StorageColor;
    drawersPerRack: number;
    rackNumber: number;
    locationCode: string;
  };
  components: StorageComponentDetail[];
}

export type { ApiResponse } from "./api";
