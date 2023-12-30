const objectIdRegExp = /^[0-9a-fA-F]{24}$/;
export const isMongoId = (str: string) => objectIdRegExp.test(str);
