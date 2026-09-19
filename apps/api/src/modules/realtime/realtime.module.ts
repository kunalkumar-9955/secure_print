import { Module, Global } from '@nestjs/common';
import { RealtimeGateway } from './realtime.gateway';

@Global()
@Module({
  providers: [RealtimeGateway],
  exports: [RealtimeGateway],
})
export class RealtimeModule {}
