const express = require("express");

const app = express();
const PORT = 8080;


const productList = [ {
        'id': 1,
        'nombre': 'Botella de Agua',
        'stock': 100
    }, 
    {
        'id': 2,
        'nombre': 'Botella de Coca',
        'stock': 50
    },
]

// VISTAS
app.get('/', (req, res) => {
    res.send(`Home \n
        <a href="/products"> Products </a> \n
        <a href="/cart"> Cart </a> \n
        <a href="/login"> Login </a> \n
        `)
})

app.get('/products', (req, res) => {
    res.json(productList)
})

app.delete('/products', (req, res) => {
    productList.pop()
    res.send(`Products\n
    ${productList}`)
})


app.get('/cart', (req, res) => {
    res.send('Cart')
})

app.get('/login', (req, res) => {
    res.send('Log   in')
})

// HOST
app.listen(PORT, () => {
    console.log(`Servidor corriendo en: http://localhost:${PORT}/`)
})



