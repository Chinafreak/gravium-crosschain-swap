'use strict'

const Client = require('gravium-core')

/* SETTINGS */

const gravium1Receiving = 'gravium-wallet-address'
const gravium1RcpUser = '*'
const gravium1RcpPass = '*'
const rcpPort = 9998

const gravium2RcpUser = '*'
const gravium2RcpPass = '*'
const gravium2IPAddress = '192.168.1.2'
/* INIT */

const localGravium1Client = new Client({
    username: gravium1RcpUser,
    password: gravium1RcpPass,
    port: rcpPort,
})

const remoteGravium2Client = new Client({
    username: gravium2RcpUser,
    password: gravium2RcpPass,
    port: rcpPort,
    host: gravium2IPAddress,
})

remoteGravium2Client.getInfo().then((info) => console.log('remoteGravium2Client', info))

localGravium1Client.getInfo().then((info) => getUnspent(info))

const getUnspent = (info) => {
    console.log('localGravium1Client', info)
    localGravium1Client.listUnspent().then((unspent) => filterUnspent(unspent))
}

const filterUnspent = (unspent) => {
    // console.log('listUnspent', unspent)
    let hasPending = false

    for (const pending of unspent) {
        if (pending.address === gravium1Receiving) {
            hasPending = true
            processTransaction(pending)
        }
    }

    if (!hasPending) console.log('nothing to process')
}

const processTransaction = (pending) => {
    console.log('processTransaction', pending)
}