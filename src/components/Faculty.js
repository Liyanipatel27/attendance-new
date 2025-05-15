import React, { useState, useEffect } from 'react';
import './Faculty.css';

function Faculty() {
  const [facultyData, setFacultyData] = useState([]);
  const [filteredFaculty, setFilteredFaculty] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [searchParams, setSearchParams] = useState({
    employeeId: '',
    fullName: ''
  });

  const fetchFacultyData = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('http://localhost:3001/faculty');
      if (!response.ok) {
        throw new Error('Failed to fetch faculty data');
      }
      const data = await response.json();
      setFacultyData(data);
    } catch (err) {
      console.error('Error fetching faculty:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFacultyData();
  }, []);

  const handleSearch = () => {
    setLoading(true);
    setError(null);
    
    try {
      const filtered = facultyData.filter(faculty => {
        const idMatch = !searchParams.employeeId || 
          (faculty.employee_id && faculty.employee_id.toString().includes(searchParams.employeeId.trim()));
        
        const nameMatch = !searchParams.fullName || 
          (faculty.full_name && faculty.full_name.toLowerCase().includes(searchParams.fullName.toLowerCase().trim()));
        
        return idMatch && nameMatch;
      });

      setFilteredFaculty(filtered);
      
      if (filtered.length === 0) {
        setError('No records found matching your criteria');
      }
    } catch (err) {
      console.error('Search error:', err);
      setError(err.message);
      setFilteredFaculty([]);
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
      employeeId: '',
      fullName: ''
    });
    setFilteredFaculty([]);
    setError(null);
  };

  const handleRefresh = async () => {
    await fetchFacultyData();
    setFilteredFaculty([]);
    setError(null);
  };

  // Function to format faculty name with title and short name
  const formatFacultyName = (name) => {
    // Check if name contains short name in parentheses
    const shortNameMatch = name.match(/\((.*?)\)/);
    const shortName = shortNameMatch ? shortNameMatch[1] : '';
    
    // Remove short name from full name
    const fullName = name.replace(/\s*\(.*?\)\s*/, '').trim();
    
    return (
      <div className="faculty-name">
        <span className="faculty-full-name">{fullName}</span>
        {shortName && <span className="faculty-short-name">({shortName})</span>}
      </div>
    );
  };

  return (
    <div className="faculty-app">
      <div className="app-container">
        <div className="card">
          <div className="card-header">
            <h1>Faculty Records</h1>
            <button 
              onClick={handleRefresh} 
              className="btn btn-secondary refresh-btn"
              disabled={loading}
            >
              {loading ? 'Refreshing...' : '↻ Refresh'}
            </button>
          </div>
          
          <div className="card-body">
            <div className="search-box">
              <input
                type="text"
                name="employeeId"
                className="form-control"
                placeholder="Employee ID"
                value={searchParams.employeeId}
                onChange={handleInputChange}
                onKeyPress={handleKeyPress}
              />
              
              <input
                type="text"
                name="fullName"
                className="form-control"
                placeholder="Full Name"
                value={searchParams.fullName}
                onChange={handleInputChange}
                onKeyPress={handleKeyPress}
              />
              
              <div className="action-buttons">
                <button 
                  onClick={handleSearch} 
                  className="btn btn-primary search-btn"
                  disabled={loading}
                >
                  {loading ? 'Searching...' : 'Search'}
                </button>
                <button 
                  onClick={clearSearch} 
                  className="btn btn-outline-secondary"
                  disabled={loading}
                >
                  Clear
                </button>
              </div>
            </div>

            {(error) && (
              <div className={`alert ${filteredFaculty.length === 0 ? 'alert-danger' : 'alert-info'}`}>
                {error}
              </div>
            )}
            
            {loading && (
              <div className="alert alert-info">
                Loading...
              </div>
            )}

            {filteredFaculty.length > 0 && (
              <>
                <div className="results-summary">
                  <span className="badge badge-primary">
                    Found {filteredFaculty.length} record{filteredFaculty.length !== 1 ? 's' : ''}
                  </span>
                </div>

                <div className="table-responsive">
                  <table className="table table-striped">
                    <thead>
                      <tr>
                        <th>Sr. No.</th>
                        <th>Short Name</th>
                        <th>Employee Id</th>
                        <th>Full Name</th>
                        <th>Email Id</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredFaculty.map((faculty, index) => {
                        // Extract short name from full name
                        const shortNameMatch = faculty.full_name.match(/\((.*?)\)/);
                        const shortName = shortNameMatch ? shortNameMatch[1] : '';
                        
                        // Remove short name from full name
                        const fullName = faculty.full_name.replace(/\s*\(.*?\)\s*/, '').trim();
                        
                        return (
                          <tr key={index}>
                            <td>{index + 1}</td>
                            <td>{shortName}</td>
                            <td>{faculty.employee_id}</td>
                            <td>{fullName}</td>
                            <td>
                              <a href={`mailto:${faculty.email_id}`} className="email-link">
                                {faculty.email_id}
                              </a>
                            </td>
                          </tr>
                        );
                      })}
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

export default Faculty;