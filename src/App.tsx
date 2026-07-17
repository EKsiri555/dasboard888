import React, { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  TrendingUp,
  DollarSign,
  CheckCircle2,
  AlertCircle,
  Search,
  MapPin,
  RefreshCw,
  FolderKanban,
  Activity,
  Layers,
  ChevronDown,
  ChevronUp,
  X,
  SlidersHorizontal,
  Download,
  Database,
  Calendar,
  Clock,
  Briefcase,
  User,
  ExternalLink,
  Info
} from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  AreaChart,
  Area
} from "recharts";
import { ProjectRow, ApiResponse, KPIStats } from "./types";

const COLORS = ["#10B981", "#3B82F6", "#F59E0B", "#EF4444", "#8B5CF6", "#EC4899"];
const TASK_STATUS_COLORS: Record<string, string> = {
  "Completed": "#10B981", // Emerald
  "In Progress": "#3B82F6", // Blue
  "Pending": "#F59E0B", // Amber
  "Behind": "#EF4444" // Red
};

export default function App() {
  // States
  const [rawData, setRawData] = useState<ProjectRow[]>([]);
  const [apiMeta, setApiMeta] = useState<{
    source: string;
    lastUpdated: string;
    status: string;
    message?: string;
  } | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [toast, setToast] = useState<{ message: string; type: "success" | "info" | "warning" } | null>(null);

  // Filters State
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedLocation, setSelectedLocation] = useState("All");
  const [selectedTaskStatus, setSelectedTaskStatus] = useState("All");
  const [selectedProjectType, setSelectedProjectType] = useState("All");
  const [selectedPriority, setSelectedPriority] = useState("All");
  const [selectedProjectStatus, setSelectedProjectStatus] = useState("All");
  
  // UI states
  const [isFilterPanelOpen, setIsFilterPanelOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  // Fetch Data
  const fetchData = async (forceRefresh = false) => {
    try {
      if (forceRefresh) {
        setRefreshing(true);
        await fetch("/api/dashboard-refresh", { method: "POST" });
      } else {
        setLoading(true);
      }
      
      const res = await fetch("/api/dashboard-data");
      if (!res.ok) throw new Error("ไม่สามารถเชื่อมต่อกับ API แดชบอร์ดได้");
      
      const json: ApiResponse = await res.json();
      if (json.status === "error") throw new Error(json.message || "เกิดข้อผิดพลาดในการดึงข้อมูล");
      
      setRawData(json.data);
      setApiMeta({
        source: json.source,
        lastUpdated: json.lastUpdated,
        status: json.status,
        message: json.message
      });
      setError(null);

      if (forceRefresh) {
        showToast("รีเฟรชข้อมูลจาก Google Sheets สำเร็จแล้ว!", "success");
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || "เกิดข้อผิดพลาดในการดึงข้อมูลโครงการ");
      showToast("ล้มเหลวในการอัปเดตข้อมูลสด", "warning");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Helper to show Toast Notification without window.alert
  const showToast = (message: string, type: "success" | "info" | "warning" = "success") => {
    setToast({ message, type });
    setTimeout(() => {
      setToast(null);
    }, 4000);
  };

  // Get unique filter choices dynamically from rawData
  const filterOptions = useMemo(() => {
    const locations = new Set<string>();
    const taskStatuses = new Set<string>();
    const projectTypes = new Set<string>();
    const priorities = new Set<string>();
    const projectStatuses = new Set<string>();

    rawData.forEach((row) => {
      if (row.location) locations.add(row.location);
      if (row.taskStatus) taskStatuses.add(row.taskStatus);
      if (row.projectType) projectTypes.add(row.projectType);
      if (row.priority) priorities.add(row.priority);
      if (row.projectStatus) projectStatuses.add(row.projectStatus);
    });

    return {
      locations: ["All", ...Array.from(locations).sort()],
      taskStatuses: ["All", ...Array.from(taskStatuses).sort()],
      projectTypes: ["All", ...Array.from(projectTypes).sort()],
      priorities: ["All", ...Array.from(priorities).sort()],
      projectStatuses: ["All", ...Array.from(projectStatuses).sort()],
    };
  }, [rawData]);

  // Reset Filters
  const resetFilters = () => {
    setSearchQuery("");
    setSelectedLocation("All");
    setSelectedTaskStatus("All");
    setSelectedProjectType("All");
    setSelectedPriority("All");
    setSelectedProjectStatus("All");
    setCurrentPage(1);
    showToast("รีเซ็ตตัวกรองทั้งหมดแล้ว", "info");
  };

  // Filtered Data
  const filteredData = useMemo(() => {
    return rawData.filter((row) => {
      const matchSearch =
        searchQuery === "" ||
        row.projectName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        row.taskName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        row.assignedTo.toLowerCase().includes(searchQuery.toLowerCase()) ||
        row.projectId.toLowerCase().includes(searchQuery.toLowerCase());

      const matchLocation = selectedLocation === "All" || row.location === selectedLocation;
      const matchTaskStatus = selectedTaskStatus === "All" || row.taskStatus === selectedTaskStatus;
      const matchProjectType = selectedProjectType === "All" || row.projectType === selectedProjectType;
      const matchPriority = selectedPriority === "All" || row.priority === selectedPriority;
      const matchProjectStatus = selectedProjectStatus === "All" || row.projectStatus === selectedProjectStatus;

      return matchSearch && matchLocation && matchTaskStatus && matchProjectType && matchPriority && matchProjectStatus;
    });
  }, [rawData, searchQuery, selectedLocation, selectedTaskStatus, selectedProjectType, selectedPriority, selectedProjectStatus]);

  // Pagination Management
  const paginatedData = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredData.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredData, currentPage]);

  const totalPages = Math.ceil(filteredData.length / itemsPerPage) || 1;

  // KPI Calculations
  const stats: KPIStats = useMemo(() => {
    if (filteredData.length === 0) {
      return {
        totalBudget: 0,
        totalActualCost: 0,
        avgProgress: 0,
        totalTasks: 0,
        completedTasks: 0,
        completedTasksPercentage: 0,
        uniqueProjectsCount: 0
      };
    }

    const uniqueProjects = new Set<string>();
    let sumBudget = 0;
    let sumActualCost = 0;
    let sumProgress = 0;
    let completedCount = 0;

    filteredData.forEach((row) => {
      uniqueProjects.add(row.projectId);
      sumBudget += row.budget;
      sumActualCost += row.actualCost;
      sumProgress += row.progress;
      
      if (row.taskStatus.toLowerCase() === "completed" || row.progress >= 1.0) {
        completedCount++;
      }
    });

    return {
      totalBudget: sumBudget,
      totalActualCost: sumActualCost,
      avgProgress: (sumProgress / filteredData.length) * 100,
      totalTasks: filteredData.length,
      completedTasks: completedCount,
      completedTasksPercentage: (completedCount / filteredData.length) * 100,
      uniqueProjectsCount: uniqueProjects.size
    };
  }, [filteredData]);

  // Chart Data 1: Budget vs Actual Cost by Location
  const chartDataByLocation = useMemo(() => {
    const locationMap: Record<string, { budget: number; actualCost: number }> = {};
    
    filteredData.forEach((row) => {
      const loc = row.location || "Unknown";
      if (!locationMap[loc]) {
        locationMap[loc] = { budget: 0, actualCost: 0 };
      }
      locationMap[loc].budget += row.budget;
      locationMap[loc].actualCost += row.actualCost;
    });

    return Object.keys(locationMap).map((loc) => ({
      name: loc,
      งบประมาณ: Math.round(locationMap[loc].budget),
      จ่ายจริง: Math.round(locationMap[loc].actualCost)
    }));
  }, [filteredData]);

  // Chart Data 2: Task Status Distribution
  const chartDataByTaskStatus = useMemo(() => {
    const statusMap: Record<string, number> = {};
    filteredData.forEach((row) => {
      const status = row.taskStatus || "Unknown";
      statusMap[status] = (statusMap[status] || 0) + 1;
    });

    return Object.keys(statusMap).map((status) => ({
      name: status,
      value: statusMap[status]
    }));
  }, [filteredData]);

  // Chart Data 3: Progress & Project Status by Project
  const chartDataByProject = useMemo(() => {
    const projectMap: Record<string, { totalProgress: number; count: number; name: string }> = {};
    
    filteredData.forEach((row) => {
      const id = row.projectId;
      const name = row.projectName;
      if (!projectMap[id]) {
        projectMap[id] = { totalProgress: 0, count: 0, name: name };
      }
      projectMap[id].totalProgress += row.progress;
      projectMap[id].count += 1;
    });

    return Object.keys(projectMap).map((id) => ({
      id: id,
      shortName: projectMap[id].name.length > 25 ? `${projectMap[id].name.slice(0, 25)}...` : projectMap[id].name,
      fullName: projectMap[id].name,
      ความคืบหน้า: Math.round((projectMap[id].totalProgress / projectMap[id].count) * 100)
    }));
  }, [filteredData]);

  // Format currency helpers
  const formatTHB = (val: number) => {
    return new Intl.NumberFormat("th-TH", {
      style: "currency",
      currency: "THB",
      maximumFractionDigits: 0
    }).format(val);
  };

  // Export filtered data as JSON
  const handleExportJSON = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(filteredData, null, 2));
    const downloadAnchor = document.createElement("a");
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `project_dashboard_export_${Date.now()}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    showToast("ส่งออกข้อมูลเป็นไฟล์ JSON สำเร็จ!", "success");
  };

  return (
    <div className="h-screen bg-[#f8fafc] text-[#334155] flex flex-col font-sans overflow-hidden select-none selection:bg-indigo-100 selection:text-indigo-900">
      {/* Toast Alert Banner */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -50, scale: 0.95 }}
            animate={{ opacity: 1, y: 12, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            className={`fixed top-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 px-3.5 py-2 rounded border shadow-lg text-xs font-semibold ${
              toast.type === "success"
                ? "bg-emerald-50 border-emerald-200 text-emerald-800"
                : toast.type === "warning"
                ? "bg-amber-50 border-amber-200 text-amber-800"
                : "bg-indigo-50 border-indigo-200 text-indigo-800"
            }`}
          >
            {toast.type === "success" ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : toast.type === "warning" ? (
              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
            ) : (
              <Info className="w-4 h-4 text-indigo-600 shrink-0" />
            )}
            <span>{toast.message}</span>
            <button
              onClick={() => setToast(null)}
              className="ml-1.5 hover:bg-black/5 p-0.5 rounded-full transition-colors cursor-pointer"
            >
              <X className="w-3.5 h-3.5 opacity-60 hover:opacity-100" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* High Density Top Header Nav */}
      <nav className="h-12 border-b border-slate-200 bg-white flex items-center justify-between px-4 shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 bg-indigo-600 rounded flex items-center justify-center text-white font-black text-xs shadow-sm shrink-0">
            P
          </div>
          <div className="flex items-baseline gap-2">
            <h1 className="text-sm font-black tracking-tight text-slate-800 uppercase">
              Project Management Dashboard
            </h1>
            <span className="text-[9px] font-bold text-slate-400 font-mono bg-slate-100 px-1 py-0.2 rounded uppercase">
              v.2.4.0
            </span>
          </div>

          {apiMeta && (
            <span className={`hidden sm:inline-flex items-center gap-1 text-[9px] font-bold px-2 py-0.5 rounded border ${
              apiMeta.source === "live"
                ? "bg-emerald-50 border-emerald-150 text-emerald-800"
                : "bg-amber-50 border-amber-150 text-amber-800"
            }`}>
              <span className={`w-1.5 h-1.5 rounded-full ${apiMeta.source === "live" ? "bg-emerald-500 animate-pulse" : "bg-amber-500"}`}></span>
              {apiMeta.source === "live" ? "Live Sheets" : "Fallback Cache"}
            </span>
          )}
        </div>

        <div className="flex items-center gap-3">
          {/* Quick search input in navbar */}
          <div className="relative hidden md:block">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1.5" />
            <input
              type="text"
              placeholder="ค้นหาโครงการ, งานย่อย, ผู้รับผิดชอบ..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              className="w-64 bg-slate-50 border border-slate-200 rounded py-1 pl-8 pr-7 text-[11px] font-medium focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:bg-white text-slate-800 transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-2 top-1.5 p-0.5 hover:bg-slate-200 rounded-full text-slate-500 cursor-pointer"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>

          {/* Sync Metadata */}
          {apiMeta && (
            <div className="hidden lg:flex items-center gap-1.5 text-[10px] font-semibold text-slate-400">
              <Clock className="w-3 h-3" />
              <span>ซิงค์ล่าสุด: {new Date(apiMeta.lastUpdated).toLocaleTimeString("th-TH")} น.</span>
            </div>
          )}

          {/* Refresh Action */}
          <button
            onClick={() => fetchData(true)}
            disabled={refreshing || loading}
            className="p-1.5 bg-slate-50 border border-slate-200 hover:border-indigo-300 hover:bg-indigo-50 text-slate-600 hover:text-indigo-600 rounded transition-colors cursor-pointer disabled:opacity-50"
            title="รีเฟรชข้อมูลจากแผ่นงาน"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? "animate-spin" : ""}`} />
          </button>

          {/* User initials badge */}
          <div className="w-7 h-7 rounded-full bg-indigo-50 border border-indigo-150 flex items-center justify-center text-indigo-700 text-[11px] font-black" title="sirichott@gmail.com">
            SC
          </div>
        </div>
      </nav>

      {/* Main Container Layout */}
      <main className="flex-1 flex flex-col gap-3.5 p-3.5 overflow-hidden min-h-0">
        {/* Error Alert Display */}
        {error && (
          <div className="p-2.5 bg-rose-50 border border-rose-200 text-rose-800 rounded text-xs flex items-start gap-2 shrink-0">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <div className="flex-1">
              <span className="font-bold">เชื่อมต่อข้อมูลล้มเหลว: </span>
              <span>{error}</span>
              <button
                onClick={() => fetchData()}
                className="ml-3 font-black text-rose-950 hover:underline cursor-pointer"
              >
                ลองใหม่อีกครั้ง
              </button>
            </div>
          </div>
        )}

        {/* Global Loading View */}
        {loading ? (
          <div className="flex-1 flex flex-col items-center justify-center space-y-3">
            <div className="w-8 h-8 border-2 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
            <p className="text-xs font-semibold text-slate-500 animate-pulse">กำลังดึงข้อมูลเรียลไทม์...</p>
          </div>
        ) : (
          <>
            {/* KPI Cards Strip */}
            <section className="grid grid-cols-2 lg:grid-cols-4 gap-3 shrink-0">
              {/* Card 1: Budget */}
              <div className="bg-white border border-slate-200 p-3 rounded shadow-xs relative overflow-hidden flex flex-col justify-between">
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-0.5">งบประมาณรวม</p>
                  <h3 className="text-lg font-black text-slate-800 tracking-tight">
                    {formatTHB(stats.totalBudget)}
                  </h3>
                </div>
                <div className="mt-1 flex items-center justify-between text-[10px]">
                  <span className="text-emerald-600 font-bold">จากทั้งหมด {stats.totalTasks} รายการ</span>
                  <span className="text-slate-400">Budget</span>
                </div>
              </div>

              {/* Card 2: Actual Cost */}
              <div className="bg-white border border-slate-200 p-3 rounded shadow-xs relative overflow-hidden flex flex-col justify-between">
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-0.5">จ่ายจริงสะสม</p>
                  <h3 className="text-lg font-black text-slate-800 tracking-tight">
                    {formatTHB(stats.totalActualCost)}
                  </h3>
                </div>
                <div className="mt-1 flex items-center justify-between text-[10px]">
                  <span className="text-slate-500 font-semibold">
                    ใช้ไป {stats.totalBudget ? ((stats.totalActualCost / stats.totalBudget) * 100).toFixed(1) : 0}% ของงบ
                  </span>
                  <span className="text-slate-400">Actual Cost</span>
                </div>
              </div>

              {/* Card 3: Average Progress */}
              <div className="bg-white border border-slate-200 p-3 rounded shadow-xs relative overflow-hidden flex flex-col justify-between">
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1">ความคืบหน้าเฉลี่ย</p>
                  <div className="flex items-baseline justify-between mb-1">
                    <h3 className="text-lg font-black text-indigo-900 tracking-tight">
                      {stats.avgProgress.toFixed(1)}%
                    </h3>
                    <span className="text-[9px] text-slate-400">เฉลี่ยภาพรวม</span>
                  </div>
                  <div className="w-full bg-slate-100 h-1 rounded-full overflow-hidden">
                    <div
                      className="bg-indigo-600 h-full rounded-full transition-all duration-500"
                      style={{ width: `${stats.avgProgress}%` }}
                    ></div>
                  </div>
                </div>
              </div>

              {/* Card 4: Tasks Rate */}
              <div className="bg-white border border-slate-200 p-3 rounded shadow-xs relative overflow-hidden flex flex-col justify-between">
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-0.5">งานแล้วเสร็จ (Completed)</p>
                  <h3 className="text-lg font-black text-slate-800 tracking-tight">
                    {stats.completedTasksPercentage.toFixed(1)}%
                  </h3>
                </div>
                <div className="mt-1 flex items-center justify-between text-[10px]">
                  <span className="text-indigo-600 font-bold">
                    เสร็จแล้ว {stats.completedTasks} จาก {stats.totalTasks} งานย่อย
                  </span>
                  <span className="text-slate-400">Tasks</span>
                </div>
              </div>
            </section>

            {/* Filter Controls Bar */}
            <section className="bg-white border border-slate-200 p-2.5 rounded shadow-xs shrink-0 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 font-sans">
              <div className="flex flex-wrap items-center gap-2">
                {/* Advanced Filters Toggle */}
                <button
                  onClick={() => setIsFilterPanelOpen(!isFilterPanelOpen)}
                  className={`px-2.5 py-1.5 text-xs font-bold border rounded flex items-center gap-1.5 transition-colors cursor-pointer ${
                    isFilterPanelOpen
                      ? "bg-indigo-50 border-indigo-200 text-indigo-700"
                      : "bg-white border-slate-200 hover:bg-slate-50 text-slate-700"
                  }`}
                >
                  <SlidersHorizontal className="w-3.5 h-3.5" />
                  <span>ตัวกรองเสริม ({
                    (selectedLocation !== "All" ? 1 : 0) +
                    (selectedProjectType !== "All" ? 1 : 0) +
                    (selectedProjectStatus !== "All" ? 1 : 0) +
                    (selectedTaskStatus !== "All" ? 1 : 0) +
                    (selectedPriority !== "All" ? 1 : 0)
                  })</span>
                  {isFilterPanelOpen ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                </button>

                {/* Quick mobile search (if navbar input is hidden on mobile) */}
                <div className="relative block md:hidden flex-1 max-w-xs">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2 top-2" />
                  <input
                    type="text"
                    placeholder="ค้นหาด่วน..."
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                      setCurrentPage(1);
                    }}
                    className="w-full bg-slate-50 border border-slate-200 rounded py-1 pl-7 pr-2 text-[11px]"
                  />
                </div>

                {/* Active indicator */}
                <span className="text-xs text-slate-400 font-semibold px-1">
                  กรองพบ: <strong className="text-slate-800">{filteredData.length}</strong> แถว
                </span>
              </div>

              {/* Quick Actions (Reset & Export) */}
              <div className="flex items-center gap-2 self-end sm:self-auto">
                {(selectedLocation !== "All" ||
                  selectedTaskStatus !== "All" ||
                  selectedProjectType !== "All" ||
                  selectedPriority !== "All" ||
                  selectedProjectStatus !== "All" ||
                  searchQuery !== "") && (
                  <button
                    onClick={resetFilters}
                    className="px-2.5 py-1.5 text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-600 rounded transition-colors cursor-pointer"
                  >
                    ล้างตัวกรอง
                  </button>
                )}

                <button
                  onClick={handleExportJSON}
                  disabled={filteredData.length === 0}
                  className="px-2.5 py-1.5 text-xs font-bold bg-indigo-50 border border-indigo-200 text-indigo-700 rounded hover:bg-indigo-100 transition-colors cursor-pointer disabled:opacity-50 inline-flex items-center gap-1 shadow-xs"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>ส่งออก JSON</span>
                </button>
              </div>
            </section>

            {/* Filter panel dropdown drawer */}
            <AnimatePresence>
              {isFilterPanelOpen && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.15 }}
                  className="bg-white border border-slate-200 p-3 rounded shadow-xs shrink-0 overflow-hidden"
                >
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3.5 font-sans">
                    {/* Location dropdown */}
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">พื้นที่โครงการ</label>
                      <select
                        value={selectedLocation}
                        onChange={(e) => { setSelectedLocation(e.target.value); setCurrentPage(1); }}
                        className="w-full bg-slate-50 border border-slate-200 text-xs font-semibold rounded px-2.5 py-1.5 focus:outline-none focus:border-indigo-500 text-slate-700"
                      >
                        {filterOptions.locations.map((loc) => (
                          <option key={loc} value={loc}>
                            {loc === "All" ? "ทั้งหมด (All Locations)" : loc}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Project Type dropdown */}
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">ประเภทโครงการ</label>
                      <select
                        value={selectedProjectType}
                        onChange={(e) => { setSelectedProjectType(e.target.value); setCurrentPage(1); }}
                        className="w-full bg-slate-50 border border-slate-200 text-xs font-semibold rounded px-2.5 py-1.5 focus:outline-none focus:border-indigo-500 text-slate-700"
                      >
                        {filterOptions.projectTypes.map((type) => (
                          <option key={type} value={type}>
                            {type === "All" ? "ทั้งหมด (All Types)" : type}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Project Status dropdown */}
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">สถานะโครงการหลัก</label>
                      <select
                        value={selectedProjectStatus}
                        onChange={(e) => { setSelectedProjectStatus(e.target.value); setCurrentPage(1); }}
                        className="w-full bg-slate-50 border border-slate-200 text-xs font-semibold rounded px-2.5 py-1.5 focus:outline-none focus:border-indigo-500 text-slate-700"
                      >
                        {filterOptions.projectStatuses.map((pStatus) => (
                          <option key={pStatus} value={pStatus}>
                            {pStatus === "All" ? "ทั้งหมด (All Statuses)" : pStatus}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Task Status dropdown */}
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">สถานะงานย่อย</label>
                      <select
                        value={selectedTaskStatus}
                        onChange={(e) => { setSelectedTaskStatus(e.target.value); setCurrentPage(1); }}
                        className="w-full bg-slate-50 border border-slate-200 text-xs font-semibold rounded px-2.5 py-1.5 focus:outline-none focus:border-indigo-500 text-slate-700"
                      >
                        {filterOptions.taskStatuses.map((tStatus) => (
                          <option key={tStatus} value={tStatus}>
                            {tStatus === "All" ? "ทั้งหมด (All Statuses)" : tStatus}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Priority dropdown */}
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">ความเร่งด่วน</label>
                      <select
                        value={selectedPriority}
                        onChange={(e) => { setSelectedPriority(e.target.value); setCurrentPage(1); }}
                        className="w-full bg-slate-50 border border-slate-200 text-xs font-semibold rounded px-2.5 py-1.5 focus:outline-none focus:border-indigo-500 text-slate-700"
                      >
                        {filterOptions.priorities.map((prio) => (
                          <option key={prio} value={prio}>
                            {prio === "All" ? "ทั้งหมด (All Priorities)" : prio}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Split Screen Columns Layout */}
            <section className="flex-1 flex flex-col lg:flex-row gap-4 min-h-0 overflow-auto lg:overflow-hidden">
              
              {/* LEFT COLUMN: Detailed Project breakdown table (flex-[1.8]) */}
              <div className="flex-[1.8] bg-white border border-slate-200 rounded shadow-xs flex flex-col overflow-hidden min-h-[380px]">
                {/* Panel Header */}
                <div className="px-4 py-2 bg-slate-50 border-b border-slate-200 flex items-center justify-between shrink-0">
                  <h2 className="text-[10px] font-black text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5 text-indigo-500" />
                    <span>Detailed Project Breakdown</span>
                  </h2>
                  <span className="text-[9px] font-bold text-slate-400 uppercase font-mono">
                    {paginatedData.length} records in view
                  </span>
                </div>

                {/* Scrollable Table View */}
                <div className="flex-1 overflow-auto">
                  <table className="w-full text-left text-xs border-collapse font-sans">
                    <thead className="sticky top-0 bg-white border-b border-slate-200 z-10 text-slate-400 font-bold text-[9px] uppercase tracking-wider">
                      <tr>
                        <th className="py-2.5 px-3.5 w-[50px] pl-4">ID</th>
                        <th className="py-2.5 px-3.5 min-w-[150px]">Project / Task</th>
                        <th className="py-2.5 px-3.5 w-[110px]">Location</th>
                        <th className="py-2.5 px-3.5 w-[90px]">Budget</th>
                        <th className="py-2.5 px-3.5 w-[90px]">Actual</th>
                        <th className="py-2.5 px-3.5 min-w-[100px]">Progress</th>
                        <th className="py-2.5 px-3.5 text-center w-[90px] pr-4">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                      {paginatedData.length > 0 ? (
                        paginatedData.map((row) => {
                          const progressPercent = Math.round(row.progress * 100);
                          const isCompleted = row.taskStatus === "Completed" || row.progress >= 1.0;
                          return (
                            <tr key={`${row.projectId}-${row.taskId}`} className="hover:bg-indigo-50/20 transition-colors">
                              <td className="py-2 px-3.5 pl-4 font-mono text-[10px] text-indigo-600 font-bold">{row.projectId}</td>
                              <td className="py-2 px-3.5">
                                <div className="font-bold text-slate-800 line-clamp-1">{row.projectName}</div>
                                <div className="text-[10px] text-slate-400 flex items-center gap-1.5 mt-0.5">
                                  <span className="bg-slate-100 text-slate-600 px-1 py-0.2 rounded text-[9px] font-mono font-bold shrink-0">{row.taskId}</span>
                                  <span className="truncate">{row.taskName}</span>
                                </div>
                              </td>
                              <td className="py-2 px-3.5 text-slate-500">
                                <div className="flex items-center gap-1 text-[11px] font-semibold text-slate-600">
                                  <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                                  <span className="truncate">{row.location}</span>
                                </div>
                                <div className="text-[9px] text-slate-400 font-semibold mt-0.5">{row.projectType}</div>
                              </td>
                              <td className="py-2 px-3.5 font-bold text-slate-800">{formatTHB(row.budget)}</td>
                              <td className="py-2 px-3.5 font-bold text-emerald-700">{formatTHB(row.actualCost)}</td>
                              <td className="py-2 px-3.5">
                                <div className="flex items-center gap-1.5">
                                  <div className="flex-1 bg-slate-100 h-1 rounded-full overflow-hidden max-w-[50px]">
                                    <div className={`h-full ${isCompleted ? "bg-emerald-500" : "bg-indigo-600"}`} style={{ width: `${progressPercent}%` }}></div>
                                  </div>
                                  <span className="text-[10px] text-slate-500 font-bold font-mono shrink-0">{progressPercent}%</span>
                                </div>
                                <div className="text-[9px] text-slate-400 font-semibold mt-0.5">ใช้ไป {row.hoursSpent} ชม.</div>
                              </td>
                              <td className="py-2 px-3.5 text-center pr-4">
                                <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold border ${
                                  row.taskStatus === "Completed"
                                    ? "bg-emerald-50 border-emerald-200 text-emerald-700"
                                    : row.taskStatus === "In Progress"
                                    ? "bg-blue-50 border-blue-200 text-blue-700"
                                    : "bg-amber-50 border-amber-200 text-amber-700"
                                }`}>
                                  <span className={`w-1 h-1 rounded-full ${row.taskStatus === "Completed" ? "bg-emerald-500" : row.taskStatus === "In Progress" ? "bg-blue-500 animate-pulse" : "bg-amber-500"}`}></span>
                                  {row.taskStatus}
                                </span>
                              </td>
                            </tr>
                          );
                        })
                      ) : (
                        <tr>
                          <td colSpan={7} className="py-12 text-center text-slate-400 font-medium">ไม่พบรายการที่ตรงกับเงื่อนไขดึงข้อมูล</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Pagination Foot bar */}
                {filteredData.length > 0 && (
                  <div className="px-4 py-2 bg-slate-50 border-t border-slate-200 flex items-center justify-between shrink-0 text-[10px] font-black text-slate-500">
                    <span>
                      หน้า {currentPage} / {totalPages} (รายการ {(((currentPage - 1) * itemsPerPage) + 1)} - {Math.min(currentPage * itemsPerPage, filteredData.length)} ของ {filteredData.length})
                    </span>

                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                        disabled={currentPage === 1}
                        className="px-2.5 py-1 bg-white border border-slate-200 hover:bg-slate-50 rounded disabled:opacity-50 transition-colors shadow-xs cursor-pointer"
                      >
                        ก่อนหน้า
                      </button>
                      <button
                        onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                        disabled={currentPage === totalPages}
                        className="px-2.5 py-1 bg-white border border-slate-200 hover:bg-slate-50 rounded disabled:opacity-50 transition-colors shadow-xs cursor-pointer"
                      >
                        ถัดไป
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* RIGHT COLUMN: Analytics widgets sidebar (flex-[1]) */}
              <div className="flex-[1] flex flex-col gap-3.5 overflow-y-auto min-h-0 lg:max-h-full">
                
                {/* Section 1: Tasks by Status */}
                <div className="bg-white border border-slate-200 p-3.5 rounded shadow-xs">
                  <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                    <Activity className="w-3.5 h-3.5 text-indigo-500" />
                    <span>Tasks by Status</span>
                  </h3>

                  <div className="space-y-2 font-sans">
                    {chartDataByTaskStatus.map((entry, idx) => {
                      const pct = stats.totalTasks ? ((entry.value / stats.totalTasks) * 100).toFixed(0) : "0";
                      const color = TASK_STATUS_COLORS[entry.name] || COLORS[idx % COLORS.length];
                      return (
                        <div key={entry.name} className="flex items-center justify-between text-xs">
                          <span className="flex items-center gap-2 font-semibold text-slate-600">
                            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: color }}></span>
                            {entry.name}
                          </span>
                          <div className="flex items-center gap-2 font-mono">
                            <span className="font-bold text-slate-800">{entry.value} งาน</span>
                            <span className="text-[10px] text-slate-400 font-semibold">({pct}%)</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* High Density Combined segmented strip */}
                  <div className="mt-3.5 pt-3.5 border-t border-slate-100 flex gap-0.5 h-2">
                    {chartDataByTaskStatus.map((entry, idx) => {
                      const widthPct = stats.totalTasks ? (entry.value / stats.totalTasks) * 100 : 0;
                      const color = TASK_STATUS_COLORS[entry.name] || COLORS[idx % COLORS.length];
                      if (widthPct === 0) return null;
                      return (
                        <div
                          key={entry.name}
                          style={{ width: `${widthPct}%`, backgroundColor: color }}
                          className="h-full first:rounded-l last:rounded-r transition-all"
                          title={`${entry.name}: ${entry.value} tasks (${widthPct.toFixed(0)}%)`}
                        />
                      );
                    })}
                  </div>
                </div>

                {/* Section 2: Budget by Area Area Progress meters */}
                <div className="bg-white border border-slate-200 p-3.5 rounded shadow-xs flex-1 flex flex-col justify-between">
                  <div>
                    <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-3.5 flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-indigo-500" />
                      <span>Budget by Area</span>
                    </h3>

                    <div className="space-y-3 font-sans">
                      {chartDataByLocation.slice(0, 5).map((loc) => {
                        const totalLocBudget = loc.งบประมาณ;
                        const locPct = stats.totalBudget ? ((totalLocBudget / stats.totalBudget) * 100).toFixed(0) : "0";
                        return (
                          <div key={loc.name} className="space-y-1">
                            <div className="flex justify-between text-xs font-semibold text-slate-700">
                              <span>{loc.name}</span>
                              <span>
                                {formatTHB(totalLocBudget)}{" "}
                                <span className="text-[10px] text-slate-400 font-normal">({locPct}%)</span>
                              </span>
                            </div>
                            <div className="w-full bg-slate-100 h-1 rounded-full overflow-hidden">
                              <div
                                className="bg-slate-700 h-full rounded-full transition-all duration-300"
                                style={{ width: `${locPct}%` }}
                              ></div>
                            </div>
                          </div>
                        );
                      })}
                      {chartDataByLocation.length === 0 && (
                        <p className="text-xs text-slate-400">ไม่มีข้อมูลพื้นที่สำหรับวิเคราะห์</p>
                      )}
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-100">
                    <a
                      href="https://docs.google.com/spreadsheets/d/1Rfsv4rmmPu_rZYlgkjr85fucY2s1CUWDWudG4RPlk7U/edit"
                      target="_blank"
                      rel="noreferrer"
                      className="w-full inline-flex items-center justify-center py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 text-xs font-bold rounded border border-indigo-150 transition-colors"
                    >
                      <span>View Source Sheet</span>
                      <ExternalLink className="w-3 h-3 ml-1.5 shrink-0" />
                    </a>
                  </div>
                </div>

              </div>
            </section>
          </>
        )}
      </main>

      {/* High Density Status Bar Footer */}
      <footer className="h-7 bg-[#1e293b] text-slate-400 flex items-center justify-between px-4 text-[10px] shrink-0 font-mono select-none border-t border-slate-700">
        <div className="flex gap-4 items-center">
          <span className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
            <span className="text-slate-200 font-bold uppercase tracking-wider">LIVE DATA FEED</span>
          </span>
          <span className="hidden sm:inline text-slate-600">|</span>
          <span className="hidden sm:inline">อัปเดต: {apiMeta ? new Date(apiMeta.lastUpdated).toLocaleTimeString("th-TH") : "ไม่ทราบข้อมูล"} น.</span>
        </div>
        <div className="flex gap-4">
          <span className="hidden md:inline">Source: {apiMeta?.source === "live" ? "Google Sheets API (v4)" : "Memory Cache Fallback"}</span>
          <span>แถวข้อมูลทั้งหมด: {rawData.length} แถว</span>
        </div>
      </footer>
    </div>
  );
}
