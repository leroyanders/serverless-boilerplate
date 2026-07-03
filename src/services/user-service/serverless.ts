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
    QUEUE_HANDLE_TOPIC_MESSAGE_FN,
    QUEUE_HANDLE_TOPIC_MESSAGE_HANDLER,
    QUEUE_PUBLISH_TOPIC_MESSAGE_FN,
    QUEUE_PUBLISH_TOPIC_MESSAGE_HANDLER,
    QUEUE_SNS_HTTP_PATH,
    QUEUE_SEND_QUEUE_MESSAGE_FN,
    QUEUE_SEND_QUEUE_MESSAGE_HANDLER,
    QUEUE_SQS_HTTP_PATH,
} from '@constants/service.const';
import * as SLS from '../sls.defaults';
import {
    USER_EVENTS_QUEUE_RESOURCE,
    USER_EVENTS_TOPIC,
    USER_EVENTS_TOPIC_RESOURCE,
} from './__sls/consts';
import {
    Outputs,
    Resources,
} from './__sls/resources';
import statements from './__sls/roles';

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

        [QUEUE_HANDLE_QUEUE_MESSAGE_FN]: {
            handler: QUEUE_HANDLE_QUEUE_MESSAGE_HANDLER,
            events: [
                {
                    sqs: {
                        arn: {
                            'Fn::GetAtt': [USER_EVENTS_QUEUE_RESOURCE, CFN_ARN_ATTRIBUTE],
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
                            Ref: USER_EVENTS_TOPIC_RESOURCE,
                        } as unknown as string,
                        topicName: USER_EVENTS_TOPIC,
                    },
                },
            ],
        },
    },

    resources: {
        Resources: {
            [SSM_USER_SERVICE_DOMAIN_RESOURCE]: SLS.genApiEndpoint(SERVERLESS_USER_DOMAIN),
            ...Resources,
        },
        Outputs,
    },
} as Serverless;
