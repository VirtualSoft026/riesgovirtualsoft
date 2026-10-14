'use strict';
/**
 * Bloqueo de red para la suite de pruebas del laboratorio (se precarga con `node --require`).
 *
 * Las pruebas unitarias y e2e de fase_2 usan bases, DOM y fetch simulados: ninguna debe tocar la red.
 * Si una prueba intenta conectarse (Firebase real, MicroStrategy, un CDN...) falla con ERIESGO_RED en vez
 * de filtrar datos o depender de un servicio externo. Es el mismo principio de
 * .github/qa-infra/network_guard.cjs, sin modificar ese archivo.
 */
const net = require('node:net');
const tls = require('node:tls');
const http = require('node:http');
const https = require('node:https');
const dns = require('node:dns');

function bloquear(origen) {
    const error = new Error(`[BLOQUEO-RED] ${origen}: las pruebas del laboratorio no deben usar la red.`);
    error.code = 'ERIESGO_RED';
    throw error;
}

net.Socket.prototype.connect = function () { bloquear('net.Socket.connect'); };
net.connect = function () { bloquear('net.connect'); };
net.createConnection = function () { bloquear('net.createConnection'); };
tls.connect = function () { bloquear('tls.connect'); };
http.request = function () { bloquear('http.request'); };
http.get = function () { bloquear('http.get'); };
https.request = function () { bloquear('https.request'); };
https.get = function () { bloquear('https.get'); };
dns.lookup = function () { bloquear('dns.lookup'); };
dns.resolve = function () { bloquear('dns.resolve'); };

if (typeof globalThis.fetch === 'function') {
    globalThis.fetch = async function () { bloquear('fetch'); };
}
if (typeof globalThis.WebSocket === 'function') {
    globalThis.WebSocket = function () { bloquear('WebSocket'); };
}
