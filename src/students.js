const express = require('express');
const router = express.Router();
const mysql = require('mysql2/promise');
const { google } = require('googleapis');
const keys = require('./attendance-450306-36ef1e9c731d.json');

// Database connection pool
const pool = mysql.createPool({
  host: "localhost",
  user: "root",
  password: "root",
  database: "college"
});

// Google Sheets Setup
const auth = new google.auth.GoogleAuth({
  credentials: keys,
  scopes: ["https://www.googleapis.com/auth/spreadsheets"],
});
const sheets = google.sheets({ version: "v4", auth });
const SHEET_ID = "11DqOO-J2e862FvAnHQgXlC8Xs7DgupYaAnbpmeE2lAc";

// Get all students with optional filters
router.get('/', async (req, res) => {
  try {
    const { enrollment, name, class: className, search } = req.query;
    
    let query = `
      SELECT 
        id,
        enrollment_no,
        name,
        branch,
        hosteller_commuter,
        semester,
        gender,
        admission_type,
        student_phone,
        parent_phone,
        gnu_email,
        personal_email,
        batch,
        class
      FROM students 
      WHERE 1=1
    `;
    const params = [];
    
    // Handle search parameter (searches across multiple fields)
    if (search) {
      query += ` AND (
        enrollment_no LIKE ? OR 
        name LIKE ? OR 
        class LIKE ? OR 
        batch LIKE ?
      )`;
      const searchTerm = `%${search}%`;
      params.push(searchTerm, searchTerm, searchTerm, searchTerm);
    } else {
      // Handle individual search parameters
      if (enrollment) {
        query += ` AND enrollment_no LIKE ?`;
        params.push(`%${enrollment}%`);
      }
      if (name) {
        query += ` AND name LIKE ?`;
        params.push(`%${name}%`);
      }
      if (className && className !== 'All Classes') {
        query += ` AND (class = ? OR batch = ?)`;
        params.push(className, className);
      }
    }
    
    // Add sorting
    query += ` ORDER BY 
      CASE 
        WHEN class IS NOT NULL THEN class 
        ELSE batch 
      END ASC,
      enrollment_no ASC
    `;
    
    console.log('Executing query:', query);
    console.log('With params:', params);
    
    const [students] = await pool.query(query, params);
    
    // Format the response
    const formattedStudents = students.map(student => ({
      id: student.id,
      enrollment_no: student.enrollment_no,
      name: student.name,
      branch: student.branch,
      hosteller_commuter: student.hosteller_commuter,
      semester: student.semester,
      gender: student.gender,
      admission_type: student.admission_type,
      student_phone: student.student_phone,
      parent_phone: student.parent_phone,
      gnu_email: student.gnu_email,
      personal_email: student.personal_email,
      batch: student.batch,
      class: student.class
    }));

    res.json({
      success: true,
      data: formattedStudents,
      total: formattedStudents.length,
      message: formattedStudents.length === 0 ? 'No records found matching your criteria' : 'Records found successfully'
    });
    
  } catch (err) {
    console.error('Database error:', err);
    res.status(500).json({ 
      success: false,
      error: 'Database error',
      details: process.env.NODE_ENV === 'development' ? err.message : undefined,
      message: 'Failed to fetch student records'
    });
  }
});

// Get students for a specific class group
router.get('/class/:classGroup', async (req, res) => {
  try {
    const { classGroup } = req.params;
    console.log('Fetching students for class group:', classGroup);
    
    // Handle multiple class groups and different formats
    const groups = classGroup.split(',').map(g => {
      // Extract the main class group (e.g., "6IT-A" from "6IT-A(6IT-A-2)")
      const match = g.trim().match(/^([^(]+)/);
      return match ? match[1].trim() : g.trim();
    });
    
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
      conditions.push(`(class = ? OR batch = ? OR batch LIKE ?)`);
      params.push(group, group, `${group}%`);
    });
    
    query += conditions.join(' OR ');
    query += ` ORDER BY enrollment_no ASC`;
    
    const [students] = await pool.query(query, params);
    
    res.json({
      success: true,
      data: students
    });
  } catch (error) {
    console.error("Error fetching students:", error);
    res.status(500).json({ 
      success: false,
      error: "Failed to fetch student list",
      details: process.env.NODE_ENV === "development" ? error.message : undefined
    });
  }
});

// Get student attendance records
router.get('/:studentId/attendance', async (req, res) => {
  try {
    const { studentId } = req.params;
    const { date } = req.query;

    let query = `
      SELECT 
        a.*,
        s.name as student_name
      FROM attendance a
      JOIN students s ON a.student_id = s.enrollment_no
      WHERE a.student_id = ?
    `;
    const params = [studentId];

    if (date) {
      query += ` AND DATE(a.date) = ?`;
      params.push(date);
    }

    query += ` ORDER BY a.date DESC, a.created_at DESC`;

    const [records] = await pool.query(query, params);

    res.json({
      success: true,
      data: records
    });
  } catch (error) {
    console.error('Error fetching student attendance:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch attendance records',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Get student face registration status
router.get('/:studentId/face-status', async (req, res) => {
  try {
    const { studentId } = req.params;

    const [faces] = await pool.query(
      'SELECT image_path, class_group FROM student_faces WHERE student_id = ?',
      [studentId]
    );

    res.json({
      success: true,
      data: {
        isRegistered: faces.length > 0,
        faceData: faces[0] || null
      }
    });
  } catch (error) {
    console.error('Error checking face registration:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to check face registration status',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

module.exports = router; 