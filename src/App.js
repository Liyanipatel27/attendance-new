import React, { useEffect, useState } from "react";
import { BrowserRouter as Router, Routes, Route, createBrowserRouter, RouterProvider } from "react-router-dom";
import { io } from "socket.io-client";
import Login from "./components/Login";
import Dashboard from "./components/Dashboard";
import Timetable from "./components/Timetable";
import Students from './components/Students';
import StudentDashboard from "./components/students/StudentDashboard";
import Faculty from './components/Faculty';
import FacultyDashboard from "./components/faculty/FacultyDashboard";
import FacultyAttendance from "./components/faculty/FacultyAttendance";
import MarkAttendance from "./components/students/MarkAttendance";
import FacultyTimetable from "./components/faculty/FacultyTimetable";
import { AttendanceProvider } from "./context/AttendanceContext";
import ViewAttendance from "./components/faculty/ViewAttendance";
import AutoUpdate from "./components/faculty/AutoUpdate";
import { SheetProvider } from "./context/SheetContext";
import FaceRegister from "./components/FaceRegister";
import CameraTest from "./components/CameraTest";
import axios from "axios";
import Papa from 'papaparse';

const socket = io('http://localhost:3001', {
  transports: ['websocket'],
  reconnection: true,
  reconnectionAttempts: 5,
  reconnectionDelay: 1000
});

const SHEET_ID = 'your_sheet_id_here';
const API_KEY = 'your_google_api_key_here';

const CLASSES = [
  { name: "6IT-A", tab: "6IT-A" },
  { name: "6IT-B", tab: "6IT-B" },
  // ...add all your classes/tabs here
];

const router = createBrowserRouter([
  {
    path: "/",
    element: <Login />
  },
  {
    path: "/dashboard",
    element: <Dashboard />
  },
  {
    path: "/students",
    element: <Students />
  },
  {
    path: "/student-dashboard",
    element: <StudentDashboard />
  },
  {
    path: "/mark-attendance",
    element: <MarkAttendance />
  },
  {
    path: "/faculty",
    element: <Faculty />
  },
  {
    path: "/faculty-dashboard",
    element: <FacultyDashboard />
  },
  {
    path: "/faculty-attendance",
    element: <FacultyAttendance />
  },
  {
    path: "/live-sheet",
    element: <AutoUpdate />
  },
  {
    path: "/timetable",
    element: <Timetable />
  },
  {
    path: "/faculty-timetable/:facultyName",
    element: <FacultyTimetable />
  },
  {
    path: "/view-attendance",
    element: <ViewAttendance />
  },
  {
    path: "/face-register",
    element: <FaceRegister />
  },
  {
    path: "/camera-test",
    element: <CameraTest />
  }
], {
  future: {
    v7_startTransition: true,
    v7_relativeSplatPath: true
  }
});

const App = () => {
  const [selectedClass, setSelectedClass] = useState(CLASSES[0].name);
  const [timetable, setTimetable] = useState([]);

  useEffect(() => {
    // ...fetch logic here
  }, [selectedClass]);

  return (
    <AttendanceProvider socket={socket}>
      <SheetProvider>
        <RouterProvider router={router} />
      </SheetProvider>
    </AttendanceProvider>
  );
};

export default App;