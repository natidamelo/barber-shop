import React from 'react'
import { Link } from 'react-router-dom'
import { Scissors, Phone, Mail, MapPin, Clock } from 'lucide-react'
import { useBusinessName } from '../../hooks/useBusinessName'

const Footer = () => {
  const currentYear = new Date().getFullYear()
  const { businessName } = useBusinessName()

  return (
    <footer className="bg-gray-900 text-white">
      <div className="container mx-auto px-4 py-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
          {/* Company Info */}
          <div>
            <div className="flex items-center space-x-1.5 mb-2">
              <Scissors className="h-4 w-4 text-primary-400" />
              <span className="text-sm font-bold">{businessName}</span>
            </div>
            <p className="text-gray-400 text-xs leading-relaxed mb-3 max-w-xs">
              Professional barber shop management system providing premium grooming services with modern convenience.
            </p>
            <div className="flex space-x-2">
              <a href="#" className="text-gray-400 hover:text-primary-400 transition-colors" aria-label="Facebook">
                <span className="sr-only">Facebook</span>
                <div className="w-4 h-4 bg-gray-400 rounded"></div>
              </a>
              <a href="#" className="text-gray-400 hover:text-primary-400 transition-colors" aria-label="Twitter">
                <span className="sr-only">Twitter</span>
                <div className="w-4 h-4 bg-gray-400 rounded"></div>
              </a>
              <a href="#" className="text-gray-400 hover:text-primary-400 transition-colors" aria-label="Instagram">
                <span className="sr-only">Instagram</span>
                <div className="w-4 h-4 bg-gray-400 rounded"></div>
              </a>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-2">Quick Links</h3>
            <ul className="space-y-1">
              <li><Link to="/" className="text-gray-400 hover:text-white text-sm transition-colors">Home</Link></li>
              <li><Link to="/services" className="text-gray-400 hover:text-white text-sm transition-colors">Services</Link></li>
              <li><Link to="/booking" className="text-gray-400 hover:text-white text-sm transition-colors">Book Appointment</Link></li>
              <li><Link to="/login" className="text-gray-400 hover:text-white text-sm transition-colors">Login</Link></li>
              <li><Link to="/register" className="text-gray-400 hover:text-white text-sm transition-colors">Sign Up</Link></li>
            </ul>
          </div>

          {/* Contact Info */}
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-2">Contact Info</h3>
            <div className="space-y-1 text-gray-400 text-sm">
              <div className="flex items-center space-x-1.5">
                <Phone className="h-3.5 w-3.5 shrink-0" />
                <span>(555) 123-4567</span>
              </div>
              <div className="flex items-center space-x-1.5">
                <Mail className="h-3.5 w-3.5 shrink-0" />
                <span>info@barberpro.com</span>
              </div>
              <div className="flex items-center space-x-1.5">
                <MapPin className="h-3.5 w-3.5 shrink-0" />
                <span>123 Main St, City, State 12345</span>
              </div>
            </div>
          </div>

          {/* Business Hours */}
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-2">Business Hours</h3>
            <div className="text-gray-400 text-sm space-y-0.5">
              <div>Mon - Fri: 9:00 AM - 7:00 PM</div>
              <div>Saturday: 8:00 AM - 6:00 PM</div>
              <div>Sunday: 10:00 AM - 4:00 PM</div>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="border-t border-gray-800 mt-5 pt-4 flex flex-col md:flex-row justify-between items-center gap-2">
          <div className="text-gray-500 text-xs">
            © {currentYear} {businessName}. All rights reserved.
          </div>
          <div className="flex space-x-4">
            <Link to="/privacy" className="text-gray-500 hover:text-white text-xs transition-colors">Privacy Policy</Link>
            <Link to="/terms" className="text-gray-500 hover:text-white text-xs transition-colors">Terms of Service</Link>
            <Link to="/contact" className="text-gray-500 hover:text-white text-xs transition-colors">Contact Us</Link>
          </div>
        </div>
      </div>
    </footer>
  )
}

export default Footer