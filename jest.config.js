/** @type {import('ts-jest').JestConfigWithTsJest} */
export default {
  extensionsToTreatAsEsm: ['.ts'],
  transform: {
    '\\.ts$': ['ts-jest', {
      useESM: true,
    }],
  },
};
