import React, { useState } from 'react';
import axios from 'axios';
import './ViewAttendance.css';

const StudentAttendance = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [attendanceRecords, setAttendanceRecords] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSearch = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setAttendanceRecords([]);
    try {
      // Search by enrollment or name
      const response = await axios.get(`http://localhost:3001/attendance-search?query=${encodeURIComponent(searchTerm)}`);
      if (response.data.success) {
        setAttendanceRecords(response.data.records);
      } else {
        setError(response.data.error || 'No attendance found');
      }
    } catch (err) {
      setError('Failed to fetch attendance. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="view-attendance-container">
      <h2>Search Your Attendance</h2>
      <form className="search-form" onSubmit={handleSearch}>
        <input
          type="text"
          placeholder="Enter Student ID or Name"
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          className="search-input"
        />
        <button type="submit" className="search-button" disabled={loading || !searchTerm.trim()}>
          {loading ? 'Searching...' : 'Search'}
        </button>
      </form>
      {error && <div className="error-message">{error}</div>}
      {attendanceRecords.length > 0 && (
        <div className="attendance-table-container">
          <table className="attendance-table">
            <thead>
              <tr>
                <th>Date</th>
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
                  <td>{new Date(record.date).toLocaleDateString()}</td>
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
      )}
    </div>
  );
};

export default StudentAttendance; 