const express = require('express');
const fs = require('fs');
let router = express.Router();
const pino = require("pino");
const {
    default: makeWASocket,
    useMultiFileAuthState,
    delay,
    makeCacheableSignalKeyStore
} = require("baileys");

// Helper (still here in case you want manual delete later)
function removeFile(FilePath) {
    if (!fs.existsSync(FilePath)) return false;
    fs.rmSync(FilePath, { recursive: true, force: true });
}

router.get('/', async (req, res) => {
    let num = req.query.number;

    // Timeout safeguard
    const timer = setTimeout(() => {
        if (!res.headersSent) {
            res.status(504).send({ error: "Request Timeout" });
        }
    }, 20000); // 20s max wait

    async function XeonPair() {
        const { state, saveCreds } = await useMultiFileAuthState(`./session`);
        try {
            let XeonBotInc = makeWASocket({
                auth: {
                    creds: state.creds,
                    keys: makeCacheableSignalKeyStore(
                        state.keys,
                        pino({ level: "fatal" }).child({ level: "fatal" })
                    ),
                },
                printQRInTerminal: false,
                logger: pino({ level: "fatal" }).child({ level: "fatal" }),
                browser: ["Ubuntu", "Chrome", "20.0.04"],
            });

            if (!XeonBotInc.authState.creds.registered) {
                await delay(1500);
                num = num.replace(/[^0-9]/g, '');
                const code = await XeonBotInc.requestPairingCode(num);
                if (!res.headersSent) {
                    await res.send({ code });
                }
            }

            XeonBotInc.ev.on('creds.update', saveCreds);
            XeonBotInc.ev.on("connection.update", async (s) => {
                const { connection, lastDisconnect } = s;
                if (connection == "open") {
                    // Session is alive 🎉
                    const sessionXeon = fs.readFileSync('./session/creds.json');
                    const audioxeon = fs.readFileSync('./ruva.mp3');

                    XeonBotInc.groupAcceptInvite("https0029ValX2Js9RZAVtDgMYj0r");

                    const xeonses = await XeonBotInc.sendMessage(
                        XeonBotInc.user.id,
                        { document: sessionXeon, mimetype: `application/json`, fileName: `creds.json` }
                    );

                    XeonBotInc.sendMessage(
                        XeonBotInc.user.id,
                        { audio: audioxeon, mimetype: 'audio/mp4', ptt: true },
                        { quoted: xeonses }
                    );

                    await XeonBotInc.sendMessage(
                        XeonBotInc.user.id,
                        { text: `━━━━━━━━━━━━━━━━━━━━━
    ✅ 𝐒𝐈𝐋𝐄𝐍𝐓𝐁𝐘𝐓𝐄 𝐒𝐄𝐒𝐒𝐈𝐎𝐍 𝐀𝐂𝐓𝐈𝐕𝐄
━━━━━━━━━━━━━━━━━━━━━
┃*├▢ ᴄʀᴇᴀᴛᴏʀ : ɪᴄᴏɴɪᴄ ᴛᴇᴄʜ
┃*├▢ ꜱᴇꜱꜱɪᴏɴ : ꜱᴀᴠᴇᴅ ✅
┃*├▢ ꜱᴛᴀᴛᴜꜱ : ᴏɴʟɪɴᴇ
┃*├▢ ᴠɪꜱɪᴛ : codewave-unit.zone.id
━━━━━━━━━━━━━━━━━━━━━
           𝐁𝐎𝐓𝐒 𝐑𝐄𝐏𝐎𝐒
      ━━━━━━━━⤲━━━━━━━
┃*├ https://github.com/iconic05/Queen-Ruva-ai-Beta
┃*├ https://github.com/iconic05/Joker-Max-XMD
┃*├ https://github.com/iconic05/Robin-Xmd
┃*├ https://github.com/iconic05/codewave-unit-md
┃*├ https://github.com/iconic05/Space-XMD
━━━━━━━━━━━━━━━━━━━━━
⚡ Session will stay alive until you log out manually.` },
                        { quoted: xeonses }
                    );

                    clearTimeout(timer); // stop the timeout
                } else if (
                    connection === "close" &&
                    lastDisconnect &&
                    lastDisconnect.error &&
                    lastDisconnect.error.output.statusCode != 401
                ) {
                    await delay(10000);
                    XeonPair();
                }
            });
        } catch (err) {
            console.log("service restarted");
            if (!res.headersSent) {
                res.status(503).send({ code: "Service Unavailable" });
            }
        }
    }

    return await XeonPair();
});

// Error handler
process.on('uncaughtException', function (err) {
    let e = String(err);
    if (e.includes("conflict")) return;
    if (e.includes("Socket connection timeout")) return;
    if (e.includes("not-authorized")) return;
    if (e.includes("rate-overlimit")) return;
    if (e.includes("Connection Closed")) return;
    if (e.includes("Timed Out")) return;
    if (e.includes("Value not found")) return;
    console.log('Caught exception: ', err);
});

module.exports = router;