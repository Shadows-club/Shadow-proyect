import { watchFile, unwatchFile } from 'fs' 
import chalk from 'chalk'
import { fileURLToPath } from 'url'
import fs from 'fs'
import cheerio from 'cheerio'
import fetch from 'node-fetch'
import axios from 'axios'
import moment from 'moment-timezone' 

// ━━━━━ ⋆★⋆ ━━━━━

global.owner = [
  ['5491124918653', ' 𝐅𝐞𝐝𝐞 𝐔𝐜𝐡𝐢𝐡𝐚', true],
  ['5491162424280', '𝘍𝘦𝘥𝘦 𝘜𝘤𝘩𝘪𝘩𝘢', true],
];

// ━━━━━ ⋆★⋆ ━━━━━

global.mods = ['5491124918653']

// ━━━━━ ⋆★⋆ ━━━━━

global.packname = 'Տհαժօա - Ⴆօէ'
global.botname = '𝙎𝙝𝙖𝙙𝙤𝙬 - 𝘽𝙤𝙩'
global.author = '🄲 𝘗𝘰𝘸𝘦𝘳𝘦𝘥 𝘣𝘺 𝘋𝘦𝘷-𝘧𝘦𝘥𝘦𝘹𝘺𝘻'
global.dev = '🄲 𝘔𝘢𝘥𝘦 𝘣𝘺 𝘥𝘦𝘷-𝘧𝘦𝘥𝘦𝘹𝘺𝘻'
global.textbot = 'Ｓｈａｄｏｗ`Ｓ - Ｂｏｔ'

// ━━━━━ ⋆★⋆ ━━━━━

// === INPORTANTE ===
global.namew = 'Տհαժօա - Ⴆօէ'
global.namev = '𝑺𝒉𝒂𝒅𝒐𝒘`𝑺 - 𝑩𝒐𝒕'
global.erorr = '𝙉𝙤 𝙥𝙪𝙚𝙙𝙚𝙨 𝙪𝙨𝙖𝙧 𝙚𝙨𝙩𝙚 𝙘𝙤𝙢𝙖𝙣𝙙𝙤'
global.erorr1 = '𝙉𝙤 𝙩𝙞𝙚𝘯𝘦𝘴 𝙥𝙚𝙧𝙢𝙞𝙨𝙤 𝙥𝘢𝘳𝘢 𝙪𝙨𝙖𝙧𝙡𝙤'

// ━━━━━ ⋆★⋆ ━━━━━

global.libreria = 'Baileys'
global.baileys = 'V 6.7.17' 
global.languaje = 'Español'
global.vs = '2.2.0'
global.vsJB = '5.0'
global.nameqr = 'Shadow - Bot'
global.namebot = 'Shadow`S - Bot'
global.sessions = 'Shadow/Sessions'
global.jadi = 'Shadow/Jadibos' 
global.ShadowJadibts = true

// ━━━━━ ⋆★⋆ ━━━━━

global.moneda = 'Yenes'

// ━━━━━ ⋆★⋆ ━━━━━

global.catalogo = fs.readFileSync('./src/imagen/shadow.jpg');

// ━━━━━ ⋆★⋆ ━━━━━

let catalogo2;
try {
  catalogo2 = fs.readFileSync('./src/imagen/catalogo.png');
} catch (error) {
  console.log('Warning: ./src/imagen/catalogo.png not found, using catalogo as fallback');
  catalogo2 = catalogo; // Using the existing 'catalogo' variable as fallback
}
global.photoSity = [catalogo2]

// ━━━━━ ⋆★⋆ ━━━━━

global.ch = {
  ch1: '120363417186717632@newsletter',
}

// ━━━━━ ⋆★⋆ ━━━━━

global.cheerio = cheerio
global.fs = fs
global.fetch = fetch
global.axios = axios
global.moment = moment   


global.multiplier = 69
global.maxwarn = '3'

// ━━━━━ ⋆★⋆ ━━━━━

let file = fileURLToPath(import.meta.url)
watchFile(file, () => {
  unwatchFile(file)
  console.log(chalk.redBright("Update 'shadow/config.js'"))
  import(`${file}?update=${Date.now()}`)
})
