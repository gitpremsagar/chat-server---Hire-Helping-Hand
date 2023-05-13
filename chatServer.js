require("dotenv").config();
const app = require("express")();
const { createServer } = require("http");
const { Server } = require("socket.io");
const makeQueryToDB = require("./modules/makeQueryToDB");
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: process.env.FRONTEND_DOMAIN,
    methods: ["GET", "POST"],
  },
});

async function insertConnectedUserToOnlineUsersTable(userID, socktID) {
  // insert the connected user into `online_users` table
  try {
    const sql = `INSERT INTO online_users (
      user_id,
      is_online,
      user_type,
      last_online,
      socket_id
      ) VALUES (?,?,?,NOW(), ?);`;
    const params = [userID, true, "freelancer", socktID];
    const [rows] = await makeQueryToDB(sql, params);
    console.log(rows);
  } catch (error) {
    console.log(error);
  }
}

async function deleteDisconnectedUserFromOnlineUsersTable(socktID) {
  console.log(`user with socket.id = ${socktID} got disconnected!`);
  // delete the disconnected user from the `online_users` table
  try {
    const sql = `DELETE from online_users WHERE socket_id=?`;
    const params = [socktID];
    const [rows] = await makeQueryToDB(sql, params);
    console.log(rows);
  } catch (error) {
    console.log(error);
  }
}

async function sendMessageToRecipientSocketID(incommingMessage) {
  let recipientSocketId = incommingMessage.toSocketID;

  //try to fetch recipient socket.id from API if its not provided by the sender
  if (!recipientSocketId) {
    // check is recipient online?
    try {
      const sql = `SELECT socket_id FROM online_users where user_id = ?`;
      const params = [incommingMessage.senderUserID];
      const [rows] = await makeQueryToDB(sql, params);
      console.log(rows);
      // FIXME: multiple duplicate rows having same userID are present in online_users table

      if (rows.fieldCount === 1) {
        // recipient is online so:
        //1. TODO: set `recipientSocketId`

        //2. sendback recipient's socket.id to sender so that real time chat can be implemented
        io.to(incommingMessage.senderSocketID).emit("set-recipient-socket-id", {
          recipientSocketId,
          recipientUserID: incommingMessage.toUserID,
        });

        // 3. TODO: send message to fetched `recipientSocketId` from db
        const outgoingMessage = {
          message: incommingMessage.message,
          senderSocketID: incommingMessage.senderSocketID,
          senderUserID: incommingMessage.senderUserID,
        };
        io.to(recipientSocketId).emit("new-message", outgoingMessage);
      }
    } catch (error) {
      console.log(error);
    }

    if (!recipientSocketId) return; //return if recipient is not online

    // else return false
  } else {
    //recipient socket.id is provided by the sender so:
    // TODO: send message to `recipientSocketId`
    const outgoingMessage = {
      message: incommingMessage.message,
      senderSocketID: incommingMessage.senderSocketID,
      senderUserID: incommingMessage.senderUserID,
    };
    io.to(recipientSocketId).emit("new-message", outgoingMessage);
  }
}

// TODO:
async function saveMessageInDataBase() {}

io.on("connection", (socket) => {
  // when any newly connected user submits her userID do the following
  socket.on("Submit User ID", async (userID) => {
    insertConnectedUserToOnlineUsersTable(userID, socket.id);
  });

  // whenever somebody gets diconnected then remove her from online_users table
  socket.on("disconnect", async () => {
    deleteDisconnectedUserFromOnlineUsersTable(socket.id);

    // notify all online users that someone having current `socket.id` got disconnected/Offline
    io.emit(
      "a user disconnected",
      `a user with socket.id = ${socket.id} got disconnected`
    );
  });

  socket.on("send-message", (incommingMessage) => {
    sendMessageToRecipientSocketID(incommingMessage);
    saveMessageInDataBase();
  });
});

app.get("/", (req, res) => {
  res.send("express server is up and running");
});

const port = process.env.PORT || 3015;
httpServer.listen(port, () => {
  console.log(`Chat Server Started and listening on port ${port}`);
});
