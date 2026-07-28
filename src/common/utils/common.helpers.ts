export function randomChar(includeUpperCase?: boolean): string {
  const chars =
    `abcdefghijklmnopqrstuvwxyz0123456789` +
    (includeUpperCase ? 'ABCDEFGHIJKLMNOPQRSTUVWXYZ' : '');
  const index = Math.floor(Math.random() * chars.length);
  return chars[index];
}

export function randomStr(length = 5) {
  let str = '';

  for (let index = 0; index < length; index++) {
    str += randomChar();
  }

  return str;
}
