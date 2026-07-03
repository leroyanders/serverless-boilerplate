import status from 'http-status-codes';
import { putEventBridgeEvent } from '@lib/eventbridge';
import { lambdaHandler } from '@lib/lambda-handler';
import type { PublishEbhTestResponse } from '../../../interfaces/publish-ebh-test-response.interface';
import type { PublishEbhTestRequest } from '../../../types';

export const handler = lambdaHandler<PublishEbhTestRequest, PublishEbhTestResponse>(async ({ data }) => {
    const response = await putEventBridgeEvent(
        data.eventBus,
        data.source,
        data.detailType,
        data.payload,
    );
    const eventIds = (response?.Entries ?? [])
        .map((entry) => entry.EventId)
        .filter((eventId): eventId is string => Boolean(eventId));

    return {
        statusCode: status.OK,
        body: {
            detailType: data.detailType,
            eventBus: data.eventBus,
            eventId: eventIds[0],
            eventIds,
            payload: data.payload,
            source: data.source,
        },
    };
});
