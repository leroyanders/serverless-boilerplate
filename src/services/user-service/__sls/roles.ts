import {
    SERVERLESS_CALCULATE_SERVICE_NAME,
} from '../../calculate-service/__sls/const';
import * as SLS from '../../../sls.defaults';
import { userEventsTopic } from './sns.def';
import { userEventsQueue } from './sqs.def';
import { USERS_TABLE } from './tables';

export default SLS.createIamRoleStatements({
    userStore: {
        read: {
            Effect: SLS.IamEffect.ALLOW,
            Action: [SLS.IamAction.DYNAMODB_GET_ITEM, SLS.IamAction.DYNAMODB_QUERY],
            Resource: [
                SLS.makeDBArn(USERS_TABLE),
                SLS.makeDBArn(USERS_TABLE, 'index/*'),
            ],
        },
        write: {
            Effect: SLS.IamEffect.ALLOW,
            Action: [SLS.IamAction.DYNAMODB_PUT_ITEM],
            Resource: SLS.makeDBArn(USERS_TABLE),
        },
        delete: {
            Effect: SLS.IamEffect.ALLOW,
            Action: [SLS.IamAction.DYNAMODB_DELETE_ITEM],
            Resource: SLS.makeDBArn(USERS_TABLE),
        },
    },
    userEventsQueue: {
        send: {
            Effect: SLS.IamEffect.ALLOW,
            Action: [SLS.IamAction.SQS_SEND_MESSAGE, SLS.IamAction.SQS_SEND_MESSAGE_BATCH],
            Resource: userEventsQueue.arn,
        },
        consume: {
            Effect: SLS.IamEffect.ALLOW,
            Action: [
                SLS.IamAction.SQS_DELETE_MESSAGE,
                SLS.IamAction.SQS_GET_QUEUE_ATTRIBUTES,
                SLS.IamAction.SQS_RECEIVE_MESSAGE,
            ],
            Resource: userEventsQueue.arn,
        },
    },
    userEventsTopic: {
        publish: {
            Effect: SLS.IamEffect.ALLOW,
            Action: [SLS.IamAction.SNS_PUBLISH, SLS.IamAction.SNS_PUBLISH_BATCH],
            Resource: userEventsTopic.arn,
        },
    },
    invokeCalculateService: {
        Effect: SLS.IamEffect.ALLOW,
        Action: [SLS.IamAction.LAMBDA_INVOKE_FUNCTION],
        Resource: SLS.makeLambdaArn(SERVERLESS_CALCULATE_SERVICE_NAME),
    },
} satisfies SLS.IamRoleStatementGroup);
