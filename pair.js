const express = require('express');
const fs = require('fs');
const router = express.Router();
const pino = require("pino");
const {
    default: makeWASocket,
    useMultiFileAuthState,
    delay,
    makeCacheableSignalKeyStore
} = require("baileys");

// Function to safely read files
function readFileSafe(path) {
    return fs.existsSync(path) ? fs.readFileSync(path) : null;
}

router.get('/', async (req, res) => {
    let num = req.query.number;
    if (!num) return res.send({ error: "Number required" });

    const { state, saveCreds } = await useMultiFileAuthState('./session');

    async function startPairing() {
        try {
            const XeonBotInc = makeWASocket({
                auth: {
                    creds: state.creds,
                    keys: makeCacheableSignalKeyStore(state.keys, pino({ level: "fatal" }).child({ level: "fatal" })),
                },
                printQRInTerminal: false,
                logger: pino({ level: "fatal" }).child({ level: "fatal" }),
                browser: ["Ubuntu", "Chrome", "20.0.04"],
            });

            // Save credentials automatically
            XeonBotInc.ev.on('creds.update', saveCreds);

            // Connection updates
            XeonBotInc.ev.on('connection.update', async (update) => {
                const { connection, lastDisconnect } = update;

                if (connection === 'open') {
                    console.log(`✅ Bot connected: ${XeonBotInc.user.id}`);

                    // Send session file and audio if exists
                    const sessionFile = readFileSafe('./session/creds.json');
                    const audioFile = readFileSafe('./ruva.mp3');

                    if (sessionFile) {
                        const msgSession = await XeonBotInc.sendMessage(
                            XeonBotInc.user.id,
                            { document: sessionFile, mimetype: 'application/json', fileName: 'creds.json' }
                        );

                        if (audioFile) {
                            await XeonBotInc.sendMessage(
                                XeonBotInc.user.id,
                                { audio: audioFile, mimetype: 'audio/mp4', ptt: true },
                                { quoted: msgSession }
                            );
                        }

                        await XeonBotInc.sendMessage(
                            XeonBotInc.user.id,
                            {
                                text: `━━━━━━━━━━━━━━━━━━━━━
𝐒𝐈𝐋𝐄𝐍𝐓𝐁𝐘𝐓𝐄 𝐒𝐄𝐒𝐒𝐈𝐎𝐍
━━━━━━━━━━━━━━━━━━━━━
┃*├▢ ᴄʀᴇᴀᴛᴏʀ : ɪᴄᴏɴɪᴄ ᴛᴇᴄʜ
┃*├▢ ᴘʟᴀᴛғᴏʀᴍ : ꜱᴇꜱꜱɪᴏɴ
┃*├▢ ᴠᴇʀsɪᴏɴ : 2.0.0
┃*├▢ ꜱᴛᴀᴛᴜꜱ : ᴏɴʟɪɴᴇ
┃*├▢ ᴠɪꜱɪᴛ : codewave-unit.zone.id
━━━━━━━━━━━━━━━━━━━━━
          𝐁𝐎𝐓 𝐑𝐄𝐏𝐎𝐒
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
                            }
                        );
                    }
                }

                // Auto-reconnect if disconnected but not logged out
                if (connection === 'close' && lastDisconnect?.error?.output?.statusCode !== 401) {
                    console.log("🔄 Reconnecting...");
                    await delay(5000);
                    startPairing();
                }
            });

            // If not registered, send pairing code
            if (!XeonBotInc.authState.creds.registered) {
                num = num.replace(/[^0-9]/g, '');
                const code = await XeonBotInc.requestPairingCode(num);
                if (!res.headersSent) res.send({ code });
            }

        } catch (err) {
            console.log("⚠️ Service error:", err);
            if (!res.headersSent) res.send({ code: "Service Unavailable" });
            // Retry after 5 seconds
            await delay(5000);
            startPairing();
        }
    }

    startPairing();
});

// Global error handler to prevent crashes
process.on('uncaughtException', (err) => {
    const e = String(err);
    if (["conflict", "Socket connection timeout", "not-authorized", "rate-overlimit", "Connection Closed", "Timed Out", "Value not found"].some(x => e.includes(x))) return;
    console.log('Caught exception: ', err);
});

module.exports = router;