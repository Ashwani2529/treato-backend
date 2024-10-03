function addServicePrice(servicePrices) {
  // Ensure servicePrices is an array
  if (!Array.isArray(servicePrices)) {
    throw new Error('Input must be an array');
  }

  // Use reduce to sum up the service prices
  const totalPrice = servicePrices.reduce((total, servicePrice) => {
    // Ensure each service has a valid price property

    return total + servicePrice;

  }, 0);
  return {totalPrice };
}
function countServices(serviceIds) {
  // Ensure serviceIds is an array
  if (!Array.isArray(serviceIds)) {
    throw new Error('Input must be an array');
  }

  // Return the total number of services
  const totalService = serviceIds.length;
  return totalService;

}

function parseTimeToMinutes(timeString) {
  // Assuming timeString is in the format "X hr Y min"
  const parts = timeString.split(' ');
  let totalMinutes = 0;

  for (let i = 0; i < parts.length; i += 2) {
    const value = parseInt(parts[i], 10);
    const unit = parts[i + 1].toLowerCase();

    if (unit === 'hr' || unit === 'hrs') {
      totalMinutes += value * 60;
    } else if (unit === 'min' || unit === 'mins') {
      totalMinutes += value;
    }
  }

  return totalMinutes;
}

function addTimeAndPrice(selectedServicesInfo) {
  const servicePrices = selectedServicesInfo.map(service => service.service_price);
  const serviceIds = selectedServicesInfo.map(service => service._id);
  const totalService = countServices(serviceIds);

  const timeArray = selectedServicesInfo.map(service => service.time_takenby_service);
  const totalMinutes = timeArray.reduce((acc, time) => acc + parseTimeToMinutes(time), 0);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  const totalTime = `${hours} hr ${minutes} min`;

  const { totalPrice } = addServicePrice(servicePrices);


  return { totalTime, totalPrice, totalService };
}


module.exports = {
  addTimeAndPrice
}

