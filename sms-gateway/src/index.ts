import express from "express";
import helmet from "helmet";
import cors from "cors";
import axios from "axios";
import { z } from "zod";
import dotenv from "dotenv";

dotenv.config();

const app = express();

app.use(helmet());
app.use(cors({ origin: false }));
app.use(express.json({ limit: "64kb" }));

const PORT = Number(process.env.PORT || 8080);
const GATEWAY_SECRET = process.env.WATHIQCARE_SMS_GATEWAY_SECRET;
const TAQNYAT_BEARER_TOKEN = process.env.TAQNYAT_BEARER_TOKEN;
const TAQNYAT_SENDER = process.env.TAQNYAT_SENDER || "WATHIQID";
const TAQNYAT_API_URL = process.env.TAQNYAT_API_URL || "https://api.taqnyat.sa/v1/messages";

if (!GATEWAY_SECRET || !TAQNYAT_BEARER_TOKEN) {
  throw new Error("Missing required SMS gateway environment variables.");
}

const SendSmsSchema = z.object({
  mobile: z.string().regex(/^9665\d{8}$/),
  message: z.string().min(4).max(500),
  referenceId: z.string().optional()
});

app.get("/health", (_req, res) => {
  res.status(200).json({
    ok: true,
    service: "wathiqcare-static-ip-sms-gateway"
  });
});

app.post("/v1/sms/send", async (req, res) => {
  try {
    const secret = req.header("x-wathiqcare-sms-secret");

    if (!secret || secret !== GATEWAY_SECRET) {
      return res.status(401).json({ ok: false, error: "Unauthorized" });
    }

    const payload = SendSmsSchema.parse(req.body);

    const taqnyatResponse = await axios.post(
      TAQNYAT_API_URL,
      {
        recipients: [payload.mobile],
        body: payload.message,
        sender: TAQNYAT_SENDER
      },
      {
        headers: {
          Authorization: `Bearer ${TAQNYAT_BEARER_TOKEN}`,
          "Content-Type": "application/json"
        },
        timeout: 15000
      }
    );

    return res.status(200).json({
      ok: true,
      provider: "taqnyat",
      referenceId: payload.referenceId || null,
      providerResponse: taqnyatResponse.data
    });
  } catch (error: any) {
    const status = error?.response?.status || 500;

    return res.status(status).json({
      ok: false,
      error: "SMS_SEND_FAILED",
      details: error?.response?.data || error?.message
    });
  }
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`WathiqCare SMS Gateway running on port ${PORT}`);
});
