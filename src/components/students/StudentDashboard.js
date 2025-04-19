import React from 'react';
import { Link } from 'react-router-dom';

const StudentDashboard = () => {
  return (
    <div className="simple-dashboard">
      <h1>Student Portal</h1>
      
      <div className="button-grid">
        <Link to="/mark-attendance" className="simple-button">
          Mark Attendance
        </Link>
        
        <Link to="/view-attendance" className="simple-button">
          View Attendance
        </Link>
        
        <Link to="/timetable" className="simple-button">
          College Timetable
        </Link>
      </div>
    </div>
  );
};

export default StudentDashboard;