import cv2
import numpy as np
import os
from datetime import datetime
import json
from flask import Flask, request, jsonify
from flask_cors import CORS

app = Flask(__name__)
CORS(app)

# Constants
KNOWN_FACES_DIR = 'known_faces'
FACE_SIZE = (200, 200)
THRESHOLD = 60

# Ensure directories exist
os.makedirs(KNOWN_FACES_DIR, exist_ok=True)

# Initialize face detector and recognizer
face_cascade = cv2.CascadeClassifier(cv2.data.haarcascades + 'haarcascade_frontalface_default.xml')
recognizer = cv2.face.LBPHFaceRecognizer_create()

@app.route('/test', methods=['GET'])
def test():
    return jsonify({
        'status': 'ok',
        'message': 'Server is running',
        'known_faces_dir': os.path.abspath(KNOWN_FACES_DIR),
        'dir_exists': os.path.exists(KNOWN_FACES_DIR)
    })

def train_recognizer():
    """Train the face recognizer with all registered faces"""
    faces = []
    labels = []
    label_map = {}
    
    for idx, filename in enumerate(os.listdir(KNOWN_FACES_DIR)):
        if filename.lower().endswith(('.jpg', '.jpeg', '.png')):
            path = os.path.join(KNOWN_FACES_DIR, filename)
            img = cv2.imread(path, cv2.IMREAD_GRAYSCALE)
            if img is None:
                continue
            faces.append(cv2.resize(img, FACE_SIZE))
            labels.append(idx)
            label_map[idx] = os.path.splitext(filename)[0].split('_')[0]
    
    if len(faces) > 0:
        recognizer.train(faces, np.array(labels))
        print(f"Recognizer trained with {len(faces)} faces")
    return label_map

@app.route('/register-face', methods=['POST'])
def register_face():
    try:
        # Get the image data from request
        image_data = request.json.get('image')
        student_id = request.json.get('studentId')
        
        if not image_data or not student_id:
            return jsonify({'error': 'Missing image data or student ID'}), 400

        # Convert base64 image to numpy array
        import base64
        import re
        image_data = re.sub('^data:image/.+;base64,', '', image_data)
        image_bytes = base64.b64decode(image_data)
        nparr = np.frombuffer(image_bytes, np.uint8)
        frame = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

        if frame is None:
            return jsonify({'error': 'Failed to decode image'}), 400

        # Convert to grayscale
        gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
        faces = face_cascade.detectMultiScale(gray, 1.2, 5)

        print(f"Detected {len(faces)} faces in the image")

        if len(faces) == 0:
            return jsonify({'error': 'No face detected. Please ensure your face is clearly visible in the frame.'}), 400
        elif len(faces) > 1:
            return jsonify({'error': f'Multiple faces ({len(faces)}) detected. Please ensure only your face is visible.'}), 400

        # Save the face
        x, y, w, h = faces[0]
        face_img = gray[y:y+h, x:x+w]
        face_resized = cv2.resize(face_img, FACE_SIZE)
        filename = f"{student_id}_{datetime.now().strftime('%Y%m%d_%H%M%S')}.jpg"
        filepath = os.path.join(KNOWN_FACES_DIR, filename)
        cv2.imwrite(filepath, face_resized)

        print(f"Saved face image to {filepath}")

        # Retrain the recognizer
        train_recognizer()

        return jsonify({
            'success': True,
            'message': f'Face registered successfully for student {student_id}'
        })

    except Exception as e:
        print(f"Error in register_face: {str(e)}")
        return jsonify({'error': str(e)}), 500

@app.route('/verify-face', methods=['POST'])
def verify_face():
    try:
        # Get both images from request
        registered_image = request.json.get('registered_image')
        current_image = request.json.get('current_image')
        
        if not registered_image or not current_image:
            return jsonify({'error': 'Missing image data'}), 400

        # Convert base64 images to numpy arrays
        import base64
        import re

        # Process registered image
        registered_image = re.sub('^data:image/.+;base64,', '', registered_image)
        registered_bytes = base64.b64decode(registered_image)
        registered_nparr = np.frombuffer(registered_bytes, np.uint8)
        registered_frame = cv2.imdecode(registered_nparr, cv2.IMREAD_COLOR)
        registered_gray = cv2.cvtColor(registered_frame, cv2.COLOR_BGR2GRAY)

        # Process current image
        current_image = re.sub('^data:image/.+;base64,', '', current_image)
        current_bytes = base64.b64decode(current_image)
        current_nparr = np.frombuffer(current_bytes, np.uint8)
        current_frame = cv2.imdecode(current_nparr, cv2.IMREAD_COLOR)
        current_gray = cv2.cvtColor(current_frame, cv2.COLOR_BGR2GRAY)

        # Detect faces in both images
        registered_faces = face_cascade.detectMultiScale(registered_gray, 1.2, 5)
        current_faces = face_cascade.detectMultiScale(current_gray, 1.2, 5)

        if len(registered_faces) == 0:
            return jsonify({'error': 'No face detected in registered image'}), 400
        if len(current_faces) == 0:
            return jsonify({'error': 'No face detected in current image'}), 400
        if len(current_faces) > 1:
            return jsonify({'error': 'Multiple faces detected in current image'}), 400

        # Extract and resize faces
        x, y, w, h = registered_faces[0]
        registered_face = cv2.resize(registered_gray[y:y+h, x:x+w], FACE_SIZE)

        x, y, w, h = current_faces[0]
        current_face = cv2.resize(current_gray[y:y+h, x:x+w], FACE_SIZE)

        # Compare faces using LBPH
        try:
            # Create a temporary recognizer for this comparison
            temp_recognizer = cv2.face.LBPHFaceRecognizer_create()
            temp_recognizer.train([registered_face], np.array([0]))

            # Predict the current face
            pred_label, confidence = temp_recognizer.predict(current_face)
            
            if confidence < THRESHOLD:
                return jsonify({
                    'success': True,
                    'confidence': float(confidence)
                })
            else:
                return jsonify({
                    'success': False,
                    'error': 'Face verification failed',
                    'confidence': float(confidence)
                })
        except Exception as e:
            print(f"Face comparison error: {str(e)}")
            return jsonify({
                'success': False,
                'error': 'Face comparison failed'
            })

    except Exception as e:
        print(f"Error in verify_face: {str(e)}")
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    # Train the recognizer on startup
    train_recognizer()
    app.run(port=5000) 