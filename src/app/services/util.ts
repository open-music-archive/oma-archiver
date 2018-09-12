import { exec } from 'child_process';
import * as wav from 'wav-file-info';

const PATH_LIMIT = 70;

export function execute(command: string): Promise<any> {
  return new Promise((resolve, reject) =>
    exec(command, (error, stdout, stderr) => {
      if (error) {
        reject('failed to execute "'+command+'": '+JSON.stringify(error));
      } else {
        resolve();
      }
    })
  )
}

export function getWavName(path: string): string {
  return path.slice(path.lastIndexOf('/')+1).replace('.wav', '');
}

export function limitFileName(path: string): string {
  if (path.length > PATH_LIMIT) {
    var hlf = PATH_LIMIT / 2;
    path = path.substring(0, hlf - 2) + " .. " + path.substring(hlf + 2);
  }
  return path;
}

export function getWavDuration(path: string): Promise<number> {
  return new Promise((resolve, reject) =>
    wav.infoByFilename(path, (err, info) => {
      if (err) {
        reject('invalid wav file: '+err.invalid_reasons[0]);
      } else {
        resolve(info.duration);
      }
    })
  );
}

export async function mapSeries<T,S>(array: T[], func: (arg: T, i: number) => Promise<S>): Promise<S[]> {
  let result = [];
  for (let i = 0; i < array.length; i++) {
    result.push(await func(array[i], i));
  }
  return result;
}
