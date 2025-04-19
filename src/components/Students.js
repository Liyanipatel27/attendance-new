import React, { useState, useEffect } from 'react';
import './Students.css';
import { useSheet } from '../context/SheetContext';

function Students() {
  const { sheetData = [], refreshSheetData, loading: sheetLoading, error: sheetError } = useSheet();
  const [filteredStudents, setFilteredStudents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [searchParams, setSearchParams] = useState({
    enrollment: '',
    name: '',
    className: ''
  });

  // Extract unique classes from sheet data
  const allClasses = [...new Set(sheetData.slice(1).map(row => row[10]))].filter(Boolean);

  const handleSearch = () => {
    setLoading(true);
    setError(null);
    
    try {
      const studentsData = sheetData.slice(1); // Skip header row
      
      const filtered = studentsData.filter(row => {
        const enrollmentMatch = !searchParams.enrollment || 
          (row[1] && row[1].toString().includes(searchParams.enrollment.trim()));
        
        const nameMatch = !searchParams.name || 
          (row[2] && row[2].toLowerCase().includes(searchParams.name.toLowerCase().trim()));
        
        const classMatch = !searchParams.className || 
          (row[10] && row[10] === searchParams.className.trim());
        
        return enrollmentMatch && nameMatch && classMatch;
      });

      setFilteredStudents(filtered);
      
      if (filtered.length === 0) {
        setError('No records found matching your criteria');
      }
    } catch (err) {
      console.error('Search error:', err);
      setError(err.message);
      setFilteredStudents([]);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setSearchParams(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  const clearSearch = () => {
    setSearchParams({
      enrollment: '',
      name: '',
      className: ''
    });
    setFilteredStudents([]);
    setError(null);
  };

  const handleRefresh = async () => {
    setLoading(true);
    try {
      await refreshSheetData();
      setError(null);
      setFilteredStudents([]);
    } catch (err) {
      setError('Failed to refresh data from Google Sheet');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="student-app">
      <div className="app-container">
        <div className="card">
          <div className="card-header">
            <h1>Student Records (Google Sheet Data)</h1>
            <button 
              onClick={handleRefresh} 
              className="btn btn-secondary refresh-btn"
              disabled={sheetLoading}
            >
              {sheetLoading ? 'Refreshing...' : '↻ Refresh'}
            </button>
          </div>
          
          <div className="card-body">
            <div className="search-box">
              <input
                type="text"
                name="enrollment"
                className="form-control"
                placeholder="Enrollment No"
                value={searchParams.enrollment}
                onChange={handleInputChange}
                onKeyPress={handleKeyPress}
              />
              
              <input
                type="text"
                name="name"
                className="form-control"
                placeholder="Student Name"
                value={searchParams.name}
                onChange={handleInputChange}
                onKeyPress={handleKeyPress}
              />
              
              <select
                name="className"
                className="form-control"
                value={searchParams.className}
                onChange={handleInputChange}
              >
                <option value="">All Classes</option>
                {allClasses.map((cls, index) => (
                  <option key={index} value={cls}>
                    {cls}
                  </option>
                ))}
              </select>
              
              <div className="action-buttons">
                <button 
                  onClick={handleSearch} 
                  className="btn btn-primary search-btn"
                  disabled={loading || sheetLoading}
                >
                  {loading ? 'Searching...' : 'Search'}
                </button>
                <button 
                  onClick={clearSearch} 
                  className="btn btn-outline-secondary"
                  disabled={loading || sheetLoading}
                >
                  Clear
                </button>
              </div>
            </div>

            {(error || sheetError) && (
              <div className={`alert ${filteredStudents.length === 0 ? 'alert-danger' : 'alert-info'}`}>
                {error || sheetError}
              </div>
            )}
            
            {(loading || sheetLoading) && (
              <div className="alert alert-info">
                Loading...
              </div>
            )}

            {filteredStudents.length > 0 && (
              <>
                <div className="results-summary">
                  <span className="badge badge-primary">
                    Found {filteredStudents.length} record{filteredStudents.length !== 1 ? 's' : ''}
                  </span>
                </div>

                <div className="table-responsive">
                  <table className="table table-striped">
                    <thead>
                      <tr>
                        <th>S.No</th>
                        <th>Enrollment</th>
                        <th>Name</th>
                        <th>Branch</th>
                        <th>Type</th>
                        <th>Semester</th>
                        <th>Gender</th>
                        <th>GNU Email</th>
                        <th>Personal Email</th>
                        <th>Batch</th>
                        <th>Class</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredStudents.map((student, index) => (
                        <tr key={index}>
                          <td>{index + 1}</td>
                          <td>{student[1] || '-'}</td>
                          <td className="student-name">
                            {student[6] === 'Female' ? '♀' : '♂'} {student[2] || '-'}
                          </td>
                          <td>{student[3] || '-'}</td>
                          <td>{student[4] || '-'}</td>
                          <td>{student[5] || '-'}</td>
                          <td>{student[6] || '-'}</td>
                          <td>
                            {student[7] ? (
                              <a href={`mailto:${student[7]}`}>{student[7]}</a>
                            ) : '-'}
                          </td>
                          <td>
                            {student[8] ? (
                              <a href={`mailto:${student[8]}`}>{student[8]}</a>
                            ) : '-'}
                          </td>
                          <td>{student[9] || '-'}</td>
                          <td>{student[10] || '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default Students;