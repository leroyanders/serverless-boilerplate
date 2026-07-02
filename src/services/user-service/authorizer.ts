import {
    APIGatewayRequestAuthorizerEventV2,
    APIGatewaySimpleAuthorizerWithContextResult,
} from 'aws-lambda';
import jwt from 'jsonwebtoken';

export const handler = async (
    event: APIGatewayRequestAuthorizerEventV2,
): Promise<APIGatewaySimpleAuthorizerWithContextResult<{
    userId: string;
}>> => {
    try {
        const token = event.headers?.authorization?.replace(/^Bearer\s+/i, '');

        if (!token) {
            return {
                isAuthorized: false,
                context: {
                    userId: 'anonymous'
                },
            };
        }

        const payload = jwt.verify(
            token,
            process.env.JWT_SECRET!,
        ) as JwtPayload;

        return {
            isAuthorized: true,
            context: {
                userId: payload.sub,
            },
        };
    } catch {
        return {
            isAuthorized: false,
            context: {
                userId: 'anonymous'
            },
        };
    }
};