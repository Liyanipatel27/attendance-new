import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { io } from 'socket.io-client';

const SheetContext = createContext();

export const SheetProvider = ({ children }) => {
  const [sheetData, setSheetData] = useState([]);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [socket, setSocket] = useState(null);

  const processRawData = useCallback((rawData) => {
    if (!Array.isArray(rawData) || rawData.length < 2) {
      console.warn('Invalid raw data format:', rawData);
      return [];
    }

    // Skip header row and process student data
    const processedData = rawData.slice(1).map(row => ({
      enrollment_no: row[0] || '',
      name: row[1] || '',
      class: row[2] || '',
      batch: row[3] || '',
      branch: row[4] || '',
      email: row[5] || '',
      phone: row[6] || ''
    }));

    return processedData;
  }, []);

  const refreshSheetData = useCallback(async () => {
    if (loading) return; // Prevent concurrent fetches
    
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('http://localhost:3001/api/sheet-data?type=students');
      const data = await response.json();
      
      if (data.success) {
        const processedData = processRawData(data.data);
        setSheetData(processedData);
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
  }, [processRawData, loading]);

  useEffect(() => {
    let mounted = true;
    let socketInstance = null;

    const initializeData = async () => {
      if (!mounted) return;
      
      try {
        const response = await fetch('http://localhost:3001/api/sheet-data?type=students');
        const data = await response.json();
        
        if (data.success && mounted) {
          const processedData = processRawData(data.data);
          setSheetData(processedData);
          setLastUpdated(data.lastUpdated);
        }
      } catch (err) {
        console.error('Error in initial data fetch:', err);
        if (mounted) {
          setError(err.message);
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    // Initialize socket connection
    socketInstance = io('http://localhost:3001', {
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      timeout: 20000
    });

    socketInstance.on('connect', () => {
      if (mounted) {
        setSocket(socketInstance);
      }
    });

    socketInstance.on('connect_error', (error) => {
      console.error('Socket connection error:', error);
      if (mounted) {
        setError('Failed to connect to server');
      }
    });

    socketInstance.on('sheet-update', (data) => {
      if (mounted && data.success) {
        const processedData = processRawData(data.data);
        setSheetData(processedData);
        setLastUpdated(data.timestamp);
      }
    });

    // Initial data fetch
    initializeData();

    return () => {
      mounted = false;
      if (socketInstance) {
        socketInstance.disconnect();
      }
    };
  }, [processRawData]);

  const value = {
    sheetData,
    lastUpdated,
    loading,
    error,
    refreshSheetData
  };

  return (
    <SheetContext.Provider value={value}>
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