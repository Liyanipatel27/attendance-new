import React, { useState } from 'react';
import './Faculty.css';

function Faculty() {
  const [faculty, setFaculty] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [searchParams, setSearchParams] = useState({
    employeeId: '',
    shortName: '',
    fullName: ''
  });

  const fetchFaculty = async () => {
    if (!searchParams.employeeId && !searchParams.shortName && !searchParams.fullName) {
      setFaculty([]);
      setError('Please enter search criteria');
      return;
    }

    setLoading(true);
    setError(null);
    
    try {
      const queryParams = new URLSearchParams();
      if (searchParams.employeeId) queryParams.append('employee_id', searchParams.employeeId);
      if (searchParams.shortName) queryParams.append('short_name', searchParams.shortName);
      if (searchParams.fullName) queryParams.append('full_name', searchParams.fullName);

      const response = await fetch(`http://localhost:3001/faculty?${queryParams}`);
      
      if (!response.ok) throw new Error('Failed to fetch data');
      
      const data = await response.json();
      setFaculty(data);
      
      if (data.length === 0) {
        setError('No records found');
      }
    } catch (err) {
      setError(err.message);
      setFaculty([]);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setSearchParams(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    fetchFaculty();
  };

  const clearSearch = () => {
    setSearchParams({ employeeId: '', shortName: '', fullName: '' });
    setFaculty([]);
    setError(null);
  };

  return (
    <div className="faculty-container">
      <div className="header-section">
        <h1>Faculty Search</h1>
      </div>
      
      <div className="search-section">
        <form onSubmit={handleSubmit} className="card-body">
          <div className="form-floating">
            <input
              type="text"
              name="employeeId"
              placeholder="Employee ID"
              value={searchParams.employeeId}
              onChange={handleInputChange}
              className="form-control"
            />
            <label>Employee ID</label>
          </div>
          
          <div className="form-floating">
            <input
              type="text"
              name="shortName"
              placeholder="Short Name (e.g., RDV)"
              value={searchParams.shortName}
              onChange={handleInputChange}
              className="form-control"
            />
            <label>Short Name</label>
          </div>
          
          <div className="form-floating">
            <input
              type="text"
              name="fullName"
              placeholder="Full Name"
              value={searchParams.fullName}
              onChange={handleInputChange}
              className="form-control"
            />
            <label>Full Name</label>
          </div>
          
          <div className="button-group">
            <button type="submit" className="btn btn-primary">Search</button>
            <button type="button" onClick={clearSearch} className="btn btn-outline-secondary">Clear</button>
          </div>
        </form>
      </div>

      {loading && (
        <div className="text-center">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
        </div>
      )}
      
      {error && <div className="alert alert-danger">{error}</div>}

      {faculty.length > 0 && (
        <div className="results-section">
          <h3>Search Results ({faculty.length})</h3>
          <div className="table-responsive">
            <table className="table table-striped">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Short Name</th>
                  <th>Full Name</th>
                  <th>Email</th>
                </tr>
              </thead>
              <tbody>
                {faculty.map((f) => (
                  <tr key={f.employee_id}>
                    <td>{f.employee_id}</td>
                    <td>{f.short_name}</td>
                    <td>{f.full_name}</td>
                    <td>
                      <a href={`mailto:${f.email_id}`} className="email-link">{f.email_id}</a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

export default Faculty;