import { renderExactFromUrl } from '../src/services/exact-replica-service';

(async () => {
  try {
    const result = await renderExactFromUrl('https://example.com');
    console.log('success', JSON.stringify(result.meta.render, null, 2));
  } catch (error) {
    console.error('failure', error);
  }
})();

