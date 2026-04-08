export type FloorPlan = {
  id: string;
  name: string;
  image_url: string;
  grid_x: number;
  grid_y: number;
  created_at: string;
};

export type Spotter = {
  id: string;
  floor_plan_id: string;
  location_id: string;
  location_name: string;
  x_coord: number;
  y_coord: number;
  created_at: string;
};

export type Issue = {
  id: string;
  spotter_id: string;
  component: string;
  level: number;
  depth: number;
  issue_type: string;
  priority: string;
  action_to_take: string;
  status: string;
  details: string;
  repaired_at: string | null;
  created_at: string;
};

export type IssuePhoto = {
  id: string;
  issue_id: string;
  photo_url: string;
  display_order: number;
  created_at: string;
};

export type Component = {
  id: string;
  name: string;
  is_active: boolean;
  created_at: string;
};
