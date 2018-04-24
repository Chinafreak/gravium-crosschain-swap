const express = require('express')
const gravium = require('gravium')
const app = express()

app.get('/', function (req, res) {
  res.send('Hello Gravium Community')

  const client = new gravium.Client({
    host: 'localhost',
    port: 9998,
    user: 'username',
    pass: 'password',
    timeout: 30000,
  })

  client.getBalance('*', 6, function(err, balance, resHeaders) {
    if (err) return console.log(err)
    console.log('Balance:', balance)
  })
})

app.listen(3000, function () {
  console.log('Example app listening on port 3000!')
})
