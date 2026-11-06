import { createServer } from 'http';
import { Server } from 'socket.io';

const PORT = process.env.REALTIME_PORT ? parseInt(process.env.REALTIME_PORT, 10) : 4000;
const httpServer = createServer();

const io = new Server(httpServer, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
});

io.on('connection', (socket) => {
  console.log(`[Realtime] Client connecté: ${socket.id}`);

  // Abonnement aux canaux (team-{id}, project-{id}, task-{id})
  socket.on('join_channel', (channel: string) => {
    socket.join(channel);
    console.log(`[Realtime] ${socket.id} a rejoint le canal: ${channel}`);
  });

  socket.on('leave_channel', (channel: string) => {
    socket.leave(channel);
    console.log(`[Realtime] ${socket.id} a quitté le canal: ${channel}`);
  });

  // Événements temps réel (convention du cahier des charges: <ressource>.<action>)
  socket.on('task.moved', (payload) => {
    const channel = `project-${payload.projectId}`;
    socket.to(channel).emit('task.moved', payload);
  });

  socket.on('task.updated', (payload) => {
    const channel = `project-${payload.projectId}`;
    socket.to(channel).emit('task.updated', payload);
  });

  socket.on('message.created', (payload) => {
    const channel = `project-${payload.projectId}`;
    socket.to(channel).emit('message.created', payload);
  });

  socket.on('disconnect', () => {
    console.log(`[Realtime] Client déconnecté: ${socket.id}`);
  });
});

httpServer.listen(PORT, () => {
  console.log(`⚡ Serveur auxiliaire Socket.IO démarré sur http://localhost:${PORT}`);
});
