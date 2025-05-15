import cv2
import numpy as np
import os
import csv
from datetime import datetime

KNOWN_FACES_DIR = 'known_faces'  # Each image: person_name.jpg
ATTENDANCE_FILE = 'attendance.csv'
FACE_SIZE = (200, 200)
THRESHOLD = 60  # Lower = stricter, 60 is a good start

# Ensure directories exist
os.makedirs(KNOWN_FACES_DIR, exist_ok=True)

# Initialize face detector and recognizer
face_cascade = cv2.CascadeClassifier(cv2.data.haarcascades + 'haarcascade_frontalface_default.xml')
recognizer = cv2.face.LBPHFaceRecognizer_create()

# Load faces and labels
def load_faces_and_labels():
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
            label_map[idx] = os.path.splitext(filename)[0]
    return faces, labels, label_map

# Train recognizer
def train_recognizer():
    faces, labels, label_map = load_faces_and_labels()
    if len(faces) > 0:
        recognizer.train(faces, np.array(labels))
    return label_map

label_map = train_recognizer()

# Attendance logging
def mark_attendance(name):
    now = datetime.now()
    date_str = now.strftime('%Y-%m-%d')
    time_str = now.strftime('%H:%M:%S')
    # Prevent duplicate attendance for the same day
    if os.path.exists(ATTENDANCE_FILE):
        with open(ATTENDANCE_FILE, 'r') as f:
            for line in f:
                if name in line and date_str in line:
                    return False
    with open(ATTENDANCE_FILE, 'a', newline='') as f:
        writer = csv.writer(f)
        writer.writerow([name, date_str, time_str, 'Present'])
    return True

# Main recognition loop
def main():
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
                if confidence < THRESHOLD:
                    mark_attendance(name)
            except:
                color = (0, 0, 255)
                label_text = "Unknown"
            cv2.rectangle(frame, (x, y), (x+w, y+h), color, 2)
            cv2.putText(frame, label_text, (x, y-10), cv2.FONT_HERSHEY_SIMPLEX, 0.8, color, 2)
        cv2.imshow('LBPH Face Recognition', frame)
        if cv2.waitKey(1) & 0xFF == ord('q'):
            break
    cap.release()
    cv2.destroyAllWindows()

if __name__ == '__main__':
    main() 