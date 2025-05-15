import React, { useState, useEffect } from 'react';
import './FacultyAttendance.css';

const FacultyAttendance = () => {
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
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (selectedFaculty) {
      fetchCurrentSlot();
    }
  }, [selectedFaculty, currentDay, currentTime]);

  const updateCurrentDateTime = () => {
    const now = new Date();
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
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
    if (!currentSlot || !currentSlot.class_group) return;
    
    setIsLoadingStudents(true);
    try {
      const response = await fetch(
        `http://localhost:3001/class-students/${encodeURIComponent(currentSlot.class_group)}`
      );
      const data = await response.json();
      setStudents(data.students || []);
    } catch (error) {
      console.error('Error fetching student list:', error);
      setStudents([]);
    } finally {
      setIsLoadingStudents(false);
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
          value={selectedFaculty ? selectedFaculty.id : ''}
          onChange={(e) => {
            const faculty = facultyList.find(f => f.id === e.target.value);
            setSelectedFaculty(faculty);
          }}
        >
          <option value="">Select Faculty</option>
          {facultyList.map((faculty) => (
            <option key={faculty.id} value={faculty.id}>
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
                      {students.map((student, index) => (
                        <tr key={index}>
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