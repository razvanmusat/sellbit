Sellbit - POS & Business Management System
This is my capstone project and a labor of love. It’s not just a coding exercise; it’s a production-ready application currently running at an indoor playground (lucaland.ro), where it replaced manual paper logs and fragmented Excel sheets with a centralized digital system.

Why I built it?
My friend was struggling with inventory discrepancies and chaotic payment tracking. I wanted to build something useful that solves real-world problems: inconsistent stock levels, duplicate catering payments, and the lack of a clear daily sales overview.

Core Features (Real Use Cases)
Sales & POS: A clean interface for staff to process transactions and handle returns.

Inventory Engine: Real-time tracking for 300+ products. The system triggers alerts for low stock and upcoming expiration dates.

Financial Auditing: Strong focus on supplier payment logic (Catering). Orders are tracked by status (PENDING/PAID); bulk payments are calculated automatically, eliminating the risk of duplicate payments via backend validation.

Reservations: A centralized calendar for birthday parties to prevent double bookings.

Architecture & Modules
The system is built on a highly normalized 30-table PostgreSQL schema to cover all business workflows:

Core Financials: CashDrawer management, cash movements, and audit trails for supplier payments.

Advanced Inventory: Warehouse management featuring FIFO (First-In-First-Out) allocation logic and stock adjustments.

Sales & Marketing: Digital receipts, voucher campaigns, and customer database.

Event Planning: Dedicated module for playground reservations and scheduling.

Tech Stack:

Backend: Java 17 + Spring Boot (Spring Data JPA, Spring Security).

Frontend: React.js + Material UI (focused on tablet/POS usability).

DevOps: Containerized with Docker & Docker Compose, deployed on a Linux VPS (Ubuntu) with Nginx as a Reverse Proxy.

Challenges & Learning
Data Mapping: The biggest challenge was translating "paper-based" workflows into a relational database without losing operational flexibility.

Data Integrity: I learned the hard way why database transactions (@Transactional) are non-negotiable—ensuring stock doesn't decrease if a payment fails.

Real-world Deployment: It’s not "perfect code," but it's code that solves a real business problem every single day.

Setup (Docker)
Clone the repository.

Configure your environment variables in a .env file.

Run docker-compose up --build.
