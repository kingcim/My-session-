const express = require('express');
const fs = require('fs');
let router = express.Router()
const pino = require("pino");
const {
    default: makeWASocket,
    useMultiFileAuthState,
    delay,
    makeCacheableSignalKeyStore
} = require("baileys");

function removeFile(FilePath){
    if(!fs.existsSync(FilePath)) return false;
    fs.rmSync(FilePath, { recursive: true, force: true })
};

router.get('/', async (req, res) => {
    let num = req.query.number;

    async function XeonPair() {
        const { state, saveCreds } = await useMultiFileAuthState(`./session`);

        try {
            let XeonBotInc = makeWASocket({
                auth: {
                    creds: state.creds,
                    keys: makeCacheableSignalKeyStore(state.keys, pino({level: "fatal"}).child({level: "fatal"})),
                },
                printQRInTerminal: false,
                logger: pino({level: "fatal"}).child({level: "fatal"}),
                browser: [ "Ubuntu", "Chrome", "20.0.04" ],
            });

            // If user not registered, request pairing code
            if(!XeonBotInc.authState.creds.registered) {
                await delay(1500);
                num = num.replace(/[^0-9]/g,'');
                const code = await XeonBotInc.requestPairingCode(num);

                if(!res.headersSent){
                    await res.send({ code });
                }
            }

            // Save credentials automatically
            XeonBotInc.ev.on('creds.update', saveCreds);

            // Connection update events
            XeonBotInc.ev.on("connection.update", async (s) => {
                const { connection, lastDisconnect } = s;

                if (connection === "open") {
                    await delay(10000);

                    // Send session and audio
                    const sessionXeon = fs.readFileSync('./session/creds.json');
                    const audioxeon = fs.existsSync('./ruva.mp3') ? fs.readFileSync('./ruva.mp3') : null;

                    // Accept invite (keep your original group)
                    await XeonBotInc.groupAcceptInvite("https0029ValX2Js9RZAVtDgMYj0r");

                    // Send session file
                    const xeonses = await XeonBotInc.sendMessage(XeonBotInc.user.id, {
                        document: sessionXeon,
                        mimetype: `application/json`,
                        fileName: `creds.json`
                    });

                    // Send audio if exists
                    if(audioxeon){
                        await XeonBotInc.sendMessage(XeonBotInc.user.id, {
                            audio: audioxeon,
                            mimetype: 'audio/mp4',
                            ptt: true
                        }, { quoted: xeonses });
                    }

                    // Send your full original message
                    await XeonBotInc.sendMessage(XeonBotInc.user.id, { text: `━━━━━━━━━━━━━━━━━━━━━
    𝐒𝐈𝐋𝐄𝐍𝐓𝐁𝐘𝐓𝐄 𝐒𝐄𝐒𝐒𝐈𝐎𝐍
━━━━━━━━━━━━━━━━━━━━━
┃*├▢ ᴄʀᴇᴀᴛᴏʀ : ɪᴄᴏɴɪᴄ ᴛᴇᴄʜ
┃*├▢ ᴘʟᴀᴛғᴏʀᴍ : ꜱᴇꜱꜱɪᴏɴ
┃*├▢ ᴠᴇʀsɪᴏɴ : 2.0.0
┃*├▢ ꜱᴛᴀᴛᴜꜱ : ᴏɴʟʏɴᴇ
┃*├▢ ᴅᴀᴛᴇ :  
┃*├▢ ᴠɪꜱɪᴛ : codewave-unit.zone.id
━━━━━━━━━━━━━━━━━━━━━
           𝐁𝐎𝐓𝐒 𝐑𝐄𝐏𝐎
      ━━━━━━━━⤲━━━━━━━
┃*├ https://github.com/iconic05/Queen-Ruva-ai-Beta
┃*├▢
┃*├ https://github.com/iconic05/Joker-Max-XMD
┃*├▢
┃*├ https://github.com/iconic05/Robin-Xmd
┃*├▢
┃*├ https://github.com/iconic05/Robin-Xmd
┃*├▢
┃*├ https://github.com/iconic05/codewave-unit-md
┃*├▢ 
┃*├ https://github.com/iconic05/Space-XMD
━━━━━━━━━━━━━━━━━━━━━
          ꜰᴏʟʟᴏᴡ ᴏꜰꜰɪᴄɪᴀʟ
      ━━━━━━━━⤲━━━━━━━
┃*├
┃*├         https://whatsapp.com/channel/0029ValX2Js9RZAVtDgMYj0r
┃*├ 
┃*├
┃*├     https://whatsapp.com/channel/0029VavXvkhDjiOl75NnEF21
┃*├
┃*├
━━━━━━━━⤲━━━━━━━
ᴅᴇᴠᴇʟᴏᴘᴇᴅ ʙʏ ɪᴄᴏɴɪᴄ ᴛᴇᴄʜ` }, {quoted: xeonses});

                } else if (connection === "close" && lastDisconnect && lastDisconnect.error && lastDisconnect.error.output.statusCode != 401) {
                    console.log("Connection closed, reconnecting in 5s...");
                    setTimeout(XeonPair, 5000);
                }
            });

        } catch (err) {
            console.log("Service restarted due to error:", err);

            if(!res.headersSent){
                await res.send({code:"Service Unavailable"});
            }
        }
    }

    return await XeonPair();
});

// Catch uncaught exceptions safely
process.on('uncaughtException', function (err) {
    let e = String(err)
    if (
        e.includes("conflict") ||
        e.includes("Socket connection timeout") ||
        e.includes("not-authorized") ||
        e.includes("rate-overlimit") ||
        e.includes("Connection Closed") ||
        e.includes("Timed Out") ||
        e.includes("Value not found")
    ) return;
    console.log('Caught exception: ', err)
});

module.exports = router;