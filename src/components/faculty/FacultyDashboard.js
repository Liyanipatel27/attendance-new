import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import './FacultyDashboard.css';

const FacultyDashboard = () => {
  useEffect(() => {
    // Add animation class to buttons on load
    const buttons = document.querySelectorAll('.dashboard-button');
    buttons.forEach((button, index) => {
      setTimeout(() => {
        button.classList.add('animate-in');
      }, index * 100);
    });
  }, []);

  return (
    <div className="dashboard-container">
      <div className="dashboard-header">
        <h1 className="dashboard-title">Faculty Portal</h1>
      </div>
      
      <div className="dashboard-grid">
        <Link to="/faculty-timetable/:facultyName" className="dashboard-button card-blue">
          <div className="button-content">
            <i className="fas fa-calendar-alt button-icon"></i>
            <span className="button-text">My Timetable</span>
          </div>
          <div className="button-wave"></div>
        </Link>
        
        <Link to="/faculty-attendance" className="dashboard-button card-green">
          <div className="button-content">
            <i className="fas fa-clipboard-check button-icon"></i>
            <span className="button-text">Take Attendance</span>
          </div>
          <div className="button-wave"></div>
        </Link>
        
        <Link to="/view-attendance" className="dashboard-button card-purple">
          <div className="button-content">
            <i className="fas fa-eye button-icon"></i>
            <span className="button-text">View Attendance</span>
          </div>
          <div className="button-wave"></div>
        </Link>
        
        <Link to="/timetable" className="dashboard-button card-orange">
          <div className="button-content">
          <i className="fas fa-calendar-alt button-icon"></i>
            <span className="button-text">College Timetable</span>
          </div>
          <div className="button-wave"></div>
        </Link>
        
        <Link to="/students" className="dashboard-button card-red">
          <div className="button-content">
            <i className="fas fa-users button-icon"></i>
            <span className="button-text">Student List</span>
          </div>
          <div className="button-wave"></div>
        </Link>
        
        <Link to="/faculty" className="dashboard-button card-teal">
          <div className="button-content">
            <i className="fas fa-chalkboard-teacher button-icon"></i>
            <span className="button-text">Faculty Directory</span>
          </div>
          <div className="button-wave"></div>
        </Link>
      </div>
    </div>
  );
};

export default FacultyDashboard;