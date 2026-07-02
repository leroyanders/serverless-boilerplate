import type { LoginRequest } from '../types/login.type';
import type { SumResolverReturnType } from './sum-resolver-return.interface';

export interface LoginUserItem {
    pk: string;
    sk: string;
    userId: string;
    lastLoginAt: string;
    data: LoginRequest;
    sum: SumResolverReturnType;
}
