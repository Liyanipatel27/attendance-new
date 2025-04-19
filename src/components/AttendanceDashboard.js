import React, { useState } from "react";
import { MapPin, Clock, Camera } from "lucide-react";
import { Button } from "../components/ui/button";
import "./AttendanceDashboard.css";
import Webcam from "react-webcam";
import { motion } from "framer-motion";

const AttendanceDashboard = () => {
  const [classStarted, setClassStarted] = useState(false);
  const [attendanceMarked, setAttendanceMarked] = useState(false);

  const startClass = () => {
    setClassStarted(true);
  };

  const markAttendance = () => {
    if (!classStarted) {
      alert("Class has not started yet!");
      return;
    }
    setAttendanceMarked(true);
  };

  return (
    <div className="max-w-3xl mx-auto p-6">
      <motion.h1
        className="text-2xl font-bold mb-4 text-gray-800"
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
      >
        🎓 Smart Attendance System
      </motion.h1>

      {/* Faculty Location & Start Class Button */}
      <motion.div
        className="bg-white shadow-lg p-4 rounded-xl flex justify-between items-center"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
      >
        <div className="flex items-center">
          <MapPin className="text-blue-500 mr-2" />
          <span className="text-gray-600">Faculty Location: Live</span>
        </div>
        <Button onClick={startClass} disabled={classStarted}>
          {classStarted ? "Class Started ✅" : "Start Class"}
        </Button>
      </motion.div>

      {/* Timetable & Attendance Section */}
      <motion.div
        className="bg-white shadow-lg p-6 mt-4 rounded-xl"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1, transition: { delay: 0.3 } }}
      >
        <div className="flex items-center mb-2">
          <Clock className="text-green-500 mr-2" />
          <span className="text-gray-700">Your Class: 10:00 AM - 11:30 AM</span>
        </div>

        <Webcam className="w-full h-48 rounded-lg" />

        <Button onClick={markAttendance} className="mt-4 w-full">
          <Camera className="mr-2" /> Mark Attendance
        </Button>

        {attendanceMarked && (
          <p className="text-green-600 mt-2 font-semibold">✅ Attendance Marked Successfully!</p>
        )}
      </motion.div>
    </div>
  );
};

export default AttendanceDashboard;
