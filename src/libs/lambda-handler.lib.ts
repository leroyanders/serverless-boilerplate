import {
    APIGatewayProxyEvent,
    APIGatewayProxyResult,
    Context,
} from 'aws-lambda';

type Handler<T = unknown> = (
    request: LambdaRequest<T>,
) => Promise<APIGatewayProxyResult> | APIGatewayProxyResult;

export const lambdaHandler =
    <T = unknown>(handler: Handler<T>) =>
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
            } as T;

            const ctx: LambdaContext = {
                userId: event.requestContext?.authorizer?.userId as string | undefined,
            };

            return handler({
                data,
                ctx,
            });
        };