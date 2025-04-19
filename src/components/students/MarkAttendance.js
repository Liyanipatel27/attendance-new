import React, { useEffect, useState } from 'react';
import axios from 'axios';

const MarkAttendance = () => {
  const [students, setStudents] = useState([]);
  const [selectedStudent, setSelectedStudent] = useState('');
  const [attendanceDate, setAttendanceDate] = useState('');

  useEffect(() => {
    const fetchStudents = async () => {
      try {
        const response = await axios.get('http://localhost:3001/students');
        setStudents(response.data);
      } catch (error) {
        console.error('Error fetching students:', error);
      }
    };
    fetchStudents();
  }, []);

  const handleAttendanceSubmit = async () => {
    try {
      await axios.post('http://localhost:3001/students/attendance', {
        student_id: selectedStudent,
        date: attendanceDate,
      });
      alert('Attendance marked successfully');
    } catch (error) {
      console.error('Error marking attendance:', error);
    }
  };

  return (
    <div>
      <h2>Mark Student Attendance</h2>
      <select onChange={(e) => setSelectedStudent(e.target.value)}>
        <option value=''>Select Student</option>
        {students.map((student) => (
          <option key={student.enrollment_no} value={student.enrollment_no}>
            {student.name}
          </option>
        ))}
      </select>
      <input
        type='date'
        value={attendanceDate}
        onChange={(e) => setAttendanceDate(e.target.value)}
      />
      <button onClick={handleAttendanceSubmit}>Mark Attendance</button>
    </div>
  );
};

export default MarkAttendance;