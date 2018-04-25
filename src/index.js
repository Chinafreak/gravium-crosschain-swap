'use strict'

const Client = require('gravium-core')
const fs = require('fs')

/* SETTINGS */

const gravium1Receiving = 'gravium-wallet-address'
const gravium1BurnAddress = 'wallet-address'
const gravium1RcpUser = '*'
const gravium1RcpPass = '*'
const rcpPort = 9998

const gravium2RcpUser = '*'
const gravium2RcpPass = '*'
const gravium2IPAddress = '192.168.1.2'
const txFee = 0.001

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

localGravium1Client.getInfo().then((info) => getUnspent(info)).error((err) => {
    writeLog('001', 'failed getInfo', err)
})

const getUnspent = (info) => {
    console.log('localGravium1Client', info)
    localGravium1Client.listUnspent().then((unspent) => filterUnspent(unspent)).error((err) => {
        writeLog('002', 'failed listUnspent', err)
})
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

    localGravium1Client.getTransaction(pending.txid).then((fullTrans) => {
        console.log('gettransaction', fullTrans)
    const gravium2UserAddress = fullTrans['tx-comment']
    validateGravium2Address(gravium2UserAddress, pending, fullTrans)
}).error((err) => {
        writeLog('003', 'failed gettransaction', {
        error: err,
            pending,
    })
})
}

const validateGravium2Address = (gravium2UserAddress, pending, fullTrans) => {
    remoteGravium2Client.validateAddress(gravium2UserAddress).then((addressInfo) => {
        console.log('validateaddress', addressInfo)
    if (addressInfo.isValid) {
        sendGravium2(gravium2UserAddress, pending)
    } else {
        writeLog('005', 'invalid address', {
            gravium2UserAddress,
            pending,
            fullTrans,
        })
        getOrigin(pending)
    }
}).error((err) => {
        writeLog('004', 'failed validateAddress', {
        error: err,
            pending,
            fullTrans,
    })
})
}

const sendGravium2 = (gravium2UserAddress, pending) => {
    console.log('sendGravium2', pending, gravium2UserAddress)

    remoteGravium2Client.sendToAddress(gravium2UserAddress, pending.amount).then((sendOutcome) => {
        console.log('sendOutcome', sendOutcome)
    if (sendOutcome.txid) {
        burnGravium1(pending)
    } else {
        writeLog('007', 'failed to send the transaction', {
            pending,
            gravium2UserAddress,
            sendOutcome,
        })
        getOrigin(pending)
    }
}).error((err) => {
        writeLog('006', 'failed sendToAddress', {
        error: err,
            pending,
            gravium2UserAddress,
    })
})
}

const burnGravium1 = (pending) => {
    console.log('burnGravium1', pending)

    const outgoingTransactions = {}
    outgoingTransactions[gravium1BurnAddress] = pending.amount - txFee

    const spentTransactions = [{
        txid: pending.txid,
        vout: pending.vout,
    }]

    localGravium1Client.createRawTransaction(spentTransactions, outgoingTransactions).then((rawTrans) => {
        signBurnTx(rawTrans, pending)
    }).error((err) => {
        writeLog('008', 'failed createRawTransaction', {
        error: err,
            pending,
            spentTransactions,
            outgoingTransactions,
    })
})
}

const signBurnTx = (rawTrans, pending) => {
    localGravium1Client.signRawTransaction(rawTrans).then((signedRaw) => {
        sendBurnTx(signedRaw, pending)
    }).error((err) => {
        writeLog('009', 'failed signRawTransaction', {
        error: err,
            pending,
            rawTrans,
    })
})
}

const sendBurnTx = (signedRaw, pending) => {
    localGravium1Client.sendRawTransaction(signedRaw.hex).then((rawOutcome) => {
        console.log('burnGravium1 rawOutcome', rawOutcome)
}).error((err) => {
        writeLog('010', 'failed sendRawTransaction', {
        error: err,
            pending,
            signedRaw,
    })
})
}

const getOrigin = (pending) => {
    localGravium1Client.getRawTransaction(pending.txid).then((incomingRaw) => {
        decodeOriginRaw(incomingRaw, pending)
    }).error((err) => {
        writeLog('011', 'failed getRawTransaction', {
        error: err,
            pending,
    })
})
}

const decodeOriginRaw = (incomingRaw, pending) => {
    localGravium1Client.decodeRawTransaction(incomingRaw).then((incomingTrans) => {
        getOriginRaw(incomingTrans, pending)
    }).error((err) => {
        writeLog('012', 'failed decodeRawTransaction', {
        error: err,
            pending,
            incomingRaw,
    })
})
}

const getOriginRaw = (incomingTrans, pending) => {
    localGravium1Client.getRawTransaction(incomingTrans.vin[0].txid).then((inputRaw) => {
        decodeOriginInputRaw(inputRaw, incomingTrans, pending)
    }).error((err) => {
        writeLog('013', 'failed getRawTransaction', {
        error: err,
            pending,
            incomingTrans,
    })
})
}

const decodeOriginInputRaw = (inputRaw, incomingTrans, pending) => {
    localGravium1Client.decodeRawTransaction(inputRaw).then((inputTrans) => {
        const origin = inputTrans.vout[incomingTrans.vin[0].vout].scriptPubKey.addresses[0]
        sendGravium1(origin, pending)
    }).error((err) => {
        writeLog('014', 'failed decodeRawTransaction', {
        error: err,
            pending,
            inputRaw,
    })
})
}

const sendGravium1 = (origin, pending) => {
    console.log('returnGravium1', origin, pending)

    const outgoingTransactions = {}
    outgoingTransactions[origin] = pending.amount - txFee

    const spentTransactions = [{
        txid: pending.txid,
        vout: pending.vout,
    }]

    localGravium1Client.createRawTransaction(spentTransactions, outgoingTransactions).then((rawTrans) => {
        signGravium1Raw(rawTrans, pending)
    }).error((err) => {
        writeLog('015', 'failed createRawTransaction', {
        error: err,
            pending,
            spentTransactions,
            outgoingTransactions,
    })
})
}

const signGravium1Raw = (rawTrans, pending) => {
    localGravium1Client.signRawTransaction(rawTrans).then((signedRaw) => {
        sendGravium1Raw(signedRaw, pending)
    }).error((err) => {
        writeLog('016', 'failed signRawTransaction', {
        error: err,
            pending,
            rawTrans,
    })
})
}

const sendGravium1Raw = (signedRaw, pending) => {
    localGravium1Client.sendRawTransaction(signedRaw.hex).then((rawOutcome) => {
        console.log('returnGravium1 rawOutcome', rawOutcome)
}).error((err) => {
        writeLog('017', 'failed sendRawTransaction', {
        error: err,
            pending,
            signedRaw,
    })
})
}

const writeLog = (errorCode, errorMessage, data) => {
    const date = new Date()
    let logString = '\r\n'
    logString += 'Date: ' + date + '\r\n'
    logString += 'Error Code: ' + errorCode + '\r\n'
    logString += 'Error Message: ' + errorMessage + '\r\n'

    for (const key in data) {
        if (data.hasOwnProperty(key)) {
            let string = data[key]
            if (typeof data[key] === 'object') string = JSON.stringify(data[key])
            logString += key + ': ' + string + '\r\n'
        }
    }
    logString += '\r\n-----------------------------------------------------------\r\n'

    fs.appendFile('log.txt', logString, (err) => {
        if (err) console.log('writeLog err', err)
else console.log('writeLog success')
})
}