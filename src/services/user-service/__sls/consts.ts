import {
    USER_EVENTS_QUEUE_DEFAULT,
    USER_EVENTS_TOPIC_DEFAULT,
    USERS_TABLE_DEFAULT,
} from '@constants/service.const';

export const USERS_TABLE = process.env.USERS_TABLE_NAME ?? USERS_TABLE_DEFAULT;
export const USERS_TABLE_RESOURCE = 'UsersTable';

export const USER_EVENTS_QUEUE = process.env.USER_EVENTS_QUEUE_NAME ?? USER_EVENTS_QUEUE_DEFAULT;
export const USER_EVENTS_QUEUE_RESOURCE = 'UserEventsQueue';

export const USER_EVENTS_TOPIC = process.env.USER_EVENTS_TOPIC_NAME ?? USER_EVENTS_TOPIC_DEFAULT;
export const USER_EVENTS_TOPIC_RESOURCE = 'UserEventsTopic';
