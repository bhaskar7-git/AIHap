import { io, Socket } from 'socket.io-client';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000';

class SocketClient {
  private socket: Socket | null = null;

  public connect(): Socket {
    if (!this.socket) {
      this.socket = io(SOCKET_URL, {
        transports: ['websocket', 'polling'],
        reconnectionAttempts: 10,
        reconnectionDelay: 1000,
      });

      this.socket.on('connect', () => {
        console.log('⚡ Connected to SmartQueue real-time engine:', this.socket?.id);
      });

      this.socket.on('disconnect', () => {
        console.log('⚡ Disconnected from SmartQueue real-time engine');
      });
    }
    return this.socket;
  }

  public getSocket(): Socket {
    if (!this.socket) {
      return this.connect();
    }
    return this.socket;
  }

  public joinDoctorQueue(doctorId: string) {
    this.getSocket().emit('join_doctor_queue', doctorId);
  }

  public leaveDoctorQueue(doctorId: string) {
    this.getSocket().emit('leave_doctor_queue', doctorId);
  }

  public joinUserRoom(userId: string) {
    this.getSocket().emit('join_user_room', userId);
  }

  public joinAdminRoom() {
    this.getSocket().emit('join_admin_room');
  }
}

export const socketClient = new SocketClient();
