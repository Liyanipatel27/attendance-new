import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
//import './Timetable.css';

const FacultyTimetable = () => {
    // All hooks at the top level
    const daysOfWeek = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    const [timetable, setTimetable] = useState([]);
    const [selectedDay, setSelectedDay] = useState("");
    const [isLoading, setIsLoading] = useState(true); // Start with loading true
    const [error, setError] = useState(null);
    const { facultyName } = useParams();
    const navigate = useNavigate();

    // Verify facultyName exists
    useEffect(() => {
        if (!facultyName) {
            setError("Faculty name not found in URL");
            setIsLoading(false);
            // Redirect to faculty dashboard if no name provided
            navigate('/faculty-dashboard');
        }
    }, [facultyName, navigate]);

    // Set initial day
    useEffect(() => {
        const today = new Date().toLocaleString('en-us', { weekday: 'long' });
        setSelectedDay(daysOfWeek.includes(today) ? today : "Monday");
    }, []);

    // Fetch timetable
    useEffect(() => {
        if (!facultyName || !selectedDay) return;

        const fetchTimetable = async () => {
            try {
                setIsLoading(true);
                const response = await fetch(
                    `http://localhost:3001/faculty-timetable/${encodeURIComponent(facultyName)}/${selectedDay}`
                );
                
                if (!response.ok) {
                    throw new Error(`Failed to fetch timetable (Status: ${response.status})`);
                }
                
                const data = await response.json();
                
                if (!data.timetable) {
                    throw new Error("Invalid data format received from server");
                }
                
                setTimetable(data.timetable);
                setError(null);
            } catch (err) {
                console.error("Fetch error:", err);
                setError(err.message);
                setTimetable([]);
            } finally {
                setIsLoading(false);
            }
        };
        
        fetchTimetable();
    }, [facultyName, selectedDay]);

    // Render loading state
    if (isLoading) {
        return (
            <div className="loading-container">
                <div className="loading-spinner"></div>
                <p>Loading timetable for {facultyName}...</p>
            </div>
        );
    }

    // Render error state
    if (error) {
        return (
            <div className="error-container">
                <h3>Error Loading Timetable</h3>
                <p>{error}</p>
                <button 
                    className="retry-button"
                    onClick={() => window.location.reload()}
                >
                    Refresh Page
                </button>
                <button 
                    className="back-button"
                    onClick={() => navigate('/faculty-dashboard')}
                >
                    Back to Dashboard
                </button>
            </div>
        );
    }

    // Main render
    return (
        <div className="timetable-container">
            <h2>📅 Faculty Timetable for {facultyName}</h2>
            
            <div className="day-selector">
                {daysOfWeek.map(day => (
                    <button
                        key={day}
                        onClick={() => setSelectedDay(day)}
                        className={`day-button ${selectedDay === day ? 'active' : ''}`}
                    >
                        {day}
                    </button>
                ))}
            </div>

            <h3>{selectedDay}'s Schedule</h3>
            
            {timetable.length > 0 ? (
                <div className="timetable-table-container">
                    <table className="timetable-table">
                        <thead>
                            <tr>
                                <th>Time</th>
                                <th>Subject</th>
                                <th>Class</th>
                                <th>Room</th>
                            </tr>
                        </thead>
                        <tbody>
                            {timetable.map((lecture) => (
                                <tr key={`${lecture.id}-${lecture.time_slot}`}>
                                    <td>{lecture.time_slot}</td>
                                    <td>{lecture.subject}</td>
                                    <td>{lecture.class_group}</td>
                                    <td>{lecture.room}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            ) : (
                <div className="no-lectures">
                    <p>No lectures scheduled for {selectedDay}</p>
                </div>
            )}
        </div>
    );
};

export default FacultyTimetable;