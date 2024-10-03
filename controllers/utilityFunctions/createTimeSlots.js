const createTimeSlots = (slotInterval, workingHours, selectedDate) => {
  try {
    // Parse the selected date
    const parsedSelectedDate = new Date(selectedDate);

    // Get the day of the week for the selected date
    const dayOfWeek = parsedSelectedDate.getDay();

    // Convert the numeric day of the week to a string
    const daysOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const selectedDay = daysOfWeek[dayOfWeek];

    // Find the working hours for the selected day
    const dayWorkingHours = workingHours.find(hour => hour.day === selectedDay);

    if (!dayWorkingHours) {
      return [];
    }

    // Extract opening and closing times
    const openingTime = new Date(`${selectedDate} ${dayWorkingHours.opening_time}`);
    const closingTime = new Date(`${selectedDate} ${dayWorkingHours.closing_time}`);

    // Initialize the current time to the opening time
    let currentTime = openingTime > parsedSelectedDate ? openingTime : new Date(parsedSelectedDate);

    // Round the currentTime up to the nearest slot interval
    currentTime = new Date(Math.ceil(currentTime.getTime() / (slotInterval * 60 * 1000)) * (slotInterval * 60 * 1000));

    const timeSlots = [];

    // Loop through and create slots until the end time
    while (currentTime < closingTime) {
      // Add the start time of each slot to the timeSlots array
      timeSlots.push(currentTime.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }));

      // Move to the next time slot
      currentTime = new Date(currentTime.getTime() + slotInterval * 60 * 1000);
    }

    return timeSlots;
  } catch (error) {
    return [];
  }
};

const generateSlots = (slotInterval, workingHours) => {
  try {
    const daysOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const slotsByWeekDay = [];

    // Iterate over each day of the week
    daysOfWeek.forEach(day => {
      // Find the working hours for the current day
      const dayWorkingHours = workingHours.find(hour => hour.day === day);

      if (!dayWorkingHours) {
        slotsByWeekDay.push({ day, slots: [] }); // Push an empty array if no working hours found
        return; // Move to the next day
      }

      // Extract opening and closing times for the current day
      const openingTime = new Date(`2000-01-01 ${dayWorkingHours.opening_time}`);
      const closingTime = new Date(`2000-01-01 ${dayWorkingHours.closing_time}`);

      // Initialize the current time to the opening time
      let currentTime = new Date(openingTime);

      // Round the currentTime up to the nearest slot interval
      currentTime = new Date(Math.ceil(currentTime.getTime() / (slotInterval * 60 * 1000)) * (slotInterval * 60 * 1000));

      let timeSlots = [];

      // Loop through and create slots until the end time
      while (currentTime < closingTime) {
        // Add the start time of each slot to the timeSlots array
        timeSlots.push(currentTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }));

        // Move to the next time slot
        currentTime = new Date(currentTime.getTime() + slotInterval * 60 * 1000);
      }
      timeSlots=convertTo24HourFormat(timeSlots)
      timeSlots.sort();

      // Push the slots for the current day to the slotsByWeekDay array
      slotsByWeekDay.push({ day, slots: timeSlots });
    });

   return slotsByWeekDay;
  } catch (error) {
    return [];
  }
};

// Function to convert time string to minutes
const timeStringToMinutes=(timeString)=> {
  let totalMinutes = 0;
  const parts = timeString.split(' ');

  for (let i = 0; i < parts.length; i += 2) {
      const value = parseInt(parts[i], 10);
      const unit = parts[i + 1];

      if (unit.includes('hr')) {
          totalMinutes += value * 60;
      } else if (unit.includes('min')) {
          totalMinutes += value;
      }
  }

  return totalMinutes;
}

const convertTo24HourFormat=(timeSlots12hr)=>{
  return timeSlots12hr.map(time => {
    const [hours, minutes, meridiem] = time.split(/:| /);
    let convertedHours = parseInt(hours, 10);
    
    if (meridiem === 'PM' && convertedHours !== 12) {
      convertedHours += 12;
    } else if (meridiem === 'AM' && convertedHours === 12) {
      convertedHours = 0;
    }
    
    return `${convertedHours.toString().padStart(2, '0')}:${minutes}`;
  });
}
module.exports = {
  createTimeSlots,timeStringToMinutes,
  convertTo24HourFormat,
  generateSlots
}