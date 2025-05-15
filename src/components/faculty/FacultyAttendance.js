import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import socket from '../../utils/socket';
import './FacultyAttendance.css';
import axios from 'axios';

const FacultyAttendance = () => {
  const navigate = useNavigate();
  const [facultyList, setFacultyList] = useState([]);
  const [selectedFaculty, setSelectedFaculty] = useState(null);
  const [currentSlot, setCurrentSlot] = useState(null);
  const [currentDay, setCurrentDay] = useState('');
  const [currentTime, setCurrentTime] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [students, setStudents] = useState([]);
  const [isLoadingStudents, setIsLoadingStudents] = useState(false);

  useEffect(() => {
    fetchFacultyList();
    updateCurrentDateTime();
    const interval = setInterval(updateCurrentDateTime, 60000);

    // Socket.IO event listeners
    socket.on('new_attendance_session', (sessionData) => {
      console.log('New attendance session:', sessionData);
    });

    socket.on('attendance_submitted', (submissionData) => {
      console.log('Attendance submitted:', submissionData);
    });

    return () => {
      clearInterval(interval);
      socket.off('new_attendance_session');
      socket.off('attendance_submitted');
    };
  }, []);

  useEffect(() => {
    if (selectedFaculty) {
      fetchCurrentSlot();
    }
  }, [selectedFaculty, currentDay, currentTime]);

  const updateCurrentDateTime = () => {
    const now = new Date();
    const days = [ 'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    setCurrentDay(days[now.getDay()]);
    
    let hours = now.getHours();
    const minutes = now.getMinutes();
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours ? hours : 12;
    const formattedTime = `${hours}:${minutes < 10 ? '0' + minutes : minutes} ${ampm}`;
    setCurrentTime(formattedTime);
  };

  const fetchFacultyList = async () => {
    try {
      const response = await fetch('http://localhost:3001/faculty');
      const data = await response.json();
      setFacultyList(data);
      
      // Auto-select Prof. Hiten Sadani
      const hiten = data.find(f => f.short_name === 'HMS');
      if (hiten) {
        setSelectedFaculty(hiten);
      }
    } catch (error) {
      console.error('Error fetching faculty list:', error);
    }
  };

  const fetchCurrentSlot = async () => {
    if (!selectedFaculty) return;
    
    setIsLoading(true);
    try {
      const response = await fetch(
        `http://localhost:3001/current-slot/${encodeURIComponent(selectedFaculty.full_name)}/${currentDay}/${currentTime}`
      );
      const data = await response.json();
      setCurrentSlot(data.slot || null);
    } catch (error) {
      console.error('Error fetching current slot:', error);
      setCurrentSlot(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (currentSlot) {
      fetchStudentList();
    } else {
      setStudents([]);
    }
  }, [currentSlot]);

  const fetchStudentList = async () => {
    if (!currentSlot || !currentSlot.subject) {
      setStudents([]);
      return;
    }
    
    setIsLoadingStudents(true);
    try {
      console.log('Fetching students for:', {
        subject: currentSlot.subject,
        classGroup: currentSlot.class_group
      });

      // Handle specific class groups
      const classGroups = currentSlot.class_group.split(',').map(g => g.trim());
      console.log('Processing class groups:', classGroups);

      // Fetch students for each class group
      let allStudents = [];
      for (const group of classGroups) {
        if (!group) continue;
        
        console.log('Fetching students for group:', group);
        const response = await axios.get(
          `http://localhost:3001/class-students/${encodeURIComponent(currentSlot.subject)}/${encodeURIComponent(group)}`
        );
        
        if (response.data.students && response.data.students.length > 0) {
          // Filter students to ensure they belong to the exact class group
          const filteredStudents = response.data.students.filter(student => 
            student.class === group || student.batch === group
          );
          allStudents = [...allStudents, ...filteredStudents];
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
      console.error('Error fetching student list:', {
        message: error.message,
        response: error.response?.data
      });
      setStudents([]);
    } finally {
      setIsLoadingStudents(false);
    }
  };

  const handleStartAttendance = () => {
    if (currentSlot) {
      // Emit start_attendance event
      socket.emit('start_attendance', {
        faculty: selectedFaculty.full_name,
        subject: currentSlot.subject,
        class_group: currentSlot.class_group,
        time_slot: currentSlot.time_slot
      });
      navigate('/mark-attendance', {
        state: {
          classDetails: {
            subject: currentSlot.subject,
            class_group: currentSlot.class_group,
            time_slot: currentSlot.time_slot,
            room: currentSlot.room,
            faculty: selectedFaculty.full_name
          }
        }
      });
    }
  };

  return (
    <div className="faculty-attendance-container">
      <h2>Faculty Attendance</h2>
      
      <div className="current-info">
        <p><strong>Current Day:</strong> {currentDay}</p>
        <p><strong>Current Time:</strong> {currentTime}</p>
      </div>
      
      <div className="faculty-selector">
        <label htmlFor="faculty-select">Select Faculty:</label>
        <select 
          id="faculty-select"
          value={selectedFaculty ? JSON.stringify(selectedFaculty) : ''}
          onChange={(e) => setSelectedFaculty(JSON.parse(e.target.value))}
        >
          <option value="">Select Faculty</option>
          {facultyList.map((faculty) => (
            <option key={faculty.employee_id} value={JSON.stringify(faculty)}>
              {faculty.full_name} ({faculty.short_name})
            </option>
          ))}
        </select>
      </div>
      
      {selectedFaculty && (
        <div className="current-slot-section">
          <h3>{selectedFaculty.full_name}'s Current Class</h3>
          
          {isLoading ? (
            <p>Checking schedule...</p>
          ) : currentSlot ? (
            <>
              <div className="slot-card">
                <p><strong>Time:</strong> {currentSlot.time_slot}</p>
                <p><strong>Subject:</strong> {currentSlot.subject}</p>
                <p><strong>Class Group:</strong> {currentSlot.class_group}</p>
                <p><strong>Room:</strong> {currentSlot.room}</p>
                <div className="live-indicator">● CURRENTLY IN CLASS</div>
                <button 
                  onClick={handleStartAttendance}
                  className="start-attendance-btn"
                >
                  Start Attendance
                </button>
              </div>
              
              <div className="student-list-section">
                <h4>Student List</h4>
                {isLoadingStudents ? (
                  <p>Loading student list...</p>
                ) : students.length > 0 ? (
                  <table className="student-table">
                    <thead>
                      <tr>
                        <th>ID</th>
                        <th>Enrollment</th>
                        <th>Name</th>
                        <th>Branch</th>
                        <th>Class</th>
                      </tr>
                    </thead>
                    <tbody>
                      {students.map((student) => (
                        <tr key={student.id}>
                          <td>{student.id}</td>
                          <td>{student.enrollment}</td>
                          <td>{student.name}</td>
                          <td>{student.branch}</td>
                          <td>{student.class}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <p>No students found for this class.</p>
                )}
              </div>
            </>
          ) : (
            <p>No class scheduled at this time.</p>
          )}
        </div>
      )}
    </div>
  );
};

export default FacultyAttendance;