import type { APIGatewayProxyResult } from 'aws-lambda';
import type { LambdaRequest } from '@lib/interfaces/lambda.interface';

export type LambdaResponse<TResponse = unknown> = Omit<APIGatewayProxyResult, 'body'> & {
    body: TResponse;
};

export type Handler<TRequest = unknown, TResponse = unknown> = (
    request: LambdaRequest<TRequest>,
) => Promise<LambdaResponse<TResponse>> | LambdaResponse<TResponse>;
