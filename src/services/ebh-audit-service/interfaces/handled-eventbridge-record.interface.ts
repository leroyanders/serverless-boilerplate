import type {
    CalculateServiceReturnType,
} from '../../calculate-service/interfaces/calculate-service-return.interface';

export interface HandledEventBridgeRecord {
    calculation: CalculateServiceReturnType;
    detailType: string;
    eventId: string;
    listener: string;
    source: string;
}
