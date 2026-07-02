import 'tsconfig-paths/register';
import Aws, { Serverless } from 'serverless/aws';
import {
    INVOKE_SUM_RESOLVER_FN,
    SERVERLESS_SERVICE_NAME,
    SERVERLESS_USER_STACK,
    TEST_HANDLE_QUEUE_MESSAGE_FN,
    TEST_HANDLE_TOPIC_MESSAGE_FN,
    TEST_PUBLISH_TOPIC_MESSAGE_FN,
    TEST_SEND_QUEUE_MESSAGE_FN,
} from "@constants/service.const"
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
        auth: {
          handler: 'authorizer.handler',
        },

        apiUserLogin: {
            handler: 'handlers/api/user/login.handler',
            events: [
                {
                    http: {
                        method: "GET",
                        path: "/",
                        authorizer: {
                            name: "auth",
                            type: "request",
                        }
                    },
                }
            ]
        },

        [INVOKE_SUM_RESOLVER_FN]: {
            name: `${SERVERLESS_USER_STACK}-${INVOKE_SUM_RESOLVER_FN}`,
            handler: 'handlers/resolvers/sum.resolver.handler',
        },

        [TEST_SEND_QUEUE_MESSAGE_FN]: {
            handler: 'handlers/api/test/send-sqs.handler',
            events: [
                {
                    http: {
                        method: "POST",
                        path: "/test/sqs",
                        authorizer: {
                            name: "auth",
                            type: "request",
                        }
                    },
                }
            ]
        },

        [TEST_PUBLISH_TOPIC_MESSAGE_FN]: {
            handler: 'handlers/api/test/publish-sns.handler',
            events: [
                {
                    http: {
                        method: "POST",
                        path: "/test/sns",
                        authorizer: {
                            name: "auth",
                            type: "request",
                        }
                    },
                }
            ]
        },

        [TEST_HANDLE_QUEUE_MESSAGE_FN]: {
            handler: 'handlers/events/sqs/user-events.handler',
            events: [
                {
                    sqs: {
                        arn: {
                            'Fn::GetAtt': [USER_EVENTS_QUEUE_RESOURCE, 'Arn'],
                        } as unknown as string,
                        batchSize: 10,
                        functionResponseType: "ReportBatchItemFailures",
                    },
                },
            ]
        },

        [TEST_HANDLE_TOPIC_MESSAGE_FN]: {
            handler: 'handlers/events/sns/user-events.handler',
            events: [
                {
                    sns: {
                        arn: {
                            Ref: USER_EVENTS_TOPIC_RESOURCE,
                        } as unknown as string,
                        topicName: USER_EVENTS_TOPIC,
                    },
                },
            ]
        },
    },

    resources: {
        Resources: {
            SSMAuthServiceDomain: SLS.genApiEndpoint('user'),
            ...Resources,
        },
        Outputs,
    },
} as Serverless;