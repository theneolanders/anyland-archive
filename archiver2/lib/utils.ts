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


// Abstracts the generic boilerplate for doing an API call, handling errors, writing to file
// Only use for things that gets written to disk! Not for generic API abstractions.
export const mkQuery = (
  ctx: string,
  getFilePath: (id: string) => string,
  query: (id: string) => Promise<Response>,
  onResOk: (id: string, res: Response, bodyTxt: string) => void | Promise<void>,
  throwOnBadRes: boolean,
  sleepAfterQuery: number,
) => async (id: string) => {
  const file = Bun.file(getFilePath(id))

  if (await file.exists()) {
    console.info(d(), ctx, "file already exists for", id, "skipping")
    return;
  }

  const res = await query(id)
  const bodyTxt = await res.text();

  if (res.ok) {
    try {
      await onResOk(id, res, bodyTxt)
      await Bun.write(file, bodyTxt)
    } catch(e) {
      console.error(d(), ctx, "res handler error!", id, '""""', bodyTxt, '""""')
      console.error(e);
      throw "check logs";
    }
  }
  else {
    console.warn(d(), ctx, "bad response", res.status, '""""', bodyTxt, '""""')
    if (throwOnBadRes) throw "check logs";
  }

  await Bun.sleep(sleepAfterQuery)
}

