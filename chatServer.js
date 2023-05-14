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

async function insertOrUpdateConnectedUserToOnlineUsersTable(userID, socketID) {
  // insert the connected user into `online_users` table
  try {
    const selectStatement = `SELECT user_id from online_users WHERE user_id=?;`;
    const selectStatementParams = [userID];
    const [result] = await makeQueryToDB(
      selectStatement,
      selectStatementParams
    );
    console.log("select result = ", result);
    if (result.length > 0) {
      // update the info by userID
      const updateStatement = `UPDATE online_users 
      SET 
        is_online = ?,
        last_online = now(),
        socket_id = ?,
        is_connected_to_chat_server = ?
      WHERE user_id = ?;`;
      const updateStatementParams = [true, socketID, true, userID];
      const [rows] = await makeQueryToDB(
        updateStatement,
        updateStatementParams
      );
      console.log("updated row = ", rows);
    } else {
      // insert the info
      const sql = `INSERT INTO online_users (
        id,
        user_id,
        is_online,
        user_type,
        last_online,
        socket_id,
        is_connected_to_chat_server
      ) VALUES (DEFAULT, ?, ?, ?, NOW(), ?, ?);`;
      const params = [userID, true, "freelancer", socketID, true];
      const [rows] = await makeQueryToDB(sql, params);
      console.log("insert result = ", rows);
    }
  } catch (error) {
    console.log(error);
  }
}

async function deleteDisconnectedUserFromOnlineUsersTable(socketID) {
  console.log(`user with socket.id = ${socketID} got disconnected!`);
  // delete the disconnected user from the `online_users` table by socketID
  try {
    const sql = `UPDATE online_users 
    SET 
    socket_id = ?,
    is_connected_to_chat_server = ?
    WHERE socket_id = ? `;
    const params = [null, false, socketID];
    const [rows] = await makeQueryToDB(sql, params);
    console.log("delete result", rows);
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
  socket.on("update-online-users-table", async (userID) => {
    insertOrUpdateConnectedUserToOnlineUsersTable(userID, socket.id);
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
