// ============================================================================
// Notification Service - Core Business Logic
// ============================================================================

// parking-management-system/services/notification-service/src/services/notification.service.ts

import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
  Inject,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, FindOptionsWhere, Like } from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';

import {
  Notification,
  NotificationType,
  NotificationStatus,
  NotificationPriority,
} from '../entities/notification.entity';
import { NotificationLog } from '../entities/notification-log.entity';
import { Device } from '../entities/device.entity';
import { TemplateService } from './template.service';
import { PreferenceService } from './preference.service';
import {
  CreateNotificationDto,
  SendNotificationDto,
  NotificationResponseDto,
  NotificationListQueryDto,
} from '../dto';
import { NotificationCreatedEvent, NotificationSentEvent } from '../events';

@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);

  constructor(
    @InjectRepository(Notification)
    private notificationRepository: Repository<Notification>,
    @InjectRepository(NotificationLog)
    private logRepository: Repository<NotificationLog>,
    @InjectRepository(Device)
    private deviceRepository: Repository<Device>,
    private templateService: TemplateService,
    private preferenceService: PreferenceService,
    private eventEmitter: EventEmitter2,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
    @InjectQueue('email') private emailQueue: Queue,
    @InjectQueue('push') private pushQueue: Queue,
    @InjectQueue('sms') private smsQueue: Queue,
  ) {}

  // ============================================================================
  // Notification Management
  // ============================================================================

  async createNotification(
    userId: string,
    createDto: CreateNotificationDto,
  ): Promise<NotificationResponseDto> {
    this.logger.log(`Creating notification for user ${userId}`);

    // Validate template if provided
    if (createDto.template_id) {
      const template = await this.templateService.getTemplate(createDto.template_id);
      if (!template) {
        throw new NotFoundException(`Template with ID ${createDto.template_id} not found`);
      }
    }

    // Create notification
    const notification = this.notificationRepository.create({
      ...createDto,
      user_id: userId,
      status: NotificationStatus.PENDING,
      created_at: new Date(),
    });

    const savedNotification = await this.notificationRepository.save(notification);

    // Emit event
    this.eventEmitter.emit(
      'notification.created',
      new NotificationCreatedEvent(savedNotification.id, userId, savedNotification),
    );

    // Queue notification for delivery
    await this.queueNotification(savedNotification);

    return this.toResponseDto(savedNotification);
  }

  async sendNotification(
    userId: string,
    sendDto: SendNotificationDto,
  ): Promise<NotificationResponseDto> {
    this.logger.log(`Sending notification to user ${userId}`);

    // Check user preferences
    const preferences = await this.preferenceService.getPreferences(userId);
    if (!preferences) {
      throw new BadRequestException('User preferences not found');
    }

    // Determine delivery channels
    const channels = this.getDeliveryChannels(sendDto.type, preferences);

    // Create notification
    const notification = this.notificationRepository.create({
      user_id: userId,
      type: sendDto.type,
      title: sendDto.title,
      message: sendDto.message,
      data: sendDto.data,
      channels,
      priority: sendDto.priority || NotificationPriority.NORMAL,
      status: NotificationStatus.PENDING,
      created_at: new Date(),
    });

    const savedNotification = await this.notificationRepository.save(notification);

    // Send through each channel
    await this.deliverNotification(savedNotification, channels);

    return this.toResponseDto(savedNotification);
  }

  async getNotifications(
    userId: string,
    query: NotificationListQueryDto,
  ): Promise<{ items: NotificationResponseDto[]; total: number }> {
    const where: FindOptionsWhere<Notification> = {
      user_id: userId,
    };

    if (query.type) {
      where.type = query.type;
    }

    if (query.status) {
      where.status = query.status;
    }

    if (query.is_read !== undefined) {
      where.is_read = query.is_read;
    }

    const [notifications, total] = await this.notificationRepository.findAndCount({
      where,
      order: {
        created_at: 'DESC',
      },
      skip: (query.page - 1) * query.limit,
      take: query.limit,
    });

    return {
      items: notifications.map((n) => this.toResponseDto(n)),
      total,
    };
  }

  async getNotification(
    userId: string,
    notificationId: string,
  ): Promise<NotificationResponseDto> {
    const notification = await this.notificationRepository.findOne({
      where: { id: notificationId, user_id: userId },
    });

    if (!notification) {
      throw new NotFoundException(`Notification with ID ${notificationId} not found`);
    }

    // Mark as read
    if (!notification.is_read) {
      notification.is_read = true;
      notification.read_at = new Date();
      await this.notificationRepository.save(notification);
    }

    return this.toResponseDto(notification);
  }

  async markAsRead(userId: string, notificationId: string): Promise<void> {
    const notification = await this.notificationRepository.findOne({
      where: { id: notificationId, user_id: userId },
    });

    if (!notification) {
      throw new NotFoundException(`Notification with ID ${notificationId} not found`);
    }

    notification.is_read = true;
    notification.read_at = new Date();
    await this.notificationRepository.save(notification);

    // Clear cache
    await this.clearCache(userId);
  }

  async markAllAsRead(userId: string): Promise<void> {
    await this.notificationRepository.update(
      { user_id: userId, is_read: false },
      { is_read: true, read_at: new Date() },
    );

    // Clear cache
    await this.clearCache(userId);
  }

  async deleteNotification(userId: string, notificationId: string): Promise<void> {
    const notification = await this.notificationRepository.findOne({
      where: { id: notificationId, user_id: userId },
    });

    if (!notification) {
      throw new NotFoundException(`Notification with ID ${notificationId} not found`);
    }

    await this.notificationRepository.remove(notification);

    // Clear cache
    await this.clearCache(userId);
  }

  async deleteAllNotifications(userId: string): Promise<void> {
    await this.notificationRepository.delete({ user_id: userId });

    // Clear cache
    await this.clearCache(userId);
  }

  // ============================================================================
  // Notification Delivery
  // ============================================================================

  private async queueNotification(notification: Notification): Promise<void> {
    const channels = notification.channels || ['push', 'email'];

    for (const channel of channels) {
      switch (channel) {
        case 'email':
          await this.emailQueue.add('send-email', {
            notificationId: notification.id,
            userId: notification.user_id,
          });
          break;
        case 'push':
          await this.pushQueue.add('send-push', {
            notificationId: notification.id,
            userId: notification.user_id,
          });
          break;
        case 'sms':
          await this.smsQueue.add('send-sms', {
            notificationId: notification.id,
            userId: notification.user_id,
          });
          break;
        default:
          this.logger.warn(`Unknown channel: ${channel}`);
      }
    }
  }

  private async deliverNotification(
    notification: Notification,
    channels: string[],
  ): Promise<void> {
    const deliveryResults = [];

    for (const channel of channels) {
      try {
        const result = await this.sendViaChannel(notification, channel);
        deliveryResults.push({
          channel,
          success: result,
          timestamp: new Date(),
        });
      } catch (error) {
        this.logger.error(`Failed to send via ${channel}: ${error.message}`);
        deliveryResults.push({
          channel,
          success: false,
          error: error.message,
          timestamp: new Date(),
        });
      }
    }

    // Update notification status
    const allSuccessful = deliveryResults.every((r) => r.success);
    notification.status = allSuccessful ? NotificationStatus.SENT : NotificationStatus.FAILED;
    notification.sent_at = new Date();
    notification.delivery_results = deliveryResults;
    await this.notificationRepository.save(notification);

    // Log delivery
    await this.logDelivery(notification, deliveryResults);

    // Emit event
    this.eventEmitter.emit(
      'notification.sent',
      new NotificationSentEvent(notification.id, notification.user_id, {
        channels: deliveryResults,
        status: notification.status,
      }),
    );
  }

  private async sendViaChannel(
    notification: Notification,
    channel: string,
  ): Promise<boolean> {
    switch (channel) {
      case 'email':
        return this.sendEmail(notification);
      case 'push':
        return this.sendPush(notification);
      case 'sms':
        return this.sendSms(notification);
      default:
        throw new Error(`Unsupported channel: ${channel}`);
    }
  }

  private async sendEmail(notification: Notification): Promise<boolean> {
    // Implementation would use nodemailer or email service
    this.logger.log(`Sending email notification ${notification.id}`);
    return true;
  }

  private async sendPush(notification: Notification): Promise<boolean> {
    // Implementation would use Expo or Firebase Cloud Messaging
    this.logger.log(`Sending push notification ${notification.id}`);
    return true;
  }

  private async sendSms(notification: Notification): Promise<boolean> {
    // Implementation would use Twilio or SMS service
    this.logger.log(`Sending SMS notification ${notification.id}`);
    return true;
  }

  private async logDelivery(
    notification: Notification,
    deliveryResults: any[],
  ): Promise<void> {
    const log = this.logRepository.create({
      notification_id: notification.id,
      user_id: notification.user_id,
      type: notification.type,
      channels: deliveryResults,
      status: notification.status,
      sent_at: notification.sent_at,
    });

    await this.logRepository.save(log);
  }

  // ============================================================================
  // Helper Methods
  // ============================================================================

  private getDeliveryChannels(
    type: NotificationType,
    preferences: any,
  ): string[] {
    const channels = [];

    if (preferences.email_enabled && this.shouldSendViaEmail(type, preferences)) {
      channels.push('email');
    }

    if (preferences.push_enabled && this.shouldSendViaPush(type, preferences)) {
      channels.push('push');
    }

    if (preferences.sms_enabled && this.shouldSendViaSms(type, preferences)) {
      channels.push('sms');
    }

    return channels;
  }

  private shouldSendViaEmail(type: NotificationType, preferences: any): boolean {
    // Check email preferences per notification type
    return true;
  }

  private shouldSendViaPush(type: NotificationType, preferences: any): boolean {
    // Check push preferences per notification type
    return true;
  }

  private shouldSendViaSms(type: NotificationType, preferences: any): boolean {
    // Check SMS preferences per notification type
    return true;
  }

  private toResponseDto(notification: Notification): NotificationResponseDto {
    return {
      id: notification.id,
      user_id: notification.user_id,
      type: notification.type,
      title: notification.title,
      message: notification.message,
      data: notification.data,
      channels: notification.channels,
      priority: notification.priority,
      status: notification.status,
      is_read: notification.is_read,
      read_at: notification.read_at,
      sent_at: notification.sent_at,
      created_at: notification.created_at,
    };
  }

  private async clearCache(userId: string): Promise<void> {
    const keys = await this.cacheManager.store.keys(`notifications:${userId}:*`);
    for (const key of keys) {
      await this.cacheManager.del(key);
    }
  }
}