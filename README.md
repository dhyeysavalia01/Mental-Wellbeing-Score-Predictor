# Mental-Wellbeing-Score-Predictor

Predicts a student's mental health score (0–10) from their social media habits, study routine, sleep, activity, and stress level, using a trained ML model served through FastAPI. The frontend is a plain HTML/CSS/JS form that calls the API and shows the result on an animated score card.

https://mental-wellbeing-score-predictor.netlify.app/

## 📁 Project structure

```

├── main.py                   # FastAPI backend
├── model.ipynb               # Noetbook file
├── requirements.txt          # Library dependencies
├── Mental_Health_Model.pkl   # Trained model, loaded by the backend
├── index.html                # Frontend markup
├── style.css                 # Frontend styling
└── script.js                 # Frontend logic (fetch, validation, result card)
```

## 🛠️ Requirements

- Python 3.9+
- `fastapi`, `uvicorn`, `pandas`, `joblib`, `scikit-learn`, `pydantic`,
Install with:

```bash
pip install requirements.txt
```

## ⚙️ Running the backend

From the folder containing `main.py` and `Mental_Health_Model.pkl`:

```bash
uvicorn main:app --port 8000 --reload
```

The API will be available at `http://127.0.0.1:8000`. Visiting it in a browser should return a simple greeting from the `GET /` route, confirming the model loaded correctly.

## 🌌 Running the frontend

The frontend is static — no build step. Two options:

- **Live Server (recommended):** open `index.html` with the VS Code Live Server extension (or any local static server). This avoids `file://` restrictions on `fetch()`.
- **Python's built-in server:**
  ```bash
  python -m http.server 5500
  ```
  then visit `http://127.0.0.1:5500`.

The backend and frontend can run on different ports — CORS is already open (`allow_origins=["*"]`) on the backend, so this works without extra configuration.

## 👾 API

### `POST /predict`

**Request body:**

```json
{
  "age": 21,
  "gender": "Male",
  "country": "India",
  "academic_level": "Undergraduate",
  "most_used_platform": "Instagram",
  "purpose_of_use": "Entertainment",
  "avg_daily_usage_hours": 4,
  "daily_unlocks": 50,
  "study_hours": 4,
  "physical_activity_hours": 0.4,
  "sleep_hours_per_night": 6,
  "stress_level": "Medium"
}
```

**Response:**

```json
{ "predicted_mental_health_score": 6.42 }
```

Validation failures return `422` with a `detail` array describing each invalid field; the frontend maps these back onto the matching input.

## 👉 Notes

- `country` accepts any value; anything outside the backend's known list (`India, USA, Canada, Australia, UK, Germany, Mexico, Turkey, France`) is grouped as `"Other"` before prediction, matching the model's training categories.
- If a request returns `500`, check the terminal running `uvicorn` for the traceback — FastAPI's default error response doesn't carry CORS headers, so the browser reports it to the frontend as a generic "couldn't reach the server" error even though the backend did respond.
- The result card displays the score with a short qualitative label (low / middle / high end of the scale) and an explicit note that it's a model estimate, not a clinical assessment.
