import type Aws from 'serverless/aws';

export type CloudFormationResources = Aws.Resources['Resources'];
export type CloudFormationResource = CloudFormationResources[string];
export type IamRoleStatement = Aws.IamRoleStatement;
export type IamRoleStatementGroup = {
    [name: string]: IamRoleStatement | IamRoleStatementGroup;
};

export type DynamoKey = {
    AttributeName: string;
    KeyType: 'HASH' | 'RANGE';
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
