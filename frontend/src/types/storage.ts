
export type StorageColor = "GREEN" | "BLACK" | "ORANGE";

export type TrackingType = "BULK" | "INDIVIDUAL";

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

export interface ApiResponse<T> {
  success: boolean;
  count?: number;
  data: T;
  message?: string;
}
