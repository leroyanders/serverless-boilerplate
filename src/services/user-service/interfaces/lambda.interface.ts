interface LambdaContext {
    userId?: string;
}

interface LambdaRequest<T = unknown> {
    data: T;
    ctx: LambdaContext;
}