import React, { useRef, useState } from 'react';

export default function CameraTest() {
  const videoRef = useRef(null);
  const [error, setError] = useState('');

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      videoRef.current.srcObject = stream;
      setError('');
    } catch (err) {
      setError('Camera error: ' + err.message);
    }
  };

  return (
    <div style={{ textAlign: 'center', marginTop: 40 }}>
      <button onClick={startCamera} style={{ fontSize: 18, padding: '10px 30px' }}>
        Start Camera
      </button>
      <div style={{ marginTop: 20 }}>
        <video ref={videoRef} autoPlay style={{ width: 400, height: 300, background: '#222' }} />
      </div>
      {error && <div style={{ color: 'red', marginTop: 20 }}>{error}</div>}
    </div>
  );
}