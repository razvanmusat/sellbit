import { client } from '../../../../shared/api/client';

const ENDPOINT = 'lookup/adjustment-reasons';

export const AdjustmentReasonService = {
    /**
     * Returnează doar motivele active pentru dropdown.
     */
    getActiveReasons: async () => {
        return await client(`${ENDPOINT}/active`);
    }
};