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
    language: "en",
    smart_format: true,
    punctuate: true,
    diarize: true,
    interim_results: true
  });

  dgSocket.on("open", () => console.log("Deepgram socket opened"));

  dgSocket.on("transcript", (data) => {
    // Send transcript back to frontend
    clientSocket.send(JSON.stringify(data));
  });

  dgSocket.on("error", (err) => {
    console.error("Deepgram error:", err);
  });

  clientSocket.on("message", (audioChunk) => {
    // Forward audio chunk to Deepgram
    if (dgSocket.getReadyState() === 1) {
      dgSocket.send(audioChunk);
    }
  });

  clientSocket.on("close", () => {
    console.log("Client disconnected");
    try {
      dgSocket.finish();
    } catch (e) {}
  });
});
