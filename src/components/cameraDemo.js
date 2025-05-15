import React, { useRef, useState } from 'react';

export default function CameraDemo() {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [stream, setStream] = useState(null);
  const [message, setMessage] = useState('');
  const [isSuccess, setIsSuccess] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const startCamera = async () => {
    setMessage('');
    setIsSuccess(null);
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 480, facingMode: 'user' },
        audio: false,
      });
      videoRef.current.srcObject = mediaStream;
      setStream(mediaStream);
    } catch (err) {
      setMessage('Error accessing camera. Please ensure you have granted camera permissions.');
      setIsSuccess(false);
    }
  };

  const captureImage = () => {
    if (!stream) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    // Simulate processing
    setIsProcessing(true);
    setMessage('Processing face registration...');
    setIsSuccess(null);

    setTimeout(() => {
      // Simulate random success/failure
      const verificationSuccess = Math.random() > 0.3;
      if (verificationSuccess) {
        setMessage('Face successfully registered!');
        setIsSuccess(true);
      } else {
        setMessage('Face verification failed. Please try again.');
        setIsSuccess(false);
      }
      setIsProcessing(false);
    }, 2000);
  };

  // Clean up camera on unmount
  React.useEffect(() => {
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [stream]);

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
        Capture
      </button>
      <div style={{ margin: 20 }}>
        <video ref={videoRef} autoPlay playsInline style={{ width: 400, height: 300, background: '#222' }} />
        <canvas ref={canvasRef} style={{ display: 'none' }} />
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
}