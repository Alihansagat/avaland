// TypeScript -> JavaScript in the browser (types stripped, enums kept) for the JS runner
import { transform } from "sucrase";
self.AvaTS = { toJS: code => transform(code, { transforms: ["typescript"], disableESTransforms: true }).code };
