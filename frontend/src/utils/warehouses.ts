export interface Warehouse {
  id: string;
  name: string;
  city: string;
  state: string;
  street: string;
}

// Company warehouses/facilities shown in the "Saved Warehouse" origin picker
// and used by the map to render warehouse-pickup markers.
export const WAREHOUSES: Warehouse[] = [
  {
    id: "sf",
    name: "Talaria SF Hub",
    city: "Oakland",
    state: "California",
    street: "2550 Mandela Parkway",
  },
  {
    id: "la",
    name: "Talaria LA Gateway",
    city: "Commerce",
    state: "California",
    street: "5650 S Eastern Ave",
  },
  {
    id: "chicago",
    name: "Talaria Chicago Sort",
    city: "Hodgkins",
    state: "Illinois",
    street: "7900 Santa Fe Dr",
  },
  {
    id: "dallas",
    name: "Talaria Dallas Hub",
    city: "Dallas",
    state: "Texas",
    street: "4501 Duncanville Rd",
  },
  {
    id: "atlanta",
    name: "Talaria Atlanta Gateway",
    city: "College Park",
    state: "Georgia",
    street: "4100 Inglis Rd",
  },
  {
    id: "newark",
    name: "Talaria Newark Freight",
    city: "Newark",
    state: "New Jersey",
    street: "700 Doremus Ave",
  },
];

// True when an origin/destination string refers to one of the known Talaria
// facility addresses (normalized, whitespace-insensitive).
export const isWarehouseOrigin = (origin?: string): boolean => {
  if (!origin) return false;
  const n = origin.toLowerCase().replace(/\s+/g, "");
  return WAREHOUSES.some((w) => {
    const address = `${w.street}, ${w.city}, ${w.state}`
      .toLowerCase()
      .replace(/\s+/g, "");
    return n.startsWith(address);
  });
};