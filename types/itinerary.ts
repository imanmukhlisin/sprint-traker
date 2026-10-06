export interface TaskItem {
  taskId: string;
  time: string;
  title: string;
  address?: string;
  category: string;
  venueType?: "Indoor (AC)" | "Outdoor";
  planBTitle?: string;
  planBAddress?: string;
  isPlanBActive?: boolean;
  description: string;
  tips?: string;
  mapsUrl?: string;
  addedBy?: "Princess" | "Copilot";
  rating?: number;
  memoryNote?: string;
  distanceKm?: number;
  lat?: number;
  lng?: number;
}

export type PickupStatus = "preparing" | "otw" | "arrived";

export interface DayColumn {
  dayId: string;
  dayTitle: string;
  tasks: TaskItem[];
  pickupTime?: string;
  pickupLocation?: string;
  pickupStatus?: PickupStatus;
  pickupNotes?: string;
}
