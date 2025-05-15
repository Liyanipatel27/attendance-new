const express = require("express");
const mysql = require('mysql2/promise');
const { google } = require("googleapis");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");
const WebSocket = require("ws");
const keys = require("./attendance-450306-36ef1e9c731d.json");
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const ExcelJS = require('exceljs');
const axios = require('axios');

const app = express();
app.use(cors({
  origin: "http://localhost:3000",
  methods: ["GET", "POST"],
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));
app.use(express.raw({ limit: '10mb' }));

const server = http.createServer(app);

// Configure Socket.IO
const io = new Server(server, {
  cors: {
    origin: "http://localhost:3000",
    methods: ["GET", "POST"],
    credentials: true,
    allowedHeaders: ["my-custom-header"]
  },
  allowEIO3: true,
  transports: ['websocket', 'polling'],
  pingTimeout: 60000,
  pingInterval: 25000
});

// Socket.IO connection handling
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);

  socket.on('error', (error) => {
    console.error('Socket error:', error);
  });

  socket.on('start_attendance', (sessionData) => {
    console.log('New attendance session:', sessionData);
    io.emit('new_attendance_session', sessionData);
  });

  socket.on('submit_attendance', (submissionData) => {
    console.log('Attendance submitted:', submissionData);
    io.emit('attendance_submitted', submissionData);
  });

  socket.on('disconnect', (reason) => {
    console.log('Client disconnected:', socket.id, 'Reason:', reason);
  });
});

// Error handling for Socket.IO
io.engine.on('connection_error', (err) => {
  console.error('Connection error:', err);
});

const pool = mysql.createPool({
  host: "localhost",
  user: "root",
  password: "root",
  database: "college",
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  enableKeepAlive: true,
  keepAliveInitialDelay: 0
});

// Add connection error handling
pool.on('error', (err) => {
  console.error('Database pool error:', err);
  if (err.code === 'PROTOCOL_CONNECTION_LOST') {
    console.error('Database connection was closed.');
  }
  if (err.code === 'ER_CON_COUNT_ERROR') {
    console.error('Database has too many connections.');
  }
  if (err.code === 'ECONNREFUSED') {
    console.error('Database connection was refused.');
  }
});

// Test database connection
async function testConnection() {
  try {
    const connection = await pool.getConnection();
    console.log('Database connection successful');
    connection.release();
  } catch (err) {
    console.error('Database connection failed:', err);
    process.exit(1);
  }
}

// Call test connection when server starts
testConnection();

// Google Sheets Setup
const auth = new google.auth.GoogleAuth({
  credentials: keys,
  scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  
});
const sheets = google.sheets({ version: "v4", auth });
const SHEET_ID = "11DqOO-J2e862FvAnHQgXlC8Xs7DgupYaAnbpmeE2lAc";
const TARGET_GID = "268947963"; // Your specific sheet GID
let cachedSheetData = [];
let lastFetchTime = null;

const STUDENT_SHEET_GID = "268947963";

async function fetchSheetData(gid = TARGET_GID) {
  try {
    const { data } = await sheets.spreadsheets.get({
      spreadsheetId: SHEET_ID,
      includeGridData: false
    });

    const targetSheet = data.sheets.find(
      sheet => sheet.properties.sheetId.toString() === gid
    );

    if (!targetSheet) {
      throw new Error(`Sheet with GID ${gid} not found`);
    }

    const sheetName = targetSheet.properties.title;
    // Fetch all columns (A-N) and enough rows for all students
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SHEET_ID,
      range: `${sheetName}!A1:N3000` // Adjust if you have more than 3000 students
    });

    cachedSheetData = response.data.values || [];
    lastFetchTime = new Date();
    return cachedSheetData;
  } catch (error) {
    console.error("Error fetching sheet data:", error);
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

// Helper function to process raw sheet data into timetable format
function processTimetableData(rawData) {
  if (!rawData || rawData.length === 0) return [];
  
  // First row contains headers (time slots)
  const headers = rawData[0];
  
  // Process each row (skip header row)
  return rawData.slice(1).map(row => {
    const day = row[0]; // First column is day
    const slots = row.slice(1); // Rest are time slots
    
    return {
      day,
      slots: slots.map((slot, index) => ({
        time: headers[index + 1], // +1 to skip day column
        content: slot
      }))
    };
  });
}

// Main Data Endpoint
app.get("/api/sheet-data", async (req, res) => {
  try {
    const { type, gid } = req.query;
    let targetGid = gid;

    // If type is 'students', use the student sheet GID
    if (type === 'students') {
      targetGid = '268947963'; // Student sheet GID
    }

    // If no GID is provided and no type is specified, use default
    if (!targetGid) {
      targetGid = TARGET_GID;
    }

    console.log('Fetching sheet data with GID:', targetGid);
    const data = await fetchSheetData(targetGid);
    
    res.json({
      success: true,
      data: data,
      lastUpdated: lastFetchTime,
      gid: targetGid
    });
  } catch (error) {
    console.error('Error in /api/sheet-data:', error);
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
    await fetchSheetData(TARGET_GID);
    console.log(`Successfully connected to sheet GID ${TARGET_GID}`);
    
    // Refresh data every 30 seconds
    setInterval(async () => {
      try {
        await fetchSheetData(TARGET_GID);
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

// Enhanced faculty timetable endpoint
app.get("/faculty-timetable", async (req, res) => {
  try {
    const { faculty, day, gid } = req.query;
    
    // 1. Try Google Sheets if GID provided
    if (gid) {
      try {
        // Get sheet metadata to find the correct sheet
        const { data } = await sheets.spreadsheets.get({
          spreadsheetId: SHEET_ID,
          includeGridData: false
        });

        const targetSheet = data.sheets.find(
          sheet => sheet.properties.sheetId.toString() === gid
        );

        if (targetSheet) {
          const sheetName = targetSheet.properties.title;
          const response = await sheets.spreadsheets.values.get({
            spreadsheetId: SHEET_ID,
            range: `${sheetName}!A1:J6` // Adjust range as needed
          });

          const sheetData = response.data.values || [];
          const dayMap = {
            'Monday': 0, 'Tuesday': 1, 'Wednesday': 2, 
            'Thursday': 3, 'Friday': 4, 'Saturday': 5, 'Sunday': 6
          };
          const dayIndex = dayMap[day];
          
          if (dayIndex !== undefined && sheetData.length > dayIndex + 1) {
            const timeSlots = sheetData[0].slice(1);
            const timetable = timeSlots.map((time, i) => {
              const dayRow = sheetData[dayIndex + 1];
              return {
                time_slot: time,
                subject: dayRow ? dayRow[i + 1] : "No Teaching Load",
                class_group: "", // Extract from sheet data if available
                room: "" // Extract from sheet data if available
              };
            });
            return res.json({ timetable });
          }
        }
      } catch (sheetsError) {
        console.error("Google Sheets error:", sheetsError);
      }
    }

    // 2. Fallback to database
    const [results] = await pool.query(
      `SELECT 
        id,
        time_slot,
        subject, 
        class_group, 
        room,
        batch
       FROM faculty_timetable 
       WHERE faculty_name = ? AND day = ? AND is_teaching_load = TRUE
       ORDER BY 
         TIME(STR_TO_DATE(SUBSTRING_INDEX(time_slot, ' - ', 1), '%h:%i %p')) ASC`,
      [faculty, day]
    );

    res.json({ timetable: results });
    
  } catch (error) {
    console.error("Error fetching faculty timetable:", error);
    res.status(500).json({ 
      error: "Failed to fetch timetable data",
      details: process.env.NODE_ENV === "development" ? error.message : undefined
    });
  }
});

// New endpoint for faculty timetable with GID
//y timetable endpoint for Hiten Sadani
// Faculty timetable endpoint for Hiten Sadani
app.get("/faculty-timetable/hiten/:day", async (req, res) => {
  try {
    const { day } = req.params;
    const dayMap = {
      'Monday': 0,
      'Tuesday': 1,
      'Wednesday': 2,
      'Thursday': 3,
      'Friday': 4,
      'Saturday': 5,
      'Sunday': 6
    };
    const dayIndex = dayMap[day];
    
    if (dayIndex === undefined) {
      return res.json({ timetable: [] });
    }

    // First get the sheet name for GID 341302414
    const { data } = await sheets.spreadsheets.get({
      spreadsheetId: SHEET_ID,
      includeGridData: false
    });

    const targetSheet = data.sheets.find(
      sheet => sheet.properties.sheetId.toString() === '341302414'
    );

    if (!targetSheet) {
      throw new Error('Sheet with GID 341302414 not found');
    }

    const sheetName = targetSheet.properties.title;

    // Fetch data from the specific sheet
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SHEET_ID,
      range: `${sheetName}!A1:J6` // Adjust range as needed
    });
    const sheetData = response.data.values || [];
    const timeSlots = sheetData[0].slice(1); // Get time slots from header row
    
    const timetable = timeSlots.map((time, i) => {
      const dayRow = sheetData[dayIndex + 1]; // +1 to skip header
      return {
        time: time,
        class: dayRow ? dayRow[i + 1] : "No Teaching Load" // +1 to skip day column
      };
    });

    res.json({ timetable });
  } catch (error) {
    console.error("Error fetching Hiten Sadani's timetable:", error);
    res.status(500).json({ 
      error: "Error fetching timetable",
      details: process.env.NODE_ENV === "development" ? error.message : undefined
    });
  }
});




// Faculty timetable endpoint
app.get("/faculty-timetable/:facultyName/:day", async (req, res) => {
  try {
    const { facultyName, day } = req.params;
    const decodedFacultyName = decodeURIComponent(facultyName);

    // Special handling for Prof. Hiten Sadani
    if (decodedFacultyName.includes('Hiten Sadani') || decodedFacultyName.includes('HMS')) {
      try {
        // Get all sheets to find the correct one
        const { data } = await sheets.spreadsheets.get({
          spreadsheetId: SHEET_ID,
          includeGridData: false
        });

        const hitenSheet = data.sheets.find(
          sheet => sheet.properties.sheetId.toString() === '341302414'
        );

        if (!hitenSheet) {
          console.log("Hiten's sheet not found by GID");
          throw new Error("Sheet not found");
        }

        const sheetName = hitenSheet.properties.title;
        console.log(`Found sheet: ${sheetName}`);

        // Fetch data with wide range
        const response = await sheets.spreadsheets.values.get({
          spreadsheetId: SHEET_ID,
          range: `${sheetName}!A1:Z20`
        });

        const sheetData = response.data.values || [];
        
        // Parse the timetable structure
        const dayMap = {
          'Monday': 1, 'Tuesday': 2, 'Wednesday': 3, 
          'Thursday': 4, 'Friday': 5, 'Saturday': 6, 'Sunday': 7
        };
        
        const dayIndex = dayMap[day];
        if (!sheetData.length || dayIndex === undefined || sheetData.length <= dayIndex) {
          return res.json({ timetable: [] });
        }

        // First row contains time slots (skip first column)
        const timeSlots = sheetData[0].slice(1); 
        
        // The day's row contains classes
        const dayRow = sheetData[dayIndex];
        
        const timetable = timeSlots.map((time, i) => {
          const cellValue = dayRow[i + 1] || "No Teaching Load";
          
          // Parse the cell content
          const parts = cellValue.split('\n');
          
          return {
            time_slot: time.trim(),
            subject: parts[0]?.trim() || "",
            class_group: parts[1]?.trim() || "",
            room: parts[3]?.trim() || ""
          };
        }).filter(slot => slot.subject !== "No Teaching Load");

        return res.json({ timetable });
        
      } catch (sheetsError) {
        console.error("Google Sheets error:", sheetsError);
        // Continue to database fallback
      }
    }

    // Database fallback for all faculty
    const [results] = await pool.query(
      `SELECT 
        id,
        time_slot,
        subject, 
        class_group, 
        room,
        batch
       FROM faculty_timetable 
       WHERE faculty_name = ? AND day = ? AND is_teaching_load = TRUE
       ORDER BY 
         TIME(STR_TO_DATE(SUBSTRING_INDEX(time_slot, ' - ', 1), '%h:%i %p')) ASC`,
      [decodedFacultyName, day]
    );

    res.json({ timetable: results });

  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({ 
      error: "Failed to fetch timetable",
      details: process.env.NODE_ENV === "development" ? error.message : undefined
    });
  }
});

function processSheetData(sheetData, day) {
  // Implement your logic to convert sheet data to timetable format
  // This depends on how your Google Sheet is structured
  // Example:
  return sheetData.slice(1).map((row, index) => ({
    id: index + 1,
    time_slot: row[0], // Assuming time is in first column
    subject: row[1],   // Subject in second column
    class_group: row[2], // Class group in third column
    room: row[3],      // Room in fourth column
    // Add other fields as needed
  }));
}


// Students endpoints
app.get('/students', async (req, res) => {
  try {
    const { enrollment, name, class: className } = req.query;
    console.log('Fetching students with params:', { enrollment, name, className });
    
    // Fetch from Google Sheets
    const sheetData = await fetchSheetData(STUDENT_SHEET_GID);
    
    if (!sheetData || sheetData.length < 2) {
      throw new Error('No student data available');
    }
    
    // Process sheet data (skip header row)
    const allStudents = sheetData.slice(1).map((row, index) => ({
      id: index + 1,
      enrollment_no: row[1] || '',
      name: row[2] || '',
      branch: row[3] || '',
      hosteller_commuter: row[4] || '',
      semester: row[5] || '',
      gender: row[6] || '',
      admission_type: row[7] || '',
      student_phone: row[8] || '',
      parent_phone: row[9] || '',
      gnu_email: row[10] || '',
      personal_email: row[11] || '',
      batch: row[12] || '',
      class: row[13] || ''
    }));
    
    // Filter students based on search criteria
    let filteredStudents = allStudents;
    
    if (enrollment) {
      filteredStudents = filteredStudents.filter(student => 
        student.enrollment_no.toLowerCase().includes(enrollment.toLowerCase())
      );
    }
    
    if (name) {
      filteredStudents = filteredStudents.filter(student => 
        student.name.toLowerCase().includes(name.toLowerCase())
      );
    }
    
    if (className && className !== 'All Classes') {
      filteredStudents = filteredStudents.filter(student => 
        student.class === className || student.batch === className
      );
    }
    
    // Get unique classes for dropdown
    const uniqueClasses = [...new Set(allStudents.map(s => s.class || s.batch).filter(Boolean))].sort();
    
    res.json({
      success: true,
      data: filteredStudents,
      total: filteredStudents.length,
      classes: ['All Classes', ...uniqueClasses],
      message: filteredStudents.length > 0 ? 
        `Found ${filteredStudents.length} students` : 
        'No records found matching your criteria'
    });
    
  } catch (error) {
    console.error('Error fetching students:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch student data',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// New endpoint to get just the class list
app.get('/student-classes', async (req, res) => {
  try {
    const [classResults] = await pool.query(`
      SELECT DISTINCT class FROM students WHERE class IS NOT NULL AND class != ''
      UNION
      SELECT DISTINCT batch FROM students WHERE batch IS NOT NULL AND batch != ''
      ORDER BY class
    `);
    
    const classes = ['All Classes', ...classResults.map(c => c.class).filter(Boolean)];
    
    res.json({
      success: true,
      classes: classes
    });
  } catch (err) {
    console.error('Error fetching classes:', err);
    res.status(500).json({ 
      success: false,
      error: 'Error fetching class list'
    });
  }
});

// Other endpoints remain the same...
app.get('/faculty', async (req, res) => {
  try {
    const [faculty] = await pool.query("SELECT employee_id, full_name, email_id FROM faculty ORDER BY full_name ASC");
    res.json(faculty);
  } catch (err) {
    res.status(500).json({ error: 'Error fetching faculty' });
  }
});


// Add this new endpoint to your existing server.js
app.get("/current-slot/:facultyName/:day/:currentTime", async (req, res) => {
  try {
    const { facultyName, day, currentTime } = req.params;
    const decodedFacultyName = decodeURIComponent(facultyName);

    // Special handling for Prof. Hiten Sadani
    if (decodedFacultyName.includes('Hiten Sadani') || decodedFacultyName.includes('HMS')) {
      try {
        // Get sheet metadata
        const { data } = await sheets.spreadsheets.get({
          spreadsheetId: SHEET_ID,
          includeGridData: false
        });

        const hitenSheet = data.sheets.find(
          sheet => sheet.properties.sheetId.toString() === '341302414'
        );

        if (!hitenSheet) throw new Error("Sheet not found");

        const sheetName = hitenSheet.properties.title;
        console.log('Found sheet:', sheetName);
        
        // Fetch data with wider range to ensure we get all content
        const response = await sheets.spreadsheets.values.get({
          spreadsheetId: SHEET_ID,
          range: `${sheetName}!A1:Z20`
        });

        const sheetData = response.data.values || [];
        console.log('Sheet data:', sheetData);
        
        const dayMap = {
          'Monday': 1, 'Tuesday': 2, 'Wednesday': 3, 
          'Thursday': 4, 'Friday': 5, 'Saturday': 6, 'Sunday': 7
        };
        
        const dayIndex = dayMap[day];
        if (!sheetData.length || dayIndex === undefined || sheetData.length <= dayIndex) {
          console.log('No data for day:', day);
          return res.json({ slot: null });
        }

        // Find current time slot
        const timeSlots = sheetData[0].slice(1);
        const dayRow = sheetData[dayIndex];
        console.log('Time slots:', timeSlots);
        console.log('Day row:', dayRow);
        
        for (let i = 0; i < timeSlots.length; i++) {
          const timeSlot = timeSlots[i];
          if (!timeSlot) continue;
          
          const [startTime, endTime] = timeSlot.includes(' to ') ? 
            timeSlot.split(' to ') : 
            timeSlot.split(' - ');
          
          const currentTimeDate = new Date(`01/01/2000 ${currentTime}`);
          const startTimeDate = new Date(`01/01/2000 ${startTime.trim()}`);
          const endTimeDate = new Date(`01/01/2000 ${endTime.trim()}`);
          
          if (currentTimeDate >= startTimeDate && currentTimeDate <= endTimeDate) {
            const cellValue = dayRow[i + 1] || "No Teaching Load";
            console.log('Current cell value:', cellValue);
            
            // Split by newlines and filter out empty lines
            const parts = cellValue.split('\n').filter(part => part.trim());
            console.log('Parsed parts:', parts);
            
            // Parse class group and batch
            let classGroup = "";
            let batch = "";
            
            if (parts.length >= 2) {
              // First line is subject
              const subject = parts[0]?.trim() || "";
              
              // Second line contains class and batch
              const classInfo = parts[1]?.trim() || "";
              if (classInfo.includes('-')) {
                const classParts = classInfo.split('-');
                if (classParts.length >= 2) {
                  // If format is like "6IT-E-2", class is "6IT-E" and batch is "6IT-E-2"
                  classGroup = classParts.slice(0, -1).join('-');
                  batch = classInfo;
                }
              } else {
                classGroup = classInfo;
                batch = classInfo;
              }
              
              return res.json({
                slot: {
                  time_slot: timeSlot.trim(),
                  subject: subject,
                  class_group: classGroup,
                  batch: batch,
                  room: parts[2]?.trim() || ""
                }
              });
            }
          }
        }
        
        console.log('No matching time slot found');
        return res.json({ slot: null });
        
      } catch (sheetsError) {
        console.error("Google Sheets error:", sheetsError);
        // Continue to database fallback
      }
    }

    // Database fallback
    const [results] = await pool.query(
      `SELECT 
        time_slot,
        subject, 
        class_group,
        batch,
        room
       FROM faculty_timetable 
       WHERE faculty_name = ? AND day = ? AND is_teaching_load = TRUE
       AND ? BETWEEN 
         STR_TO_DATE(SUBSTRING_INDEX(time_slot, ' - ', 1), '%h:%i %p') AND
         STR_TO_DATE(SUBSTRING_INDEX(time_slot, ' - ', -1), '%h:%i %p')
       LIMIT 1`,
      [decodedFacultyName, day, currentTime + (currentTime.includes('PM') ? ' PM' : ' AM')]
    );

    res.json({ slot: results[0] || null });

  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({ 
      error: "Failed to fetch current slot",
      details: process.env.NODE_ENV === "development" ? error.message : undefined
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

  // Special handling for Prof. Hiten Sadani
  if (decodedFacultyName.includes('Hiten Sadani') || decodedFacultyName.includes('HMS')) {
    try {
      // 1. Get sheet metadata
      const { data } = await sheets.spreadsheets.get({
        spreadsheetId: SHEET_ID,
        includeGridData: false
      });

      console.log('All sheets:', data.sheets.map(s => ({
        name: s.properties.title,
        gid: s.properties.sheetId
      })));

      // 2. Find correct sheet
      const targetSheet = data.sheets.find(
        sheet => sheet.properties.sheetId.toString() === '341302414'
      );

      if (!targetSheet) {
        console.error('Sheet with GID 341302414 not found');
        throw new Error('Sheet not found');
      }

      const sheetName = targetSheet.properties.title;
      console.log(`Found sheet: ${sheetName}`);

      // 3. Fetch data with wider range
      const response = await sheets.spreadsheets.values.get({
        spreadsheetId: SHEET_ID,
        range: `${sheetName}!A1:Z20` // Expanded range
      });

      const sheetData = response.data.values || [];
      console.log('Sheet data:', sheetData);

      // 4. Parse data
      const dayMap = {
        'Monday': 1, 'Tuesday': 2, 'Wednesday': 3, 
      };
      
      const dayIndex = dayMap[day];
      if (dayIndex === undefined || sheetData.length <= dayIndex) {
        return res.json({ timetable: [] });
      }

      const timeSlots = sheetData[0].slice(1); // First row has time slots
      const dayRow = sheetData[dayIndex];
      
      const timetable = timeSlots.map((time, i) => {
        const cellValue = dayRow[i + 1] || "No Teaching Load";
        
        // Parse the complex cell format
        const parts = cellValue.split('\n');
        return {
          time_slot: time,
          subject: parts[0] || "",
          class_group: parts[1] || "",
          room: parts[3] || "",
          batch: parts[4] || ""
        };
      });

      return res.json({ timetable });
      
    } catch (sheetsError) {
      console.error("Google Sheets error:", sheetsError);
      // Continue to database fallback
    }
  }

  // Database fallback
  const [results] = await pool.query(
    `SELECT * FROM faculty_timetable 
     WHERE faculty_name = ? AND day = ?`,
    [decodedFacultyName, day]
  );

  res.json({ timetable: results });

} catch (error) {
  console.error("Error:", error);
  res.status(500).json({ 
    error: "Failed to fetch timetable",
    details: process.env.NODE_ENV === "development" ? error.message : undefined
  });
}
});


// Add this temporary endpoint
app.get('/debug-sheets', async (req, res) => {
const { data } = await sheets.spreadsheets.get({
  spreadsheetId: SHEET_ID
});
res.json(data.sheets.map(s => ({
  name: s.properties.title,
  gid: s.properties.sheetId
})));
});


// Google Sheets API endpoint
// Google Sheets API endpoint
app.get("/class-students/:subject/:classGroup", async (req, res) => {
  try {
    const { subject, classGroup } = req.params;
    console.log('Fetching students for:', { subject, classGroup });
    
    // Handle multiple class groups and different formats
    const groups = classGroup.split(',').map(g => {
      // Extract the main class group (e.g., "6IT-A" from "6IT-A(6IT-A-2)")
      const match = g.trim().match(/^([^(]+)/);
      return match ? match[1].trim() : g.trim();
    });
    
    console.log('Class groups:', groups);
    
    let query = `SELECT 
      id,
      enrollment_no as enrollment,
      name,
      branch,
      class,
      batch
     FROM students WHERE `;
    
    const params = [];
    const conditions = [];
    
    groups.forEach(group => {
      // For specific class groups like "6IT-A" and "6IOT-A"
      conditions.push(`(class = ? OR batch = ? OR batch LIKE ?)`);
      params.push(group, group, `${group}%`);
    });
    
    query += conditions.join(' OR ');
    query += ` ORDER BY enrollment_no ASC`;
    
    console.log('Final query:', query);
    console.log('Query params:', params);
    
    const [students] = await pool.query(query, params);
    console.log('Found students:', students.length);
    
    res.json({ students });
  } catch (error) {
    console.error("Error fetching students:", error);
    res.status(500).json({ 
      error: "Failed to fetch student list",
      details: process.env.NODE_ENV === "development" ? error.message : undefined
    });
  }
});
// Fetch all faculty from Google Sheets
app.get("/faculty-list", async (req, res) => {
  try {
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: 'YOUR_SHEET_ID',
      range: 'Faculty!A2:D100', // Faculty data sheet (columns: ID, Name, ShortCode, Email)
    });

    const facultyList = response.data.values.map(row => ({
      id: row[0],
      full_name: row[1],
      short_name: row[2],
      email: row[3]
    }));

    res.json(facultyList);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch faculty list" });
  }
});

// Helper function to parse time
function parseTime(timeStr) {
  const [time, period] = timeStr.split(' ');
  const [hours, minutes] = time.split(':').map(Number);
  return { hours: period === 'PM' && hours !== 12 ? hours + 12 : hours, minutes };
}

// Get current slot for any faculty
app.get("/current-slot/:facultyName/:day/:currentTime", async (req, res) => {
  try {
    const { facultyName, day, currentTime } = req.params;
    const decodedFacultyName = decodeURIComponent(facultyName);

    // Fetch faculty timetable
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SHEET_ID,
      range: 'FacultyTimetable!A2:F1000',
    });

    const timetableData = response.data.values || [];
    
    // Parse current time
    const current = parseTime(currentTime);
    
    // Find matching slot
    const currentSlot = timetableData.find(row => {
      if (row[0] !== day || row[2] !== decodedFacultyName) return false;
      
      const [startTime, endTime] = row[1].split(' - ');
      const start = parseTime(startTime);
      const end = parseTime(endTime);
      
      // Check if current time falls within slot
      return (
        (current.hours > start.hours || 
         (current.hours === start.hours && current.minutes >= start.minutes)) &&
        (current.hours < end.hours || 
         (current.hours === end.hours && current.minutes <= end.minutes))
      );
    });

    if (!currentSlot) {
      return res.json({ slot: null });
    }

    res.json({
      slot: {
        time_slot: currentSlot[1],
        subject: currentSlot[3],
        class_group: currentSlot[4],
        room: currentSlot[5]
      }
    });

  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({ 
      error: "Failed to fetch current slot",
      details: error.message
    });
  }
});

// Get students for class group
app.get("/class-students/:classGroup", async (req, res) => {
  try {
    const { classGroup } = req.params;
    const groups = classGroup.split(',').map(g => g.trim());
    
    // Fetch all student data
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SHEET_ID,
      range: 'AllStudents!A2:K1000'
    });

    const sheetData = response.data.values || [];
    
    // Filter students by class group
    const students = sheetData
      .filter(row => {
        const studentClass = row[9] || ''; // Class group column
        return groups.some(group => studentClass.includes(group));
      })
      .map(row => ({
        id: row[0],
        enrollment: row[1],
        name: row[2],
        branch: row[3],
        class: row[9]
      }));

    res.json({ students });
  } catch (error) {
    console.error("Error fetching students:", error);
    res.status(500).json({ 
      error: "Failed to fetch student list",
      details: error.message
    });
  }
});

// Get all faculty
app.get("/faculty", async (req, res) => {
  try {
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SHEET_ID,
      range: 'All_Faculties!A2:D100'
    });

    const facultyList = response.data.values.map(row => ({
      id: row[0],
      full_name: row[1],
      short_name: row[2],
      email: row[3]
    }));

    res.json(facultyList);
  } catch (error) {
    res.status(500).json({ 
      error: "Failed to fetch faculty list",
      details: error.message
    });
  }
});

// Faculty search endpoint
app.get("/api/faculty", async (req, res) => {
  try {
    const { employee_id, full_name } = req.query;
    
    if (!employee_id && !full_name) {
      return res.status(400).json({
        success: false,
        error: "Please provide either employee ID or name to search"
      });
    }

    // Get the latest sheet data
    const sheetData = await fetchSheetData();
    if (!sheetData || sheetData.length < 2) {
      return res.status(404).json({
        success: false,
        error: "No faculty data available"
      });
    }

    // Skip header row and filter faculty
    const facultyData = sheetData.slice(1).filter(row => {
      if (!row || row.length < 3) return false;

      const id = row[0]?.toString() || '';
      const name = row[1]?.toString() || '';
      const shortName = name.match(/\((.*?)\)/)?.[1] || '';

      // Search by ID
      if (employee_id && id.includes(employee_id)) {
        return true;
      }

      // Search by full name or short name
      if (full_name) {
        const searchTerm = full_name.toLowerCase();
        return name.toLowerCase().includes(searchTerm) || 
               shortName.toLowerCase().includes(searchTerm);
      }

      return false;
    });

    // Format the response
    const formattedFaculty = facultyData.map(row => ({
      employee_id: row[0] || '',
      full_name: row[1] || '',
      email_id: row[2] || ''
    }));

    res.json({
      success: true,
      data: formattedFaculty
    });

  } catch (error) {
    console.error("Error in faculty search:", error);
    res.status(500).json({
      success: false,
      error: "Failed to search faculty data",
      details: process.env.NODE_ENV === "development" ? error.message : undefined
    });
  }
});

// Face verification endpoint
app.post('/verify-attendance', async (req, res) => {
  try {
    const { student_id, image, date, class_details } = req.body;
    console.log('Verifying attendance for:', { student_id, date, class_details });
    if (!student_id || !date || !class_details) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields'
      });
    }

    // 1. Get registered face image path and class group from DB
    const [faces] = await pool.query(
      'SELECT image_path, class_group FROM student_faces WHERE student_id = ?',
      [student_id]
    );
    if (!faces.length) {
      return res.status(404).json({ success: false, message: 'No registered face found' });
    }
    const imagePath = faces[0].image_path;
    const registeredClassGroup = faces[0].class_group;

    // 2. Read registered image as base64
    const registeredImageBase64 = fs.readFileSync(imagePath, { encoding: 'base64' });

    // 3. Send both images to Python service
    let verified = false;
    try {
      const response = await axios.post('http://127.0.0.1:5000/verify-face', {
        registered_image: registeredImageBase64,
        current_image: image
      });
      verified = response.data.success;
    } catch (err) {
      console.error('Error calling face verification service:', err.message);
      return res.status(500).json({ success: false, message: 'Face verification service error' });
    }
    if (!verified) {
      return res.json({ success: false, verified: false, message: 'Face verification failed' });
    }

    // 4. Mark attendance in database
    try {
      // First verify that the student exists
      const [students] = await pool.query(
        'SELECT * FROM students WHERE enrollment_no = ?',
        [student_id]
      );
      if (students.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Student not found'
        });
      }

      // Verify class group matches
      if (registeredClassGroup && !class_details.class_group.includes(registeredClassGroup)) {
        return res.status(400).json({
          success: false,
          message: 'Student is not registered for this class group'
        });
      }

      // Mark attendance
      const [result] = await pool.query(
        `INSERT INTO attendance 
         (student_id, date, subject, class_group, time_slot, room, status) 
         VALUES (?, ?, ?, ?, ?, ?, 'present')
         ON DUPLICATE KEY UPDATE 
         status = 'present',
         subject = VALUES(subject),
         class_group = VALUES(class_group),
         time_slot = VALUES(time_slot),
         room = VALUES(room)`,
        [
          student_id,
          date,
          class_details.subject,
          class_details.class_group,
          class_details.time_slot,
          class_details.room
        ]
      );
      console.log('Attendance marked successfully:', result);
      res.json({ 
        success: true, 
        verified: true,
        message: 'Attendance marked successfully'
      });
    } catch (dbError) {
      console.error('Database error:', dbError);
      res.status(500).json({ success: false, message: 'Failed to mark attendance in database' });
    }
  } catch (error) {
    console.error('Error in face verification:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to verify attendance',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Ensure uploads directory exists
const uploadDir = path.join(__dirname, '..', 'known_faces');
if (!fs.existsSync(uploadDir)){
    fs.mkdirSync(uploadDir, { recursive: true });
}

// Update multer config
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const ext = path.extname(file.originalname);
    cb(null, req.body.student_id + ext);
  }
});

const upload = multer({ storage: storage });

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    time: new Date().toISOString(),
    uploadsDir: uploadDir,
    dirExists: fs.existsSync(uploadDir)
  });
});

// Face registration endpoint
app.post('/register-face', async (req, res) => {
  try {
    const { student_id, image } = req.body;
    console.log('Registering face for student:', student_id);

    if (!student_id || !image) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields'
      });
    }

    // First verify that the student exists and get their class group
    const [students] = await pool.query(
      'SELECT class, batch FROM students WHERE enrollment_no = ?',
      [student_id]
    );

    if (students.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Student not found'
      });
    }

    const student = students[0];
    const classGroup = student.class || student.batch;

    if (!classGroup) {
      return res.status(400).json({
        success: false,
        message: 'Student has no class group assigned'
      });
    }

    // Create directory if it doesn't exist
    const dir = path.join(__dirname, 'known_faces');
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir);
    }

    // Save the image
    const imagePath = path.join(dir, `${student_id}.jpg`);
    const imageData = image.replace(/^data:image\/jpeg;base64,/, '');
    fs.writeFileSync(imagePath, imageData, 'base64');

    // Send to Python service for face recognition
    try {
      const pythonResponse = await axios.post('http://127.0.0.1:5000/register-face', {
        image: `data:image/jpeg;base64,${imageData}`,
        studentId: student_id
      });

      if (!pythonResponse.data.success) {
        throw new Error(pythonResponse.data.error || 'Failed to register face in recognition system');
      }
    } catch (error) {
      console.error('Error calling face recognition service:', error);
      // Clean up the saved image
      if (fs.existsSync(imagePath)) {
        fs.unlinkSync(imagePath);
      }
      return res.status(500).json({
        success: false,
        message: 'Failed to register face in recognition system',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }

    // Save to database
    await pool.query(
      'INSERT INTO student_faces (student_id, image_path, class_group) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE image_path = ?, class_group = ?',
      [student_id, imagePath, classGroup, imagePath, classGroup]
    );

    res.json({
      success: true,
      message: 'Face registered successfully'
    });
  } catch (error) {
    console.error('Error registering face:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to register face',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Initialize database tables
async function initializeTables() {
  try {
    // Create student_faces table if it doesn't exist
    await pool.query(`
      CREATE TABLE IF NOT EXISTS student_faces (
        id INT AUTO_INCREMENT PRIMARY KEY,
        student_id VARCHAR(20) NOT NULL UNIQUE,
        image_path VARCHAR(255) NOT NULL,
        class_group VARCHAR(20),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (student_id) REFERENCES students(enrollment_no)
      )
    `);

    // Add class_group column if it doesn't exist
    const [columns] = await pool.query('SHOW COLUMNS FROM student_faces');
    const hasClassGroup = columns.some(col => col.Field === 'class_group');
    
    if (!hasClassGroup) {
      await pool.query('ALTER TABLE student_faces ADD COLUMN class_group VARCHAR(20)');
    }

    // Create attendance table if it doesn't exist
    await pool.query(`
      CREATE TABLE IF NOT EXISTS attendance (
        id INT AUTO_INCREMENT PRIMARY KEY,
        student_id VARCHAR(20) NOT NULL,
        date DATE NOT NULL,
        subject VARCHAR(100) NOT NULL,
        class_group VARCHAR(20) NOT NULL,
        time_slot VARCHAR(50) NOT NULL,
        room VARCHAR(50) NOT NULL,
        status ENUM('present', 'absent') NOT NULL DEFAULT 'present',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY unique_attendance (student_id, date, subject, time_slot)
      )
    `);

    console.log('Database tables initialized successfully');
  } catch (error) {
    console.error('Error initializing database tables:', error);
    throw error;
  }
}

// Call initializeTables when server starts
initializeTables().catch(console.error);

// Start server
const PORT = 3001;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

// Get attendance records for a specific date
app.get("/attendance-records/:date", async (req, res) => {
  try {
    const { date } = req.params;
    console.log("Fetching attendance records for date:", date);

    // Validate date format
    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return res.status(400).json({
        success: false,
        error: "Invalid date format. Please use YYYY-MM-DD format."
      });
    }

    const query = `
      SELECT 
        a.*,
        s.name as student_name
      FROM attendance a
      JOIN students s ON a.student_id = s.enrollment_no
      WHERE DATE(a.date) = ?
      ORDER BY a.created_at DESC
    `;

    console.log("Executing query:", query, "with date:", date);

    const [records] = await pool.query(query, [date]);

    console.log(`Found ${records.length} attendance records`);

    res.json({
      success: true,
      records: records
    });
  } catch (error) {
    console.error("Error fetching attendance records:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch attendance records",
      details: error.message
    });
  }
});

// Export attendance records to Excel
app.get("/export-attendance/:date", async (req, res) => {
  try {
    const { date } = req.params;
    console.log("Exporting attendance records for date:", date);

    // Validate date format
    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return res.status(400).json({
        success: false,
        error: "Invalid date format. Please use YYYY-MM-DD format."
      });
    }

    const query = `
      SELECT 
        a.*,
        s.name as student_name
      FROM attendance a
      JOIN students s ON a.student_id = s.enrollment_no
      WHERE DATE(a.date) = ?
      ORDER BY a.created_at DESC
    `;

    const [records] = await pool.query(query, [date]);

    // Create a new workbook and worksheet
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Attendance Records');

    // Add headers
    worksheet.columns = [
      { header: 'Student ID', key: 'student_id', width: 15 },
      { header: 'Name', key: 'student_name', width: 30 },
      { header: 'Subject', key: 'subject', width: 20 },
      { header: 'Class Group', key: 'class_group', width: 15 },
      { header: 'Time Slot', key: 'time_slot', width: 15 },
      { header: 'Room', key: 'room', width: 10 },
      { header: 'Status', key: 'status', width: 10 },
      { header: 'Marked At', key: 'created_at', width: 20 }
    ];

    // Style the header row
    worksheet.getRow(1).font = { bold: true };
    worksheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE0E0E0' }
    };

    // Add data rows
    records.forEach(record => {
      worksheet.addRow({
        student_id: record.student_id,
        student_name: record.student_name,
        subject: record.subject,
        class_group: record.class_group,
        time_slot: record.time_slot,
        room: record.room,
        status: record.status,
        created_at: new Date(record.created_at).toLocaleString()
      });
    });

    // Set response headers
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
    res.setHeader(
      'Content-Disposition',
      `attachment; filename=attendance_${date}.xlsx`
    );

    // Write to response
    await workbook.xlsx.write(res);
    res.end();

  } catch (error) {
    console.error("Error exporting attendance records:", error);
    res.status(500).json({
      success: false,
      error: "Failed to export attendance records",
      details: error.message
    });
  }
});

// Search attendance by student name or enrollment
app.get('/attendance-search', async (req, res) => {
  try {
    const { query } = req.query;
    if (!query) {
      return res.status(400).json({ success: false, error: 'Query is required' });
    }
    // Search by enrollment_no or name (case-insensitive)
    const sql = `
      SELECT a.*, s.name as student_name
      FROM attendance a
      JOIN students s ON a.student_id = s.enrollment_no
      WHERE a.student_id LIKE ? OR s.name LIKE ?
      ORDER BY a.date DESC, a.created_at DESC
    `;
    const [records] = await pool.query(sql, [`%${query}%`, `%${query}%`]);
    res.json({ success: true, records });
  } catch (error) {
    console.error('Error in attendance search:', error);
    res.status(500).json({ success: false, error: 'Failed to search attendance' });
  }
});

const fetchStudentSheetData = async () => {
  const response = await axios.get(`http://localhost:3001/api/sheet-data?type=students`);
  // ...handle response
};

// New paginated students endpoint
app.get('/students-paginated', async (req, res) => {
  try {
    const { page = 1, pageSize = 50, ...filters } = req.query;
    const offset = (page - 1) * pageSize;
    
    // Build base query
    let query = `SELECT SQL_CALC_FOUND_ROWS * FROM students`;
    let countQuery = `SELECT COUNT(*) as total FROM students`;
    const params = [];
    const conditions = [];
    
    // Add filters
    if (filters.enrollment) {
      conditions.push(`enrollment_no LIKE ?`);
      params.push(`%${filters.enrollment}%`);
    }
    if (filters.name) {
      conditions.push(`name LIKE ?`);
      params.push(`%${filters.name}%`);
    }
    if (filters.className && filters.className !== 'All Classes') {
      conditions.push(`(class = ? OR batch = ?)`);
      params.push(filters.className, filters.className);
    }
    
    if (conditions.length > 0) {
      const whereClause = ` WHERE ` + conditions.join(' AND ');
      query += whereClause;
      countQuery += whereClause;
    }
    
    query += ` ORDER BY enrollment_no ASC LIMIT ? OFFSET ?`;
    params.push(parseInt(pageSize), parseInt(offset));
    
    const [students] = await pool.query(query, params);
    const [[{ total }]] = await pool.query(countQuery);
    
    res.json({
      success: true,
      data: students,
      pagination: {
        page: parseInt(page),
        pageSize: parseInt(pageSize),
        total,
        totalPages: Math.ceil(total / pageSize)
      }
    });
  } catch (err) {
    console.error('Error with paginated students:', err);
    res.status(500).json({ 
      success: false,
      error: 'Database error'
    });
  }
});