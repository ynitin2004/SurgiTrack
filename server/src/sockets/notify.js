// Thin wrapper around the Socket.IO server so controllers can push events
// without importing the server. Rooms:
//   admins            every connected admin
//   surgeon:<id>      sockets of the account linked to that surgeon_info _id
//   user:<id>         every socket of one account (used to force-logout)
let io = null;

const notify = {
  attach(server) {
    io = server;
  },
  admins(event, payload) {
    io?.to('admins').emit(event, payload);
  },
  surgeon(surgeonId, event, payload) {
    if (surgeonId) io?.to(`surgeon:${surgeonId}`).emit(event, payload);
  },
  user(userId, event, payload) {
    io?.to(`user:${userId}`).emit(event, payload);
  },
  disconnectUser(userId) {
    io?.in(`user:${userId}`).disconnectSockets(true);
  },
};

module.exports = notify;
