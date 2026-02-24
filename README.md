# ACO Decision Support System
Ant Colony Optimization – Decision Support System
Architecture: Client–Server
Backend: Python (Flask)
Frontend: ReactJS

---

# 1. Project Overview

This project implements a Decision Support System (DSS) that uses the Ant Colony Optimization (ACO) algorithm to find an optimal path between two points.

The system simulates scenarios such as:
- Mountain trekking
- Localized traffic disruption
- Natural disaster impact (flood, landslide, earthquake)
- Blocked or risky routes

After computing candidate paths, the backend returns:
- Best path
- Total distance
- Optimization result

The user (client) makes the final decision based on the recommendation.

---

# 2. System Architecture

Client–Server model:

React Client
    ↓
HTTP POST /optimize
    ↓
Flask Backend
    ↓
ACO Algorithm Engine
    ↓
Return Best Path + Distance
    ↓
React UI renders result

---

# 3. Tech Stack

Backend:
- Python 3.9+
- Flask
- Flask-CORS

Frontend:
- React 18
- Axios
- react-scripts

---

# 4. Folder Structure

ACO_Decision_Support_System
│
├── backend
│   ├── app/
│   │   └── aco.py        # ACO algorithm implementation
│   ├── app.py            # Flask entry point
│   └── requirements.txt
│
└── frontend
    ├── public/index.html
    ├── src/App.js
    ├── src/index.js
    └── package.json

---

# 5. Backend Details

## 5.1 Entry File

backend/app.py

Main responsibilities:
- Initialize Flask app
- Enable CORS
- Define API routes
- Initialize graph
- Call ACO algorithm
- Return JSON response

### Endpoint

POST /optimize

Request Body:
{
  "start": "A",
  "end": "D"
}

Response:
{
  "best_path": ["A", "B", "C", "D"],
  "distance": 5
}

---

## 5.2 ACO Algorithm

File:
backend/app/aco.py

Class:
AntColonyOptimization

Constructor parameters:
- graph
- n_ants
- n_iterations
- alpha (pheromone importance)
- beta (heuristic importance)
- evaporation rate

Core methods:
- run(start, end)
- construct_path(start, end)
- update_pheromone(paths)

Algorithm Logic:
1. Initialize pheromone on all edges
2. For each iteration:
   - Each ant constructs a path
   - Calculate path distance
   - Update best path
3. Evaporate pheromone
4. Reinforce pheromone on better paths
5. Return global best path

Graph format:
{
    ("A", "B"): 2,
    ("A", "C"): 5,
    ...
}

---

# 6. Frontend Details

Main file:
frontend/src/App.js

Responsibilities:
- Collect start and end input
- Send POST request to backend
- Display optimization result

HTTP Call:
axios.post("http://localhost:5000/optimize", {...})

State management:
- start
- end
- result

Rendering:
- Best path (joined with arrows)
- Distance

---

# 7. Setup Instructions

=====================================
BACKEND SETUP
=====================================

1. Navigate to backend folder

cd backend

2. Create virtual environment

python -m venv venv

Mac/Linux:
source venv/bin/activate

Windows:
venv\Scripts\activate

3. Install dependencies

pip install -r requirements.txt

4. Run server

python app.py

Server runs at:
http://localhost:5000

=====================================
FRONTEND SETUP
=====================================

Open new terminal

1. Navigate to frontend folder

cd frontend

2. Install dependencies

npm install

3. Run development server

npm start

Frontend runs at:
http://localhost:3000

---

# 8. Development Flow

1. Start backend
2. Start frontend
3. Enter start and end nodes
4. Click optimize
5. Backend computes ACO
6. Result returned and displayed

---

# 9. Known Limitations

- Graph is currently static (hardcoded)
- No Google Maps integration yet
- No real-time disaster data
- Single-objective optimization (distance only)

---

# 10. Future Improvements

Possible extensions:

- Integrate Google Maps API
- Convert distance matrix into graph
- Add multi-objective optimization:
    - Distance
    - Risk score
    - Travel time
- Add dynamic blocked edges
- Compare ACO vs Dijkstra
- Add visualization on map

---

# 11. Production Build

To build frontend for production:

cd frontend
npm run build

Build output:
frontend/build

---

# 12. Ports

Backend:
5000

Frontend:
3000

If port conflict occurs:
Change port in app.py:

app.run(debug=True, port=5001)

---

# 13. Stopping Servers

Press:
CTRL + C

---

# 14. Summary

This project demonstrates:

- Implementation of Ant Colony Optimization
- Client–Server architecture
- REST API communication
- Decision Support System concept
- Separation of concerns (BE/FE)
- Expandable architecture for real-world navigation problems

---

END OF README