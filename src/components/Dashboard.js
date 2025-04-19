import React from "react";
import { Link } from "react-router-dom";
import { FaUserGraduate, FaChalkboardTeacher, FaCalendarAlt, FaClipboardList } from "react-icons/fa";
import "./Dashboard.css";

const Dashboard = () => {
    const menuItems = [
        { 
            name: "Students", 
            icon: <FaUserGraduate className="menu-icon" />, 
            path: "/students", 
            bgClass: "bg-blue" 
        },
        { 
            name: "Faculty", 
            icon: <FaChalkboardTeacher className="menu-icon" />, 
            path: "/faculty", 
            bgClass: "bg-green" 
        },
        { 
            name: "View Attendance", 
            icon: <FaClipboardList className="menu-icon" />, 
            path: "/view-attendance", 
            bgClass: "bg-purple" 
        },
        { 
            name: "Timetable", 
            icon: <FaCalendarAlt className="menu-icon" />, 
            path: "/timetable", 
            bgClass: "bg-red" 
        }
    ];

    return (
        <div className="dashboard-container">
            <div className="dashboard-header">
                <h1 className="dashboard-title">📊 Dashboard</h1>
            </div>

            <div className="dashboard-grid">
                {menuItems.map((item, index) => (
                    <Link 
                        key={index} 
                        to={item.path} 
                        className="menu-link"
                    >
                        <div className={`menu-card ${item.bgClass}`}>
                            <div className="menu-content">
                                <h2 className="menu-title">{item.name}</h2>
                                <div className="menu-icon-wrapper">
                                    {item.icon}
                                </div>
                            </div>
                        </div>
                    </Link>
                ))}
            </div>
        </div>
    );
};

export default Dashboard;