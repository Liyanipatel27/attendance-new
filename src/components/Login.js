import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import "./Login.css";
import "bootstrap-icons/font/bootstrap-icons.css";

const Login = () => {
    const [enrollmentNumber, setEnrollmentNumber] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const navigate = useNavigate();

    const handleSubmit = (e) => {
        e.preventDefault();
        setIsLoading(true);

        // 🛑 Temporarily bypass authentication
        if (enrollmentNumber === "1234" && password === "password") {
            localStorage.setItem("user", JSON.stringify({ 
                name: "Test User", 
                role: "student" 
            }));
            setTimeout(() => {
                setIsLoading(false);
                navigate("/dashboard");
            }, 1000);
        } else {
            setIsLoading(false);
            setError("Invalid Enrollment Number or Password.");
        }
    };

    return (
        <div className="login-container">
            <div className="background-animation">
                <div className="circle circle-1"></div>
                <div className="circle circle-2"></div>
                <div className="circle circle-3"></div>
            </div>
            
            <div className={`login-card ${error ? 'shake' : ''}`}>
                <div className="login-header">
                    <div className="logo-container">
                        <i className="bi bi-person-circle logo-icon"></i>
                    </div>
                    <h1>Attendance System</h1>
                    <p>Sign in to your account</p>
                </div>

                {error && <div className="alert-danger">{error}</div>}

                <form onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label htmlFor="enrollment">Enrollment Number</label>
                        <input
                            type="text"
                            id="enrollment"
                            className="form-control"
                            placeholder="Enter your enrollment number"
                            value={enrollmentNumber}
                            onChange={(e) => setEnrollmentNumber(e.target.value)}
                            required
                        />
                    </div>

                    <div className="form-group password-group">
                        <label htmlFor="password">Password</label>
                        <div className="password-input-container">
                            <input
                                type={showPassword ? "text" : "password"}
                                id="password"
                                className="form-control"
                                placeholder="Enter your password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                            />
                            <button 
                                type="button"
                                className="toggle-password"
                                onClick={() => setShowPassword(!showPassword)}
                            >
                                <i className={`bi bi-eye${showPassword ? '-slash' : ''}`}></i>
                            </button>
                        </div>
                    </div>

                    <button 
                        type="submit" 
                        className={`btn-primary ${isLoading ? 'loading' : ''}`}
                        disabled={isLoading}
                    >
                        {isLoading ? (
                            <>
                                <span className="spinner"></span>
                                Logging in...
                            </>
                        ) : (
                            "Login"
                        )}
                    </button>
                </form>
            </div>
        </div>
    );
};

export default Login;