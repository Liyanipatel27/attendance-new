import { createContext, useState, useEffect } from 'react';

export const AttendanceContext = createContext();

export const AttendanceProvider = ({ children, socket }) => {
  const [activeSessions, setActiveSessions] = useState([]);
  const [studentSubmissions, setStudentSubmissions] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);

  // Handle socket events
  useEffect(() => {
    if (!socket) return;

    socket.on('new_attendance_session', (session) => {
      setActiveSessions(prev => [...prev, session]);
    });

    socket.on('attendance_submitted', (submission) => {
      setStudentSubmissions(prev => [...prev, submission]);
    });

    return () => {
      socket.off('new_attendance_session');
      socket.off('attendance_submitted');
    };
  }, [socket]);

  const startSession = (sessionData) => {
    if (socket) {
      socket.emit('start_attendance', sessionData);
    } else {
      console.error("Socket is not connected");
    }
  };

  const submitAttendance = (submissionData) => {
    if (socket) {
      socket.emit('submit_attendance', submissionData);
    } else {
      console.error("Socket is not connected");
    }
  };

  return (
    <AttendanceContext.Provider value={{
      activeSessions,
      studentSubmissions,
      currentUser,
      setCurrentUser,
      startSession,  // Ensure this function is in the context
      submitAttendance,
      socket
    }}>
      {children}
    </AttendanceContext.Provider>
  );
};
