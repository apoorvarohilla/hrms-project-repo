# HRMS Lite

HRMS Lite is a lightweight web-based Human Resource Management System developed as part of a full-stack assignment. The application allows an administrator to manage employee records and track daily attendance through a structured and maintainable interface.

The implementation focuses on clean architecture, proper API design, validation handling, and database persistence.

## Features

### Employee Management

- Add a new employee with:
  - Unique Employee ID
  - Full Name
  - Email Address
  - Department
- View all employees
- Delete an employee

### Attendance Management

- Mark attendance for an employee
  - Date
  - Status (Present / Absent)
- View attendance records per employee

## Tech Stack

- React (Vite)
- TypeScript
- Supabase (Database)
- Tailwind CSS

## Project Structure

src/
components/ Reusable UI components
pages/ Page-level views
hooks/ Custom React hooks
lib/ Utility functions
integrations/ Supabase configuration


The structure separates presentation logic, business logic, and integrations for better maintainability and scalability.

## Setup Instructions

1. Clone the repository:

   git clone <repository_url>

2. Navigate into the project directory:

   cd hrms-lite

3. Install dependencies:

   npm install

4. Create a `.env` file in the root directory and configure:

   VITE_SUPABASE_URL=your_supabase_url  
   VITE_SUPABASE_ANON_KEY=your_supabase_anon_key

5. Start the development server:

   npm run dev

The application will run on the default Vite development port.

## Assumptions

- Single admin usage
- No authentication layer implemented
- Scope limited to core HR management operations

## Future Improvements

- Add authentication and role-based access
- Pagination and filtering support
- Improved error handling and loading states
- Unit and integration tests
- CI/CD pipeline setup
