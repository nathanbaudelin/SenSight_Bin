# SenSight Bin

SenSight Bin is a **smart bin project** combining IoT, a backend, AI, and a web interface to optimize waste collection routes.

The project includes:

- **IoT / Sensors**: measures bin fill levels  
- **Backend** (NestJS / Node.js): REST API for managing bins and retrieving data  
- **AI** (FastAPI / Python): generates optimized collection routes  
- **Database** (MongoDB): stores bins, routes, and alerts  
- **Frontend** (TO FILL): web interface to view the map with bins, alerts and generated routes
- **Web visualizer** (Mongo express): web interface to view the database

---

## 1. Project Structure

```(css)
docker-compose.yml  
├── backend/  
│     ├── Dockerfile  
│     └── src/  
├── ai/  
│     ├── Dockerfile  
│     └── worker.py  
├── frontend/ (optional)  
│     ├── Dockerfile  
│     └── src/  
└── mongo-data/ (Docker volume)

.env             (root environment variables)  
backend/.env     (backend local dev environment variables)  
```

## 2. Environment Variables

The project includes **example `.env` files** that you can copy and fill with your credentials:

- **`backend/.env.example`** → copy to `backend/.env` for local development  
- **`.env.example` (root)** → copy to `.env` for Docker  

You only need to **fill in the credentials for Mongo Express**. Everything else already has default values.

### Example for Mongo Express

```
MONGO_EXPRESS_USER=...  
MONGO_EXPRESS_PASSWORD=...  
```

### Notes

- Backend & AI automatically use `MONGO_URL` and `AI_URL` from these `.env` files  
- Local development (`backend/.env`) points to services on `localhost`  
- Docker (`.env`) points to services by their **Docker service names** (`mongodb`, `ai`)  

---

## 3. Running with Docker

Make sure you are in the project root (where `docker-compose.yml` is located).

> Note: `docker-compose` (with a dash) is the old command, while `docker compose` (without a dash) is the new syntax integrated in Docker Compose V2.

### 3.1 Build and start all services

```
docker-compose up --build
```

This will start:

- **Backend** on port `3000`  
- **AI** service on port `8000`  
- **MongoDB** on port `27017`  
- **Mongo Express** (web visualizer) on port `8081`  

---

### 3.2 Stop / Start Services

- Stop containers (keep data):
```
docker-compose stop
```

- Restart containers:
```
docker-compose start
```

- Stop and remove containers + networks:
```
docker-compose down
```

> MongoDB data persists in the Docker volume `mongo-data` even after `down`.  

---

## 4. Testing the Backend & AI

### 4.1 Test Backend

Once Docker is up, you can test the backend API:

```
curl http://localhost:3000/
```

or open in your browser:  
**http://localhost:3000/**

---

### 4.2 Test AI Service

Test the AI route:
```
curl -X POST http://localhost:8000/optimize \
-H "Content-Type: application/json" \
-d '{"bins":[{"bin_id":"BIN-001","current_fill":70},{"bin_id":"BIN-002","current_fill":30}]}'
```

Expected response:
```(json)
{
  "algorithm": "fake_sort_v1",
  "route": [
    {"bin_id": "BIN-001", "current_fill": 70},
    {"bin_id": "BIN-002", "current_fill": 30}
  ]
}
```

## 5. Using the Web Visualizer (Mongo Express)

1. Open your browser:  
**http://localhost:8081**

2. Login with the credentials you set in `.env` (or `.env.example`):

```
Username: ...  
Password: ...
```

3. You can:

- Browse collections: `bins`, `routes`, `alerts`  
- View documents (JSON)  
- Insert / edit / delete documents manually  

> Useful for debugging and verifying that your backend and AI are writing to MongoDB correctly.

---

## 6. Notes

- Backend & AI communicate **internally in Docker** using the service names (`mongodb` and `ai`)  
- For local development, use the local `.env` where services run on `localhost`  
- Mongo Express should **not be exposed in production**; it’s for local/dev only  

---

## 7. Quick Ports Summary

| Service       | Localhost (dev)     | Docker |
|---------------|---------------------|--------|
| Backend       | depend of your .env | 3000   |
| AI            | depend of your .env | 8000   |
| MongoDB       | -                   | 27017  |
| Mongo Express | -                   | 8081   |
| Frontend      | depend of your .env | 3001   |

---

## ✅ Summary

- Copy `.env.example` files and set Mongo Express credentials  
- Start Docker with `docker compose up --build`  
- Test backend & AI via curl or browser  
- Monitor DB via **Mongo Express**  

This setup ensures you can **develop and test SenSight Bin quickly**.
