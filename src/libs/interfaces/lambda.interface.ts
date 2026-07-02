export interface LambdaContext {
    userId?: string;
}

export interface LambdaRequest<T = unknown> {
    data: T;
    ctx: LambdaContext;
}
