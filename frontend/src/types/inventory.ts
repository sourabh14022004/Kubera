import type { Pagination } from "./api";
import type { StorageColor, StorageRackStatus, TrackingType } from "./storage";

export type ActiveStatusFilter = "ACTIVE" | "INACTIVE" | "ALL";
export type StockStatusFilter = "LOW_STOCK" | "OUT_OF_STOCK" | "IN_STOCK";

export interface ComponentCategory {
  id: string;
  name: string;
  description: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  _count?: {
    components: number;
  };
}

export interface ComponentItem {
  id: string;
  code: string;
  name: string;
  description: string | null;
  categoryId: string;
  trackingType: TrackingType;
  quantityAvailable: number | null;
  unit: string;
  minimumStock: number;
  storageDrawerId: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  locationCode: string | null;
  category: {
    id: string;
    name: string;
  };
  storageDrawer: {
    id: string;
    drawerNumber: number;
    rack: {
      color: StorageColor;
      drawersPerRack: number;
      rackNumber: number;
      status: StorageRackStatus;
    };
  } | null;
  _count?: {
    assets: number;
    movements: number;
  };
}

export interface CreateComponentPayload {
  code: string;
  name: string;
  categoryId: string;
  trackingType: TrackingType;
  description?: string | null;
  initialQuantity?: number;
  unit?: string;
  minimumStock?: number;
  storageDrawerId?: string | null;
}

export interface UpdateComponentPayload {
  code?: string;
  name?: string;
  description?: string | null;
  categoryId?: string;
  unit?: string;
  minimumStock?: number;
  storageDrawerId?: string | null;
}

export type AssetStatus =
  | "AVAILABLE"
  | "CHECKED_OUT"
  | "UNDER_MAINTENANCE"
  | "DAMAGED"
  | "LOST"
  | "RETIRED";

export type AssetStatusFilter = AssetStatus | "ALL";

export interface AssetItem {
  id: string;
  componentId: string;
  assetTag: string;
  serialNumber: string | null;
  status: AssetStatus;
  checkedOutToId: string | null;
  checkedOutAt: string | null;
  acquiredAt: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  locationCode: string | null;
  component: {
    id: string;
    code: string;
    name: string;
    trackingType: TrackingType;
    storageDrawer: {
      drawerNumber: number;
      rack: {
        color: StorageColor;
        drawersPerRack: number;
        rackNumber: number;
      };
    } | null;
  };
}

export type LoanStatus = "OUTSTANDING" | "OVERDUE" | "CLOSED";
export type LoanListStatusFilter = LoanStatus | "ALL";

export interface LoanItem {
  id: string;
  componentId: string;
  assetId: string | null;
  memberId: string;
  issuedById: string;
  quantityBorrowed: number;
  quantityReturned: number;
  quantityWrittenOff: number;
  checkedOutAt: string;
  dueAt: string | null;
  note: string | null;
  createdAt: string;
  updatedAt: string;
  outstandingQuantity: number;
  loanStatus: LoanStatus;
  member: {
    id: string;
    name: string;
    email: string;
  };
  issuedBy: {
    id: string;
    name: string;
    email: string;
  };
  component: {
    id: string;
    code: string;
    name: string;
    trackingType?: TrackingType;
  };
  asset: {
    id: string;
    assetTag: string;
    status: AssetStatus;
  } | null;
}

export type InventoryMovementType =
  | "STOCK_IN"
  | "CHECKOUT"
  | "RETURN"
  | "ADJUSTMENT"
  | "MARK_DAMAGED"
  | "MARK_LOST"
  | "RETIRE";

export interface LoanDetail extends LoanItem {
  movements: Array<{
    id: string;
    movementType: InventoryMovementType;
    quantityChange: number;
    note: string | null;
    createdAt: string;
    performedBy: {
      id: string;
      name: string;
      email: string;
    };
  }>;
}

export interface LoanSummary {
  totalLoans: number;
  outstandingLoans: number;
  overdueLoans: number;
  closedLoans: number;
  totalOutstandingQuantity: number;
}

export interface MemberLoanSummary {
  member: {
    id: string;
    name: string;
    email: string;
  };
  summary: {
    totalLoans: number;
    outstandingLoans: number;
    overdueLoans: number;
    closedLoans: number;
    totalBorrowedQuantity: number;
    totalReturnedQuantity: number;
    totalWrittenOffQuantity: number;
    totalOutstandingQuantity: number;
  };
}

export interface InventoryOverview {
  components: {
    active: number;
    inactive: number;
    individual: number;
    bulk: number;
  };
  categories: {
    active: number;
  };
  bulkInventory: {
    totalAvailableUnits: number;
    lowStockComponents: number;
    outOfStockComponents: number;
  };
}

export interface StockAlertItem {
  id: string;
  code: string;
  name: string;
  unit: string;
  quantityAvailable: number | null;
  minimumStock: number;
  stockStatus: "LOW_STOCK" | "OUT_OF_STOCK";
  locationCode: string | null;
  category: {
    id: string;
    name: string;
  };
  storageDrawer: {
    drawerNumber: number;
    rack: {
      color: StorageColor;
      drawersPerRack: number;
      rackNumber: number;
    };
  } | null;
}

export interface InventoryMovement {
  id: string;
  componentId: string;
  assetId: string | null;
  movementType: InventoryMovementType;
  quantityChange: number;
  performedById: string;
  memberId: string | null;
  loanId: string | null;
  note: string | null;
  createdAt: string;
  component: {
    id: string;
    code: string;
    name: string;
    trackingType: TrackingType;
  };
  performedBy: {
    id: string;
    name: string;
    email: string;
  };
  member: {
    id: string;
    name: string;
    email: string;
  } | null;
  asset: {
    id: string;
    assetTag: string;
  } | null;
  loan: {
    id: string;
    quantityBorrowed: number;
    quantityReturned: number;
    quantityWrittenOff: number;
  } | null;
}

export interface MovementHistoryResponse {
  movements: InventoryMovement[];
  pagination: Pagination;
}
