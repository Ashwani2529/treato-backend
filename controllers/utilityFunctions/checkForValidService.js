

const checkForValidServiceAndStylist = async (services) => {

    // Convert service IDs to ObjectIDs
    const servicesIdsArray = services.map(
        (service) => new mongoose.Types.ObjectId(service)
    );

    // search services
    const serviceData = await serviceModel.find({
        _id: { $in: servicesIdsArray },
    });
   
}

module.exports = {
    checkForValidServiceAndStylist
}

