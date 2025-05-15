from flask import Flask, request, jsonify
from flask_cors import CORS
import cv2
import numpy as np
import os
import base64
from PIL import Image
import io
import logging
import traceback
import datetime
import csv

app = Flask(__name__)
CORS(app)

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize face detector
face_cascade = cv2.CascadeClassifier(cv2.data.haarcascades + 'haarcascade_frontalface_default.xml')

# Configuration
ATTENDANCE_THRESHOLD = 0.4  # Lower is more strict (cosine distance)
ATTENDANCE_FILE = 'attendance.csv'
KNOWN_FACES_FOLDER = 'known_faces'
TEMP_IMAGE_PREFIX = 'temp_verify_'
CASCADE_PATH = cv2.data.haarcascades + 'haarcascade_frontalface_default.xml'
FACE_SIZE = (200, 200)

# Ensure directories exist
os.makedirs(KNOWN_FACES_FOLDER, exist_ok=True)

class FaceVerificationError(Exception):
    pass

def load_reference_image(student_id):
    """Load reference image for a student"""
    try:
        image_path = os.path.join(KNOWN_FACES_FOLDER, f'{student_id}.jpg')
        if not os.path.exists(image_path):
            return None
        return cv2.imread(image_path)
    except Exception as e:
        logger.error(f"Error loading reference image: {str(e)}")
        return None

def detect_face(image):
    """Detect face in image using OpenCV"""
    try:
        gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
        faces = face_cascade.detectMultiScale(gray, 1.3, 5)
        if len(faces) == 0:
            return None
        (x, y, w, h) = faces[0]
        return image[y:y+h, x:x+w]
    except Exception as e:
        logger.error(f"Error detecting face: {str(e)}")
        return None

def compare_faces(img1, img2):
    """Compare two face images using simple pixel difference"""
    try:
        # Resize images to same size
        size = (100, 100)
        img1 = cv2.resize(img1, size)
        img2 = cv2.resize(img2, size)
        
        # Convert to grayscale
        img1_gray = cv2.cvtColor(img1, cv2.COLOR_BGR2GRAY)
        img2_gray = cv2.cvtColor(img2, cv2.COLOR_BGR2GRAY)
        
        # Calculate difference
        diff = cv2.absdiff(img1_gray, img2_gray)
        similarity = 1 - (np.mean(diff) / 255.0)
        
        return similarity > 0.6  # Threshold for similarity
    except Exception as e:
        logger.error(f"Error comparing faces: {str(e)}")
        return False

def decode_base64_image(base64_string):
    try:
        if "base64," in base64_string:
            base64_string = base64_string.split("base64,")[1]
        image_data = base64.b64decode(base64_string)
        return Image.open(io.BytesIO(image_data))
    except Exception as e:
        logger.error(f"Error decoding base64 image: {str(e)}")
        raise FaceVerificationError("Invalid image format")

def save_temp_image(image, prefix=TEMP_IMAGE_PREFIX):
    """Save image to temporary file and return path"""
    temp_path = f"{prefix}{datetime.datetime.now().strftime('%Y%m%d%H%M%S%f')}.jpg"
    image.save(temp_path)
    return temp_path

def cleanup_files(file_paths):
    """Clean up temporary files"""
    for file_path in file_paths:
        try:
            if os.path.exists(file_path):
                os.remove(file_path)
        except Exception as e:
            logger.error(f"Error removing file {file_path}: {str(e)}")

def mark_attendance(name, status="Present"):
    """Record attendance in CSV file"""
    now = datetime.datetime.now()
    date_str = now.strftime("%Y-%m-%d")
    time_str = now.strftime("%H:%M:%S")
    
    # Check if attendance already recorded today
    if os.path.exists(ATTENDANCE_FILE):
        with open(ATTENDANCE_FILE, 'r') as f:
            reader = csv.reader(f)
            for row in reader:
                if len(row) >= 4 and row[0] == name and row[1] == date_str:
                    return False  # Already marked
    
    # Record attendance
    with open(ATTENDANCE_FILE, 'a', newline='') as f:
        writer = csv.writer(f)
        writer.writerow([name, date_str, time_str, status])
    return True

# Helper to load all faces and labels
def load_faces_and_labels():
    faces = []
    labels = []
    label_map = {}
    for idx, filename in enumerate(os.listdir(KNOWN_FACES_FOLDER)):
        if filename.lower().endswith(('.jpg', '.jpeg', '.png')):
            path = os.path.join(KNOWN_FACES_FOLDER, filename)
            img = cv2.imread(path, cv2.IMREAD_GRAYSCALE)
            if img is None:
                continue
            faces.append(img)
            labels.append(idx)
            label_map[idx] = filename.split('.')[0]
    return faces, labels, label_map

# Train recognizer
def train_recognizer():
    faces, labels, label_map = load_faces_and_labels()
    if len(faces) > 0:
        recognizer.train(faces, np.array(labels))
    return label_map

# Initialize recognizer before training
recognizer = cv2.face.LBPHFaceRecognizer_create()
label_map = train_recognizer()

# Helper to detect and crop face
def detect_and_crop_face(image):
    faces = face_cascade.detectMultiScale(image, scaleFactor=1.1, minNeighbors=5)
    if len(faces) == 0:
        return None
    x, y, w, h = faces[0]
    face = image[y:y+h, x:x+w]
    face = cv2.resize(face, FACE_SIZE)
    return face

@app.route('/verify', methods=['POST'])
def verify_face():
    try:
        data = request.get_json()
        if not data or 'image' not in data or 'student_id' not in data:
            return jsonify({'error': 'Missing required data'}), 400

        # Decode base64 image
        image_data = base64.b64decode(data['image'].split(',')[1])
        image = Image.open(io.BytesIO(image_data)).convert('L')
        image = np.array(image)

        # Detect and crop face
        face = detect_and_crop_face(image)
        if face is None:
            return jsonify({'error': 'No face detected'}), 400

        # Find label for student_id
        label = None
        for k, v in label_map.items():
            if v == data['student_id']:
                label = k
                break
        if label is None:
            return jsonify({'error': 'No registered face for this student'}), 404

        pred_label, confidence = recognizer.predict(face)
        threshold = 60  # Lower is stricter
        if pred_label == label and confidence < threshold:
            return jsonify({'success': True, 'verified': True, 'confidence': float(confidence)})
        else:
            return jsonify({'success': True, 'verified': False, 'confidence': float(confidence)})
    except Exception as e:
        logger.error(f"Error in verify_face: {str(e)}")
        return jsonify({'error': str(e)}), 500

@app.route('/register', methods=['POST'])
def register_face():
    data = request.json
    student_id = data.get('student_id')
    img_b64 = data.get('image')
    if not student_id or not img_b64:
        return jsonify({'success': False, 'message': 'Missing student_id or image'}), 400
    try:
        img_bytes = base64.b64decode(img_b64)
        img = Image.open(io.BytesIO(img_bytes)).convert('L')
        img_np = np.array(img)
        face = detect_and_crop_face(img_np)
        if face is None:
            return jsonify({'success': False, 'message': 'No face detected'}), 400
        save_path = os.path.join(KNOWN_FACES_FOLDER, f'{student_id}.jpg')
        cv2.imwrite(save_path, face)
        global label_map
        label_map = train_recognizer()
        return jsonify({'success': True, 'message': 'Face registered'})
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500

@app.route('/attendance', methods=['GET'])
def get_attendance():
    """Endpoint to retrieve attendance records"""
    try:
        if not os.path.exists(ATTENDANCE_FILE):
            return jsonify({'success': True, 'attendance': []})
        
        attendance = []
        with open(ATTENDANCE_FILE, 'r') as f:
            reader = csv.reader(f)
            for row in reader:
                if len(row) >= 4:
                    attendance.append({
                        'user_id': row[0],
                        'date': row[1],
                        'time': row[2],
                        'status': row[3]
                    })
        
        return jsonify({
            'success': True,
            'attendance': attendance
        })
        
    except Exception as e:
        logger.error(f"Error fetching attendance: {str(e)}")
        return jsonify({
            'success': False,
            'error': f'Failed to fetch attendance: {str(e)}'
        }), 500

@app.route('/health', methods=['GET'])
def health_check():
    return jsonify({
        'status': 'ok',
        'message': 'Face verification service is running',
        'timestamp': datetime.datetime.now().isoformat()
    })

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)