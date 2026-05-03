# Annapurna Banquets & Inn — Hotel Management System

A full-stack Hotel Property Management System (PMS) built with **React JS** and **Spring Boot**, designed for day-to-day hotel operations including reservations, room management, guest tracking, analytics, and AI-powered assistance.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, Vite, Recharts |
| Backend | Spring Boot 4.0.2, Java 17 |
| Database | PostgreSQL |
| Auth | Spring Security + JWT |
| AI | Google Gemini 2.5 Flash API |
| Build | Maven |

---

## Features

### Operations
- **Dashboard** — Live occupancy stats, revenue charts, today's arrivals/departures, smart pricing recommendations
- **Stay View** — Gantt-style room calendar with check-in/checkout time accuracy (12 PM check-in, 10 AM checkout), OOO/Maintenance overlays
- **Rooms View** — Live floor plan with room status, guest popup, service charges, payments, invoice, and room exchange
- **Reservations** — Full reservation list with check-in/checkout actions, filters, and status management
- **New Reservation** — Create bookings with auto-calculated amount based on room type and nights

### Guest Management
- **Guests** — Aggregated guest profiles from reservations with full stay history
- **Companies** — Corporate account management

### Analytics & Reports
- **Analytics** — Monthly revenue, occupancy trends, booking source breakdown
- **Reports** — Night audit, arrival/departure reports, checkout accounting, forecast

### AI Features
- **AI Staff Assistant** — Floating chat widget powered by Gemini. Answers questions about rooms, guests, revenue, upcoming arrivals using live hotel data
- **Smart Pricing Agent** — Daily AI-generated rate recommendations based on occupancy and trends. Staff can approve (applies immediately) or dismiss

### Alerts
- **Checkout Alert** — Popup at 12:00 PM listing guests due for checkout with one-click checkout action

---

## Project Structure

```
HotelManagement/
├── frontend/          # React + Vite
│   └── src/
│       ├── pages/     # All page components
│       ├── api.js     # Axios instance
│       └── App.jsx    # Routing + layout
└── backend/           # Spring Boot
    └── src/main/java/com/hotel/backend/
        ├── Controllers/
        ├── Service/
        ├── Entity/
        ├── Repository/
        ├── DTO/
        └── Config/
```

---

## Getting Started

### Prerequisites
- Java 17+
- Node.js 18+
- PostgreSQL running on port 5432

### 1. Database Setup

Create a PostgreSQL database:
```sql
CREATE DATABASE backend;
```

### 2. Backend Setup

```bash
cd backend
```

Update `src/main/resources/application.properties` with your DB credentials and AI key:

```properties
spring.datasource.url=jdbc:postgresql://localhost:5432/backend
spring.datasource.username=your_username
spring.datasource.password=your_password

app.admin.username=admin
app.admin.password=admin123

app.ai.provider=gemini
app.ai.key=YOUR_GEMINI_API_KEY
```

Run the backend:
```bash
./mvnw spring-boot:run
```

Backend starts on **http://localhost:8080**

### 3. Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

Frontend starts on **http://localhost:5173**

### 4. Load Demo Data (Optional)

To seed 30 rooms and sample reservations, set in `application.properties`:
```properties
app.seed.reset=true
```
Restart the backend once, then immediately set it back to `false` to prevent data loss on future restarts.

---

## Default Login

| Field | Value |
|---|---|
| Username | `admin` |
| Password | `admin123` |

---

## AI Assistant Setup

Get a free Gemini API key from [aistudio.google.com/app/apikey](https://aistudio.google.com/app/apikey) and add it to `application.properties`:

```properties
app.ai.provider=gemini
app.ai.key=YOUR_API_KEY
```

The AI assistant can answer questions like:
- "Who is checking out today?"
- "How many rooms are available?"
- "Which guests are staying more than 5 nights?"
- "What is our revenue in the last 30 days?"

---

## API Endpoints

| Module | Base Path |
|---|---|
| Auth | `POST /api/auth/login` |
| Rooms | `GET/PUT /api/rooms` |
| Reservations | `GET/POST/PUT /api/reservations` |
| Guests | `GET /api/guests` |
| Companies | `GET/POST/PUT/DELETE /api/companies` |
| Analytics | `GET /api/analytics` |
| Reports | `GET /api/reports` |
| AI Chat | `POST /api/ai/chat` |
| Pricing | `GET/POST/PUT /api/pricing` |

---

## Environment Variables (Docker / AWS)

The following can be overridden via environment variables for production deployment:

```env
SPRING_DATASOURCE_URL=jdbc:postgresql://db:5432/backend
SPRING_DATASOURCE_USERNAME=postgres
SPRING_DATASOURCE_PASSWORD=secret
APP_ADMIN_USERNAME=admin
APP_ADMIN_PASSWORD=securepassword
APP_AI_KEY=your_gemini_key
JWT_SECRET=your_jwt_secret
```

---

## License

Built for **Annapurna Banquets and Inn**. All rights reserved.
