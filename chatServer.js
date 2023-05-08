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

let onlineUser = [];
let onlineUsersMap = {};

io.on("connection", (socket) => {
  // insert newly connected user in the array
  socket.on("Submit User ID", (userID) => {
    onlineUsersMap[userID] = {
      online: true,
      socketID: socket.id,
    };

    console.log(onlineUsersMap);
  });

  socket.on("disconnect", () => {
    console.log(`user with socket.id = ${socket.id} got disconnected!`);
    io.emit(
      "a user disconnected",
      `a user with socket.id = ${socket.id} got disconnected`
    );
  });
});

app.get("/", (req, res) => {
  res.send("express server is up and running");
});

const port = process.env.PORT || 3015;
httpServer.listen(port, () => {
  console.log(`Chat Server Started and listening on port ${port}`);
});
