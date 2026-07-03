import 'tsconfig-paths/register';
import Aws, { Serverless } from 'serverless/aws';
import {
    API_USER_LOGIN_FN,
    API_USER_LOGIN_HANDLER,
    AUTHORIZER_FN,
    AUTHORIZER_HANDLER,
    CFN_ARN_ATTRIBUTE,
    HTTP_GET_METHOD,
    HTTP_POST_METHOD,
    REQUEST_AUTHORIZER_TYPE,
    ROOT_HTTP_PATH,
    SERVERLESS_USER_SERVICE_NAME,
    SERVERLESS_USER_DOMAIN,
    SQS_EVENT_BATCH_SIZE,
    SQS_REPORT_BATCH_ITEM_FAILURES,
    SSM_USER_SERVICE_DOMAIN_RESOURCE,
    QUEUE_HANDLE_QUEUE_MESSAGE_FN,
    QUEUE_HANDLE_QUEUE_MESSAGE_HANDLER,
    QUEUE_HANDLE_EVENTBRIDGE_EVENT_FN,
    QUEUE_HANDLE_EVENTBRIDGE_EVENT_HANDLER,
    QUEUE_HANDLE_TOPIC_MESSAGE_FN,
    QUEUE_HANDLE_TOPIC_MESSAGE_HANDLER,
    QUEUE_EBH_HTTP_PATH,
    QUEUE_PUT_EVENTBRIDGE_EVENT_FN,
    QUEUE_PUT_EVENTBRIDGE_EVENT_HANDLER,
    QUEUE_PUBLISH_TOPIC_MESSAGE_FN,
    QUEUE_PUBLISH_TOPIC_MESSAGE_HANDLER,
    QUEUE_SNS_HTTP_PATH,
    QUEUE_SEND_QUEUE_MESSAGE_FN,
    QUEUE_SEND_QUEUE_MESSAGE_HANDLER,
    QUEUE_SQS_HTTP_PATH,
    USER_EVENTS_EVENT_DETAIL_TYPE,
    USER_EVENTS_EVENT_SOURCE,
} from './__sls/const';
import * as SLS from '../../sls.defaults';
import db from './__sls/db';
import statements from './__sls/roles';
import { userEventsEventBus } from './__sls/ebh.def';
import { userEventsTopic } from './__sls/sns.def';
import { userEventsQueue } from './__sls/sqs.def';

module.exports = {
    ...SLS.serverless,

    service: SERVERLESS_USER_SERVICE_NAME,
    provider: {
        ...SLS.serverless.provider,
        iam: {
            role: {
                statements,
            },
        },
    } as Aws.Provider,

    functions: {
        [AUTHORIZER_FN]: {
            handler: AUTHORIZER_HANDLER,
        },

        [API_USER_LOGIN_FN]: {
            handler: API_USER_LOGIN_HANDLER,
            events: [
                {
                    http: {
                        method: HTTP_GET_METHOD,
                        path: ROOT_HTTP_PATH,
                        authorizer: {
                            name: AUTHORIZER_FN,
                            type: REQUEST_AUTHORIZER_TYPE,
                        },
                    },
                },
            ],
        },

        [QUEUE_SEND_QUEUE_MESSAGE_FN]: {
            handler: QUEUE_SEND_QUEUE_MESSAGE_HANDLER,
            events: [
                {
                    http: {
                        method: HTTP_POST_METHOD,
                        path: QUEUE_SQS_HTTP_PATH,
                        authorizer: {
                            name: AUTHORIZER_FN,
                            type: REQUEST_AUTHORIZER_TYPE,
                        },
                    },
                },
            ],
        },

        [QUEUE_PUBLISH_TOPIC_MESSAGE_FN]: {
            handler: QUEUE_PUBLISH_TOPIC_MESSAGE_HANDLER,
            events: [
                {
                    http: {
                        method: HTTP_POST_METHOD,
                        path: QUEUE_SNS_HTTP_PATH,
                        authorizer: {
                            name: AUTHORIZER_FN,
                            type: REQUEST_AUTHORIZER_TYPE,
                        },
                    },
                },
            ],
        },

        [QUEUE_PUT_EVENTBRIDGE_EVENT_FN]: {
            handler: QUEUE_PUT_EVENTBRIDGE_EVENT_HANDLER,
            events: [
                {
                    http: {
                        method: HTTP_POST_METHOD,
                        path: QUEUE_EBH_HTTP_PATH,
                        authorizer: {
                            name: AUTHORIZER_FN,
                            type: REQUEST_AUTHORIZER_TYPE,
                        },
                    },
                },
            ],
        },

        [QUEUE_HANDLE_QUEUE_MESSAGE_FN]: {
            handler: QUEUE_HANDLE_QUEUE_MESSAGE_HANDLER,
            events: [
                {
                    sqs: {
                        arn: {
                            'Fn::GetAtt': [userEventsQueue.qid, CFN_ARN_ATTRIBUTE],
                        } as unknown as string,
                        batchSize: SQS_EVENT_BATCH_SIZE,
                        functionResponseType: SQS_REPORT_BATCH_ITEM_FAILURES,
                    },
                },
            ],
        },

        [QUEUE_HANDLE_TOPIC_MESSAGE_FN]: {
            handler: QUEUE_HANDLE_TOPIC_MESSAGE_HANDLER,
            events: [
                {
                    sns: {
                        arn: {
                            Ref: userEventsTopic.tid,
                        } as unknown as string,
                        topicName: userEventsTopic.name,
                    },
                },
            ],
        },

        [QUEUE_HANDLE_EVENTBRIDGE_EVENT_FN]: {
            handler: QUEUE_HANDLE_EVENTBRIDGE_EVENT_HANDLER,
            events: [
                {
                    eventBridge: {
                        eventBus: userEventsEventBus.arn,
                        pattern: {
                            'detail-type': [USER_EVENTS_EVENT_DETAIL_TYPE],
                            source: [USER_EVENTS_EVENT_SOURCE],
                        },
                    },
                },
            ],
        },
    },

    resources: {
        Resources: {
            [SSM_USER_SERVICE_DOMAIN_RESOURCE]: SLS.genApiEndpoint(SERVERLESS_USER_DOMAIN),
            ...db.Resources,
            ...userEventsEventBus.def,
            ...userEventsQueue.def,
            ...userEventsTopic.def,
        },
    },
} as Serverless;
