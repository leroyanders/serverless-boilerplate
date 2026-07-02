import { invokeFunction } from '@lib/invoke-function.lib';
import {
    SumResolverArgType,
    SumResolverReturnType,
} from '../../types';
import { INVOKE_SUM_RESOLVER_FN, SERVERLESS_USER_STACK } from "@constants/service.const";

export const invokeSum = async (
    params: SumResolverArgType,
): Promise<SumResolverReturnType> =>
    invokeFunction<SumResolverReturnType, SumResolverArgType>(
        SERVERLESS_USER_STACK,
        INVOKE_SUM_RESOLVER_FN,
        params,
    );