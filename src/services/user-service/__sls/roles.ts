import {
    INVOKE_SUM_RESOLVER_FN,
    SERVERLESS_USER_STACK,
} from '@constants/service.const';
import * as SLS from '../../sls.defaults';
import {
    USER_EVENTS_QUEUE,
    USER_EVENTS_TOPIC,
    USERS_TABLE,
} from './consts';

export default SLS.createIamRoleStatements({
    userStore: {
        read: {
            Effect: 'Allow',
            Action: ['dynamodb:GetItem', 'dynamodb:Query'],
            Resource: [
                SLS.makeDBArn(USERS_TABLE),
                SLS.makeDBArn(USERS_TABLE, 'index/*'),
            ],
        },
        write: {
            Effect: 'Allow',
            Action: ['dynamodb:PutItem'],
            Resource: SLS.makeDBArn(USERS_TABLE),
        },
        delete: {
            Effect: 'Allow',
            Action: ['dynamodb:DeleteItem'],
            Resource: SLS.makeDBArn(USERS_TABLE),
        },
    },
    userEventsQueue: {
        send: {
            Effect: 'Allow',
            Action: ['sqs:SendMessage', 'sqs:SendMessageBatch'],
            Resource: SLS.makeSQSArn(USER_EVENTS_QUEUE),
        },
        consume: {
            Effect: 'Allow',
            Action: [
                'sqs:DeleteMessage',
                'sqs:GetQueueAttributes',
                'sqs:ReceiveMessage',
            ],
            Resource: SLS.makeSQSArn(USER_EVENTS_QUEUE),
        },
    },
    userEventsTopic: {
        publish: {
            Effect: 'Allow',
            Action: ['sns:Publish', 'sns:PublishBatch'],
            Resource: SLS.makeSNSArn(USER_EVENTS_TOPIC),
        },
    },
    invokeSumResolver: {
        Effect: 'Allow',
        Action: ['lambda:InvokeFunction'],
        Resource: SLS.makeResolverArn(INVOKE_SUM_RESOLVER_FN, SERVERLESS_USER_STACK),
    },
} satisfies SLS.IamRoleStatementGroup);
