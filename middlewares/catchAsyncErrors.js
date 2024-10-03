
module.exports = function (err, req, res, next) {
    if (err.name === 'UnauthorizedError') {
        res.status(401).json({ "success": false, "error": err.name + ": " + err.message });
    } else {
        let status = err.statusCode || 500;
        let message = err.message || "Internal Server error";
        let name = err.name || "Server error";
        res.status(status).json({ "success": false, "error": name + ": " + message });
    }
};