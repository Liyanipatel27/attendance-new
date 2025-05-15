import React, { useState, useEffect } from "react";
import axios from "axios";
import "./Timetable.css";

const Timetable = () => {
  const [selectedClass, setSelectedClass] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [sheetData, setSheetData] = useState([]);
  const [selectedDay, setSelectedDay] = useState("");
  const [currentDateTime, setCurrentDateTime] = useState(new Date());

  // Debug: Log sheet data changes
  useEffect(() => {
    if (sheetData && sheetData.length > 0) {
      console.log('Headers:', sheetData[0]);
      console.log('First data row:', sheetData[1]);
    }
  }, [sheetData]);

  // Update current time every minute
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentDateTime(new Date());
    }, 60000);
    return () => clearInterval(timer);
  }, []);

  // Class to GID mapping
  const classGidMap = {
    "6IT-A": "222099765",
    "6IT-B": "792605536",
    "6CE-A": "521984538",
    "6IT-E": "662323215",
    "6CE-E": "1522823302",
    "6IT-C": "804234950",
    // Add more classes and their GIDs here if needed
  };

  // Faculty to Classes mapping
  const facultyClassMap = {
    "PROF. CHIRAG GAMI (CCG)": ["6IT-A", "6IT-B", "6CE-A"],
    "PROF. JOHN DOE": ["6IT-C", "6IT-E"],
    "PROF. JANE SMITH": ["6CE-E", "6IT-B"],
    // Add more faculty members and their classes
  };

  // Get today's day name
  const getTodayDay = () => {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    return days[currentDateTime.getDay()];
  };

  useEffect(() => {
    const classNames = Object.keys(classGidMap);
    if (classNames.length > 0) {
      setSelectedClass(classNames[0]);
    }
  }, []);

  useEffect(() => {
    if (selectedClass) {
      fetchSheetData(selectedClass);
    }
  }, [selectedClass]);

  useEffect(() => {
    if (sheetData && sheetData.length > 1) {
      const today = getTodayDay();
      const availableDays = [...new Set(sheetData.slice(1).map(row => row[0]))].filter(Boolean);
      if (availableDays.includes(today)) {
        setSelectedDay(today);
      } else {
        setSelectedDay(sheetData[1][0]);
      }
    }
  }, [sheetData]);

  const fetchSheetData = async (className) => {
    try {
      setLoading(true);
      const gid = classGidMap[className];
      if (!gid) {
        throw new Error(`No GID found for class ${className}`);
      }
      const response = await axios.get(`http://localhost:3001/api/sheet-data?gid=${gid}&range=A1:N20`);
      if (response.data.success) {
        setSheetData(response.data.data);
        setError(null);
      } else {
        throw new Error(response.data.error || 'Failed to fetch timetable data');
      }
    } catch (err) {
      console.error('Error fetching sheet data:', err);
      setError(err.message);
      setSheetData([]);
    } finally {
      setLoading(false);
    }
  };

  const getSelectedDayRows = () => {
    if (!selectedDay || !sheetData || sheetData.length < 2) return [];
    
    // Find all rows for the selected day
    return sheetData.filter((row, index) => {
      // Skip header row (index 0)
      if (index === 0) return false;
      
      // Check if the first column matches the selected day
      return row[0] === selectedDay;
    });
  };

  const formatCellContent = (cell) => {
    if (!cell || cell === 'Break' || cell === 'No Teaching Load') {
      return <div className="empty-slot">{cell}</div>;
    }

    // Split by newline and clean up each part
    const parts = cell.split('\n')
      .map(part => part.trim())
      .filter(part => part.length > 0);

    if (parts.length === 0) return null;

    return (
      <div className="timetable-slot">
        <div className="subject-code">{parts[0]}</div>
        {parts.length > 1 && <div className="class-group">{parts[1]}</div>}
        {parts.length > 2 && <div className="faculty">{parts[2]}</div>}
        {parts.length > 3 && <div className="room">{parts[3]}</div>}
      </div>
    );
  };

  const getCurrentSlotIndex = () => {
    if (!sheetData || sheetData.length < 2 || !selectedDay) return -1;
    
    const now = new Date();
    const currentHours = now.getHours();
    const currentMinutes = now.getMinutes();
    const totalMinutes = currentHours * 60 + currentMinutes;

    const headers = sheetData[0];
    
    for (let i = 1; i < headers.length; i++) {
      const timeRange = headers[i];
      if (!timeRange) continue;
      
      const [startTime, endTime] = timeRange.split(' to ');
      if (!startTime || !endTime) continue;
      
      const parseTime = (timeStr) => {
        const [time, period] = timeStr.trim().split(' ');
        const [hours, minutes] = time.split(':').map(Number);
        
        let total = hours * 60 + minutes;
        if (period === 'PM' && hours !== 12) total += 12 * 60;
        if (period === 'AM' && hours === 12) total -= 12 * 60;
        
        return total;
      };
      
      const startMinutes = parseTime(startTime);
      const endMinutes = parseTime(endTime);
      
      if (totalMinutes >= startMinutes && totalMinutes < endMinutes) {
        return i;
      }
    }
    
    return -1;
  };

  const renderDayButtons = () => (
    <div className="timetable-day-buttons">
      {days.map(day => (
        <button
          key={day}
          onClick={() => setSelectedDay(day)}
          className={`timetable-day-btn ${selectedDay === day ? 'selected' : ''} ${day === getTodayDay() ? 'today' : ''}`}
        >
          {day}
        </button>
      ))}
    </div>
  );

  const renderTable = () => {
    if (!sheetData || sheetData.length < 2) {
      return <div className="no-data">No timetable data available</div>;
    }

    const headers = sheetData[0];
    const dayRows = getSelectedDayRows();
    const currentSlotIdx = getCurrentSlotIndex();

    if (dayRows.length === 0) {
      return <div className="no-data">No classes scheduled for {selectedDay}</div>;
    }

    return (
      <div className="timetable-wrapper">
        <table className="timetable">
          <thead>
            <tr>
              {headers.map((header, index) => (
                <th key={index}>{header}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {dayRows.map((row, rowIndex) => (
              <tr key={rowIndex}>
                {row.map((cell, cellIndex) => (
                  <td 
                    key={cellIndex}
                    className={cellIndex === currentSlotIdx ? 'current-slot' : ''}
                  >
                    {formatCellContent(cell)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  const handleRefresh = async () => {
    if (selectedClass) {
      await fetchSheetData(selectedClass);
    }
  };

  const days = sheetData.length > 1 ? [...new Set(sheetData.slice(1).map(row => row[0]))].filter(Boolean) : [];

  if (loading) return <div className="loading">Loading timetable data...</div>;
  if (error) return <div className="error">{error}</div>;

  return (
    <div className="timetable-container">
      <div className="timetable-header">
        <div>
          <div className="timetable-title">Class Timetable</div>
          <div className="timetable-meta">
            {currentDateTime.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })} | 
            <span style={{marginLeft: 8}}>{currentDateTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}</span>
          </div>
        </div>
        <button className="timetable-refresh-btn" onClick={handleRefresh} disabled={loading}>
          {loading ? 'Refreshing...' : '↻ Refresh'}
        </button>
      </div>

      <div className="controls">
        <div className="class-selector">
          <label htmlFor="class-select">Select Class:</label>
          <select
            id="class-select"
            value={selectedClass}
            onChange={(e) => setSelectedClass(e.target.value)}
            disabled={loading}
            className="class-select"
          >
            {Object.keys(classGidMap).map(className => (
              <option key={className} value={className}>
                {className}
              </option>
            ))}
          </select>
        </div>
      </div>

      {renderDayButtons()}
      {renderTable()}
    </div>
  );
};

export default Timetable;