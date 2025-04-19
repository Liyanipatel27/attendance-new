import React, { useState, useEffect } from "react";
import './Timetable.css';

const Timetable = () => {
    const daysOfWeek = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    const [timetable, setTimetable] = useState([]);
    const [selectedClass, setSelectedClass] = useState("");
    const [selectedDay, setSelectedDay] = useState("");
    const [currentLecture, setCurrentLecture] = useState(null);
    const [currentTime, setCurrentTime] = useState(new Date());
    const [classes, setClasses] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);

    // Fetch classes on component mount
    useEffect(() => {
        const fetchClasses = async () => {
            try {
                setIsLoading(true);
                const response = await fetch('http://localhost:3001/classes');
                if (!response.ok) throw new Error('Failed to fetch classes');
                
                const data = await response.json();
                setClasses(data.classes || data); // Handle both formats
                
                // Auto-select first class if available
                if (data.classes?.length > 0 || data.length > 0) {
                    setSelectedClass(data.classes?.[0]?.class_id || data[0]?.id);
                }
            } catch (err) {
                setError("कक्षाएं लोड करने में समस्या");
                console.error("Error fetching classes:", err);
            } finally {
                setIsLoading(false);
            }
        };
        
        fetchClasses();
    }, []);

    // Set initial day to current day
    useEffect(() => {
        const today = new Date().toLocaleString('en-us', { weekday: 'long' });
        setSelectedDay(daysOfWeek.includes(today) ? today : "Monday");
    }, []);

    // Update current time every minute
    useEffect(() => {
        const timer = setInterval(() => {
            setCurrentTime(new Date());
        }, 60000);
        return () => clearInterval(timer);
    }, []);

    // Fetch timetable when class or day changes
    
    useEffect(() => {
        if (!selectedClass || !selectedDay) return;
      
        const fetchTimetable = async () => {
          try {
            setIsLoading(true);
            const response = await fetch(
              `http://localhost:3001/timetable/${selectedClass}/${selectedDay}?_=${new Date().getTime()}`
            );
            
            if (!response.ok) throw new Error('Network response failed');
            
            const data = await response.json();
            
            // Remove duplicates
            const uniqueTimetable = [...new Map((data.timetable || []).map(item => 
                [item.time + item.subject + item.batch, item])
            ).values()];
            
            // Advanced sorting
            const sortedTimetable = uniqueTimetable.sort((a, b) => {
                const parseTime = (timeStr) => {
                    if (!timeStr || !timeStr.includes(" - ")) return 0;
                    
                    const [startTime] = timeStr.split(" - ");
                    const hasPM = timeStr.toLowerCase().includes('pm');
                    const hasAM = timeStr.toLowerCase().includes('am');
                    
                    let [hours, minutes] = startTime.split(":").map(Number);
                    
                    if (hasPM && hours < 12) hours += 12;
                    if (hasAM && hours === 12) hours = 0;
                    
                    // Smart detection for afternoon times without AM/PM
                    if (!hasAM && !hasPM && hours < 8 && 
                        !timeStr.includes('Morning') && 
                        !timeStr.includes('Breakfast')) {
                        hours += 12;
                    }
                    
                    return hours * 60 + minutes;
                };
                
                return parseTime(a.time) - parseTime(b.time);
            });
            
            setTimetable(sortedTimetable);
          } catch (err) {
            setError("टाइमटेबल लोड करने में समस्या");
            console.error("Error fetching timetable:", err);
          } finally {
            setIsLoading(false);
          }
        };
        
        fetchTimetable();
    }, [selectedClass, selectedDay]);

    // Check current lecture
    useEffect(() => {
        const now = currentTime;
        const currentHours = now.getHours();
        const currentMinutes = now.getMinutes();
        
        const current = timetable.find(lecture => {
            if (!lecture?.time) return false;
            
            try {
                const [startTime, endTime] = lecture.time.split(" - ");
                let [startH, startM] = startTime.split(":").map(Number);
                let [endH, endM] = endTime.split(":").map(Number);
                
                // Handle 12-hour format if present
                if (lecture.time.includes('PM') && startH < 12) startH += 12;
                if (lecture.time.includes('AM') && startH === 12) startH = 0;
                
                const lectureStart = startH * 60 + startM;
                const lectureEnd = endH * 60 + endM;
                const currentTotal = currentHours * 60 + currentMinutes;
                
                return currentTotal >= lectureStart && currentTotal < lectureEnd;
            } catch (e) {
                console.warn("Error parsing lecture time:", lecture.time);
                return false;
            }
        });
        
        setCurrentLecture(current || null);
    }, [timetable, currentTime]);

    if (isLoading && !timetable.length) {
        return <div className="loading">Loading....</div>;
    }

    if (error) {
        return (
            <div className="error">
                <h3>{error}</h3>
                <button onClick={() => window.location.reload()}>Please Try Again.</button>
            </div>
        );
    }

    return (
        <div className="timetable-container">
            <h2>📅Class Timetable</h2>
            <p>⏰ currentTime: {currentTime.toLocaleTimeString()}</p>
            
            <div className="controls">
                <div className="class-selector">
                    <label>Class: </label>
                    <select 
                        value={selectedClass}
                        onChange={(e) => setSelectedClass(e.target.value)}
                        disabled={isLoading}
                    >
                        {classes.map(cls => (
                            <option key={cls.class_id || cls.id} value={cls.class_id || cls.id}>
                                {cls.class_name}
                            </option>
                        ))}
                    </select>
                </div>

                <div className="day-buttons">
                    {daysOfWeek.map(day => (
                        <button
                            key={day}
                            onClick={() => setSelectedDay(day)}
                            className={selectedDay === day ? "active" : ""}
                            disabled={isLoading}
                        >
                            {day}
                        </button>
                    ))}
                </div>
            </div>

            {currentLecture ? (
                <div className="current-lecture-notice highlight">
                    🎯 Current Class: {currentLecture.subject} 
                    {currentLecture.faculty !== 'N/A' && ` (${currentLecture.faculty})`}
                    {currentLecture.room !== 'N/A' && ` - Class ${currentLecture.room}`}
                </div>
            ) : (
                <div className="no-lecture">
                    ⏳No Current Lecture available.
                </div>
            )}

            <h3>{selectedDay} </h3>
            
            {timetable.length > 0 ? (
                <div className="table-wrapper">
                    <table className="timetable-table">
                        <thead>
                            <tr>
                                <th>Time </th>
                                <th>Subject</th>
                                <th>Batch</th>
                                <th>Faculty</th>
                                <th>Class</th>
                            </tr>
                        </thead>
                        <tbody>
                            {timetable.map((lecture) => (
                                <tr 
                                    key={lecture.id}
                                    className={
                                        currentLecture?.id === lecture.id ? 
                                        "current-lecture" : ""
                                    }
                                >
                                    <td>{lecture.time}</td>
                                    <td>{lecture.subject || '-'}</td>
                                    <td>{lecture.batch || 'All'}</td>
                                    <td>{lecture.faculty || 'N/A'}</td>
                                    <td>{lecture.room || 'N/A'}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            ) : (
                <div className="no-timetable">
                    <p>No Class Available for this Day.</p>
                    <small>Or Data id Not Available.</small>
                </div>
            )}
        </div>
    );
};

export default Timetable;