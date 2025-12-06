import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

@WebSocketGateway({
  cors: {
    origin: '*', // Configure this based on your frontend URL
    credentials: true,
  },
  namespace: '/events',
})
export class EventsGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(EventsGateway.name);

  constructor(private readonly jwtService: JwtService) {}

  afterInit() {
    this.logger.log('WebSocket Gateway initialized');
  }

  async handleConnection(client: Socket) {
    try {
      // Extract token from handshake auth or query
      const token = client.handshake.auth.token || client.handshake.query.token;

      if (token) {
        // Verify JWT token
        const payload = await this.jwtService.verifyAsync(token as string);
        client.data.user = payload;
        this.logger.log(`Client connected: ${client.id} (User: ${payload.sub})`);
      } else {
        this.logger.log(`Client connected: ${client.id} (Anonymous)`);
      }
    } catch (error) {
      this.logger.warn(`Invalid token for client: ${client.id}`);
    }
  }

  handleDisconnect(client: Socket) {
    const userId = client.data.user?.sub || 'Anonymous';
    this.logger.log(`Client disconnected: ${client.id} (User: ${userId})`);
  }

  // Subscribe to specific event updates
  @SubscribeMessage('subscribe:event')
  handleSubscribeToEvent(@ConnectedSocket() client: Socket, @MessageBody() eventId: string) {
    client.join(`event:${eventId}`);
    this.logger.log(`Client ${client.id} subscribed to event: ${eventId}`);
    return { event: 'subscribed', data: { eventId } };
  }

  // Unsubscribe from event updates
  @SubscribeMessage('unsubscribe:event')
  handleUnsubscribeFromEvent(@ConnectedSocket() client: Socket, @MessageBody() eventId: string) {
    client.leave(`event:${eventId}`);
    this.logger.log(`Client ${client.id} unsubscribed from event: ${eventId}`);
    return { event: 'unsubscribed', data: { eventId } };
  }

  // Subscribe to user's bookings
  @SubscribeMessage('subscribe:user:bookings')
  handleSubscribeToUserBookings(@ConnectedSocket() client: Socket) {
    const userId = client.data.user?.sub;
    if (!userId) {
      return { event: 'error', data: { message: 'Authentication required' } };
    }

    client.join(`user:${userId}:bookings`);
    this.logger.log(`Client ${client.id} subscribed to user bookings: ${userId}`);
    return { event: 'subscribed', data: { userId } };
  }

  // Emit ticket availability update for specific event
  emitTicketAvailabilityUpdate(eventId: string, ticketTypeId: string, available: number) {
    this.server.to(`event:${eventId}`).emit('ticket:availability', {
      eventId,
      ticketTypeId,
      available,
      timestamp: new Date().toISOString(),
    });
    this.logger.log(`Emitted ticket availability update for event: ${eventId}`);
  }

  // Emit booking created notification
  emitBookingCreated(userId: string, booking: any) {
    this.server.to(`user:${userId}:bookings`).emit('booking:created', {
      booking,
      timestamp: new Date().toISOString(),
    });
    this.logger.log(`Emitted booking created notification for user: ${userId}`);
  }

  // Emit booking updated notification
  emitBookingUpdated(userId: string, booking: any) {
    this.server.to(`user:${userId}:bookings`).emit('booking:updated', {
      booking,
      timestamp: new Date().toISOString(),
    });
    this.logger.log(`Emitted booking updated notification for user: ${userId}`);
  }

  // Emit booking cancelled notification
  emitBookingCancelled(userId: string, bookingId: string) {
    this.server.to(`user:${userId}:bookings`).emit('booking:cancelled', {
      bookingId,
      timestamp: new Date().toISOString(),
    });
    this.logger.log(`Emitted booking cancelled notification for user: ${userId}`);
  }

  // Emit event updated notification
  emitEventUpdated(eventId: string, event: any) {
    this.server.to(`event:${eventId}`).emit('event:updated', {
      event,
      timestamp: new Date().toISOString(),
    });
    this.logger.log(`Emitted event updated notification for event: ${eventId}`);
  }

  // Emit event cancelled notification
  emitEventCancelled(eventId: string) {
    this.server.to(`event:${eventId}`).emit('event:cancelled', {
      eventId,
      timestamp: new Date().toISOString(),
    });
    this.logger.log(`Emitted event cancelled notification for event: ${eventId}`);
  }

  // Broadcast message to all connected clients
  broadcastMessage(event: string, data: any) {
    this.server.emit(event, data);
    this.logger.log(`Broadcasted message: ${event}`);
  }
}
