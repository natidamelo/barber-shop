# Setup Guide

This guide will help you set up the Barber Shop Management System on your local development environment.

## Prerequisites

Before you begin, ensure you have the following installed on your system:

- **Node.js** (v14.0.0 or higher)
- **npm** (v6.0.0 or higher) 
- **MySQL** (v8.0 or higher)
- **Git** (for version control)

## Environment Setup

### 1. Clone the Repository

```bash
git clone <repository-url>
cd "barber professional"
```

### 2. Database Setup

1. **Install and start MySQL server**

2. **Create the database**
   ```sql
   CREATE DATABASE clinic_cms;
   ```

3. **Create a database user (optional but recommended)**
   ```sql
   CREATE USER 'barbershop'@'localhost' IDENTIFIED BY 'your_password';
   GRANT ALL PRIVILEGES ON clinic_cms.* TO 'barbershop'@'localhost';
   FLUSH PRIVILEGES;
   ```

### 3. Backend Setup

1. **Navigate to backend directory**
   ```bash
   cd backend
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Environment Configuration**
   
   Copy the example environment file:
   ```bash
   cp .env.example .env
   ```

   Edit the `.env` file with your configuration:
   ```env
   # Server Configuration
   PORT=5000
   NODE_ENV=development

   # Database Configuration
   DB_HOST=localhost
   DB_PORT=3306
   DB_NAME=clinic_cms
   DB_USER=root
   DB_PASSWORD=your_mysql_password

   # JWT Configuration
   JWT_SECRET=your_super_secure_jwt_secret_key_change_this_in_production
   JWT_EXPIRE=7d
   JWT_COOKIE_EXPIRE=7

   # Email Configuration (optional for now)
   EMAIL_HOST=smtp.gmail.com
   EMAIL_PORT=587
   EMAIL_USER=your_email@gmail.com
   EMAIL_PASSWORD=your_app_password

   # CORS Origins
   CORS_ORIGINS=http://localhost:3000,http://localhost:5173
   ```

4. **Database Migration**
   
   Run the database migrations to create tables:
   ```bash
   npm run migrate
   ```

5. **Seed Database (Optional)**
   
   Add sample data to the database:
   ```bash
   npm run seed
   ```

6. **Start the Backend Server**
   
   For development:
   ```bash
   npm run dev
   ```
   
   For production:
   ```bash
   npm start
   ```

   The backend will be available at `http://localhost:5000`

### 4. Frontend Setup

1. **Navigate to frontend directory**
   ```bash
   cd ../frontend
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Start the Frontend Development Server**
   ```bash
   npm run dev
   ```

   The frontend will be available at `http://localhost:5173`

## Verification

### Test the Backend API

1. **Health Check**
   ```bash
   curl http://localhost:5000/health
   ```
   Should return: `{"status":"OK","timestamp":"...","environment":"development"}`

2. **API Endpoint**
   ```bash
   curl http://localhost:5000/api
   ```
   Should return API information and available endpoints.

### Test the Frontend

1. Open your browser and navigate to `http://localhost:5173`
2. You should see the barber shop homepage
3. Test navigation to different pages

## Default Test Accounts

After running the seed command, you can use these test accounts:

### Admin Account
- **Email**: admin@barbershop.com
- **Password**: admin123
- **Role**: Admin (full access)

### Barber Accounts
- **Email**: john.smith@barbershop.com
- **Password**: barber123
- **Role**: Barber

- **Email**: mike.johnson@barbershop.com
- **Password**: barber123
- **Role**: Barber

### Customer Accounts
- **Email**: david.wilson@example.com
- **Password**: customer123
- **Role**: Customer

- **Email**: sarah.brown@example.com
- **Password**: customer123
- **Role**: Customer

## Troubleshooting

### Common Issues

1. **Database Connection Error**
   - Verify MySQL is running
   - Check database credentials in `.env` file
   - Ensure the database `clinic_cms` exists

2. **Port Already in Use**
   - Backend (5000): Change PORT in `.env` file
   - Frontend (5173): The error message will show how to use a different port

3. **Missing Dependencies**
   ```bash
   # Backend
   cd backend && npm install
   
   # Frontend
   cd frontend && npm install
   ```

4. **Migration Errors**
   - Drop and recreate the database
   - Run migrations again: `npm run migrate`

5. **CORS Errors**
   - Check CORS_ORIGINS in backend `.env` file
   - Ensure frontend URL is included

### Database Reset

If you need to reset the database:

```bash
# Drop and recreate database
mysql -u root -p
DROP DATABASE clinic_cms;
CREATE DATABASE clinic_cms;
exit

# Run migrations and seeds again
cd backend
npm run migrate
npm run seed
```

## Development Workflow

1. **Start both servers**
   ```bash
   # Terminal 1 - Backend
   cd backend && npm run dev
   
   # Terminal 2 - Frontend  
   cd frontend && npm run dev
   ```

2. **Make changes** to your code
3. **Hot reload** will automatically refresh the application
4. **Check logs** in the terminal for any errors

## Next Steps

Once you have the system running:

1. Explore the API endpoints using the backend documentation
2. Test user registration and login functionality
3. Navigate through the frontend pages
4. Start customizing features for your specific needs

## Production Deployment

For production deployment:

1. Set `NODE_ENV=production` in backend `.env`
2. Configure proper database credentials
3. Set strong JWT secrets
4. Configure email/SMS services
5. Build frontend: `npm run build`
6. Use a process manager like PM2 for the backend
7. Serve frontend static files through a web server like Nginx

## Support

If you encounter issues:

1. Check this setup guide
2. Review the main README.md
3. Check the project's issue tracker
4. Create a new issue with detailed error information