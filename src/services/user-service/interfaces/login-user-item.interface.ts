import type { LoginRequest } from '../types/login.type';
import type { CalculateServiceReturnType } from '../../calculate-service/interfaces/calculate-service-return.interface';

export interface LoginUserItem {
    pk: string;
    sk: string;
    userId: string;
    lastLoginAt: string;
    data: LoginRequest;
    sum: CalculateServiceReturnType;
}
