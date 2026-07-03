import type Aws from 'serverless/aws';

export type CloudFormationResources = Aws.Resources['Resources'];
export type CloudFormationResource = CloudFormationResources[string];

export enum IamEffect {
    ALLOW = 'Allow',
    DENY = 'Deny',
}

export enum IamAction {
    DYNAMODB_DELETE_ITEM = 'dynamodb:DeleteItem',
    DYNAMODB_GET_ITEM = 'dynamodb:GetItem',
    DYNAMODB_PUT_ITEM = 'dynamodb:PutItem',
    DYNAMODB_QUERY = 'dynamodb:Query',
    DYNAMODB_SCAN = 'dynamodb:Scan',
    DYNAMODB_UPDATE_ITEM = 'dynamodb:UpdateItem',
    LAMBDA_INVOKE_FUNCTION = 'lambda:InvokeFunction',
    SNS_PUBLISH = 'sns:Publish',
    SNS_PUBLISH_BATCH = 'sns:PublishBatch',
    SQS_DELETE_MESSAGE = 'sqs:DeleteMessage',
    SQS_GET_QUEUE_ATTRIBUTES = 'sqs:GetQueueAttributes',
    SQS_RECEIVE_MESSAGE = 'sqs:ReceiveMessage',
    SQS_SEND_MESSAGE = 'sqs:SendMessage',
    SQS_SEND_MESSAGE_BATCH = 'sqs:SendMessageBatch',
}

type IamActionConfig = IamAction | IamAction[] | { [key: string]: unknown };

export type IamRoleStatement = Omit<Aws.IamRoleStatement, 'Action' | 'Effect' | 'NotAction'> & {
    Action?: IamActionConfig;
    Effect: IamEffect;
    NotAction?: IamActionConfig;
};

export type IamRoleStatementGroup = {
    [name: string]: IamRoleStatement | IamRoleStatementGroup;
};

export enum DynamoKeyType {
    HASH = 'HASH',
    RANGE = 'RANGE',
}

export type DynamoKey = {
    AttributeName: string;
    KeyType: DynamoKeyType;
};

export type DynamoGsi = {
    IndexName: string;
    KeySchema: DynamoKey[];
    Projection?: {
        ProjectionType: 'ALL' | 'KEYS_ONLY' | 'INCLUDE';
        NonKeyAttributes?: string[];
    };
};

export type CreateDDBConfig = {
    name: string;
    key: DynamoKey[];
    gsi?: DynamoGsi[];
    resourceName?: string;
};

export type CreateSQSConfig = {
    name: string;
    resourceName?: string;
    visibilityTimeout?: number;
};

export type CreateSNSConfig = {
    name: string;
    resourceName?: string;
};
