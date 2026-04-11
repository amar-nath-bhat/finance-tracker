import '@testing-library/jest-dom';

// TextEncoder and TextDecoder are not available in jsdom, but mongoose needs them
if (typeof global.TextEncoder === 'undefined') {
  const { TextEncoder, TextDecoder } = require('util');
  global.TextEncoder = TextEncoder;
  global.TextDecoder = TextDecoder;
}
