import cv2
import numpy as np
import os
from datetime import datetime

# Constants
KNOWN_FACES_DIR = 'known_faces'
FACE_SIZE = (200, 200)
THRESHOLD = 60

# Ensure directories exist
os.makedirs(KNOWN_FACES_DIR, exist_ok=True)

# Initialize face detector and recognizer
face_cascade = cv2.CascadeClassifier(cv2.data.haarcascades + 'haarcascade_frontalface_default.xml')
recognizer = cv2.face.LBPHFaceRecognizer_create()

def register_face(name):
    """Register a new face"""
    cap = cv2.VideoCapture(0)
    print(f"Registering face for {name}. Press SPACE to capture, ESC to cancel.")
    
    while True:
        ret, frame = cap.read()
        if not ret:
            break
            
        gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
        faces = face_cascade.detectMultiScale(gray, 1.2, 5)
        
        for (x, y, w, h) in faces:
            cv2.rectangle(frame, (x, y), (x+w, y+h), (0, 255, 0), 2)
        
        cv2.imshow('Face Registration', frame)
        
        key = cv2.waitKey(1) & 0xFF
        if key == 27:  # ESC
            print("Registration cancelled")
            break
        elif key == 32:  # SPACE
            if len(faces) == 1:
                face_img = gray[y:y+h, x:x+w]
                face_resized = cv2.resize(face_img, FACE_SIZE)
                filename = f"{name}_{datetime.now().strftime('%Y%m%d_%H%M%S')}.jpg"
                cv2.imwrite(os.path.join(KNOWN_FACES_DIR, filename), face_resized)
                print(f"Face registered successfully as {filename}")
                break
            else:
                print("Please ensure only one face is visible")
    
    cap.release()
    cv2.destroyAllWindows()
    train_recognizer()

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

def recognize_faces():
    """Recognize faces in real-time"""
    label_map = train_recognizer()
    if not label_map:
        print("No faces registered. Please register faces first.")
        return
    
    cap = cv2.VideoCapture(0)
    print('Press Q to quit.')
    
    while True:
        ret, frame = cap.read()
        if not ret:
            break
            
        gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
        faces = face_cascade.detectMultiScale(gray, 1.2, 5)
        
        for (x, y, w, h) in faces:
            face_img = gray[y:y+h, x:x+w]
            face_resized = cv2.resize(face_img, FACE_SIZE)
            
            try:
                pred_label, confidence = recognizer.predict(face_resized)
                name = label_map.get(pred_label, 'Unknown')
                color = (0, 255, 0) if confidence < THRESHOLD else (0, 0, 255)
                label_text = f"{name} ({confidence:.1f})" if confidence < THRESHOLD else "Unknown"
            except:
                color = (0, 0, 255)
                label_text = "Unknown"
                
            cv2.rectangle(frame, (x, y), (x+w, y+h), color, 2)
            cv2.putText(frame, label_text, (x, y-10), cv2.FONT_HERSHEY_SIMPLEX, 0.8, color, 2)
        
        cv2.imshow('Face Recognition', frame)
        if cv2.waitKey(1) & 0xFF == ord('q'):
            break
    
    cap.release()
    cv2.destroyAllWindows()

if __name__ == '__main__':
    while True:
        print("\nFace Recognition System")
        print("1. Register new face")
        print("2. Start recognition")
        print("3. Exit")
        choice = input("Enter your choice (1-3): ")
        
        if choice == '1':
            name = input("Enter name for the face: ")
            register_face(name)
        elif choice == '2':
            recognize_faces()
        elif choice == '3':
            break
        else:
            print("Invalid choice. Please try again.") 