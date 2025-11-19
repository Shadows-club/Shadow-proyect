import chalk from 'chalk'
import { parsePhoneNumber } from 'awesome-phonenumber'
import { watchFile } from 'fs'

export default async function (m, conn = { user: {} }) {
  try {
    if (global.opts?.noprint || global.db?.data?.settings?.[conn.user?.jid]?.noprint) return
    if (!m || !m.sender || !m.chat || !m.mtype) return
    
    const parsed = parsePhoneNumber('+' + m.sender.replace(/[^0-9]/g, ''))
    const numeroTelefono = parsed.valid ? parsed.number.e164.replace('+', '') : m.sender.replace(/[^0-9]/g, '')
    const nombreRemitente = await conn.getName(m.sender) || 'Desconocido'
    const idChat = m.chat
    const nombreChat = await conn.getName(m.chat) || 'Chat Privado'
    const tipoMensaje = m.mtype.replace(/message$/i, '').replace(/^./, v => v.toUpperCase())
    const marcaTiempo = new Date(m.messageTimestamp * 1000).toLocaleString('es-ES', { timeZone: 'America/Mexico_City' }) + ' (CDMX)'
    
    const tamañoArchivo = m.msg
      ? m.msg.fileLength
        ? (typeof m.msg.fileLength === 'object' ? m.msg.fileLength.low || 0 : m.msg.fileLength)
        : m.text ? m.text.length : 0
      : m.text ? m.text.length : 0
      
    const infoTamaño = m.mtype.includes('audio') || m.mtype.includes('image') || m.mtype.includes('video') || m.mtype.includes('document')
      ? `${tamañoArchivo} bytes`
      : `${tamañoArchivo} Caracteres`
      
    const esDelBot = m.key.fromMe ? chalk.bgHex('#9400D3').white(' 🤖 BOT ') : chalk.bgHex('#00BFFF').white(' 👤 USER ')
    const textoMensaje = m.text || ''
    const mensajeReducido = textoMensaje.length > 80 ? textoMensaje.substring(0, 80) + '...' : textoMensaje
    const comandoDetectado = textoMensaje.startsWith('.') ? textoMensaje.split(' ')[0] : chalk.gray('N/A')
    
    const destino = m.chat.endsWith('@g.us') ? 'GRUPO'
      : m.chat.endsWith('@s.whatsapp.net') ? 'PRIVADO'
      : m.chat.endsWith('@broadcast') ? 'DIFUSIÓN'
      : m.chat.endsWith('@newsletter') ? 'CANAL'
      : m.chat.endsWith('@lid') ? 'COMUNIDAD'
      : 'DESCONOCIDO'
      
    const colorDestino = m.chat.endsWith('@g.us') ? chalk.bgHex('#3CB371').black.bold(destino) 
      : m.chat.endsWith('@s.whatsapp.net') ? chalk.bgHex('#FFA500').black.bold(destino)
      : chalk.bgGray.white.bold(destino)
      
    const LINE = chalk.hex('#FF69B4').bold('═').repeat(40)
    const LIGHT_LINE = chalk.gray('—').repeat(40)
    
    console.log(`\n${LINE}`)
    console.log(chalk.hex('#FF69B4').bold('» 𝚂𝙷𝙰𝙳𝙾𝚆 - 𝙼𝙳 «') + ' ' + colorDestino)
    console.log(LINE)
    
    console.log(`${chalk.white.bold('» 👤 Remitente:')} ${chalk.yellowBright.bold(nombreRemitente)}`)
    console.log(`${chalk.white.bold('» 📞 Número:')} ${chalk.cyanBright.bold(numeroTelefono)}`)
    console.log(`${chalk.white.bold('» 🤖 Fuente:')} ${esDelBot}`)
    console.log(LIGHT_LINE)
    
    console.log(`${chalk.white.bold('» 💬 Chat:')} ${chalk.greenBright.bold(nombreChat)}`)
    console.log(`${chalk.white.bold('» 🆔 ID Chat:')} ${chalk.gray(idChat)}`)
    console.log(`${chalk.white.bold('» ⏰ Hora (CDMX):')} ${chalk.white.italic(marcaTiempo)}`)
    console.log(LIGHT_LINE)
    
    console.log(`${chalk.white.bold('» 📄 Tipo:')} ${chalk.magenta.bold(tipoMensaje)}`)
    console.log(`${chalk.white.bold('» 📏 Tamaño:')} ${chalk.white(infoTamaño)}`)
    console.log(`${chalk.white.bold('» 💻 Comando:')} ${chalk.red.bold(comandoDetectado)}`)
    
    if (textoMensaje) {
      console.log(LINE)
      console.log(chalk.hex('#ADFF2F').bold('📝 CONTENIDO:'))
      console.log(chalk.white.bold(`   "${mensajeReducido}"`))
    }
    
    console.log(LINE + '\n')
    
  } catch (err) {
    console.error(chalk.bgRed.white.bold(' ❌ ERROR ') + chalk.red.bold('en el registro: ') + chalk.white(err.message))
  }
}

let file = global.__filename(import.meta.url)
watchFile(file, () => {
  console.log(chalk.bgRed.white.bold(" ⚠️ ¡ACTUALIZACIÓN! ") + chalk.redBright(" 'print.js' ha sido modificado y recargado. "))
})
