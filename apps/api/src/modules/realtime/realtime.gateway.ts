import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';

@WebSocketGateway({
  cors: {
    origin: '*',
  },
})
export class RealtimeGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(RealtimeGateway.name);

  handleConnection(client: Socket) {
    this.logger.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  @SubscribeMessage('join_job')
  handleJoinJob(@ConnectedSocket() client: Socket, @MessageBody() jobId: string) {
    client.join(`job_${jobId}`);
    this.logger.log(`Client ${client.id} joined job room: job_${jobId}`);
    return { event: 'joined_job', jobId };
  }

  @SubscribeMessage('join_shop')
  handleJoinShop(@ConnectedSocket() client: Socket, @MessageBody() shopId: string) {
    client.join(`shop_${shopId}`);
    this.logger.log(`Client ${client.id} joined shop room: shop_${shopId}`);
    return { event: 'joined_shop', shopId };
  }

  emitJobUpdate(jobId: string, shopId: string, data: any) {
    if (this.server) {
      this.server.to(`job_${jobId}`).emit('job.updated', data);
      this.server.to(`shop_${shopId}`).emit('shop.job_updated', data);
    }
  }

  emitNewJob(shopId: string, data: any) {
    if (this.server) {
      this.server.to(`shop_${shopId}`).emit('shop.new_job', data);
    }
  }

  emitPaymentUpdate(jobId: string, shopId: string, data: any) {
    if (this.server) {
      this.server.to(`job_${jobId}`).emit('payment.updated', data);
      this.server.to(`shop_${shopId}`).emit('shop.payment_updated', data);
    }
  }

  emitAgentUpdate(shopId: string, data: any) {
    if (this.server) {
      this.server.to(`shop_${shopId}`).emit('agent.updated', data);
    }
  }

  emitCleanupCompleted(jobId: string, shopId: string) {
    if (this.server) {
      this.server.to(`job_${jobId}`).emit('cleanup.completed', { jobId, status: 'FILES_DELETED' });
      this.server.to(`shop_${shopId}`).emit('shop.cleanup_completed', { jobId, status: 'FILES_DELETED' });
    }
  }
}
