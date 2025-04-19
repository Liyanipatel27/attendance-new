const express = require("express");
const mysql = require('mysql2/promise');
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");
const WebSocket = require("ws");
const { google } = require("googleapis");
const keys = require("./attendance-450306-36ef1e9c731d.json"); 
 // Use the visible sheet name
const app = express();
app.use(cors());
app.use(express.json());

const server = http.createServer(app);
const wss = new WebSocket.Server({ server });
const io = new Server(server, {
  cors: {
    origin: "http://localhost:3000", // React App URL
    methods: ["GET", "POST"],
  },
});

const pool = mysql.createPool({
    host: "localhost",
    user: "root",
    password: "root",
    database: "college"
});

// **************** Google Sheets Setup ****************

// **************** REST API Endpoints ****************

// Google Sheets Setup

// Google Sheets Setup
const auth = new google.auth.GoogleAuth({
  credentials: keys,
  scopes: ["https://www.googleapis.com/auth/spreadsheets"],
});
const sheets = google.sheets({ version: "v4", auth });

// Sheet Configuration
const SHEET_ID = "11DqOO-J2e862FvAnHQgXlC8Xs7DgupYaAnbpmeE2lAc";
const TARGET_GID = "268947963"; // Your specific sheet GID
let cachedSheetData = [];
let lastFetchTime = null;

// Improved Sheet Data Fetcher
async function fetchSheetData() {
  try {
    // First get all sheet metadata to find our target sheet
    const { data } = await sheets.spreadsheets.get({
      spreadsheetId: SHEET_ID,
      includeGridData: false
    });

    // Find the sheet with matching GID
    const targetSheet = data.sheets.find(
      sheet => sheet.properties.sheetId.toString() === TARGET_GID
    );

    if (!targetSheet) {
      throw new Error(`Sheet with GID ${TARGET_GID} not found`);
    }

    // Now fetch data from the specific sheet
    const sheetName = targetSheet.properties.title;
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SHEET_ID,
      range: `${sheetName}!A:Z`
    });

    cachedSheetData = response.data.values || [];
    lastFetchTime = new Date();
    return cachedSheetData;
  } catch (error) {
    console.error("Error fetching sheet data:", {
      message: error.message,
      code: error.code,
      response: error.response?.data
    });
    throw error;
  }
}

// Debug Endpoint to List All Sheets
app.get("/list-sheets", async (req, res) => {
  try {
    const response = await sheets.spreadsheets.get({
      spreadsheetId: SHEET_ID
    });

    res.json({
      success: true,
      sheets: response.data.sheets.map(sheet => ({
        sheetId: sheet.properties.sheetId,
        title: sheet.properties.title,
        index: sheet.properties.index,
        sheetType: sheet.properties.sheetType
      }))
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
      details: error.response?.data
    });
  }
});

// Main Data Endpoint
app.get("/api/sheet-data", async (req, res) => {
  try {
    const data = await fetchSheetData();
    res.json({
      success: true,
      data: data,
      lastUpdated: lastFetchTime,
      gid: TARGET_GID
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: "Failed to fetch sheet data",
      details: process.env.NODE_ENV === "development" ? error.message : undefined
    });
  }
});

// Initialize and start polling
(async () => {
  try {
    await fetchSheetData();
    console.log(`Successfully connected to sheet GID ${TARGET_GID}`);
    
    // Refresh data every 30 seconds
    setInterval(async () => {
      try {
        await fetchSheetData();
        console.log(`Sheet data refreshed at ${new Date().toISOString()}`);
      } catch (error) {
        console.error("Error during scheduled refresh:", error.message);
      }
    }, 30000);
  } catch (error) {
    console.error("Initialization failed:", error.message);
    process.exit(1);
  }
})();











// Students endpoints
app.get('/students', async (req, res) => {
  try {
    const { enrollment, name, class: className } = req.query;
    
    let query = `SELECT * FROM students WHERE 1=1`;
    const params = [];
    
    if (enrollment) {
      query += ` AND enrollment_no = ?`;
      params.push(enrollment);
    }
    if (name) {
      query += ` AND name LIKE ?`;
      params.push(`%${name}%`);
    }
    
    if (className) {
      query += ` AND class = ?`;
      params.push(className);
    }
    
    query += ` ORDER BY enrollment_no ASC`;
    
    const [students] = await pool.query(query, params);
    res.json(students);
    
  } catch (err) {
    console.error('Database error:', err);
    res.status(500).json({ 
      error: 'Database error',
      details: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
});

// Faculty endpoints
app.get('/faculty', async (req, res) => {
  try {
    const { employee_id, short_name, full_name } = req.query;
    
    let query = `SELECT * FROM faculty WHERE 1=1`;
    const params = [];
    
    if (employee_id) {
      query += ` AND employee_id = ?`;
      params.push(employee_id);
    }
    
    if (short_name) {
      query += ` AND short_name LIKE ?`;
      params.push(`%${short_name}%`);
    }
    
    if (full_name) {
      query += ` AND full_name LIKE ?`;
      params.push(`%${full_name}%`);
    }
    
    query += ` ORDER BY full_name ASC`;
    
    const [faculty] = await pool.query(query, params);
    res.json(faculty);
    
  } catch (err) {
    console.error('Faculty search error:', err);
    res.status(500).json({ 
      error: 'Error searching faculty',
      details: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
});

// Add new faculty
app.post('/faculty', async (req, res) => {
  try {
    const { short_name, employee_id, full_name, email_id } = req.body;
    
    if (!short_name || !employee_id || !full_name || !email_id) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    const [result] = await pool.query(
      `INSERT INTO faculty (short_name, employee_id, full_name, email_id) 
       VALUES (?, ?, ?, ?)`,
      [short_name, employee_id, full_name, email_id]
    );
    
    res.status(201).json({
      id: result.insertId,
      message: 'Faculty added successfully'
    });
    
  } catch (err) {
    console.error('Add faculty error:', err);
    res.status(500).json({ 
      error: 'Error adding faculty',
      details: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
});

// Class endpoints
app.get("/classes", async (req, res) => {
    try {
        const [classes] = await pool.query("SELECT class_id, class_name FROM classes ORDER BY class_name ASC");
        res.json(classes);
    } catch (error) {
        console.error(error);
        res.status(500).send("Error fetching classes");
    }
});

// Timetable endpoints
app.get("/timetable/:classId/:day", async (req, res) => {
  try {
    const { classId, day } = req.params;
    
    const [results] = await pool.query(
      `SELECT 
        id,
        time, 
        subject, 
        batch, 
        faculty, 
        room
       FROM timetable 
       WHERE class_id = ? AND day = ?
       ORDER BY 
         TIME(STR_TO_DATE(SUBSTRING_INDEX(time, ' - ', 1), '%h:%i %p')) ASC,
         batch ASC`,
      [classId, day]
    );

    res.json({ timetable: results });
  } catch (error) {
    console.error(error);
    res.status(500).send("Error fetching timetable");
  }
});

// Faculty timetable endpoints
app.get("/faculty-timetable/:facultyName/:day", async (req, res) => {
  try {
    const { facultyName, day } = req.params;
    const decodedFacultyName = decodeURIComponent(facultyName);
    
    const [results] = await pool.query(
      `SELECT 
        id,
        time_slot as time_slot, 
        subject, 
        class_group, 
        room,
        batch,
        is_teaching_load
       FROM faculty_timetable 
       WHERE faculty_name = ? AND day = ? AND is_teaching_load = TRUE
       ORDER BY 
         TIME(STR_TO_DATE(SUBSTRING_INDEX(time_slot, ' - ', 1), '%h:%i %p')) ASC`,
      [decodedFacultyName, day]
    );

    res.json({ timetable: results });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error fetching faculty timetable" });
  }
});

// Google Sheets API endpoint
// Google Sheets API endpoint
app.get("/api/sheet-data", async (req, res) => {
  try {
    const data = await fetchSheetData();
    res.json({
      success: true,
      data: data,
      lastUpdated: lastFetchTime
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: "Failed to fetch sheet data"
    });
  }
});

// Start server
const PORT = 3001;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Google Sheets sync enabled for sheet ID: ${SHEET_ID}`);
  console.log(`Debug endpoint: http://localhost:${PORT}/list-sheets`);
  console.log(`Data endpoint: http://localhost:${PORT}/api/sheet-data`);
});