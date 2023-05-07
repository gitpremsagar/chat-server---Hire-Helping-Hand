require("dotenv").config();
const app = require("express")();
const { createServer } = require("http");
const { Server } = require("socket.io");

const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: process.env.FRONTEND_DOMAIN,
    methods: ["GET", "POST"],
  },
});

io.on("connection", (socket) => {
  console.log("a user connected with socket.id = ", socket.id);
  socket.emit("greet", `welcome socket.id: ${socket.id}`);

  socket.on("disconnect", (socket) => {
    console.log(`user with socket.id = ${socket.id} got disconnected!`);
  });
});

app.get("/", (req, res) => {
  res.send("express server is up and running");
});

const port = process.env.PORT || 3015;
httpServer.listen(port, () => {
  console.log(`Chat Server Started and listening on port ${port}`);
});
