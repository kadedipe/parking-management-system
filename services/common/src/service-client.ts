// ============================================================================
// Service Communication - Microservice Communication
// ============================================================================

// parking-management-system/services/common/src/service-client.ts

import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ClientProxy, ClientProxyFactory, Transport } from '@nestjs/microservices';
import { firstValueFrom } from 'rxjs';
import { ServiceUnavailableException } from '@nestjs/common';

@Injectable()
export class ServiceClient implements OnModuleInit {
  private readonly logger = new Logger(ServiceClient.name);
  private serviceClients: Map<string, ClientProxy> = new Map();

  constructor(private configService: ConfigService) {}

  async onModuleInit() {
    await this.initializeClients();
  }

  private async initializeClients() {
    const services = [
      'parking',
      'booking',
      'payment',
      'user',
      'charging',
      'notification',
    ];

    for (const service of services) {
      const serviceUrl = this.configService.get(`SERVICES_${service.toUpperCase()}`);
      if (serviceUrl) {
        this.serviceClients.set(service, this.createClient(serviceUrl));
      }
    }
  }

  private createClient(serviceUrl: string): ClientProxy {
    return ClientProxyFactory.create({
      transport: Transport.REDIS,
      options: {
        host: this.configService.get('REDIS_HOST', 'redis'),
        port: this.configService.get('REDIS_PORT', 6379),
        password: this.configService.get('REDIS_PASSWORD', ''),
        retryAttempts: 3,
        retryDelay: 1000,
      },
    });
  }

  async send<T>(service: string, pattern: string, data: any): Promise<T> {
    const client = this.serviceClients.get(service);
    if (!client) {
      throw new ServiceUnavailableException(`Service ${service} not available`);
    }

    try {
      const result = await firstValueFrom(client.send(pattern, data));
      return result;
    } catch (error) {
      this.logger.error(`Error sending message to ${service}: ${error.message}`);
      throw new ServiceUnavailableException(`Service ${service} unavailable`);
    }
  }

  async emit(service: string, pattern: string, data: any): Promise<void> {
    const client = this.serviceClients.get(service);
    if (!client) {
      throw new ServiceUnavailableException(`Service ${service} not available`);
    }

    try {
      await firstValueFrom(client.emit(pattern, data));
    } catch (error) {
      this.logger.error(`Error emitting message to ${service}: ${error.message}`);
      throw new ServiceUnavailableException(`Service ${service} unavailable`);
    }
  }
}