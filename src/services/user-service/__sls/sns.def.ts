import {
    USER_EVENTS_TOPIC_DEFAULT,
    USER_EVENTS_TOPIC_RESOURCE,
} from './const';
import * as SLS from '../../../sls.defaults';

export const USER_EVENTS_TOPIC = process.env.USER_EVENTS_TOPIC_NAME ?? USER_EVENTS_TOPIC_DEFAULT;

export const userEventsTopic = SLS.topic({
    name: USER_EVENTS_TOPIC,
    resourceName: USER_EVENTS_TOPIC_RESOURCE,
});
