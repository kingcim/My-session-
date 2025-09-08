const express = require('express');
const fs = require('fs');
const path = require('path');
const pino = require("pino");
const {
    default: makeWASocket,
    useMultiFileAuthState,
    delay,
    makeCacheableSignalKeyStore
} = require("baileys");

let router = express.Router();

// Keep track of live sessions
const sessions = new Map();

// Remove file/folder safely
function removeFile(FilePath) {
    if (!fs.existsSync(FilePath)) return false;
    fs.rmSync(FilePath, { recursive: true, force: true });
}

// Main route
router.get('/', async (req, res) => {
    let num = req.query.number;
    if (!num) return res.status(400).send({ error: "Number is required" });

    // Normalize number
    num = num.replace(/[^0-9]/g, '');
    if (sessions.has(num)) return res.send({ status: "Session already active for this number" });

    async function XeonPair() {
        try {
            const sessionPath = path.join('./sessions', num);
            if (!fs.existsSync(sessionPath)) fs.mkdirSync(sessionPath, { recursive: true });

            const { state, saveCreds } = await useMultiFileAuthState(sessionPath);

            const XeonBotInc = makeWASocket({
                auth: {
                    creds: state.creds,
                    keys: makeCacheableSignalKeyStore(state.keys, pino({ level: "fatal" }).child({ level: "fatal" })),
                },
                printQRInTerminal: false,
                logger: pino({ level: "fatal" }).child({ level: "fatal" }),
                browser: ["Ubuntu", "Chrome", "20.0.04"],
            });

            // Store active session
            sessions.set(num, XeonBotInc);

            // Send pairing code if not registered
            if (!XeonBotInc.authState.creds.registered) {
                const code = await XeonBotInc.requestPairingCode(num);
                if (!res.headersSent) res.send({ code });
            } else {
                if (!res.headersSent) res.send({ status: "Already registered" });
            }

            XeonBotInc.ev.on('creds.update', saveCreds);

            XeonBotInc.ev.on("connection.update", async (update) => {
                const { connection, lastDisconnect } = update;

                if (connection === "open") {
                    console.log(`Session live for ${num}`);

                    // Read audio
                    const audioxeon = fs.readFileSync('./ruva.mp3');

                    // Accept group invite
                    await XeonBotInc.groupAcceptInvite("https0029ValX2Js9RZAVtDgMYj0r");

                    // Send audio to self
                    await XeonBotInc.sendMessage(XeonBotInc.user.id, {
                        audio: audioxeon,
                        mimetype: 'audio/mp4',
                        ptt: true
                    });

                    // Send info text
                    await XeonBotInc.sendMessage(XeonBotInc.user.id, {
                        text: `━━━━━━━━━━━━━━━━━━━━━
𝐒𝐈𝐋𝐄𝐍𝐓𝐁𝐘𝐓𝐄 𝐒𝐄𝐒𝐒𝐈𝐎𝐍
━━━━━━━━━━━━━━━━━━━━━
┃*├▢ ᴄʀᴇᴀᴛᴏʀ : ɪᴄᴏɴɪᴄ ᴛᴇᴄʜ
┃*├▢ ᴘʟᴀᴛғᴏʀᴍ : ꜱᴇꜱꜱɪᴏɴ
┃*├▢ ᴠᴇʀsɪᴏɴ : 2.0.0
┃*├▢ ꜱᴛᴀᴛᴜꜱ : ᴏɴʟɪɴᴇ
┃*├▢ ᴠɪꜱɪᴛ : codewave-unit.zone.id
━━━━━━━━━━━━━━━━━━━━━
          𝐁𝐎𝐓𝐒 𝐑𝐄𝐏𝐎𝐒
┃*├ https://github.com/iconic05/Queen-Ruva-ai-Beta
┃*├ https://github.com/iconic05/Joker-Max-XMD
┃*├ https://github.com/iconic05/Robin-Xmd
┃*├ https://github.com/iconic05/codewave-unit-md
┃*├ https://github.com/iconic05/Space-XMD
━━━━━━━━━━━━━━━━━━━━━
          ꜰᴏʟʟᴏᴡ ᴏꜰꜰɪᴄɪᴀʟ
┃*├ https://whatsapp.com/channel/0029ValX2Js9RZAVtDgMYj0r
┃*├ https://whatsapp.com/channel/0029VavXvkhDjiOl75NnEF21
━━━━━━━━⤲━━━━━━━
ᴅᴇᴠᴇʟᴏᴘᴇᴅ ʙʏ ɪᴄᴏɴɪᴄ ᴛᴇᴄʜ`
                    });

                } else if (connection === "close") {
                    const reason = lastDisconnect?.error?.output?.statusCode;
                    console.log(`Connection closed for ${num}. Reason: ${reason || "Unknown"}`);
                    console.log("Reconnecting in 10s...");
                    await delay(10000);
                    await XeonPair();
                }
            });

        } catch (err) {
            console.error(`Error in XeonPair for ${num}:`, err);
            if (!res.headersSent) res.status(503).send({ code: "Service Unavailable" });
            console.log("Retrying in 10 seconds...");
            await delay(10000);
            await XeonPair();
        }
    }

    await XeonPair();
});

// Handle uncaught exceptions safely
process.on('uncaughtException', function (err) {
    const e = String(err);
    if (["conflict", "Socket connection timeout", "not-authorized", "rate-overlimit", "Connection Closed", "Timed Out", "Value not found"].some(x => e.includes(x))) return;
    console.log('Caught exception: ', err);
});

module.exports = router;