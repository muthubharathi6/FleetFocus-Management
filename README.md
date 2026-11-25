# FleetFocus – Fleet Management System

A full-stack fleet management web application built to manage vehicles, drivers, trips, maintenance activities, and fleet operations through a centralized dashboard.

## 🚀 Technology Stack

**Frontend**
- React.js
- JavaScript
- Redux Toolkit
- Axios
- HTML and CSS

**Backend**
- Java
- Spring Boot
- Spring Security
- JWT Authentication
- Maven
- REST APIs

**Database**
- MySQL

## ✨ Key Features

- **Dashboard:** Centralized fleet overview and operational information.
- **Vehicle Management:** Manage vehicle records and information.
- **Driver Management:** Maintain driver details and records.
- **Trip Management:** Manage and track trip information.
- **Maintenance Management:** Maintain vehicle maintenance records.
- **Authentication:** Secure login and authentication using JWT.
- **Monitoring:** Support for fleet monitoring and telemetry-related data.

## 📁 Project Structure

```text
fleetfocus-project/
│
├── backend/
│   ├── .mvn/
│   │   └── wrapper/
│   ├── src/
│   │   └── main/
│   │       ├── java/com/example/demo/
│   │       │   ├── config/
│   │       │   ├── controller/
│   │       │   ├── dto/
│   │       │   ├── entity/
│   │       │   ├── exception/
│   │       │   ├── repository/
│   │       │   └── service/
│   │       └── resources/
│   │           └── application.properties
│   ├── pom.xml
│   ├── mvnw
│   └── mvnw.cmd
│
├── frontend/
│   ├── public/
│   ├── src/
│   │   ├── _mocks_/
│   │   ├── assets/
│   │   ├── components/
│   │   ├── context/
│   │   ├── services/
│   │   ├── store/
│   │   ├── styles/
│   │   ├── utils/
│   │   ├── App.js
│   │   └── index.js
│   ├── package.json
│   └── package-lock.json
│
├── login.html
├── README.md
└── .gitignore
```

## ⚙️ Installation and Setup

### Prerequisites

- Java JDK
- Maven (or use the included Maven wrapper)
- Node.js and npm
- MySQL Server

### 1. Clone the Repository

```bash
git clone https://github.com/muthubharathi6/FleetFocus-Management.git
cd FleetFocus-Management
```

### 2. Configure the Database

- Start your MySQL server.
- Create the required database.
- Configure `DB_URL`, `DB_USERNAME`, `DB_PASSWORD`, and `JWT_SECRET` as environment variables before running the backend.
- Never commit actual database credentials or secret keys.

### 3. Run the Backend

Open a terminal:

```bash
cd backend
mvnw.cmd spring-boot:run
```

### 4. Run the Frontend

Open another terminal:

```bash
cd frontend
npm install
npm start
```

The frontend and backend will run locally on their configured ports.

## 🔐 Security

The application uses Spring Security and JWT-based authentication for protected API access.

## 👨‍💻 Developer

**Muthubharathi R**

- GitHub: https://github.com/muthubharathi6
- LinkedIn: https://www.linkedin.com/in/muthubharathi-r-280080326/

## 📌 Project

FleetFocus – Fleet Management System

