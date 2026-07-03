import {
    USER_EVENTS_QUEUE_DEFAULT,
    USER_EVENTS_QUEUE_RESOURCE,
} from './const';
import * as SLS from '../../../sls.defaults';

export const USER_EVENTS_QUEUE = process.env.USER_EVENTS_QUEUE_NAME ?? USER_EVENTS_QUEUE_DEFAULT;

export const userEventsQueue = SLS.queue({
    name: USER_EVENTS_QUEUE,
    resourceName: USER_EVENTS_QUEUE_RESOURCE,
});
