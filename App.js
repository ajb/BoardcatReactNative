const BOARDCAT_SERVICE_ID = '19b10000-e8f2-537e-4f6c-d104768a1214'
const BOARDCAT_CHARACTERISTIC_ID = '19b10001-e8f2-537e-4f6c-d104768a1214'

import React, { useRef, useState } from 'react';
import {
  View,
  Text,
} from 'react-native';
import { WebView } from 'react-native-webview';
import { BleManager } from 'react-native-ble-plx';
import { encode } from 'base-64';

const manager = new BleManager()

function pad(n, width, z) {
  z = z || '0';
  n = n + '';
  return n.length >= width ? n : new Array(width - n.length + 1).join(z) + n;
}

export default function App() {
  const webviewRef = useRef()
  const [connected, setConnected] = useState(false)
  const [connectedDevice, setConnectedDevice] = useState(null)

  function stopScanning() {
    manager.stopDeviceScan()
  }

  function connect() {
    if (connected) return;
    callWebviewCallback('onConnecting')
    setTimeout(() => {
      callWebviewCallback('onErrorConnecting')
      stopScanning()
    }, 5000)

    manager.startDeviceScan(null, null, (error, device) => {
      if (error) {
        console.log('Error: ', error);
        return
      }

      if (device.name === 'BoardCat LED') {
        stopScanning()

        device.connect().then((device) => {
          return device.discoverAllServicesAndCharacteristics()
        }).then((device) => {
          setConnected(true)
          setConnectedDevice(device)
          callWebviewCallback('onConnected')

          device.onDisconnected(() => {
            callWebviewCallback('onDisconnected')
            setConnected(false)
            setConnectedDevice(null)
          })
        }).catch((error) => {
          callWebviewCallback('onErrorConnecting')
          console.log('Error: ', error.message)
        })
       }
    });
  }

  function disconnect() {
    if (!connectedDevice) return;
    connectedDevice.cancelConnection()
    setConnected(false)
    setConnectedDevice(null)
    callWebviewCallback('onDisconnected')
  }

  function write(str) {
    if (!connectedDevice) return;
    connectedDevice.writeCharacteristicWithResponseForService(
      BOARDCAT_SERVICE_ID,
      BOARDCAT_CHARACTERISTIC_ID,
      encode(str)
    )
  }

  function callWebviewCallback(cbName) {
    webviewRef.current.injectJavaScript("window.ReactNativeBTCallbacks && window.ReactNativeBTCallbacks['" + cbName + "']()")
  }

  function handleMessage(message) {
    let parsedMessage = JSON.parse(message)

    switch(parsedMessage.type) {
      case 'connect':
      connect()
      break

      case 'disconnect':
      disconnect()
      break

      case 'write':
      write(parsedMessage.payload)
      break

      return
    }
  }

  return (
    <WebView
      ref={webviewRef}
      source={{ uri: 'https://app.boardc.at' }}
      onMessage={(e) => handleMessage(e.nativeEvent.data)}
    />
  )
}
