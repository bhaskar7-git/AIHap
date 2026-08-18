import { Server as SocketIOServer } from 'socket.io';
import { Server as HttpServer } from 'http';
import { config } from '../config/index.js';

class SocketService {
  private io: SocketIOServer | null = null;

  public init(httpServer: HttpServer): SocketIOServer {
    this.io = new SocketIOServer(httpServer, {
      cors: {
        origin: '*', // Allow frontend connection
        methods: ['GET', 'POST', 'PUT', 'DELETE'],
      },
    });

    this.io.on('connection', (socket) => {
      // Client joins a doctor queue room to receive real-time updates
      socket.on('join_doctor_queue', (doctorId: string) => {
        socket.join(`doctor_${doctorId}`);
      });

      socket.on('leave_doctor_queue', (doctorId: string) => {
        socket.leave(`doctor_${doctorId}`);
      });

      // Client joins their personal user room for direct alerts
      socket.on('join_user_room', (userId: string) => {
        socket.join(`user_${userId}`);
      });

      // Admin room for global queue monitoring
      socket.on('join_admin_room', () => {
        socket.join('admin_room');
      });

      socket.on('disconnect', () => {
        // Disconnected
      });
    });

    console.log('⚡ Socket.IO real-time engine initialized.');
    return this.io;
  }

  public getIO(): SocketIOServer | null {
    return this.io;
  }

  public emitQueueUpdate(doctorId: string, queueState: any) {
    if (!this.io) return;
    // Broadcast to the specific doctor's room
    this.io.to(`doctor_${doctorId}`).emit('QUEUE_UPDATED', queueState);
    // Broadcast to global admin room
    this.io.to('admin_room').emit('ADMIN_QUEUE_UPDATED', { doctorId, queueState });
    // Also broadcast a generic queue change event
    this.io.emit('GLOBAL_QUEUE_CHANGED', { doctorId });
  }

  public emitTokenStatus(userId: string, data: any) {
    if (!this.io) return;
    this.io.to(`user_${userId}`).emit('TOKEN_STATUS_UPDATED', data);
  }

  public emitNotification(userId: string, notification: any) {
    if (!this.io) return;
    this.io.to(`user_${userId}`).emit('NOTIFICATION_RECEIVED', notification);
  }
}

export const socketService = new SocketService();
