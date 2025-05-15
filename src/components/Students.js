import React, { useState, useEffect } from 'react';
import './Students.css';
import axios from 'axios';

function Students() {
  const [students, setStudents] = useState([]);
  const [filteredStudents, setFilteredStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [classes, setClasses] = useState(['All Classes']);
  const [searchParams, setSearchParams] = useState({
    enrollment: '',
    name: '',
    className: 'All Classes'
  });

  // Fetch initial data on component mount
  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async (params = {}) => {
    try {
      setLoading(true);
      // Build query string from params
      const queryParams = new URLSearchParams();
      if (params.enrollment) queryParams.append('enrollment', params.enrollment);
      if (params.name) queryParams.append('name', params.name);
      if (params.className && params.className !== 'All Classes') {
        queryParams.append('class', params.className);
      }

      const url = `http://localhost:3001/students${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
      const response = await axios.get(url);
      
      if (response.data.success) {
        const allStudents = response.data.data;
        setStudents(allStudents);
        setFilteredStudents(allStudents);
        
        // Extract unique classes properly
        const uniqueClasses = [...new Set(allStudents.map(student => student.class || student.batch))].filter(Boolean);
        setClasses(['All Classes', ...uniqueClasses.sort()]);
        
        console.log('Total students:', allStudents.length);
        console.log('Unique classes:', uniqueClasses);
      } else {
        throw new Error(response.data.message || 'Failed to fetch students');
      }
    } catch (err) {
      console.error('Error fetching data:', err);
      setError(err.response?.data?.error || err.message);
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

  const handleSearch = () => {
    fetchData(searchParams);
  };

  const handleRefresh = async () => {
    // Reset search params and fetch all data
    setSearchParams({
      enrollment: '',
      name: '',
      className: 'All Classes'
    });
    fetchData();
  };

  const clearSearch = () => {
    setSearchParams({
      enrollment: '',
      name: '',
      className: 'All Classes'
    });
    fetchData();
  };

  return (
    <div className="student-app">
      <div className="app-container">
        <div className="card">
          <div className="card-header">
            <h1>Student Records</h1>
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
                name="enrollment"
                className="form-control"
                placeholder="Enrollment No"
                value={searchParams.enrollment}
                onChange={handleInputChange}
              />
              
              <input
                type="text"
                name="name"
                className="form-control"
                placeholder="Student Name"
                value={searchParams.name}
                onChange={handleInputChange}
              />
              
              <select
                name="className"
                className="form-control"
                value={searchParams.className}
                onChange={handleInputChange}
              >
                {classes.map((cls, index) => (
                  <option key={index} value={cls}>
                    {cls}
                  </option>
                ))}
              </select>
              
              <div className="action-buttons">
                <button 
                  onClick={handleSearch}
                  className="btn btn-primary"
                  disabled={loading}
                >
                  Search
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

            {error && (
              <div className={`alert ${filteredStudents.length === 0 ? 'alert-danger' : 'alert-info'}`}>
                {error}
              </div>
            )}
            
            {loading && (
              <div className="alert alert-info">
                Loading student data...
              </div>
            )}

            {filteredStudents.length > 0 && (
              <>
                <div className="results-summary">
                  <span className="badge badge-primary">
                    Showing {filteredStudents.length} of {students.length} students
                  </span>
                </div>

                <div className="table-responsive">
                  <table className="table table-striped">
                    <thead>
                      <tr>
                        <th>ID</th>
                        <th>Enrollment No</th>
                        <th>Name</th>
                        <th>Branch</th>
                        <th>Hosteller/Commuter</th>
                        <th>Semester</th>
                        <th>Gender</th>
                        <th>Admission Type</th>
                        <th>Student Phone</th>
                        <th>Parent Phone</th>
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
                          <td>{student.enrollment_no || '-'}</td>
                          <td className="student-name">{student.name || '-'}</td>
                          <td>{student.branch || '-'}</td>
                          <td>{student.hosteller_commuter || '-'}</td>
                          <td>{student.semester || '-'}</td>
                          <td>{student.gender || '-'}</td>
                          <td>{student.admission_type || '-'}</td>
                          <td>{student.student_phone || '-'}</td>
                          <td>{student.parent_phone || '-'}</td>
                          <td>{student.gnu_email || '-'}</td>
                          <td>{student.personal_email || '-'}</td>
                          <td>{student.batch || '-'}</td>
                          <td>{student.class || '-'}</td>
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