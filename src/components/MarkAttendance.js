import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const MarkAttendance = () => {
    const [isCameraOn, setIsCameraOn] = useState(false);
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);
    const videoRef = useRef(null);
    const streamRef = useRef(null);
    const navigate = useNavigate();

    useEffect(() => {
        return () => {
            if (streamRef.current) {
                streamRef.current.getTracks().forEach(track => track.stop());
            }
        };
    }, []);

    const startCamera = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: true });
            videoRef.current.srcObject = stream;
            streamRef.current = stream;
            setIsCameraOn(true);
            setError('');
        } catch (err) {
            setError('Error accessing camera. Please make sure you have granted camera permissions.');
        }
    };

    const stopCamera = () => {
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
            videoRef.current.srcObject = null;
            setIsCameraOn(false);
        }
    };

    const verifyFace = async () => {
        if (!videoRef.current || isProcessing) return;

        setIsProcessing(true);
        setError('');
        setMessage('');

        const canvas = document.createElement('canvas');
        canvas.width = videoRef.current.videoWidth;
        canvas.height = videoRef.current.videoHeight;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(videoRef.current, 0, 0);
        
        const imageData = canvas.toDataURL('image/jpeg');
        
        try {
            const response = await axios.post('http://localhost:5000/verify-face', {
                image: imageData
            });

            if (response.data.success) {
                const studentId = response.data.studentId;
                // Mark attendance in your backend
                const attendanceResponse = await axios.post('http://localhost:3001/mark-attendance', {
                    studentId: studentId
                });

                if (attendanceResponse.data.success) {
                    setMessage('Attendance marked successfully!');
                    setTimeout(() => {
                        navigate('/student-dashboard');
                    }, 2000);
                } else {
                    setError(attendanceResponse.data.message || 'Failed to mark attendance');
                }
            } else {
                setError(response.data.error || 'Face not recognized');
            }
        } catch (err) {
            setError(err.response?.data?.error || 'Error verifying face');
        } finally {
            setIsProcessing(false);
        }
    };

    return (
        <div className="container mt-5">
            <div className="row justify-content-center">
                <div className="col-md-8">
                    <div className="card">
                        <div className="card-header">
                            <h3 className="text-center">Mark Attendance</h3>
                        </div>
                        <div className="card-body">
                            {error && (
                                <div className="alert alert-danger" role="alert">
                                    {error}
                                </div>
                            )}
                            {message && (
                                <div className="alert alert-success" role="alert">
                                    {message}
                                </div>
                            )}
                            
                            <div className="text-center mb-4">
                                {!isCameraOn ? (
                                    <button 
                                        className="btn btn-primary"
                                        onClick={startCamera}
                                    >
                                        Start Camera
                                    </button>
                                ) : (
                                    <div>
                                        <video
                                            ref={videoRef}
                                            autoPlay
                                            playsInline
                                            className="img-fluid mb-3"
                                            style={{ maxWidth: '100%', height: 'auto' }}
                                        />
                                        <div>
                                            <button 
                                                className="btn btn-success me-2"
                                                onClick={verifyFace}
                                                disabled={isProcessing}
                                            >
                                                {isProcessing ? 'Processing...' : 'Mark Attendance'}
                                            </button>
                                            <button 
                                                className="btn btn-danger"
                                                onClick={stopCamera}
                                                disabled={isProcessing}
                                            >
                                                Stop Camera
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                            
                            <div className="alert alert-info">
                                <h5>Instructions:</h5>
                                <ol>
                                    <li>Click "Start Camera" to begin</li>
                                    <li>Position your face in the center of the frame</li>
                                    <li>Ensure good lighting</li>
                                    <li>Click "Mark Attendance" when ready</li>
                                    <li>Wait for confirmation message</li>
                                </ol>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default MarkAttendance; 