import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Calendar, Scissors, Users, Star, ChevronLeft, ChevronRight } from 'lucide-react'

const HERO_IMAGES = [
  'https://images.unsplash.com/photo-1585747860715-2ba37e788b70?ixlib=rb-4.0.3&auto=format&fit=crop&w=1200&q=85',
  'https://images.unsplash.com/photo-1599351431202-1e0f0137899a?ixlib=rb-4.0.3&auto=format&fit=crop&w=1200&q=85',
  'https://images.unsplash.com/photo-1503951914875-452162b0f3f1?ixlib=rb-4.0.3&auto=format&fit=crop&w=1200&q=85',
  'https://images.unsplash.com/photo-1621605815971-fbc98d665033?ixlib=rb-4.0.3&auto=format&fit=crop&w=1200&q=85',
  'https://images.unsplash.com/photo-1622286342621-4bd786c2447c?ixlib=rb-4.0.3&auto=format&fit=crop&w=1200&q=85'
]

const HomePage = () => {
  const [heroIndex, setHeroIndex] = useState(0)

  useEffect(() => {
    const interval = setInterval(() => {
      setHeroIndex((i) => (i + 1) % HERO_IMAGES.length)
    }, 5000)
    return () => clearInterval(interval)
  }, [])

  const goPrev = (e) => {
    e.preventDefault()
    setHeroIndex((i) => (i - 1 + HERO_IMAGES.length) % HERO_IMAGES.length)
  }
  const goNext = (e) => {
    e.preventDefault()
    setHeroIndex((i) => (i + 1) % HERO_IMAGES.length)
  }

  const features = [
    {
      icon: <Calendar className="h-8 w-8 text-primary-600" />,
      title: 'Easy Booking',
      description: 'Schedule your appointments online 24/7 with our convenient booking system.'
    },
    {
      icon: <Scissors className="h-8 w-8 text-primary-600" />,
      title: 'Expert Barbers',
      description: 'Our skilled professionals provide top-quality cuts and styling services.'
    },
    {
      icon: <Users className="h-8 w-8 text-primary-600" />,
      title: 'Personal Service',
      description: 'Enjoy personalized attention and service tailored to your preferences.'
    },
    {
      icon: <Star className="h-8 w-8 text-primary-600" />,
      title: 'Premium Experience',
      description: 'Experience luxury grooming in our modern, comfortable environment.'
    }
  ]

  const services = [
    { name: 'Classic Men\'s Haircut', price: '750 ETB', duration: '45 min' },
    { name: 'Beard Trim & Shape', price: '600 ETB', duration: '30 min' },
    { name: 'Premium Cut & Wash', price: '1,350 ETB', duration: '60 min' },
    { name: 'Hot Towel Shave', price: '1,050 ETB', duration: '45 min' },
  ]

  return (
    <div className="min-h-screen">
      {/* Hero Section - Premium barber with scissors */}
      <section className="relative min-h-[90vh] flex flex-col lg:flex-row overflow-hidden">
        {/* Content side - narrower so image is bigger */}
        <div className="relative z-10 flex-[0.85] lg:max-w-[420px] flex flex-col justify-center px-5 py-14 lg:py-24 lg:pl-12 xl:pl-16 lg:pr-8 bg-gradient-to-br from-neutral-900 via-neutral-800 to-primary-900 text-white">
          <div className="max-w-sm">
            {/* Logo block – like reference: Kaleb (K + scissors bound, K larger) on line 1, Barber on line 2 */}
            <div className="mb-6 rounded-xl px-4 py-3 sm:px-5 sm:py-4 bg-black/30 border border-white/10 backdrop-blur-md shadow-xl text-center">
              <div className="flex items-baseline gap-0 justify-center">
                <span className="relative inline-flex items-center">
                  <Scissors
                    className="absolute left-0 h-8 w-8 sm:h-9 sm:w-9 md:h-10 md:w-10 lg:h-12 lg:w-12 text-amber-400 flex-shrink-0 drop-shadow-lg z-10"
                    style={{ transform: 'translateX(-20%)' }}
                    aria-hidden
                  />
                  <span className="relative z-20 text-4xl sm:text-5xl md:text-6xl lg:text-7xl xl:text-8xl font-bold font-display text-white tracking-tight drop-shadow-md pl-6 sm:pl-7 md:pl-8 lg:pl-10">
                    K
                  </span>
                </span>
                <span className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl xl:text-6xl font-bold font-display text-white tracking-wide ml-0.5">
                  aleb
                </span>
              </div>
              <div className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-bold font-display text-white tracking-wide mt-1 text-center">
                Barber
              </div>
            </div>

            <h1 className="text-2xl sm:text-3xl lg:text-4xl xl:text-5xl font-bold font-heading leading-tight mb-4 animate-fade-in">
              Premium Barber Shop Experience
            </h1>
            <p className="text-sm sm:text-base text-gray-300 mb-8 leading-relaxed">
              Professional grooming services with expert barbers in a modern, comfortable environment
            </p>
            <div className="flex flex-wrap gap-3">
              <Link
                to="/booking"
                className="btn btn-md bg-amber-500 text-neutral-900 hover:bg-amber-400 font-semibold shadow-lg shadow-amber-500/25 transition-all hover:shadow-amber-500/40"
              >
                Book Appointment
              </Link>
              <Link
                to="/services"
                className="btn btn-outline btn-md border-2 border-white/60 text-white hover:bg-white hover:text-neutral-900 font-medium"
              >
                View Services
              </Link>
            </div>
          </div>
        </div>
        {/* Barber image side - carousel of different images */}
        <div className="relative flex-1 min-h-[55vh] lg:min-h-[90vh]">
          {HERO_IMAGES.map((src, i) => (
            <div
              key={src}
              className="absolute inset-0 bg-cover bg-center bg-no-repeat transition-opacity duration-700 ease-in-out"
              style={{
                backgroundImage: `url('${src}')`,
                opacity: i === heroIndex ? 1 : 0,
                zIndex: i === heroIndex ? 1 : 0
              }}
              role="img"
              aria-label={`Hero image ${i + 1} of ${HERO_IMAGES.length}`}
              aria-hidden={i !== heroIndex}
            />
          ))}
          <div className="absolute inset-0 bg-gradient-to-r from-neutral-900/40 via-transparent to-transparent lg:from-neutral-900/60 z-[2]" />
          <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-neutral-900/80 to-transparent lg:hidden z-[2]" />
          {/* Carousel controls */}
          <div className="absolute bottom-4 right-4 lg:bottom-8 lg:right-8 flex items-center gap-2 z-[3]">
            <button
              type="button"
              onClick={goPrev}
              className="p-2 rounded-full bg-white/20 hover:bg-white/40 text-white transition-colors backdrop-blur-sm"
              aria-label="Previous image"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <div className="flex gap-1.5">
              {HERO_IMAGES.map((_, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setHeroIndex(i)}
                  className={`w-2.5 h-2.5 rounded-full transition-all ${
                    i === heroIndex ? 'bg-amber-400 scale-125' : 'bg-white/60 hover:bg-white/80'
                  }`}
                  aria-label={`Go to image ${i + 1}`}
                  aria-current={i === heroIndex ? 'true' : undefined}
                />
              ))}
            </div>
            <button
              type="button"
              onClick={goNext}
              className="p-2 rounded-full bg-white/20 hover:bg-white/40 text-white transition-colors backdrop-blur-sm"
              aria-label="Next image"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16 bg-gray-50">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Why Choose Our Barber Shop?
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              We combine traditional barbering techniques with modern convenience to deliver exceptional service
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map((feature, index) => (
              <div key={index} className="text-center p-6 bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow">
                <div className="flex justify-center mb-4">
                  {feature.icon}
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  {feature.title}
                </h3>
                <p className="text-gray-600">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Services Preview Section */}
      <section className="py-16 bg-white">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Our Popular Services
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              From classic cuts to modern styles, we offer a full range of grooming services
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {services.map((service, index) => (
              <div key={index} className="bg-gray-50 rounded-lg p-6 text-center hover:bg-gray-100 transition-colors">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  {service.name}
                </h3>
                <p className="text-2xl font-bold text-primary-600 mb-1">
                  {service.price}
                </p>
                <p className="text-gray-600 text-sm">
                  {service.duration}
                </p>
              </div>
            ))}
          </div>

          <div className="text-center">
            <Link
              to="/services"
              className="btn btn-primary btn-lg"
            >
              View All Services
            </Link>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 bg-primary-600">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
            Ready to Look Your Best?
          </h2>
          <p className="text-xl text-primary-100 mb-8 max-w-2xl mx-auto">
            Book your appointment today and experience the difference of professional grooming
          </p>
          <div className="space-x-4">
            <Link
              to="/booking"
              className="btn btn-lg bg-white text-primary-600 hover:bg-gray-100"
            >
              Book Now
            </Link>
            <Link
              to="/register"
              className="btn btn-outline btn-lg border-white text-white hover:bg-white hover:text-primary-600"
            >
              Create Account
            </Link>
          </div>
        </div>
      </section>
    </div>
  )
}

export default HomePage