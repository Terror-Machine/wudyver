import axios from 'axios';
import { v4 as uuidv4 } from 'uuid';
import { createHmac } from 'crypto';
import apiConfig from "@/configs/apiConfig";

const SECRET_KEY = apiConfig.SONIVA_KEY;
const BASE_URL = "https://api.sonivamusic.com/musicai";
const DOWNLOAD_BASE_URL = "https://d2m6kf0jl6dhrs.cloudfront.net";

class Soniva {
    constructor(hmacSecretKey) {
        this.hmacSecretKey = hmacSecretKey;
        this.deviceId = uuidv4();
        this.userId = null;
        this.baseUrl = BASE_URL;
    }

    _generateUUID() {
        return uuidv4();
    }

    _generateSignature(dataToSign) {
        try {
            const hmac = createHmac("sha256", this.hmacSecretKey);
            hmac.update(dataToSign, 'utf8');
            const signatureBytes = hmac.digest();
            return Buffer.from(signatureBytes).toString('base64');
        } catch (e) {
            console.error("Error generating HMAC signature:", e);
            return "";
        }
    }

    async register() {
        const requestTime = String(Date.now());
        const messageId = this._generateUUID();

        const dataToSignForXRequestId = `${this.deviceId}${messageId}${requestTime}`;
        const xRequestIdSignature = this._generateSignature(dataToSignForXRequestId);
        const hmacForRegisterBody = xRequestIdSignature;

        const registerBody = {
            "device_id": this.deviceId,
            "push_token": hmacForRegisterBody,
            "message_id": messageId,
            "AuthToken": hmacForRegisterBody
        };

        const headers = {
            "Host": "api.sonivamusic.com",
            "X-Request-ID": xRequestIdSignature,
            "X-Device-ID": this.deviceId,
            "X-Request-Time": requestTime,
            "X-Message-ID": messageId,
            "X-Platform": "android",
            "X-App-Version": "1.2.6",
            "X-Country": "ID",
            "Accept-Language": "id-ID",
            "User-Agent": "SonivaMusic/1.2.6 (build:70; Android 10; Xiaomi Redmi Note 5)",
            "Content-Type": "application/json; charset=utf-8",
            "Accept-Encoding": "gzip",
        };

        try {
            const url = `${this.baseUrl}/v1/register`;
            console.log("\n--- Register Request Details ---");
            console.log("URL:", url);
            console.log("Headers:", JSON.stringify(headers, null, 2));
            console.log("Body:", JSON.stringify(registerBody, null, 2));
            console.log("-----------------------");

            const response = await axios.post(url, registerBody, { headers });
            console.log("✅ Registrasi berhasil:");
            console.log(response.data);
            this.userId = response.data.user_id;
            return response.data;
        } catch (err) {
            console.error("❌ Gagal melakukan registrasi:", err.response?.status || err.code);
            if (err.response?.data) {
                console.error("Error Response Data:", err.response.data);
            } else {
                console.error("Error Message:", err.message);
            }
            throw err;
        }
    }

    async create({
        mood = "Romantic,Motivational,Melancholic",
        genre = "Electro Pop",
        has_vocal = false,
        vocal_gender = "male",
        record_type = "live",
        lyrics = "**[MC]**\n\"Selamat datang, semuanya! Mari kita sambut biduan paling cantik kita dari Jawa, **Ayu Gemoy**! Siap untuk menggoyang panggung dan hati kita semua?\"\n\n**[Ayu Gemoy]**\n\"Terima kasih, semuanya! Ayo kita nikmati malam ini dengan penuh cinta dan irama dangdut yang menggugah semangat! Ini dia lagu untuk kalian semua!\"\n\n[Intro]\nSelamat malam, semuanya!\nAyo kita goyang!\n\n[Verse 1]\nDi bawah sinar bulan purnama,\nKita berdua bercerita cinta,\nKau genggam tanganku penuh rasa,\nBawa hatiku terbang melangit.\n\n[Chorus]\nAyo, sayang! Mari kita goyang!\nCinta kita takkan pernah padam, ya!\n\n[Reff]\nCinta kita berdua, selamanya,\nTakkan pernah terpisah, oh kasihku,\nDi setiap detak jantung ini,\nKau adalah segalanya, cintaku.\n\n[Verse 2]\nLihat bintang bersinar indah,\nSeperti cinta kita yang takkan sirna,\nSetiap detik bersamamu,\nKau adalah mimpi yang nyata.\n\n[Chorus]\nAyo, sayang! Mari kita goyang!\nCinta kita takkan pernah padam, ya!\n\n[Reff]\nCinta kita berdua, selamanya,\nTakkan pernah terpisah, oh kasihku,\nDi setiap detak jantung ini,\nKau adalah segalanya, cintaku.\n\n[Bridge]\nKita jalani kisah indah,\nWalau badai datang menghadang,\nBersama kita hadapi semua,\nCinta kita kan selalu abadi.\n\n[Outro]\n\"Terima kasih, semuanya! Mari kita teruskan malam ini dengan penuh cinta!\"",
        title = "cinta",
        is_dual_song_enabled = true,
        ...rest
    }) {
        if (!this.userId) {
            await this.register();
        }
        console.log(`\n--- Creating song ---`);
        const requestTime = String(Date.now());
        const messageId = this._generateUUID();

        const dataToSignForXRequestId = `${this.deviceId}${messageId}${requestTime}`;
        const xRequestIdSignature = this._generateSignature(dataToSignForXRequestId);

        const headers = {
            "Host": "api.sonivamusic.com",
            "x-request-id": xRequestIdSignature,
            "x-device-id": this.deviceId,
            "x-request-time": requestTime,
            "x-message-id": messageId,
            "platform": "android",
            "x-app-version": "1.2.6",
            "x-country": "ID",
            "accept-language": "id-ID",
            "user-agent": "SonivaMusic/1.2.6 (build:70; Android 10; Xiaomi Redmi Note 5)",
            "content-type": "application/json; charset=utf-8",
            "accept-encoding": "gzip"
        };

        const createBody = {
            mood,
            genre,
            has_vocal,
            vocal_gender,
            record_type,
            lyrics,
            title,
            is_dual_song_enabled,
            message_id: messageId,
            ...rest
        };

        try {
            const url = `${this.baseUrl}/v1/users/${this.userId}/songs/lyrics`;
            const response = await axios.post(url, createBody, { headers });
            console.log("✅ Create berhasil:");
            return { userId: this.userId, ...response.data };
        } catch (err) {
            console.error("❌ Gagal melakukan create:", err.response?.status || err.code);
            if (err.response?.data) {
                console.error("Error Response Data:", err.response.data);
            } else {
                console.error("Error Message:", err.message);
            }
            throw err;
        }
    }

    async info({ userId, page = 1, limit = 90, sortAsc = false } = {}) {
        console.log(`\n--- Fetching user info ---`);
        const requestTime = String(Date.now());
        const messageId = this._generateUUID();

        const dataToSignForXRequestId = `${this.deviceId}${messageId}${requestTime}`;
        const xRequestIdSignature = this._generateSignature(dataToSignForXRequestId);

        const headers = {
            "Host": "api.sonivamusic.com",
            "content-type": "application/json",
            "x-request-id": xRequestIdSignature,
            "x-device-id": this.deviceId,
            "x-request-time": requestTime,
            "x-message-id": messageId,
            "platform": "android",
            "x-app-version": "1.2.6",
            "x-country": "ID",
            "accept-language": "id-ID",
            "user-agent": "SonivaMusic/1.2.6 (build:70; Android 10; Xiaomi Redmi Note 5)",
            "accept-encoding": "gzip"
        };

        try {
            const url = `${this.baseUrl}/v1/users/${userId}/library?page=${page}&limit=${limit}&sortAsc=${sortAsc}`;
            const response = await axios.get(url, { headers });
            console.log("✅ Info berhasil diambil:");
            return response.data;
        } catch (err) {
            console.error("❌ Gagal mengambil info:", err.response?.status || err.code);
            if (err.response?.data) {
                console.error("Error Response Data:", err.response.data);
            } else {
                console.error("Error Message:", err.message);
            }
            throw err;
        }
    }

    async download({ songPath = "0a86eceb-2722-4b47-a32b-90b893160a42.mp3" } = {}) {
        console.log(`\n--- Attempting to download song: ${songPath} ---`);

        const headers = {
            "Icy-MetaData": "1",
            "Accept-Encoding": "identity",
            "User-Agent": "Dalvik/2.1.0 (Linux; U; Android 10; Redmi Note 5 Build/QQ3A.200805.001)",
            "Host": "d2m6kf0jl6dhrs.cloudfront.net",
            "Connection": "Keep-Alive"
        };

        try {
            const url = `${DOWNLOAD_BASE_URL}/song/${songPath}`;
            console.log("\n--- Download Request Details ---");
            console.log("URL:", url);
            console.log("Headers:", JSON.stringify(headers, null, 2));
            console.log("-----------------------");

            const response = await axios.get(url, { headers, responseType: 'arraybuffer' });
            console.log(`✅ Download berhasil. Data diterima: ${response.data.byteLength} bytes.`);
            return response.data; // Return the ArrayBuffer directly
        } catch (err) {
            console.error("❌ Gagal melakukan download:", err.response?.status || err.code);
            if (err.response?.data) {
                // If response data is available, try to convert it to string for logging
                console.error("Error Response Data:", Buffer.from(err.response.data).toString());
            } else {
                console.error("Error Message:", err.message);
            }
            throw err;
        }
    }
}

export default async function handler(req, res) {
  const {
    action,
    ...params
  } = req.method === "GET" ? req.query : req.body;
  const bot = new Soniva(SECRET_KEY);
  try {
    let result;
    switch (action) {
      case "create":
        if (!params.lyrics) {
          return res.status(400).json({
            message: "No lyrics provided"
          });
        }
        result = await bot.create(params);
        break;
      case "info":
        if (!params.userId) {
          return res.status(400).json({
            message: "No userId provided"
          });
        }
        result = await bot.info(params);
        break;
      case "download":
        if (!params.songPath) {
          return res.status(400).json({
            message: "No songPath provided"
          });
        }
        result = await bot.download(params);
        break;
      default:
        return res.status(400).json({
          error: "Action tidak valid. Gunakan ?action=create atau ?action=info"
        });
    }
    return res.status(200).json(result);
  } catch (error) {
    res.status(500).json({
      error: error.message || "Internal Server Error"
    });
  }
}