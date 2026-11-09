
import { useMemo, useState } from "react";
import {
  Package,
  Search,
  Boxes,
  AlertTriangle,
  CircleOff,
} from "lucide-react";

type TrackingType = "Bulk" | "Individual";
type StockStatus = "In Stock" | "Low Stock" | "Out of Stock";

interface InventoryItem {
  id: string;
  name: string;
  category: string;
  tracking: TrackingType;
  available: number;
  minimumStock: number;
  location: string;
}

const inventoryItems: InventoryItem[] = [
  {
    id: "CMP-001",
    name: "ESP32 Development Board",
    category: "Microcontrollers",
    tracking: "Individual",
    available: 12,
    minimumStock: 5,
    location: "GREEN-R03-C01-D01",
  },
  {
    id: "CMP-002",
    name: "Ultrasonic Sensor HC-SR04",
    category: "Sensors",
    tracking: "Bulk",
    available: 3,
    minimumStock: 8,
    location: "GREEN-R03-C01-D02",
  },
  {
    id: "CMP-003",
    name: "Jumper Wires",
    category: "Wires & Connectors",
    tracking: "Bulk",
    available: 6,
    minimumStock: 15,
    location: "BLACK-R02-C01-D01",
  },
  {
    id: "CMP-004",
    name: "Digital Multimeter",
    category: "Testing Equipment",
    tracking: "Individual",
    available: 8,
    minimumStock: 2,
    location: "BLACK-R03-C01-D01",
  },
  {
    id: "CMP-005",
    name: "DRV8833 Motor Driver",
    category: "Motor Drivers",
    tracking: "Bulk",
    available: 0,
    minimumStock: 10,
    location: "ORANGE-R02-C01-D01",
  },
  {
    id: "CMP-006",
    name: "NEMA 17 Stepper Motor",
    category: "Motors",
    tracking: "Individual",
    available: 5,
    minimumStock: 3,
    location: "BLACK-R04-C01-D01",
  },
];

function getStockStatus(item: InventoryItem): StockStatus {
  if (item.available === 0) return "Out of Stock";

  if (item.available <= item.minimumStock) {
    return "Low Stock";
  }

  return "In Stock";
}

function InventoryPage() {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All Categories");
  const [status, setStatus] = useState("All Status");

  const categories = [
    "All Categories",
    ...new Set(inventoryItems.map((item) => item.category)),
  ];

  const filteredItems = useMemo(() => {
    return inventoryItems.filter((item) => {
      const searchTerm = search.toLowerCase();

      const matchesSearch =
        item.name.toLowerCase().includes(searchTerm) ||
        item.id.toLowerCase().includes(searchTerm) ||
        item.location.toLowerCase().includes(searchTerm);

      const matchesCategory =
        category === "All Categories" ||
        item.category === category;

      const matchesStatus =
        status === "All Status" ||
        getStockStatus(item) === status;

      return matchesSearch && matchesCategory && matchesStatus;
    });
  }, [search, category, status]);

  const totalItems = inventoryItems.length;
  const lowStock = inventoryItems.filter(
    (item) => getStockStatus(item) === "Low Stock"
  ).length;
  const outOfStock = inventoryItems.filter(
    (item) => getStockStatus(item) === "Out of Stock"
  ).length;

  function statusStyles(stockStatus: StockStatus) {
    switch (stockStatus) {
      case "In Stock":
        return "bg-emerald-50 text-emerald-700";

      case "Low Stock":
        return "bg-amber-50 text-amber-700";

      case "Out of Stock":
        return "bg-red-50 text-red-700";
    }
  }

  return (
    <div className="space-y-6">
      {/* Page heading */}
      <section className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            Inventory
          </h1>

          <p className="mt-1 text-sm text-slate-500">
            Manage and track your robotics components.
          </p>
        </div>

        <span className="w-fit rounded-full bg-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600">
          Demo data
        </span>
      </section>

      {/* Summary cards */}
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <div className="flex items-center justify-between">
            <p className="text-sm text-slate-500">Component Types</p>
            <Package className="text-blue-600" size={21} />
          </div>
          <h2 className="mt-3 text-3xl font-bold text-slate-900">
            {totalItems}
          </h2>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <div className="flex items-center justify-between">
            <p className="text-sm text-slate-500">Low Stock</p>
            <AlertTriangle className="text-amber-500" size={21} />
          </div>
          <h2 className="mt-3 text-3xl font-bold text-amber-600">
            {lowStock}
          </h2>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <div className="flex items-center justify-between">
            <p className="text-sm text-slate-500">Out of Stock</p>
            <CircleOff className="text-red-500" size={21} />
          </div>
          <h2 className="mt-3 text-3xl font-bold text-red-600">
            {outOfStock}
          </h2>
        </div>
      </section>

      {/* Inventory table */}
      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-4 border-b border-slate-100 p-5">
          <div>
            <h2 className="font-semibold text-slate-900">
              All Components
            </h2>
            <p className="mt-1 text-xs text-slate-500">
              Search and filter your inventory.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            {/* Search */}
            <div className="relative md:col-span-1">
              <Search
                size={18}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <input
                type="text"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search components..."
                className="w-full rounded-lg border border-slate-200 py-2.5 pl-10 pr-3 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
            </div>

            {/* Category filter */}
            <select
              value={category}
              onChange={(event) => setCategory(event.target.value)}
              className="rounded-lg border border-slate-200 px-3 py-2.5 text-sm text-slate-700 outline-none focus:border-blue-500"
            >
              {categories.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>

            {/* Status filter */}
            <select
              value={status}
              onChange={(event) => setStatus(event.target.value)}
              className="rounded-lg border border-slate-200 px-3 py-2.5 text-sm text-slate-700 outline-none focus:border-blue-500"
            >
              <option>All Status</option>
              <option>In Stock</option>
              <option>Low Stock</option>
              <option>Out of Stock</option>
            </select>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full min-w-[850px] text-left">
            <thead className="bg-slate-50">
              <tr className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                <th className="px-5 py-4">Component</th>
                <th className="px-5 py-4">Category</th>
                <th className="px-5 py-4">Tracking</th>
                <th className="px-5 py-4">Available</th>
                <th className="px-5 py-4">Storage Location</th>
                <th className="px-5 py-4">Status</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {filteredItems.map((item) => {
                const stockStatus = getStockStatus(item);

                return (
                  <tr
                    key={item.id}
                    className="transition hover:bg-slate-50"
                  >
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="rounded-lg bg-blue-50 p-2.5 text-blue-600">
                          <Boxes size={19} />
                        </div>

                        <div>
                          <p className="text-sm font-semibold text-slate-800">
                            {item.name}
                          </p>
                          <p className="mt-1 text-xs text-slate-400">
                            {item.id}
                          </p>
                        </div>
                      </div>
                    </td>

                    <td className="px-5 py-4 text-sm text-slate-600">
                      {item.category}
                    </td>

                    <td className="px-5 py-4">
                      <span className="rounded-md bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">
                        {item.tracking}
                      </span>
                    </td>

                    <td className="px-5 py-4 text-sm font-semibold text-slate-800">
                      {item.available}
                    </td>

                    <td className="px-5 py-4">
                      <span className="text-xs font-medium text-slate-600">
                        {item.location}
                      </span>
                    </td>

                    <td className="px-5 py-4">
                      <span
                        className={`whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-semibold ${statusStyles(stockStatus)}`}
                      >
                        {stockStatus}
                      </span>
                    </td>
                  </tr>
                );
              })}

              {filteredItems.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-5 py-16 text-center">
                    <Package
                      size={32}
                      className="mx-auto text-slate-300"
                    />
                    <p className="mt-3 text-sm font-medium text-slate-700">
                      No components found
                    </p>
                    <p className="mt-1 text-xs text-slate-400">
                      Try changing your search or filters.
                    </p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="border-t border-slate-100 px-5 py-4">
          <p className="text-xs text-slate-500">
            Showing {filteredItems.length} of {totalItems} component types
          </p>
        </div>
      </section>
    </div>
  );
}

export default InventoryPage;
