import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  getHealth(): object {
    return {
      status: 'success',
      message: 'EventHub API is running',
      timestamp: new Date().toISOString(),
      version: '1.0.0',
    };
  }
}
