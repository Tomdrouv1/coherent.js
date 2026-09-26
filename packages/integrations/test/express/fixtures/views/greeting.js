// Express view module rendered by enhancedExpressEngine (see express-http.test.js).
export default function Greeting({ name, settings, _locals, cache }) {
  return {
    h1: {
      'data-leaked': [settings, _locals, cache].some((v) => v !== undefined) ? 'yes' : 'no',
      text: `Hello ${name}`
    }
  };
}
