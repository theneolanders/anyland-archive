const objectIdRegExp = /^[0-9a-fA-F]{24}$/;
export const isMongoId = (str: string) => objectIdRegExp.test(str);

export function headersToObject(headers: any) {
  const object = {};
  for (const [key, value] of headers) {
    // @ts-ignore
    object[key] = value;
  }
  return object;
}

export const d = () => new Date().toISOString();


