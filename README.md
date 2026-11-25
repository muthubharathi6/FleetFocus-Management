# FleetFocus - Fleet Management System

A full-stack Fleet Management web application with a modern React frontend and Spring Boot backend.

---

## 📁 Project Structure

```
fleetanti/
├── backend/                  # Spring Boot Java Backend
│   ├── src/                  # Source code (Controllers, Services, Models, Repositories)
│   ├── pom.xml               # Maven dependencies and build configuration
│   └── mvnw / mvnw.cmd       # Maven wrapper scripts
├── frontend/                 # React Frontend
│   ├── src/                  # React components, Redux store, CSS design system
│   │   ├── components/       # Dashboard, Vehicles, Trips, Maintenance, Layout
│   │   ├── services/         # API services (Axios)
│   │   ├── store/            # Redux Toolkit state slices
│   │   ├── App.js            # Main routing and dashboard assembly
│   │   └── index.css         # Complete dark/light theme design system
│   ├── public/               # Public assets & HTML template
│   └── package.json          # Frontend dependencies and test scripts
├── login.html                # Standalone preview login page
└── README.md                 # Setup and run instructions
```

---

## 🚀 How to Run Locally

### Prerequisites
- **Node.js**: v18 or later (with `npm`)
- **Java JDK**: 17 or later
- **MySQL**: Running locally on port `3306` (or update database config in `application.properties`)

---

### Step 1: Start the Backend (Spring Boot)

1. Open a terminal in the `backend/` folder:
   ```bash
   cd backend
   ```

2. Configure MySQL Database:
   - Make sure MySQL is running on `localhost:3306`.
   - Open `src/main/resources/application.properties` and verify your username and password:
     ```properties
     spring.datasource.url=jdbc:mysql://localhost:3306/db1?createDatabaseIfNotExist=true
     spring.datasource.username=root
     spring.datasource.password=***REMOVED***
     ```

3. Run the Spring Boot application:
   - On Windows:
     ```cmd
     mvnw.cmd spring-boot:run
     ```
   - On Mac/Linux:
     ```bash
     ./mvnw spring-boot:run
     ```
   - Or with Maven installed:
     ```bash
     mvn spring-boot:run
     ```

The backend server will start on **`http://localhost:8080`**.

---

### Step 2: Start the Frontend (React)

1. Open a new terminal in the `frontend/` folder:
   ```bash
   cd frontend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the React development server:
   ```bash
   npm start
   ```

The application will automatically open in your browser at **`http://localhost:3000`**.

---

### Step 3: Run the Test Suite (Optional)

In the `frontend/` directory, run:
```bash
npm test -- --watchAll=false --ci
```
All **30 unit and integration tests** will execute and pass cleanly.

---

## 🎨 Features & Highlights
- **Futuristic High-Tech Dashboard**: Live GPS radar fleet tracking, 75% utilization circular radial gauge, Trip Overview dual bar charts (7D/30D/3M), Expense breakdown donut, Vehicle Status meters, and Upcoming Maintenance alerts.
- **Full Theme Support**: Polished Dark Mode and Light Mode with a one-click toggle in the sidebar.
- **Role-Based Access Control**: Secure JWT authentication supporting `FLEET_MANAGER` and `DRIVER` roles.
- **RESTful Endpoints**: Full CRUD support for vehicles, trips, maintenance logs, and live monitoring.
