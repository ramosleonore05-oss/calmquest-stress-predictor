# Student Stress Level Predictor PWA

A full-stack Progressive Web App that predicts student stress level using a machine learning model trained from the provided `Student Stress Factors.csv` dataset.

## Tech Stack

- Python
- Scikit-learn
- FastAPI
- React + Vite
- PWA manifest + service worker

## Project Structure

```text
student-stress-predictor-pwa/
├── data/
│   └── Student Stress Factors.csv
├── ml/
│   ├── train_model.py
│   └── stress_model.joblib
├── backend/
│   ├── main.py
│   └── requirements.txt
└── frontend/
    ├── package.json
    ├── index.html
    ├── public/
    │   ├── manifest.json
    │   └── service-worker.js
    └── src/
        ├── App.jsx
        ├── main.jsx
        └── style.css
```

## 1. Train the Model

From the project root:

```bash
cd ml
pip install pandas scikit-learn joblib
python train_model.py
```

This creates:

```text
ml/stress_model.joblib
```

## 2. Run the FastAPI Backend

```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --reload
```

Backend runs at:

```text
http://127.0.0.1:8000
```

API docs:

```text
http://127.0.0.1:8000/docs
```

## 3. Run the React Frontend

Open a new terminal:

```bash
cd frontend
npm install
npm run dev
```

Frontend runs at:

```text
http://localhost:5173
```

## Input Scale

The dataset uses numeric ratings. This app assumes:

- Sleep Quality: 1 to 5
- Headaches per week: 0 to 5
- Academic Performance: 1 to 5
- Study Load: 1 to 5
- Extracurricular Activities per week: 0 to 5

## Output

The model predicts a stress level from:

- 1 = Very Low Stress
- 2 = Low Stress
- 3 = Moderate Stress
- 4 = High Stress
- 5 = Very High Stress