const express = require('express')
const app = express()
const { ExplainVerbosity } = require('mongodb');
const { DataBaseConnection } = require('./config/DataBaseConnection.js');

// Database connection
DataBaseConnection();

app.listen(process.env.PORT || 8000, () => {
    console.log(`Server is working on port ${process.env.PORT || 8000}`);
});
