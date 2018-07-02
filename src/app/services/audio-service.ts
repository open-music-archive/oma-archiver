import { Injectable } from '@angular/core';
import { SoundObject } from '../types';
import { ProgressObserver } from '../home';
import * as util from './util';
import * as uuidv4 from 'uuid/v4';
import * as constants from '../constants';



@Injectable()
export class AudioService {

  splitWavFile(input: string, sideuid: string, fragments: SoundObject[], observer: ProgressObserver): Promise<string[]> {
    observer.updateProgress("splitting audio files", 0);
    return Promise.all(fragments.map(async (f,i) => {
      const output = await this.trim(input, sideuid, f);
      observer.updateProgress("splitting audio files", (i+1)/fragments.length);
      return output;
    }));
  }

  private async trim(input: string, sideuid: string, object: SoundObject) {
    const output = constants.SOUND_OBJECTS_FOLDER+sideuid+'/'+uuidv4()+'.wav';
    return util.execute('sox '+input+' '+output+' trim '+object.time+' '+object.duration)
      //.catch(() => this.trim(input, sideuid, object));
  }

}