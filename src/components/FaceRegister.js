import React, { useRef, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const FaceRegister = () => {
  const videoRef = useRef(null);
  const [stream, setStream] = useState(null);
  const [message, setMessage] = useState('');
  const [isSuccess, setIsSuccess] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    // Cleanup on unmount
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [stream]);

  const startCamera = async () => {
    setMessage('');
    setIsSuccess(null);
    setError('');
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 480, facingMode: 'user' },
        audio: false,
      });
      videoRef.current.srcObject = mediaStream;
      setStream(mediaStream);
    } catch (err) {
      setError('Error accessing camera. Please ensure you have granted camera permissions.');
    }
  };

  const captureImage = async () => {
    if (!stream) return;
    setIsProcessing(true);
    setMessage('Registering face...');
    setIsSuccess(null);
    setError('');

    // Capture image from video
    const video = videoRef.current;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const imageData = canvas.toDataURL('image/jpeg');

    try {
      const studentId = localStorage.getItem('studentId') || prompt('Enter your Student ID:');
      if (!studentId) {
        setError('Student ID not found. Please login again.');
        setIsProcessing(false);
        return;
      }

      console.log('Sending face registration request...');
      
      // Send to Node.js backend which will handle both Python and database operations
      const response = await axios.post('http://localhost:3001/register-face', {
        student_id: studentId,
        image: imageData
      }).catch(error => {
        console.error('Server error:', error);
        if (error.code === 'ERR_CONNECTION_REFUSED') {
          throw new Error('Server is not running. Please start the server.');
        }
        throw error;
      });

      console.log('Server response:', response.data);

      if (response.data.success) {
        setMessage('Face registered successfully!');
        setIsSuccess(true);
        setTimeout(() => {
          navigate('/student-dashboard');
        }, 2000);
      } else {
        throw new Error(response.data.message || 'Failed to register face');
      }
    } catch (err) {
      console.error('Face registration error:', err);
      setError(err.message || 'Error registering face');
      setIsSuccess(false);
    }
    setIsProcessing(false);
  };

  // Helper function to convert data URI to Blob
  const dataURItoBlob = (dataURI) => {
    const byteString = atob(dataURI.split(',')[1]);
    const mimeString = dataURI.split(',')[0].split(':')[1].split(';')[0];
    const ab = new ArrayBuffer(byteString.length);
    const ia = new Uint8Array(ab);
    for (let i = 0; i < byteString.length; i++) {
      ia[i] = byteString.charCodeAt(i);
    }
    return new Blob([ab], { type: mimeString });
  };

  return (
    <div style={{ textAlign: 'center', marginTop: 40 }}>
      <h1>Face Registration</h1>
      <button onClick={startCamera} disabled={!!stream} style={{ fontSize: 16, margin: 10 }}>
        Start Camera
      </button>
      <button
        onClick={captureImage}
        disabled={!stream || isProcessing}
        style={{ fontSize: 16, margin: 10 }}
      >
        {isProcessing ? 'Processing...' : 'Capture'}
      </button>
      <div style={{ margin: 20 }}>
        <video ref={videoRef} autoPlay playsInline style={{ width: 400, height: 300, background: '#222' }} />
      </div>
      {message && (
        <div
          style={{
            margin: 20,
            padding: 15,
            borderRadius: 4,
            background: isSuccess == null ? '#fffbe6' : isSuccess ? '#e6f4ea' : '#fce8e6',
            color: isSuccess == null ? '#333' : isSuccess ? '#137333' : '#d93025',
            border: `1px solid ${isSuccess == null ? '#fbbc04' : isSuccess ? '#137333' : '#d93025'}`,
            display: 'inline-block',
            minWidth: 300,
          }}
        >
          {message}
        </div>
      )}
      {error && (
        <div style={{ color: 'red', marginTop: 20 }}>{error}</div>
      )}
      <div style={{ background: '#e3f2fd', margin: 20, padding: 15, borderRadius: 4 }}>
        <h3>Instructions:</h3>
        <ol style={{ textAlign: 'left', display: 'inline-block' }}>
          <li>Click "Start Camera" to begin</li>
          <li>Position your face in the center of the frame</li>
          <li>Ensure good lighting</li>
          <li>Click "Capture" when ready</li>
          <li>Wait for confirmation message...</li>
        </ol>
      </div>
    </div>
  );
};

export default FaceRegister;