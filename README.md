# Face Recognition Attendance System

## Overview
This is an automated attendance management system that uses facial recognition technology to track attendance in educational institutions, workplaces, or events. The system captures faces through a camera, compares them with registered faces in the database, and marks attendance automatically.

## Features
- **Face Detection & Recognition**: Accurately detects and recognizes faces using OpenCV and LBPH Face Recognizer
- **User Registration**: Simple interface to register new users with their facial data
- **Attendance Tracking**: Automatic attendance marking with timestamps
- **Attendance Reports**: Generate and export attendance reports in CSV format
- **User-friendly Interface**: Easy-to-use web interface for both administrators and users
- **Real-time Processing**: Instant face verification and attendance marking

## Technology Stack
- **Backend**: Python with Flask REST API
- **Face Recognition**: OpenCV, Haar Cascades, LBPH Face Recognizer
- **Frontend**: HTML, CSS, JavaScript
- **Database**: File-based storage for simplicity (CSV for attendance records)

## Installation

### Prerequisites
- Python 3.6+
- OpenCV
- Node.js (for the web server)
- Webcam or camera device

### Setup
1. Clone the repository:
   ```
   git clone https://github.com/yourusername/face-recognization-attendance-app.git
   cd face-recognization-attendance-app
   ```

2. Install Python dependencies:
   ```
   pip install -r requirements.txt
   ```

3. Install Node.js dependencies:
   ```
   npm install
   ```

4. Create required directories:
   ```
   mkdir -p known_faces uploads
   ```

## Usage

### Starting the Services
1. Start the face recognition service:
   ```
   python face_verify_service.py
   ```

2. Start the web server:
   ```
   npm start
   ```

3. Access the web interface at `http://localhost:3000`

### User Registration
1. Navigate to the registration page
2. Enter student/employee ID and other required information
3. Capture face image through the webcam
4. Submit the registration form

### Attendance Marking
1. Navigate to the attendance page
2. Position your face in front of the camera
3. The system will automatically recognize your face and mark attendance

## API Endpoints

### Face Verification Service (port 5000)
- `POST /verify`: Verify a face against stored templates
- `POST /register`: Register a new face
- `GET /attendance`: Get attendance records
- `GET /health`: Check service health

### Web Server (port 3000)
- Main web interface for user interaction

## Security Considerations
- Face images are stored securely
- Basic authentication implemented for admin functions
- Data validation on all inputs

## Future Enhancements
- Multi-factor authentication
- Mobile application support
- Integration with existing school/enterprise management systems
- Advanced analytics and reporting
- Liveness detection to prevent spoofing

## Troubleshooting
- Ensure good lighting for accurate face detection
- For registration, ensure face is clearly visible
- Check camera permissions if face detection fails

## Contributing
Contributions are welcome! Please feel free to submit a Pull Request.

## License
This project is licensed under the MIT License - see the LICENSE file for details.
