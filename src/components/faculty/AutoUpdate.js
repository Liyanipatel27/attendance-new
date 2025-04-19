import React, { useState, useEffect } from 'react';
import { Table, Spinner, Alert, Button, Form, Modal } from 'react-bootstrap';
import io from 'socket.io-client';


const socket = io(process.env.REACT_APP_API_URL || 'http://localhost:3001');

const AutoUpdate = () => {
  const [data, setData] = useState([]);
  const [headers, setHeaders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [version, setVersion] = useState(0);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editData, setEditData] = useState({
    row: null,
    col: null,
    value: ''
  });

  // Fetch initial data
  const fetchData = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:3001'}/api/sheet-data`);
      if (!response.ok) throw new Error('Failed to fetch data');
      const result = await response.json();
      
      setData(result.data.slice(1));
      setHeaders(result.data[0] || []);
      setVersion(result.version);
      setLastUpdated(new Date(result.lastUpdated));
      setLoading(false);
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  };

  // Handle cell edit
  const handleEdit = (rowIndex, colIndex) => {
    setEditData({
      row: rowIndex,
      col: colIndex,
      value: data[rowIndex][colIndex] || ''
    });
    setShowEditModal(true);
  };

  // Save edited cell
  const handleSave = async () => {
    try {
      const response = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:3001'}/api/update-cell`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          row: editData.row,
          column: editData.col,
          value: editData.value
        })
      });
      
      if (!response.ok) throw new Error('Failed to update cell');
      
      setShowEditModal(false);
    } catch (err) {
      setError(err.message);
    }
  };

  // Set up Socket.IO listeners
  useEffect(() => {
    socket.on('initial-data', (initialData) => {
      setData(initialData.data.slice(1));
      setHeaders(initialData.data[0] || []);
      setVersion(initialData.version);
      setLastUpdated(new Date(initialData.timestamp));
      setLoading(false);
    });

    socket.on('data-update', (updatedData) => {
      setData(updatedData.data.slice(1));
      setHeaders(updatedData.data[0] || []);
      setVersion(updatedData.version);
      setLastUpdated(new Date(updatedData.timestamp));
    });

    socket.on('connect_error', () => {
      setError('Connection to server failed. Trying to reconnect...');
    });

    socket.on('reconnect', () => {
      setError(null);
      fetchData();
    });

    // Initial fetch
    fetchData();

    return () => {
      socket.off('initial-data');
      socket.off('data-update');
      socket.off('connect_error');
      socket.off('reconnect');
    };
  }, []);

  if (loading && data.length === 0) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ height: '300px' }}>
        <Spinner animation="border" role="status">
          <span className="visually-hidden">Loading...</span>
        </Spinner>
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="danger" className="mt-3">
        {error}
      </Alert>
    );
  }

  return (
    <div className="container mt-4">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2>📊 Live Google Sheet Updates</h2>
        {lastUpdated && (
          <small className="text-muted">
            Last updated: {lastUpdated.toLocaleTimeString()} (v{version})
          </small>
        )}
      </div>

      <div className="table-responsive">
        <Table striped bordered hover>
          <thead className="table-dark">
            <tr>
              {headers.map((header, index) => (
                <th key={index}>{header}</th>
              ))}
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {data.map((row, rowIndex) => (
              <tr key={rowIndex}>
                {row.map((cell, colIndex) => (
                  <td key={colIndex}>{cell}</td>
                ))}
                <td>
                  <Button
                    variant="outline-primary"
                    size="sm"
                    onClick={() => handleEdit(rowIndex, 0)}
                  >
                    Edit
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </Table>
      </div>

      {/* Edit Modal */}
      <Modal show={showEditModal} onHide={() => setShowEditModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Edit Cell</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form>
            <Form.Group controlId="formCellValue">
              <Form.Label>New Value</Form.Label>
              <Form.Control
                type="text"
                value={editData.value}
                onChange={(e) => setEditData({ ...editData, value: e.target.value })}
              />
            </Form.Group>
          </Form>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowEditModal(false)}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleSave}>
            Save Changes
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
};

export default AutoUpdate;