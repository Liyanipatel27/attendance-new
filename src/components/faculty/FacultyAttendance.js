import React, { useState, useEffect } from 'react';

const FacultyAttendance = () => {
  const [facultyList, setFacultyList] = useState([]);
  const [selectedFaculty, setSelectedFaculty] = useState(null);
  const [attendanceMarked, setAttendanceMarked] = useState(false);

  useEffect(() => {
    fetchFacultyList();
  }, []);

  const fetchFacultyList = async () => {
    try {
      const response = await fetch('http://localhost:3001/faculty');
      const data = await response.json();
      setFacultyList(data);
    } catch (error) {
      console.error('Error fetching faculty list:', error);
    }
  };

  const handleMarkAttendance = async () => {
    if (!selectedFaculty) {
      alert('Please select a faculty member first.');
      return;
    }

    try {
      const response = await fetch('http://localhost:3001/faculty/attendance', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          faculty_id: selectedFaculty.id, // Ensure this is the correct ID
          date: new Date().toISOString().split('T')[0], // Today's date
          status: 'Present', // Or 'Absent' based on selection
        }),
      });

      const data = await response.json();
      if (response.ok) {
        alert('Attendance marked successfully!');
        setAttendanceMarked(true);
      } else {
        alert(`Error: ${data.error}`);
      }
    } catch (error) {
      console.error('Error marking attendance:', error);
    }
  };

  return (
    <div>
      <h2>Faculty Attendance</h2>
      <select onChange={(e) => setSelectedFaculty(JSON.parse(e.target.value))}>
        <option value="">Select Faculty</option>
        {facultyList.map((faculty) => (
          <option key={faculty.id} value={JSON.stringify(faculty)}>
            {faculty.name}
          </option>
        ))}
      </select>
      <button onClick={handleMarkAttendance}>Mark Attendance</button>

      {attendanceMarked && <p>Attendance recorded successfully!</p>}
    </div>
  );
};

export default FacultyAttendance;
