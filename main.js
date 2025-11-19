process.env['NODE_TLS_REJECT_UNAUTHORIZED'] = '1'
import './config.js'
import cluster from 'cluster'
import { watchFile, unwatchFile } from 'fs'
import cfonts from 'cfonts'
import { createRequire } from 'module'
import { fileURLToPath, pathToFileURL } from 'url'
import { platform } from 'process'
import * as ws from 'ws'
import fs, { readdirSync, statSync, unlinkSync, existsSync, mkdirSync, readFileSync, rmSync, watch } from 'fs'
import yargs from 'yargs'
import { spawn, execSync } from 'child_process'
import lodash from 'lodash'
import { ItachiJadiBot } from './plugins/jadibot-serbot.js'
import chalk from 'chalk'
import syntaxerror from 'syntax-error'
import { tmpdir } from 'os'
import { format } from 'util'
import boxen from 'boxen'
import P from 'pino'
import pino from 'pino'
import Pino from 'pino'
import path, { join, dirname } from 'path'
import { Boom } from '@hapi/boom'
import { makeWASocket, protoType, serialize } from './lib/simple.js'
import cloudDBAdapter from './lib/cloudDBAdapter.js'
import { Low } from 'lowdb'
import { JSONFile } from 'lowdb/node'
import { mongoDB, mongoDBV2 } from './lib/mongoDB.js'
import store from './lib/store.js'
const { proto } = (await import('@whiskeysockets/baileys')).default
import pkg from 'google-libphonenumber'
const { PhoneNumberUtil } = pkg
const phoneUtil = PhoneNumberUtil.getInstance()
const { DisconnectReason, useMultiFileAuthState, MessageRetryMap, fetchLatestBaileysVersion, makeCacheableSignalKeyStore, jidNormalizedUser, Browsers } = await import('@whiskeysockets/baileys')
import readline, { createInterface } from 'readline'
import NodeCache from 'node-cache'
const { CONNECTING } = ws
const { chain } = lodash
const PORT = process.env.PORT || process.env.SERVER_PORT || 3000
global.atob = global.atob || ((str) => Buffer.from(str, 'base64').toString('utf8'))

protoType()
serialize()

global.__filename = function filename(pathURL = import.meta.url, rmPrefix = platform !== 'win32') {
  return rmPrefix ? /file:\/\/\//.test(pathURL) ? fileURLToPath(pathURL) : pathURL : pathToFileURL(pathURL).toString()
}; global.__dirname = function dirname(pathURL) {
  return path.dirname(global.__filename(pathURL, true))
}; global.__require = function require(dir = import.meta.url) {
  return createRequire(dir)
}

global.timestamp = { start: new Date }
const __dirname = global.__dirname(import.meta.url)
global.opts = new Object(yargs(process.argv.slice(2)).exitProcess(false).parse())
if (global.opts.debugreg === undefined) {
  global.opts.debugreg = process.argv.includes('--debugreg')
}
const opts = global.opts
global.prefix = new RegExp('^[#!./]')

const defaultData = { users: {}, chats: {}, stats: {}, msgs: {}, sticker: {}, settings: {} }
// Usar siempre ruta absoluta para evitar que al ejecutar desde otro cwd se cree otro database.json
import { join as _join } from 'path'
const absoluteDBPath = _join(__dirname, 'src', 'database.json')
const registryBackupPath = _join(__dirname, 'src', 'database.registered.json')
const adapter = /https?:\/\//.test(opts['db'] || '') ? new cloudDBAdapter(opts['db']) : new JSONFile(absoluteDBPath)
global.db = new Low(adapter, defaultData)
global.DATABASE = global.db
global.loadDatabase = async function loadDatabase() {
  if (global.db.READ) {
    return new Promise((resolve) => setInterval(async function () {
      if (!global.db.READ) {
        clearInterval(this)
        resolve(global.db.data == null ? global.loadDatabase() : global.db.data)
      }
    }, 1 * 1000))
  }
  if (global.db.data !== null) return
  global.db.READ = true
  await global.db.read().catch(console.error)
  global.db.READ = null
  global.db.data = { ...defaultData, ...(global.db.data || {}) }
  global.db.chain = chain(global.db.data)
}
loadDatabase()

try {
  if (global.db?.data?.users) {
    let changed = false
    for (const [key, value] of Object.entries(global.db.data.users)) {
      if (/:[0-9A-Za-z]+@s\.whatsapp\.net$/.test(key)) {
        const canonical = key.replace(/:[0-9A-Za-z]+(?=@s\.whatsapp\.net)/, '')
        if (!global.db.data.users[canonical]) {
          global.db.data.users[canonical] = value
        }
        delete global.db.data.users[key]
        changed = true
        continue
      }
      if (/^\d+$/.test(key)) {
        const fullKey = key + '@s.whatsapp.net'
        if (global.db.data.users[fullKey]) {
          delete global.db.data.users[key]
        } else {
          global.db.data.users[fullKey] = value
          delete global.db.data.users[key]
        }
        changed = true
      }
    }
    if (changed) {
      if (global.opts?.debugreg) console.log('[DB][clean] Claves de usuarios normalizadas')
      try { await global.db.write() } catch (e) { console.error('[DB][clean] Error guardando:', e?.message || e) }
    }
  }
} catch (e) { console.error('[DB][clean] Falló normalización:', e?.message || e) }

try {
  if (registryBackupPath && existsSync(registryBackupPath)) {
    const rawBackup = readFileSync(registryBackupPath, 'utf8')
    const backupData = rawBackup ? JSON.parse(rawBackup) : {}
    const users = global.db?.data?.users || {}
    let restored = 0
    for (const [jid, info] of Object.entries(backupData)) {
      if (!jid) continue
      if (!users[jid] || typeof users[jid] !== 'object') {
        users[jid] = {
          exp: 0,
          limit: 10,
          registered: true,
          name: info?.name || '',
          age: info?.age ?? null,
          regTime: typeof info?.regTime === 'number' ? info.regTime : Date.now(),
          afk: -1,
          afkReason: '',
          banned: false,
          useDocument: true,
          bank: 0,
          level: 0,
          coin: info?.coin ?? 0,
          joincount: info?.joincount ?? 0,
          descripcion: info?.descripcion || ''
        }
        restored++
        continue
      }
      const user = users[jid]
      if (!user.registered) {
        user.registered = true
        restored++
      }
      if (typeof info?.regTime === 'number' && info.regTime > 0) {
        if (typeof user.regTime !== 'number' || user.regTime < info.regTime) user.regTime = info.regTime
      } else if (typeof user.regTime !== 'number' || user.regTime <= 0) {
        user.regTime = Date.now()
      }
      if (!user.name && info?.name) user.name = info.name
      if ((user.age == null || user.age === -1 || user.age === '') && info?.age != null) user.age = info.age
      if (user.coin == null) user.coin = info?.coin ?? 0
      if (user.joincount == null) user.joincount = info?.joincount ?? 0
      if (!user.descripcion) user.descripcion = info?.descripcion || ''
    }
    if (restored && global.opts?.debugreg) console.log('[REG][backup] Usuarios restaurados:', restored)
    if (restored) {
      try { await global.db.write() } catch (e) { console.error('[REG][backup] Error guardando tras restaurar:', e?.message || e) }
    }
  }
} catch (e) { console.error('[REG][backup] Falló restauración:', e?.message || e) }

try {
  const users = global.db?.data?.users || {}
  let toggled = 0
  for (const user of Object.values(users)) {
    if (!user) continue
    if (!user.registered && typeof user.regTime === 'number' && user.regTime > 0) {
      user.registered = true
      toggled++
    }
    if (user.registered) {
      if (user.coin == null) user.coin = 0
      if (user.joincount == null) user.joincount = 0
      if (user.descripcion == null) user.descripcion = ''
    }
  }
  if (toggled && global.opts?.debugreg) console.log('[REG][recover][startup] Registros recuperados:', toggled)
  if (toggled) {
    try { await global.db.write() } catch (e) { console.error('[REG][recover][startup] Error guardando:', e?.message || e) }
  }
} catch (e) { console.error('[REG][recover][startup] Falló:', e?.message || e) }

global.__dbSaveQueue = global.__dbSaveQueue || { pending: false, timer: null }
global.scheduleDatabaseSave = function scheduleDatabaseSave(delay = 1200) {
  try {
    if (!global.db || !global.db.data) return
    global.__dbSaveQueue.pending = true
    if (global.__dbSaveQueue.timer) clearTimeout(global.__dbSaveQueue.timer)
    global.__dbSaveQueue.timer = setTimeout(async () => {
      try { await global.db.write() } catch (e) { console.error('[DB][debounceWrite] Error:', e?.message || e) }
      finally { global.__dbSaveQueue.pending = false }
    }, delay)
  } catch (e) { console.error('[DB][scheduleDatabaseSave] Falló:', e?.message || e) }
}

global.saveDatabaseNow = async function saveDatabaseNow(tag = 'manual') {
  try {
    if (global.__dbSaveQueue?.timer) clearTimeout(global.__dbSaveQueue.timer)
    global.__dbSaveQueue.pending = false
    if (global.db && global.db.data) await global.db.write()
    if (global.opts?.debugreg) console.log('[DB][saveNow] flush', tag)
  } catch (e) { console.error('[DB][saveDatabaseNow] Error:', e?.message || e) }
}

;['SIGINT','SIGTERM','beforeExit','exit'].forEach(sig => {
  process.on(sig, async () => {
    try { await global.saveDatabaseNow(sig) } catch (e) {}
  })
})

if (!global.__consoleLogWrapped) {
  const __origLog = console.log
  console.log = (...args) => {
    if (args.length === 1 && (args[0] === null || args[0] === undefined)) return
    const safe = args.map(v => v === null ? '[null]' : v === undefined ? '[undef]' : v)
    __origLog(...safe)
  }
  global.__consoleLogWrapped = true
}

const { state, saveState, saveCreds } = await useMultiFileAuthState(global.sessions)
const msgRetryCounterMap = new Map()
const msgRetryCounterCache = new NodeCache({ stdTTL: 0, checkperiod: 0 })
const userDevicesCache = new NodeCache({ stdTTL: 0, checkperiod: 0 })
const lidCache = new Map()
const { version } = await fetchLatestBaileysVersion()
let phoneNumber = global.botNumber
const methodCodeQR = process.argv.includes("qr")
const methodCode = !!phoneNumber || process.argv.includes("code")
const MethodMobile = process.argv.includes("mobile")
const colors = chalk.bold.white
const qrOption = chalk.yellowBright
const textOption = chalk.yellow
const rl = readline.createInterface({ input: process.stdin, output: process.stdout })
const question = (texto) => new Promise((resolver) => rl.question(texto, resolver))
let opcion
if (methodCodeQR) {
  opcion = '1'
}
if (!methodCodeQR && !methodCode && !fs.existsSync(`./${sessions}/creds.json`)) {
  do {
    opcion = await question(colors("Seleccione una opción:\n") + qrOption("1. Con código QR\n") + textOption("2. Con código de texto de 8 dígitos\n--> "))
    if (!/^[1-2]$/.test(opcion)) {
      console.log(chalk.bold.redBright(`No se permiten numeros que no sean 1 o 2, tampoco letras o símbolos especiales.`))
    }
  } while (opcion !== '1' && opcion !== '2' || fs.existsSync(`./${sessions}/creds.json`))
}

const filterStrings = [
  "Q2xvc2luZyBzdGFsZSBvcGVu",
  "Q2xvc2luZyBvcGVuIHNlc3Npb24=",
  "RmFpbGVkIHRvIGRlY3J5cHQ=",
  "U2Vzc2lvbiBlcnJvcg==",
  "RXJyb3I6IEJhZCBNQUM=",
  "RGVjcnlwdGVkIG1lc3NhZ2U="
]

console.info = () => { }
console.debug = () => { }
;['log', 'warn', 'error'].forEach(methodName => redefineConsoleMethod(methodName, filterStrings))

const connectionOptions = {
  logger: pino({ level: 'silent' }),
  printQRInTerminal: opcion == '1' ? true : methodCodeQR ? true : false,
  mobile: MethodMobile,
  browser: opcion == '1' ? Browsers.macOS("Desktop") : methodCodeQR ? Browsers.macOS("Desktop") : Browsers.macOS("Chrome"),
  auth: {
    creds: state.creds,
    keys: makeCacheableSignalKeyStore(state.keys, Pino({ level: "fatal" }).child({ level: "fatal" })),
  },
  markOnlineOnConnect: false,
  generateHighQualityLinkPreview: true,
  syncFullHistory: false,
  getMessage: async (key) => {
    try {
      let jid = jidNormalizedUser(key.remoteJid)
      let msg = await store.loadMessage(jid, key.id)
      return msg?.message || ""
    } catch (error) {
      return ""
    }
  },
  msgRetryCounterCache: msgRetryCounterCache || new Map(),
  userDevicesCache: userDevicesCache || new Map(),
  defaultQueryTimeoutMs: undefined,
  cachedGroupMetadata: (jid) => globalThis.conn.chats[jid] ?? {},
  version: version,
  keepAliveIntervalMs: 55000,
  maxIdleTimeMs: 60000,
}

global.conn = makeWASocket(connectionOptions)
if (!fs.existsSync(`./${sessions}/creds.json`)) {
  if (opcion === '2' || methodCode) {
    opcion = '2'
    if (!conn.authState.creds.registered) {
      let addNumber
      if (!!phoneNumber) {
        addNumber = phoneNumber.replace(/[^0-9]/g, '')
      } else {
        do {
          phoneNumber = await question(chalk.bgBlack(chalk.bold.greenBright(`[ ✿ ]  Por favor, Ingrese el número de WhatsApp.\n${chalk.bold.magentaBright('---> ')}`)))
          phoneNumber = phoneNumber.replace(/\D/g, '')
          if (!phoneNumber.startsWith('+')) {
            phoneNumber = `+${phoneNumber}`
          }
        } while (!await isValidPhoneNumber(phoneNumber))
        rl.close()
        addNumber = phoneNumber.replace(/\D/g, '')
        setTimeout(async () => {
          let codeBot = await conn.requestPairingCode(addNumber)
          codeBot = codeBot?.match(/.{1,4}/g)?.join("-") || codeBot
          console.log(chalk.bold.white(chalk.bgMagenta(`[ ✿ ]  Código:`)), chalk.bold.white(chalk.white(codeBot)))
        }, 3000)
      }
    }
  }
}
conn.isInit = false
conn.well = false
conn.logger.info(`[ ✿ ]  H E C H O\n`)
if (!opts['test']) {
  if (global.db) setInterval(async () => {
    if (global.db.data) await global.db.write()
    if (opts['autocleartmp'] && (global.support || {}).find) {
      const tmpList = [tmpdir(), 'tmp', `${jadi}`]
      tmpList.forEach((filename) => spawn('find', [filename, '-amin', '3', '-type', 'f', '-delete']))
    }
  }, 30 * 1000)
}

async function resolveLidToRealJid(lidJid, groupJid, maxRetries = 3, retryDelay = 1000) {
  if (!lidJid?.endsWith("@lid") || !groupJid?.endsWith("@g.us")) return lidJid?.includes("@") ? lidJid : `${lidJid}@s.whatsapp.net`
  const cached = lidCache.get(lidJid)
  if (cached) return cached
  const lidToFind = lidJid.split("@")[0]
  let attempts = 0
  while (attempts < maxRetries) {
    try {
      const metadata = await conn.groupMetadata(groupJid)
      if (!metadata?.participants) throw new Error("No se obtuvieron participantes")
      for (const participant of metadata.participants) {
        try {
          if (!participant?.jid) continue
          const contactDetails = await conn.onWhatsApp(participant.jid)
          if (!contactDetails?.[0]?.lid) continue
          const possibleLid = contactDetails[0].lid.split("@")[0]
          if (possibleLid === lidToFind) {
            lidCache.set(lidJid, participant.jid)
            return participant.jid
          }
        } catch (e) {
          continue
        }
      }
      lidCache.set(lidJid, lidJid)
      return lidJid
    } catch (e) {
      attempts++
      if (attempts >= maxRetries) {
        lidCache.set(lidJid, lidJid)
        return lidJid
      }
      await new Promise(resolve => setTimeout(resolve, retryDelay))
    }
  }
  return lidJid
}

async function extractAndProcessLids(text, groupJid) {
  if (!text) return text
  const lidMatches = text.match(/\d+@lid/g) || []
  let processedText = text
  for (const lid of lidMatches) {
    try {
      const realJid = await resolveLidToRealJid(lid, groupJid)
      processedText = processedText.replace(new RegExp(lid, 'g'), realJid)
    } catch (e) { }
  }
  return processedText
}

async function processLidsInMessage(message, groupJid) {
  if (!message || !message.key) return message
  try {
    const messageCopy = {
      key: { ...message.key },
      message: message.message ? { ...message.message } : undefined,
      ...(message.quoted && { quoted: { ...message.quoted } }),
      ...(message.mentionedJid && { mentionedJid: [...message.mentionedJid] })
    }
    const remoteJid = messageCopy.key.remoteJid || groupJid
    if (messageCopy.key?.participant?.endsWith('@lid')) { messageCopy.key.participant = await resolveLidToRealJid(messageCopy.key.participant, remoteJid) }
    if (messageCopy.message?.extendedTextMessage?.contextInfo?.participant?.endsWith('@lid')) { messageCopy.message.extendedTextMessage.contextInfo.participant = await resolveLidToRealJid(messageCopy.message.extendedTextMessage.contextInfo.participant, remoteJid) }
    if (messageCopy.message?.extendedTextMessage?.contextInfo?.mentionedJid) {
      const mentionedJid = messageCopy.message.extendedTextMessage.contextInfo.mentionedJid
      if (Array.isArray(mentionedJid)) {
        for (let i = 0; i < mentionedJid.length; i++) {
          if (mentionedJid[i]?.endsWith('@lid')) {
            mentionedJid[i] = await resolveLidToRealJid(mentionedJid[i], remoteJid)
          }
        }
      }
    }
    if (messageCopy.message?.extendedTextMessage?.contextInfo?.quotedMessage?.extendedTextMessage?.contextInfo?.mentionedJid) {
      const quotedMentionedJid = messageCopy.message.extendedTextMessage.contextInfo.quotedMessage.extendedTextMessage.contextInfo.mentionedJid
      if (Array.isArray(quotedMentionedJid)) {
        for (let i = 0; i < quotedMentionedJid.length; i++) {
          if (quotedMentionedJid[i]?.endsWith('@lid')) {
            quotedMentionedJid[i] = await resolveLidToRealJid(quotedMentionedJid[i], remoteJid)
          }
        }
      }
    }
    if (messageCopy.message?.conversation) { messageCopy.message.conversation = await extractAndProcessLids(messageCopy.message.conversation, remoteJid) }
    if (messageCopy.message?.extendedTextMessage?.text) { messageCopy.message.extendedTextMessage.text = await extractAndProcessLids(messageCopy.message.extendedTextMessage.text, remoteJid) }
    if (messageCopy.message?.extendedTextMessage?.contextInfo?.participant && !messageCopy.quoted) {
      const quotedSender = await resolveLidToRealJid(messageCopy.message.extendedTextMessage.contextInfo.participant, remoteJid)
      messageCopy.quoted = { sender: quotedSender, message: messageCopy.message.extendedTextMessage.contextInfo.quotedMessage }
    }
    return messageCopy
  } catch (e) {
    return message
  }
}

async function connectionUpdate(update) {
  const { connection, lastDisconnect, isNewLogin } = update
  global.stopped = connection
  if (isNewLogin) conn.isInit = true
  const code = lastDisconnect?.error?.output?.statusCode || lastDisconnect?.error?.output?.payload?.statusCode
  if (code && code !== DisconnectReason.loggedOut && conn?.ws.socket == null) {
    await global.reloadHandler(true).catch(console.error)
    global.timestamp.connect = new Date
  }
  if (global.db.data == null) loadDatabase()
  if (update.qr != 0 && update.qr != undefined || methodCodeQR) {
    if (opcion == '1' || methodCodeQR) {
      console.log(chalk.green.bold(`[ ✿ ]  Escanea este código QR`))
    }
  }
  if (connection === "open") {
    const userJid = jidNormalizedUser(conn.user.id)
    const userName = conn.user.name || conn.user.verifiedName || "Desconocido"
    await joinChannels(conn)
    console.log(chalk.green.bold(`[ ✿ ]  Conectado a: ${userName}`))
  }
  let reason = new Boom(lastDisconnect?.error)?.output?.statusCode
  if (connection === 'close') {
    if (reason === DisconnectReason.badSession) {
      console.log(chalk.bold.cyanBright(`\n⚠︎ Sin conexión, borra la session principal del Bot, y conectate nuevamente.`))
    } else if (reason === DisconnectReason.connectionClosed) {
      console.log(chalk.bold.magentaBright(`\n♻ Reconectando la conexión del Bot...`))
      await global.reloadHandler(true).catch(console.error)
    } else if (reason === DisconnectReason.connectionLost) {
      console.log(chalk.bold.blueBright(`\n⚠︎ Conexión perdida con el servidor, reconectando el Bot...`))
      await global.reloadHandler(true).catch(console.error)
    } else if (reason === DisconnectReason.connectionReplaced) {
      console.log(chalk.bold.yellowBright(`\nꕥ La conexión del Bot ha sido reemplazada.`))
    } else if (reason === DisconnectReason.loggedOut) {
      console.log(chalk.bold.redBright(`\n⚠︎ Sin conexión, borra la session principal del Bot, y conectate nuevamente.`))
      await global.reloadHandler(true).catch(console.error)
    } else if (reason === DisconnectReason.restartRequired) {
      console.log(chalk.bold.cyanBright(`\n♻ Conectando el Bot con el servidor...`))
      await global.reloadHandler(true).catch(console.error)
    } else if (reason === DisconnectReason.timedOut) {
      console.log(chalk.bold.yellowBright(`\n♻ Conexión agotada, reconectando el Bot...`))
      await global.reloadHandler(true).catch(console.error)
    } else {
      console.log(chalk.bold.redBright(`\n⚠︎ Conexión cerrada, conectese nuevamente.`))
    }
  }
}
process.on('uncaughtException', console.error)
let isInit = true
let handler = await import('./handler.js')
global.reloadHandler = async function (restatConn) {
  try {
    const Handler = await import(`./handler.js?update=${Date.now()}`).catch(console.error)
    if (Object.keys(Handler || {}).length) handler = Handler
  } catch (e) {
    console.error(e)
  }
  if (restatConn) {
    const oldChats = global.conn.chats
    try {
      global.conn.ws.close()
    } catch { }
    conn.ev.removeAllListeners()
    global.conn = makeWASocket(connectionOptions, { chats: oldChats })
    isInit = true
  }
  if (!isInit) {
    conn.ev.off('messages.upsert', conn.handler)
    conn.ev.off('connection.update', conn.connectionUpdate)
    conn.ev.off('creds.update', conn.credsUpdate)
  }
  conn.handler = handler.handler.bind(global.conn)
  conn.connectionUpdate = connectionUpdate.bind(global.conn)
  conn.credsUpdate = saveCreds.bind(global.conn, true)
  const currentDateTime = new Date()
  const messageDateTime = new Date(conn.ev)
  if (currentDateTime >= messageDateTime) {
    const chats = Object.entries(conn.chats).filter(([jid, chat]) => !jid.endsWith('@g.us') && chat.isChats).map((v) => v[0])
  } else {
    const chats = Object.entries(conn.chats).filter(([jid, chat]) => !jid.endsWith('@g.us') && chat.isChats).map((v) => v[0])
  }
  conn.ev.on('messages.upsert', conn.handler)
  conn.ev.on('connection.update', conn.connectionUpdate)
  conn.ev.on('creds.update', conn.credsUpdate)
  isInit = false
  return true
}
setInterval(() => {
  console.log('[ ✿ ]  Reiniciando...')
  process.exit(0)
}, 259200000)
let rtU = join(__dirname, `./${jadi}`)
if (!existsSync(rtU)) {
  mkdirSync(rtU, { recursive: true })
}

const pluginFolder = global.__dirname(join(__dirname, './plugins/index'))
const pluginFilter = (filename) => /\.js$/.test(filename)
global.plugins = {}
async function filesInit() {
  for (const filename of readdirSync(pluginFolder).filter(pluginFilter)) {
    try {
      const file = global.__filename(join(pluginFolder, filename))
      const module = await import(file)
      global.plugins[filename] = module.default || module
    } catch (e) {
      conn.logger.error(e)
      delete global.plugins[filename]
    }
  }
}
filesInit().then((_) => Object.keys(global.plugins)).catch(console.error)

global.reload = async (_ev, filename) => {
  if (pluginFilter(filename)) {
    const dir = global.__filename(join(pluginFolder, filename), true)
    if (filename in global.plugins) {
      if (existsSync(dir)) conn.logger.info(` updated plugin - '${filename}'`)
      else {
        conn.logger.warn(`deleted plugin - '${filename}'`)
        return delete global.plugins[filename]
      }
    } else conn.logger.info(`new plugin - '${filename}'`)
    const err = syntaxerror(readFileSync(dir), filename, {
      sourceType: 'module',
      allowAwaitOutsideFunction: true,
    })
    if (err) conn.logger.error(`syntax error while loading '${filename}'\n${format(err)}`)
    else {
      try {
        const module = (await import(`${global.__filename(dir)}?update=${Date.now()}`))
        global.plugins[filename] = module.default || module
      } catch (e) {
        conn.logger.error(`error require plugin '${filename}\n${format(e)}'`)
      } finally {
        global.plugins = Object.fromEntries(Object.entries(global.plugins).sort(([a], [b]) => a.localeCompare(b)))
      }
    }
  }
}
Object.freeze(global.reload)
watch(pluginFolder, global.reload)
await global.reloadHandler()
async function _quickTest() {
  const test = await Promise.all([
    spawn('ffmpeg'),
    spawn('ffprobe'),
    spawn('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-filter_complex', 'color', '-frames:v', '1', '-f', 'webp', '-']),
    spawn('convert'),
    spawn('magick'),
    spawn('gm'),
    spawn('find', ['--version']),
  ].map((p) => {
    return Promise.race([
      new Promise((resolve) => {
        p.on('close', (code) => {
          resolve(code !== 127)
        })
      }),
      new Promise((resolve) => {
        p.on('error', (_) => resolve(false))
      })
    ])
  }))
  const [ffmpeg, ffprobe, ffmpegWebp, convert, magick, gm, find] = test
  const s = global.support = { ffmpeg, ffprobe, ffmpegWebp, convert, magick, gm, find }
  Object.freeze(global.support)
}
function clearTmp() {
  const tmpDir = join(__dirname, 'tmp')
  const filenames = readdirSync(tmpDir)
  filenames.forEach(file => {
    const filePath = join(tmpDir, file)
    unlinkSync(filePath)
  })
}

function purgeSession() {
  let prekey = []
  let directorio = readdirSync(`./${sessions}`)
  let filesFolderPreKeys = directorio.filter(file => {
    return file.startsWith('pre-key-')
  })
  prekey = [...prekey, ...filesFolderPreKeys]
  filesFolderPreKeys.forEach(files => {
    unlinkSync(`./${sessions}/${files}`)
  })
}

function purgeSessionSB() {
  try {
    const listaDirectorios = readdirSync(`./${jadi}/`)
    let SBprekey = []
    listaDirectorios.forEach(directorio => {
      if (statSync(`./${jadi}/${directorio}`).isDirectory()) {
        const DSBPreKeys = readdirSync(`./${jadi}/${directorio}`).filter(fileInDir => {
          return fileInDir.startsWith('pre-key-')
        })
        SBprekey = [...SBprekey, ...DSBPreKeys]
        DSBPreKeys.forEach(fileInDir => {
          if (fileInDir !== 'creds.json') {
            unlinkSync(`./${jadi}/${directorio}/${fileInDir}`)
          }
        })
      }
    })
    if (SBprekey.length === 0) {
      console.log(chalk.bold.green(`\nꕥ No hay archivos en ${jadi} para eliminar.`))
    } else {
      console.log(chalk.bold.cyanBright(`\n⌦ Archivos de la carpeta ${jadi} han sido eliminados correctamente.`))
    }
  } catch (err) {
    console.log(chalk.bold.red(`\n⚠︎ Error para eliminar archivos de la carpeta ${jadi}.\n` + err))
  }
}

function purgeOldFiles() {
  const directories = [`./${sessions}/`, `./${jadi}/`]
  directories.forEach(dir => {
    readdirSync(dir, (err, files) => {
      if (err) throw err
      files.forEach(file => {
        if (file !== 'creds.json') {
          const filePath = path.join(dir, file)
          unlinkSync(filePath, err => {
            if (err) {
              console.log(chalk.bold.red(`\n⚠︎ El archivo ${file} no se logró borrar.\n` + err))
            } else {
              console.log(chalk.bold.green(`\n⌦ El archivo ${file} se ha borrado correctamente.`))
            }
          })
        }
      })
    })
  })
}
function redefineConsoleMethod(methodName, filterStrings) {
  const originalConsoleMethod = console[methodName]
  console[methodName] = function () {
    const message = arguments[0]
    if (typeof message === 'string' && filterStrings.some(filterString => message.includes(atob(filterString)))) {
      arguments[0] = ""
    }
    originalConsoleMethod.apply(console, arguments)
  }
}
setInterval(async () => {
  if (global.stopped === 'close' || !conn || !conn.user) return
  await clearTmp()
  console.log(chalk.bold.cyanBright(`\n⌦ Archivos de la carpeta TMP no necesarios han sido eliminados del servidor.`))
}, 1000 * 60 * 4)
setInterval(async () => {
  if (global.stopped === 'close' || !conn || !conn.user) return
  await purgeSession()
  console.log(chalk.bold.cyanBright(`\n⌦ Archivos de la carpeta ${global.sessions} no necesario han sido eliminados del servidor.`))
}, 1000 * 60 * 10)
setInterval(async () => {
  if (global.stopped === 'close' || !conn || !conn.user) return
  await purgeSessionSB()
}, 1000 * 60 * 10)
setInterval(async () => {
  if (global.stopped === 'close' || !conn || !conn.user) return
  await purgeOldFiles()
  console.log(chalk.bold.cyanBright(`\n⌦ Archivos no necesario han sido eliminados del servidor.`))
}, 1000 * 60 * 10)
_quickTest().catch(console.error)
async function isValidPhoneNumber(number) {
  try {
    number = number.replace(/\s+/g, '')
    if (number.startsWith('+521')) {
      number = number.replace('+521', '+52')
    } else if (number.startsWith('+52') && number[4] === '1') {
      number = number.replace('+52 1', '+52')
    }
    const parsedNumber = phoneUtil.parseAndKeepRawInput(number)
    return phoneUtil.isValidNumber(parsedNumber)
  } catch (error) {
    return false
  }
}

async function joinChannels(conn) {
  for (const channelId of Object.values(global.ch)) {
    await conn.newsletterFollow(channelId).catch(() => { })
  }
}