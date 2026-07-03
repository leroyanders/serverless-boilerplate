import type { EventBridgeJsonRequest } from '@lib/eventbridge';
import type { UserEventBridgeEvent } from '../interfaces/user-eventbridge-event.interface';

export type PublishEbhTestRequest = EventBridgeJsonRequest<UserEventBridgeEvent>;
