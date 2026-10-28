const { runSeed } = require('../../../scripts/seed');

describe('seed command lifecycle', () => {
    test('connects seeds and disconnects in order', async () => {
        const calls = [];
        const connect = jest.fn(async () => calls.push('connect'));
        const seed = jest.fn(async () => {
            calls.push('seed');
            return { categoriesUpserted: 5, productsUpserted: 20 };
        });
        const disconnect = jest.fn(async () => calls.push('disconnect'));

        const result = await runSeed({ connect, seed, disconnect });

        expect(calls).toEqual(['connect', 'seed', 'disconnect']);
        expect(result).toEqual({
            categoriesUpserted: 5,
            productsUpserted: 20,
        });
    });

    test('disconnects when seeding fails', async () => {
        const connect = jest.fn().mockResolvedValue(undefined);
        const seed = jest.fn().mockRejectedValue(new Error('write failed'));
        const disconnect = jest.fn().mockResolvedValue(undefined);

        await expect(runSeed({ connect, seed, disconnect })).rejects.toThrow(
            'write failed'
        );
        expect(disconnect).toHaveBeenCalledTimes(1);
    });

    test('does not disconnect when the connection fails', async () => {
        const connect = jest.fn().mockRejectedValue(new Error('connect failed'));
        const seed = jest.fn();
        const disconnect = jest.fn();

        await expect(runSeed({ connect, seed, disconnect })).rejects.toThrow(
            'connect failed'
        );
        expect(seed).not.toHaveBeenCalled();
        expect(disconnect).not.toHaveBeenCalled();
    });
});
