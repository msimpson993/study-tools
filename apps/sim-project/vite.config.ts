import { fileURLToPath } from 'node:url';
import { appConfig } from '../../packages/build/src/index';
export default appConfig(fileURLToPath(new URL('.', import.meta.url)).replace(/\/$/, ''));
