import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './ViewAttendance.css';

const ViewAttendance = () => {
  const [attendanceRecords, setAttendanceRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    fetchAttendanceRecords();
  }, [selectedDate]);

  const fetchAttendanceRecords = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`http://localhost:3001/attendance-records/${selectedDate}`);
      setAttendanceRecords(response.data.records);
      setError(null);
    } catch (err) {
      console.error('Error fetching attendance records:', err);
      setError('Failed to fetch attendance records');
      setAttendanceRecords([]);
    } finally {
      setLoading(false);
    }
  };

  const handleExportToExcel = async () => {
    try {
      setExporting(true);
      setError(null);
      const response = await axios.get(
        `http://localhost:3001/export-attendance/${selectedDate}`,
        {
          responseType: 'blob',
          headers: {
            'Accept': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
          }
        }
      );
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `attendance_${selectedDate}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Error exporting to Excel:', err);
      setError('Failed to export attendance records to Excel. Please try again.');
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="view-attendance-container">
      <h2>View Attendance Records</h2>
      
      <div className="date-filter">
        <label htmlFor="date-select">Select Date:</label>
        <input
          type="date"
          id="date-select"
          value={selectedDate}
          onChange={(e) => setSelectedDate(e.target.value)}
          className="date-input"
        />
        {attendanceRecords.length > 0 && (
          <button
            onClick={handleExportToExcel}
            className="export-button"
            disabled={exporting}
          >
            {exporting ? 'Exporting...' : 'Export to Excel'}
          </button>
        )}
      </div>

      {loading ? (
        <p>Loading attendance records...</p>
      ) : error ? (
        <p className="error-message">{error}</p>
      ) : attendanceRecords.length > 0 ? (
        <div className="attendance-table-container">
          <table className="attendance-table">
            <thead>
              <tr>
                <th>Student ID</th>
                <th>Name</th>
                <th>Subject</th>
                <th>Class Group</th>
                <th>Time Slot</th>
                <th>Room</th>
                <th>Status</th>
                <th>Marked At</th>
              </tr>
            </thead>
            <tbody>
              {attendanceRecords.map((record) => (
                <tr key={record.id}>
                  <td>{record.student_id}</td>
                  <td>{record.student_name}</td>
                  <td>{record.subject}</td>
                  <td>{record.class_group}</td>
                  <td>{record.time_slot}</td>
                  <td>{record.room}</td>
                  <td>
                    <span className={`status-badge ${record.status}`}>
                      {record.status}
                    </span>
                  </td>
                  <td>{new Date(record.created_at).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p>No attendance records found for the selected date.</p>
      )}
    </div>
  );
};

export default ViewAttendance;