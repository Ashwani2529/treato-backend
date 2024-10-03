

const checkForValidServiceAndStylist


= async (services) => {

    // Convert service IDs to ObjectIDs
    const servicesIdsArray = services.map(
        (service) => new mongoose.Types.ObjectId(service)
    );

    // search services
    const serviceData = await serviceModel.find({
        _id: { $in: servicesIdsArray },
    });
   
}

const getTenure=(createdDate)=>{
    const currentDate = new Date(); // Current date and time
    // Calculate the difference in years and months
    let diffYears = currentDate.getFullYear() - createdDate.getFullYear();
    let diffMonths = currentDate.getMonth() - createdDate.getMonth();
    
    // Adjust the difference if necessary (in case the current month is before the created month)
    if (diffMonths < 0) {
        diffYears--;
        diffMonths += 12;
    }
    
    // Format the tenure
    let tenure = '';
    if (diffYears > 0) {
        tenure += `${diffYears}y `;
    }
    if (diffMonths > 0 || diffYears === 0) {
        tenure += `${diffMonths}m`;
    }
    return tenure;
        }    

module.exports = {
    checkForValidServiceAndStylist,getTenure
}

