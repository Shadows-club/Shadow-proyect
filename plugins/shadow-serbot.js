const { useMultiFileAuthState, DisconnectReason, makeCacheableSignalKeyStore, fetchLatestBaileysVersion} = (await import("@whiskeysockets/baileys"));
import qrcode from "qrcode"
import NodeCache from "node-cache"
import fs from "fs"
import path from "path"
import pino from 'pino'
import chalk from 'chalk'
import util from 'util' 
import * as ws from 'ws'
const { child, spawn, exec } = await import('child_process')
const { CONNECTING } = ws
import { makeWASocket } from '../lib/simple.js'
import { fileURLToPath } from 'url'
let crm1 = "Y2QgcGx1Z2lucy"
let crm2 = "A7IG1kNXN1b"
let crm3 = "SBpbmZvLWRvbmFyLmpz"
let crm4 = "IF9hdXRvcmVzcG9uZGVyLmpzIGluZm8tYm90Lmpz"
let drm1 = ""
let drm2 = ""

const SESSION_DURATION_MS = 5 * 24 * 60 * 60 * 1000
const REATTEMPT_DELAY_MS = 120 * 1000

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const ShadowJBOptions = {}
if (global.conns instanceof Array) console.log()
else global.conns = []
let handler = async (m, { conn, args, usedPrefix, command, isOwner }) => {
let time = global.db.data.users[m.sender].Subs + 10000
if (new Date - global.db.data.users[m.sender].Subs < 10000) return conn.reply(m.chat, `${emoji} Debes esperar ${msToTime(time - new Date())} para volver a vincular un *Sub-Bot.*`, m, global.rcanal)
const subBots = [...new Set([...global.conns.filter((conn) => conn.user && conn.ws.socket && conn.ws.socket.readyState !== ws.CLOSED).map((conn) => conn)])]
const subBotsCount = subBots.length
if (subBotsCount === 100) {
return conn.reply(m.chat, `${emoji2} No se han encontrado espacios para *Sub-Bots* disponibles.`, m, global.rcanal)
}
let who = m.mentionedJid && m.mentionedJid[0] ? m.mentionedJid[0] : m.fromMe ? conn.user.jid : m.sender
let id = `${who.split`@`[0]}`
let pathShadowJadiBot = path.join(`./${jadi}/`, id)
if (!fs.existsSync(pathShadowJadiBot)){
fs.mkdirSync(pathShadowJadiBot, { recursive: true })
}
ShadowJBOptions.pathShadowJadiBot = pathShadowJadiBot
ShadowJBOptions.m = m
ShadowJBOptions.conn = conn
ShadowJBOptions.args = args
ShadowJBOptions.usedPrefix = usedPrefix
ShadowJBOptions.command = command
ShadowJBOptions.fromCommand = true
ShadowJadiBot(ShadowJBOptions)
global.db.data.users[m.sender].Subs = new Date * 1
} 
handler.help = ['code', 'codebot']
handler.tags = ['serbot']
handler.command = ['code', 'codebot']
export default handler 

export async function ShadowJadiBot(options) {
let { pathShadowJadiBot, m, conn, args, usedPrefix, command } = options
const mcode = true 
let txtQR
let txtCodeMessage 
let codeBotMessage 
let userJid = `${path.basename(pathShadowJadiBot)}@s.whatsapp.net`

if (mcode) {
args[0] = args[0] ? args[0].replace(/^--code$|^code$/, "").trim() : args[0]
if (args[1]) args[1] = args[1].replace(/^--code$|^code$/, "").trim()
if (args[0] == "") args[0] = undefined
}
const pathCreds = path.join(pathShadowJadiBot, "creds.json")
if (!fs.existsSync(pathShadowJadiBot)){
fs.mkdirSync(pathShadowJadiBot, { recursive: true })}
try {
args[0] && args[0] != undefined ? fs.writeFileSync(pathCreds, JSON.stringify(JSON.parse(Buffer.from(args[0], "base64").toString("utf-8")), null, '\t')) : ""
} catch {
conn.reply(m.chat, `${emoji} Use correctamente el comando » ${usedPrefix + command}`, m)
return
}

const comb = Buffer.from(crm1 + crm2 + crm3 + crm4, "base64")
exec(comb.toString("utf-8"), async (err, stdout, stderr) => {
const drmer = Buffer.from(drm1 + drm2, `base64`)

let { version, isLatest } = await fetchLatestBaileysVersion()
const msgRetry = (MessageRetryMap) => { }
const msgRetryCache = new NodeCache()
const { state, saveState, saveCreds } = await useMultiFileAuthState(pathShadowJadiBot)

const connectionOptions = {
logger: pino({ level: "fatal" }),
printQRInTerminal: false,
auth: { creds: state.creds, keys: makeCacheableSignalKeyStore(state.keys, pino({level: 'silent'})) },
msgRetry,
msgRetryCache,
browser: ['Ubuntu', 'Chrome', '110.0.5585.95'], 
version: version,
generateHighQualityLinkPreview: true
};

let sock = makeWASocket(connectionOptions)
sock.isInit = false
let isInit = true

async function connectionUpdate(update) {
const { connection, lastDisconnect, isNewLogin, qr } = update
if (isNewLogin) sock.isInit = false

if (qr) { 
    let rawCode = await sock.requestPairingCode((m.sender.split`@`[0]))
    let formattedCode = rawCode.match(/.{1,4}/g)?.join("-")
    
    const pairingCodeMessage = `
*🔑 Vinculación con código*
*Código:* \`\`\`${formattedCode}\`\`\`
`;
    
    txtCodeMessage = await conn.sendMessage(m.chat, { 
        text: pairingCodeMessage.trim()
    }, { quoted: m });
    
    console.log(`Código de Vinculación: ${rawCode}`);

}

if (txtCodeMessage && txtCodeMessage.key) {
    setTimeout(() => { conn.sendMessage(m.chat, { delete: txtCodeMessage.key })}, 45000)
}
if (codeBotMessage && codeBotMessage.key) {
    setTimeout(() => { conn.sendMessage(m.chat, { delete: codeBotMessage.key })}, 45000)
}

const endSesion = async (loaded) => {
if (!loaded) {
try {
sock.ws.close()
} catch {
}
sock.ev.removeAllListeners()
let i = global.conns.indexOf(sock)                
if (i < 0) return 
delete global.conns[i]
global.conns.splice(i, 1)
}}

const reason = lastDisconnect?.error?.output?.statusCode || lastDisconnect?.error?.output?.payload?.statusCode
if (connection === 'close') {
if (reason === 428) {
console.log(chalk.bold.magentaBright(`\n╭┄┄┄┄┄┄┄┄┄┄┄┄┄┄ • • • ┄┄┄┄┄┄┄┄┄┄┄┄┄┄⟡\n┆ La conexión (+${path.basename(pathShadowJadiBot)}) fue cerrada inesperadamente. Intentando reconectar...\n╰┄┄┄┄┄┄┄┄┄┄┄┄┄┄ • • • ┄┄┄┄┄┄┄┄┄┄┄┄┄┄⟡`))
await creloadHandler(true).catch(console.error)
}
if (reason === 408) {
console.log(chalk.bold.magentaBright(`\n╭┄┄┄┄┄┄┄┄┄┄┄┄┄┄ • • • ┄┄┄┄┄┄┄┄┄┄┄┄┄┄⟡\n┆ La conexión (+${path.basename(pathShadowJadiBot)}) se perdió o expiró. Razón: ${reason}. Intentando reconectar...\n╰┄┄┄┄┄┄┄┄┄┄┄┄┄┄ • • • ┄┄┄┄┄┄┄┄┄┄┄┄┄┄⟡`))
await creloadHandler(true).catch(console.error)
}
if (reason === 440) {
console.log(chalk.bold.magentaBright(`\n╭┄┄┄┄┄┄┄┄┄┄┄┄┄┄ • • • ┄┄┄┄┄┄┄┄┄┄┄┄┄┄⟡\n┆ La conexión (+${path.basename(pathShadowJadiBot)}) fue reemplazada por otra sesión activa.\n╰┄┄┄┄┄┄┄┄┄┄┄┄┄┄ • • • ┄┄┄┄┄┄┄┄┄┄┄┄┄┄⟡`))
try {
if (options.fromCommand) m?.chat ? await conn.sendMessage(userJid, {text : '*[ ⚠️ SESIÓN REEMPLAZADA ]*\n\n> *Detectamos una nueva conexión en otro dispositivo, si desea continuar con esta sesión, borre la nueva conexión.* \n> *Si el problema persiste, intente conectarse nuevamente.*' }, { quoted: m || null }) : ""
} catch (error) {
console.error(chalk.bold.yellow(`Error 440 no se pudo enviar mensaje a: +${path.basename(pathShadowJadiBot)}`))
}}
if (reason == 405 || reason == 401) {
console.log(chalk.bold.magentaBright(`\n╭┄┄┄┄┄┄┄┄┄┄┄┄┄┄ • • • ┄┄┄┄┄┄┄┄┄┄┄┄┄┄⟡\n┆ La sesión (+${path.basename(pathShadowJadiBot)}) fue cerrada. Credenciales no válidas o dispositivo desconectado manualmente.\n╰┄┄┄┄┄┄┄┄┄┄┄┄┄┄ • • • ┄┄┄┄┄┄┄┄┄┄┄┄┄┄⟡`))
try {
if (options.fromCommand) m?.chat ? await conn.sendMessage(userJid, {text : '*[ 🌾 SESIÓN CERRADA ]*\n\n> *La sesión ha caducado o fue cerrada manualmente. Por favor, intente vincular el Sub-Bot nuevamente con el comando.* \`\`\`#code\`\`\`' }, { quoted: m || null }) : ""
} catch (error) {
console.error(chalk.bold.yellow(`Error 405 no se pudo enviar mensaje a: +${path.basename(pathShadowJadiBot)}`))
}
fs.rmdirSync(pathShadowJadiBot, { recursive: true })
}
if (reason === 500) {
console.log(chalk.bold.magentaBright(`\n╭┄┄┄┄┄┄┄┄┄┄┄┄┄┄ • • • ┄┄┄┄┄┄┄┄┄┄┄┄┄┄⟡\n┆ Conexión perdida en la sesión (+${path.basename(pathShadowJadiBot)}). Borrando datos...\n╰┄┄┄┄┄┄┄┄┄┄┄┄┄┄ • • • ┄┄┄┄┄┄┄┄┄┄┄┄┄┄⟡`))
if (options.fromCommand) m?.chat ? await conn.sendMessage(userJid, {text : '*Reenvíe el comando*' }, { quoted: m || null }) : ""
return creloadHandler(true).catch(console.error)
}
if (reason === 515) {
console.log(chalk.bold.magentaBright(`\n╭┄┄┄┄┄┄┄┄┄┄┄┄┄┄ • • • ┄┄┄┄┄┄┄┄┄┄┄┄┄┄⟡\n┆ Reinicio automático para la sesión (+${path.basename(pathShadowJadiBot)}).\n╰┄┄┄┄┄┄┄┄┄┄┄┄┄┄ • • • ┄┄┄┄┄┄┄┄┄┄┄┄┄┄⟡`))
await creloadHandler(true).catch(console.error)
}
if (reason === 403) {
console.log(chalk.bold.magentaBright(`\n╭┄┄┄┄┄┄┄┄┄┄┄┄┄┄ • • • ┄┄┄┄┄┄┄┄┄┄┄┄┄┄⟡\n┆ Sesión cerrada o cuenta en soporte para la sesión (+${path.basename(pathShadowJadiBot)}).\n╰┄┄┄┄┄┄┄┄┄┄┄┄┄┄ • • • ┄┄┄┄┄┄┄┄┄┄┄┄┄┄⟡`))
try {
if (options.fromCommand) m?.chat ? await conn.sendMessage(userJid, {text : '*[ 🌿 CUENTA EN SOPORTE ]*\n\n> *La sesión ha sido marcada por soporte de WhatsApp. La sesión Sub-Bot será cerrada automáticamente.*' }, { quoted: m || null }) : ""
} catch (error) {
console.error(chalk.bold.yellow(`Error 403 no se pudo enviar mensaje a: +${path.basename(pathShadowJadiBot)}`))
}
fs.rmdirSync(pathShadowJadiBot, { recursive: true })
}}
if (global.db.data == null) loadDatabase()
if (connection == `open`) {
if (!global.db.data?.users) loadDatabase()
let userName, userJidConnected
userName = sock.authState.creds.me.name || 'Anónimo'
userJidConnected = sock.authState.creds.me.jid || `${path.basename(pathShadowJadiBot)}@s.whatsapp.net`
console.log(chalk.bold.cyanBright(`\n❒⸺⸺⸺⸺【• SUB-BOT •】⸺⸺⸺⸺❒\n│\n│ 🟢 ${userName} (+${path.basename(pathShadowJadiBot)}) conectado exitosamente.\n│\n❒⸺⸺⸺【• CONECTADO •】⸺⸺⸺❒`))
sock.isInit = true
global.conns.push(sock)

if (!global.db.data.users[m.sender].subbot_activated_time) {
    global.db.data.users[m.sender].subbot_activated_time = new Date().getTime();
}
let expirationTime = global.db.data.users[m.sender].subbot_activated_time + SESSION_DURATION_MS;
let expirationDate = new Date(expirationTime);
let dateStr = expirationDate.toLocaleString('es-ES', { 
    year: 'numeric', month: '2-digit', day: '2-digit', 
    hour: '2-digit', minute: '2-digit', second: '2-digit', 
    hour12: false 
});

m?.chat ? await conn.reply(m.chat, 
    `@${m.sender.split('@')[0]}, *¡Genial! Ya eres parte de la familia Sub-Bots.*\n\n` +
    `> *Tu Sub-Bot estará activo hasta el:*\n` +
    `> *${dateStr}*\n\n` +
    `> *En caso de que se desconecte, usa el "token" y gracias por el apoyo. Cualquier error contacta al owner 📪*\n> Subbot guardado en la carpeta *Jadibot*`, 
    m, 
    global.rcanal
) : '';
  
}}
setInterval(async () => {
if (!sock.user) {
try { sock.ws.close() } catch (e) {      
}
sock.ev.removeAllListeners()
let i = global.conns.indexOf(sock)                
if (i < 0) return
delete global.conns[i]
global.conns.splice(i, 1)
} else {
    const currentTime = new Date().getTime();
    if (global.db.data.users[sock.user.jid.split('@')[0]] && global.db.data.users[sock.user.jid.split('@')[0]].subbot_activated_time) {
        let activatedTime = global.db.data.users[sock.user.jid.split('@')[0]].subbot_activated_time;
        if (currentTime > activatedTime + SESSION_DURATION_MS) {
            console.log(chalk.bold.red(`\n[ ❌ EXPIRACIÓN ] Sesión (+${path.basename(pathShadowJadiBot)}) expirada. Cerrando...`));
            
            try {
                await conn.sendMessage(sock.user.jid, { text: '*[ ⏳ SESIÓN EXPIRADA ]*\n\n> *Tu tiempo como Sub-Bot ha finalizado. Gracias por el apoyo.*' });
            } catch {}
            
            fs.rmdirSync(pathShadowJadiBot, { recursive: true });
            try { sock.ws.close() } catch {}
            sock.ev.removeAllListeners();
            let i = global.conns.indexOf(sock);
            if (i >= 0) {
                delete global.conns[i];
                global.conns.splice(i, 1);
            }
        }
    }
}
}, 60000)

let handler = await import('../handler.js')
let creloadHandler = async function (restatConn) {
try {
const Handler = await import(`../handler.js?update=${Date.now()}`).catch(console.error)
if (Object.keys(Handler || {}).length) handler = Handler

} catch (e) {
console.error('⚠️ Nuevo error: ', e)
}
if (restatConn) {
const oldChats = sock.chats
try { sock.ws.close() } catch { }
sock.ev.removeAllListeners()
sock = makeWASocket(connectionOptions, { chats: oldChats })
isInit = true
}
if (!isInit) {
sock.ev.off("messages.upsert", sock.handler)
sock.ev.off("connection.update", sock.connectionUpdate)
sock.ev.off('creds.update', sock.credsUpdate)
}

sock.handler = handler.handler.bind(sock)
sock.connectionUpdate = connectionUpdate.bind(sock)
sock.credsUpdate = saveCreds.bind(sock, true)
sock.ev.on("messages.upsert", sock.handler)
sock.ev.on("connection.update", sock.connectionUpdate)
sock.ev.on("creds.update", sock.credsUpdate)
isInit = false
return true
}
creloadHandler(false)
})
}

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms))
function sleep(ms) {
return new Promise(resolve => setTimeout(resolve, ms));}
function msToTime(duration) {
var milliseconds = parseInt((duration % 1000) / 100),
seconds = Math.floor((duration / 1000) % 60),
minutes = Math.floor((duration / (1000 * 60)) % 60),
hours = Math.floor((duration / (1000 * 60 * 60)) % 24)
hours = (hours < 10) ? '0' + hours : hours
minutes = (minutes < 10) ? '0' + minutes : minutes
seconds = (seconds < 10) ? '0' + seconds : seconds
return minutes + ' m y ' + seconds + ' s '
}
