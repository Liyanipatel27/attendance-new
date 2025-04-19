import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
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

const App = () => {
    return (
        <AttendanceProvider>
            <SheetProvider>
                <Router>
                    <Routes>
                        <Route path="/" element={<Login />} />
                        <Route path="/dashboard" element={<Dashboard />} />
                        <Route path="/students" element={<Students />} />
                        <Route path="/student-dashboard" element={<StudentDashboard />} />
                        <Route path="/mark-attendance" element={<MarkAttendance />} />
                        <Route path="/faculty" element={<Faculty />} />
                        <Route path="/faculty-dashboard" element={<FacultyDashboard />} />
                        <Route path="/faculty-attendance" element={<FacultyAttendance />} />
                        <Route path="/live-sheet" element={<AutoUpdate />} />
                        <Route path="/timetable" element={<Timetable />} />
                        <Route path="/faculty-timetable/:facultyName" element={<FacultyTimetable />} />
                        <Route path="/view-attendance" element={<ViewAttendance />} />
                    </Routes>
                </Router>
            </SheetProvider>
        </AttendanceProvider>
    );
};

export default App;