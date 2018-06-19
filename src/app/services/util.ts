import { exec } from 'child_process';
import * as wav from 'wav-file-info';

export function execute(command: string): Promise<any> {
  return new Promise((resolve, reject) =>
    exec(command, (error, stdout, stderr) => {
      if (error) {
        console.log(error, stderr);
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