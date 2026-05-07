// This file acts as a bridge for cPanel Passenger to find the Next.js standalone server
const path = require('path');
const serverPath = path.join(__dirname, '.next', 'standalone', 'server.js');
require(serverPath);
