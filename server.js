const express = require('express');
const path = require('path');

const app = express();


app.use(express.static(path.resolve(__dirname + '/public')));

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => console.log('listening on port', PORT));