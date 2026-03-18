from flask import Flask
from faker import Faker
import pandas as pd
import random
import json
import os
from datetime import datetime, timedelta

app = Flask(__name__)
fake = Faker('en_CA')

DIAGNOSES = {
    'E11': 'Type 2 Diabetes', 'I10': 'Hypertension',
    'J45': 'Asthma', 'F32': 'Depression', 'M54': 'Back Pain',
    'I25': 'Coronary Artery Disease', 'J44': 'COPD',
    'N18': 'Chronic Kidney Disease', 'E78': 'High Cholesterol',
    'F41': 'Anxiety Disorder'
}

def generate_patient():
    age = random.randint(18, 95)
    gender = random.choice(['Male', 'Female', 'Non-binary'])
    weight = round(random.gauss(70 if gender=='Female' else 82, 15), 1)
    height = round(random.gauss(163 if gender=='Female' else 176, 7), 1)
    bmi = round(weight / ((height/100)**2), 1)
    diag_code = random.choices(list(DIAGNOSES.keys()),
        weights=[15,20,10,12,15,8,5,5,8,12])[0]
    los = random.randint(1, 14)
    return {
        'patient_id': fake.uuid4()[:8].upper(),
        'age': age,
        'gender': gender,
        'province': fake.province(),
        'diagnosis': DIAGNOSES[diag_code],
        'bmi': max(15, bmi),
        'bp': f"{int(random.gauss(130,15))}/{int(random.gauss(85,10))}",
        'los': los,
        'readmitted': random.choice(['Yes', 'No'])
    }

@app.route('/')
def home():
    with open('C:/SynthMed/index.html', 'r', encoding='utf-8') as f:
        html = f.read()
    return html

@app.route('/api/patient')
def get_patient():
    return json.dumps(generate_patient())

@app.route('/api/stats')
def get_stats():
    patients = [generate_patient() for _ in range(100)]
    df = pd.DataFrame(patients)
    return json.dumps({
        'total_generated': 10000,
        'avg_age': round(df['age'].mean(), 1),
        'top_diagnosis': df['diagnosis'].mode()[0],
        'readmission_rate': round((df['readmitted']=='Yes').mean()*100, 1),
        'provinces': df['province'].nunique(),
        'timestamp': datetime.now().isoformat()
    })

if __name__ == '__main__':
    print("="*50)
    print("  SYNTHMED SERVER STARTING...")
    print("="*50)
    print("  Website: http://localhost:5000")
    print("="*50)
    import webbrowser
    webbrowser.open('http://localhost:5000')
    app.run(debug=False, port=5000)