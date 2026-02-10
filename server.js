import WebSocket, { WebSocketServer } from "ws";
import { createClient } from "@deepgram/sdk";

const PORT = process.env.PORT || 10000;
const DEEPGRAM_API_KEY = process.env.DEEPGRAM_API_KEY;

if (!DEEPGRAM_API_KEY) {
  console.error("Missing DEEPGRAM_API_KEY env var");
  process.exit(1);
}

const deepgram = createClient(DEEPGRAM_API_KEY);

const wss = new WebSocketServer({ port: PORT });
console.log("WebSocket server running on port:", PORT);

wss.on("connection", async (clientSocket) => {
  console.log("Client connected");

  // Create Deepgram Live socket
  const dgSocket = await deepgram.listen.live({
    model: "nova-2",
    language: "en-US",
    punctuate: true,
    diarize: true,
    interim_results: true
  });

  dgSocket.on("open", () => console.log("Deepgram socket opened"));

  // Receive transcript from Deepgram
  dgSocket.on("message", (msg) => {
    try {
      const data = JSON.parse(msg.toString());
      // Only forward if transcript exists
      if (data.channel && data.channel[0]?.alternatives?.length) {
        clientSocket.send(JSON.stringify(data));
      }
    } catch (e) {
      console.error("Parse error:", e);
    }
  });

  dgSocket.on("error", (err) => console.error("Deepgram error:", err));

  // Receive audio chunks from frontend
  clientSocket.on("message", async (audioChunk) => {
    try {
      // audioChunk should be ArrayBuffer of PCM16 audio
      dgSocket.send(audioChunk);
    } catch (e) {
      console.error("Send audio error:", e);
    }
  });

  clientSocket.on("close", () => {
    console.log("Client disconnected");
    try {
      dgSocket.finish();
    } catch (e) {}
  });
});
