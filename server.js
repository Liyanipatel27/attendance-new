const express = require("express");
const mysql = require('mysql2/promise');
const { google } = require("googleapis");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");
const keys = require("./attendance-450306-36ef1e9c731d.json");

// Increase Node.js memory limit
const v8 = require('v8');
v8.setFlagsFromString('--max-old-space-size=4096');

const app = express();
app.use(cors({
  origin: "http://localhost:3000",
  methods: ["GET", "POST"],
  credentials: true
}));

// Reduce payload size limits
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ limit: '1mb', extended: true }));
app.use(express.raw({ limit: '1mb' }));

const server = http.createServer(app);

// Configure Socket.IO with memory optimizations
const io = new Server(server, {
  cors: {
    origin: "http://localhost:3000",
    methods: ["GET", "POST"],
    credentials: true
  },
  allowEIO3: true,
  transports: ['websocket', 'polling'],
  maxHttpBufferSize: 1e6 // 1MB limit
});

// Socket.IO connection handling with error handling
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);

  socket.on('error', (error) => {
    console.error('Socket error:', error);
  });

  socket.on('start_attendance', async (data) => {
    try {
      console.log('Starting attendance:', data);
      io.emit('new_attendance_session', data);
    } catch (error) {
      console.error('Error in start_attendance:', error);
    }
  });

  socket.on('submit_attendance', async (data) => {
    try {
      console.log('Attendance submitted:', data);
      io.emit('attendance_submitted', data);
    } catch (error) {
      console.error('Error in submit_attendance:', error);
    }
  });

  socket.on('disconnect', (reason) => {
    console.log('Client disconnected:', socket.id, 'Reason:', reason);
  });
});

// Error handling for Socket.IO
io.engine.on('connection_error', (err) => {
  console.error('Connection error:', err);
});

// MySQL connection pool with error handling
const pool = mysql.createPool({
  host: "localhost",
  user: "root",
  password: "root",
  database: "college",
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// Google Sheets Setup with error handling
const auth = new google.auth.GoogleAuth({
  credentials: keys,
  scopes: ["https://www.googleapis.com/auth/spreadsheets"],
});

const sheets = google.sheets({ version: "v4", auth });
const SHEET_ID = "11DqOO-J2e862FvAnHQgXlC8Xs7DgupYaAnbpmeE2lAc";
let cachedSheetData = [];
let lastFetchTime = null;

async function fetchSheetData(gid) {
  try {
    // First get all sheet metadata to find our target sheet
    const { data } = await sheets.spreadsheets.get({
      spreadsheetId: SHEET_ID,
      includeGridData: false
    });

    // Find the sheet with matching GID
    const targetSheet = data.sheets.find(
      sheet => sheet.properties.sheetId.toString() === gid
    );

    if (!targetSheet) {
      throw new Error(`Sheet with GID ${gid} not found`);
    }

    console.log('Found sheet:', targetSheet.properties.title);

    // Now fetch data from the specific sheet
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SHEET_ID,
      range: `${targetSheet.properties.title}!A1:Z50`
    });

    const rows = response.data.values;
    if (!rows || rows.length === 0) {
      return { success: false, error: 'No data found in sheet' };
    }

    console.log('Raw sheet data:', JSON.stringify(rows, null, 2));

    // Process the data to ensure it's in the correct format
    const processedData = processTimetableData(rows);
    console.log('Processed data:', JSON.stringify(processedData, null, 2));
    
    return { success: true, data: processedData };
  } catch (error) {
    console.error('Error fetching sheet data:', error);
    return { success: false, error: error.message };
  }
}

// Function to process timetable data
function processTimetableData(rows) {
  console.log('Processing timetable data...');
  
  // Find the timetable section by looking for a row that starts with "Time"
  let startRow = -1;
  for (let i = 0; i < rows.length; i++) {
    if (rows[i] && rows[i][0] && rows[i][0].toLowerCase().includes('time')) {
      startRow = i;
      console.log('Found time header at row:', i);
      break;
    }
  }

  if (startRow === -1) {
    console.log('No time header found in data');
    return [];
  }

  // Extract the timetable section (header + 5 days)
  const timetableRows = rows.slice(startRow, startRow + 6);
  console.log('Extracted timetable rows:', JSON.stringify(timetableRows, null, 2));

  // Ensure the data is properly formatted
  const formattedData = timetableRows.map(row => {
    // Ensure each row has enough columns
    const paddedRow = [...row];
    while (paddedRow.length < timetableRows[0].length) {
      paddedRow.push('');
    }
    return paddedRow;
  });

  // Validate that we have the correct structure
  if (formattedData.length !== 6) {
    console.log('Invalid row count:', formattedData.length);
    return [];
  }
  
  if (!formattedData[0][0].toLowerCase().includes('time')) {
    console.log('Invalid header:', formattedData[0][0]);
    return [];
  }
  
  const firstDay = formattedData[1][0].toLowerCase();
  if (!['monday', 'tuesday', 'wednesday', 'thursday', 'friday'].includes(firstDay)) {
    console.log('Invalid first day:', firstDay);
    return [];
  }

  console.log('Successfully processed timetable data');
  return formattedData;
}

// Main Timetable Data Endpoint with error handling
app.get("/api/sheet-data", async (req, res) => {
  try {
    const { gid } = req.query;
    if (!gid) {
      return res.status(400).json({
        success: false,
        error: "GID parameter is required"
      });
    }

    const result = await fetchSheetData(gid);
    res.json(result);
  } catch (error) {
    console.error('Error in /api/sheet-data:', error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch sheet data",
      details: process.env.NODE_ENV === "development" ? error.message : undefined
    });
  }
});

// Debug Endpoint to List All Sheets with error handling
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
    console.error('Error in /list-sheets:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      details: error.response?.data
    });
  }
});

// Initialize and start polling with error handling
(async () => {
  try {
    console.log('Server initialized and ready to fetch timetable data');
  } catch (error) {
    console.error("Initialization failed:", error.message);
    process.exit(1);
  }
})();

// Start server with error handling
const PORT = 3001;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
}).on('error', (error) => {
  console.error('Server error:', error);
  process.exit(1);
}); 