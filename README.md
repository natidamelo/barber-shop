# Barber Shop Management System

A comprehensive web-based management system for barber shops, featuring appointment scheduling, customer management, inventory tracking, and employee management.

## 🚀 Features

### Customer Features
- **Online Appointment Booking**: 24/7 online booking with calendar integration
- **Customer Profiles**: Personal profiles with appointment history and preferences
- **Service Reviews**: Rate and review services and barbers
- **Notifications**: Email/SMS notifications for appointment reminders and confirmations
- **Mobile Responsive**: Fully responsive design for mobile and desktop

### Staff Features
- **Appointment Management**: View, manage, and update appointments
- **Customer Information**: Access customer profiles and history
- **Schedule Management**: Manage staff schedules and availability
- **Service Management**: Add, edit, and manage services offered

### Admin Features
- **User Management**: Manage customers, barbers, and admin accounts
- **Inventory Management**: Track supplies, set reorder points, and manage stock
- **Reporting**: Generate reports on sales, customer feedback, and inventory
- **Service Management**: Complete control over services, pricing, and descriptions

## 🛠️ Technology Stack

### Backend
- **Runtime**: Node.js
- **Framework**: Express.js
- **Database**: MySQL (using clinic_cms database)
- **ORM**: Knex.js for database queries and migrations
- **Authentication**: JWT (JSON Web Tokens)
- **Validation**: Joi and express-validator
- **Security**: Helmet, CORS, bcrypt for password hashing

### Frontend
- **Framework**: React 18 with Vite
- **Styling**: Tailwind CSS with custom components
- **Routing**: React Router DOM
- **State Management**: Zustand (lightweight alternative to Redux)
- **HTTP Client**: Axios
- **Forms**: React Hook Form
- **UI Components**: Headless UI, Lucide React icons
- **Animations**: Framer Motion

## 📁 Project Structure

```
barber professional/
├── backend/
│   ├── src/
│   │   ├── config/          # Database and app configuration
│   │   ├── controllers/     # Route controllers
│   │   ├── middleware/      # Custom middleware
│   │   ├── models/          # Database models
│   │   ├── routes/          # API routes
│   │   ├── utils/           # Utility functions
│   │   └── server.js        # Main server file
│   ├── migrations/          # Database migration files
│   ├── seeds/              # Database seed data
│   ├── package.json
│   └── knexfile.js         # Knex configuration
├── frontend/
│   ├── src/
│   │   ├── components/      # Reusable components
│   │   ├── pages/          # Page components
│   │   ├── hooks/          # Custom hooks
│   │   ├── services/       # API services
│   │   ├── store/          # State management
│   │   ├── utils/          # Utility functions
│   │   └── App.jsx         # Main app component
│   ├── public/             # Static assets
│   ├── package.json
│   └── vite.config.js      # Vite configuration
└── docs/                   # Project documentation
```

## 🗄️ Database Schema

The system uses a MySQL database with the following main tables:

- **users**: Customer and staff information with role-based access
- **services**: Available services with pricing and duration
- **appointments**: Appointment bookings and scheduling
- **inventory**: Inventory items and stock tracking
- **inventory_transactions**: Stock movement history
- **reviews**: Customer reviews and ratings
- **staff_schedules**: Staff availability and working hours

## 🚀 Installation & Setup

### Prerequisites
- Node.js (v14 or higher)
- MySQL database server
- Git

### Backend Setup

1. **Navigate to backend directory**
   ```bash
   cd "barber professional/backend"
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Database Setup**
   - Create a MySQL database named `clinic_cms`
   - Copy `.env.example` to `.env`
   - Update database credentials in `.env` file

4. **Run database migrations**
   ```bash
   npm run migrate
   ```

5. **Seed the database (optional)**
   ```bash
   npm run seed
   ```

6. **Start the development server**
   ```bash
   npm run dev
   ```

The backend will be available at `http://localhost:5000`

### Frontend Setup

1. **Navigate to frontend directory**
   ```bash
   cd "barber professional/frontend"
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Start the development server**
   ```bash
   npm run dev
   ```

The frontend will be available at `http://localhost:5173`

## 🔑 Default Credentials

After seeding the database, you can use these test accounts:

- **Admin**: admin@barbershop.com / admin123
- **Barber**: john.smith@barbershop.com / barber123
- **Customer**: david.wilson@example.com / customer123

## 📚 API Documentation

### Authentication Endpoints
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `GET /api/auth/me` - Get current user
- `PUT /api/auth/profile` - Update profile
- `POST /api/auth/logout` - User logout

### Services Endpoints
- `GET /api/services` - Get all services
- `GET /api/services/:id` - Get single service
- `POST /api/services` - Create service (Admin/Barber)
- `PUT /api/services/:id` - Update service (Admin/Barber)
- `DELETE /api/services/:id` - Delete service (Admin)

### Appointments Endpoints
- `GET /api/appointments` - Get appointments
- `GET /api/appointments/:id` - Get single appointment
- `POST /api/appointments` - Create appointment
- `PUT /api/appointments/:id` - Update appointment
- `DELETE /api/appointments/:id` - Delete appointment

### Additional Endpoints
- Users: `/api/users/*`
- Inventory: `/api/inventory/*`
- Reviews: `/api/reviews/*`

## 🔒 Security Features

- **JWT Authentication**: Secure token-based authentication
- **Password Hashing**: bcrypt for password security
- **Input Validation**: Comprehensive input validation and sanitization
- **CORS Protection**: Configurable CORS settings
- **Rate Limiting**: API rate limiting to prevent abuse
- **Helmet**: Security headers with Helmet.js

## 🎨 UI/UX Features

- **Responsive Design**: Works seamlessly on all devices
- **Modern Interface**: Clean and intuitive user interface
- **Accessibility**: WCAG compliant design
- **Loading States**: Smooth loading animations and states
- **Error Handling**: User-friendly error messages
- **Toast Notifications**: Real-time feedback for user actions

## 📈 Development Roadmap

### Phase 1 - Core Features ✅
- [x] Project setup and structure
- [x] Database design and migrations
- [x] Authentication system
- [x] Basic frontend layout

### Phase 2 - Business Logic
- [ ] Appointment booking system
- [ ] Service management
- [ ] Customer profiles
- [ ] Inventory tracking

### Phase 3 - Advanced Features
- [ ] Reporting dashboard
- [ ] Email/SMS notifications
- [ ] Payment integration
- [ ] Advanced search and filtering

### Phase 4 - Optimization
- [ ] Performance optimization
- [ ] Testing coverage
- [ ] Deployment setup
- [ ] Documentation completion

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/new-feature`)
3. Commit your changes (`git commit -am 'Add new feature'`)
4. Push to the branch (`git push origin feature/new-feature`)
5. Create a Pull Request

## 📝 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🆘 Support

For support and questions:
- Email: support@barbershop.com
- Create an issue in the repository
- Check the documentation in the `/docs` folder

## 🙏 Acknowledgments

- Built with modern web technologies
- Inspired by best practices in web development
- Designed for scalability and maintainability

---

**Note**: This is a comprehensive management system designed for barber shops. Always remember to use the clinic_cms database and avoid mock data as per project requirements.