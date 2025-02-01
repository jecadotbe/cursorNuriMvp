import '@jest/globals';

declare module '@jest/globals' {
  export const jest: typeof import('@jest/globals').jest;
  export const describe: typeof import('@jest/globals').describe;
  export const expect: typeof import('@jest/globals').expect;
  export const it: typeof import('@jest/globals').it;
  export const beforeAll: typeof import('@jest/globals').beforeAll;
  export const afterAll: typeof import('@jest/globals').afterAll;
  export const beforeEach: typeof import('@jest/globals').beforeEach;
  export const afterEach: typeof import('@jest/globals').afterEach;
}
