import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import Papa from "papaparse";

const app = express();
const PORT = 3000;

// Config Google Sheet URL (Public CSV export)
const SHEET_CSV_URL = "https://docs.google.com/spreadsheets/d/1Rfsv4rmmPu_rZYlgkjr85fucY2s1CUWDWudG4RPlk7U/gviz/tq?tqx=out:csv";

// Simple Memory Cache
interface Cache {
  data: any[] | null;
  lastFetched: number;
}

const cache: Cache = {
  data: null,
  lastFetched: 0,
};

// 5 minutes Cache TTL
const CACHE_TTL = 5 * 60 * 1000;

// Local Fallback Data in case external fetch fails (for Resiliency)
const FALLBACK_DATA = [
  {
    projectId: "P001",
    projectName: "Renovation of a School Project 001",
    projectType: "Renovation",
    location: "Texas",
    startDate: "21/07/2024",
    endDate: "08/08/2024",
    projectStatus: "Behind",
    priority: "Medium",
    taskId: "T001",
    taskName: "Task 001 of Renovation of a School Project 001",
    taskStatus: "In Progress",
    assignedTo: "Bob",
    hoursSpent: 12,
    budget: 9621,
    actualCost: 0,
    progress: 0.24
  },
  {
    projectId: "P001",
    projectName: "Renovation of a School Project 001",
    projectType: "Renovation",
    location: "New Jersey",
    startDate: "21/07/2024",
    endDate: "12/08/2024",
    projectStatus: "Behind",
    priority: "High",
    taskId: "T002",
    taskName: "Task 002 of Renovation of a School Project 001",
    taskStatus: "In Progress",
    assignedTo: "Charlie",
    hoursSpent: 4,
    budget: 7814,
    actualCost: 0,
    progress: 0.56
  },
  {
    projectId: "P001",
    projectName: "Renovation of a School Project 001",
    projectType: "Renovation",
    location: "Ohio",
    startDate: "21/07/2024",
    endDate: "10/08/2024",
    projectStatus: "Behind",
    priority: "High",
    taskId: "T003",
    taskName: "Task 003 of Renovation of a School Project 001",
    taskStatus: "Completed",
    assignedTo: "Charlie",
    hoursSpent: 5,
    budget: 1028,
    actualCost: 1011,
    progress: 1.00
  },
  {
    projectId: "P002",
    projectName: "Innovation of a Classroom Project 002",
    projectType: "Innovation",
    location: "Pennsylvania",
    startDate: "04/06/2024",
    endDate: "12/07/2025",
    projectStatus: "On Track",
    priority: "High",
    taskId: "T001",
    taskName: "Task 001 of Innovation of a Classroom Project 002",
    taskStatus: "Pending",
    assignedTo: "Charlie",
    hoursSpent: 24,
    budget: 1530,
    actualCost: 0,
    progress: 0.33
  },
  {
    projectId: "P002",
    projectName: "Innovation of a Classroom Project 002",
    projectType: "Innovation",
    location: "New York",
    startDate: "04/06/2024",
    endDate: "26/06/2025",
    projectStatus: "On Track",
    priority: "Medium",
    taskId: "T002",
    taskName: "Task 002 of Innovation of a Classroom Project 002",
    taskStatus: "Pending",
    assignedTo: "Charlie",
    hoursSpent: 26,
    budget: 7201,
    actualCost: 0,
    progress: 0.32
  },
  {
    projectId: "P002",
    projectName: "Innovation of a Classroom Project 002",
    projectType: "Innovation",
    location: "California",
    startDate: "04/06/2024",
    endDate: "25/03/2025",
    projectStatus: "On Track",
    priority: "Low",
    taskId: "T003",
    taskName: "Task 003 of Innovation of a Classroom Project 002",
    taskStatus: "In Progress",
    assignedTo: "Alice",
    hoursSpent: 28,
    budget: 9814,
    actualCost: 0,
    progress: 0.29
  },
  {
    projectId: "P003",
    projectName: "Construction of a Hospital Wing Project 003",
    projectType: "Construction",
    location: "Pennsylvania",
    startDate: "20/07/2024",
    endDate: "22/08/2024",
    projectStatus: "Completed",
    priority: "Low",
    taskId: "T001",
    taskName: "Task 001 of Construction of a Hospital Wing Project 003",
    taskStatus: "Completed",
    assignedTo: "Grace",
    hoursSpent: 7,
    budget: 7981,
    actualCost: 7717,
    progress: 1.00
  },
  {
    projectId: "P003",
    projectName: "Construction of a Hospital Wing Project 003",
    projectType: "Construction",
    location: "Virginia",
    startDate: "20/07/2024",
    endDate: "25/09/2024",
    projectStatus: "Completed",
    priority: "Medium",
    taskId: "T002",
    taskName: "Task 002 of Construction of a Hospital Wing Project 003",
    taskStatus: "Completed",
    assignedTo: "Frank",
    hoursSpent: 23,
    budget: 1032,
    actualCost: 637,
    progress: 1.00
  },
  {
    projectId: "P003",
    projectName: "Construction of a Hospital Wing Project 003",
    projectType: "Construction",
    location: "Ohio",
    startDate: "20/07/2024",
    endDate: "22/08/2024",
    projectStatus: "Completed",
    priority: "Medium",
    taskId: "T003",
    taskName: "Task 003 of Construction of a Hospital Wing Project 003",
    taskStatus: "Completed",
    assignedTo: "Grace",
    hoursSpent: 13,
    budget: 8546,
    actualCost: 8502,
    progress: 1.00
  }
];

// Fetch Google Sheet with Exponential Backoff and Retry
async function fetchSheetWithRetry(url: string, retries = 3, delay = 1000): Promise<string> {
  for (let i = 0; i < retries; i++) {
    try {
      const response = await fetch(url, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
        }
      });
      if (!response.ok) {
        throw new Error(`HTTP Error Status: ${response.status}`);
      }
      return await response.text();
    } catch (error) {
      console.warn(`Attempt ${i + 1} failed to fetch spreadsheet. Error:`, error);
      if (i === retries - 1) throw error;
      // Exponential Backoff
      await new Promise((resolve) => setTimeout(resolve, delay * Math.pow(2, i)));
    }
  }
  throw new Error("Failed to fetch sheet data after retries");
}

// Map the raw csv row into clean type-safe structure
function mapRawData(rawData: any[]): any[] {
  return rawData.map((row: any) => {
    return {
      projectId: (row["Project ID"] || "").trim(),
      projectName: (row["Project Name"] || "").trim(),
      projectType: (row["Project Type"] || "").trim(),
      location: (row["Location"] || "").trim(),
      startDate: (row["Start Date"] || "").trim(),
      endDate: (row["End Date"] || "").trim(),
      projectStatus: (row["Project Status"] || "").trim(),
      priority: (row["Priority"] || "").trim(),
      taskId: (row["Task ID"] || "").trim(),
      taskName: (row["Task Name"] || "").trim(),
      taskStatus: (row["Task Status"] || "").trim(),
      assignedTo: (row["Assigned To"] || "").trim(),
      hoursSpent: parseFloat(row["Hours Spent"] || "0") || 0,
      budget: parseFloat(row["Budget"] || "0") || 0,
      actualCost: parseFloat(row["Actual Cost"] || "0") || 0,
      progress: parseFloat(row["Progress"] || "0") || 0,
    };
  }).filter((row: any) => row.projectId && row.projectName); // Filter out potential junk rows
}

// Main API Route
app.get("/api/dashboard-data", async (req, res) => {
  const now = Date.now();
  
  // Use Cache if fresh
  if (cache.data && (now - cache.lastFetched < CACHE_TTL)) {
    console.log("Serving Dashboard Data from cache. Remaining TTL:", Math.max(0, (CACHE_TTL - (now - cache.lastFetched)) / 1000), "seconds");
    return res.json({
      status: "success",
      source: "cache",
      data: cache.data,
      lastUpdated: new Date(cache.lastFetched).toISOString(),
    });
  }

  try {
    console.log("Fetching fresh data from Google Sheet...");
    const csvText = await fetchSheetWithRetry(SHEET_CSV_URL);
    
    // Parse using PapaParse
    const parseResult = Papa.parse(csvText, {
      header: true,
      skipEmptyLines: true,
    });

    if (parseResult.errors && parseResult.errors.length > 0) {
      console.warn("PapaParse encountered errors during parsing:", parseResult.errors[0]);
    }

    const mapped = mapRawData(parseResult.data);
    
    if (mapped.length === 0) {
      throw new Error("Parsed data yielded 0 valid records.");
    }

    // Update Cache
    cache.data = mapped;
    cache.lastFetched = now;

    return res.json({
      status: "success",
      source: "live",
      data: mapped,
      lastUpdated: new Date(now).toISOString(),
    });
  } catch (err: any) {
    console.error("Failed to retrieve live Google Sheet data. Reverting to fallback cache for safety. Detail:", err.message);
    
    // In case live fetch fails but we already have old cached data, use old cache
    if (cache.data) {
      return res.json({
        status: "warning",
        message: "Failed to fetch live data. Served from expired cache.",
        source: "expired_cache",
        data: cache.data,
        lastUpdated: new Date(cache.lastFetched).toISOString(),
      });
    }

    // Otherwise, use fallback static data (Defensive Programming / Resiliency)
    return res.json({
      status: "warning",
      message: "Failed to fetch live data. Served from built-in static data fallback.",
      source: "static_fallback",
      data: FALLBACK_DATA,
      lastUpdated: new Date().toISOString(),
    });
  }
});

// Force Refresh API (To bypass cache)
app.post("/api/dashboard-refresh", async (req, res) => {
  cache.data = null;
  cache.lastFetched = 0;
  res.json({ status: "success", message: "Cache cleared successfully." });
});

async function startServer() {
  // Vite Integration for Assets and Dev Server
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server is running at http://localhost:${PORT} in ${process.env.NODE_ENV || "development"} mode`);
  });
}

startServer();
