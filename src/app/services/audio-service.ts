import { Injectable } from '@angular/core';
import * as uuidv4 from 'uuid/v4';
import { SoundObject } from '../types';
import { ProgressObserver } from '../home';
import * as util from './util';
import * as constants from '../constants';

@Injectable()
export class AudioService {

  splitWavFile(input: string, sideuid: string, fragments: SoundObject[], observer: ProgressObserver): Promise<string[]> {
    observer.updateProgress("splitting audio files", 0);
    return this.mapSeries(fragments, (async (f,i) => {
      const output = await this.trim(input, sideuid, f);
      observer.updateProgress("splitting audio files", (i+1)/fragments.length);
      return output;
    }));
  }

  private async trim(infile: string, sideuid: string, object: SoundObject): Promise<string> {
    const outfile = constants.SOUND_OBJECTS_FOLDER+sideuid+'/'+uuidv4()+'.wav';
    await util.execute('sox '+infile+' '+outfile+' trim '+object.time+' '+object.duration)
    return outfile;
  }

  private async mapSeries<T,S>(array: T[], func: (arg: T, i: number) => Promise<S>): Promise<S[]> {
    let result = [];
    for (let i = 0; i < array.length; i++) {
      result.push(await func(array[i], i));
    }
    return result;
  }

}