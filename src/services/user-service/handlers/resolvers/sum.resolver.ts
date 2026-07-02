import type {
    SumResolverArgType,
} from '../../interfaces/sum-resolver-arg.interface';
import type {
    SumResolverReturnType,
} from '../../interfaces/sum-resolver-return.interface';

export const handler = async (
    params: SumResolverArgType,
): Promise<SumResolverReturnType> => {
    return {
        result: params.a + params.b,
    };
};
