const express = require("express");

const app = express();
const PORT = 8080;

app.get('/', (req, res) => {
    res.send('Server prendido');
})

app.listen(PORT, () => {
    console.log(`Servidor corriendo en: http://130.10.1.13:${PORT}/`)
})