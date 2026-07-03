// Service
export const SERVERLESS_USER_SERVICE_NAME = 'user-service';
export const SERVERLESS_USER_STACK = 'user';
export const SERVERLESS_USER_DOMAIN = SERVERLESS_USER_STACK;

// Function names
export const AUTHORIZER_FN = 'auth';
export const API_USER_LOGIN_FN = 'apiUserLogin';
export const QUEUE_SEND_QUEUE_MESSAGE_FN = 'testSendQueueMessage';
export const QUEUE_PUBLISH_TOPIC_MESSAGE_FN = 'testPublishTopicMessage';
export const QUEUE_HANDLE_QUEUE_MESSAGE_FN = 'testHandleQueueMessage';
export const QUEUE_HANDLE_TOPIC_MESSAGE_FN = 'testHandleTopicMessage';

// Handler paths
export const AUTHORIZER_HANDLER = 'authorizer.handler';
export const API_USER_LOGIN_HANDLER = 'handlers/api/user/login.handler';
export const QUEUE_SEND_QUEUE_MESSAGE_HANDLER = 'handlers/api/queue/publish-sqs.handler';
export const QUEUE_PUBLISH_TOPIC_MESSAGE_HANDLER = 'handlers/api/queue/publish-sns.handler';
export const QUEUE_HANDLE_QUEUE_MESSAGE_HANDLER = 'handlers/events/sqs/user-events.handler';
export const QUEUE_HANDLE_TOPIC_MESSAGE_HANDLER = 'handlers/events/sns/user-events.handler';

// Http
export const HTTP_GET_METHOD = 'GET';
export const HTTP_POST_METHOD = 'POST';
export const ROOT_HTTP_PATH = '/';
export const QUEUE_SQS_HTTP_PATH = '/queue/sqs';
export const QUEUE_SNS_HTTP_PATH = '/queue/sns';
export const REQUEST_AUTHORIZER_TYPE = 'request';

// Resources
export const SSM_USER_SERVICE_DOMAIN_RESOURCE = 'SSMAuthServiceDomain';
export const CFN_ARN_ATTRIBUTE = 'Arn';
export const SQS_EVENT_BATCH_SIZE = 10;
export const SQS_REPORT_BATCH_ITEM_FAILURES = 'ReportBatchItemFailures';
export const USERS_TABLE_RESOURCE = 'UsersTable';
export const USER_EVENTS_QUEUE_RESOURCE = 'UserEventsQueue';
export const USER_EVENTS_TOPIC_RESOURCE = 'UserEventsTopic';

// Runtime defaults
export const USERS_TABLE_DEFAULT = 'users';
export const USER_EVENTS_QUEUE_DEFAULT = 'user-events';
export const USER_EVENTS_TOPIC_DEFAULT = 'user-events';
export const DEFAULT_LOCAL_USER_ID = 'local-user-id';
export const USER_LOGIN_SK = 'login';
