import axios from "axios";
import apiConfig from "@/configs/apiConfig";
class GhibliAIGen {
  constructor() {
    this.generateUrl = "https://ghibliaigenerator.im/api/generate";
    this.uploadUrl = `https://${apiConfig.DOMAIN_URL}/api/tools/upload?host=Catbox`;
    this.headers = {
      "content-type": "application/json",
      "user-agent": "Mozilla/5.0 (Linux; Android 10)",
      referer: "https://ghibliaigenerator.im/"
    };
  }
  async uploadImage(base64Image, mimeType = "image/png") {
    try {
      const dataUri = `data:${mimeType};base64,${base64Image}`;
      const requestData = {
        file: dataUri
      };
      const {
        data: uploadResponse
      } = await axios.post(this.uploadUrl, requestData);
      if (!uploadResponse) {
        throw new Error("Upload failed: No response data.");
      }
      return uploadResponse;
    } catch (error) {
      if (error.response) {
        throw new Error(`Error uploading image: Server responded with status ${error.response.status} - ${JSON.stringify(error.response.data)}`);
      } else if (error.request) {
        throw new Error("Error uploading image: No response received from server.");
      } else {
        throw new Error("Error uploading image: " + error.message);
      }
    }
  }
  async generate({
    prompt
  }) {
    try {
      console.log("[🚀] Mengirim prompt ke GhibliAI Generator...");
      const {
        data
      } = await axios.post(this.generateUrl, {
        prompt: prompt
      }, {
        headers: this.headers
      });
      if (!data?.data?.img) {
        throw new Error("Tidak ada hasil gambar.");
      }
      const base64 = data.data.img.split(",")[1];
      if (!base64) {
        throw new Error("Invalid base64 image data received.");
      }
      const uploadResponse = await this.uploadImage(base64);
      if (!uploadResponse) {
        throw new Error("Upload gagal.");
      }
      console.log("[✅] Gambar berhasil diupload!");
      return uploadResponse;
    } catch (err) {
      console.error("[❌] Gagal generate atau upload:", err);
      throw new Error("Gagal generate GhibliAI: " + err.message);
    }
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  if (!params.prompt) {
    return res.status(400).json({
      error: "Prompt is required"
    });
  }
  const ghibliGen = new GhibliAIGen();
  try {
    const data = await ghibliGen.generate(params);
    return res.status(200).json(data);
  } catch (error) {
    console.error("[❌] API Handler Error:", error);
    res.status(500).json({
      error: "Error during Ghibli AI request: " + error.message
    });
  }
}