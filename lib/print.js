import chalk from 'chalk'
import { parsePhoneNumber } from 'awesome-phonenumber'
import { watchFile } from 'fs'

export default async function (m, conn = { user: {} }) {
  try {
    if (global.opts?.noprint || global.db?.data?.settings?.[conn.user?.jid]?.noprint) return
    if (!m || !m.sender || !m.chat || !m.mtype) return
    let parsed = parsePhoneNumber('+' + m.sender.replace(/[^0-9]/g, ''))
    let numeroTelefono = parsed.valid ? parsed.number.e164.replace('+', '') : m.sender.replace(/[^0-9]/g, '')
    let nombreRemitente = await conn.getName(m.sender) || 'Desconocido'
    let idChat = m.chat
    let nombreChat = await conn.getName(m.chat) || 'Chat Privado'
    let tipoMensaje = m.mtype.replace(/message$/i, '').replace(/^./, v => v.toUpperCase())
    let marcaTiempo = new Date(m.messageTimestamp * 1000).toLocaleString('es-ES', { timeZone: 'America/Mexico_City' }) + ' (CDMX)'
    let tamañoArchivo = m.msg
      ? m.msg.fileLength
        ? (typeof m.msg.fileLength === 'object' ? m.msg.fileLength.low || 0 : m.msg.fileLength)
        : m.text ? m.text.length : 0
      : m.text ? m.text.length : 0
    let infoTamaño = m.mtype.includes('audio') || m.mtype.includes('image') || m.mtype.includes('video') || m.mtype.includes('document')
      ? `${tamañoArchivo} bytes`
      : `${tamañoArchivo} Caracteres`
    let esDelBot = m.key.fromMe ? '🤖 Bot' : '👤 Usuario'
    let textoMensaje = m.text || ''
    let mensajeReducido = textoMensaje.length > 100 ? textoMensaje.substring(0, 100) + '...' : textoMensaje
    let comandoDetectado = textoMensaje.startsWith('.') ? textoMensaje.split(' ')[0] : 'Sin comando'
    let destino = m.chat.endsWith('@g.us') ? 'Grupo'
      : m.chat.endsWith('@s.whatsapp.net') ? 'Privado'
      : m.chat.endsWith('@broadcast') ? 'Difusión'
      : m.chat.endsWith('@newsletter') ? 'Canal'
      : m.chat.endsWith('@lid') ? 'Comunidad'
      : 'Desconocido'
    console.log(chalk.cyan.bold('────────────────────────────────'))
    console.log(chalk.cyan.bold('💌  REGISTRO DE MENSAJE'))
    console.log(chalk.cyan.bold('────────────────────────────────'))
    console.log(`${chalk.blue.bold('📨  Remitente')}: ${chalk.yellow.bold(numeroTelefono)}`)
    console.log(`${chalk.blue.bold('🙎  Nombre')}: ${chalk.yellow.bold(nombreRemitente)}`)
    console.log(`${chalk.blue.bold('📍  Destino')}: ${chalk.bold(destino)}`)
    console.log(`${chalk.blue.bold('📌  Asunto')}: ${chalk.bold(nombreChat)}`)
    console.log(`${chalk.blue.bold('🎯  ID')}: ${chalk.bold(idChat)}`)
    console.log(`${chalk.blue.bold('⏰  Hora')}: ${chalk.bold(marcaTiempo)}`)
    console.log(`${chalk.blue.bold('📁  Tipo')}: ${chalk.bold(tipoMensaje)}`)
    console.log(`${chalk.blue.bold('📦  Tamaño')}: ${chalk.bold(infoTamaño)}`)
    console.log(`${chalk.blue.bold('🔍  Fuente')}: ${chalk.bold(esDelBot)}`)
    console.log(`${chalk.blue.bold('🗂️  Comando')}: ${chalk.greenBright.bold(comandoDetectado)}`)
    console.log(chalk.cyan.bold('────────────────────────────────'))
    if (textoMensaje) {
      console.log(`${chalk.magenta.bold('✉️  Mensaje')}`)
      console.log(chalk.bold(mensajeReducido))
      console.log(chalk.cyan.bold('────────────────────────────────'))
    }
  } catch (err) {
    console.error(chalk.red.bold('❌ Error en print.js: ' + err.message))
  }
}

let file = global.__filename(import.meta.url)
watchFile(file, () => {
  console.log(chalk.redBright("⚡ ¡Actualización de 'print.js' detectada!"))
})