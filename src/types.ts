export interface ProjectRow {
  projectId: string;
  projectName: string;
  projectType: string;
  location: string;
  startDate: string;
  endDate: string;
  projectStatus: string;
  priority: string;
  taskId: string;
  taskName: string;
  taskStatus: string;
  assignedTo: string;
  hoursSpent: number;
  budget: number;
  actualCost: number;
  progress: number;
}

export interface ApiResponse {
  status: "success" | "warning" | "error";
  message?: string;
  source: "live" | "cache" | "expired_cache" | "static_fallback";
  data: ProjectRow[];
  lastUpdated: string;
}

export interface KPIStats {
  totalBudget: number;
  totalActualCost: number;
  avgProgress: number;
  totalTasks: number;
  completedTasks: number;
  completedTasksPercentage: number;
  uniqueProjectsCount: number;
}
