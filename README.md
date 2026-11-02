# AI Platform

A web platform for generating AI images with the **FLUX.2 Klein 4B** model via NVIDIA's Cloud API. It features a demo mode with IP-based credit rate limiting, user authentication, and a "Bring Your Own Key" (BYOK) model storing encrypted user tokens for full usage.

---

## Architecture Overview

```
                      ┌────────────────────────┐
                      │ Frontend (React + Vite)│
                      │ Port: 5173             │
                      └───────────┬────────────┘
                                  │ HTTP / JSON
                                  ▼
                      ┌────────────────────────┐
                      │ Backend Gateway (Go)   │
                      │ Port: 8080             │
                      └─────┬──────────────┬───┘
                            │              │
           Internal Requests│              │ MongoDB
                            ▼              ▼
         ┌─────────────────────┐  ┌──────────────────┐
         │ AI Service (FastAPI)│  │ MongoDB Database │
         │ Port: 8000          │  │ Users & Credits  │
         └──────────┬──────────┘  └──────────────────┘
                    │
                    ▼
         ┌─────────────────────┐
         │  NVIDIA Cloud API   │
         │  FLUX.2 Klein 4B    │
         └─────────────────────┘
```

### Components

1. **Frontend (`/frontend`)**
   - **Stack**: React 19, TypeScript, Vite, Tailwind CSS 4.
   - **Features**: Prompt input form, generation settings (dimensions, steps), demo credit counter, authentication modals (login/register), and settings page to add your NVIDIA API key.

2. **Backend API Gateway (`/backend`)**
   - **Stack**: Go (`net/http`, Gorilla Mux), MongoDB Driver.
   - **Responsibilities**:
     - User authentication (registration, login, JWT issuance).
     - Secure token storage (AES-GCM encryption of user NVIDIA API tokens).
     - Demo rate limiting (tracks IP usage in MongoDB up to 3 free generations).
     - Reverse-proxying image generation jobs to the internal Python AI service.

3. **AI Service (`/ai`)**
   - **Stack**: Python, FastAPI, Requests.
   - **Responsibilities**: Wraps NVIDIA Cloud API (`black-forest-labs/flux.2-klein-4b`), formats generation payloads, executes requests, and returns base64 image strings.

4. **Database**
   - **Stack**: MongoDB.
   - **Collections**:
     - `users`: User credentials and AES-encrypted NVIDIA tokens.
     - `demo_usage`: IP address and generation counter for free demo credits.

---

## Getting Started

### Prerequisites

- [Docker](https://docs.docker.com/get-docker/) & Docker Compose
- Or local runtimes: Go 1.22+, Python 3.10+, Node.js 18+, MongoDB
- An NVIDIA NGC account and API Key from [NVIDIA AI Foundation Cloud](https://build.nvidia.com) (for demo host token or BYOK)

### 1. Configure Environment Variables

Create a `.env` file in the repository root:

```env
# MongoDB Connection
MONGO_URI=mongodb://localhost:27017

# JWT Authentication
JWT_SECRET=your_jwt_secret_key_here

# 32-character key for AES-GCM token encryption
ENCRYPTION_KEY=your-32-character-encryption-key!

# NVIDIA API Token used for server-side demo credits
IMAGE_API=nvapi-your-nvidia-api-key-here
```

### 2. Run with Docker Compose

Run all three services together:

```bash
docker compose up --build
```

- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:8080
- **AI Service**: http://localhost:8000

---

## Local Development (Without Docker)

### AI Service
```bash
cd ai
python -m venv .venv
source .venv/bin/activate  # On Windows: .venv\Scripts\activate
pip install -r requirements.txt
uvicorn app:app --host 0.0.0.0 --port 8000 --reload
```

### Backend
```bash
cd backend
go run main.go
```

### Frontend
```bash
cd frontend
npm install
npm run dev
```

---

## API Routes

| Method | Endpoint | Access | Description |
|---|---|---|---|
| `GET` | `/ping` | Public | Healthcheck endpoint |
| `POST` | `/auth/register` | Public | Create an account |
| `POST` | `/auth/login` | Public | Login and receive JWT token |
| `GET` | `/auth/me` | Protected | Current authenticated user profile |
| `POST` | `/auth/token` | Protected | Save/encrypt personal NVIDIA API token |
| `GET` | `/ai/demo/credits`| Public | Check remaining demo credits by IP |
| `POST` | `/ai/image/demo` | Public | Generate image using demo quota (3 max per IP) |
| `POST` | `/ai/image` | Protected | Generate image using saved encrypted user token |

