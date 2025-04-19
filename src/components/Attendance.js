import React, { useState } from "react";
import Webcam from "react-webcam";
import "./Attendance.css"; // We'll create this CSS file

const Attendance = () => {
  const [attendanceMarked, setAttendanceMarked] = useState(false);

  const markAttendance = () => {
    setAttendanceMarked(true);
  };

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold">Attendance System</h2>
      <Webcam className="w-full h-48 rounded-lg" />
      <button className="bg-green-500 text-white px-4 py-2 mt-4" onClick={markAttendance}>
        Mark Attendance
      </button>
      {attendanceMarked && <p className="text-green-600 mt-2 font-semibold">✅ Attendance Marked Successfully!</p>}
    </div>
  );
};

export default Attendance;
