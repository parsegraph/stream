const parseRain = (
  data: string,
  cb: (command: string, ...args: any[]) => void,
  cbThisArg?: object
) => {
  let index = 0;
  while (index < data.length) {
    const nextLine = data.indexOf("\n", index);
    const lineLenStr = data.substring(index, index + nextLine);
    const lineLen = parseInt(lineLenStr);
    index = nextLine;
    const line = data.substring(index + 1, index + lineLen + 1);
    const args = JSON.parse(line);
    cb.call(cbThisArg, args.shift(), ...args);
    index += lineLen + 2;
  }
};

export default parseRain;
