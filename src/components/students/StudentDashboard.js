import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import Webcam from 'react-webcam';
import socket from '../../utils/socket';
import './StudentDashboard.css';

const StudentDashboard = () => {
  const [students, setStudents] = useState([]);
  const [selectedStudent, setSelectedStudent] = useState('');
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [verificationMessage, setVerificationMessage] = useState('');
  const [attendanceStatus, setAttendanceStatus] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [currentClass, setCurrentClass] = useState(null);
  const webcamRef = useRef(null);

  useEffect(() => {
    // Listen for attendance session start
    socket.on('start_attendance', async (sessionData) => {
      try {
        // Fetch students for this class
        const response = await axios.get(
          `http://localhost:3001/class-students/${encodeURIComponent(sessionData.subject)}/${encodeURIComponent(sessionData.class_group)}`
        );
        
        if (response.data.students) {
          setCurrentClass({
            subject: sessionData.subject,
            class_group: sessionData.class_group,
            time_slot: sessionData.time_slot,
            faculty: sessionData.faculty
          });
          setStudents(response.data.students);
        }
      } catch (error) {
        console.error('Error fetching students:', error);
      }
    });

    // Listen for attendance session end
    socket.on('end_attendance', () => {
      setCurrentClass(null);
      setStudents([]);
      setSelectedStudent('');
      setVerificationMessage('');
      setAttendanceStatus('');
      if (isCameraActive) {
        stopCamera();
      }
    });

    return () => {
      socket.off('start_attendance');
      socket.off('end_attendance');
    };
  }, []);

  const startCamera = () => {
    setIsCameraActive(true);
    setVerificationMessage('');
    setAttendanceStatus('');
  };

  const stopCamera = () => {
    setIsCameraActive(false);
    setVerificationMessage('');
  };

  const handleMarkAttendance = async () => {
    if (!selectedStudent) {
      setVerificationMessage('Please select a student first');
      return;
    }

    if (!webcamRef.current) {
      setVerificationMessage('Camera not initialized');
      return;
    }

    setIsLoading(true);
    try {
      const imageSrc = webcamRef.current.getScreenshot();
      
      const response = await axios.post('http://localhost:3001/verify-attendance', {
        student_id: selectedStudent,
        image: imageSrc,
        date: new Date().toISOString().split('T')[0],
        class_details: currentClass
      });

      if (response.data.success && response.data.verified) {
        setAttendanceStatus('success');
        setVerificationMessage('Face verified successfully! Attendance marked.');
        setSelectedStudent('');
        stopCamera();
      } else {
        setAttendanceStatus('error');
        setVerificationMessage(response.data.message || 'Face verification failed');
      }
    } catch (error) {
      setAttendanceStatus('error');
      setVerificationMessage('Error marking attendance. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="student-dashboard">
      <h1>Student Portal</h1>
      
      <div className="dashboard-sections">
        <div className="mark-attendance-section">
          <h2>Mark Attendance</h2>
          
          {currentClass ? (
            <>
              <div className="class-info">
                <h3>Current Class Details</h3>
                <p><strong>Subject:</strong> {currentClass.subject}</p>
                <p><strong>Class Group:</strong> {currentClass.class_group}</p>
                <p><strong>Time:</strong> {currentClass.time_slot}</p>
                <p><strong>Faculty:</strong> {currentClass.faculty}</p>
                <div className="live-indicator">● ATTENDANCE IN PROGRESS</div>
              </div>

              <div className="student-selector">
                <label>Select Student:</label>
                <select 
                  value={selectedStudent} 
                  onChange={(e) => setSelectedStudent(e.target.value)}
                  className="student-select"
                >
                  <option value="">Select Student</option>
                  {students.map((student) => (
                    <option key={student.enrollment} value={student.enrollment}>
                      {student.name} ({student.enrollment})
                    </option>
                  ))}
                </select>
              </div>

              {isCameraActive ? (
                <div className="camera-section">
                  <div className="camera-container">
                    <Webcam
                      ref={webcamRef}
                      screenshotFormat="image/jpeg"
                      videoConstraints={{
                        width: 1280,
                        height: 720,
                        facingMode: "user"
                      }}
                    />
                  </div>
                  <div className="camera-controls">
                    <button 
                      onClick={handleMarkAttendance}
                      className="mark-btn"
                      disabled={isLoading}
                    >
                      {isLoading ? 'Marking...' : 'Mark Attendance'}
                    </button>
                    <button 
                      onClick={stopCamera}
                      className="stop-btn"
                    >
                      Stop Camera
                    </button>
                  </div>
                </div>
              ) : (
                <button 
                  onClick={startCamera}
                  className="start-camera-btn"
                >
                  Start Camera
                </button>
              )}

              {verificationMessage && (
                <div className={`message ${attendanceStatus}`}>
                  {verificationMessage}
                </div>
              )}
            </>
          ) : (
            <div className="no-class-message">
              <p>Waiting for faculty to start attendance...</p>
              <p>Please wait until your faculty starts the attendance session.</p>
            </div>
          )}
        </div>

        <div className="dashboard-links">
          <Link to="/view-attendance" className="dashboard-link">
            View Attendance
          </Link>
          
          <Link to="/timetable" className="dashboard-link">
            College Timetable
          </Link>
        </div>
      </div>
    </div>
  );
};

export default StudentDashboard;