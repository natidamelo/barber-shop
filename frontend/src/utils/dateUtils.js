/**
 * Format date and time in Africa/Addis_Ababa timezone
 * @param {string|Date} dateString - ISO date string or Date object
 * @param {object} options - Formatting options
 * @returns {string} Formatted date and time string
 */
export const formatDateInAddisAbaba = (dateString, options = {}) => {
  if (!dateString) return 'N/A'
  
  // Handle Date objects
  let date
  if (dateString instanceof Date) {
    date = dateString
  } else {
    // Parse the date string - ensure it's treated as UTC if it's an ISO string
    date = new Date(dateString)
  }
  
  if (isNaN(date.getTime())) {
    console.error('Invalid date:', dateString)
    return 'Invalid date'
  }
  
  const {
    includeWeekday = false,
    includeTime = true,
    dateStyle = 'long',
    timeStyle = 'short'
  } = options
  
  try {
    // Build date formatter options
    const dateOptions = {
      year: 'numeric',
      month: dateStyle === 'short' ? 'short' : 'long',
      day: 'numeric',
      timeZone: 'Africa/Addis_Ababa'
    }
    
    if (includeWeekday) {
      dateOptions.weekday = 'long'
    }
    
    const dateFormatter = new Intl.DateTimeFormat('en-US', dateOptions)
    
    const timeFormatter = new Intl.DateTimeFormat('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
      timeZone: 'Africa/Addis_Ababa'
    })
    
    const dateStr = dateFormatter.format(date)
    const timeStr = includeTime ? timeFormatter.format(date) : ''
    
    return includeTime ? `${dateStr} ${timeStr}` : dateStr
  } catch (error) {
    console.error('Error formatting date:', error, dateString)
    // Fallback to basic formatting
    try {
      return date.toLocaleString('en-US', { 
        timeZone: 'Africa/Addis_Ababa',
        weekday: includeWeekday ? 'long' : undefined,
        year: 'numeric',
        month: dateStyle === 'short' ? 'short' : 'long',
        day: 'numeric',
        hour: includeTime ? 'numeric' : undefined,
        minute: includeTime ? '2-digit' : undefined,
        hour12: includeTime
      })
    } catch (fallbackError) {
      console.error('Fallback formatting also failed:', fallbackError)
      return 'Invalid date'
    }
  }
}

/**
 * Format date only in Africa/Addis_Ababa timezone
 */
export const formatDateOnly = (dateString) => {
  return formatDateInAddisAbaba(dateString, { includeTime: false, includeWeekday: false, dateStyle: 'short' })
}

/**
 * Format time only in Africa/Addis_Ababa timezone
 */
export const formatTimeOnly = (dateString) => {
  if (!dateString) return 'N/A'
  
  const date = new Date(dateString)
  if (isNaN(date.getTime())) return 'Invalid date'
  
  try {
    const timeFormatter = new Intl.DateTimeFormat('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
      timeZone: 'Africa/Addis_Ababa'
    })
    
    return timeFormatter.format(date)
  } catch (error) {
    console.error('Error formatting time:', error)
    return date.toLocaleTimeString('en-US', { 
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
      timeZone: 'Africa/Addis_Ababa'
    })
  }
}
