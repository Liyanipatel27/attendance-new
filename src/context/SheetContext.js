import React, { createContext, useContext, useState, useEffect } from 'react';
import { io } from 'socket.io-client';

const SheetContext = createContext();

export const SheetProvider = ({ children }) => {
  const [sheetData, setSheetData] = useState([]);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const refreshSheetData = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('http://localhost:3001/api/sheet-data');
      const data = await response.json();
      if (data.success) {
        setSheetData(data.data);
        setLastUpdated(data.lastUpdated);
      } else {
        throw new Error(data.error || 'Failed to fetch sheet data');
      }
    } catch (err) {
      console.error('Error refreshing sheet data:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshSheetData();

    const socket = io('http://localhost:3001');
    
    socket.on('sheet-update', (data) => {
      setSheetData(data.data);
      setLastUpdated(data.timestamp);
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  return (
    <SheetContext.Provider value={{ 
      sheetData, 
      lastUpdated, 
      loading, 
      error, 
      refreshSheetData 
    }}>
      {children}
    </SheetContext.Provider>
  );
};

export const useSheet = () => {
  const context = useContext(SheetContext);
  if (context === undefined) {
    throw new Error('useSheet must be used within a SheetProvider');
  }
  return context;
};