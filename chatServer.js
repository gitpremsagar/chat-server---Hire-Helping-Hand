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

const makeQueryToDB = require("./modules/makeQueryToDB");

let onlineUsersMap = {};

io.on("connection", (socket) => {
  // insert newly connected user in the array
  socket.on("Submit User ID", async (userID) => {
    onlineUsersMap[userID] = {
      online: true,
      socketID: socket.id,
    };
    console.log(onlineUsersMap);

    // insert the connected user into `online_users` table
    try {
      const sql = `INSERT INTO online_users (
        user_id,
        is_online,
        user_type,
        last_online,
        socket_id
        ) VALUES (?,?,?,NOW(), ?);`;
      const params = [userID, true, "freelancer", socket.id];
      const [rows] = await makeQueryToDB(sql, params);
      console.log(rows);
    } catch (error) {
      console.log(error);
    }
  });

  socket.on("disconnect", async () => {
    console.log(`user with socket.id = ${socket.id} got disconnected!`);
    // delete the disconnected user from the `online_users` table
    try {
      const sql = `DELETE from online_users WHERE socket_id=?`;
      const params = [socket.id];
      const [rows] = await makeQueryToDB(sql, params);
      console.log(rows);
    } catch (error) {
      console.log(error);
    }

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
