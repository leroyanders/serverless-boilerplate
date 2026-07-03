import type { APIGatewayRequestAuthorizerEvent } from 'aws-lambda';
import jwt from 'jsonwebtoken';
import { AuthPolicy } from '@lib/auth-policy';

type AuthorizerPolicyCallback = (policy: AuthPolicy) => void;

type JwtPayload = {
    sub?: string;
};

const ANONYMOUS_PRINCIPAL_ID = 'anonymous';
const BEARER_TOKEN_PATTERN = /^Bearer\s+/i;

const normalizeHeaders = (
    event: APIGatewayRequestAuthorizerEvent,
): Record<string, string | undefined> => {
    if (!event.headers) {
        return {};
    }

    const headers = Object.keys(event.headers).reduce<Record<string, string | undefined>>((result, key) => {
        result[key.toLowerCase()] = event.headers?.[key];

        return result;
    }, {});

    event.headers = headers;

    return headers;
};

const getApiOptions = (methodArn: string) => {
    const arnParts = methodArn.split(':');
    const apiGatewayArnParts = arnParts[5]?.split('/') ?? [];

    return {
        awsAccountId: arnParts[4] ?? '*',
        region: arnParts[3] ?? '*',
        restApiId: apiGatewayArnParts[0] ?? '*',
        stage: apiGatewayArnParts[1] ?? '*',
    };
};

export const authorizer = async (
    event: APIGatewayRequestAuthorizerEvent,
    callback: AuthorizerPolicyCallback,
) => {
    const headers = normalizeHeaders(event);
    const token = headers.authorization?.replace(BEARER_TOKEN_PATTERN, '');

    if (!token) {
        return 'Unauthorized';
    }

    const payload = jwt.verify(
        token,
        process.env.JWT_SECRET!,
    ) as JwtPayload;
    const principalId = payload.sub || ANONYMOUS_PRINCIPAL_ID;
    const apiOptions = getApiOptions(event.methodArn);
    const policy = new AuthPolicy(
        principalId,
        apiOptions.awsAccountId,
        apiOptions,
    );

    callback(policy);

    const authResponse = policy.build();

    return {
        ...authResponse,
        context: {
            principalId,
            userId: principalId,
        },
    };
};
