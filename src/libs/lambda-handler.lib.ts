import {
    APIGatewayProxyEvent,
    APIGatewayProxyResult,
    Context,
} from 'aws-lambda';
import type { LambdaContext } from '@lib/interfaces/lambda.interface';
import type { Handler } from '@lib/types/lambda-handler.type';

export const lambdaHandler =
    <TRequest = unknown, TResponse = unknown>(handler: Handler<TRequest, TResponse>) =>
        async (
            event: APIGatewayProxyEvent,
            _: Context,
        ): Promise<APIGatewayProxyResult> => {
            const body = event.body
                ? JSON.parse(event.body)
                : {};

            const data = {
                ...event.pathParameters,
                ...event.queryStringParameters,
                ...body,
            } as TRequest;

            const ctx: LambdaContext = {
                principalId: event.requestContext?.authorizer?.principalId as string | undefined,
                userId: event.requestContext?.authorizer?.userId as string | undefined,
            };

            const response = await handler({
                data,
                ctx,
            });

            return {
                ...response,
                body: typeof response.body === 'string'
                    ? response.body
                    : JSON.stringify(response.body),
            };
        };
