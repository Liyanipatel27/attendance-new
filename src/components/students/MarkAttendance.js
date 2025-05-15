import React, { useState, useRef, useEffect } from 'react';
import Webcam from 'react-webcam';
import axios from 'axios';
import { useLocation } from 'react-router-dom';
import './MarkAttendance.css';

const MarkAttendance = () => {
  const location = useLocation();
  const [students, setStudents] = useState([]);
  const [selectedStudent, setSelectedStudent] = useState('');
  const [attendanceDate, setAttendanceDate] = useState('');
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [attendanceStatus, setAttendanceStatus] = useState('');
  const [classDetails, setClassDetails] = useState(null);
  const [verificationMessage, setVerificationMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [cameraError, setCameraError] = useState('');
  const webcamRef = useRef(null);

  // Enhanced video constraints for better face detection
  const videoConstraints = {
    width: 1280,
    height: 720,
    facingMode: "user",
    aspectRatio: 1.777777778
  };

  useEffect(() => {
    const today = new Date().toISOString().split('T')[0];
    setAttendanceDate(today);
    
    if (location.state?.classDetails) {
      setClassDetails(location.state.classDetails);
      fetchClassStudents(location.state.classDetails);
    }
  }, [location]);

  const fetchClassStudents = async (details) => {
    try {
      // Handle multiple class groups (like "6IOT-A, 6IT-A(6IT-A-2)")
      const classGroups = (details.class_group || '').split(',').map(g => {
        // Extract the main class group (e.g., "6IT-A" from "6IT-A(6IT-A-2)")
        const match = g.trim().match(/^([^(]+)/);
        return match ? match[1].trim() : g.trim();
      });
      
      console.log('Processing class groups:', classGroups);
      
      // Fetch students for each class group
      let allStudents = [];
      for (const group of classGroups) {
        if (!group) continue;
        
        console.log('Fetching students for group:', group);
        const response = await axios.get(
          `http://localhost:3001/class-students/${encodeURIComponent(details.subject)}/${encodeURIComponent(group)}`
        );
        
        if (response.data.students && response.data.students.length > 0) {
          allStudents = [...allStudents, ...response.data.students];
        }
      }
      
      // Remove duplicates based on enrollment number
      const uniqueStudents = allStudents.filter(
        (student, index, self) => 
          index === self.findIndex(s => s.enrollment === student.enrollment)
      );
      
      console.log('Final student list:', uniqueStudents);
      setStudents(uniqueStudents);
    } catch (error) {
      console.error('Error fetching class students:', error);
      setVerificationMessage('Error fetching student list. Please try again.');
      setStudents([]);
    }
  };

  const startCamera = () => {
    setIsCameraActive(true);
    setVerificationMessage('');
    setAttendanceStatus('');
    setCameraError('');
  };

  const stopCamera = () => {
    setIsCameraActive(false);
    setVerificationMessage('');
    setCameraError('');
  };

  const handleCameraError = (error) => {
    console.error('Camera error:', error);
    setCameraError('Error accessing camera. Please ensure camera permissions are granted and try again.');
    setIsCameraActive(false);
  };

  const captureImage = async () => {
    if (!webcamRef.current || !selectedStudent) {
      setVerificationMessage('Please select a student and ensure camera is active');
      return;
    }

    setIsLoading(true);
    setVerificationMessage('Verifying face...');
    
    try {
      const imageSrc = webcamRef.current.getScreenshot();
      
      // Create a canvas to flip the image horizontally
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();
      
      // Wait for image to load
      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
        img.src = imageSrc;
      });
      
      // Set canvas size to match image
      canvas.width = img.width;
      canvas.height = img.height;
      
      // Flip the image horizontally
      ctx.translate(canvas.width, 0);
      ctx.scale(-1, 1);
      ctx.drawImage(img, 0, 0);
      
      // Get the flipped image as base64
      const flippedImage = canvas.toDataURL('image/jpeg', 0.7)
        .replace('image/jpeg', 'image/jpeg;quality=0.7')
        .replace(/^data:image\/jpeg;base64,/, '');
      
      console.log('Sending verification request:', {
        student_id: selectedStudent,
        date: attendanceDate,
        class_details: classDetails
      });

      const response = await axios.post('http://localhost:3001/verify-attendance', {
        student_id: selectedStudent,
        image: flippedImage,
        date: attendanceDate,
        class_details: {
          subject: classDetails.subject,
          class_group: classDetails.class_group,
          time_slot: classDetails.time_slot,
          room: classDetails.room
        }
      }, {
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        maxContentLength: 50 * 1024 * 1024,
        maxBodyLength: 50 * 1024 * 1024
      });

      console.log('Verification response:', response.data);

      if (response.data.success && response.data.verified) {
        setAttendanceStatus('success');
        setVerificationMessage('Face verified successfully! Attendance marked.');
        // Clear form after successful verification
        setSelectedStudent('');
        stopCamera();
      } else {
        setAttendanceStatus('error');
        let errorMessage = response.data.message || 'Face verification failed.';
        
        // Add more specific error messages based on the response
        if (response.data.error) {
          if (response.data.error.includes('detect face')) {
            errorMessage = 'Could not detect face clearly. Please ensure your face is well-lit and centered in the frame.';
          } else if (response.data.error.includes('distance')) {
            errorMessage = 'Face verification failed. Please try again with better lighting and a clearer view of your face.';
          }
        }
        
        setVerificationMessage(errorMessage);
      }
    } catch (error) {
      console.error('Error verifying attendance:', error);
      setAttendanceStatus('error');
      
      if (error.response?.data?.message) {
        setVerificationMessage(error.response.data.message);
      } else if (error.message.includes('PayloadTooLargeError')) {
        setVerificationMessage('Image size too large. Please try again.');
      } else if (error.message.includes('Network Error')) {
        setVerificationMessage('Network error. Please check your internet connection and try again.');
      } else {
        setVerificationMessage('Error during verification. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="mark-attendance-container">
      <h2>Mark Student Attendance</h2>
      
      {classDetails && (
        <div className="class-info">
          <h3>Current Class Details</h3>
          <p><strong>Subject:</strong> {classDetails.subject}</p>
          <p><strong>Class Group:</strong> {classDetails.class_group}</p>
          <p><strong>Time:</strong> {classDetails.time_slot}</p>
          <p><strong>Room:</strong> {classDetails.room}</p>
        </div>
      )}
      
      <div className="attendance-form">
        <div className="form-group">
          <label>Select Student:</label>
          <select 
            value={selectedStudent} 
            onChange={(e) => setSelectedStudent(e.target.value)}
            className="form-control"
            disabled={isLoading}
          >
            <option value=''>Select Student</option>
            {students.map((student) => (
              <option key={student.enrollment} value={student.enrollment}>
                {student.name} ({student.enrollment})
              </option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <label>Date:</label>
          <input
            type='date'
            value={attendanceDate}
            onChange={(e) => setAttendanceDate(e.target.value)}
            className="form-control"
            disabled={isLoading}
          />
        </div>

        <div className="camera-section">
          {isCameraActive ? (
            <>
              <div className="webcam-container">
                <Webcam
                  ref={webcamRef}
                  screenshotFormat="image/jpeg"
                  className="webcam-view"
                  videoConstraints={videoConstraints}
                  onUserMediaError={handleCameraError}
                  mirrored={true}
                />
              </div>
              {cameraError && (
                <div className="alert alert-danger">
                  {cameraError}
                </div>
              )}
              <div className="camera-controls">
                <button 
                  onClick={captureImage} 
                  className="btn btn-primary"
                  disabled={isLoading || !selectedStudent}
                >
                  {isLoading ? 'Verifying...' : 'Capture & Verify'}
                </button>
                <button 
                  onClick={stopCamera} 
                  className="btn btn-secondary"
                  disabled={isLoading}
                >
                  Stop Camera
                </button>
              </div>
            </>
          ) : (
            <button 
              onClick={startCamera} 
              className="btn btn-primary"
              disabled={isLoading}
            >
              Start Camera
            </button>
          )}
        </div>

        {verificationMessage && (
          <div className={`alert ${attendanceStatus === 'success' ? 'alert-success' : 'alert-info'}`}>
            {verificationMessage}
          </div>
        )}
        
        {attendanceStatus === 'success' && (
          <div className="alert alert-success">
            ✅ Attendance marked successfully!
          </div>
        )}
        {attendanceStatus === 'error' && (
          <div className="alert alert-danger">
            ❌ Failed to mark attendance. Please try again.
          </div>
        )}
      </div>
    </div>
  );
};

export default MarkAttendance;