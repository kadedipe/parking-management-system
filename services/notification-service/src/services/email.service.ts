// ============================================================================
// Email Service - Email Sending Service
// ============================================================================

// parking-management-system/services/notification-service/src/services/email.service.ts

import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import * as handlebars from 'handlebars';
import * as path from 'path';
import * as fs from 'fs';
import { EmailOptions, EmailAttachment } from '../interfaces/email.interface';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private transporter: nodemailer.Transporter;
  private templates: Map<string, handlebars.TemplateFunction> = new Map();

  constructor(private configService: ConfigService) {
    this.initializeTransporter();
    this.loadTemplates();
  }

  private initializeTransporter(): void {
    const host = this.configService.get('EMAIL_HOST');
    const port = this.configService.get('EMAIL_PORT');
    const user = this.configService.get('EMAIL_USER');
    const pass = this.configService.get('EMAIL_PASS');
    const secure = this.configService.get('EMAIL_SECURE', 'true') === 'true';

    this.transporter = nodemailer.createTransport({
      host,
      port: parseInt(port, 10),
      secure,
      auth: {
        user,
        pass,
      },
      tls: {
        rejectUnauthorized: false,
      },
    });
  }

  private loadTemplates(): void {
    const templateDir = path.join(__dirname, '../../templates/email');
    const files = fs.readdirSync(templateDir);

    for (const file of files) {
      if (file.endsWith('.hbs')) {
        const templateName = file.replace('.hbs', '');
        const content = fs.readFileSync(path.join(templateDir, file), 'utf8');
        this.templates.set(templateName, handlebars.compile(content));
      }
    }
  }

  async sendEmail(options: EmailOptions): Promise<void> {
    this.logger.log(`Sending email to ${options.to}`);

    try {
      const mailOptions = {
        from: options.from || this.configService.get('EMAIL_FROM'),
        to: options.to,
        cc: options.cc,
        bcc: options.bcc,
        subject: options.subject,
        html: options.html,
        text: options.text,
        attachments: options.attachments,
        replyTo: options.replyTo,
        headers: options.headers,
      };

      const info = await this.transporter.sendMail(mailOptions);
      this.logger.log(`Email sent: ${info.messageId}`);
    } catch (error) {
      this.logger.error(`Failed to send email: ${error.message}`);
      throw error;
    }
  }

  async sendTemplatedEmail(
    templateName: string,
    to: string,
    data: Record<string, any>,
    subject: string,
    options?: Partial<EmailOptions>,
  ): Promise<void> {
    const template = this.templates.get(templateName);
    if (!template) {
      throw new Error(`Template ${templateName} not found`);
    }

    const html = template(data);
    const text = this.generateTextFromHtml(html);

    await this.sendEmail({
      to,
      subject,
      html,
      text,
      ...options,
    });
  }

  private generateTextFromHtml(html: string): string {
    // Remove HTML tags for plain text version
    return html.replace(/<[^>]*>/g, '');
  }

  async sendVerificationEmail(to: string, token: string): Promise<void> {
    await this.sendTemplatedEmail(
      'verify-email',
      to,
      {
        token,
        verificationLink: `${this.configService.get('APP_URL')}/verify-email/${token}`,
      },
      'Verify Your Email Address',
    );
  }

  async sendPasswordResetEmail(to: string, token: string): Promise<void> {
    await this.sendTemplatedEmail(
      'reset-password',
      to,
      {
        token,
        resetLink: `${this.configService.get('APP_URL')}/reset-password/${token}`,
      },
      'Reset Your Password',
    );
  }

  async sendBookingConfirmationEmail(
    to: string,
    booking: any,
  ): Promise<void> {
    await this.sendTemplatedEmail(
      'booking-confirmation',
      to,
      {
        booking,
        bookingLink: `${this.configService.get('APP_URL')}/bookings/${booking.id}`,
      },
      'Booking Confirmation',
    );
  }

  async sendPaymentReceiptEmail(
    to: string,
    payment: any,
  ): Promise<void> {
    await this.sendTemplatedEmail(
      'payment-receipt',
      to,
      {
        payment,
        receiptLink: `${this.configService.get('APP_URL')}/payments/${payment.id}`,
      },
      'Payment Receipt',
    );
  }
}