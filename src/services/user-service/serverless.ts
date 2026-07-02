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
    INVOKE_SUM_RESOLVER_FN,
    INVOKE_SUM_RESOLVER_HANDLER,
    REQUEST_AUTHORIZER_TYPE,
    ROOT_HTTP_PATH,
    SERVERLESS_SERVICE_NAME,
    SERVERLESS_USER_DOMAIN,
    SERVERLESS_USER_STACK,
    SQS_EVENT_BATCH_SIZE,
    SQS_REPORT_BATCH_ITEM_FAILURES,
    SSM_USER_SERVICE_DOMAIN_RESOURCE,
    TEST_HANDLE_QUEUE_MESSAGE_FN,
    TEST_HANDLE_QUEUE_MESSAGE_HANDLER,
    TEST_HANDLE_TOPIC_MESSAGE_FN,
    TEST_HANDLE_TOPIC_MESSAGE_HANDLER,
    TEST_PUBLISH_TOPIC_MESSAGE_FN,
    TEST_PUBLISH_TOPIC_MESSAGE_HANDLER,
    TEST_SNS_HTTP_PATH,
    TEST_SEND_QUEUE_MESSAGE_FN,
    TEST_SEND_QUEUE_MESSAGE_HANDLER,
    TEST_SQS_HTTP_PATH,
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

    service: SERVERLESS_SERVICE_NAME,
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

        [INVOKE_SUM_RESOLVER_FN]: {
            name: `${SERVERLESS_USER_STACK}-${INVOKE_SUM_RESOLVER_FN}`,
            handler: INVOKE_SUM_RESOLVER_HANDLER,
        },

        [TEST_SEND_QUEUE_MESSAGE_FN]: {
            handler: TEST_SEND_QUEUE_MESSAGE_HANDLER,
            events: [
                {
                    http: {
                        method: HTTP_POST_METHOD,
                        path: TEST_SQS_HTTP_PATH,
                        authorizer: {
                            name: AUTHORIZER_FN,
                            type: REQUEST_AUTHORIZER_TYPE,
                        },
                    },
                },
            ],
        },

        [TEST_PUBLISH_TOPIC_MESSAGE_FN]: {
            handler: TEST_PUBLISH_TOPIC_MESSAGE_HANDLER,
            events: [
                {
                    http: {
                        method: HTTP_POST_METHOD,
                        path: TEST_SNS_HTTP_PATH,
                        authorizer: {
                            name: AUTHORIZER_FN,
                            type: REQUEST_AUTHORIZER_TYPE,
                        },
                    },
                },
            ],
        },

        [TEST_HANDLE_QUEUE_MESSAGE_FN]: {
            handler: TEST_HANDLE_QUEUE_MESSAGE_HANDLER,
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

        [TEST_HANDLE_TOPIC_MESSAGE_FN]: {
            handler: TEST_HANDLE_TOPIC_MESSAGE_HANDLER,
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
