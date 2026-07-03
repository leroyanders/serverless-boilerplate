import type { ConditionBlock } from 'aws-lambda';

type AuthEffect = 'Allow' | 'Deny';
type AuthCondition = ConditionBlock;

type AuthMethod = {
    conditions?: AuthCondition;
    resourceArn: string;
};

type AuthPolicyOptions = {
    region?: string;
    restApiId?: string;
    stage?: string;
};

type AuthPolicyDocument = {
    Statement: Array<{
        Action: 'execute-api:Invoke';
        Condition?: AuthCondition;
        Effect: AuthEffect;
        Resource: string[];
    }>;
    Version: '2012-10-17';
};

export class AuthPolicy {
    static HttpVerb = {
        ALL: '*',
        DELETE: 'DELETE',
        GET: 'GET',
        HEAD: 'HEAD',
        OPTIONS: 'OPTIONS',
        PATCH: 'PATCH',
        POST: 'POST',
        PUT: 'PUT',
    } as const;

    private readonly allowMethods: AuthMethod[] = [];
    private readonly awsAccountId: string;
    private readonly denyMethods: AuthMethod[] = [];
    private readonly pathRegex = /^[/.a-zA-Z0-9-*]+$/;
    private readonly principalId: string;
    private readonly region: string;
    private readonly restApiId: string;
    private readonly stage: string;

    constructor(
        principalId: string,
        awsAccountId: string,
        apiOptions: AuthPolicyOptions = {},
    ) {
        this.awsAccountId = awsAccountId;
        this.principalId = principalId;
        this.region = apiOptions.region ?? '*';
        this.restApiId = apiOptions.restApiId ?? '*';
        this.stage = apiOptions.stage ?? '*';
    }

    allowAllMethods(): void {
        this.addMethod('Allow', AuthPolicy.HttpVerb.ALL, '*');
    }

    allowMethod(
        verb: string,
        resource: string,
    ): void {
        this.addMethod('Allow', verb, resource);
    }

    denyAllMethods(): void {
        this.addMethod('Deny', AuthPolicy.HttpVerb.ALL, '*');
    }

    denyMethod(
        verb: string,
        resource: string,
    ): void {
        this.addMethod('Deny', verb, resource);
    }

    build(): {
        policyDocument: AuthPolicyDocument;
        principalId: string;
    } {
        if (!this.allowMethods.length && !this.denyMethods.length) {
            throw new Error('No statements defined for the policy');
        }

        return {
            principalId: this.principalId,
            policyDocument: {
                Statement: [
                    ...this.getStatementsForEffect('Allow', this.allowMethods),
                    ...this.getStatementsForEffect('Deny', this.denyMethods),
                ],
                Version: '2012-10-17',
            },
        };
    }

    private addMethod(
        effect: AuthEffect,
        verb: string,
        resource: string,
        conditions?: AuthCondition,
    ): void {
        if (verb !== '*' && !Object.values(AuthPolicy.HttpVerb).includes(verb as typeof AuthPolicy.HttpVerb[keyof typeof AuthPolicy.HttpVerb])) {
            throw new Error(`Invalid HTTP verb ${verb}. Allowed verbs in AuthPolicy.HttpVerb`);
        }

        if (!this.pathRegex.test(resource)) {
            throw new Error(`Invalid resource path: ${resource}. Path should match ${this.pathRegex}`);
        }

        const cleanedResource = resource.startsWith('/')
            ? resource.slice(1)
            : resource;
        const resourceArn = [
            `arn:aws:execute-api:${this.region}:${this.awsAccountId}:${this.restApiId}`,
            this.stage,
            verb,
            cleanedResource,
        ].join('/');

        const method = {
            conditions,
            resourceArn,
        };

        if (effect === 'Allow') {
            this.allowMethods.push(method);
        } else {
            this.denyMethods.push(method);
        }
    }

    private getStatementsForEffect(
        effect: AuthEffect,
        methods: AuthMethod[],
    ): AuthPolicyDocument['Statement'] {
        const resourceArns: string[] = [];
        const conditionalStatements: AuthPolicyDocument['Statement'] = [];

        methods.forEach((method) => {
            if (!method.conditions || !Object.keys(method.conditions).length) {
                resourceArns.push(method.resourceArn);
                return;
            }

            conditionalStatements.push({
                Action: 'execute-api:Invoke',
                Condition: method.conditions,
                Effect: effect,
                Resource: [method.resourceArn],
            });
        });

        return [
            ...(resourceArns.length
                ? [
                    {
                        Action: 'execute-api:Invoke' as const,
                        Effect: effect,
                        Resource: resourceArns,
                    },
                ]
                : []),
            ...conditionalStatements,
        ];
    }
}
