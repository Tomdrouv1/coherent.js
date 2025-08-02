import { createStreamingRenderer } from '../src/coherent.js';

const renderer = createStreamingRenderer();

// Component with lots of static div elements (hot path scenario)
const componentWithManyDivs = {
    div: {
        className: 'container',
        children: Array.from({ length: 100 }, (_, i) => ({
            div: {
                className: 'item',
                id: `item-${i}`,
                children: [
                    { span: { text: `Item ${i}` } },
                    { div: { className: 'static-element', text: 'Static content' } }
                ]
            }
        }))
    }
};

async function testStaticCaching() {
    console.log('🧪 Testing Streaming Performance\n');

    // Test 1: Cold render performance
    console.log('❄️ Cold Render Test (streaming)');
    console.time('Cold Render');
    const stream1 = renderer.render(componentWithManyDivs);
    // Consume the stream
    let chunks1 = 0;
    for await (const chunk of stream1) {
        chunks1++;
    }
    console.timeEnd('Cold Render');

    // Test 2: Another render performance
    console.log('\n🔥 Second Render Test (streaming)');
    console.time('Second Render');
    const stream2 = renderer.render(componentWithManyDivs);
    // Consume the stream
    let chunks2 = 0;
    for await (const chunk of stream2) {
        chunks2++;
    }
    console.timeEnd('Second Render');

    // Get performance stats
    const metrics = renderer.getMetrics();
    console.log('\n📊 Streaming Performance Stats:');
    console.log(`Total Chunks: ${metrics.totalChunks}`);
    console.log(`Total Bytes: ${metrics.totalBytes}`);
    console.log(`Elements Processed: ${metrics.elementsProcessed}`);
    console.log(`Duration: ${(metrics.endTime - metrics.startTime).toFixed(2)}ms`);

    // Show streaming information
    console.log('\n🔥 Streaming Renderer:');
    console.log('  - Streaming renderer processes elements on-demand');
    console.log('  - Memory efficient for large component trees');
    console.log('  - No caching in streaming mode');
    console.log(`  - Chunks in first render: ${chunks1}`);
    console.log(`  - Chunks in second render: ${chunks2}`);
}

testStaticCaching().catch(console.error);
