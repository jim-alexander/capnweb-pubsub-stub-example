import { newWebSocketRpcSession } from 'capnweb';
import { CounterServer } from './types.js';

async function main() {
    console.log("[CLIENT] Connecting to Cap'n Web counter server...");

    let currentValue = 0;

    try {
        // Connect to the WebSocket server
        const api = newWebSocketRpcSession<CounterServer>('ws://localhost:8080');

        await api.subscribe((newVal: number) => {
            currentValue = newVal;
            console.log(`[CLIENT] updated: ${newVal}`);
        });

        await api.increment();
        await api.increment();
        await api.increment();

        const valueFromServer = await api.get();
        console.log(`\n[CLIENT] re-fetch: ${valueFromServer}`);
        console.log(`[CLIENT] cached: ${currentValue}`);
        console.log(`[CLIENT] is correct: ${currentValue === valueFromServer}`);

    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
}

main().catch(console.error);