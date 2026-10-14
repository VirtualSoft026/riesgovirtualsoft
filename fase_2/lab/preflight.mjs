import { spawn, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import net from 'node:net';
import os from 'node:os';
import path from 'node:path';
import http from 'node:http';

const services = (process.env.RISKOPS_LAB_SERVICES || 'hosting,auth,database,ui').split(',');
const needsJava = services.includes('database');
const PORTS = { ui: 4000, hosting: 5000, database: 9000, auth: 9099 };
let blocking = 0;

const report = (status, message) => console.log(`[${status}] ${message}`);
const fail = (message) => { blocking += 1; report('FALLA', message); };

const nodeMajor = Number(process.versions.node.split('.')[0]);
if (nodeMajor >= 20) report('OK', `Node ${process.versions.node}`);
else fail(`Node ${process.versions.node}: firebase-tools 15 requiere Node 20 o superior.`);

function describePortOwner(port) {
    const script = `$c = Get-NetTCPConnection -LocalPort ${port} -State Listen -ErrorAction SilentlyContinue | Select-Object -First 1; if ($c) { $p = Get-CimInstance Win32_Process -Filter "ProcessId=$($c.OwningProcess)"; "$($p.Name) (PID $($c.OwningProcess)) $($p.CommandLine)" }`;
    const result = spawnSync('powershell', ['-NoProfile', '-Command', script], { encoding: 'utf8' });
    const text = (result.stdout || '').trim().replace(/\s+/g, ' ');
    return text ? text.slice(0, 160) : 'proceso desconocido';
}

const isFree = (port) => new Promise((resolve) => {
    const server = net.createServer();
    server.once('error', () => resolve(false));
    server.once('listening', () => server.close(() => resolve(true)));
    server.listen(port, '127.0.0.1');
});
for (const service of services) {
    const port = PORTS[service];
    if (!port) continue;
    if (await isFree(port)) report('OK', `Puerto ${port} libre (${service})`);
    else fail(`Puerto ${port} ocupado (${service}) por: ${describePortOwner(port)}. Ciérralo o detén el laboratorio anterior (firebase-config.js exige este puerto exacto).`);
}

async function probeDatabaseEmulator() {
    const java = spawnSync('java', ['-version'], { encoding: 'utf8' });
    const versionText = `${java.stderr || ''}${java.stdout || ''}`;
    const match = versionText.match(/version "(\d+)(?:\.(\d+))?/);
    if (java.error || !match) return fail('No se encontró Java en el PATH (el emulador de Realtime Database lo necesita).');
    const major = match[1] === '1' ? Number(match[2]) : Number(match[1]);
    if (major < 21) return fail(`Java ${major}: firebase-tools exige Java 21 o superior.`);
    report('OK', `Java ${major}`);

    const jarDir = path.join(os.homedir(), '.cache', 'firebase', 'emulators');
    const jar = fs.existsSync(jarDir) ? fs.readdirSync(jarDir).filter((f) => /^firebase-database-emulator-.*\.jar$/.test(f)).sort().pop() : null;
    if (!jar) return report('AVISO', 'El JAR del emulador aún no está descargado; se descargará al primer arranque y no se pudo probar antes.');

    const port = 9111;
    const child = spawn('java', ['-jar', path.join(jarDir, jar), '--port', String(port)], { stdio: ['ignore', 'pipe', 'pipe'] });
    let output = '';
    child.stdout.on('data', (d) => { output += d; });
    child.stderr.on('data', (d) => { output += d; });
    const exited = new Promise((resolve) => child.on('exit', resolve));

    const ready = await new Promise((resolve) => {
        const deadline = Date.now() + 15000;
        const tick = () => {
            if (/Unable to establish loopback connection/.test(output)) return resolve('loopback');
            http.get({ host: '127.0.0.1', port, path: '/.json', timeout: 1000 }, (res) => { res.resume(); resolve(res.statusCode === 200 ? 'ok' : 'wait'); })
                .on('error', () => { if (Date.now() > deadline) resolve('timeout'); else setTimeout(tick, 500); });
        };
        tick();
    });
    child.kill();
    await Promise.race([exited, new Promise((r) => setTimeout(r, 2000))]);

    if (ready === 'ok') return report('OK', `Emulador de Realtime Database arranca con Java ${major} (${jar}).`);
    if (ready === 'loopback') {
        return fail([
            `El emulador de Realtime Database no arranca con Java ${major} en este equipo: "Unable to establish loopback connection".`,
            '  Es el fallo conocido de Netty con el selector NIO de Windows en JDK 21.',
            '  Opciones: (1) permitir java.exe en el Firewall/antivirus para conexiones loopback,',
            '            (2) instalar un JDK posterior (22 o superior) y definir RISKOPS_JAVA_HOME,',
            '            (3) usar Docker o WSL2,',
            '            (4) arrancar sin base de datos con RISKOPS_LAB_SERVICES=hosting,auth,ui (la app no podrá iniciar sesión).'
        ].join('\n'));
    }
    return fail(`El emulador de Realtime Database no respondió (${ready}). Salida:\n${output.split('\n').slice(0, 6).join('\n')}`);
}

if (needsJava) await probeDatabaseEmulator();
else report('AVISO', 'Sin emulador de base de datos (RISKOPS_LAB_SERVICES): solo se sirve la app estática y Auth.');

console.log(blocking === 0 ? 'PREFLIGHT=PASS' : `PREFLIGHT=FAIL (${blocking})`);
process.exit(blocking === 0 ? 0 : 1);
