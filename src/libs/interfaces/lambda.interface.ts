export interface LambdaContext {
    principalId?: string;
    userId?: string;
}

export interface LambdaRequest<T = unknown> {
    data: T;
    ctx: LambdaContext;
}
