import { v4 as uuidv4 } from 'uuid';
import { store } from '../db/store.js';
import { Notification, NotificationType } from '../types/index.js';

export interface ExternalNotificationProvider {
  sendSMS(to: string, message: string): Promise<boolean>;
  sendWhatsApp(to: string, message: string): Promise<boolean>;
}

class DemoExternalNotificationProvider implements ExternalNotificationProvider {
  async sendSMS(to: string, message: string): Promise<boolean> {
    console.log(`[SMS MOCK] To: ${to} | Message: "${message}"`);
    return true;
  }

  async sendWhatsApp(to: string, message: string): Promise<boolean> {
    console.log(`[WHATSAPP MOCK] To: ${to} | Message: "${message}"`);
    return true;
  }
}

class NotificationService {
  private externalProvider: ExternalNotificationProvider;

  constructor() {
    this.externalProvider = new DemoExternalNotificationProvider();
  }

  public async notifyUser(
    userId: string,
    title: string,
    message: string,
    type: NotificationType = 'INFO',
    userPhone?: string
  ): Promise<Notification> {
    const notification: Notification = {
      id: uuidv4(),
      user_id: userId,
      title,
      message,
      type,
      read: false,
      created_at: new Date().toISOString(),
    };

    await store.createNotification(notification);

    // Trigger mock SMS / WhatsApp if phone is known
    if (userPhone) {
      this.externalProvider.sendSMS(userPhone, `[SmartQueue] ${title}: ${message}`);
    }

    return notification;
  }
}

export const notificationService = new NotificationService();
